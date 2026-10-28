import mongoose from "mongoose";
import { authError, sameOrigin } from "@/lib/auth-response";
import { requestUser } from "@/lib/auth";
import {
  getAdminCompanies,
  getAdminOrderDetail,
  getAdminOrders,
  getAdminOverview,
  getAdminPrices,
  getAdminUsers,
} from "@/lib/admin-data";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { refreshPrices } from "@/lib/price-refresh";
import { refreshMetalPrices } from "@/lib/metal-prices";
import { isSectorKey, sectorDefinition } from "@/data/sectors";

const NO_STORE = { "Cache-Control": "no-store" };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

function companyFields(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
  const fields = {
    id: text("id", 64),
    ticker: text("ticker", 16).toUpperCase(),
    name: text("name", 100),
    nameAr: text("nameAr", 100),
    description: text("description", 1000),
    descriptionAr: text("descriptionAr", 1000),
    sectorKey: text("sectorKey", 40),
    image: text("image", 2000),
    logoBg: text("logoBg", 7),
  };
  if (
    !mongoose.isValidObjectId(fields.id) ||
    !/^[A-Z0-9][A-Z0-9.-]{0,15}$/.test(fields.ticker) ||
    !fields.name ||
    !fields.nameAr ||
    !fields.description ||
    !fields.descriptionAr ||
    !isSectorKey(fields.sectorKey) ||
    !/^#[0-9a-f]{6}$/i.test(fields.logoBg)
  ) return null;
  if (fields.image) {
    const localImage = fields.image.startsWith("/") && !fields.image.startsWith("//") && !fields.image.includes("..");
    let secureUrl = false;
    try {
      secureUrl = new URL(fields.image).protocol === "https:";
    } catch {
      // Local public paths do not need to be absolute URLs.
    }
    if (!localImage && !secureUrl) return null;
  }
  const sector = sectorDefinition(fields.sectorKey)!;
  return { ...fields, sectorKey: sector.id, category: sector.category, categoryAr: sector.categoryAr };
}

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (user?.role !== "admin") return authError("forbidden", 403, request);
    await connectDB();
    const search = new URL(request.url).searchParams;
    const view = search.get("view") ?? "overview";
    if (view === "overview") return json(await getAdminOverview());
    if (view === "orders") return json(await getAdminOrders(search));
    if (view === "order") {
      const detail = await getAdminOrderDetail(search.get("id") ?? "");
      return detail ? json(detail) : json({ error: "notFound" }, 404);
    }
    if (view === "companies") return json({ companies: await getAdminCompanies() });
    if (view === "prices") return json(await getAdminPrices());
    if (view === "users") {
      const page = Number(search.get("page") ?? 1);
      return json(await getAdminUsers(Number.isFinite(page) ? page : 1, user.id));
    }
    return json({ error: "invalidView" }, 400);
  } catch {
    return authError("serverError", 500, request);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const user = await requestUser(request);
    if (user?.role !== "admin") return authError("forbidden", 403, request);
    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "invalidAction" }, 400);
    const body = parsed as Record<string, unknown>;
    await connectDB();

    if (body.action === "updateCompany") {
      const fields = companyFields(body.company);
      if (!fields) return json({ error: "invalidCompany" }, 400);
      const duplicate = await Product.findOne({ ticker: fields.ticker, _id: { $ne: fields.id } }).select("_id").lean();
      if (duplicate) return json({ error: "tickerTaken" }, 409);
      const updated = await Product.findByIdAndUpdate(fields.id, {
        $set: {
          ticker: fields.ticker,
          name: fields.name,
          nameAr: fields.nameAr,
          description: fields.description,
          descriptionAr: fields.descriptionAr,
          sectorKey: fields.sectorKey,
          category: fields.category,
          categoryAr: fields.categoryAr,
          image: fields.image,
          logoBg: fields.logoBg,
        },
      }, { new: true, runValidators: true }).select("_id").lean();
      return updated ? json({ ok: true }) : json({ error: "notFound" }, 404);
    }

    if (body.action === "setCompanyActive") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!mongoose.isValidObjectId(id) || typeof body.active !== "boolean") return json({ error: "invalidCompany" }, 400);
      const updated = await Product.findByIdAndUpdate(id, { $set: { active: body.active } }, { new: true }).select("_id").lean();
      return updated ? json({ ok: true }) : json({ error: "notFound" }, 404);
    }

    if (body.action === "setUserDisabled") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!mongoose.isValidObjectId(id) || typeof body.disabled !== "boolean") return json({ error: "invalidUser" }, 400);
      if (new mongoose.Types.ObjectId(id).toString() === user.id) return json({ error: "selfDisable" }, 400);
      const updated = await User.findByIdAndUpdate(id, { $set: { disabled: body.disabled } }, { new: true }).select("_id").lean();
      return updated ? json({ ok: true }) : json({ error: "notFound" }, 404);
    }

    return json({ error: "invalidAction" }, 400);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return json({ error: "tickerTaken" }, 409);
    return authError("serverError", 500, request);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const user = await requestUser(request);
    if (user?.role !== "admin") return authError("forbidden", 403, request);
    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "invalidAction" }, 400);
    const body = parsed as Record<string, unknown>;
    await connectDB();
    if (body.action === "refreshMetalPrices") {
      const result = await refreshMetalPrices();
      return json({ result, prices: await getAdminPrices() });
    }
    if (body.action !== "refreshPrices") return json({ error: "invalidAction" }, 400);
    const result = await refreshPrices();
    return json({ result, prices: await getAdminPrices() });
  } catch {
    return authError("serverError", 500, request);
  }
}

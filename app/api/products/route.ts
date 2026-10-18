import { readProducts } from "@/lib/server-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const category = new URL(request.url).searchParams.get("category") || undefined;
    return Response.json(await readProducts(category), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Products could not be loaded. Check the database connection and required server configuration." }, { status: 500 });
  }
}

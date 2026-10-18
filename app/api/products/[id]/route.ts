import { readProduct } from "@/lib/server-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const product = await readProduct(id);
    if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json(product, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Product could not be loaded. Check the database connection and required server configuration." }, { status: 500 });
  }
}

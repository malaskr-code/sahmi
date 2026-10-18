import type { Product } from "./product-types";
export type { Product } from "./product-types";

export class ProductRequestError extends Error {
 constructor(public status: number) { super("Products could not be loaded."); }
}
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
 const response = await fetch(path, { signal, cache: "no-store" });
 if (!response.ok) throw new ProductRequestError(response.status);
 return response.json();
}
export function getProducts(signal?: AbortSignal): Promise<Product[]> {
 return request("/api/products", signal);
}
export function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
 return request(`/api/products/${encodeURIComponent(id)}`, signal);
}
export const SERVICE_FEE = 0.25;
export function formatKwd(value:number,lang:"en"|"ar"="en") {
 return new Intl.NumberFormat(lang==="ar"?"ar-KW":"en-KW",{minimumFractionDigits:3,maximumFractionDigits:3}).format(value)+" "+(lang==="ar"?"د.ك":"KWD");
}

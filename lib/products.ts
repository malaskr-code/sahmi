import { sampleProducts, type Product } from "@/data/sampleProducts";
export function getProducts(): Product[] { return sampleProducts.map((product) => ({...product})); }
export function getProduct(id: string): Product | undefined { return getProducts().find((product) => product.id === id); }
export const SERVICE_FEE = 0.25;
export function formatKwd(value:number,lang:"en"|"ar"="en") {
 return new Intl.NumberFormat(lang==="ar"?"ar-KW":"en-KW",{minimumFractionDigits:3,maximumFractionDigits:3}).format(value)+" "+(lang==="ar"?"د.ك":"KWD");
}

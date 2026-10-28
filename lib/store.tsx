"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "@/data/en";
import ar from "@/data/ar";
import { CARD_THEME_IDS, type CardThemeId } from "@/data/cardThemes";
import type { Product } from "@/lib/product-types";
type Lang="en"|"ar";
export type GiftItem={product:Product;shares:number};
export type Gift={items:GiftItem[];theme:CardThemeId};
type StoreContextType={lang:Lang; t:typeof en; dark:boolean; ready:boolean; setLang:(v:Lang)=>void; toggleTheme:()=>void; gift:Gift|null; setGift:(v:Gift|null)=>void};
const StoreContext=createContext<StoreContextType|null>(null);

function normalizeGift(value: unknown): Gift | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as { items?: unknown; product?: unknown; shares?: unknown; theme?: unknown };
  const rawItems = Array.isArray(saved.items)
    ? saved.items
    : saved.product && typeof saved.shares === "number"
      ? [{ product: saved.product, shares: saved.shares }]
      : [];
  const items: GiftItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { product?: unknown; shares?: unknown };
    const product = item.product as Product | undefined;
    if (!product || typeof product.id !== "string" || !product.id || !Number.isSafeInteger(item.shares) || Number(item.shares) < 1) continue;
    const existing = items.find(savedItem => savedItem.product.id === product.id);
    if (existing) existing.shares = Number(item.shares);
    else if (items.length < 5) items.push({ product, shares: Number(item.shares) });
  }
  if (!items.length) return null;
  const theme = CARD_THEME_IDS.includes(saved.theme as CardThemeId) ? saved.theme as CardThemeId : "general";
  return { items, theme };
}

export function StoreProvider({children}:{children:ReactNode}){
 const [lang,setLangState]=useState<Lang>("en"),[dark,setDark]=useState(false),[gift,setGiftState]=useState<Gift|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{const l=localStorage.getItem("sahmi-lang"),g=localStorage.getItem("sahmi-gift"),savedTheme=localStorage.getItem("sahmi-theme");if(l==="ar")setLangState("ar");setDark(savedTheme==="dark");if(g){try{const restored=normalizeGift(JSON.parse(g));if(restored){setGiftState(restored);localStorage.setItem("sahmi-gift",JSON.stringify(restored))}else localStorage.removeItem("sahmi-gift")}catch{localStorage.removeItem("sahmi-gift")}}setReady(true)},[]);
 useEffect(()=>{document.body.classList.toggle("dark",dark);document.documentElement.dataset.theme=dark?"dark":"light";document.body.dir=lang==="ar"?"rtl":"ltr";document.documentElement.lang=lang;},[dark,lang]);
 const setLang=(v:Lang)=>{setLangState(v);localStorage.setItem("sahmi-lang",v)};
 const toggleTheme=()=>{const next=!dark,theme=next?"dark":"light";setDark(next);localStorage.setItem("sahmi-theme",theme);document.documentElement.dataset.theme=theme;document.body.classList.toggle("dark",next)};
  const setGift=(v:Gift|null)=>{const normalized=v?normalizeGift(v):null;setGiftState(normalized);if(normalized)localStorage.setItem("sahmi-gift",JSON.stringify(normalized));else localStorage.removeItem("sahmi-gift")};
  return <StoreContext.Provider value={{lang,t:lang==="ar"?ar:en,dark,ready,setLang,toggleTheme,gift,setGift}}>{children}</StoreContext.Provider>
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error("useStore must be inside StoreProvider");return value}

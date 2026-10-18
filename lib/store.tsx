"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "@/data/en";
import ar from "@/data/ar";
import type { Product } from "@/data/sampleProducts";
type Lang="en"|"ar";
type Gift={product:Product;shares:number};
type StoreContextType={lang:Lang; t:typeof en; dark:boolean; setLang:(v:Lang)=>void; toggleTheme:()=>void; gift:Gift|null; setGift:(v:Gift|null)=>void};
const StoreContext=createContext<StoreContextType|null>(null);
export function StoreProvider({children}:{children:ReactNode}){
 const [lang,setLangState]=useState<Lang>("en"),[dark,setDark]=useState(false),[gift,setGiftState]=useState<Gift|null>(null);
 useEffect(()=>{const l=localStorage.getItem("sahmi-lang"),d=localStorage.getItem("sahmi-theme"),g=localStorage.getItem("sahmi-gift");if(l==="ar")setLangState("ar");if(d==="dark")setDark(true);if(g){try{setGiftState(JSON.parse(g))}catch{localStorage.removeItem("sahmi-gift")}}},[]);
 useEffect(()=>{document.body.classList.toggle("dark",dark);document.body.dir=lang==="ar"?"rtl":"ltr";document.documentElement.lang=lang;},[dark,lang]);
 const setLang=(v:Lang)=>{setLangState(v);localStorage.setItem("sahmi-lang",v)};
 const toggleTheme=()=>setDark(v=>{localStorage.setItem("sahmi-theme",v?"light":"dark");return !v});
 const setGift=(v:Gift|null)=>{setGiftState(v);if(v)localStorage.setItem("sahmi-gift",JSON.stringify(v));else localStorage.removeItem("sahmi-gift")};
 return <StoreContext.Provider value={{lang,t:lang==="ar"?ar:en,dark,setLang,toggleTheme,gift,setGift}}>{children}</StoreContext.Provider>
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error("useStore must be inside StoreProvider");return value}

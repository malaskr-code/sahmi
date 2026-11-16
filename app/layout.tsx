import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { LoginPrompt } from "@/components/LoginPrompt";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
export const metadata:Metadata={
  title:"Sahmi — a gift that grows",
  description:"Give a share gift from a Kuwaiti company.",
  applicationName:"Sahmi",
  manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Sahmi",statusBarStyle:"default"},
  icons:{
    icon:[
      {url:"/pwa/icon-192x192.png",sizes:"192x192",type:"image/png"},
      {url:"/pwa/icon-512x512.png",sizes:"512x512",type:"image/png"},
    ],
    apple:{url:"/pwa/icon-192x192.png",sizes:"192x192",type:"image/png"},
  },
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning><body><Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem("sahmi-theme")==="dark"?"dark":"light"}catch{document.documentElement.dataset.theme="light"}`}}/><ServiceWorkerRegistration/><StoreProvider><AuthProvider><Navbar/><main>{children}</main><Footer/><BackToTopButton/><LoginPrompt/></AuthProvider></StoreProvider></body></html>
}

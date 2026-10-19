import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
export const metadata:Metadata={title:"Sahmi",description:"Give a share gift from a Kuwaiti company."};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning><body><Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem("sahmi-theme")==="dark"?"dark":"light"}catch{document.documentElement.dataset.theme="light"}`}}/><StoreProvider><AuthProvider><Navbar/><main>{children}</main><Footer/><BackToTopButton/></AuthProvider></StoreProvider></body></html>
}

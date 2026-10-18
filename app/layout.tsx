import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
export const metadata:Metadata={title:"Sahmi — a gift that grows",description:"Give a share gift from a Kuwaiti company."};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><StoreProvider><Navbar/><main>{children}</main><Footer/></StoreProvider></body></html>
}

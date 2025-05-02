import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { ClerkProvider, SignIn } from '@clerk/nextjs'
import {
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";


export const metadata: Metadata = {
  title: "FinSage",
  description: "Personalized Financial Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>

      <html lang="en" suppressHydrationWarning={true}>
        <body>
          <SignedOut >
            <div className="flex h-screen items-center justify-center">
              <SignIn />
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </div>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}

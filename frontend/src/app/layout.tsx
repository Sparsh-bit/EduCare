import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduCare ERP — Complete School Management Software for Indian Schools",
  description:
    "CBSE-aligned school ERP with student management, fee collection, attendance, examinations, HR, and parent portal. Used by 200+ schools across India.",
  keywords: "school ERP, CBSE school management, India school software, educare, concilio, attendance, fee management, examination",
  openGraph: {
    title: "EduCare ERP — Complete School Management Software",
    description: "CBSE-aligned school ERP for Indian schools. Student management, fee collection, attendance, and more.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen relative">
        <div className="premium-noise" />
        {children}
      </body>
    </html>
  );
}

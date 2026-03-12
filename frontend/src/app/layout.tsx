import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCare ERP by Concilio",
  description: "Multi-tenant School ERP System by Concilio.",
  keywords: "school ERP, educare, concilio, attendance, fee management, examination",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

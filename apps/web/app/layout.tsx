import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WorkFlow",
  description: "AI-generated SOP training videos with quizzes and checklists",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #eee", background: "#fff" }}>
          <a href="/" style={{ fontWeight: 600 }}>WorkFlow</a>
          <nav style={{ float: "right" }}>
            <a href="/upload" style={{ marginRight: "1rem" }}>Upload</a>
            <a href="/dashboard">Dashboard</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

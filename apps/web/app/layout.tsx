import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WorkFlow — An AI manager for repeatable work",
  description:
    "Turn any SOP, Loom, or checklist into a training system. WorkFlow teaches employees, verifies execution, and retrains them when they make mistakes — so managers can step out of the loop.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <a href="/" aria-label="WorkFlow home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/workflow_secondary_lockup.svg" alt="WorkFlow" />
            </a>
            <nav className="site-nav">
              <a href="/onboarding">Create training</a>
              <a href="/dashboard">Dashboard</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

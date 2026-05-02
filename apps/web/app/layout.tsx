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

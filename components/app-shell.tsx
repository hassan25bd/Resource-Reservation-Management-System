"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useEffect } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export function AppShell({ children, pageTitle, requireAuth = false }: { children: ReactNode; pageTitle?: string; requireAuth?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to verify your sign-in status.");
        const payload: unknown = await response.json();
        if (typeof payload === "object" && payload !== null && "user" in payload) {
          const value = payload.user;
          if (
            typeof value === "object" &&
            value !== null &&
            "id" in value &&
            typeof value.id === "string" &&
            "name" in value &&
            typeof value.name === "string" &&
            "email" in value &&
            typeof value.email === "string"
          ) {
            setUser({ id: value.id, name: value.name, email: value.email });
          }
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setAuthError(cause instanceof Error ? cause.message : "Unable to verify your sign-in status.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAuthLoading(false);
      });

    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    setAuthError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      setUser(null);
      router.push("/login");
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Unable to sign out.");
    }
  };

  const tabs = [
    { href: "/", label: "Home" },
    { href: "/resources", label: "Resources" },
    { href: "/bookings", label: "Bookings" },
  ];

  return (
    <main className="app-shell">
      <div className="dashboard">
        <header className="topbar">
          <Link className="brand" href="/" aria-label="PrimeWave Lab home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M5 22c5-10 11 10 17 0s11-10 13-3" />
                <path d="M5 28c5-8 11 8 17 0s11-8 13-2" />
                <path d="M26 13a5 5 0 1 1 5 5" />
              </svg>
            </span>
            <span className="brand-copy">
              <strong>PrimeWave Lab</strong>
              <small>Turning complexity into possibility</small>
            </span>
          </Link>

          <nav className="topbar-nav" aria-label="Main navigation">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={pathname === tab.href ? "nav-link active" : "nav-link"}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="user-actions">
            {user ? (
              <>
                <span className="user-pill">Hi, {user.name}</span>
                <button className="button button-secondary" type="button" onClick={() => void handleLogout()}>
                  Log out
                </button>
              </>
            ) : isAuthLoading ? (
              <span className="user-pill" aria-live="polite">Checking sign-in…</span>
            ) : (
              <Link className="button button-secondary" href="/login">
                Login
              </Link>
            )}
          </div>
        </header>

        {authError && <div className="notice notice-error" role="alert"><span>!</span>{authError}</div>}

        {pageTitle ? (
          <section className="page-intro">
            <p className="eyebrow"><span /> PrimeWave booking system</p>
            <h1>{pageTitle}</h1>
          </section>
        ) : null}

        {requireAuth && isAuthLoading ? (
          <div className="empty-state auth-loading">Checking your sign-in…</div>
        ) : requireAuth && !user ? (
          <section className="panel auth-required">
            <h2>Sign in to continue</h2>
            <p>Your booking workspace is available after you sign in.</p>
            <Link className="button button-primary" href="/login">Sign in or create an account</Link>
          </section>
        ) : children}

        <footer className="footer">
          <span>PrimeWave Lab (Pvt) Ltd</span>
          <span>Shared resources, thoughtfully coordinated.</span>
        </footer>
      </div>
    </main>
  );
}

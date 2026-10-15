"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("Team Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(isRegistering ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isRegistering ? { name } : {}),
          email,
          password,
        }),
      });
      const payload: unknown = await response.json();
      const data = typeof payload === "object" && payload !== null
        ? payload as { error?: unknown }
        : {};

      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Unable to authenticate. Please try again.");
        return;
      }

      router.push("/bookings");
      router.refresh();
    } catch {
      setError("Unable to connect to the authentication service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow"><span /> Secure access</p>
          <h1>Welcome back</h1>
          <p>Sign in or create an account to book shared spaces, check live availability, and manage your reservations.</p>
          <ul>
            <li>Your own reservation schedule</li>
            <li>Live availability checks</li>
            <li>Secure, private sign-in</li>
          </ul>
        </div>

        <form className="panel form-panel auth-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your account</p>
              <h2>{isRegistering ? "Create account" : "Sign in"}</h2>
            </div>
            <span className="form-badge">01</span>
          </div>

          <div className="form-fields">
            {isRegistering && (
              <label className="field">
                <span>Full name</span>
                <input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </label>
            )}

            <label className="field">
              <span>Email</span>
              <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>

            <label className="field">
              <span>Password</span>
              <input required type="password" autoComplete={isRegistering ? "new-password" : "current-password"} minLength={isRegistering ? 8 : undefined} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegistering ? "At least 8 characters" : "Your password"} />
            </label>

            {error && <div className="notice notice-error auth-error" role="alert"><span>!</span>{error}</div>}

            <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : isRegistering ? "Create account" : "Sign in"}
            </button>

            <button className="auth-link auth-mode-toggle" type="button" onClick={() => {
              setError(null);
              setIsRegistering(!isRegistering);
            }}>
              {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>

            <Link className="auth-link" href="/">
              Back to home
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

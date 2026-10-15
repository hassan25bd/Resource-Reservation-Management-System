import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="hero-grid">
        <div className="panel hero-panel">
          <p className="eyebrow"><span /> Your space, on your schedule</p>
          <h1>Find a space. Pick your time. Get on with your day.</h1>
          <p className="hero-description">
            Book meeting rooms and shared resources in a few clear steps. See your schedule, choose a time, and check availability before you confirm.
          </p>

          <div className="hero-cta-row">
            <Link className="button button-primary" href="/login">
              Find a time to book
            </Link>
            <Link className="button button-secondary" href="/resources">
              Browse spaces
            </Link>
          </div>

          <div className="hero-proof">
            <span className="proof-icon">✓</span>
            <span>
              <strong>Your booking, checked before confirmation</strong>
              <small>Live availability helps prevent double bookings.</small>
            </span>
          </div>
        </div>

        <div className="panel summary-panel">
          <div className="mini-stat">
            <span className="mini-label">Step 1</span>
            <strong>Choose a space</strong>
            <small>Browse rooms and resources that fit your plans.</small>
          </div>
          <div className="mini-stat accent">
            <span className="mini-label">Step 2</span>
            <strong>Pick a time</strong>
            <small>Set your date and highlight the time that works.</small>
          </div>
          <div className="focus-card">
            <p>Simple booking</p>
            <div className="focus-row">
              <span><i className="legend-free" /> Check availability</span>
              <strong>03</strong>
            </div>
            <div className="focus-row">
              <span><i className="legend-free" /> Confirm your booking</span>
              <strong>04</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel feature-card">
          <span className="feature-badge">01</span>
          <h3>Everything in one place</h3>
          <p>Browse resources, check availability, and keep track of your upcoming reservations.</p>
        </article>
        <article className="panel feature-card">
          <span className="feature-badge">02</span>
          <h3>See your schedule clearly</h3>
          <p>Your booking list and reservation form sit side by side on larger screens for easy planning.</p>
        </article>
        <article className="panel feature-card">
          <span className="feature-badge">03</span>
          <h3>Choose a time with confidence</h3>
          <p>Highlighted time slots and clear availability feedback make each booking easier to understand.</p>
        </article>
      </section>
    </AppShell>
  );
}

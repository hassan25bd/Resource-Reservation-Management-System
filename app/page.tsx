"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Resource = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

type Reservation = {
  id: string;
  resourceId: string;
  userName: string;
  email: string | null;
  title: string;
  note: string | null;
  startAt: string;
  endAt: string;
  status: string;
  resource?: Resource;
};

type DashboardStats = {
  totalResources: number;
  activeResources: number;
  totalReservations: number;
  todayReservations: number;
  busyResources: number;
  availableResources: number;
};

const defaultResourceForm = {
  name: "",
  category: "Conference Room",
  location: "",
  capacity: "6",
  description: "",
  isActive: true,
};

const defaultReservationForm = {
  resourceId: "",
  userName: "",
  email: "",
  title: "",
  note: "",
  startAt: "",
  endAt: "",
};

const emptyStats: DashboardStats = {
  totalResources: 0,
  activeResources: 0,
  totalReservations: 0,
  todayReservations: 0,
  busyResources: 0,
  availableResources: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (isRecord(payload)) {
    const values = Object.values(payload).flatMap((value) =>
      Array.isArray(value) ? value : [value],
    );
    return values.map(String).join(" ") || "Something went wrong.";
  }
  return "Something went wrong.";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
}

function localDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [busyResourceIds, setBusyResourceIds] = useState<string[]>([]);
  const [resourceForm, setResourceForm] = useState(defaultResourceForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);
  const [availabilityAvailable, setAvailabilityAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  const refreshData = useCallback(async () => {
    const sequence = ++refreshSequence.current;

    try {
      const [resourceResponse, reservationResponse, dashboardResponse] = await Promise.all([
        fetch("/api/resources", { cache: "no-store" }),
        fetch("/api/reservations", { cache: "no-store" }),
        fetch("/api/dashboard", { cache: "no-store" }),
      ]);
      const [resourceData, reservationData, dashboardData] = await Promise.all([
        readJson(resourceResponse),
        readJson(reservationResponse),
        readJson(dashboardResponse),
      ]);

      if (!resourceResponse.ok) throw new Error(getErrorText(resourceData));
      if (!reservationResponse.ok) throw new Error(getErrorText(reservationData));
      if (!dashboardResponse.ok) throw new Error(getErrorText(dashboardData));
      if (!Array.isArray(resourceData) || !Array.isArray(reservationData) || !isRecord(dashboardData)) {
        throw new Error("The server returned unexpected dashboard data.");
      }

      if (sequence !== refreshSequence.current) return;

      setResources(resourceData as Resource[]);
      setReservations(reservationData as Reservation[]);
      if (isRecord(dashboardData.stats)) {
        setStats({ ...emptyStats, ...dashboardData.stats } as DashboardStats);
      }
      setBusyResourceIds(
        Array.isArray(dashboardData.busyResourceIds)
          ? dashboardData.busyResourceIds.filter((id): id is string => typeof id === "string")
          : [],
      );
      setError(null);
    } catch (cause) {
      if (sequence === refreshSequence.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load reservation data.");
      }
    } finally {
      if (sequence === refreshSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let disposed = false;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const scheduleRefresh = () => {
      clearTimer();
      if (disposed || document.hidden) return;

      timer = window.setTimeout(() => {
        void refreshData().finally(scheduleRefresh);
      }, 30_000);
    };

    const refreshOnReturn = () => {
      if (document.hidden) {
        clearTimer();
        return;
      }
      void refreshData().finally(scheduleRefresh);
    };

    timer = window.setTimeout(() => {
      void refreshData().finally(scheduleRefresh);
    }, 0);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [refreshData]);

  const checkAvailability = async () => {
    setError(null);
    setAvailabilityMsg(null);
    setAvailabilityAvailable(null);

    if (!reservationForm.resourceId || !reservationForm.startAt || !reservationForm.endAt) {
      setAvailabilityMsg("Choose a resource and a valid date range first.");
      setAvailabilityAvailable(false);
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const params = new URLSearchParams({
        resourceId: reservationForm.resourceId,
        startAt: new Date(reservationForm.startAt).toISOString(),
        endAt: new Date(reservationForm.endAt).toISOString(),
      });
      const response = await fetch(`/api/availability?${params.toString()}`);
      const payload = await readJson(response);
      const data = isRecord(payload) ? payload : {};

      if (!response.ok) {
        setAvailabilityAvailable(false);
        setAvailabilityMsg(getErrorText(data.message ?? data.error));
        return;
      }

      setAvailabilityMsg(typeof data.message === "string" ? data.message : "Availability checked.");
      setAvailabilityAvailable(data.available === true);
    } catch (cause) {
      setAvailabilityAvailable(false);
      setAvailabilityMsg(cause instanceof Error ? cause.message : "Unable to check availability.");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleResourceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSavingResource(true);

    try {
      const response = await fetch("/api/resources", {
        method: editingResourceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resourceForm,
          ...(editingResourceId ? { id: editingResourceId } : {}),
          capacity: Number(resourceForm.capacity),
        }),
      });
      const payload = await readJson(response);
      const data = isRecord(payload) ? payload : {};

      if (!response.ok) {
        setError(getErrorText(data.error ?? data.message));
        return;
      }

      setSuccess(`Resource "${String(data.name)}" ${editingResourceId ? "updated" : "added"} successfully.`);
      setResourceForm(defaultResourceForm);
      setEditingResourceId(null);
      await refreshData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this resource.");
    } finally {
      setIsSavingResource(false);
    }
  };

  const editResource = (resource: Resource) => {
    setEditingResourceId(resource.id);
    setResourceForm({
      name: resource.name,
      category: resource.category,
      location: resource.location ?? "",
      capacity: String(resource.capacity),
      description: resource.description ?? "",
      isActive: resource.isActive,
    });
    document.getElementById("resource-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleReservationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSavingReservation(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reservationForm,
          startAt: new Date(reservationForm.startAt).toISOString(),
          endAt: new Date(reservationForm.endAt).toISOString(),
        }),
      });
      const payload = await readJson(response);
      const data = isRecord(payload) ? payload : {};

      if (!response.ok) {
        setError(getErrorText(data.error ?? data.message));
        return;
      }

      setSuccess(`Booking for "${String(data.title)}" was created successfully.`);
      setReservationForm(defaultReservationForm);
      setAvailabilityMsg(null);
      setAvailabilityAvailable(null);
      await refreshData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create this reservation.");
    } finally {
      setIsSavingReservation(false);
    }
  };

  const handleCancelReservation = async (id: string) => {
    setError(null);
    setSuccess(null);
    setCancellingReservationId(id);

    try {
      const response = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await readJson(response);
      const data = isRecord(payload) ? payload : {};

      if (!response.ok) {
        setError(getErrorText(data.error ?? data.message));
        return;
      }

      setSuccess("Reservation cancelled successfully.");
      await refreshData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel this reservation.");
    } finally {
      setCancellingReservationId(null);
    }
  };

  const metricCards = [
    { label: "Resources in catalog", value: stats.totalResources, caption: "Across all categories", tone: "mint" },
    { label: "Available right now", value: stats.availableResources, caption: "Ready to reserve", tone: "blue" },
    { label: "In use right now", value: stats.busyResources, caption: "Active reservations", tone: "amber" },
    { label: "Bookings today", value: stats.todayReservations, caption: `${stats.totalReservations} active overall`, tone: "violet" },
  ];

  return (
    <main className="app-shell">
      <div className="dashboard">
        <header className="topbar">
          <a className="brand" href="#" aria-label="PrimeWave Lab home">
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
          </a>
          <nav className="topbar-nav" aria-label="Main navigation">
            <a href="#resources">Resources</a>
            <a href="#reservations">Reservations</a>
            <a href="#resource-form">Manage inventory</a>
          </nav>
          <div className="system-status"><span /> System operational</div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Resource coordination platform</p>
            <h1>Make every shared space <em>work smarter.</em></h1>
            <p className="hero-description">
              One clear view of your rooms, equipment and team bookings. Check availability before you book and keep every resource moving.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#reservation-form">Make a reservation <span aria-hidden="true">↗</span></a>
              <a className="button button-secondary" href="#resources">Explore resources</a>
            </div>
            <div className="hero-proof">
              <span className="proof-icon">✓</span>
              <span><strong>Conflict protected</strong><small>Every booking is checked against live availability.</small></span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Live resource availability overview">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-sweep" />
            <div className="visual-core"><span>PW</span><small>LIVE SYSTEM</small></div>
            <div className="visual-tag visual-tag-top"><span className="tag-dot green" /> {stats.availableResources} available now</div>
            <div className="visual-tag visual-tag-bottom"><span className="tag-dot gold" /> {stats.busyResources} currently in use</div>
            <div className="visual-caption">Resource intelligence <span>01 / LIVE</span></div>
          </div>
        </section>

        <section className="metrics" aria-label="Resource dashboard summary">
          {metricCards.map((card) => (
            <article className={`metric-card metric-${card.tone}`} key={card.label}>
              <div className="metric-topline"><span className="metric-dot" /><span>{card.caption}</span></div>
              <p className="metric-value">{isLoading ? "—" : card.value}</p>
              <h2>{card.label}</h2>
            </article>
          ))}
        </section>

        {(error || success) && (
          <div className={`notice ${error ? "notice-error" : "notice-success"}`} role={error ? "alert" : "status"}>
            <span>{error ? "!" : "✓"}</span>{error || success}
          </div>
        )}

        <section className="content-grid" id="resources">
          <div className="panel resources-panel">
            <div className="section-heading">
              <div><p className="eyebrow">Your shared inventory</p><h2>Resource directory</h2></div>
              <a className="text-link" href="#resource-form">+ Add resource</a>
            </div>
            <div className="resource-summary">
              <span><i className="status-indicator" /> {stats.activeResources} active resources</span>
              <span>{stats.availableResources} available now</span>
            </div>
            {isLoading ? (
              <div className="empty-state">Loading resources from your database…</div>
            ) : resources.length === 0 ? (
              <div className="empty-state">No resources yet. Add a room or piece of equipment to get started.</div>
            ) : (
              <div className="resource-list">
                {resources.map((resource, index) => {
                  const isBusy = busyResourceIds.includes(resource.id);
                  const currentState = !resource.isActive ? "Offline" : isBusy ? "In use" : "Available";
                  return (
                    <article className="resource-card" key={resource.id}>
                      <div className={`resource-icon resource-icon-${index % 4}`} aria-hidden="true">
                        {resource.category.toLowerCase().includes("equipment") ? "▣" : resource.category.toLowerCase().includes("workspace") ? "⌂" : "▦"}
                      </div>
                      <div className="resource-info">
                        <div className="resource-title-row">
                          <h3>{resource.name}</h3>
                          <span className={`availability-pill ${!resource.isActive ? "pill-offline" : isBusy ? "pill-busy" : "pill-available"}`}>
                            <i />{currentState}
                          </span>
                        </div>
                        <p className="resource-meta">{resource.category}{resource.location ? ` · ${resource.location}` : ""}</p>
                        <div className="resource-capacity"><span>Capacity / units</span><strong>{resource.capacity}</strong></div>
                        {resource.description && <p className="resource-description">{resource.description}</p>}
                      </div>
                      <button className="icon-button" type="button" onClick={() => editResource(resource)} aria-label={`Edit ${resource.name}`} title="Edit resource">↗</button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <form id="resource-form" className="panel form-panel" onSubmit={handleResourceSubmit}>
            <div className="section-heading">
              <div><p className="eyebrow">{editingResourceId ? "Update inventory" : "Grow your inventory"}</p><h2>{editingResourceId ? "Edit resource" : "Add a resource"}</h2></div>
              <span className="form-badge">01</span>
            </div>
            <div className="form-fields">
              <label className="field"><span>Resource name</span>
                <input required minLength={2} value={resourceForm.name} onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })} placeholder="e.g. Boardroom Alpha" />
              </label>
              <div className="field-row">
                <label className="field"><span>Category</span>
                  <select required value={resourceForm.category} onChange={(event) => setResourceForm({ ...resourceForm, category: event.target.value })}>
                    <option>Conference Room</option><option>Meeting Room</option><option>Equipment</option><option>Workspace</option><option>Lab</option>
                  </select>
                </label>
                <label className="field"><span>Capacity / units</span>
                  <input type="number" min={1} required value={resourceForm.capacity} onChange={(event) => setResourceForm({ ...resourceForm, capacity: event.target.value })} />
                </label>
              </div>
              <label className="field"><span>Location</span>
                <input value={resourceForm.location} onChange={(event) => setResourceForm({ ...resourceForm, location: event.target.value })} placeholder="e.g. Floor 2" />
              </label>
              <label className="field"><span>Description <small>Optional</small></span>
                <textarea rows={3} value={resourceForm.description} onChange={(event) => setResourceForm({ ...resourceForm, description: event.target.value })} placeholder="What should teams know about this resource?" />
              </label>
              <label className="toggle-row"><input type="checkbox" checked={resourceForm.isActive} onChange={(event) => setResourceForm({ ...resourceForm, isActive: event.target.checked })} /><span className="toggle-track" /><span><strong>Active and bookable</strong><small>Inactive resources stay in your catalog.</small></span></label>
              <button className="button button-primary button-wide" type="submit" disabled={isSavingResource}>
                {isSavingResource ? "Saving…" : editingResourceId ? "Save changes" : "Add to inventory"}
              </button>
              {editingResourceId && <button className="button button-quiet button-wide" type="button" onClick={() => { setEditingResourceId(null); setResourceForm(defaultResourceForm); }}>Cancel editing</button>}
            </div>
          </form>
        </section>

        <section className="booking-grid" id="reservations">
          <div className="booking-side">
            <div className="panel booking-panel">
              <div className="section-heading">
                <div><p className="eyebrow">The schedule</p><h2>Upcoming reservations</h2></div>
                <span className="count-badge">{reservations.length} bookings</span>
              </div>
              {isLoading ? (
                <div className="empty-state">Loading reservations…</div>
              ) : reservations.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-calendar" aria-hidden="true">
                    <span className="calendar-rings" />
                    <span className="calendar-lines"><i /><i /><i /></span>
                    <span className="calendar-check">✓</span>
                  </span>
                  <strong>Your schedule is clear</strong>
                  <span>No upcoming bookings. Your team has room to plan.</span>
                  <a href="#reservation-form">Make the first reservation <span aria-hidden="true">↗</span></a>
                </div>
              ) : (
                <div className="reservation-list">
                  {reservations.map((reservation) => (
                    <article className="reservation-card" key={reservation.id}>
                      <div className="reservation-date">
                        <strong>{new Date(reservation.startAt).toLocaleDateString(undefined, { day: "2-digit" })}</strong>
                        <span>{new Date(reservation.startAt).toLocaleDateString(undefined, { month: "short" })}</span>
                      </div>
                      <div className="reservation-details">
                        <h3>{reservation.title}</h3>
                        <p>{reservation.resource?.name ?? "Unknown resource"} <span>·</span> {reservation.userName}</p>
                        <small>{localDateTime(reservation.startAt)} – {localDateTime(reservation.endAt)}</small>
                      </div>
                      <button className="cancel-button" type="button" onClick={() => void handleCancelReservation(reservation.id)} disabled={cancellingReservationId === reservation.id}>
                        {cancellingReservationId === reservation.id ? "…" : "Cancel"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="panel availability-panel">
              <div className="section-heading">
                <div><p className="eyebrow">Live inventory</p><h2>Availability at a glance</h2></div>
                <span className="live-badge" title="Automatically refreshes every 30 seconds while this page is open, and when you return to the tab"><i /> Live · 30s</span>
              </div>
              <div className="availability-overview">
                <div className="availability-total">
                  <strong>{isLoading ? "—" : stats.availableResources}</strong>
                  <span>resources ready to book <small>of {isLoading ? "—" : stats.activeResources} active</small></span>
                </div>
                <div
                  className="availability-bar"
                  role="img"
                  aria-label={`${stats.availableResources} of ${stats.activeResources} active resources available now`}
                >
                  <span style={{ width: `${stats.activeResources ? (stats.availableResources / stats.activeResources) * 100 : 0}%` }} />
                </div>
                <div className="availability-legend">
                  <span><i className="legend-free" /> Available <strong>{isLoading ? "—" : stats.availableResources}</strong></span>
                  <span><i className="legend-busy" /> In use <strong>{isLoading ? "—" : stats.busyResources}</strong></span>
                </div>
              </div>
              <div className="availability-resource-list">
                {resources.length === 0 && !isLoading ? (
                  <p className="availability-empty">Add a resource to see its live status here.</p>
                ) : resources.slice(0, 3).map((resource) => {
                  const isBusy = busyResourceIds.includes(resource.id);
                  const status = !resource.isActive ? "Offline" : isBusy ? "In use" : "Available";
                  return (
                    <div className="availability-resource" key={resource.id}>
                      <span className="availability-resource-icon" aria-hidden="true">{resource.category.toLowerCase().includes("equipment") ? "▣" : "▦"}</span>
                      <span className="availability-resource-name"><strong>{resource.name}</strong><small>{resource.location || resource.category}</small></span>
                      <span className={`availability-resource-status ${!resource.isActive ? "resource-status-offline" : isBusy ? "resource-status-busy" : "resource-status-free"}`}><i />{status}</span>
                    </div>
                  );
                })}
              </div>
              <a className="availability-footer-link" href="#resource-form">Manage your resources <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <form className="panel form-panel reservation-form" id="reservation-form" onSubmit={handleReservationSubmit}>
            <div className="section-heading">
              <div><p className="eyebrow">Plan ahead</p><h2>Book a resource</h2></div>
              <span className="form-badge">02</span>
            </div>
            <div className="form-fields">
              <label className="field"><span>Choose a resource</span>
                <select required value={reservationForm.resourceId} onChange={(event) => { setReservationForm({ ...reservationForm, resourceId: event.target.value }); setAvailabilityMsg(null); setAvailabilityAvailable(null); }}>
                  <option value="">Select an available resource</option>
                  {resources.filter((resource) => resource.isActive).map((resource) => <option key={resource.id} value={resource.id}>{resource.name} · {resource.category}</option>)}
                </select>
              </label>
              <div className="field-row">
                <label className="field"><span>Start time</span>
                  <input type="datetime-local" required value={reservationForm.startAt} onChange={(event) => { setReservationForm({ ...reservationForm, startAt: event.target.value }); setAvailabilityMsg(null); setAvailabilityAvailable(null); }} />
                </label>
                <label className="field"><span>End time</span>
                  <input type="datetime-local" required value={reservationForm.endAt} onChange={(event) => { setReservationForm({ ...reservationForm, endAt: event.target.value }); setAvailabilityMsg(null); setAvailabilityAvailable(null); }} />
                </label>
              </div>
              <label className="field"><span>Booked by</span>
                <input required minLength={2} value={reservationForm.userName} onChange={(event) => setReservationForm({ ...reservationForm, userName: event.target.value })} placeholder="Your name" />
              </label>
              <label className="field"><span>Work email</span>
                <input type="email" required value={reservationForm.email} onChange={(event) => setReservationForm({ ...reservationForm, email: event.target.value })} placeholder="you@company.com" />
              </label>
              <label className="field"><span>Booking title</span>
                <input required minLength={3} value={reservationForm.title} onChange={(event) => setReservationForm({ ...reservationForm, title: event.target.value })} placeholder="e.g. Product planning" />
              </label>
              <label className="field"><span>Notes <small>Optional</small></span>
                <textarea rows={2} value={reservationForm.note} onChange={(event) => setReservationForm({ ...reservationForm, note: event.target.value })} placeholder="Anything the team should know?" />
              </label>
              <button className="button button-secondary button-wide" type="button" onClick={() => void checkAvailability()} disabled={isCheckingAvailability}>
                {isCheckingAvailability ? "Checking live schedule…" : "Check availability"}
              </button>
              {availabilityMsg && <div className={`availability-message ${availabilityAvailable ? "message-free" : "message-busy"}`} role="status"><span>{availabilityAvailable ? "✓" : "!"}</span>{availabilityMsg}</div>}
              <button className="button button-primary button-wide" type="submit" disabled={isSavingReservation || resources.filter((resource) => resource.isActive).length === 0}>
                {isSavingReservation ? "Confirming…" : "Confirm reservation"}
              </button>
              <p className="form-footnote">Availability is verified again when you confirm, so overlapping bookings cannot be created.</p>
            </div>
          </form>
        </section>

        <footer className="footer">
          <span>PrimeWave Lab (Pvt) Ltd</span>
          <span>Shared resources, thoughtfully coordinated.</span>
        </footer>
      </div>
    </main>
  );
}

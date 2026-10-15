"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";

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

const defaultReservationForm = {
  resourceId: "",
  title: "",
  note: "",
  startAt: "",
  endAt: "",
};

const timeSlots = [
  { label: "Morning", startHour: 9, endHour: 11 },
  { label: "Midday", startHour: 12, endHour: 14 },
  { label: "Afternoon", startHour: 15, endHour: 17 },
  { label: "Evening", startHour: 18, endHour: 20 },
];

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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function BookingsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [busyResourceIds, setBusyResourceIds] = useState<string[]>([]);
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);
  const [availabilityAvailable, setAvailabilityAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
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
        throw new Error("The server returned unexpected booking data.");
      }

      setResources(resourceData as Resource[]);
      setReservations(reservationData as Reservation[]);
      setBusyResourceIds(
        Array.isArray(dashboardData.busyResourceIds)
          ? dashboardData.busyResourceIds.filter((id): id is string => typeof id === "string")
          : [],
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load reservation data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshData]);

  const bookableResources = useMemo(
    () => resources.filter((resource) => resource.isActive),
    [resources],
  );

  const applyTimeSlot = (slot: { startHour: number; endHour: number }) => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(slot.startHour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(slot.endHour, 0, 0, 0);

    setReservationForm((current) => ({ ...current, startAt: toLocalDateTime(start), endAt: toLocalDateTime(end) }));
    setAvailabilityMsg(null);
    setAvailabilityAvailable(null);
  };

  const handleScheduledCheck = async () => {
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

  return (
    <AppShell pageTitle="Booking planner" requireAuth>
      {(error || success) && (
        <div className={`notice ${error ? "notice-error" : "notice-success"}`}>
          <span>{error ? "!" : "✓"}</span>
          {error || success}
        </div>
      )}

      <section className="booking-grid" id="reservations">
        <div className="booking-side">
          <div className="panel booking-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">The schedule</p>
                <h2>Upcoming reservations</h2>
              </div>
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
                      <p>
                        {reservation.resource?.name ?? "Unknown resource"} <span>·</span> {reservation.userName}
                      </p>
                      <div className="reservation-time">
                        <span className="reservation-time-icon" aria-hidden="true">◷</span>
                        <time dateTime={reservation.startAt}>{formatDateTime(reservation.startAt)}</time>
                        <span className="reservation-time-separator" aria-hidden="true">→</span>
                        <time dateTime={reservation.endAt}>{formatDateTime(reservation.endAt)}</time>
                      </div>
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
              <div>
                <p className="eyebrow">Live inventory</p>
                <h2>Availability at a glance</h2>
              </div>
              <span className="live-badge"><i /> Live</span>
            </div>

            <div className="availability-overview">
              <div className="availability-total">
                <strong>{Math.max(resources.filter((resource) => resource.isActive).length - busyResourceIds.length, 0)}</strong>
                <span>
                  resources ready to book
                  <small>of {resources.filter((resource) => resource.isActive).length} active</small>
                </span>
              </div>
              <div className="availability-bar" role="img" aria-label="Resource availability overview">
                <span style={{ width: `${resources.filter((resource) => resource.isActive).length ? ((resources.filter((resource) => resource.isActive).length - busyResourceIds.length) / resources.filter((resource) => resource.isActive).length) * 100 : 0}%` }} />
              </div>
              <div className="availability-legend">
                <span><i className="legend-free" /> Available <strong>{Math.max(resources.filter((resource) => resource.isActive).length - busyResourceIds.length, 0)}</strong></span>
                <span><i className="legend-busy" /> In use <strong>{busyResourceIds.length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <form className="panel form-panel reservation-form" id="reservation-form" onSubmit={handleReservationSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Plan ahead</p>
              <h2>Book a resource</h2>
            </div>
            <span className="form-badge">02</span>
          </div>

          <div className="time-slot-group">
            {timeSlots.map((slot) => (
              <button
                key={slot.label}
                type="button"
                className={`slot-button ${reservationForm.startAt && reservationForm.endAt && new Date(reservationForm.startAt).getHours() === slot.startHour ? "is-selected" : ""}`}
                onClick={() => applyTimeSlot(slot)}
              >
                {slot.label}
                <small>
                  {slot.startHour}:00–{slot.endHour}:00
                </small>
              </button>
            ))}
          </div>

          <div className="form-fields">
            <label className="field">
              <span>Choose a resource</span>
              <select required value={reservationForm.resourceId} onChange={(event) => {
                setReservationForm({ ...reservationForm, resourceId: event.target.value });
                setAvailabilityMsg(null);
                setAvailabilityAvailable(null);
              }}>
                <option value="">Select an available resource</option>
                {bookableResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} · {resource.category}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row booking-time-fields">
              <label className="field booking-time-field">
                <span>Start time</span>
                <input
                  className="booking-time-input"
                  type="datetime-local"
                  required
                  value={reservationForm.startAt}
                  onChange={(event) => {
                    setReservationForm({ ...reservationForm, startAt: event.target.value });
                    setAvailabilityMsg(null);
                    setAvailabilityAvailable(null);
                  }}
                />
              </label>
              <label className="field booking-time-field">
                <span>End time</span>
                <input
                  className="booking-time-input"
                  type="datetime-local"
                  required
                  value={reservationForm.endAt}
                  onChange={(event) => {
                    setReservationForm({ ...reservationForm, endAt: event.target.value });
                    setAvailabilityMsg(null);
                    setAvailabilityAvailable(null);
                  }}
                />
              </label>
            </div>

            <label className="field">
              <span>Booking title</span>
              <input required minLength={3} value={reservationForm.title} onChange={(event) => setReservationForm({ ...reservationForm, title: event.target.value })} placeholder="e.g. Product planning" />
            </label>

            <label className="field">
              <span>
                Notes <small>Optional</small>
              </span>
              <textarea rows={2} value={reservationForm.note} onChange={(event) => setReservationForm({ ...reservationForm, note: event.target.value })} placeholder="Anything the team should know?" />
            </label>

            <button className="button button-secondary button-wide" type="button" onClick={() => void handleScheduledCheck()} disabled={isCheckingAvailability}>
              {isCheckingAvailability ? "Checking live schedule…" : "Check availability"}
            </button>

            {availabilityMsg && (
              <div className={`availability-message ${availabilityAvailable ? "message-free" : "message-busy"}`} role="status">
                <span>{availabilityAvailable ? "✓" : "!"}</span>
                {availabilityMsg}
              </div>
            )}

            <button className="button button-primary button-wide" type="submit" disabled={isSavingReservation || bookableResources.length === 0}>
              {isSavingReservation ? "Confirming…" : "Confirm reservation"}
            </button>

            <p className="form-footnote">Availability is verified again when you confirm, so overlapping bookings cannot be created.</p>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

function toLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

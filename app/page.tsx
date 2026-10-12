"use client";

import { useCallback, useEffect, useState } from "react";

type Resource = {
  id: string;
  name: string;
  category: string;
  location?: string | null;
  capacity: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
};

type Reservation = {
  id: string;
  resourceId: string;
  userName: string;
  email?: string | null;
  title: string;
  note?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  resource?: Resource;
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

const getErrorText = (payload: unknown): string => {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const maybe = payload as Record<string, unknown>;
    const values = Object.values(maybe).flatMap((value) =>
      Array.isArray(value) ? value : [value],
    );
    return values.map(String).join(" ") || "Something went wrong.";
  }
  return "Something went wrong.";
};

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({
    totalResources: 0,
    activeResources: 0,
    totalReservations: 0,
    todayReservations: 0,
  });
  const [resourceForm, setResourceForm] = useState(defaultResourceForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState(defaultReservationForm);
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);
  const [availabilityAvailable, setAvailabilityAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [resourceRes, reservationRes, statsRes] = await Promise.all([
      fetch("/api/resources"),
      fetch("/api/reservations"),
      fetch("/api/dashboard"),
    ]);

    if (resourceRes.ok) setResources(await resourceRes.json());
    if (reservationRes.ok) setReservations(await reservationRes.json());
    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data.stats);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshData]);

  const checkAvailability = async () => {
    if (!reservationForm.resourceId || !reservationForm.startAt || !reservationForm.endAt) {
      setAvailabilityMsg("Choose a resource and a valid date range first.");
      setAvailabilityAvailable(false);
      return;
    }

    const params = new URLSearchParams({
      resourceId: reservationForm.resourceId,
      startAt: reservationForm.startAt,
      endAt: reservationForm.endAt,
    });

    const res = await fetch(`/api/availability?${params.toString()}`);
    const data = await res.json();
    setAvailabilityMsg(data.message || "Unknown status.");
    setAvailabilityAvailable(data.available === true);
  };

  const handleResourceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/resources", {
      method: editingResourceId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...resourceForm,
        ...(editingResourceId ? { id: editingResourceId } : {}),
        capacity: Number(resourceForm.capacity),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(getErrorText(data.error || data.message));
      return;
    }

    setSuccess(`Resource “${data.name}” ${editingResourceId ? "updated" : "added"} successfully.`);
    setResourceForm(defaultResourceForm);
    setEditingResourceId(null);
    void refreshData();
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

  const cancelResourceEdit = () => {
    setEditingResourceId(null);
    setResourceForm(defaultResourceForm);
  };

  const handleReservationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...reservationForm,
        startAt: new Date(reservationForm.startAt).toISOString(),
        endAt: new Date(reservationForm.endAt).toISOString(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(getErrorText(data.error || data.message));
      return;
    }

    setSuccess(`Booking for “${data.title}” was created successfully.`);
    setReservationForm(defaultReservationForm);
    setAvailabilityMsg(null);
    setAvailabilityAvailable(null);
    void refreshData();
  };

  const handleCancelReservation = async (id: string) => {
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/reservations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(getErrorText(data.error || data.message));
      return;
    }

    setSuccess("Reservation cancelled successfully.");
    void refreshData();
  };

  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 text-slate-100 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[26px] border border-emerald-500/20 bg-[#030b12]/90 shadow-[0_0_0_1px_rgba(45,212,191,0.06),0_30px_90px_rgba(4,120,87,0.18)] backdrop-blur-sm before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_35%)] before:content-['']">
          <div className="relative z-10 flex flex-col gap-4 border-b border-slate-800/80 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-lg font-black text-emerald-300 shadow-[0_0_18px_rgba(34,197,94,0.22)]">
                P
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-300">
                <span>PrimeWave Lab</span>
              </div>
            </div>

            <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.28em] text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                SYS: ACTIVE
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                STATUS: ONLINE
              </span>
            </div>
          </div>

          <div className="relative z-10 px-5 pb-8 pt-8 md:px-8 lg:pt-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1.15fr]">
              <div className="relative flex min-h-[360px] items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-[330px] w-[330px] rounded-full border border-emerald-400/20 bg-[radial-gradient(circle,rgba(16,185,129,0.12),rgba(2,6,23,0.10)_50%,transparent_70%)] shadow-[0_0_80px_rgba(16,185,129,0.16)]" />
                </div>
                <div className="absolute h-[44px] w-[44px] rounded-full border border-emerald-300/60 bg-[#03131a] shadow-[0_0_18px_rgba(16,185,129,0.35)]" />
                <div className="absolute h-[220px] w-[220px] rounded-full border border-emerald-500/30 bg-[radial-gradient(circle,rgba(16,185,129,0.12),rgba(2,6,23,0.02)_50%,transparent_70%)]" />
                <div className="absolute h-[150px] w-[150px] rounded-full border border-emerald-400/35" />
                <div className="absolute h-[220px] w-[4px] bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent" />
                <div className="absolute h-[4px] w-[220px] bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
                <div className="absolute bottom-12 h-[92px] w-[170px] rounded-t-full border border-emerald-400/40 bg-transparent shadow-[inset_0_0_24px_rgba(16,185,129,0.15)]" />
                <div className="absolute bottom-8 h-16 w-32 rounded-full border border-emerald-500/40 bg-emerald-500/5 blur-[2px]" />
              </div>

              <div className="relative">
                <div className="mb-5 h-px w-28 bg-gradient-to-r from-emerald-400 to-transparent" />
                <h1 className="max-w-xl text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">
                  SHARED RESOURCE
                  <span className="mt-2 block text-emerald-300">RESERVATIONS</span>
                </h1>

                <div className="mt-8 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
                  Manage shared facilities, check availability, and coordinate bookings from one place. Every reservation is validated to prevent scheduling conflicts.
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="#resource-form"
                    className="rounded-lg border border-emerald-400/40 bg-emerald-400/90 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.25)] transition hover:brightness-110"
                  >
                    Add a resource
                  </a>
                  <a
                    href="#reservation-form"
                    className="rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-900/80"
                  >
                    Make a reservation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total resources", value: stats.totalResources, detail: "System-wide", color: "from-emerald-400 to-cyan-400" },
            { label: "Active resources", value: stats.activeResources, detail: "Operational", color: "from-cyan-400 to-sky-500" },
            { label: "Total reservations", value: stats.totalReservations, detail: "Tracked", color: "from-sky-400 to-indigo-500" },
            { label: "Today’s bookings", value: stats.todayReservations, detail: "Live", color: "from-teal-400 to-emerald-500" },
          ].map((card) => (
            <div key={card.label} className="rounded-[22px] border border-slate-800 bg-[#07131d]/90 p-5 shadow-[0_0_0_1px_rgba(15,118,110,0.12),0_20px_45px_rgba(2,6,23,0.6)]">
              <div className={`mb-4 h-2 w-14 rounded-full bg-gradient-to-r ${card.color}`} />
              <p className="text-sm text-slate-400">{card.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-black tracking-tight text-white">{card.value}</p>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {card.detail}
                </span>
              </div>
            </div>
          ))}
        </section>

        {(error || success) && (
          <div className={`mt-8 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-500/50 bg-rose-500/10 text-rose-100" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"}`}>
            {error || success}
          </div>
        )}

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-slate-800 bg-[#07131d]/90 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.04),0_24px_60px_rgba(2,6,23,0.7)] md:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Resources</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Shared facility catalog</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                {resources.filter((resource) => resource.isActive).length} active items
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource) => (
                <div key={resource.id} className="rounded-2xl border border-slate-800 bg-[#040d16]/90 p-4 shadow-inner shadow-emerald-500/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{resource.name}</h3>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-emerald-300">{resource.category}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${resource.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {resource.isActive ? "Active" : "Offline"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Capacity</span>
                      <strong className="text-white">{resource.capacity}</strong>
                    </div>
                    {resource.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Location</span>
                        <strong className="text-white">{resource.location}</strong>
                      </div>
                    )}
                    {resource.description && <p className="pt-2 text-slate-300">{resource.description}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => editResource(resource)}
                    className="mt-4 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
                  >
                    Edit resource
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form id="resource-form" onSubmit={handleResourceSubmit} className="rounded-[28px] border border-slate-800 bg-[#07131d]/90 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.04),0_24px_60px_rgba(2,6,23,0.7)] md:p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{editingResourceId ? "Edit asset" : "Add asset"}</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{editingResourceId ? "Update resource" : "Create resource"}</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="resource-name" className="mb-2 block text-sm font-medium text-slate-200">Resource name</label>
                <input
                  id="resource-name"
                  required
                  minLength={2}
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400"
                  placeholder="Projector"
                />
              </div>

              <div>
                <label htmlFor="resource-category" className="mb-2 block text-sm font-medium text-slate-200">Category</label>
                <select
                  id="resource-category"
                  required
                  value={resourceForm.category}
                  onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  <option>Conference Room</option>
                  <option>Meeting Room</option>
                  <option>Equipment</option>
                  <option>Workspace</option>
                  <option>Lab</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="resource-location" className="mb-2 block text-sm font-medium text-slate-200">Location</label>
                  <input
                    id="resource-location"
                    value={resourceForm.location}
                    onChange={(e) => setResourceForm({ ...resourceForm, location: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                    placeholder="Floor 2"
                  />
                </div>
                <div>
                  <label htmlFor="resource-capacity" className="mb-2 block text-sm font-medium text-slate-200">Capacity</label>
                  <input
                    id="resource-capacity"
                    type="number"
                    min={1}
                    required
                    value={resourceForm.capacity}
                    onChange={(e) => setResourceForm({ ...resourceForm, capacity: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="resource-description" className="mb-2 block text-sm font-medium text-slate-200">Description</label>
                <textarea
                  id="resource-description"
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  rows={3}
                  placeholder="Briefly describe this resource"
                />
              </div>

              <label htmlFor="resource-active" className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  id="resource-active"
                  type="checkbox"
                  checked={resourceForm.isActive}
                  onChange={(e) => setResourceForm({ ...resourceForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-[#020d16]"
                />
                Active and available for booking
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110"
              >
                {editingResourceId ? "Update resource" : "Save resource"}
              </button>
              {editingResourceId && (
                <button
                  type="button"
                  onClick={cancelResourceEdit}
                  className="w-full rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-slate-800 bg-[#07131d]/90 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.04),0_24px_60px_rgba(2,6,23,0.7)] md:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Bookings</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Upcoming reservations</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                {reservations.length} scheduled
              </span>
            </div>

            <div className="space-y-4">
              {reservations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#040d16]/70 p-6 text-center text-slate-400">
                  No active bookings yet.
                </div>
              )}

              {reservations.map((reservation) => (
                <div key={reservation.id} className="rounded-2xl border border-slate-800 bg-[#040d16]/90 p-4 shadow-inner shadow-emerald-500/5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{reservation.title}</h3>
                      <p className="mt-1 text-sm text-emerald-300">{reservation.resource?.name ?? "Unknown resource"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-500/20"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                    <p><span className="text-slate-400">Booked by:</span> {reservation.userName}</p>
                    <p><span className="text-slate-400">Email:</span> {reservation.email}</p>
                    <p><span className="text-slate-400">Starts:</span> {new Date(reservation.startAt).toLocaleString()}</p>
                    <p><span className="text-slate-400">Ends:</span> {new Date(reservation.endAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form id="reservation-form" onSubmit={handleReservationSubmit} className="rounded-[28px] border border-slate-800 bg-[#07131d]/90 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.04),0_24px_60px_rgba(2,6,23,0.7)] md:p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Booking</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Make reservation</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="reservation-resource" className="mb-2 block text-sm font-medium text-slate-200">Resource</label>
                <select
                  id="reservation-resource"
                  required
                  value={reservationForm.resourceId}
                  onChange={(e) => setReservationForm({ ...reservationForm, resourceId: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="">Select a resource</option>
                  {resources.filter((resource) => resource.isActive).map((resource) => (
                    <option key={resource.id} value={resource.id}>{resource.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reservation-name" className="mb-2 block text-sm font-medium text-slate-200">Booked by</label>
                <input
                  id="reservation-name"
                  required
                  minLength={2}
                  value={reservationForm.userName}
                  onChange={(e) => setReservationForm({ ...reservationForm, userName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label htmlFor="reservation-email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
                <input
                  id="reservation-email"
                  type="email"
                  required
                  value={reservationForm.email}
                  onChange={(e) => setReservationForm({ ...reservationForm, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label htmlFor="reservation-title" className="mb-2 block text-sm font-medium text-slate-200">Booking title</label>
                <input
                  id="reservation-title"
                  required
                  minLength={3}
                  value={reservationForm.title}
                  onChange={(e) => setReservationForm({ ...reservationForm, title: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="Leadership sync"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reservation-start" className="mb-2 block text-sm font-medium text-slate-200">Start</label>
                  <input
                    id="reservation-start"
                    type="datetime-local"
                    required
                    value={reservationForm.startAt}
                    onChange={(e) => setReservationForm({ ...reservationForm, startAt: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label htmlFor="reservation-end" className="mb-2 block text-sm font-medium text-slate-200">End</label>
                  <input
                    id="reservation-end"
                    type="datetime-local"
                    required
                    value={reservationForm.endAt}
                    onChange={(e) => setReservationForm({ ...reservationForm, endAt: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reservation-notes" className="mb-2 block text-sm font-medium text-slate-200">Notes</label>
                <textarea
                  id="reservation-notes"
                  value={reservationForm.note}
                  onChange={(e) => setReservationForm({ ...reservationForm, note: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-[#020d16] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  rows={3}
                  placeholder="Optional notes"
                />
              </div>

              <button
                type="button"
                onClick={checkAvailability}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Check availability
              </button>

              {availabilityMsg && (
                <div className={`rounded-2xl border px-3 py-2 text-sm ${availabilityAvailable ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : "border-rose-500/40 bg-rose-500/10 text-rose-100"}`}>
                  {availabilityMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110"
              >
                Confirm reservation
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

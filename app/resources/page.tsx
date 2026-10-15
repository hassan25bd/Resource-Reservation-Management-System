"use client";

import { useCallback, useEffect, useState } from "react";
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

const defaultResourceForm = {
  name: "",
  category: "Conference Room",
  location: "",
  capacity: "6",
  description: "",
  isActive: true,
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

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [busyResourceIds, setBusyResourceIds] = useState<string[]>([]);
  const [resourceForm, setResourceForm] = useState(defaultResourceForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingResource, setIsSavingResource] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [resourceResponse, dashboardResponse] = await Promise.all([
        fetch("/api/resources", { cache: "no-store" }),
        fetch("/api/dashboard", { cache: "no-store" }),
      ]);

      const [resourceData, dashboardData] = await Promise.all([
        readJson(resourceResponse),
        readJson(dashboardResponse),
      ]);

      if (!resourceResponse.ok) throw new Error(getErrorText(resourceData));
      if (!dashboardResponse.ok) throw new Error(getErrorText(dashboardData));

      if (!Array.isArray(resourceData) || !isRecord(dashboardData)) {
        throw new Error("The server returned unexpected data.");
      }

      setResources(resourceData as Resource[]);
      setBusyResourceIds(
        Array.isArray(dashboardData.busyResourceIds)
          ? dashboardData.busyResourceIds.filter((id): id is string => typeof id === "string")
          : [],
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your resources.");
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

  return (
    <AppShell pageTitle="Resource hub" requireAuth>
      {(error || success) && (
        <div className={`notice ${error ? "notice-error" : "notice-success"}`}>
          <span>{error ? "!" : "✓"}</span>
          {error || success}
        </div>
      )}

      <section className="content-grid" id="resources">
        <div className="panel resources-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your shared inventory</p>
              <h2>Resource directory</h2>
            </div>
            <span className="count-badge">{resources.length} total</span>
          </div>
          <div className="resource-summary">
            <span><i className="status-indicator" /> {resources.filter((resource) => resource.isActive).length} active resources</span>
            <span>{busyResourceIds.length} currently in use</span>
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
                      <p className="resource-meta">
                        {resource.category}
                        {resource.location ? ` · ${resource.location}` : ""}
                      </p>
                      <div className="resource-capacity">
                        <span>Capacity / units</span>
                        <strong>{resource.capacity}</strong>
                      </div>
                      {resource.description && <p className="resource-description">{resource.description}</p>}
                    </div>
                    <button className="icon-button" type="button" onClick={() => editResource(resource)} aria-label={`Edit ${resource.name}`} title="Edit resource">
                      ↗
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <form id="resource-form" className="panel form-panel" onSubmit={handleResourceSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingResourceId ? "Update inventory" : "Grow your inventory"}</p>
              <h2>{editingResourceId ? "Edit resource" : "Add a resource"}</h2>
            </div>
            <span className="form-badge">01</span>
          </div>
          <div className="form-fields">
            <label className="field">
              <span>Resource name</span>
              <input required minLength={2} value={resourceForm.name} onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })} placeholder="e.g. Boardroom Alpha" />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Category</span>
                <select required value={resourceForm.category} onChange={(event) => setResourceForm({ ...resourceForm, category: event.target.value })}>
                  <option>Conference Room</option>
                  <option>Meeting Room</option>
                  <option>Equipment</option>
                  <option>Workspace</option>
                  <option>Lab</option>
                </select>
              </label>

              <label className="field">
                <span>Capacity / units</span>
                <input type="number" min={1} required value={resourceForm.capacity} onChange={(event) => setResourceForm({ ...resourceForm, capacity: event.target.value })} />
              </label>
            </div>

            <label className="field">
              <span>Location</span>
              <input value={resourceForm.location} onChange={(event) => setResourceForm({ ...resourceForm, location: event.target.value })} placeholder="e.g. Floor 2" />
            </label>

            <label className="field">
              <span>
                Description <small>Optional</small>
              </span>
              <textarea rows={3} value={resourceForm.description} onChange={(event) => setResourceForm({ ...resourceForm, description: event.target.value })} placeholder="What should teams know about this resource?" />
            </label>

            <label className="toggle-row">
              <input type="checkbox" checked={resourceForm.isActive} onChange={(event) => setResourceForm({ ...resourceForm, isActive: event.target.checked })} />
              <span className="toggle-track" />
              <span>
                <strong>Active and bookable</strong>
                <small>Inactive resources stay in your catalog.</small>
              </span>
            </label>

            <button className="button button-primary button-wide" type="submit" disabled={isSavingResource}>
              {isSavingResource ? "Saving…" : editingResourceId ? "Save changes" : "Add to inventory"}
            </button>

            {editingResourceId && (
              <button
                className="button button-quiet button-wide"
                type="button"
                onClick={() => {
                  setEditingResourceId(null);
                  setResourceForm(defaultResourceForm);
                }}
              >
                Cancel editing
              </button>
            )}
          </div>
        </form>
      </section>
    </AppShell>
  );
}

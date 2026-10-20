"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";
const CONFIRMED_APPOINTMENTS_KEY = "agentConfirmedAppointmentIds";

/* ---------- local fallback (same browser only) ---------- */

function getSavedConfirmedIds() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(
      localStorage.getItem(CONFIRMED_APPOINTMENTS_KEY) || "[]"
    );
    return Array.isArray(saved) ? saved.map(String) : [];
  } catch {
    return [];
  }
}

function saveConfirmedAppointment(id) {
  if (typeof window === "undefined" || !id) return;
  const savedIds = getSavedConfirmedIds();
  const appointmentId = String(id);
  if (!savedIds.includes(appointmentId)) {
    savedIds.push(appointmentId);
    localStorage.setItem(
      CONFIRMED_APPOINTMENTS_KEY,
      JSON.stringify(savedIds)
    );
  }
}

/* ---------- helpers ---------- */

function getAccount(value) {
  let account = value;
  for (let i = 0; i < 4 && account && typeof account === "object"; i++) {
    if (account.agent && typeof account.agent === "object") {
      account = account.agent;
    } else if (
      account.data &&
      typeof account.data === "object" &&
      !Array.isArray(account.data)
    ) {
      account = account.data;
    } else if (account.account && typeof account.account === "object") {
      account = account.account;
    } else if (account.user && typeof account.user === "object") {
      account = account.user;
    } else {
      break;
    }
  }
  return account || {};
}

function getAgentId(account) {
  return (
    localStorage.getItem("agentId") ||
    account?.agent_id ||
    account?.agentId ||
    account?.id ||
    account?._id ||
    ""
  );
}

function getList(result) {
  if (Array.isArray(result)) return result;
  const candidates = [
    result?.data,
    result?.results,
    result?.appointments,
    result?.items,
    result?.data?.data,
    result?.data?.results,
    result?.data?.appointments,
    result?.data?.items,
  ];
  return candidates.find(Array.isArray) || [];
}

function getAppointmentId(appointment) {
  return (
    appointment?.appointment_id ||
    appointment?.appointmentId ||
    appointment?.id ||
    appointment?._id ||
    ""
  );
}

function getCustomer(appointment) {
  const user =
    appointment?.user || appointment?.customer || appointment?.client || {};
  if (typeof user === "string") return user;
  return (
    user?.full_name ||
    user?.name ||
    user?.email ||
    appointment?.user_name ||
    appointment?.customer_name ||
    "Customer"
  );
}

function getProperty(appointment) {
  const property =
    appointment?.property || appointment?.property_details || {};
  if (typeof property === "string") return property;
  return (
    property?.name ||
    property?.title ||
    property?.address ||
    appointment?.property_name ||
    "Property details unavailable"
  );
}

function getDate(value) {
  if (!value) return "Date not provided";
  if (/^\d{2}-\d{2}-\d{4}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTime(appointment) {
  const time = appointment?.time;
  if (typeof time === "string") return time;
  if (time && typeof time === "object") {
    if (time.from && time.to) return `${time.from} - ${time.to}`;
    return time.from || time.to || "Time not provided";
  }
  return appointment?.appointment_time || "Time not provided";
}

function isTrue(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isCompleted(appointment) {
  const flags = [
    appointment?.is_completed,
    appointment?.completed,
    appointment?.agent_completed,
    appointment?.agentCompleted,
  ];
  const statuses = [
    appointment?.status,
    appointment?.appointment_status,
    appointment?.completion_status,
  ];
  return (
    flags.some(isTrue) ||
    statuses.some((v) =>
      ["COMPLETED", "COMPLETE"].includes(normalizeStatus(v))
    )
  );
}

// What the SERVER says (this is what the customer's page sees too).
function isConfirmedByServer(appointment) {
  const flags = [
    appointment?.confirmed,
    appointment?.meeting_confirmed,
    appointment?.meetingConfirmed,
    appointment?.is_confirmed,
    appointment?.isConfirmed,
    appointment?.is_meeting_confirmed,
    appointment?.agent_confirmed,
    appointment?.agentConfirmed,
    appointment?.accepted,
    appointment?.is_accepted,
    appointment?.meeting?.confirmed,
  ];
  if (flags.some(isTrue)) return true;

  const timestamps = [
    appointment?.confirmed_at,
    appointment?.confirmedAt,
    appointment?.meeting_confirmed_at,
  ];
  if (timestamps.some((v) => v && String(v).trim())) return true;

  const statuses = [
    appointment?.status,
    appointment?.meeting_status,
    appointment?.meetingStatus,
    appointment?.confirmation_status,
    appointment?.confirmationStatus,
    appointment?.appointment_status,
    appointment?.meeting?.status,
  ];
  return statuses.some((v) =>
    [
      "CONFIRMED",
      "MEETING_CONFIRMED",
      "AGENT_CONFIRMED",
      "ACCEPTED",
      "APPROVED",
    ].includes(normalizeStatus(v))
  );
}

// Server status first, then the local fallback for this browser.
function isConfirmed(appointment) {
  if (isConfirmedByServer(appointment)) return true;
  const id = getAppointmentId(appointment);
  return Boolean(id && getSavedConfirmedIds().includes(String(id)));
}

function getErrorMessage(result, status) {
  return (
    result?.msg ||
    result?.message ||
    result?.error?.message ||
    `Request failed with status ${status}.`
  );
}

/* ---------- page ---------- */

export default function AgentAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const [actionLoading, setActionLoading] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const loadAppointments = useCallback(async (pageNumber = 0) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const savedAccount = localStorage.getItem("account");

      if (!token) {
        window.location.href = "/login";
        return null;
      }

      if (role && role.toLowerCase() !== "agent") {
        throw new Error("Please log in with an agent account.");
      }

      if (!savedAccount) {
        throw new Error(
          "Your saved account information is missing. Please log in again."
        );
      }

      let parsedAccount;
      try {
        parsedAccount = JSON.parse(savedAccount);
      } catch {
        throw new Error("Your saved account information is invalid.");
      }

      const account = getAccount(parsedAccount);
      const agentId = getAgentId(account);

      if (!agentId) {
        throw new Error("Agent ID not found. Please log out and log in again.");
      }

      const params = new URLSearchParams({
        agent: String(agentId),
        page: String(pageNumber),
        limit: "10",
      });

      const response = await fetch(`${API}/appointments?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(result, response.status));
      }

      if (
        result?.success === false ||
        result?.status === "error" ||
        result?.type === "ERROR"
      ) {
        throw new Error(
          result?.msg || result?.message || "Unable to load appointments."
        );
      }

      const list = getList(result);

      setAppointments(list);
      setHasMore(list.length >= 10);
      setPage(pageNumber);
      return list;
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
      setAppointments([]);
      setHasMore(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments(0);
  }, [loadAppointments]);

  async function updateAppointment(appointment, action) {
    const id = getAppointmentId(appointment);

    if (!id) {
      setActionError("This appointment has no ID.");
      setActionMessage("");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const isConfirm = action === "confirm";
    const endpoint = isConfirm
      ? "confirm-meeting"
      : "set-agent-appointment-completion";

    setActionLoading(`${id}:${action}`);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch(
        `${API}/appointments/${encodeURIComponent(String(id))}/${endpoint}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        result?.success === false ||
        result?.status === "error" ||
        result?.type === "ERROR"
      ) {
        throw new Error(getErrorMessage(result, response.status));
      }

      if (isConfirm) {
        // Local fallback so this agent still sees the confirmed state.
        saveConfirmedAppointment(id);
      }

      // Reload from the server to see what it really reports.
      const refreshed = await loadAppointments(page);
      const updated = refreshed?.find(
        (item) => String(getAppointmentId(item)) === String(id)
      );

      if (isConfirm) {
        if (updated && isConfirmedByServer(updated)) {
          setActionMessage(
            "Meeting confirmed. The customer will now see it as confirmed on their My Appointments page."
          );
        } else {
          setActionMessage(
            "The API accepted the confirmation, but the appointment data it returns has no confirmed field. It shows as confirmed here, but the customer will only see it once the API returns a confirmation status. Use “Show raw API data” below to check the field name."
          );
        }
      } else {
        setActionMessage("Appointment marked as completed.");
      }
    } catch (err) {
      setActionError(err.message || "Unable to update this appointment.");
    } finally {
      setActionLoading("");
    }
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const customer = getCustomer(appointment);
    const property = getProperty(appointment);
    const message = appointment?.msg || appointment?.message || "";

    const searchable = `${customer} ${property} ${message}`.toLowerCase();
    const matchesSearch = searchable.includes(search.toLowerCase());
    const completed = isCompleted(appointment);
    const confirmed = isConfirmed(appointment);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && completed) ||
      (statusFilter === "confirmed" && confirmed && !completed) ||
      (statusFilter === "pending" && !confirmed && !completed);

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/agent"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Agent Dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="mt-2 text-gray-600">
              View property inspection appointments assigned to you.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadAppointments(page)}
            disabled={loading || Boolean(actionLoading)}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Appointments"}
          </button>
        </div>

        {actionMessage && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700"
          >
            {actionMessage}
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
          >
            {actionError}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Appointments on this page</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "—" : appointments.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Confirmed meetings</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {loading ? "—" : appointments.filter(isConfirmed).length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed meetings</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {loading ? "—" : appointments.filter(isCompleted).length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, property, or message..."
            className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          >
            <option value="all">All appointments</option>
            <option value="pending">Awaiting confirmation</option>
            <option value="confirmed">Confirmed meetings</option>
            <option value="completed">Completed meetings</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p className="font-semibold">Unable to load appointments</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">Loading your appointments...</p>
          </div>
        ) : !error && filteredAppointments.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              No appointments found
            </h2>
            <p className="mt-2 text-gray-500">
              There are no appointments matching your search on this page.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {filteredAppointments.map((appointment, index) => {
              const id = getAppointmentId(appointment);
              const completed = isCompleted(appointment);
              const confirmed = isConfirmed(appointment);

              return (
                <article
                  key={id || index}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {getProperty(appointment)}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Customer: {getCustomer(appointment)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        completed
                          ? "bg-green-100 text-green-700"
                          : confirmed
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {completed
                        ? "Completed"
                        : confirmed
                        ? "Meeting Confirmed"
                        : "Awaiting Confirmation"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Appointment date</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {getDate(appointment.date || appointment.appointment_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {getTime(appointment)}
                      </p>
                    </div>
                  </div>

                  {(appointment?.msg || appointment?.message) && (
                    <div className="mt-5 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-700">
                        Customer&apos;s message
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                        {appointment.msg || appointment.message}
                      </p>
                    </div>
                  )}

                  {id && (
                    <p className="mt-4 break-all text-xs text-gray-400">
                      Appointment ID: {id}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {!completed && !confirmed && (
                      <button
                        type="button"
                        onClick={() => updateAppointment(appointment, "confirm")}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === `${id}:confirm`
                          ? "Confirming..."
                          : "Confirm Meeting"}
                      </button>
                    )}

                    {!completed && (
                      <button
                        type="button"
                        onClick={() => updateAppointment(appointment, "complete")}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `${id}:complete`
                          ? "Updating..."
                          : "Mark as Completed"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={loading || page === 0 || Boolean(actionLoading)}
            onClick={() => loadAppointments(Math.max(0, page - 1))}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">Page {page + 1}</span>

          <button
            type="button"
            disabled={loading || !hasMore || Boolean(actionLoading)}
            onClick={() => loadAppointments(page + 1)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-sm font-semibold text-gray-500 hover:underline"
          >
            {showRaw ? "Hide raw API data" : "Show raw API data"}
          </button>

          {showRaw && (
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-300">
              {JSON.stringify(appointments, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}
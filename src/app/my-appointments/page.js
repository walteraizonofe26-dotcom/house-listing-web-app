"use client";

import { useCallback, useEffect, useState } from "react";

const API = "http://property.reworkstaging.name.ng/v1";

function getList(result) {
  const candidates = [
    result,
    result?.data,
    result?.data?.data,
    result?.results,
    result?.appointments,
    result?.data?.appointments,
    result?.data?.results,
  ];
  return candidates.find(Array.isArray) || [];
}

function getAccountId(account, role) {
  const candidates = [
    account,
    account?.user,
    account?.account,
    account?.agent,
    account?.merchant,
    account?.data,
    account?.data?.user,
    account?.data?.account,
    account?.data?.agent,
    account?.data?.merchant,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const id =
      role === "merchant"
        ? item.merchant_id || item.merchantId || item.id || item._id
        : role === "agent"
        ? item.agent_id || item.agentId || item.id || item._id
        : item.user_id || item.userId || item.id || item._id;

    if (id !== undefined && id !== null && String(id).trim()) {
      return String(id);
    }
  }
  return "";
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `The server returned an unreadable response (HTTP ${response.status}).`
    );
  }

  const type = String(result?.type || "").toUpperCase();
  const status = String(result?.status || "").toLowerCase();

  if (
    !response.ok ||
    Number(result?.code) >= 400 ||
    ["BAD_REQUEST", "UNAUTHORIZED", "ERROR"].includes(type) ||
    result?.success === false ||
    status === "error"
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        result?.error?.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

function getAppointmentId(appointment) {
  return (
    appointment?.id ||
    appointment?._id ||
    appointment?.appointment_id ||
    appointment?.appointmentId ||
    ""
  );
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isTrue(value) {
  return value === true || value === 1 || value === "true" || value === "1";
}

// Confirmation must come from the data the API returns.
// (Same detection as the agent page, so both pages agree.)
function isConfirmed(appointment) {
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

  return statuses.some((value) =>
    [
      "CONFIRMED",
      "MEETING_CONFIRMED",
      "AGENT_CONFIRMED",
      "ACCEPTED",
      "APPROVED",
    ].includes(normalizeStatus(value))
  );
}

function isCompleted(appointment) {
  const flags = [
    appointment?.completed,
    appointment?.is_completed,
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
    statuses.some((value) =>
      ["COMPLETED", "COMPLETE"].includes(normalizeStatus(value))
    )
  );
}

function getDisplayStatus(appointment) {
  if (isCompleted(appointment)) return "Completed";
  if (isConfirmed(appointment)) return "Meeting Confirmed";

  const status = normalizeStatus(
    appointment?.status ||
      appointment?.meeting_status ||
      appointment?.confirmation_status ||
      appointment?.appointment_status
  );

  if (["REJECTED", "DECLINED", "CANCELLED", "CANCELED"].includes(status)) {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  return "Awaiting confirmation";
}

function formatDate(value) {
  if (!value) return "Not provided";
  if (/^\d{2}-\d{2}-\d{4}$/.test(String(value))) return String(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  // silent = background refresh (no loading spinner / no flicker)
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const savedAccount = localStorage.getItem("account");

      if (!token || !savedAccount) {
        window.location.href = "/login";
        return null;
      }

      let parsedAccount;
      try {
        parsedAccount = JSON.parse(savedAccount);
      } catch {
        throw new Error(
          "Your saved account information is invalid. Please log in again."
        );
      }

      const role = String(
        localStorage.getItem("role") ||
          parsedAccount.role ||
          parsedAccount.user?.role ||
          parsedAccount.account?.role ||
          parsedAccount.data?.role ||
          ""
      ).toLowerCase();

      if (!["user", "customer", "agent", "merchant"].includes(role)) {
        throw new Error(
          "Your account role could not be identified. Please log in again."
        );
      }

      const storedId =
        role === "merchant"
          ? localStorage.getItem("merchantId")
          : role === "agent"
          ? localStorage.getItem("agentId")
          : localStorage.getItem("userId");

      const id = getAccountId(parsedAccount, role) || storedId;

      if (!id) {
        throw new Error(
          "Your account ID could not be found. Please log in again."
        );
      }

      setAccount({ ...parsedAccount, role });

      const filter =
        role === "merchant" ? "merchant" : role === "agent" ? "agent" : "user";

      const query = new URLSearchParams({
        [filter]: String(id),
        page: "0",
        limit: "100",
      });

      const response = await fetch(`${API}/appointments?${query.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await readResponse(response);
      const list = getList(result);

      setAppointments(list);
      return list;
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Pick up agent confirmations automatically:
  // refresh when the tab regains focus and every 30 seconds.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") loadAppointments(true);
    };

    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadAppointments]);

  async function updateAppointment(appointment, action) {
    const id = getAppointmentId(appointment);

    if (!id) {
      setError("This appointment has no ID.");
      return;
    }

    if (
      ["complete", "user-complete"].includes(action) &&
      !isConfirmed(appointment)
    ) {
      setError(
        "This appointment has not been confirmed by the agent yet. Please wait for confirmation, then refresh."
      );
      return;
    }

    if (action === "delete") {
      if (!window.confirm("Are you sure you want to delete this appointment?")) {
        return;
      }
    }

    setBusyId(String(id));
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const base = `/appointments/${encodeURIComponent(String(id))}`;
      let endpoint;
      let method = "PUT";

      if (action === "confirm") {
        endpoint = `${base}/confirm-meeting`;
      } else if (action === "complete") {
        endpoint = `${base}/set-agent-appointment-completion`;
      } else if (action === "user-complete") {
        endpoint = `${base}/set-user-appointment-completion`;
      } else if (action === "delete") {
        endpoint = base;
        method = "DELETE";
      } else {
        throw new Error("Unknown appointment action.");
      }

      const response = await fetch(`${API}${endpoint}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await readResponse(response);

      if (action === "delete") {
        setAppointments((current) =>
          current.filter((item) => String(getAppointmentId(item)) !== String(id))
        );
        setMessage("Appointment deleted successfully.");
        return;
      }

      const refreshed = await loadAppointments(true);
      const updated = refreshed?.find(
        (item) => String(getAppointmentId(item)) === String(id)
      );

      if (!refreshed) {
        setMessage(
          "The request was accepted, but the updated status could not be loaded. Please refresh."
        );
        return;
      }

      if (action === "confirm") {
        setMessage(
          updated && isConfirmed(updated)
            ? "Meeting confirmed."
            : "The confirmation was accepted, but the API does not report a confirmed status yet."
        );
      } else {
        setMessage(
          updated && isCompleted(updated)
            ? "Appointment marked as completed."
            : "The completion request was accepted, but the API does not show Completed yet."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to update appointment.");
    } finally {
      setBusyId("");
    }
  }

  const role = String(account?.role || "").toLowerCase();
  const isUser = role === "user" || role === "customer";
  const isAgent = role === "agent";
  const isMerchant = role === "merchant";

  const confirmedCount = appointments.filter(isConfirmed).length;
  const completedCount = appointments.filter(isCompleted).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isUser ? "My Appointments" : "Appointments"}
            </h1>
            <p className="mt-2 text-slate-500">
              {isUser
                ? "View your property inspection bookings and their status."
                : "View and manage property viewing appointments."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadAppointments()}
            disabled={loading || Boolean(busyId)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
            <p className="font-semibold">Appointment request failed</p>
            <p className="mt-1 break-words text-sm">{error}</p>
          </div>
        )}

        {message && (
          <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-blue-800">
            {message}
          </p>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total appointments</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : appointments.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Confirmed meetings</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {loading ? "—" : confirmedCount}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {loading ? "—" : completedCount}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              No appointments found
            </h2>
            <p className="mt-2 text-slate-500">
              {isUser
                ? "You have no appointments listed for this account yet. If you just booked one, refresh the page."
                : "There are no appointments matching this account yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment, index) => {
              const id = getAppointmentId(appointment);
              const confirmed = isConfirmed(appointment);
              const completed = isCompleted(appointment);
              const busy = busyId === String(id);
              const displayStatus = getDisplayStatus(appointment);

              const property =
                appointment.property && typeof appointment.property === "object"
                  ? appointment.property
                  : {};

              const propertyName =
                property?.name ||
                appointment.property_name ||
                property?.title ||
                (typeof appointment.property === "string"
                  ? appointment.property
                  : "") ||
                "Property appointment";

              const date = formatDate(
                appointment.date || appointment.appointment_date
              );

              const timeFrom =
                appointment.time?.from || appointment.time_from || "—";
              const timeTo = appointment.time?.to || appointment.time_to || "—";

              const statusIsNegative = [
                "Rejected",
                "Declined",
                "Cancelled",
                "Canceled",
              ].includes(displayStatus);

              return (
                <article key={id || index} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold text-slate-900">
                        {propertyName}
                      </h2>

                      {appointment.property_id && (
                        <p className="mt-1 text-xs text-slate-400">
                          Property ID: {appointment.property_id}
                        </p>
                      )}

                      <p className="mt-3 text-sm text-slate-600">
                        <span className="font-semibold">Date:</span> {date}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold">Time:</span> {timeFrom} –{" "}
                        {timeTo}
                      </p>

                      <p className="mt-2 break-words text-sm text-slate-600">
                        <span className="font-semibold">Message:</span>{" "}
                        {appointment.msg ||
                          appointment.message ||
                          "No message provided"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            completed
                              ? "bg-green-100 text-green-700"
                              : confirmed
                              ? "bg-blue-100 text-blue-700"
                              : statusIsNegative
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {displayStatus}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            completed
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {completed ? "Completed" : "Not completed"}
                        </span>
                      </div>

                      {isUser && confirmed && !completed && (
                        <p className="mt-3 text-sm font-medium text-blue-700">
                          ✓ Your agent has confirmed this meeting.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap content-start gap-2 md:max-w-xs md:justify-end">
                      {isAgent && !confirmed && !completed && (
                        <button
                          type="button"
                          disabled={busy || Boolean(busyId)}
                          onClick={() => updateAppointment(appointment, "confirm")}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {busy ? "Updating..." : "Confirm Meeting"}
                        </button>
                      )}

                      {isAgent && confirmed && !completed && (
                        <button
                          type="button"
                          disabled={busy || Boolean(busyId)}
                          onClick={() => updateAppointment(appointment, "complete")}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {busy ? "Updating..." : "Mark Completed"}
                        </button>
                      )}

                      {isUser && confirmed && !completed && (
                        <button
                          type="button"
                          disabled={busy || Boolean(busyId)}
                          onClick={() => updateAppointment(appointment, "user-complete")}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {busy ? "Updating..." : "Mark Inspection Completed"}
                        </button>
                      )}

                      {isMerchant && (
                        <button
                          type="button"
                          disabled={busy || Boolean(busyId)}
                          onClick={() => updateAppointment(appointment, "delete")}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busy ? "Updating..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-sm font-semibold text-slate-500 hover:underline"
          >
            {showRaw ? "Hide raw API data" : "Show raw API data"}
          </button>

          {showRaw && (
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-300">
              {JSON.stringify(appointments, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}
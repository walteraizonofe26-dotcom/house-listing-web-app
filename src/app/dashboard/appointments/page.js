"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

const DASHBOARD_PAGE = "/dashboard/merchant";
const AGENTS_API = `${API}/merchants/agents?offset=0&limit=100`;
const PAGE_SIZE = 10;

function getList(result) {
  if (Array.isArray(result)) return result;

  const candidates = [
    result?.data,
    result?.results,
    result?.appointments,
    result?.agents,
    result?.items,
  ];
 
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.results)) return value.results;
  }

  return [];
}

function getAgentId(agent) {
  return (
    agent?.agent_id ??
    agent?.agentId ??
    agent?.id ??
    agent?._id ??
    ""
  );
}

function getAgentName(agent) {
  return (
    agent?.full_name ??
    agent?.name ??
    agent?.email ??
    `Agent ${getAgentId(agent)}`
  );
}

function getAppointmentId(appointment) {
  return (
    appointment?.appointment_id ??
    appointment?.appointmentId ??
    appointment?.id ??
    appointment?._id ??
    ""
  );
}

function getResponseMessage(result, status) {
  return (
    result?.msg ||
    result?.message ||
    `Request failed (${status})`
  );
}

function getCustomer(appointment) {
  const user = appointment?.user ?? appointment?.customer;

  if (typeof user === "string") return user;

  return (
    user?.full_name ??
    user?.name ??
    user?.email ??
    appointment?.user_id ??
    "Not provided"
  );
}

function getProperty(appointment) {
  const property = appointment?.property;

  if (typeof property === "string") return property;

  return (
    property?.name ??
    property?.title ??
    property?.address ??
    appointment?.property_id ??
    "Not provided"
  );
}

function formatDate(value) {
  if (!value) return "Not provided";

  // Preserve dates in DD-MM-YYYY format.
  const parts = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (parts) {
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MerchantAppointmentsPage() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [appointments, setAppointments] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Your login token is missing. Please log in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    setError("");

    try {
      const headers = getHeaders();
      const savedAccount = localStorage.getItem("account");

      if (!savedAccount) {
        throw new Error("Your saved account was not found. Please log in again.");
      }

      let account = JSON.parse(savedAccount);
      account =
        account?.merchant ??
        account?.account ??
        account?.user ??
        account;

      const role = String(
        account?.role ?? account?.type ?? "merchant"
      ).toLowerCase();

      if (role === "agent") {
        throw new Error(
          "This page is for merchants. Agents should use their own appointments page."
        );
      }

      const response = await fetch(AGENTS_API, {
        headers,
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getResponseMessage(result, response.status));
      }

      const list = getList(result);

      // Keep only agents associated with this merchant when ownership
      // information is present in the API response.
      const merchantId =
        account?.merchant_id ??
        account?.merchantId ??
        account?.id ??
        account?._id;

      const filtered = list.filter((agent) => {
        const ownerId =
          agent?.merchant_id ??
          agent?.merchantId ??
          agent?.merchant?.id ??
          agent?.merchant?._id;

        return !merchantId || !ownerId ||
          String(ownerId) === String(merchantId);
      });

      setAgents(filtered);

      if (filtered.length > 0) {
        setSelectedAgent((current) => {
          const stillExists = filtered.some(
            (agent) => String(getAgentId(agent)) === String(current)
          );

          return stillExists
            ? current
            : String(getAgentId(filtered[0]));
        });
      } else {
        setSelectedAgent("");
        setAppointments([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load your agents.");
    } finally {
      setLoadingAgents(false);
    }
  }, [getHeaders]);

  const loadAppointments = useCallback(async () => {
    if (!selectedAgent) {
      setAppointments([]);
      return;
    }

    setLoadingAppointments(true);
    setError("");
    setNotice("");

    try {
      const headers = getHeaders();

      // The API documents appointments filtered by agent ID.
      // Fetch both completed and incomplete records for this page.
      const fetchStatus = async (completed) => {
        const params = new URLSearchParams({
          agent: selectedAgent,
          completed: String(completed),
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        const response = await fetch(
          `${API}/appointments?${params.toString()}`,
          {
            headers,
            cache: "no-store",
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(getResponseMessage(result, response.status));
        }

        return getList(result);
      };

      const [incomplete, complete] = await Promise.all([
        fetchStatus(false),
        fetchStatus(true),
      ]);

      const combined = [...incomplete, ...complete];

      // Avoid duplicates if the API returns overlapping records.
      const unique = Array.from(
        new Map(
          combined.map((item, index) => [
            String(getAppointmentId(item) || `${index}-${JSON.stringify(item)}`),
            item,
          ])
        ).values()
      );

      setAppointments(unique);

      // The API's documented response format does not specify a total
      // count, so use the page size as a conservative next-page signal.
      setHasMore(
        incomplete.length >= PAGE_SIZE ||
        complete.length >= PAGE_SIZE
      );
    } catch (err) {
      setAppointments([]);
      setHasMore(false);
      setError(err.message || "Unable to load appointments.");
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedAgent, page, getHeaders]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = appointments.filter((appointment) => {
    const isCompleted =
      appointment?.completed === true ||
      String(appointment?.completed).toLowerCase() === "true";

    const status = isCompleted ? "completed" : "pending";

    if (statusFilter !== "all" && statusFilter !== status) {
      return false;
    }

    const searchableText = [
      getAppointmentId(appointment),
      getCustomer(appointment),
      getProperty(appointment),
      appointment?.msg,
      appointment?.date,
      appointment?.user?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search.toLowerCase());
  });

  const completedCount = appointments.filter(
    (item) =>
      item?.completed === true ||
      String(item?.completed).toLowerCase() === "true"
  ).length;

  const pendingCount = appointments.length - completedCount;

  async function deleteAppointment(appointment) {
    const id = getAppointmentId(appointment);

    if (!id) {
      setError("This appointment has no ID, so it cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this appointment? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      const response = await fetch(
        `${API}/appointments/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getResponseMessage(result, response.status));
      }

      setNotice("Appointment deleted successfully.");
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Unable to delete appointment.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={DASHBOARD_PAGE}
              className="mb-3 inline-block text-sm font-medium text-gray-600 hover:text-black"
            >
              ← Back to Merchant Dashboard
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Appointments
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              View appointments for the agents associated with your account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadAgents();
              if (selectedAgent) loadAppointments();
            }}
            disabled={loadingAgents || loadingAppointments}
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {notice}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Agents available</p>
            <p className="mt-2 text-3xl font-bold">{agents.length}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Pending on this page</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Completed on this page</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <label
            htmlFor="agent"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Select an agent
          </label>

          <select
            id="agent"
            value={selectedAgent}
            onChange={(event) => {
              setSelectedAgent(event.target.value);
              setPage(0);
            }}
            disabled={loadingAgents || agents.length === 0}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900 sm:max-w-md"
          >
            {loadingAgents && <option value="">Loading agents...</option>}

            {!loadingAgents && agents.length === 0 && (
              <option value="">No agents available</option>
            )}

            {agents.map((agent, index) => (
              <option
                key={getAgentId(agent) || index}
                value={String(getAgentId(agent))}
              >
                {getAgentName(agent)}
              </option>
            ))}
          </select>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Appointment Records
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Page {page + 1} · Up to {PAGE_SIZE} records per status request
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending / Incomplete</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="border-b border-gray-100 p-4">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, property, or message..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900"
            />
          </div>

          {loadingAppointments ? (
            <div className="p-12 text-center text-gray-500">
              Loading appointments...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-3xl">📅</p>
              <h3 className="mt-3 font-semibold text-gray-900">
                No appointments found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Try another agent or change your search and status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAppointments.map((appointment, index) => {
                const id = getAppointmentId(appointment) || index;
                const completed =
                  appointment?.completed === true ||
                  String(appointment?.completed).toLowerCase() === "true";

                return (
                  <article key={id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h3 className="font-semibold text-gray-900">
                            Appointment #{String(id)}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              completed
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {completed ? "Completed" : "Pending / Incomplete"}
                          </span>
                        </div>

                        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <dt className="text-gray-500">Customer</dt>
                            <dd className="mt-1 break-words font-medium text-gray-900">
                              {getCustomer(appointment)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-gray-500">Property</dt>
                            <dd className="mt-1 break-words font-medium text-gray-900">
                              {getProperty(appointment)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-gray-500">Date</dt>
                            <dd className="mt-1 font-medium text-gray-900">
                              {formatDate(appointment?.date)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-gray-500">Time</dt>
                            <dd className="mt-1 font-medium text-gray-900">
                              {appointment?.time?.from || "Not provided"}
                              {" – "}
                              {appointment?.time?.to || "Not provided"}
                            </dd>
                          </div>

                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Customer message</dt>
                            <dd className="mt-1 break-words text-gray-800">
                              {appointment?.msg || "No message provided"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteAppointment(appointment)}
                        className="self-start rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 p-4">
            <button
              type="button"
              disabled={page === 0 || loadingAppointments}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-gray-500">
              Page {page + 1}
            </span>

            <button
              type="button"
              disabled={!hasMore || loadingAppointments}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>

        <nav className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/merchant/agents"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            Manage Agents
          </Link>

          <Link
            href="/dashboard/merchant/properties"
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-100"
          >
            View Properties
          </Link>
        </nav>
      </div>
    </main>
  );
}

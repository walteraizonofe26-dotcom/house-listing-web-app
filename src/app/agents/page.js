
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

function getList(result) {
  const possibleLists = [
    result,
    result?.agents,
    result?.data,
    result?.results,
    result?.items,
    result?.records,
    result?.data?.agents,
    result?.data?.results,
    result?.data?.items,
    result?.data?.records,
    result?.data?.data,
    result?.result?.agents,
    result?.result?.data,
    result?.result?.results,
  ];

  return possibleLists.find(Array.isArray) || [];
}

async function readApiResponse(response) {
  const text = await response.text();

  let result;

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The server returned an unreadable response."
    );
  }

  const code = Number(result?.code);
  const type = String(result?.type || "").toUpperCase();
  const apiMessage =
    result?.msg ||
    result?.message ||
    result?.error?.message;

  if (
    !response.ok ||
    (Number.isFinite(code) && code >= 400) ||
    [
      "TOKEN_EXPIRED",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "BAD_REQUEST",
    ].includes(type)
  ) {
    if (type === "TOKEN_EXPIRED" || code === 419) {
      throw new Error(
        "Your login session has expired. Please log in again."
      );
    }

    if (
      response.status === 403 ||
      type === "FORBIDDEN" ||
      /permission to complete|not have permission|access denied|forbidden/i.test(
        apiMessage || ""
      )
    ) {
      throw new Error(
        apiMessage ||
          "Your account does not have permission to access this endpoint."
      );
    }

    throw new Error(
      apiMessage ||
        `The request failed with status ${response.status}.`
    );
  }

  return result;
}

function getAgentId(agent) {
  return (
    agent?.agent_id ??
    agent?.agentId ??
    agent?.id ??
    agent?._id ??
    agent?.user?.agent_id ??
    agent?.user?.id ??
    agent?.account?.id ??
    ""
  );
}

function getAgentName(agent) {
  return (
    agent?.full_name ||
    agent?.fullName ||
    agent?.name ||
    agent?.user?.full_name ||
    agent?.user?.fullName ||
    agent?.user?.name ||
    agent?.account?.full_name ||
    "Property Agent"
  );
}

function getUserId(account) {
  return (
    account?.user_id ??
    account?.userId ??
    account?.id ??
    account?._id ??
    account?.user?.user_id ??
    account?.user?.id ??
    account?.customer?.id ??
    account?.customer?.user_id ??
    account?.account?.id ??
    ""
  );
}

function getSavedAccount(savedAccount) {
  let account = savedAccount;

  for (let i = 0; i < 5; i++) {
    const nested =
      account?.account ||
      account?.customer ||
      account?.user ||
      account?.data;

    if (!nested || nested === account) break;

    account = nested;
  }

  return account || {};
}

export default function AgentsPage() {
  const searchParams = useSearchParams();

  const propertyId = searchParams.get("propertyId") || "";
  const propertyName = searchParams.get("propertyName") || "";

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [booking, setBooking] = useState({
    date: "",
    from: "",
    to: "",
    msg: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError("");

    const savedToken = localStorage.getItem("token");

    // Try the public agent listing route first.
    const endpoints = [
      {
        url: `${API}/agents?offset=0&limit=100`,
        requiresToken: false,
      },
      // This route may be restricted to merchants.
      ...(savedToken
        ? [
            {
              url: `${API}/merchants/agents?offset=0&limit=100`,
              requiresToken: true,
            },
          ]
        : []),
    ];

    let lastError = null;

    try {
      for (const endpoint of endpoints) {
        try {
          const headers = {
            Accept: "application/json",
          };

          if (endpoint.requiresToken && savedToken) {
            headers.Authorization = `Bearer ${savedToken}`;
          }

          const response = await fetch(endpoint.url, {
            method: "GET",
            headers,
            cache: "no-store",
          });

          const result = await readApiResponse(response);
          const list = getList(result);

          if (list.length > 0) {
            setAgents(list);
            setError("");
            return;
          }

          lastError = new Error(
            "The endpoint responded, but no agents were found in its response."
          );
        } catch (err) {
          lastError = err;
        }
      }

      setAgents([]);
      setError(
        lastError?.message ||
          "Agents could not be loaded. The API may not provide a public agents endpoint."
      );
    } catch (err) {
      setAgents([]);
      setError(err.message || "Could not load agents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  function updateBooking(event) {
    const { name, value } = event.target;

    setBooking((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function bookAppointment(event) {
    event.preventDefault();
    setMessage("");

    if (!propertyId) {
      setMessage(
        "The property ID is missing. Return to the property details page and select the property again."
      );
      return;
    }

    if (!selectedAgent) {
      setMessage("Please select an agent first.");
      return;
    }

    const agentId = getAgentId(selectedAgent);

    if (!agentId) {
      setMessage(
        "The selected agent's ID is missing from the API response."
      );
      return;
    }

    if (!booking.date || !booking.from || !booking.to) {
      setMessage(
        "Please enter the appointment date, start time, and end time."
      );
      return;
    }

    if (booking.to <= booking.from) {
      setMessage("The end time must be later than the start time.");
      return;
    }

    const appointmentDate = new Date(
      `${booking.date}T${booking.from}`
    );

    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate <= new Date()
    ) {
      setMessage(
        "Please choose a future appointment date and time."
      );
      return;
    }

    const savedToken = localStorage.getItem("token");
    const savedAccount =
      localStorage.getItem("account") ||
      localStorage.getItem("user");

    let account = {};

    try {
      account = savedAccount
        ? getSavedAccount(JSON.parse(savedAccount))
        : {};
    } catch {
      account = {};
    }

    const userId = getUserId(account);

    // Browsing is public. Booking follows the current API requirements.
    if (!savedToken || !userId) {
      setMessage(
        "You can browse properties and agents without logging in. To submit this appointment, please log in to your customer account first."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/appointments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          property_id: propertyId,
          user_id: userId,
          agent_id: agentId,
          date: booking.date,
          msg: booking.msg.trim(),
          time: {
            from: booking.from,
            to: booking.to,
          },
        }),
      });

      await readApiResponse(response);

      setMessage(
        "Your appointment request has been submitted successfully."
      );

      setBooking({
        date: "",
        from: "",
        to: "",
        msg: "",
      });

      setSelectedAgent(null);
    } catch (err) {
      console.error("Book appointment error:", err);
      setMessage(
        err.message ||
          "Unable to submit your appointment. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const today = new Date();

  const minimumDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href={
            propertyId
              ? `/All-property/${encodeURIComponent(propertyId)}`
              : "/All-property"
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          ← Back to property
        </Link>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            HomeFind
          </p>

          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Meet Our Property Agents
          </h1>

          <p className="mt-3 max-w-2xl text-gray-600">
            Browse our available agents and request an appointment
            to discuss the property you are interested in.
            You do not need to log in just to view agents.
          </p>

          {propertyId && (
            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm text-gray-600">
                Property you selected
              </p>
              <p className="mt-1 font-bold text-gray-900">
                {propertyName || `Property ID: ${propertyId}`}
              </p>
            </div>
          )}
        </div>

        {!propertyId && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No property has been selected. You can browse agents,
            but return to a property details page before booking.
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-gray-600 shadow-sm">
            Loading available agents...
          </div>
        ) : error && agents.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p role="alert" className="font-semibold text-red-600">
              {error}
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Public browsing requires an agent-listing endpoint
              that permits visitors without merchant credentials.
              If the public route is not supported by your API,
              its backend team will need to enable one.
            </p>
            <button
              type="button"
              onClick={loadAgents}
              className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              Try Again
            </button>
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-gray-600 shadow-sm">
            No agents are currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => {
              const agentId = getAgentId(agent);

              const isSelected =
                selectedAgent &&
                String(getAgentId(selectedAgent)) === String(agentId);

              const email =
                agent?.email ||
                agent?.user?.email ||
                agent?.account?.email;

              const phone =
                agent?.phone ||
                agent?.phone_number ||
                agent?.phoneNumber ||
                agent?.user?.phone ||
                agent?.user?.phone_number;

              return (
                <article
                  key={agentId || index}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
                      {getAgentName(agent).charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-gray-900">
                        {getAgentName(agent)}
                      </h2>
                      <p className="text-sm text-emerald-700">
                        Property Agent
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    {email && (
                      <p className="break-words">
                        <span className="font-semibold text-gray-800">
                          Email:
                        </span>{" "}
                        {email}
                      </p>
                    )}

                    {phone && (
                      <p>
                        <span className="font-semibold text-gray-800">
                          Phone:
                        </span>{" "}
                        {phone}
                      </p>
                    )}

                    {(agent?.city || agent?.state) && (
                      <p>
                        <span className="font-semibold text-gray-800">
                          Location:
                        </span>{" "}
                        {[agent?.city, agent?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      disabled={!propertyId || !agentId}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setMessage("");
                      }}
                      className={`w-full rounded-lg px-4 py-3 font-bold transition ${
                        isSelected
                          ? "bg-gray-800 text-white"
                          : "bg-emerald-700 text-white hover:bg-emerald-800"
                      } disabled:cursor-not-allowed disabled:bg-gray-300`}
                    >
                      {isSelected ? "Agent Selected" : "Choose This Agent"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedAgent && (
          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Book an Appointment
            </h2>

            <p className="mt-2 text-gray-600">
              Selected agent:{" "}
              <span className="font-semibold text-emerald-700">
                {getAgentName(selectedAgent)}
              </span>
            </p>

            <form
              onSubmit={bookAppointment}
              className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Appointment Date
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  min={minimumDate}
                  value={booking.date}
                  onChange={updateBooking}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="from"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Start Time
                </label>
                <input
                  id="from"
                  name="from"
                  type="time"
                  value={booking.from}
                  onChange={updateBooking}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="to"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  End Time
                </label>
                <input
                  id="to"
                  name="to"
                  type="time"
                  value={booking.to}
                  onChange={updateBooking}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="msg"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Message (optional)
                </label>
                <textarea
                  id="msg"
                  name="msg"
                  rows={4}
                  value={booking.msg}
                  onChange={updateBooking}
                  placeholder="Tell the agent what you would like to discuss..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:col-span-2"
                >
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Request Appointment"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAgent(null);
                    setMessage("");
                  }}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

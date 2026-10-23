
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";

const DASHBOARD_PAGE = "/dashboard/merchant";
const AGENTS_PAGE = "/dashboard/merchant/agents";
const PROPERTIES_PAGE = "/dashboard/merchant/properties";

const EMPTY_FORM = {
  full_name: "",
  company: "",
  email: "",
  phone: "",
  password: "",
};

// Extract agents from different possible API response structures.
function getList(result, key = "agents") {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const visited = new Set();
  const queue = [result];
  const possibleListKeys = [
    key,
    "data",
    "results",
    "items",
    "records",
    "list",
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (
      !current ||
      typeof current !== "object" ||
      visited.has(current)
    ) {
      continue;
    }

    visited.add(current);

    // Prefer arrays stored under known list keys.
    for (const listKey of possibleListKeys) {
      if (Array.isArray(current[listKey])) {
        return current[listKey];
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return [];
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please check the API URL."
    );
  }

  if (
    !response.ok ||
    result?.type === "BAD_REQUEST" ||
    (typeof result?.code === "number" && result.code >= 400)
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

function getAccount(savedAccount) {
  if (!savedAccount || typeof savedAccount !== "object") {
    return null;
  }

  return (
    savedAccount.merchant ||
    savedAccount.account ||
    savedAccount.user ||
    savedAccount.data?.merchant ||
    savedAccount.data?.account ||
    savedAccount.data?.user ||
    savedAccount
  );
}

function getAgentId(agent) {
  return (
    agent?.agent_id ??
    agent?.agentId ??
    agent?.id ??
    agent?._id ??
    agent?.user_id ??
    agent?.userId ??
    ""
  );
}

function getAgentName(agent) {
  return (
    agent?.full_name ||
    agent?.fullName ||
    agent?.name ||
    agent?.user?.full_name ||
    agent?.user?.name ||
    "Unnamed Agent"
  );
}

function getAgentEmail(agent) {
  return agent?.email || agent?.user?.email || "No email provided";
}

function getAgentPhone(agent) {
  return (
    agent?.phone ||
    agent?.phone_number ||
    agent?.phoneNumber ||
    agent?.user?.phone ||
    "No phone provided"
  );
}

function isAgentVerified(agent) {
  return (
    agent?.is_verified === true ||
    agent?.is_verified === 1 ||
    agent?.is_verified === "true" ||
    agent?.verified === true ||
    agent?.verified === 1 ||
    agent?.verified === "true"
  );
}

export default function MerchantAgentsPage() {
  const router = useRouter();

  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [merchantName, setMerchantName] = useState("Merchant");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAgents = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);

      setError("");

      try {
        const token = localStorage.getItem("token");
        const savedAccount = localStorage.getItem("account");

        if (!token || !savedAccount) {
          router.replace("/login");
          return;
        }

        let parsedAccount;

        try {
          parsedAccount = JSON.parse(savedAccount);
        } catch {
          localStorage.removeItem("account");
          router.replace("/login");
          return;
        }

        const account = getAccount(parsedAccount);

        if (!account) {
          router.replace("/login");
          return;
        }

        const role = String(
          account?.role ||
            account?.account_type ||
            account?.user_type ||
            parsedAccount?.role ||
            ""
        ).toLowerCase();

        if (role.includes("agent")) {
          router.replace("/dashboard/agent");
          return;
        }

        setMerchantName(
          account?.full_name ||
            account?.name ||
            account?.company ||
            "Merchant"
        );

        const response = await fetch(
          `${API}/merchants/agents?offset=0&limit=100`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result = await readResponse(response);

        // Diagnostic logs: these help us see exactly what the API returns.
        console.log("MERCHANT AGENTS API RESPONSE:", result);

        const list = getList(result, "agents");

        console.log("AGENTS EXTRACTED FROM RESPONSE:", list);

        setAgents(list);
      } catch (err) {
        console.error("LOAD AGENTS ERROR:", err);
        setError(err.message || "Unable to load agents.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return agents;

    return agents.filter((agent) => {
      const searchableText = [
        getAgentName(agent),
        getAgentEmail(agent),
        getAgentPhone(agent),
        agent?.company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [agents, search]);

  const verifiedCount = agents.filter(isAgentVerified).length;
  const unverifiedCount = agents.length - verifiedCount;

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleCreateAgent(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please log in again.");
      router.replace("/login");
      return;
    }

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      setError("Please enter the agent's full name, email, and password.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/merchants/agents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const result = await readResponse(response);

      console.log("CREATE AGENT API RESPONSE:", result);

      setMessage(
        result?.msg ||
          result?.message ||
          "Agent creation request completed. Refreshing the agents list..."
      );

      setForm(EMPTY_FORM);
      setShowForm(false);

      // Fetch the latest agents after creating one.
      await loadAgents(false);
    } catch (err) {
      console.error("CREATE AGENT ERROR:", err);
      setError(err.message || "Unable to create agent.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyAgent(agent) {
    const agentId = getAgentId(agent);

    if (!agentId) {
      setError(
        "This agent has no ID in the API response, so the verification request cannot be sent."
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setMessage("");
    setVerifyingId(String(agentId));

    try {
      const response = await fetch(`${API}/merchants/verify-agent`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          agent_id: String(agentId),
          is_verified: !isAgentVerified(agent),
        }),
      });

      const result = await readResponse(response);

      setMessage(
        result?.msg ||
          result?.message ||
          "Agent verification request completed."
      );

      await loadAgents(false);
    } catch (err) {
      console.error("VERIFY AGENT ERROR:", err);
      setError(err.message || "Unable to update agent verification.");
    } finally {
      setVerifyingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={DASHBOARD_PAGE}
              className="mb-3 inline-flex items-center text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back to dashboard
            </Link>

            <p className="text-sm font-medium text-blue-700">
              Merchant workspace
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Manage Agents
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Welcome, {merchantName}. Create, view, and manage your agents.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadAgents()}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Agents"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm((previous) => !previous);
                setError("");
                setMessage("");
              }}
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              {showForm ? "Close Form" : "+ Create Agent"}
            </button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="mb-8 flex flex-wrap gap-3">
          <Link
            href={DASHBOARD_PAGE}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Dashboard
          </Link>

          <Link
            href={AGENTS_PAGE}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Agents
          </Link>

          <Link
            href={PROPERTIES_PAGE}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Properties
          </Link>
        </nav>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {/* Statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total agents loaded</p>
            <p className="mt-2 text-3xl font-bold">{agents.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Verified agents</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Not verified</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {unverifiedCount}
            </p>
          </div>
        </section>

        {/* Create Agent Form */}
        {showForm && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">Create a New Agent</h2>

            <p className="mt-1 mb-6 text-sm text-slate-500">
              Enter the agent&apos;s information below.
            </p>

            <form
              onSubmit={handleCreateAgent}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Full Name *
                </label>

                <input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFormChange}
                  placeholder="Enter full name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Company
                </label>

                <input
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleFormChange}
                  placeholder="Enter company name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email Address *
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="agent@example.com"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Password *
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="Create a password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Creating Agent..." : "Save Agent"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Agent List */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">All Agents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Agents returned by your merchant account API.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents..."
              aria-label="Search agents"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading agents...
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                👥
              </div>

              <h3 className="font-semibold">
                {agents.length === 0
                  ? "No agents returned by the API"
                  : "No matching agents found"}
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                {agents.length === 0
                  ? "If you have already created an agent, the API may not be returning that agent in its list response. The diagnostic logs will help us check the response."
                  : "Try another search term or clear the search field."}
              </p>

              {agents.length === 0 && (
                <button
                  type="button"
                  onClick={() => loadAgents()}
                  className="mt-5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredAgents.map((agent, index) => {
                const agentId = getAgentId(agent);
                const verified = isAgentVerified(agent);

                return (
                  <article
                    key={String(agentId || agent?.email || index)}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                          {getAgentName(agent)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words font-bold">
                            {getAgentName(agent)}
                          </h3>

                          <p className="mt-1 break-all text-sm text-slate-500">
                            {getAgentEmail(agent)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          verified
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {verified ? "Verified" : "Pending"}
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                      <p>
                        <span className="font-medium text-slate-600">
                          Phone:{" "}
                        </span>
                        <span className="break-words">
                          {getAgentPhone(agent)}
                        </span>
                      </p>

                      <p>
                        <span className="font-medium text-slate-600">
                          Company:{" "}
                        </span>
                        {agent?.company || "Not provided"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-600">
                          Agent ID:{" "}
                        </span>
                        <span className="break-all">
                          {agentId || "Not provided by API"}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVerifyAgent(agent)}
                      disabled={!agentId || verifyingId === String(agentId)}
                      className="mt-5 w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {verifyingId === String(agentId)
                        ? "Updating..."
                        : verified
                          ? "Mark as Unverified"
                          : "Verify Agent"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
        </section>
      </div>
    </main>
  );
}

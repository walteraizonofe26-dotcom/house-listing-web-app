
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

const PROPERTIES_PAGE = "/dashboard/merchant/all-properties";
const AGENTS_PAGE = "/dashboard/merchant/agents";
const APPOINTMENTS_PAGE = "/dashboard/appointments";
const MANAGE_PROPERTIES_PAGE = "/dashboard/merchant/properties";
const VERIFY_PROPERTIES_PAGE = "/dashboard/merchant/verify-properties";

// Get an ID from different API response formats.
function getId(value) {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(
    value.property_id ||
      value.propertyId ||
      value.merchant_id ||
      value.merchantId ||
      value.agent_id ||
      value.agentId ||
      value.user_id ||
      value.userId ||
      value.id ||
      value._id ||
      ""
  );
}

function getPropertyId(property) {
  return String(
    property?.property_id ||
      property?.propertyId ||
      property?.id ||
      property?._id ||
      ""
  );
}

function getAccount(value) {
  let current = value;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== "object") break;

    if (
      current.merchant_id ||
      current.merchantId ||
      current.agent_id ||
      current.agentId ||
      current.id ||
      current._id
    ) {
      return current;
    }

    current =
      current.account ||
      current.merchant ||
      current.user ||
      current.data ||
      current.result;
  }

  return current && typeof current === "object" ? current : {};
}

function getSavedUser() {
  if (typeof window === "undefined") return {};

  try {
    return getAccount(
      JSON.parse(localStorage.getItem("account") || "{}")
    );
  } catch {
    return {};
  }
}

function getMerchantId(account) {
  if (typeof window !== "undefined") {
    const savedId = localStorage.getItem("merchantId");
    if (savedId) return savedId;
  }

  return getId({
    merchant_id: account?.merchant_id,
    merchantId: account?.merchantId,
    id: account?.id || account?._id,
  });
}

function getAgentId(agent) {
  return getId({
    agent_id: agent?.agent_id,
    agentId: agent?.agentId,
    id: agent?.id || agent?._id,
  });
}

// Extract arrays from common API response structures.
function getList(result, preferredKey = "") {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const keys = [
    preferredKey,
    "properties",
    "agents",
    "appointments",
    "results",
    "items",
    "records",
    "merchants",
    "data",
  ].filter(Boolean);

  const visited = new Set();
  const queue = [result];
  let emptyArray = null;

  while (queue.length) {
    const current = queue.shift();

    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;

    visited.add(current);

    if (Array.isArray(current)) {
      if (current.length > 0) return current;
      emptyArray = emptyArray || current;
      continue;
    }

    for (const key of keys) {
      if (Array.isArray(current[key])) {
        if (current[key].length > 0) return current[key];
        emptyArray = emptyArray || current[key];
      }
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return emptyArray || [];
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The server returned an invalid response. Please try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      result.msg ||
        result.message ||
        `Request failed with status ${response.status}`
    );
  }

  if (
    result.success === false ||
    result.type === "BAD_REQUEST" ||
    (typeof result.code === "number" && result.code >= 400)
  ) {
    throw new Error(
      result.msg ||
        result.message ||
        "The request was not successful."
    );
  }

  return result;
}

function getPropertyName(property) {
  return (
    property?.name ||
    property?.title ||
    property?.property_name ||
    "Unnamed Property"
  );
}

function getPropertyImage(property) {
  const images =
    property?.images ||
    property?.image_urls ||
    property?.photos ||
    property?.gallery;

  if (Array.isArray(images)) {
    const first = images[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      return first.url || first.image_url || first.src || "";
    }
  }

  return (
    property?.image_url ||
    property?.image ||
    property?.photo ||
    property?.thumbnail ||
    ""
  );
}

function getRelatedId(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return getId(value);
  return String(value);
}

function getPropertyMerchantId(property) {
  return getRelatedId(
    property?.merchant_id ??
      property?.merchantId ??
      property?.merchant ??
      property?.owner_id ??
      property?.ownerId
  );
}

function getPropertyAgentId(property) {
  return getRelatedId(
    property?.agent_id ??
      property?.agentId ??
      property?.agent ??
      property?.assigned_agent ??
      property?.assignedAgent
  );
}

function isPropertyVerified(property) {
  if (!property || typeof property !== "object") return false;

  const trueValues = ["true", "1", "yes"];

  const isVerified = String(property.is_verified ?? "")
    .toLowerCase()
    .trim();

  const verified = String(property.verified ?? "")
    .toLowerCase()
    .trim();

  const verificationStatus = String(
    property.verification_status ??
      property.verificationStatus ??
      ""
  )
    .toLowerCase()
    .trim();

  const status = String(property.status ?? "")
    .toLowerCase()
    .trim();

  return (
    trueValues.includes(isVerified) ||
    trueValues.includes(verified) ||
    verificationStatus === "verified" ||
    status === "verified"
  );
}

// Merge duplicate records using their property IDs.
function mergeProperties(...groups) {
  const unique = new Map();

  for (const group of groups) {
    if (!Array.isArray(group)) continue;

    for (const property of group) {
      if (!property || typeof property !== "object") continue;

      const id = getPropertyId(property);

      const key =
        id ||
        [
          property.name || property.title || "",
          property.address || "",
          property.city || "",
          property.price || "",
        ].join("|");

      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, { ...property });
        continue;
      }

      const wasVerified = isPropertyVerified(existing);
      const incomingVerified = isPropertyVerified(property);

      const merged = { ...existing, ...property };

      // Do not lose a verified record when a duplicate pending
      // record is returned by another endpoint.
      if (wasVerified && !incomingVerified) {
        merged.is_verified = existing.is_verified;
        merged.verified = existing.verified;
        merged.verification_status =
          existing.verification_status;
        merged.status = existing.status;
      }

      unique.set(key, merged);
    }
  }

  return Array.from(unique.values());
}

function getRecentlyCreatedProperties() {
  if (typeof window === "undefined") return [];

  try {
    const saved = JSON.parse(
      localStorage.getItem("recentlyCreatedProperties") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function money(value) {
  if (value === null || value === undefined || value === "") {
    return "Price unavailable";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Price unavailable";

  return `₦${amount.toLocaleString("en-NG")}`;
}

function formatDate(value) {
  if (!value) return "Date not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getAppointmentTitle(appointment) {
  return (
    appointment?.property?.name ||
    appointment?.property_name ||
    appointment?.title ||
    appointment?.name ||
    "Property appointment"
  );
}

function getAppointmentStatus(appointment) {
  return (
    appointment?.status ||
    (appointment?.accepted ? "Accepted" : "Pending")
  );
}

function StatCard({ title, value, description, icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function MerchantDashboard() {
  const router = useRouter();

  const [account, setAccount] = useState({});
  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadDashboard = useCallback(async () => {
    if (typeof window === "undefined") return;

    setLoading(true);
    setError("");
    setWarning("");

    const token = localStorage.getItem("token");
    const savedAccount = getSavedUser();

    if (!token || !Object.keys(savedAccount).length) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const role = String(
      savedAccount?.role ||
        savedAccount?.account_type ||
        localStorage.getItem("role") ||
        ""
    ).toLowerCase();

    if (role.includes("agent")) {
      setLoading(false);
      router.replace("/dashboard/agent");
      return;
    }

    setAccount(savedAccount);

    const merchantId = getMerchantId(savedAccount);

    if (!merchantId) {
      setError(
        "Your merchant ID could not be found. Please log out and sign in again."
      );
      setLoading(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const warningMessages = [];

    async function fetchPropertyList(url) {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
      });

      const result = await readResponse(response);

      console.log("PROPERTY REQUEST:", url);
      console.log("PROPERTY API RESULT:", result);

      return getList(result, "properties");
    }

    // Fetch an owner's properties using the normal list and
    // verification filters. Failed filters do not stop other requests.
    async function fetchOwnedProperties(ownerType, ownerId) {
      if (!ownerId) return [];

      const urls = [
        `${API}/properties?${ownerType}=${encodeURIComponent(ownerId)}&limit=100&offset=0`,
        `${API}/properties?${ownerType}=${encodeURIComponent(ownerId)}&verified=true&limit=100&offset=0`,
        `${API}/properties?${ownerType}=${encodeURIComponent(ownerId)}&verified=false&limit=100&offset=0`,
      ];

      const results = await Promise.allSettled(
        urls.map((url) => fetchPropertyList(url))
      );

      const successful = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      if (successful.length === 0) {
        console.error(
          `All property requests failed for ${ownerType}:`,
          results
        );
      }

      return mergeProperties(...successful);
    }

    try {
      // 1. Load the merchant's agents.
      let agentsList = [];

      try {
        const response = await fetch(
          `${API}/merchants/agents?offset=0&limit=100`,
          { headers, cache: "no-store" }
        );

        const result = await readResponse(response);
        const returnedAgents = getList(result, "agents");

        agentsList = returnedAgents.filter((agent) => {
          const relatedMerchantId = getRelatedId(
            agent?.merchant_id ??
              agent?.merchantId ??
              agent?.merchant
          );

          // Some API responses omit the merchant field.
          return (
            !relatedMerchantId ||
            relatedMerchantId === String(merchantId)
          );
        });

        console.log("MERCHANT AGENTS:", agentsList);
      } catch (agentError) {
        console.error("Could not load merchant agents:", agentError);
        warningMessages.push("Agents could not be loaded.");
      }

      setAgents(agentsList);

      const agentIds = new Set(
        agentsList.map(getAgentId).filter(Boolean)
      );

      console.log("MERCHANT ID:", merchantId);
      console.log("MERCHANT AGENT IDS:", Array.from(agentIds));

      // 2. Load properties assigned directly to the merchant
      // and properties assigned to each of its agents.
      const ownerRequests = [
        fetchOwnedProperties("merchant", merchantId),
        ...Array.from(agentIds).map((agentId) =>
          fetchOwnedProperties("agent", agentId)
        ),
      ];

      const ownerResults = await Promise.allSettled(ownerRequests);

      const merchantProperties =
        ownerResults[0]?.status === "fulfilled"
          ? ownerResults[0].value
          : [];

      if (ownerResults[0]?.status === "rejected") {
        console.error(
          "Could not load merchant properties:",
          ownerResults[0].reason
        );
        warningMessages.push(
          "Some merchant properties could not be loaded."
        );
      }

      const agentProperties = [];

      ownerResults.slice(1).forEach((result) => {
        if (result.status === "fulfilled") {
          agentProperties.push(...result.value);
        } else {
          console.error(
            "Could not load an agent's properties:",
            result.reason
          );
        }
      });

      // 3. Try the general endpoint as an additional source.
      let generalProperties = [];

      try {
        generalProperties = await fetchPropertyList(
          `${API}/properties?limit=100&offset=0`
        );
      } catch (propertyError) {
        console.error(
          "Could not load the general property list:",
          propertyError
        );
      }

      const relatedGeneralProperties = generalProperties.filter(
        (property) => {
          const propertyMerchantId =
            getPropertyMerchantId(property);
          const propertyAgentId = getPropertyAgentId(property);

          return (
            propertyMerchantId === String(merchantId) ||
            (propertyAgentId && agentIds.has(propertyAgentId))
          );
        }
      );

      // 4. Combine API data and local records, removing duplicates.
      const localProperties = getRecentlyCreatedProperties();

      const apiProperties = mergeProperties(
        merchantProperties,
        agentProperties,
        relatedGeneralProperties
      );

      const combinedProperties = mergeProperties(
        apiProperties,
        localProperties
      );

      console.log(
        "MERCHANT DIRECT PROPERTY COUNT:",
        merchantProperties.length
      );
      console.log(
        "MERCHANT AGENT PROPERTY COUNT:",
        mergeProperties(agentProperties).length
      );
      console.log("API PROPERTIES:", apiProperties);
      console.log("LOCAL RECENT PROPERTIES:", localProperties);
      console.log(
        "COMBINED MERCHANT PROPERTIES:",
        combinedProperties
      );
      console.log(
        "TOTAL PROPERTY COUNT:",
        combinedProperties.length
      );
      console.log(
        "VERIFIED PROPERTY COUNT:",
        combinedProperties.filter(isPropertyVerified).length
      );

      setProperties(combinedProperties);

      // 5. Load merchant appointments.
      try {
        const response = await fetch(
          `${API}/appointments?merchant=${encodeURIComponent(
            merchantId
          )}&page=0&limit=100`,
          { headers, cache: "no-store" }
        );

        const result = await readResponse(response);
        setAppointments(getList(result, "appointments"));
      } catch (appointmentError) {
        console.error(
          "Could not load appointments:",
          appointmentError
        );
        setAppointments([]);
        warningMessages.push("Appointments could not be loaded.");
      }

      setWarning(warningMessages.join(" "));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (dashboardError) {
      console.error("Merchant dashboard error:", dashboardError);

      setError(
        dashboardError.message ||
          "Unable to load the merchant dashboard. Please refresh."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("account");
    localStorage.removeItem("role");
    localStorage.removeItem("merchantId");
    router.replace("/login");
  }

  const verifiedCount = properties.filter(isPropertyVerified).length;
  const recentProperties = properties.slice(0, 5);
  const recentAppointments = appointments.slice(0, 4);

  const merchantName =
    account?.full_name ||
    account?.name ||
    account?.company ||
    "Merchant";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-7">
            <Link
              href="/dashboard/merchant"
              className="text-2xl font-bold"
            >
              Home<span className="text-emerald-400">Find</span>
            </Link>
            <p className="mt-2 text-xs text-slate-400">
              Merchant dashboard
            </p>
          </div>

          <div className="border-b border-slate-800 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
              {merchantName.charAt(0).toUpperCase()}
            </div>
            <p className="mt-3 font-semibold">{merchantName}</p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {account?.email || "Merchant account"}
            </p>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <Link
              href="/dashboard/merchant"
              className="flex items-center gap-3 rounded-xl bg-emerald-500/15 px-4 py-3 font-medium text-emerald-300"
            >
              <span>▦</span> Overview
            </Link>

            <Link
              href={MANAGE_PROPERTIES_PAGE}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>⌂</span> Manage Properties
            </Link>

            <Link
              href={PROPERTIES_PAGE}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>▤</span> View All Properties
            </Link>

            <Link
              href={AGENTS_PAGE}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>♙</span> Manage Agents
            </Link>

            <Link
              href={APPOINTMENTS_PAGE}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>▦</span> Appointments
            </Link>

            <Link
              href={VERIFY_PROPERTIES_PAGE}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span>✓</span> Verify Properties
            </Link>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
            >
              ↪ Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div>
              <p className="text-sm text-slate-500">
                Merchant / Overview
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Welcome back, {merchantName}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={loadDashboard}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-green-400 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-green-300 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>

              <Link
                href="/dashboard/merchant/add-property"
                className="rounded-xl border border-slate-200 bg-green-400 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-green-300"
              >
                Add Property
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 md:hidden"
              >
                Sign Out
              </button>
            </div>
          </header>

          <div className="space-y-8 p-5 sm:p-8">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Dashboard error</p>
                <p className="mt-1">{error}</p>
                <button
                  onClick={loadDashboard}
                  className="mt-3 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {warning && !error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {warning}
              </div>
            )}

            {lastUpdated && !loading && (
              <p className="text-xs text-slate-400">
                Last refreshed at {lastUpdated}
              </p>
            )}

            {/* Statistics */}
            <section>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Summary of your properties and activities
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total Properties"
                  value={loading ? "…" : properties.length}
                  description="Properties found for your account"
                  icon="⌂"
                  color="bg-emerald-100 text-emerald-700"
                />

                <StatCard
                  title="Verified Properties"
                  value={loading ? "…" : verifiedCount}
                  description="Properties marked as verified"
                  icon="✓"
                  color="bg-blue-100 text-blue-700"
                />

                <StatCard
                  title="Total Agents"
                  value={loading ? "…" : agents.length}
                  description="Agents linked to your account"
                  icon="♙"
                  color="bg-violet-100 text-violet-700"
                />

                <StatCard
                  title="Appointments"
                  value={loading ? "…" : appointments.length}
                  description="Appointments returned by the API"
                  icon="▦"
                  color="bg-amber-100 text-amber-700"
                />
              </div>
            </section>

            {/* Recent Properties */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Recent Properties
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing up to five properties from your list
                  </p>
                </div>

                <Link
                  href={PROPERTIES_PAGE}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View all properties →
                </Link>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Loading properties...
                </div>
              ) : recentProperties.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                    ⌂
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    No properties found
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    No property records were returned for this account.
                  </p>
                  <Link
                    href={MANAGE_PROPERTIES_PAGE}
                    className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Manage Properties
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">
                          Property
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Location
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Type
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Price
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {recentProperties.map((property, index) => {
                        const image = getPropertyImage(property);
                        const id = getPropertyId(property);
                        const verified = isPropertyVerified(property);

                        return (
                          <tr
                            key={
                              id ||
                              `${getPropertyName(property)}-${index}`
                            }
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={getPropertyName(property)}
                                    className="h-14 w-16 shrink-0 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                                    ⌂
                                  </div>
                                )}

                                <div className="max-w-56">
                                  <p className="truncate font-semibold text-slate-900">
                                    {getPropertyName(property)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {property?.category || "Property"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {[
                                property?.city,
                                property?.state,
                                property?.country,
                              ]
                                .filter(Boolean)
                                .join(", ") || "Location unavailable"}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {property?.type ||
                                property?.property_use ||
                                "—"}
                            </td>

                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              {money(property?.price)}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  verified
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {verified ? "Verified" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Agents and appointments */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      My Agents
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Agents associated with your account
                    </p>
                  </div>

                  <Link
                    href={AGENTS_PAGE}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    View all →
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <p className="p-6 text-sm text-slate-500">
                      Loading agents...
                    </p>
                  ) : agents.length === 0 ? (
                    <div className="p-6">
                      <p className="text-sm text-slate-500">
                        No agents found for this account.
                      </p>
                      <Link
                        href={AGENTS_PAGE}
                        className="mt-3 inline-block text-sm font-semibold text-emerald-700"
                      >
                        Manage agents →
                      </Link>
                    </div>
                  ) : (
                    agents.slice(0, 5).map((agent, index) => (
                      <div
                        key={getAgentId(agent) || index}
                        className="flex items-center gap-3 px-5 py-4"
                      >
                        {agent?.avatar ? (
                          <img
                            src={agent.avatar}
                            alt={agent?.full_name || "Agent"}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                            {(agent?.full_name || agent?.name || "A")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {agent?.full_name ||
                              agent?.name ||
                              "Agent"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {agent?.email || "No email provided"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            agent?.is_verified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agent?.is_verified ? "Verified" : "Agent"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Recent Appointments
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest appointment activity
                    </p>
                  </div>

                  <Link
                    href={APPOINTMENTS_PAGE}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    View all →
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <p className="p-6 text-sm text-slate-500">
                      Loading appointments...
                    </p>
                  ) : recentAppointments.length === 0 ? (
                    <div className="p-6">
                      <p className="text-sm text-slate-500">
                        No appointments found.
                      </p>
                      <Link
                        href={APPOINTMENTS_PAGE}
                        className="mt-3 inline-block text-sm font-semibold text-emerald-700"
                      >
                        Manage appointments →
                      </Link>
                    </div>
                  ) : (
                    recentAppointments.map((appointment, index) => (
                      <div
                        key={getId(appointment) || index}
                        className="flex items-start gap-3 px-5 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          ▦
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {getAppointmentTitle(appointment)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              appointment?.date ||
                                appointment?.appointment_date ||
                                appointment?.created_at
                            )}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {getAppointmentStatus(appointment)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <footer className="pb-2 text-center text-xs text-slate-400">
              HomeFind Merchant Dashboard
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

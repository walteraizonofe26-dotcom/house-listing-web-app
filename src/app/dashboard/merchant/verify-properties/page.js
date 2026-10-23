"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";
const DASHBOARD = "/dashboard/merchant";

function getId(value) {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(
    value.id ||
      value._id ||
      value.property_id ||
      value.propertyId ||
      ""
  );
}

function getList(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const keys = ["properties", "data", "results", "items", "records"];
  const queue = [result];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const key of keys) {
      if (Array.isArray(current[key])) return current[key];
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
    throw new Error("The server returned an invalid response.");
  }

  if (
    !response.ok ||
    result.success === false ||
    result.type === "BAD_REQUEST"
  ) {
    throw new Error(
      result.msg ||
        result.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

function getSavedAccountInfo() {
  try {
    const saved = JSON.parse(localStorage.getItem("account") || "{}");

    const account =
      saved.account ||
      saved.merchant ||
      saved.agent ||
      saved.user ||
      saved;

    const role = String(
      saved.role ||
        account.role ||
        localStorage.getItem("role") ||
        ""
    ).toLowerCase();

    if (role.includes("agent")) {
      return {
        key: "agent",
        id: String(
          account.agent_id ||
            account.agentId ||
            account.id ||
            account._id ||
            ""
        ),
      };
    }

    if (role.includes("merchant")) {
      return {
        key: "merchant",
        id: String(
          account.merchant_id ||
            account.merchantId ||
            account.id ||
            account._id ||
            ""
        ),
      };
    }

    if (account.merchant_id || account.merchantId) {
      return {
        key: "merchant",
        id: String(account.merchant_id || account.merchantId),
      };
    }

    if (account.agent_id || account.agentId) {
      return {
        key: "agent",
        id: String(account.agent_id || account.agentId),
      };
    }

    return { key: "", id: "" };
  } catch {
    return { key: "", id: "" };
  }
}

function getName(property) {
  return (
    property.name ||
    property.title ||
    property.property_name ||
    "Unnamed Property"
  );
}

function getImage(property) {
  const images =
    property.images ||
    property.image_urls ||
    property.photos ||
    property.gallery;

  if (Array.isArray(images) && images.length) {
    const first = images[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      return first.url || first.image_url || first.src || "";
    }
  }

  return property.image_url || property.image || property.photo || "";
}

function isVerified(property) {
  return (
    property.is_verified === true ||
    property.verified === true ||
    String(property.verification_status || "").toLowerCase() === "verified" ||
    String(property.status || "").toUpperCase() === "VERIFIED"
  );
}

function price(value) {
  const amount = Number(value);

  return value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isFinite(amount)
    ? `₦${amount.toLocaleString("en-NG")}`
    : "Price unavailable";
}

export default function VerifyPropertiesPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");

  const loadProperties = useCallback(async () => {
  setLoading(true);
  setError("");
  setMessage("");

  const token = localStorage.getItem("token");

  if (!token) {
    setLoading(false);
    router.replace("/login");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const accountInfo = getSavedAccountInfo();
    const requests = [];
    const collected = [];
    const requestErrors = [];

    // 1. Try the general properties endpoint.
    requests.push(`${API}/properties?limit=100`);

    // 2. Try the merchant's properties.
    if (accountInfo.key === "merchant" && accountInfo.id) {
      requests.push(
        `${API}/properties?merchant=${encodeURIComponent(
          accountInfo.id
        )}&limit=100`
      );

      // 3. Retrieve the merchant's agents and try each agent's properties.
      try {
        const agentsResponse = await fetch(
          `${API}/merchants/agents?offset=0&limit=100`,
          {
            headers,
            cache: "no-store",
          }
        );

        const agentsResult = await readResponse(agentsResponse);
        const agents = getList(agentsResult);

        console.log("MERCHANT AGENTS RESPONSE:", agentsResult);
        console.log("MERCHANT AGENTS:", agents);

        for (const agent of agents) {
          const agentId = String(
            agent.agent_id ||
              agent.agentId ||
              agent.id ||
              agent._id ||
              ""
          );

          if (agentId) {
            requests.push(
              `${API}/properties?agent=${encodeURIComponent(
                agentId
              )}&limit=100`
            );
          }
        }
      } catch (err) {
        console.error("COULD NOT LOAD MERCHANT AGENTS:", err);
        requestErrors.push(err.message || "Could not load merchant agents.");
      }
    }

    // 4. Request each candidate list and collect properties.
    for (const url of [...new Set(requests)]) {
      try {
        const response = await fetch(url, {
          headers,
          cache: "no-store",
        });

        const result = await readResponse(response);
        const list = getList(result);

        console.log("PROPERTY REQUEST:", url);
        console.log("PROPERTY API RESULT:", result);
        console.log("PROPERTIES FOUND:", list.length);

        collected.push(...list);
      } catch (err) {
        console.error("PROPERTY REQUEST FAILED:", url, err);
        requestErrors.push(err.message || "Property request failed");
      }
    }

    // 5. Include locally saved recent properties as a fallback.
    // These may not have been successfully saved to the server.
    let localProperties = [];

    try {
      const saved = JSON.parse(
        localStorage.getItem("recentlyCreatedProperties") || "[]"
      );

      localProperties = getList(saved);

      console.log("LOCAL RECENT PROPERTIES:", localProperties);
    } catch (err) {
      console.error("COULD NOT READ LOCAL PROPERTIES:", err);
    }

    // 6. Merge lists and remove duplicates by property ID.
    const uniqueProperties = new Map();

    for (const property of [...collected, ...localProperties]) {
      const id = getId(property);

      if (id) {
        // Prefer API data when the same property exists in both lists.
        const previous = uniqueProperties.get(id);

        uniqueProperties.set(
          id,
          previous
            ? { ...property, ...previous }
            : property
        );
      } else {
        // Keep entries without IDs visible, but they cannot be verified.
        const key = `no-id-${uniqueProperties.size}`;
        uniqueProperties.set(key, property);
      }
    }

    const finalProperties = Array.from(uniqueProperties.values());

    console.log("TOTAL API PROPERTIES:", collected.length);
    console.log("TOTAL LOCAL PROPERTIES:", localProperties.length);
    console.log("TOTAL UNIQUE PROPERTIES:", finalProperties.length);

    setProperties(finalProperties);

    if (finalProperties.length === 0) {
      setError(
        requestErrors.length
          ? `No properties were found. API message: ${requestErrors[requestErrors.length - 1]}`
          : "No properties were returned by the API or found in local storage. We need to check the property creation response."
      );
    } else if (collected.length === 0) {
      setMessage(
        "Some properties were loaded from this browser's local storage. Confirm they were saved successfully to the API before relying on verification."
      );
    }
  } catch (err) {
    console.error("VERIFY PAGE LOAD ERROR:", err);

    const errorText = err.message || "Could not load properties.";

    if (
      errorText.toLowerCase().includes("token") &&
      errorText.toLowerCase().includes("expired")
    ) {
      localStorage.removeItem("token");
      setError("Your login session has expired. Please log in again.");
      router.replace("/login");
      return;
    }

    setError(errorText);
  } finally {
    setLoading(false);
  }
}, [router]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  async function updateVerification(property, verified) {
    const id = getId(property);

    if (!id) {
      setError("This property has no ID, so it cannot be updated.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/properties/${encodeURIComponent(id)}/set-verified`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_verified: verified }),
        }
      );

      await readResponse(response);

      setProperties((current) =>
        current.map((item) =>
          getId(item) === id
            ? {
                ...item,
                is_verified: verified,
                verified,
                verification_status: verified ? "verified" : "pending",
                status: verified ? "VERIFIED" : item.status,
              }
            : item
        )
      );

      setMessage(
        verified
          ? `${getName(property)} has been verified successfully.`
          : `Verification has been removed from ${getName(property)}.`
      );

      await loadProperties();
    } catch (err) {
      console.error("PROPERTY VERIFICATION ERROR:", err);
      setError(err.message || "Unable to update verification.");
    } finally {
      setBusyId("");
    }
  }

  const verifiedCount = properties.filter(isVerified).length;
  const pendingCount = properties.length - verifiedCount;

  const visibleProperties = properties.filter((property) => {
    if (filter === "verified") return isVerified(property);
    if (filter === "pending") return !isVerified(property);
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <Link href={DASHBOARD} className="text-2xl font-bold text-slate-900">
              Home<span className="text-emerald-600">Find</span>
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Merchant Dashboard / Property Verification
            </p>
          </div>

          <Link
            href={DASHBOARD}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">
            Property Verification
          </h1>
          <p className="mt-2 text-slate-500">
            Review properties and update their verification status.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total properties loaded</p>
            <p className="mt-2 text-3xl font-bold">{properties.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Verified</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending verification</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <option value="pending">Pending verification</option>
            <option value="verified">Verified properties</option>
            <option value="all">All properties</option>
          </select>

          <button
            onClick={loadProperties}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
            Loading properties...
          </div>
        ) : visibleProperties.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="text-5xl">⌂</div>
            <h2 className="mt-4 text-xl font-bold">
              No properties in this list
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {properties.length === 0
                ? "No properties were returned by the API. Check the message above and browser console."
                : "Try another filter or refresh the property list."}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property, index) => {
              const id = getId(property);
              const verified = isVerified(property);
              const image = getImage(property);

              return (
                <article
                  key={id || `${getName(property)}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-52 bg-slate-100">
                    {image ? (
                      <img
                        src={image}
                        alt={getName(property)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl text-slate-300">
                        ⌂
                      </div>
                    )}

                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
                        verified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {verified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="space-y-3 p-5">
                    <h2 className="text-lg font-bold text-slate-900">
                      {getName(property)}
                    </h2>

                    <p className="text-xl font-bold text-emerald-700">
                      {price(property.price)}
                    </p>

                    <p className="text-sm text-slate-500">
                      {[
                        property.address,
                        property.city,
                        property.state,
                        property.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Location unavailable"}
                    </p>

                    <p className="text-sm text-slate-500">
                      Category: {property.category || "Not specified"}
                    </p>

                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <button
                        onClick={() => updateVerification(property, !verified)}
                        disabled={!id || busyId === id}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                          verified
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {busyId === id
                          ? "Updating..."
                          : verified
                          ? "Remove Verification"
                          : "Verify Property"}
                      </button>

                      {id && (
                        <Link
                          href={`/all-property/${encodeURIComponent(id)}`}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold hover:bg-slate-50"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";
const DASHBOARD_PAGE = "/dashboard/agent";

function getAccountData(value) {
  let account = value;

  // Unwrap common API response structures.
  for (let i = 0; i < 4 && account && typeof account === "object"; i++) {
    if (account.agent && typeof account.agent === "object") {
      account = account.agent;
    } else if (
      account.data &&
      typeof account.data === "object" &&
      !Array.isArray(account.data)
    ) {
      account = account.data;
    } else if (
      account.account &&
      typeof account.account === "object"
    ) {
      account = account.account;
    } else if (
      account.user &&
      typeof account.user === "object"
    ) {
      account = account.user;
    } else {
      break;
    }
  }

  return account || {};
}

function getId(account) {
  return (
    account?.agent_id ||
    account?.agentId ||
    account?.id ||
    account?._id ||
    ""
  );
}

function getMerchantId(account) {
  const nestedMerchant =
    account?.merchant && typeof account.merchant === "object"
      ? account.merchant
      : {};

  return (
    localStorage.getItem("merchantId") ||
    account?.merchant_id ||
    account?.merchantId ||
    nestedMerchant?.merchant_id ||
    nestedMerchant?.id ||
    nestedMerchant?._id ||
    ""
  );
}

function getList(result) {
  if (Array.isArray(result)) return result;

  const candidates = [
    result?.data,
    result?.results,
    result?.properties,
    result?.items,
    result?.data?.data,
    result?.data?.results,
    result?.data?.properties,
    result?.data?.items,
  ];

  return candidates.find(Array.isArray) || [];
}

function getPropertyId(property) {
  return (
    property?.property_id ||
    property?.propertyId ||
    property?.id ||
    property?._id ||
    ""
  );
}

function getImage(property) {
  const images =
    property?.images ||
    property?.image_urls ||
    property?.photos ||
    [];

  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      return first.url || first.image_url || first.src || "";
    }
  }

  if (typeof property?.image === "string") return property.image;
  if (typeof property?.image_url === "string") return property.image_url;
  if (typeof property?.thumbnail === "string") return property.thumbnail;

  return "";
}

function getPrice(property) {
  const price =
    property?.price ??
    property?.amount ??
    property?.rental_price;

  if (price === undefined || price === null || price === "") {
    return "Price not provided";
  }

  const number = Number(price);

  return Number.isFinite(number)
    ? `₦${number.toLocaleString("en-NG")}`
    : String(price);
}

function getLocation(property) {
  return [
    property?.address,
    property?.city,
    property?.state,
    property?.country,
  ]
    .filter(Boolean)
    .join(", ") || "Location not provided";
}

function getErrorMessage(result, status) {
  return (
    result?.msg ||
    result?.message ||
    result?.error?.message ||
    `Request failed with status ${status}.`
  );
}

export default function AgentPropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("all");

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const savedAccount = localStorage.getItem("account");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (role && role !== "agent") {
        throw new Error(
          "This page is for agent accounts. Please log in as an agent."
        );
      }

      if (!savedAccount) {
        throw new Error(
          "Your account information is missing. Please log in again."
        );
      }

      let parsedAccount;

      try {
        parsedAccount = JSON.parse(savedAccount);
      } catch {
        throw new Error(
          "Your saved account information is invalid. Please log in again."
        );
      }

      const account = getAccountData(parsedAccount);
      const agentId =
        localStorage.getItem("agentId") || getId(account);
      const merchantId = getMerchantId(account);

      if (!agentId) {
        throw new Error(
          "Could not find your agent ID. Please log out and log in again. If this continues, the login API response needs to be checked."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch both verification states so the page can show
      // verified and unverified properties together.
      async function fetchByVerification(verified) {
        const params = new URLSearchParams({
          agent: String(agentId),
          verified: String(verified),
        });

        if (merchantId) {
          params.set("merchant", String(merchantId));
        }

        const response = await fetch(
          `${API}/properties?${params.toString()}`,
          { method: "GET", headers, cache: "no-store" }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(getErrorMessage(result, response.status));
        }

        if (result?.success === false || result?.status === "error") {
          throw new Error(
            result?.msg || result?.message || "Unable to load properties."
          );
        }

        return getList(result);
      }

      const results = await Promise.allSettled([
        fetchByVerification(true),
        fetchByVerification(false),
      ]);

      const successfulResults = results
        .filter((item) => item.status === "fulfilled")
        .map((item) => item.value);

      if (successfulResults.length === 0) {
        throw new Error(
          results
            .filter((item) => item.status === "rejected")
            .map((item) => item.reason?.message)
            .filter(Boolean)
            .join(" | ") || "Unable to load properties."
        );
      }

      const combined = successfulResults.flat();
      const uniqueProperties = [];
      const seen = new Set();

      for (const property of combined) {
        const id = getPropertyId(property);

        // Deduplicate records that appeared in both requests.
        const key = id ? String(id) : JSON.stringify(property);

        if (!seen.has(key)) {
          seen.add(key);
          uniqueProperties.push(property);
        }
      }

      setProperties(uniqueProperties);

      if (successfulResults.length === 1) {
        const failed = results.find((item) => item.status === "rejected");

        setNotice(
          `Some properties could not be retrieved: ${
            failed?.reason?.message || "one request failed"
          }`
        );
      }

      if (uniqueProperties.length === 0) {
        setNotice("No properties were returned for this agent yet.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong loading properties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const filteredProperties = properties.filter((property) => {
    const text = [
      property?.name,
      property?.title,
      property?.description,
      property?.address,
      property?.city,
      property?.state,
      property?.category,
      property?.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());

    const isVerified =
      property?.verified === true ||
      property?.verified === "true";

    const matchesVerification =
      verification === "all" ||
      (verification === "verified" && isVerified) ||
      (verification === "unverified" && !isVerified);

    return matchesSearch && matchesVerification;
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href={DASHBOARD_PAGE}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Agent Dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Properties
            </h1>
            <p className="mt-2 text-gray-600">
              View properties associated with your agent account.
            </p>
          </div>

          <button
            type="button"
            onClick={loadProperties}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Properties"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Properties</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "—" : properties.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Verified Properties</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {loading
                ? "—"
                : properties.filter(
                    (property) =>
                      property?.verified === true ||
                      property?.verified === "true"
                  ).length}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location, or category..."
            className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          />

          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          >
            <option value="all">All properties</option>
            <option value="verified">Verified properties</option>
            <option value="unverified">Unverified properties</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p className="font-semibold">Unable to load properties</p>
            <p className="mt-1 text-sm">{error}</p>
            <p className="mt-2 text-sm">
              Check that your agent is logged in and the API token is valid.
            </p>
          </div>
        )}

        {notice && !error && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">Loading your properties...</p>
          </div>
        ) : !error && filteredProperties.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              No properties found
            </h2>
            <p className="mt-2 text-gray-500">
              Try changing your search or verification filter. If this is your
              first visit, your agent account may not have any properties yet.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property, index) => {
              const id = getPropertyId(property);
              const image = getImage(property);
              const isVerified =
                property?.verified === true ||
                property?.verified === "true";

              return (
                <article
                  key={id || index}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex h-52 items-center justify-center bg-gray-100">
                    {image ? (
                      <img
                        src={image}
                        alt={property?.name || property?.title || "Property"}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <span className="text-4xl">⌂</span>
                        <p className="mt-2 text-sm">No image available</p>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-bold text-gray-900">
                        {property?.name ||
                          property?.title ||
                          "Untitled Property"}
                      </h2>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          isVerified
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-bold text-blue-700">
                      {getPrice(property)}
                    </p>

                    <p className="mt-3 text-sm text-gray-600">
                      {getLocation(property)}
                    </p>

                    {property?.category && (
                      <p className="mt-3 text-sm text-gray-700">
                        <span className="font-semibold">Category:</span>{" "}
                        {property.category}
                      </p>
                    )}

                    {property?.type && (
                      <p className="mt-1 text-sm text-gray-700">
                        <span className="font-semibold">Type:</span>{" "}
                        {property.type}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600">
                      {property?.bedroom != null && (
                        <span>{property.bedroom} bedrooms</span>
                      )}
                      {property?.bathroom != null && (
                        <span>{property.bathroom} bathrooms</span>
                      )}
                      {property?.toilet != null && (
                        <span>{property.toilet} toilets</span>
                      )}
                    </div>

                    {id && (
                      <p className="mt-3 break-all text-xs text-gray-400">
                        Property ID: {id}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

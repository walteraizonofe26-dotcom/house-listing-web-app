
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";
const DASHBOARD_PAGE = "/dashboard/merchant";
const PROPERTY_DETAILS_PAGE = "/dashboard/merchant/all-properties";

/* -------------------- Helpers -------------------- */

function getId(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(
    value.agent_id ||
      value.agentId ||
      value.merchant_id ||
      value.merchantId ||
      value.property_id ||
      value.propertyId ||
      value.id ||
      value._id ||
      value.user_id ||
      value.userId ||
      ""
  );
}

function getPropertyId(property) {
  const id =
    property?.property_id ??
    property?.propertyId ??
    property?.id ??
    property?._id ??
    "";

  return id === null || id === undefined ? "" : String(id);
}

function getRelatedId(value) {
  return value && typeof value === "object"
    ? getId(value)
    : String(value ?? "");
}

function unwrapAccount(value) {
  let account = value;

  for (let i = 0; i < 5 && account && typeof account === "object"; i++) {
    if (account.account && typeof account.account === "object") {
      account = account.account;
    } else if (account.merchant && typeof account.merchant === "object") {
      account = account.merchant;
    } else if (account.user && typeof account.user === "object") {
      account = account.user;
    } else if (
      account.data &&
      !Array.isArray(account.data) &&
      typeof account.data === "object"
    ) {
      account = account.data;
    } else {
      break;
    }
  }

  return account || {};
}

function getStoredAccount() {
  try {
    return unwrapAccount(
      JSON.parse(localStorage.getItem("account") || "{}")
    );
  } catch {
    return {};
  }
}

function getMerchantId(account) {
  return (
    localStorage.getItem("merchantId") ||
    account?.merchant_id ||
    account?.merchantId ||
    account?.id ||
    account?._id ||
    ""
  );
}

function getList(result, preferredKey = "properties") {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const visited = new Set();
  const preferredKeys = [
    preferredKey,
    "properties",
    "agents",
    "results",
    "items",
    "records",
    "data",
  ].filter(Boolean);

  function search(value) {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return null;
    }

    visited.add(value);

    if (Array.isArray(value)) return value;

    for (const key of preferredKeys) {
      if (Array.isArray(value[key])) return value[key];
    }

    for (const child of Object.values(value)) {
      const found = search(child);
      if (found !== null) return found;
    }

    return null;
  }

  return search(result) || [];
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The API returned an invalid response. Check the API URL and try again."
    );
  }

  if (
    !response.ok ||
    result?.success === false ||
    result?.status === "error" ||
    result?.type === "BAD_REQUEST"
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        result?.error?.message ||
        `Request failed with status ${response.status}`
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

  if (Array.isArray(images) && images.length) {
    const first = images[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      return first.url || first.image_url || first.src || "";
    }
  }

  return (
    (typeof property?.image === "string" && property.image) ||
    (typeof property?.image_url === "string" && property.image_url) ||
    (typeof property?.photo === "string" && property.photo) ||
    (typeof property?.thumbnail === "string" && property.thumbnail) ||
    ""
  );
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

function getPropertyLocation(property) {
  return (
    [
      property?.address,
      property?.city,
      property?.state,
      property?.country,
    ]
      .filter(Boolean)
      .join(", ") || "Location unavailable"
  );
}

function formatPrice(value) {
  const amount = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(amount)
  ) {
    return "Price unavailable";
  }

  return `₦${amount.toLocaleString("en-NG")}`;
}

function isVerified(property) {
  return (
    property?.verified === true ||
    property?.verified === "true" ||
    property?.is_verified === true ||
    property?.verification_status?.toLowerCase?.() === "verified" ||
    property?.status?.toUpperCase?.() === "VERIFIED"
  );
}

function mergeProperties(...groups) {
  const unique = new Map();

  for (const group of groups) {
    if (!Array.isArray(group)) continue;

    for (const property of group) {
      if (!property || typeof property !== "object") continue;

      const id = getPropertyId(property);
      const key = id
        ? `id:${id}`
        : [
            getPropertyName(property),
            property?.address || "",
            property?.city || "",
            property?.price ?? "",
          ].join("|");

      const existing = unique.get(key) || {};

      unique.set(key, {
        ...existing,
        ...property,
      });
    }
  }

  return Array.from(unique.values());
}

/* -------------------- Page -------------------- */

export default function AllMerchantPropertiesPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountName, setAccountName] = useState("Merchant");

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const account = getStoredAccount();

      if (!token || !Object.keys(account).length) {
        router.replace("/login");
        return;
      }

      const role = String(
        account?.role ||
          account?.account_type ||
          localStorage.getItem("role") ||
          ""
      ).toLowerCase();

      if (role.includes("agent")) {
        router.replace("/dashboard/agent");
        return;
      }

      const merchantId = String(getMerchantId(account) || "");

      setAccountName(
        account?.full_name ||
          account?.name ||
          account?.company ||
          "Merchant"
      );

      if (!merchantId) {
        throw new Error(
          "Your merchant ID could not be found. Please log out and log in again."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      /*
       * Find pagination details inside nested API response objects.
       */
      function findPagination(value, visited = new Set()) {
        if (!value || typeof value !== "object" || visited.has(value)) {
          return null;
        }

        visited.add(value);

        if (
          !Array.isArray(value) &&
          Number.isFinite(Number(value.pages)) &&
          Number(value.pages) >= 1
        ) {
          return {
            page: Number(value.page) || 1,
            pages: Number(value.pages),
            limit: Number(value.limit) || 10,
            total: Number(value.total) || 0,
          };
        }

        for (const child of Object.values(value)) {
          if (child && typeof child === "object") {
            const found = findPagination(child, visited);
            if (found) return found;
          }
        }

        return null;
      }

      /*
       * Fetch all batches using offset/limit.
       * The previous implementation used page=2, but the API kept
       * returning page=1. This version advances the offset by the
       * limit returned by the API.
       */
      async function requestList(url, preferredKey = "properties") {
        const allRecords = [];
        const seenRecordIds = new Set();
        const seenPageSignatures = new Set();

        let offset = 0;
        let pageSize = 10;
        let totalPages = 1;
        let pageNumber = 1;

        while (pageNumber <= totalPages) {
          const requestUrl = new URL(url);

          requestUrl.searchParams.delete("page");
          requestUrl.searchParams.set("offset", String(offset));
          requestUrl.searchParams.set("limit", String(pageSize));

          const response = await fetch(requestUrl.toString(), {
            method: "GET",
            headers,
            cache: "no-store",
          });

          const result = await readResponse(response);
          const records = getList(result, preferredKey);
          const pagination = findPagination(result);

          console.log("PROPERTY REQUEST:", requestUrl.toString());
          console.log("RECORDS ON THIS PAGE:", records.length);
          console.log("PAGINATION INFO:", pagination);

          if (pagination) {
            pageSize = pagination.limit || pageSize;
            totalPages = pagination.pages || totalPages;
          }

          const pageSignature = records
            .map((record) => {
              return (
                getPropertyId(record) ||
                [
                  getPropertyName(record),
                  record?.address || "",
                  record?.city || "",
                  record?.price ?? "",
                ].join("|")
              );
            })
            .join("::");

          if (
            records.length > 0 &&
            seenPageSignatures.has(pageSignature)
          ) {
            console.warn(
              "The API returned a duplicate batch. Pagination stopped.",
              { offset, pageNumber }
            );
            break;
          }

          if (records.length > 0) {
            seenPageSignatures.add(pageSignature);
          }

          for (const record of records) {
            const id = getPropertyId(record);

            if (id && seenRecordIds.has(id)) continue;

            if (id) seenRecordIds.add(id);

            allRecords.push(record);
          }

          console.log("RECORDS COLLECTED SO FAR:", allRecords.length);

          if (
            records.length === 0 ||
            !pagination ||
            pageNumber >= totalPages
          ) {
            break;
          }

          // Advance by the actual batch size, not by one page number.
          offset += pageSize;
          pageNumber += 1;
        }

        console.log("ALL PAGES COMBINED:", allRecords.length);
        return allRecords;
      }

      /* 1. Load this merchant's agents. */

      let agents = [];

      try {
        agents = await requestList(
          `${API}/merchants/agents?offset=0&limit=100`,
          "agents"
        );

        agents = agents.filter((agent) => {
          const ownerId = getRelatedId(
            agent?.merchant_id ??
              agent?.merchantId ??
              agent?.merchant
          );

          return !ownerId || ownerId === merchantId;
        });
      } catch (agentError) {
        console.error("Could not load merchant agents:", agentError);
      }

      const agentIds = [
        ...new Set(agents.map((agent) => getId(agent)).filter(Boolean)),
      ];

      console.log("CURRENT MERCHANT ID:", merchantId);
      console.log("MERCHANT AGENTS:", agents);
      console.log("MERCHANT AGENT IDS:", agentIds);

      /* 2. Load merchant and agent properties. */

      const propertyJobs = [];

      async function addPropertyRequest(label, url) {
        try {
          const list = await requestList(url, "properties");

          console.log(`${label} FETCHED:`, list.length);

          return { label, list, error: "" };
        } catch (requestError) {
          console.error(`${label} FAILED:`, requestError);

          return {
            label,
            list: [],
            error: requestError?.message || "Request failed",
          };
        }
      }

      // Merchant-owned properties: verified and unverified.
      for (const verified of [true, false]) {
        const params = new URLSearchParams({
          merchant: merchantId,
          verified: String(verified),
        });

        propertyJobs.push(
          addPropertyRequest(
            `MERCHANT VERIFIED=${verified}`,
            `${API}/properties?${params.toString()}`
          )
        );
      }

      // Properties linked to each of this merchant's agents.
      for (const agentId of agentIds) {
        for (const verified of [true, false]) {
          const params = new URLSearchParams({
            agent: agentId,
            verified: String(verified),
            merchant: merchantId,
          });

          propertyJobs.push(
            addPropertyRequest(
              `AGENT ${agentId} VERIFIED=${verified}`,
              `${API}/properties?${params.toString()}`
            )
          );
        }
      }

      // General list as a fallback.
      propertyJobs.push(
        addPropertyRequest(
          "GENERAL PROPERTIES",
          `${API}/properties?limit=100&offset=0`
        )
      );

      const results = await Promise.all(propertyJobs);

      const merchantScopedProperties = [];
      const agentScopedProperties = [];
      let generalProperties = [];
      const requestErrors = [];

      for (const result of results) {
        if (result.error) {
          requestErrors.push(`${result.label}: ${result.error}`);
          continue;
        }

        if (result.label === "GENERAL PROPERTIES") {
          generalProperties = result.list;
        } else if (result.label.startsWith("MERCHANT ")) {
          merchantScopedProperties.push(...result.list);
        } else {
          agentScopedProperties.push(...result.list);
        }
      }

      /*
       * Only include general records that match this merchant or
       * one of the merchant's agents.
       */
      const ownedGeneralProperties = generalProperties.filter((property) => {
        const propertyMerchantId = getPropertyMerchantId(property);
        const propertyAgentId = getPropertyAgentId(property);

        return (
          (propertyMerchantId && propertyMerchantId === merchantId) ||
          (propertyAgentId && agentIds.includes(propertyAgentId))
        );
      });

      /* 3. Include locally saved recently created properties. */

      let localProperties = [];

      try {
        const saved = JSON.parse(
          localStorage.getItem("recentlyCreatedProperties") || "[]"
        );

        if (Array.isArray(saved)) {
          localProperties = saved.filter((property) => {
            const propertyMerchantId = getPropertyMerchantId(property);
            const propertyAgentId = getPropertyAgentId(property);

            if (!propertyMerchantId && !propertyAgentId) return true;

            return (
              propertyMerchantId === merchantId ||
              (propertyAgentId && agentIds.includes(propertyAgentId))
            );
          });
        }
      } catch {
        localProperties = [];
      }

      /*
       * Merge results and remove duplicates by property ID.
       * Scoped API results take precedence over local fallback records.
       */
      const combinedProperties = mergeProperties(
        localProperties,
        ownedGeneralProperties,
        merchantScopedProperties,
        agentScopedProperties
      );

      console.log("LOCAL PROPERTIES:", localProperties.length);
      console.log(
        "MERCHANT-SCOPED PROPERTIES:",
        merchantScopedProperties.length
      );
      console.log(
        "AGENT-SCOPED PROPERTIES:",
        agentScopedProperties.length
      );
      console.log(
        "OWNED GENERAL PROPERTIES:",
        ownedGeneralProperties.length
      );
      console.log("FINAL UNIQUE PROPERTY COUNT:", combinedProperties.length);
      console.log(
        "FINAL PROPERTY IDS:",
        combinedProperties.map((property) => ({
          id: getPropertyId(property),
          name: getPropertyName(property),
          merchant: getPropertyMerchantId(property),
          agent: getPropertyAgentId(property),
        }))
      );

      setProperties(combinedProperties);

      if (combinedProperties.length === 0 && requestErrors.length > 0) {
        setError(
          "The API did not return any properties. " +
            requestErrors.slice(0, 2).join(" | ")
        );
      } else if (combinedProperties.length === 0) {
        setError(
          "No properties were returned for this merchant or its agents. Check the browser console for the property API responses."
        );
      }
    } catch (loadError) {
      console.error("LOAD ALL PROPERTIES ERROR:", loadError);

      const message = loadError?.message || "Unable to load properties.";

      if (
        message.toLowerCase().includes("token") &&
        message.toLowerCase().includes("expired")
      ) {
        localStorage.removeItem("token");
        setError("Your login session has expired. Please log in again.");
        router.replace("/login");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  /* -------------------- Search and filters -------------------- */

  const filteredProperties = properties.filter((property) => {
    const searchText = [
      getPropertyName(property),
      property?.category,
      property?.type,
      property?.property_use,
      property?.city,
      property?.state,
      property?.address,
      property?.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(
      search.trim().toLowerCase()
    );

    const selectedType = typeFilter.toLowerCase();
    const propertyType = String(
      property?.type ||
        property?.property_use ||
        property?.category ||
        ""
    ).toLowerCase();

    const matchesType =
      selectedType === "all" || propertyType.includes(selectedType);

    return matchesSearch && matchesType;
  });

  const verifiedCount = properties.filter(isVerified).length;

  /* -------------------- UI -------------------- */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <Link
              href={DASHBOARD_PAGE}
              className="text-2xl font-bold text-slate-900"
            >
              Home<span className="text-emerald-600">Find</span>
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Merchant dashboard / All properties
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={DASHBOARD_PAGE}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
            >
              ← Dashboard
            </Link>

            <Link
              href="/dashboard/merchant/add-property"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              + Add Property
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-medium text-emerald-700">
            Welcome, {accountName}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            All Properties
          </h1>
          <p className="mt-2 text-slate-500">
            View properties listed by your merchant account and its agents.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total properties</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "…" : properties.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Verified</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {loading ? "…" : verifiedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Pending verification
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {loading ? "…" : properties.length - verifiedCount}
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, location, or category..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
          >
            <option value="all">All property types</option>
            <option value="rent">Rent</option>
            <option value="sale">Sale</option>
            <option value="sales">Sales</option>
            <option value="lease">Lease</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="flat">Flat</option>
          </select>

          <button
            type="button"
            onClick={loadProperties}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Could not load all properties</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={loadProperties}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading your properties...
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="text-5xl">⌂</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {properties.length === 0
                ? "No properties found"
                : "No matching properties"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {properties.length === 0
                ? "No property records were returned by the available API requests."
                : "Try changing your search or selecting another property type."}
            </p>
            {properties.length === 0 && (
              <Link
                href="/dashboard/merchant/add-property"
                className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add a Property
              </Link>
            )}
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property, index) => {
              const id = getPropertyId(property);
              const image = getPropertyImage(property);
              const verified = isVerified(property);

              return (
                <article
                  key={id || `${getPropertyName(property)}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-56 bg-slate-100">
                    {image ? (
                      <img
                        src={image}
                        alt={getPropertyName(property)}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
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
                      {verified ? "Verified" : "Pending verification"}
                    </span>
                  </div>

                  <div className="space-y-3 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        {property?.category ||
                          property?.property_use ||
                          "Property"}
                      </p>
                      <h2 className="mt-1 line-clamp-1 text-lg font-bold text-slate-900">
                        {getPropertyName(property)}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {getPropertyLocation(property)}
                      </p>
                    </div>

                    <p className="text-xl font-bold text-emerald-700">
                      {formatPrice(
                        property?.price ??
                          property?.amount ??
                          property?.rental_price
                      )}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {property?.type && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          {property.type}
                        </span>
                      )}
                      {property?.bedroom != null && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          {property.bedroom} bedroom(s)
                        </span>
                      )}
                      {property?.bathroom != null && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          {property.bathroom} bathroom(s)
                        </span>
                      )}
                    </div>

                    {id ? (
                      <Link
                        href={`${PROPERTY_DETAILS_PAGE}/${encodeURIComponent(id)}`}
                        className="block rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        View Property Details →
                      </Link>
                    ) : (
                      <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-xs text-slate-500">
                        Details unavailable: this property has no ID.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="py-4 text-center text-xs text-slate-400">
          HomeFind · Merchant Properties
        </footer>
      </div>
    </main>
  );
}

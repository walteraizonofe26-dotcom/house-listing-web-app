"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";

function getList(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const queue = [result];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const key of ["properties", "data", "results", "items"]) {
      if (Array.isArray(current[key])) return current[key];
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return [];
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }

  if (
    !response.ok ||
    result?.type === "BAD_REQUEST" ||
    (typeof result?.code === "number" && result.code >= 400)
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

function getId(value) {
  if (value == null) return "";

  if (typeof value === "object") {
    return String(
      value.id ??
        value._id ??
        value.merchant_id ??
        value.merchantId ??
        value.property_id ??
        ""
    );
  }

  return String(value);
}

function getPropertyId(property) {
  return getId(property?.property_id ?? property?.id ?? property?._id);
}

function getSavedUser(savedAccount) {
  const candidates = [
    savedAccount?.data?.merchant,
    savedAccount?.data?.account,
    savedAccount?.data?.user,
    savedAccount?.merchant,
    savedAccount?.account,
    savedAccount?.user,
    savedAccount?.data,
    savedAccount,
  ];

  return (
    candidates.find(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    ) || null
  );
}

function getMerchantOwner(property) {
  return getId(
    property?.merchant ??
      property?.merchant_id ??
      property?.merchantId ??
      property?.owner?.merchant_id ??
      property?.owner?.id
  );
}

function getRecentlyCreatedProperties() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("recentlyCreatedProperties") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.map((item) => {
      const payload =
        item?.payload && typeof item.payload === "object"
          ? item.payload
          : {};

      const nested =
        item?.data?.property ||
        item?.property ||
        item?.data?.data ||
        {};

      return {
        ...payload,
        ...nested,
        ...item,
        id:
          item?.property_id ||
          item?.id ||
          item?._id ||
          nested?.property_id ||
          nested?.id ||
          nested?._id ||
          payload?.property_id ||
          payload?.id ||
          payload?._id ||
          "",
      };
    });
  } catch (error) {
    console.error("Could not read saved properties:", error);
    return [];
  }
}

function mergeProperties(apiProperties, savedProperties) {
  const result = new Map();

  [...savedProperties, ...apiProperties].forEach((property, index) => {
    const id = getPropertyId(property);
    const key = id
      ? `property-${id}`
      : `property-${property?.name || property?.title || index}`;

    result.set(key, property);
  });

  return Array.from(result.values());
}

function getPropertyImage(property) {
  const images = property?.images;
  const firstImage = Array.isArray(images) ? images[0] : null;

  const image =
    property?.image_url ||
    property?.imageUrl ||
    property?.cover_image ||
    property?.thumbnail ||
    (typeof property?.image === "string" ? property.image : "") ||
    (typeof firstImage === "string"
      ? firstImage
      : firstImage?.url ||
        firstImage?.image_url ||
        firstImage?.src) ||
    "";

  if (typeof image === "string") return image;

  if (image && typeof image === "object") {
    return image.url || image.image_url || image.src || "";
  }

  return "";
}

function getPropertyName(property) {
  return property?.name || property?.title || "Untitled Property";
}

function getLocation(property) {
  return [
    property?.address,
    property?.city,
    property?.state,
    property?.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPrice(value) {
  if (value == null || value === "") return "Price unavailable";

  const number = Number(value);

  return Number.isFinite(number)
    ? `₦${number.toLocaleString("en-NG")}`
    : String(value);
}

export default function MerchantPropertiesPage() {
  const router = useRouter();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");

  const loadProperties = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const savedProperties = getRecentlyCreatedProperties();

      try {
        const token = localStorage.getItem("token");
        const savedAccountText = localStorage.getItem("account");

        if (!token || !savedAccountText) {
          router.replace("/login");
          return;
        }

        let savedAccount;

        try {
          savedAccount = JSON.parse(savedAccountText);
        } catch {
          localStorage.removeItem("account");
          router.replace("/login");
          return;
        }

        const user = getSavedUser(savedAccount);

        if (!user) {
          throw new Error("Your saved account is invalid. Please log in again.");
        }

        const role = String(
          localStorage.getItem("role") ||
            savedAccount?.role ||
            savedAccount?.data?.role ||
            user?.role ||
            user?.actor ||
            user?.type ||
            ""
        ).toLowerCase();

        const nestedMerchant =
          typeof user?.merchant === "object"
            ? getId(user.merchant)
            : user?.merchant;

        const merchantId =
          localStorage.getItem("merchantId") ||
          user?.merchant_id ||
          user?.merchantId ||
          nestedMerchant ||
          savedAccount?.merchant_id ||
          savedAccount?.merchantId ||
          savedAccount?.data?.merchant_id ||
          savedAccount?.data?.merchantId ||
          (role.includes("merchant") ? getId(user) : "");

        if (!merchantId) {
          throw new Error(
            "Merchant ID is missing. Please check the account information saved by your login page."
          );
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        };

        let apiProperties = [];
        let requestError = "";

        // Request properties belonging to this merchant.
        try {
          const response = await fetch(
            `${API}/properties?merchant=${encodeURIComponent(merchantId)}&limit=100`,
            { headers, cache: "no-store" }
          );

          const result = await readResponse(response);
          apiProperties = getList(result);

          console.log("Merchant properties response:", result);
        } catch (err) {
          requestError = err.message;
          console.error("Merchant properties error:", err);
        }

        // Fallback: only include general API records that identify this merchant.
        if (apiProperties.length === 0) {
          try {
            const response = await fetch(`${API}/properties?limit=100`, {
              headers,
              cache: "no-store",
            });

            const result = await readResponse(response);
            const allProperties = getList(result);

            apiProperties = allProperties.filter(
              (property) =>
                getMerchantOwner(property) === String(merchantId)
            );
          } catch (err) {
            if (!requestError) requestError = err.message;
            console.error("General properties error:", err);
          }
        }

        // Include properties recently created in this browser.
        const combined = mergeProperties(apiProperties, savedProperties);

        setProperties(combined);

        if (combined.length === 0 && requestError) {
          setError(requestError);
        }
      } catch (err) {
        console.error("Could not load merchant properties:", err);
        setProperties(savedProperties);
        setError(err.message || "Unable to load properties.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadProperties();

    const handleFocus = () => loadProperties(true);

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadProperties]);

  const filteredProperties = properties.filter((property) => {
    const text = [
      getPropertyName(property),
      property?.address,
      property?.city,
      property?.state,
      property?.country,
      property?.type,
      property?.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());

    const type = String(
      property?.type || property?.category || ""
    ).toUpperCase();

    return (
      matchesSearch &&
      (selectedType === "ALL" || type === selectedType)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top navigation */}
      <header className="bg-slate-950 px-5 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/merchant"
              className="text-2xl font-bold"
            >
              HomeFind
            </Link>
            <p className="mt-1 text-sm text-slate-400">
              Merchant Property Management
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/merchant"
              className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
            >
              ← Dashboard
            </Link>

            <Link
              href="/add-property"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
            >
              + Add Property
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {/* Page heading */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Your Listings
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              My Properties
            </h1>
            <p className="mt-2 text-slate-600">
              View and manage properties connected to your merchant account.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-sm text-slate-500">Total properties</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? "..." : properties.length}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <section className="mb-7 rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_auto]">
            <div>
              <label
                htmlFor="property-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search properties
              </label>
              <input
                id="property-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or location..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="property-type"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Property type
              </label>
              <select
                id="property-type"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="ALL">All types</option>
                <option value="RENT">Rent</option>
                <option value="LEASE">Lease</option>
                <option value="SALES">Sales</option>
                <option value="FLAT">Flat</option>
                <option value="APARTMENT">Apartment</option>
                <option value="LAND">Land</option>
                <option value="DUPLEX">Duplex</option>
                <option value="SHOP">Shop</option>
                <option value="WAREHOUSE">Warehouse</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadProperties(true)}
                disabled={refreshing}
                className="w-full rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60 md:w-auto"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              We could not retrieve all properties from the API.
            </p>
            <p className="mt-1 break-words">{error}</p>
            <p className="mt-2">
              Locally saved properties may still appear below.
            </p>
          </div>
        )}

        {/* Property listing */}
        {loading ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-slate-600">
              Loading your properties...
            </p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <p className="text-5xl">🏠</p>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {properties.length === 0
                ? "No properties found"
                : "No matching properties"}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-500">
              {properties.length === 0
                ? "Add a property to get started, or check whether your existing properties were saved under this merchant account."
                : "Try a different search or property type."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {properties.length === 0 ? (
                <Link
                  href="/add-property"
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  + Add Property
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedType("ALL");
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              )}

              <button
                type="button"
                onClick={() => loadProperties(true)}
                disabled={refreshing}
                className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Reload"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredProperties.length}
              </span>{" "}
              {filteredProperties.length === 1 ? "property" : "properties"}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProperties.map((property, index) => {
                const id = getPropertyId(property);
                const image = getPropertyImage(property);

                // Details page for this dashboard listing.
                const detailsHref = id
                  ? `/dashboard/merchant/properties/${encodeURIComponent(id)}`
                  : "/dashboard/merchant/properties";

                return (
                  <article
                    key={id || `${getPropertyName(property)}-${index}`}
                    className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <Link
                      href={detailsHref}
                      className="relative block h-52 bg-slate-100"
                    >
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
                        <div className="flex h-full items-center justify-center text-6xl">
                          🏠
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-700 shadow-sm">
                        {property?.type || property?.category || "Property"}
                      </span>
                    </Link>

                    <div className="p-5">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {getPropertyName(property)}
                      </h2>

                      <p className="mt-2 min-h-10 text-sm text-slate-500">
                        {getLocation(property) || "Location unavailable"}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-xl font-bold text-blue-700">
                          {formatPrice(property?.price)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          {property?.bedroom != null && (
                            <span>🛏 {property.bedroom} Bedrooms</span>
                          )}
                          {property?.bathroom != null && (
                            <span>🛁 {property.bathroom} Bathrooms</span>
                          )}
                          {property?.total_area != null && (
                            <span>📐 {property.total_area} Area</span>
                          )}
                        </div>

                        <Link
                          href={detailsHref}
                          className="mt-5 block rounded-lg bg-slate-950 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

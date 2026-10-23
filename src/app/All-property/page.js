"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";
const IMAGE_ORIGIN = "http://property.reworkstaging.name.ng";
const PROPERTY_PAGE = "/All-property";
const RECENT_PROPERTIES_KEY = "recentlyCreatedProperties";
const PAGE_SIZE = 10;

function getStoredEmail() {
  if (typeof window === "undefined") return "";

  for (const key of ["account", "user", "merchant", "agent"]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");

      const account =
        saved?.account ||
        saved?.user ||
        saved?.merchant ||
        saved?.agent ||
        saved;

      const email = account?.email || account?.user?.email;

      if (email) return email;
    } catch {
      // Continue checking the other storage keys.
    }
  }

  return localStorage.getItem("email") || "";
}

function getRecentlyCreatedProperties() {
  if (typeof window === "undefined") return [];

  try {
    const saved = JSON.parse(
      localStorage.getItem(RECENT_PROPERTIES_KEY) || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter((item) => item && typeof item === "object")
      : [];
  } catch {
    return [];
  }
}

function getList(result) {
  const candidates = [
    result?.data?.properties,
    result?.data?.results,
    result?.data?.items,
    result?.data?.data?.properties,
    result?.properties,
    result?.results,
    result?.items,
    result?.data,
    result,
  ];

  return candidates.find(Array.isArray) || [];
}

function getPropertyId(property) {
  return (
    property?._id ||
    property?.id ||
    property?.property_id ||
    property?.propertyId ||
    property?.data?._id ||
    property?.data?.id ||
    property?.data?.property_id ||
    ""
  );
}

function mergeProperties(apiProperties, recentProperties) {
  const result = [];
  const seen = new Set();

  // Keep recently created properties visible while loading API records.
  for (const property of [...recentProperties, ...apiProperties]) {
    if (!property || typeof property !== "object") continue;

    const id = getPropertyId(property);

    if (id) {
      const key = String(id);

      if (seen.has(key)) continue;

      seen.add(key);
    }

    result.push(property);
  }

  return result;
}

async function readResponse(response) {
  const responseText = await response.text();
  let result = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("The property API returned an invalid response.");
  }

  const message = [
    result?.msg,
    result?.message,
    result?.error,
    result?.data?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    response.status === 401 ||
    response.status === 419 ||
    result?.type === "TOKEN_EXPIRED" ||
    message.includes("token supplied has expired") ||
    message.includes("token has expired") ||
    message.includes("jwt expired")
  ) {
    const error = new Error(
      "Your API token has expired. Please log in again and refresh this page."
    );

    error.expiredToken = true;
    throw error;
  }

  if (!response.ok) {
    throw new Error(
      result?.msg ||
        result?.message ||
        `Property request failed with HTTP ${response.status}.`
    );
  }

  if (
    result?.status === "BAD_REQUEST" ||
    result?.type === "BAD_REQUEST" ||
    Number(result?.code) >= 400
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        "The API could not load properties."
    );
  }

  return result;
}

async function getFreshPublicToken() {
  const email = getStoredEmail();

  if (!email) {
    throw new Error(
      "Your account email could not be found. Please log in again."
    );
  }

  const response = await fetch(`${API}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  const result = await readResponse(response);

  const token =
    result?.token ||
    result?.access_token ||
    result?.accessToken ||
    result?.data?.token ||
    result?.data?.access_token ||
    result?.data?.accessToken ||
    result?.data?.data?.token;

  if (!token || typeof token !== "string") {
    throw new Error(
      "The token endpoint did not return a token. Please check the API response."
    );
  }

  localStorage.setItem("token", token);

  return token;
}

async function requestPropertyPage(offset, token) {
  const url = `${API}/properties?offset=${offset}&limit=${PAGE_SIZE}`;

  console.log("REQUESTING PROPERTIES:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const result = await readResponse(response);

  console.log("PROPERTY API RESPONSE:", result);

  return result;
}

async function fetchAllProperties(token) {
  const allProperties = [];
  const seenIds = new Set();

  let offset = 0;

  for (let page = 0; page < 100; page++) {
    const result = await requestPropertyPage(offset, token);

    const items = getList(result).filter(
      (item) => item && typeof item === "object"
    );

    if (items.length === 0) break;

    let added = 0;

    for (const property of items) {
      const id = getPropertyId(property);

      if (id && seenIds.has(String(id))) continue;

      if (id) seenIds.add(String(id));

      allProperties.push(property);
      added++;
    }

    if (items.length < PAGE_SIZE || added === 0) break;

    const pagination =
      result?.pagination ||
      result?.data?.pagination ||
      result?.meta?.pagination ||
      result?.meta ||
      {};

    const total = Number(
      pagination?.total ??
        pagination?.totalItems ??
        pagination?.count ??
        result?.total ??
        result?.data?.total
    );

    offset += PAGE_SIZE;

    if (Number.isFinite(total) && total > 0 && offset >= total) {
      break;
    }
  }

  return allProperties;
}

/*
 * IMAGE FIX:
 * Handles image URLs stored as strings, arrays, nested objects,
 * and relative paths returned by the property API.
 */
function getPropertyImage(property) {
  const candidates = [
    property?.image_url,
    property?.imageUrl,
    property?.cover_image,
    property?.coverImage,
    property?.thumbnail,
    property?.image,
    property?.images,
    property?.resources,
    property?.resource,
    property?.property_image,
    property?.propertyImage,
    property?.photo,
    property?.photos,
    property?.data?.image_url,
    property?.data?.imageUrl,
    property?.data?.image,
    property?.data?.images,
    property?.data?.resources,
    property?.property?.image_url,
    property?.property?.imageUrl,
    property?.property?.image,
    property?.property?.images,
    property?.property?.resources,
  ];

  function extractImage(value, depth = 0) {
    if (!value || depth > 6) return "";

    if (typeof value === "string") {
      const path = value.trim();

      if (!path || path === "[object Object]") return "";

      if (path.startsWith("data:") || path.startsWith("blob:")) {
        return path;
      }

      if (path.startsWith("//")) {
        return `https:${path}`;
      }

      if (/^https?:\/\//i.test(path)) {
        return path;
      }

      // A relative image path needs a server origin.
      return `${IMAGE_ORIGIN}/${path.replace(/^\/+/, "")}`;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const image = extractImage(item, depth + 1);

        if (image) return image;
      }

      return "";
    }

    if (typeof value === "object") {
      const nestedCandidates = [
        value.url,
        value.image_url,
        value.imageUrl,
        value.src,
        value.path,
        value.resource_url,
        value.resourceUrl,
        value.image_path,
        value.imagePath,
        value.file_url,
        value.fileUrl,
        value.location,
        value.image,
        value.images,
        value.resources,
        value.resource,
        value.thumbnail,
        value.original,
      ];

      for (const candidate of nestedCandidates) {
        const image = extractImage(candidate, depth + 1);

        if (image) return image;
      }
    }

    return "";
  }

  for (const candidate of candidates) {
    const image = extractImage(candidate);

    if (image) return image;
  }

  return "";
}

function formatPrice(price) {
  if (price === undefined || price === null || price === "") {
    return "Price not provided";
  }

  const amount = Number(price);

  return Number.isFinite(amount)
    ? `₦${amount.toLocaleString("en-NG")}`
    : String(price);
}

function displayType(value) {
  if (!value) return "";

  const types = {
    RENT: "FOR RENT",
    SALES: "FOR SALE",
    SALE: "FOR SALE",
    LEASE: "FOR LEASE",
    SHORTLET: "SHORTLET",
  };

  const normalized = String(value).toUpperCase();

  return types[normalized] || String(value).replaceAll("_", " ");
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

export default function AllPropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    const recentProperties = getRecentlyCreatedProperties();

    // Display saved properties while the API request is running.
    setProperties(recentProperties);

    try {
      let token = localStorage.getItem("token");

      if (!token) {
        token = await getFreshPublicToken();
      }

      let apiProperties;

      try {
        apiProperties = await fetchAllProperties(token);
      } catch (firstError) {
        if (!firstError.expiredToken) throw firstError;

        token = await getFreshPublicToken();
        apiProperties = await fetchAllProperties(token);
      }

      const combined = mergeProperties(apiProperties, recentProperties);

      setProperties(combined);

      if (combined.length === 0) {
        setError(
          "The API returned no properties. Check whether the property was saved successfully."
        );
      }
    } catch (err) {
      console.error("LOAD PROPERTIES ERROR:", err);

      setProperties(recentProperties);

      setError(
        recentProperties.length
          ? `Showing properties saved in this browser. The full API list could not be loaded: ${err.message}`
          : err.message || "Unable to load properties from the server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setKeyword(params.get("search") || "");
    setPurpose((params.get("type") || "ALL").toUpperCase());
    setCategory((params.get("category") || "ALL").toUpperCase());

    loadProperties();

    const handleStorage = (event) => {
      if (
        event.key === RECENT_PROPERTIES_KEY ||
        event.key === null
      ) {
        const recent = getRecentlyCreatedProperties();

        setProperties((current) => mergeProperties(current, recent));
      }
    };

    const handlePropertyUpdate = () => {
      const recent = getRecentlyCreatedProperties();

      setProperties((current) => mergeProperties(current, recent));
    };

    window.addEventListener("storage", handleStorage);

    window.addEventListener(
      "homefind-properties-updated",
      handlePropertyUpdate
    );

    return () => {
      window.removeEventListener("storage", handleStorage);

      window.removeEventListener(
        "homefind-properties-updated",
        handlePropertyUpdate
      );
    };
  }, [loadProperties]);

  const filteredProperties = properties.filter((property) => {
    const searchText = [
      property.name,
      property.title,
      property.description,
      property.address,
      property.city,
      property.state,
      property.country,
      property.category,
      property.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesKeyword = searchText.includes(
      keyword.trim().toLowerCase()
    );

    const propertyType = String(property.type || "").toUpperCase();
    const selectedPurpose = purpose.toUpperCase();

    const matchesPurpose =
      selectedPurpose === "ALL" ||
      propertyType === selectedPurpose ||
      (selectedPurpose === "SALES" && propertyType === "SALE") ||
      (selectedPurpose === "SALE" && propertyType === "SALES");

    const matchesCategory =
      category === "ALL" ||
      String(property.category || "").toUpperCase() === category;

    return matchesKeyword && matchesPurpose && matchesCategory;
  });

  function clearFilters() {
    setKeyword("");
    setPurpose("ALL");
    setCategory("ALL");

    window.history.replaceState(null, "", PROPERTY_PAGE);
  }

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-extrabold text-emerald-700">
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link href="/" className="font-medium hover:text-emerald-700">
              Home
            </Link>

            <Link
              href={PROPERTY_PAGE}
              className="font-semibold text-emerald-700"
            >
              Properties
            </Link>

            <Link href="/agents" className="font-medium hover:text-emerald-700">
              Agents
            </Link>

            <Link href="/about" className="font-medium hover:text-emerald-700">
              About Us
            </Link>

            <Link href="/contact" className="font-medium hover:text-emerald-700">
              Contact
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 font-semibold hover:bg-gray-100"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenu((open) => !open)}
            className="rounded-lg border px-3 py-2 text-xl md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? "✕" : "☰"}
          </button>
        </nav>

        {mobileMenu && (
          <div className="space-y-1 border-t bg-white px-4 py-3 md:hidden">
            {[
              ["/", "Home"],
              [PROPERTY_PAGE, "Properties"],
              ["/agents", "Agents"],
              ["/about", "About Us"],
              ["/contact", "Contact"],
              ["/login", "Login"],
              ["/register", "Create Account"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenu(false)}
                className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* PAGE INTRODUCTION */}
      <section className="bg-emerald-800 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-bold uppercase tracking-widest text-emerald-200">
            Find your next property
          </p>

          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
            All Properties
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-emerald-50">
            Explore properties listed on HomeFind. Select any property to view
            its complete details.
          </p>
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="keyword"
              className="mb-2 block text-sm font-semibold"
            >
              Search properties
            </label>

            <input
              id="keyword"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Name, city or location"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="purpose"
              className="mb-2 block text-sm font-semibold"
            >
              Property purpose
            </label>

            <select
              id="purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3"
            >
              <option value="ALL">All purposes</option>
              <option value="RENT">For rent</option>
              <option value="SALES">For sale</option>
              <option value="LEASE">For lease</option>
              <option value="SHORTLET">Shortlet</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-semibold"
            >
              Property category
            </label>

            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3"
            >
              <option value="ALL">All categories</option>
              <option value="FLAT">Flats & Apartments</option>
              <option value="APPARTMENT">Apartments</option>
              <option value="DUPLEX">Duplexes</option>
              <option value="LAND">Land</option>
              <option value="SHOP">Shops & Offices</option>
              <option value="WAREHOUSE">Warehouse</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg border border-emerald-700 px-5 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* PROPERTY LIST */}
      <section className="mx-auto min-h-[300px] max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Available Properties</h2>

            {!loading && (
              <p className="mt-1 text-sm text-gray-500">
                {filteredProperties.length}{" "}
                {filteredProperties.length === 1
                  ? "property"
                  : "properties"}{" "}
                found
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadProperties}
            disabled={loading}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh Properties"}
          </button>
        </div>

        {loading && (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-gray-600">
              Loading properties...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-bold text-red-700">
              Property loading notice
            </h3>

            <p className="mt-2 text-gray-700">{error}</p>

            <button
              type="button"
              onClick={loadProperties}
              className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && filteredProperties.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-20 text-center">
            <div className="text-6xl">🏡</div>

            <h3 className="mt-5 text-2xl font-bold">
              {properties.length === 0
                ? "No properties found"
                : "No matching properties"}
            </h3>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-gray-500">
              {properties.length === 0
                ? "No properties were returned by the API or found in this browser's saved list."
                : "Try changing your search or clearing the filters to see other properties."}
            </p>

            {properties.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-lg bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {!loading && filteredProperties.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property, index) => {
              const id = getPropertyId(property);
              const image = getPropertyImage(property);
              const name = property.name || property.title || "Property";
              const location = getLocation(property);
              const propertyType = displayType(property.type);

              return (
                <article
                  key={id || index}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link
                    href={
                      id
                        ? `${PROPERTY_PAGE}/${encodeURIComponent(id)}`
                        : PROPERTY_PAGE
                    }
                    className="block"
                  >
                    {/* PROPERTY IMAGE */}
                    <div className="relative h-56 bg-gray-100">
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            console.error(
                              "PROPERTY IMAGE FAILED TO LOAD:",
                              event.currentTarget.src,
                              property
                            );

                            event.currentTarget.style.display = "none";

                            const fallback =
                              event.currentTarget.parentElement?.querySelector(
                                "[data-image-fallback]"
                              );

                            if (fallback) {
                              fallback.classList.remove("hidden");
                            }
                          }}
                        />
                      ) : null}

                      <div
                        data-image-fallback
                        className={`${
                          image ? "hidden" : "flex"
                        } absolute inset-0 flex-col items-center justify-center text-gray-400`}
                      >
                        <span className="text-6xl">🏡</span>
                        <span className="mt-2 text-sm">
                          No image available
                        </span>
                      </div>

                      {propertyType && (
                        <span className="absolute left-4 top-4 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">
                          {propertyType}
                        </span>
                      )}
                    </div>

                    {/* PROPERTY INFORMATION */}
                    <div className="p-5">
                      {property.category && (
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                          {String(property.category).replaceAll("_", " ")}
                        </p>
                      )}

                      <h3 className="mt-2 line-clamp-1 text-xl font-bold">
                        {name}
                      </h3>

                      <p className="mt-2 min-h-6 text-sm text-gray-500">
                        {location || "Location not provided"}
                      </p>

                      <p className="mt-4 text-2xl font-extrabold text-emerald-700">
                        {formatPrice(property.price)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-sm text-gray-600">
                        {Number(property.bedroom) > 0 && (
                          <span>🛏 {property.bedroom} Bedrooms</span>
                        )}

                        {Number(property.bathroom) > 0 && (
                          <span>🛁 {property.bathroom} Bathrooms</span>
                        )}

                        {property.total_area && (
                          <span>📐 {property.total_area} sqm</span>
                        )}
                      </div>

                      <p className="mt-5 font-bold text-emerald-700">
                        View Property Details →
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Link href="/" className="text-2xl font-extrabold text-white">
              HomeFind<span className="text-orange-500">.</span>
            </Link>

            <p className="mt-4 max-w-xs leading-7 text-gray-400">
              Helping you discover your next home, land or commercial property
              across Nigeria.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white">Quick Links</h3>

            <div className="mt-4 space-y-3">
              <Link href="/" className="block hover:text-white">
                Home
              </Link>

              <Link href={PROPERTY_PAGE} className="block hover:text-white">
                Properties
              </Link>

              <Link href="/agents" className="block hover:text-white">
                Agents
              </Link>

              <Link href="/about" className="block hover:text-white">
                About Us
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white">Your Account</h3>

            <div className="mt-4 space-y-3">
              <Link href="/login" className="block hover:text-white">
                Login
              </Link>

              <Link href="/register" className="block hover:text-white">
                Create Account
              </Link>

              <Link href="/wishlist" className="block hover:text-white">
                My Wishlist
              </Link>

              <Link
                href="/my-appointments"
                className="block hover:text-white"
              >
                My Appointments
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white">Contact</h3>

            <div className="mt-4 space-y-3 text-gray-400">
              <p>Nigeria</p>

              <Link
                href="/contact"
                className="inline-block text-emerald-300 hover:text-white"
              >
                Contact our team →
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-5 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} HomeFind. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
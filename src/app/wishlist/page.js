
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";
const WISHLIST_KEY = "wishlist";

function getPropertyId(property) {
  if (property === null || property === undefined) return null;

  if (typeof property === "string" || typeof property === "number") {
    return String(property);
  }

  const id =
    property.property_id ??
    property.propertyId ??
    property.id ??
    property._id;

  return id === undefined || id === null ? null : String(id);
}

function getPropertyName(property) {
  return property.name || property.title || "Untitled Property";
}

function getPropertyPrice(property) {
  const price = property.price ?? property.amount;

  if (price === undefined || price === null || price === "") {
    return "Price unavailable";
  }

  const numericPrice = Number(price);

  return Number.isFinite(numericPrice)
    ? `₦${numericPrice.toLocaleString("en-NG")}`
    : String(price);
}

function getPropertyImage(property) {
  const image =
    property.image_url ||
    property.image ||
    property.thumbnail ||
    (Array.isArray(property.images) ? property.images[0] : null);

  if (typeof image === "string") return image;

  if (image && typeof image === "object") {
    return image.url || image.image_url || image.src || "";
  }

  return "";
}

function getProperties(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const saved = JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
      );

      if (!Array.isArray(saved)) {
        throw new Error("Your saved wishlist data is invalid.");
      }

      // Saved property objects can be displayed immediately.
      // If only property IDs were saved, look up their details.
      const needsDetails = saved.some(
        (item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          (item && typeof item === "object" &&
            !item.name && !item.title)
      );

      let allProperties = [];

      if (needsDetails && saved.length > 0) {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API}/properties`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        });

        if (!response.ok) {
          throw new Error(
            "Could not load property details. Please try again."
          );
        }

        const result = await response.json();
        allProperties = getProperties(result);
      }

      const completeWishlist = saved
        .map((item) => {
          if (item && typeof item === "object" &&
              (item.name || item.title)) {
            return item;
          }

          const id = getPropertyId(item);

          return allProperties.find(
            (property) => getPropertyId(property) === id
          ) || (item && typeof item === "object" ? item : null);
        })
        .filter(Boolean);

      setWishlist(
        completeWishlist.filter(
          (property) => getPropertyId(property) !== null
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load your wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();

    const handleWishlistUpdate = () => loadWishlist();

    window.addEventListener("wishlistUpdated", handleWishlistUpdate);

    return () => {
      window.removeEventListener(
        "wishlistUpdated",
        handleWishlistUpdate
      );
    };
  }, [loadWishlist]);

  function removeFromWishlist(property) {
    const id = getPropertyId(property);

    if (id === null) return;

    setRemovingId(id);
    setNotice("");
    setError("");

    try {
      const saved = JSON.parse(
        localStorage.getItem(WISHLIST_KEY) || "[]"
      );

      const updated = saved.filter(
        (item) => getPropertyId(item) !== id
      );

      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));

      setWishlist((current) =>
        current.filter((item) => getPropertyId(item) !== id)
      );

      window.dispatchEvent(new Event("wishlistUpdated"));
      setNotice("Property removed from your wishlist.");
    } catch {
      setError("Could not update your wishlist. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Page heading */}
      <section className="bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-5 inline-block text-sm font-medium text-green-800 hover:underline"
          >
            ← Back to Home
          </Link>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-800">
            Your Collection
          </p>

          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            My Wishlist
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-gray-600">
            Keep track of the properties you love and revisit
            them whenever you are ready to find your next home.
          </p>

          {!loading && (
            <p className="mt-4 text-sm text-gray-500">
              {wishlist.length}{" "}
              {wishlist.length === 1 ? "property" : "properties"} saved
            </p>
          )}
        </div>
      </section>

      {/* Wishlist content */}
      <section className="px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-7xl">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
            >
              {error}
              <button
                onClick={loadWishlist}
                className="ml-3 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {notice && (
            <p
              role="status"
              className="mb-6 rounded-lg bg-green-50 p-4 text-green-800"
            >
              {notice}
            </p>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-600">
                Loading your wishlist...
              </p>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center sm:py-20">
              <div className="mb-5 text-6xl">♡</div>

              <h2 className="mb-3 text-2xl font-bold text-gray-900">
                Your wishlist is empty
              </h2>

              <p className="mx-auto mb-8 max-w-md leading-7 text-gray-600">
                You haven't saved any properties yet.
                Explore HomeFind and add the properties you
                love to your wishlist.
              </p>

              <Link
                href="/properties"
                className="inline-block rounded-lg bg-green-800 px-7 py-3.5 font-semibold text-white transition hover:bg-green-900"
              >
                Explore Properties
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map((property) => {
                const id = getPropertyId(property);
                const image = getPropertyImage(property);
                const location = [
                  property.address,
                  property.city,
                  property.state,
                  property.country,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    key={id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-56 bg-gray-100">
                      {image ? (
                        <img
                          src={image}
                          alt={getPropertyName(property)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <div className="text-center">
                            <span className="text-5xl">⌂</span>
                            <p className="mt-2 text-sm">
                              No image available
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(property)}
                        disabled={removingId === id}
                        aria-label={`Remove ${getPropertyName(property)} from wishlist`}
                        title="Remove from wishlist"
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-red-600 shadow-md transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingId === id ? "…" : "♥"}
                      </button>

                      {property.type && (
                        <span className="absolute bottom-4 left-4 rounded-md bg-white px-3 py-1.5 text-xs font-semibold uppercase text-gray-800 shadow">
                          {property.type}
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <p className="mb-2 text-xl font-bold text-green-800">
                        {getPropertyPrice(property)}
                      </p>

                      <h2 className="mb-2 line-clamp-1 text-lg font-bold text-gray-900">
                        {getPropertyName(property)}
                      </h2>

                      <p className="mb-4 min-h-6 text-sm text-gray-500">
                        {location || "Location not provided"}
                      </p>

                      <div className="mb-5 flex flex-wrap gap-4 text-sm text-gray-600">
                        {property.bedroom != null && (
                          <span>🛏 {property.bedroom} Bedrooms</span>
                        )}

                        {property.bathroom != null && (
                          <span>🛁 {property.bathroom} Bathrooms</span>
                        )}

                        {property.total_area != null && (
                          <span>
                            {property.total_area} Area
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Link
                          href={`/properties/${encodeURIComponent(id)}`}
                          className="flex-1 rounded-lg bg-green-800 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-900"
                        >
                          View Details
                        </Link>

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(property)}
                          disabled={removingId === id}
                          className="rounded-lg border border-gray-300 px-3 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

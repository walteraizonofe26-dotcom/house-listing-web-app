"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";
const RECENT_PROPERTIES_KEY = "recentlyCreatedProperties";
const DELETED_PROPERTIES_KEY = "deletedPropertyIds";

function getId(value) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);

  return String(
    value.property_id ??
      value.propertyId ??
      value.agent_id ??
      value.agentId ??
      value.merchant_id ??
      value.merchantId ??
      value.id ??
      value._id ??
      ""
  );
}

function getSavedPropertyId(item) {
  if (!item || typeof item !== "object") return "";

  const candidates = [
    item.property_id,
    item.propertyId,
    item.id,
    item._id,

    item.property?.property_id,
    item.property?.propertyId,
    item.property?.id,
    item.property?._id,

    item.data?.property?.property_id,
    item.data?.property?.propertyId,
    item.data?.property?.id,
    item.data?.property?._id,

    item.payload?.property_id,
    item.payload?.propertyId,
    item.payload?.id,
    item.payload?._id,
  ];

  const id = candidates.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return id == null ? "" : String(id);
}

function readDeletedIds() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(DELETED_PROPERTIES_KEY) || "[]"
    );

    return new Set(
      Array.isArray(saved) ? saved.map(String) : []
    );
  } catch (error) {
    console.error("Could not read deleted property IDs:", error);
    return new Set();
  }
}

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `The server returned an invalid response (${response.status}).`
    );
  }

  const code = Number(result?.code);

  if (
    !response.ok ||
    (Number.isFinite(code) && code >= 400) ||
    result?.success === false ||
    result?.status === "error" ||
    result?.type === "BAD_REQUEST" ||
    result?.type === "UNAUTHORIZED"
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        result?.error?.message ||
        `Request failed (${response.status}).`
    );
  }

  return result;
}

function findProperty(result, requestedId) {
  if (!result || typeof result !== "object") return null;

  const queue = [result];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();

    if (
      !current ||
      typeof current !== "object" ||
      visited.has(current)
    ) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === "object") {
          queue.push(item);
        }
      }
      continue;
    }

    const currentId = String(
      current.property_id ??
        current.propertyId ??
        current.id ??
        current._id ??
        ""
    );

    if (
      currentId === String(requestedId) &&
      (
        current.name ||
        current.title ||
        current.price != null ||
        current.address
      )
    ) {
      return current;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  // Some APIs return the property directly without an ID field.
  if (
    result.name ||
    result.title ||
    result.price != null ||
    result.address
  ) {
    return result;
  }

  return null;
}

function getImages(property) {
  const raw =
    property?.images ||
    property?.image_urls ||
    property?.photos ||
    property?.gallery ||
    [];

  const list = Array.isArray(raw) ? raw : [raw];

  const images = list
    .map((item) => {
      if (typeof item === "string") return "";
      if (!item || typeof item !== "object") return "";

      return item.url || item.image_url || item.src || item.path || "";
    })
    .filter(Boolean);

  // Support an array containing direct image URL strings.
  const stringImages = list.filter(
    (item) => typeof item === "string" && item.trim()
  );

  const cover =
    property?.image_url ||
    property?.imageUrl ||
    property?.cover_image ||
    property?.thumbnail ||
    (typeof property?.image === "string" ? property.image : "");

  const allImages = [...stringImages, ...images];

  if (cover && !allImages.includes(cover)) {
    allImages.unshift(cover);
  }

  return [...new Set(allImages)];
}

function getAgentName(property) {
  const agent =
    property?.agent ||
    property?.assigned_agent ||
    property?.assignedAgent;

  if (agent && typeof agent === "object") {
    return (
      agent.full_name ||
      agent.name ||
      agent.agent_name ||
      agent.email ||
      "Agent name not provided"
    );
  }

  return (
    property?.agent_name ||
    property?.agentName ||
    property?.created_by_name ||
    property?.createdByName ||
    "Agent name not provided by the API"
  );
}

function formatPrice(value) {
  if (value == null || value === "") return "Price unavailable";

  const amount = Number(value);

  return Number.isFinite(amount)
    ? `₦${amount.toLocaleString("en-NG")}`
    : String(value);
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">
        {value == null || value === "" ? "Not provided" : String(value)}
      </p>
    </div>
  );
}

export default function MerchantPropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const propertyId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      setError("The property ID is missing from the URL.");
      return;
    }

    // Do not reopen a property already deleted in this browser.
    if (readDeletedIds().has(String(propertyId))) {
      setLoading(false);
      setProperty(null);
      setError("This property has already been deleted.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API}/properties/${encodeURIComponent(propertyId)}`,
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
      console.log("PROPERTY DETAILS API RESPONSE:", result);

      const found = findProperty(result, propertyId);

      if (!found) {
        throw new Error(
          "The API response did not contain this property. Check the property ID and API response."
        );
      }

      setProperty(found);
    } catch (err) {
      console.error("Could not load property details:", err);
      setError(err.message || "Unable to load this property.");
    } finally {
      setLoading(false);
    }
  }, [propertyId, router]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  async function handleDelete() {
    if (!propertyId || deleting) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this property? This action cannot be undone."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/properties/${encodeURIComponent(propertyId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      // If the API reports an error, do not mark the property as deleted.
      const result = await readResponse(response);
      console.log("DELETE PROPERTY API RESPONSE:", result);

      // 1. Remember the deleted ID so the listing page filters it out.
      const deletedIds = readDeletedIds();
      deletedIds.add(String(propertyId));

      localStorage.setItem(
        DELETED_PROPERTIES_KEY,
        JSON.stringify([...deletedIds])
      );

      // 2. Remove the property from the locally saved recent list.
      try {
        const saved = JSON.parse(
          localStorage.getItem(RECENT_PROPERTIES_KEY) || "[]"
        );

        if (Array.isArray(saved)) {
          const remaining = saved.filter(
            (item) =>
              getSavedPropertyId(item) !== String(propertyId)
          );

          localStorage.setItem(
            RECENT_PROPERTIES_KEY,
            JSON.stringify(remaining)
          );
        }
      } catch (storageError) {
        console.error(
          "Could not update saved property list:",
          storageError
        );
      }

      // 3. Leave the details page and return to the listing.
      router.replace("/dashboard/merchant/properties");
    } catch (err) {
      console.error("Could not delete property:", err);
      setError(err.message || "Unable to delete this property.");
    } finally {
      setDeleting(false);
    }
  }

  const images = property ? getImages(property) : [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-slate-600">
            Loading property details...
          </p>
        </div>
      </main>
    );
  }

  if (error && !property) {
    return (
      <main className="min-h-screen bg-slate-100 p-5 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <Link
            href="/dashboard/merchant/properties"
            className="font-semibold text-blue-700 hover:underline"
          >
            ← Back to My Properties
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Unable to open property
          </h1>

          <p className="mt-3 break-words text-slate-600">{error}</p>

          <button
            type="button"
            onClick={loadProperty}
            className="mt-5 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!property) return null;

  const name = property.name || property.title || "Property Details";

  const location = [
    property.address,
    property.city,
    property.state,
    property.country,
  ]
    .filter(Boolean)
    .join(", ");

  const verification =
    property.verification_status ||
    property.status ||
    (property.is_verified || property.verified ? "Verified" : "Pending");

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 px-5 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard/merchant"
              className="text-2xl font-bold"
            >
              HomeFind
            </Link>

            <p className="mt-1 text-sm text-slate-400">
              Merchant Property Details
            </p>
          </div>

          <Link
            href="/dashboard/merchant/properties"
            className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
          >
            ← Back to My Properties
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {images.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 bg-slate-100 md:grid-cols-2">
              <img
                src={images[0]}
                alt={name}
                className="h-72 w-full object-cover md:h-96"
              />

              {images.length > 1 ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(1, 5).map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image}
                      alt={`${name} image ${index + 2}`}
                      className="h-36 w-full object-cover md:h-[190px]"
                    />
                  ))}
                </div>
              ) : (
                <div className="hidden items-center justify-center bg-slate-50 text-7xl md:flex">
                  🏠
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center bg-slate-200 text-7xl">
              🏠
            </div>
          )}

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                  {property.type || property.category || "Property"}
                </span>

                <h1 className="mt-3 break-words text-3xl font-bold text-slate-900">
                  {name}
                </h1>

                <p className="mt-3 text-slate-600">
                  {location || "Location not provided"}
                </p>

                <p className="mt-4 text-3xl font-bold text-blue-700">
                  {formatPrice(property.price)}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {String(verification)}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/merchant/properties/${encodeURIComponent(
                  propertyId
                )}/edit`}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Edit Property
              </Link>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Property"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Property Information
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Property name" value={name} />
            <Detail label="Price" value={formatPrice(property.price)} />
            <Detail label="Category" value={property.category} />
            <Detail label="Property type" value={property.type} />
            <Detail label="Property use" value={property.property_use} />
            <Detail label="Payment plan" value={property.payment_plan} />
            <Detail label="Country" value={property.country} />
            <Detail label="State" value={property.state} />
            <Detail label="City" value={property.city} />
            <Detail label="Address" value={property.address} />
            <Detail label="Total area" value={property.total_area} />
            <Detail label="Bedrooms" value={property.bedroom} />
            <Detail label="Bathrooms" value={property.bathroom} />
            <Detail label="Toilets" value={property.toilet} />
            <Detail label="Parking spaces" value={property.parking_space} />
            <Detail label="Furnishing" value={property.furnishing} />
            <Detail label="Agent name" value={getAgentName(property)} />
            <Detail label="Property ID" value={getId(property)} />
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-slate-900">Description</h3>

            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
              {property.description || "No description provided."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
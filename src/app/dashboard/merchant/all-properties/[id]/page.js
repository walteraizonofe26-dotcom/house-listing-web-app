
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";
const ALL_PROPERTIES_PAGE = "/dashboard/merchant/all-properties";

function getId(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(
    value.id ||
      value._id ||
      value.property_id ||
      value.propertyId ||
      value.agent_id ||
      value.agentId ||
      ""
  );
}

function getList(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  const queue = [result];
  const visited = new Set();
  const keys = ["properties", "agents", "data", "results", "items", "records"];

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
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return [];
}

function findProperty(result, id) {
  const queue = [result];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (!Array.isArray(current)) {
      const currentId = getId(current);

      if (
        currentId === String(id) &&
        (current.name ||
          current.title ||
          current.property_name ||
          current.price !== undefined)
      ) {
        return current;
      }
    }

    if (Array.isArray(current)) {
      queue.push(...current);
    } else {
      queue.push(...Object.values(current).filter(
        (value) => value && typeof value === "object"
      ));
    }
  }

  return null;
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
        `Request failed with status ${response.status}`
    );
  }

  return result;
}

function getName(property) {
  return (
    property?.name ||
    property?.title ||
    property?.property_name ||
    "Unnamed Property"
  );
}

function getImages(property) {
  const raw =
    property?.images ||
    property?.image_urls ||
    property?.photos ||
    property?.gallery ||
    [];

  const images = Array.isArray(raw) ? raw : [raw];

  const cleaned = images
    .map((image) => {
      if (typeof image === "string") return image;

      if (image && typeof image === "object") {
        return image.url || image.image_url || image.src || "";
      }

      return "";
    })
    .filter(Boolean);

  const singleImage =
    property?.image_url ||
    property?.image ||
    property?.photo ||
    property?.thumbnail;

  if (cleaned.length) return cleaned;
  if (typeof singleImage === "string" && singleImage) return [singleImage];

  return [];
}

function getLocation(property) {
  return [
    property?.address,
    property?.city,
    property?.state,
    property?.country,
  ]
    .filter(Boolean)
    .join(", ") || "Location unavailable";
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
      ""
    );
  }

  return (
    property?.agent_name ||
    property?.agentName ||
    property?.created_by_name ||
    property?.createdByName ||
    ""
  );
}

export default function AllPropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [property, setProperty] = useState(null);
  const [agentName, setAgentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProperty = useCallback(async () => {
    if (!id) {
      setError("The property ID is missing from the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      let result;

      try {
        const response = await fetch(
          `${API}/properties/${encodeURIComponent(id)}`,
          { headers, cache: "no-store" }
        );

        result = await readResponse(response);
      } catch (detailError) {
        // Some API versions return the property through the collection route.
        const response = await fetch(`${API}/properties?limit=100`, {
          headers,
          cache: "no-store",
        });

        const listResult = await readResponse(response);
        const list = getList(listResult);
        const matching = list.find((item) => getId(item) === String(id));

        if (!matching) throw detailError;
        result = matching;
      }

      let found = findProperty(result, id);

      if (!found && result && typeof result === "object") {
        if (
          result.name ||
          result.title ||
          result.property_name ||
          result.price !== undefined
        ) {
          found = result;
        }
      }

      if (!found) {
        throw new Error(
          "The API response did not contain this property. Check the browser console for the response."
        );
      }

      setProperty(found);
      setAgentName(getAgentName(found));

      console.log("ALL PROPERTY DETAILS API RESPONSE:", result);

      // If the property only contains an agent ID, try to resolve the name.
      const agentValue =
        found?.agent ||
        found?.agent_id ||
        found?.agentId ||
        found?.assigned_agent ||
        found?.assignedAgent;

      const agentId = getId(agentValue);

      if (
        !getAgentName(found) &&
        agentId &&
        typeof agentValue !== "object"
      ) {
        try {
          const agentsResponse = await fetch(
            `${API}/merchants/agents?offset=0&limit=100`,
            { headers, cache: "no-store" }
          );

          const agentsResult = await readResponse(agentsResponse);
          const agents = getList(agentsResult);
          const matchedAgent = agents.find(
            (agent) => getId(agent) === agentId
          );

          if (matchedAgent) {
            setAgentName(
              matchedAgent.full_name ||
                matchedAgent.name ||
                matchedAgent.agent_name ||
                matchedAgent.email ||
                ""
            );
          }
        } catch (agentError) {
          console.error("Could not resolve property agent:", agentError);
        }
      }
    } catch (loadError) {
      console.error("LOAD PROPERTY DETAILS ERROR:", loadError);
      setError(loadError.message || "Unable to load this property.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  async function deleteProperty() {
    if (!property || !id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${getName(property)}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/properties/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      await readResponse(response);

      try {
        const saved = JSON.parse(
          localStorage.getItem("recentlyCreatedProperties") || "[]"
        );

        if (Array.isArray(saved)) {
          const remaining = saved.filter(
            (item) => getId(item) !== String(id)
          );

          localStorage.setItem(
            "recentlyCreatedProperties",
            JSON.stringify(remaining)
          );
        }
      } catch (storageError) {
        console.error("Could not update local property storage:", storageError);
      }

      router.push(ALL_PROPERTIES_PAGE);
      router.refresh();
    } catch (deleteError) {
      console.error("DELETE PROPERTY ERROR:", deleteError);
      setError(deleteError.message || "Could not delete this property.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">Loading property details...</p>
      </main>
    );
  }

  if (error && !property) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Unable to open property
          </h1>
          <p className="mt-3 text-sm text-red-700">{error}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadProperty}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              Try Again
            </button>

            <Link
              href={ALL_PROPERTIES_PAGE}
              className="rounded-xl border border-slate-200 px-5 py-3 font-semibold hover:bg-slate-100"
            >
              Back to All Properties
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const images = getImages(property);
  const verified =
    property?.is_verified === true ||
    property?.verified === true ||
    String(property?.verification_status || "").toLowerCase() === "verified" ||
    String(property?.status || "").toLowerCase() === "verified";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <Link
              href="/dashboard/merchant"
              className="text-2xl font-bold text-slate-900"
            >
              Home<span className="text-emerald-600">Find</span>
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              Merchant dashboard / Property details
            </p>
          </div>

          <Link
            href={ALL_PROPERTIES_PAGE}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
          >
            ← All Properties
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {property?.category || property?.property_use || "Property"}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {getName(property)}
            </h1>

            <p className="mt-2 text-slate-500">{getLocation(property)}</p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              verified
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {verified ? "Verified" : "Pending verification"}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-slate-200">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={getName(property)}
                  className="max-h-[480px] w-full object-cover"
                />
              ) : (
                <div className="p-12 text-center text-6xl text-slate-400">
                  ⌂
                  <p className="mt-3 text-sm">No property image available</p>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.slice(1).map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${getName(property)} ${index + 2}`}
                    className="h-28 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <p className="text-sm text-slate-500">Property price</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">
                {formatPrice(property?.price)}
              </p>
              {property?.payment_plan && (
                <p className="mt-1 text-sm text-slate-500">
                  Payment plan: {String(property.payment_plan).replaceAll("_", " ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Property type</p>
                <p className="mt-1 font-semibold">
                  {property?.type || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Category</p>
                <p className="mt-1 font-semibold">
                  {property?.category || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Bedrooms</p>
                <p className="mt-1 font-semibold">
                  {property?.bedroom ?? "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Bathrooms</p>
                <p className="mt-1 font-semibold">
                  {property?.bathroom ?? "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Toilets</p>
                <p className="mt-1 font-semibold">
                  {property?.toilet ?? "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Parking spaces</p>
                <p className="mt-1 font-semibold">
                  {property?.parking_space ?? "Not specified"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Agent who listed the property</p>
              <p className="mt-1 font-semibold">
                {agentName ||
                  (property?.agent_id || property?.agentId || property?.agent
                    ? "Agent name not provided by the API"
                    : "No agent assigned")}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Furnishing</p>
              <p className="mt-1 font-semibold">
                {property?.furnishing || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Total area</p>
              <p className="mt-1 font-semibold">
                {property?.total_area
                  ? `${property.total_area} ${property?.area_unit || ""}`
                  : "Not specified"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Property description
          </h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
            {property?.description || "No description has been added for this property."}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Location details
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            {getLocation(property)}
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pb-8">
          <Link
            href={`/dashboard/merchant/properties/${encodeURIComponent(id)}/edit`}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Edit Property
          </Link>

          <button
            type="button"
            onClick={deleteProperty}
            disabled={deleting}
            className="rounded-xl border border-red-200 px-6 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Property"}
          </button>

          <Link
            href={ALL_PROPERTIES_PAGE}
            className="rounded-xl border border-slate-200 px-6 py-3 font-semibold hover:bg-slate-100"
          >
            Back to All Properties
          </Link>
        </div>
      </div>
    </main>
  );
}


"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

function getAccount(value) {
  let account = value;

  for (let i = 0; i < 4 && account && typeof account === "object"; i++) {
    if (account.agent && typeof account.agent === "object") {
      account = account.agent;
    } else if (
      account.data &&
      typeof account.data === "object" &&
      !Array.isArray(account.data)
    ) {
      account = account.data;
    } else if (account.account && typeof account.account === "object") {
      account = account.account;
    } else if (account.user && typeof account.user === "object") {
      account = account.user;
    } else {
      break;
    }
  }

  return account || {};
}

function getList(result) {
  if (Array.isArray(result)) return result;

  const candidates = [
    result?.data,
    result?.results,
    result?.wishlist,
    result?.properties,
    result?.items,
    result?.data?.data,
    result?.data?.results,
    result?.data?.wishlist,
    result?.data?.properties,
    result?.data?.items,
  ];

  return candidates.find(Array.isArray) || [];
}

function getAgentId(account) {
  return (
    localStorage.getItem("agentId") ||
    account?.agent_id ||
    account?.agentId ||
    account?.id ||
    account?._id ||
    ""
  );
}

function getPropertyId(property) {
  return (
    property?.property_id ||
    property?.propertyId ||
    property?.property?.property_id ||
    property?.property?.id ||
    property?.property?._id ||
    property?.id ||
    property?._id ||
    ""
  );
}

function getPropertyDetails(item) {
  if (item?.property && typeof item.property === "object") {
    return item.property;
  }

  if (item?.property_details && typeof item.property_details === "object") {
    return item.property_details;
  }

  return item;
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

  return (
    property?.image_url ||
    property?.image ||
    property?.thumbnail ||
    ""
  );
}

function getPrice(property) {
  const price = property?.price ?? property?.amount;

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

export default function AgentWishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const savedAccount = localStorage.getItem("account");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (role && role !== "agent") {
        throw new Error("Please log in with an agent account.");
      }

      if (!savedAccount) {
        throw new Error(
          "Your saved account information is missing. Please log in again."
        );
      }

      let parsedAccount;

      try {
        parsedAccount = JSON.parse(savedAccount);
      } catch {
        throw new Error("Your saved account information is invalid.");
      }

      const account = getAccount(parsedAccount);
      const agentId = getAgentId(account);

      if (!agentId) {
        throw new Error(
          "Agent ID not found. Please log out and log in again."
        );
      }

      const response = await fetch(
        `${API}/agents/${encodeURIComponent(String(agentId))}/wishlist`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(result, response.status));
      }

      if (result?.success === false || result?.status === "error") {
        throw new Error(
          result?.msg || result?.message || "Unable to load wishlist."
        );
      }

      setWishlist(getList(result));
    } catch (err) {
      setError(err.message || "Unable to load wishlist.");
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const filteredWishlist = wishlist.filter((item) => {
    const property = getPropertyDetails(item);

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

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/agent"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Agent Dashboard
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Wishlist
            </h1>
            <p className="mt-2 text-gray-600">
              View properties saved to your agent wishlist.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWishlist}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Wishlist"}
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Saved properties</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "—" : wishlist.length}
          </p>
        </div>

        <div className="mt-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved properties..."
            className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-600"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p className="font-semibold">Unable to load wishlist</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">Loading your wishlist...</p>
          </div>
        ) : !error && filteredWishlist.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              No saved properties found
            </h2>
            <p className="mt-2 text-gray-500">
              {search
                ? "Try another search term."
                : "Your wishlist is empty, or the API returned no saved properties."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredWishlist.map((item, index) => {
              const property = getPropertyDetails(item);
              const id = getPropertyId(item);
              const image = getImage(property);

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
                    <h2 className="text-lg font-bold text-gray-900">
                      {property?.name ||
                        property?.title ||
                        "Untitled Property"}
                    </h2>

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

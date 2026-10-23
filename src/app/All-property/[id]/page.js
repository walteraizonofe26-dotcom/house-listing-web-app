
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";
const RECENT_PROPERTIES_KEY = "recentlyCreatedProperties";

function getPropertyId(property) {
  return String(
    property?._id ||
      property?.id ||
      property?.property_id ||
      property?.propertyId ||
      property?.data?._id ||
      property?.data?.id ||
      ""
  );
}

function getProperty(result) {
  const candidates = [
    result?.data?.property,
    result?.property,
    result?.data?.result,
    result?.data,
    result,
  ];

  for (const item of candidates) {
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      getPropertyId(item)
    ) {
      return item;
    }
  }

  return null;
}

function getImages(property) {
  const sources = [
    property?.images,
    property?.resources,
    property?.image_url,
    property?.imageUrl,
    property?.cover_image,
    property?.coverImage,
    property?.image,
    property?.data?.images,
  ];

  const images = [];

  for (const source of sources) {
    const list = Array.isArray(source) ? source : [source];

    for (const item of list) {
      const url =
        typeof item === "string"
          ? item
          : item?.url ||
            item?.image_url ||
            item?.imageUrl ||
            item?.src ||
            item?.path ||
            item?.resource_url;

      if (url && !images.includes(url)) {
        images.push(url);
      }
    }
  }

  return images;
}

function formatPrice(price) {
  if (price === undefined || price === null || price === "") {
    return "Contact us for price";
  }

  const amount = Number(price);

  return Number.isFinite(amount)
    ? `₦${amount.toLocaleString("en-NG")}`
    : String(price);
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }

  return String(value).replaceAll("_", " ");
}

function getAccountId(account) {
  const candidates = [
    account,
    account?.account,
    account?.user,
    account?.customer,
    account?.data,
    account?.data?.user,
    account?.data?.account,
    account?.data?.customer,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const id =
      item.user_id ||
      item.userId ||
      item.customer_id ||
      item.customerId ||
      item.id ||
      item._id;

    if (id) return String(id);
  }

  return "";
}

function getReviews(result) {
  if (Array.isArray(result)) return result;

  const candidates = [
    result?.reviews,
    result?.data?.reviews,
    result?.data?.data?.reviews,
    result?.results,
    result?.data?.results,
    result?.items,
    result?.data?.items,
    result?.data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }

  return [];
}

function getReviewId(review) {
  return String(
    review?.review_id ||
      review?.reviewId ||
      review?._id ||
      review?.id ||
      ""
  );
}

function getReviewUserId(review) {
  const candidates = [
    review,
    review?.user,
    review?.customer,
    review?.author,
    review?.created_by,
    review?.createdBy,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const id =
      item.user_id ||
      item.userId ||
      item.customer_id ||
      item.customerId ||
      item.id ||
      item._id;

    if (id) return String(id);
  }

  return "";
}

function getReviewText(review) {
  return (
    review?.text ||
    review?.review ||
    review?.comment ||
    review?.message ||
    ""
  );
}

function getReviewAuthor(review) {
  return (
    review?.user?.full_name ||
    review?.user?.name ||
    review?.customer?.full_name ||
    review?.customer?.name ||
    review?.author?.full_name ||
    review?.author?.name ||
    review?.full_name ||
    review?.name ||
    "HomeFind customer"
  );
}

function getReviewDate(review) {
  const value =
    review?.created_at ||
    review?.createdAt ||
    review?.date_created ||
    review?.dateCreated;

  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

async function readApiResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The server returned an unexpected response.");
  }

  if (
    !response.ok ||
    result?.type === "TOKEN_EXPIRED" ||
    result?.status === "BAD_REQUEST" ||
    result?.status === "ERROR" ||
    (Number(result?.code) >= 400 && result?.code !== "")
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

async function requestReviews(propertyId, token) {
  const query = new URLSearchParams({
    property_id: propertyId,
    limit: "10",
    page: "0",
  });

  const response = await fetch(
    `${API}/reviews?${query.toString()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const result = await readApiResponse(response);

  return getReviews(result);
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const routePropertyId = String(id || "");

  const [property, setProperty] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState("");
  const [editReviewText, setEditReviewText] = useState("");
  const [reviewActionId, setReviewActionId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // Load property details
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadProperty() {
      setLoading(true);
      setError("");

      let savedProperty = null;

      try {
        const saved = JSON.parse(
          localStorage.getItem(RECENT_PROPERTIES_KEY) || "[]"
        );

        if (Array.isArray(saved)) {
          savedProperty =
            saved.find(
              (item) => getPropertyId(item) === String(id)
            ) || null;
        }
      } catch {
        savedProperty = null;
      }

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API}/properties/${encodeURIComponent(id)}`,
          {
            headers: {
              Accept: "application/json",
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            cache: "no-store",
          }
        );

        const result = await readApiResponse(response);
        const apiProperty = getProperty(result);

        if (cancelled) return;

        if (apiProperty) {
          setProperty(apiProperty);
          setSelectedImage(getImages(apiProperty)[0] || "");
        } else if (savedProperty) {
          setProperty(savedProperty);
          setSelectedImage(getImages(savedProperty)[0] || "");
        } else {
          setError("The requested property could not be found.");
        }
      } catch (err) {
        if (cancelled) return;

        if (savedProperty) {
          setProperty(savedProperty);
          setSelectedImage(getImages(savedProperty)[0] || "");
        } else {
          setError(
            err.message ||
              "Unable to load this property. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load the signed-in account and reviews for this property
  useEffect(() => {
    if (!routePropertyId) return;

    let cancelled = false;

    async function loadReviews() {
      setReviewsLoading(true);
      setReviewsError("");

      try {
        let account = {};

        try {
          account = JSON.parse(
            localStorage.getItem("account") || "{}"
          );
        } catch {
          account = {};
        }

        const userId = getAccountId(account);
        const token = localStorage.getItem("token");

        if (!cancelled) {
          setCurrentUserId(userId);
        }

        if (!token) {
          throw new Error(
            "Please sign in to view reviews and submit your own."
          );
        }

        const list = await requestReviews(
          routePropertyId,
          token
        );

        if (!cancelled) {
          setReviews(list);
        }
      } catch (err) {
        if (!cancelled) {
          setReviewsError(
            err.message || "Could not load property reviews."
          );
        }
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [routePropertyId]);

  async function submitReview(event) {
    event.preventDefault();
    setReviewsError("");
    setReviewMessage("");

    const text = reviewText.trim();

    if (!text) {
      setReviewsError("Please write your review first.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setReviewsError(
        "Please sign in before submitting a review."
      );
      return;
    }

    let account = {};

    try {
      account = JSON.parse(
        localStorage.getItem("account") || "{}"
      );
    } catch {
      account = {};
    }

    const userId = getAccountId(account);

    if (!userId) {
      setReviewsError(
        "Your customer ID could not be found in your saved account. Please sign in again."
      );
      return;
    }

    setReviewSaving(true);

    try {
      const response = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: routePropertyId,
          user_id: userId,
          text,
        }),
      });

      await readApiResponse(response);

      setCurrentUserId(userId);
      setReviewText("");
      setReviewMessage(
        "Your review was submitted successfully."
      );

      const updatedReviews = await requestReviews(
        routePropertyId,
        token
      );

      setReviews(updatedReviews);
    } catch (err) {
      setReviewsError(
        err.message ||
          "Could not submit your review. Please try again."
      );
    } finally {
      setReviewSaving(false);
    }
  }

  async function updateReview(reviewId) {
    const text = editReviewText.trim();

    if (!text) {
      setReviewsError("Review text cannot be empty.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setReviewsError("Please sign in again.");
      return;
    }

    setReviewActionId(reviewId);
    setReviewsError("");
    setReviewMessage("");

    try {
      const response = await fetch(
        `${API}/reviews/${encodeURIComponent(reviewId)}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      await readApiResponse(response);

      // Reload from the API so the displayed list stays in sync.
      const updatedReviews = await requestReviews(
        routePropertyId,
        token
      );

      setReviews(updatedReviews);
      setEditingReviewId("");
      setEditReviewText("");
      setReviewMessage("Your review was updated.");
    } catch (err) {
      setReviewsError(
        err.message ||
          "Could not update this review. Please try again."
      );
    } finally {
      setReviewActionId("");
    }
  }

  async function deleteReview(reviewId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setReviewsError("Please sign in again.");
      return;
    }

    setReviewActionId(reviewId);
    setReviewsError("");
    setReviewMessage("");

    try {
      const response = await fetch(
        `${API}/reviews/${encodeURIComponent(reviewId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await readApiResponse(response);

      setReviews((previous) =>
        previous.filter(
          (review) => getReviewId(review) !== reviewId
        )
      );

      if (editingReviewId === reviewId) {
        setEditingReviewId("");
        setEditReviewText("");
      }

      setReviewMessage("Your review was deleted.");
    } catch (err) {
      setReviewsError(
        err.message ||
          "Could not delete this review. Please try again."
      );
    } finally {
      setReviewActionId("");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-lg font-semibold text-emerald-700">
          Loading property details...
        </p>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="text-6xl">🏡</div>

        <h1 className="mt-5 text-2xl font-bold text-gray-800">
          Property details unavailable
        </h1>

        <p className="mt-3 max-w-lg text-gray-600">
          {error || "We could not find this property."}
        </p>

        <Link
          href="/All-property"
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
        >
          Back to All Properties
        </Link>
      </main>
    );
  }

  const images = getImages(property);
  const name = property.name || property.title || "Property";

  const location = [
    property.address,
    property.city,
    property.state,
    property.country,
  ]
    .filter(Boolean)
    .join(", ");

  const propertyType = String(property.type || "PROPERTY")
    .replaceAll("_", " ")
    .toUpperCase();

  const propertyId = getPropertyId(property);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-2xl font-extrabold text-emerald-700"
          >
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <Link
            href="/All-property"
            className="rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            ← All Properties
          </Link>
        </nav>
      </header>

      <section className="bg-emerald-800 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-200">
            {propertyType}
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            {name}
          </h1>

          <p className="mt-3 text-emerald-100">
            📍 {location || "Location not provided"}
          </p>

          <p className="mt-5 text-3xl font-extrabold">
            {formatPrice(property.price)}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4 lg:col-span-2">
          {/* Property image gallery */}
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-gray-200 sm:min-h-[440px]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={name}
                className="h-full max-h-[560px] w-full object-cover"
              />
            ) : (
              <div className="py-20 text-center text-gray-500">
                <div className="text-7xl">🏡</div>
                <p className="mt-3">
                  No property image available
                </p>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`overflow-hidden rounded-xl border-2 ${
                    selectedImage === image
                      ? "border-emerald-700"
                      : "border-transparent"
                  }`}
                  aria-label={`View property image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${name} image ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Property description */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold">
              About This Property
            </h2>

            <p className="mt-4 whitespace-pre-line leading-8 text-gray-600">
              {property.description ||
                "No description has been provided for this property yet."}
            </p>
          </div>

          {/* Property information */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold">
              Property Information
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["Category", property.category],
                ["Bedrooms", property.bedroom],
                ["Bathrooms", property.bathroom],
                ["Toilets", property.toilet],
                ["Parking Spaces", property.parking_space],
                [
                  "Total Area",
                  property.total_area
                    ? `${property.total_area} sqm`
                    : "",
                ],
                ["Furnishing", property.furnishing],
                ["Payment Plan", property.payment_plan],
                ["Property Use", property.property_use],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-gray-50 p-4"
                >
                  <p className="text-sm text-gray-500">
                    {label}
                  </p>
                  <p className="mt-1 font-bold">
                    {formatValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Property location */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold">
              Location
            </h2>
            <p className="mt-3 leading-7 text-gray-600">
              {location ||
                "The property location has not been provided."}
            </p>
          </div>

          {/* Reviews */}
          <section
            id="property-reviews"
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-extrabold">
              Property Reviews
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Read feedback about this property or share your own experience.
            </p>

            {reviewsError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {reviewsError}

                {reviewsError.toLowerCase().includes("expired") ||
                reviewsError.toLowerCase().includes("token") ? (
                  <p className="mt-2">
                    Your session may have expired. Sign in again, then return to this property.
                  </p>
                ) : null}
              </div>
            )}

            {reviewMessage && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {reviewMessage}
              </p>
            )}

            <form onSubmit={submitReview} className="mt-6">
              <label
                htmlFor="new-review"
                className="mb-2 block font-semibold text-gray-800"
              >
                Write a review
              </label>

              <textarea
                id="new-review"
                value={reviewText}
                onChange={(event) =>
                  setReviewText(event.target.value)
                }
                placeholder="What do you think about this property?"
                rows={4}
                maxLength={2000}
                required
                className="w-full rounded-xl border border-gray-300 p-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  {reviewText.length}/2000 characters
                </span>

                <button
                  type="submit"
                  disabled={reviewSaving}
                  className="rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewSaving
                    ? "Submitting..."
                    : "Submit Review"}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold">
                  Customer Feedback
                </h3>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>

              {reviewsLoading && (
                <p className="mt-5 text-gray-500">
                  Loading reviews...
                </p>
              )}

              {!reviewsLoading &&
                !reviewsError &&
                reviews.length === 0 && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-6 text-center">
                    <p className="text-3xl">💬</p>
                    <p className="mt-3 font-semibold text-gray-800">
                      No reviews to display
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Be the first to share your experience with this property.
                    </p>
                  </div>
                )}

              <div className="mt-5 space-y-4">
                {reviews.map((review, index) => {
                  const reviewId = getReviewId(review);
                  const ownerId = getReviewUserId(review);
                  const isOwnReview =
                    Boolean(currentUserId) &&
                    Boolean(ownerId) &&
                    currentUserId === ownerId;

                  const isEditing =
                    Boolean(reviewId) &&
                    editingReviewId === reviewId;

                  const text =
                    getReviewText(review) ||
                    "No review text provided.";

                  return (
                    <article
                      key={reviewId || `review-${index}`}
                      className="rounded-xl border border-gray-200 p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-800">
                            {getReviewAuthor(review)}
                          </p>

                          {getReviewDate(review) && (
                            <p className="mt-1 text-xs text-gray-500">
                              {getReviewDate(review)}
                            </p>
                          )}
                        </div>

                        {isOwnReview && reviewId && (
                          <div className="flex flex-wrap gap-3 text-sm font-semibold">
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReviewId(reviewId);
                                  setEditReviewText(text);
                                  setReviewsError("");
                                  setReviewMessage("");
                                }}
                                className="text-emerald-700 hover:underline"
                              >
                                Edit
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={reviewActionId === reviewId}
                              onClick={() => deleteReview(reviewId)}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              {reviewActionId === reviewId
                                ? "Please wait..."
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-4">
                          <label
                            htmlFor={`edit-review-${reviewId}`}
                            className="mb-2 block text-sm font-semibold"
                          >
                            Edit your review
                          </label>

                          <textarea
                            id={`edit-review-${reviewId}`}
                            value={editReviewText}
                            onChange={(event) =>
                              setEditReviewText(event.target.value)
                            }
                            rows={4}
                            maxLength={2000}
                            required
                            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                          />

                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={reviewActionId === reviewId}
                              onClick={() => updateReview(reviewId)}
                              className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {reviewActionId === reviewId
                                ? "Saving..."
                                : "Save Changes"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingReviewId("");
                                setEditReviewText("");
                                setReviewsError("");
                              }}
                              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
                          {text}
                        </p>
                      )}

                      {!isOwnReview &&
                        currentUserId &&
                        ownerId &&
                        currentUserId !== ownerId && (
                          <p className="mt-3 text-xs text-gray-400">
                            Review by another customer
                          </p>
                        )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Selected property sidebar */}
        <aside className="h-fit rounded-2xl border bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-gray-500">
            YOUR SELECTED PROPERTY
          </p>

          <h2 className="mt-3 text-2xl font-extrabold">
            {name}
          </h2>

          <p className="mt-3 text-2xl font-extrabold text-emerald-700">
            {formatPrice(property.price)}
          </p>

          <div className="my-6 space-y-3 border-y py-5 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-800">
                Type:
              </span>{" "}
              {propertyType}
            </p>

            <p>
              <span className="font-semibold text-gray-800">
                Category:
              </span>{" "}
              {formatValue(property.category)}
            </p>

            <p>
              <span className="font-semibold text-gray-800">
                Location:
              </span>{" "}
              {location || "Not provided"}
            </p>
          </div>

          <Link
            href={
              propertyId
                ? `/my-appointments?propertyId=${encodeURIComponent(propertyId)}`
                : "/my-appointments"
            }
            className="block w-full rounded-lg bg-emerald-700 px-5 py-3 text-center font-bold text-white hover:bg-emerald-800"
          >
            Choose This Property
          </Link>

          <Link
            href="/All-property"
            className="mt-3 block w-full rounded-lg border border-gray-300 px-5 py-3 text-center font-semibold hover:bg-gray-50"
          >
            Explore Other Properties
          </Link>

          <p className="mt-4 text-center text-xs leading-5 text-gray-500">
            Interested in this property? Continue to view available agents and enquire about arranging a viewing.
          </p>
        </aside>
      </section>

      <footer className="bg-gray-950 px-4 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} HomeFind. All rights reserved.
      </footer>
    </main>
  );
}

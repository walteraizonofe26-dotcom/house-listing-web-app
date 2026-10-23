"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";
const PROPERTY_PAGE = "/All-property";
const APPOINTMENTS_PAGE = "/my-appointments";

function getSavedAccount() {
  if (typeof window === "undefined") return {};

  try {
    const saved = JSON.parse(localStorage.getItem("account") || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function getUserId(account) {
  const candidates = [
    account?.user_id,
    account?.userId,
    account?.id,
    account?._id,
    account?.user?.user_id,
    account?.user?.userId,
    account?.user?.id,
    account?.user?._id,
    account?.account?.user_id,
    account?.account?.userId,
    account?.account?.id,
    account?.account?._id,
    account?.data?.user_id,
    account?.data?.userId,
    account?.data?.id,
    account?.data?._id,
    account?.data?.user?.id,
    account?.data?.user?._id,
  ];

  const id = candidates.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );

  return id ? String(id) : "";
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function readApiResponse(response) {
  const text = await response.text();
  let result = {};

  if (text.trim()) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `The server returned an unexpected response (HTTP ${response.status}).`
      );
    }
  }

  const message = [
    result?.msg,
    result?.message,
    result?.error,
    result?.data?.message,
  ]
    .filter(Boolean)
    .join(" ");

  const lowerMessage = message.toLowerCase();

  if (
    response.status === 401 ||
    response.status === 419 ||
    result?.type === "TOKEN_EXPIRED" ||
    lowerMessage.includes("token supplied has expired") ||
    lowerMessage.includes("token has expired") ||
    lowerMessage.includes("jwt expired")
  ) {
    throw new Error(
      "Your login token has expired. Please log in again and submit your appointment request."
    );
  }

  const code = Number(result?.code);

  if (
    !response.ok ||
    result?.status === "BAD_REQUEST" ||
    result?.type === "BAD_REQUEST" ||
    (Number.isFinite(code) && code >= 400)
  ) {
    throw new Error(
      message || `The appointment request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

function ContactPageContent() {
  const searchParams = useSearchParams();

  const propertyId =
    searchParams.get("propertyId") ||
    searchParams.get("property_id") ||
    "";

  const propertyName =
    searchParams.get("propertyName") ||
    searchParams.get("name") ||
    "Property viewing";

  const [today, setToday] = useState("");
  const [userId, setUserId] = useState("");
  const [formData, setFormData] = useState({
    date: "",
    from: "",
    to: "",
    msg: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const refreshAccount = useCallback(() => {
    setUserId(getUserId(getSavedAccount()));
  }, []);

  useEffect(() => {
    setToday(getToday());
    refreshAccount();
  }, [refreshAccount]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess(false);

    const token = localStorage.getItem("token") || "";
    const account = getSavedAccount();
    const currentUserId = getUserId(account);

    setUserId(currentUserId);

    if (!token) {
      setError(
        "Your login token was not found. Please log in to your customer account and try again."
      );
      return;
    }

    if (!currentUserId) {
      setError(
        "Your customer ID could not be found. Please log in again and make sure your customer account details are saved."
      );
      return;
    }

    if (!propertyId) {
      setError(
        "The property ID is missing. Return to the property details page and click the booking button again."
      );
      return;
    }

    if (!formData.date) {
      setError("Please select your preferred viewing date.");
      return;
    }

    if (today && formData.date < today) {
      setError("Please choose today or a future date.");
      return;
    }

    if (!formData.from || !formData.to) {
      setError("Please select both a start time and an end time.");
      return;
    }

    if (formData.to <= formData.from) {
      setError("The end time must be later than the start time.");
      return;
    }

    if (formData.msg.trim().length < 3) {
      setError("Please enter a message of at least 3 characters.");
      return;
    }

    const payload = {
      property_id: propertyId,
      user_id: currentUserId,
      date: formData.date,
      msg: formData.msg.trim(),
      time: {
        from: formData.from,
        to: formData.to,
      },
    };

    setLoading(true);

    try {
      const response = await fetch(`${API}/appointments`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await readApiResponse(response);

      console.log("APPOINTMENT API STATUS:", response.status);
      console.log("APPOINTMENT API RESPONSE:", result);

      setSuccess(true);
      setFormData({
        date: "",
        from: "",
        to: "",
        msg: "",
      });
    } catch (err) {
      console.error("BOOK APPOINTMENT ERROR:", err);

      if (
        err instanceof TypeError &&
        /fetch/i.test(err.message)
      ) {
        setError(
          "Could not connect to the appointment server. Check your internet connection, API availability, and browser console."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while submitting your appointment. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <Link
            href="/"
            className="text-2xl font-extrabold text-emerald-700"
          >
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <Link
            href={PROPERTY_PAGE}
            className="font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Properties
          </Link>
        </nav>
      </header>

      <section className="bg-emerald-800 px-4 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="font-semibold uppercase tracking-widest text-emerald-200">
            Schedule a property viewing
          </p>

          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
            Book an Appointment
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-emerald-50">
            Choose a convenient date and time to request an appointment
            with the agent responsible for this property.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-5">
        <aside className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Property you selected
            </p>

            <h2 className="mt-3 break-words text-2xl font-extrabold">
              {propertyName}
            </h2>

            {propertyId ? (
              <p className="mt-3 break-all text-sm text-gray-500">
                Property ID: {propertyId}
              </p>
            ) : (
              <p className="mt-3 text-sm text-red-600">
                No property was selected. Please choose a property first.
              </p>
            )}

            <Link
              href={PROPERTY_PAGE}
              className="mt-5 inline-block font-semibold text-emerald-700 hover:underline"
            >
              Browse other properties →
            </Link>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">What happens next?</h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <li>1. Submit your preferred viewing date and time.</li>
              <li>2. Your appointment request is sent to the API.</li>
              <li>
                3. The responsible agent and merchant can review the request
                if the backend associates it with their accounts.
              </li>
              <li>4. The agent can follow up to confirm the viewing.</li>
            </ul>
          </div>
        </aside>

        <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8 lg:col-span-3">
          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
                ✓
              </div>

              <h2 className="mt-5 text-2xl font-extrabold text-emerald-700">
                Appointment Request Submitted!
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                The API accepted your appointment request. The agent may
                still need to confirm your viewing.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={APPOINTMENTS_PAGE}
                  className="rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
                >
                  My Appointments
                </Link>

                <Link
                  href={PROPERTY_PAGE}
                  className="rounded-lg border px-5 py-3 font-bold hover:bg-gray-50"
                >
                  Browse Properties
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-5 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Book another appointment
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold">
                Request a Property Viewing
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Complete the form to request an appointment with the agent.
              </p>

              {!userId && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Your customer ID has not been detected yet. Please log
                  in to your customer account and try again.{" "}
                  <Link
                    href="/login"
                    className="font-bold underline"
                  >
                    Log in here
                  </Link>
                  .
                </div>
              )}

              {!propertyId && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  The property ID is missing. Please select a property
                  from the properties page and open its booking form.
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Preferred Viewing Date *
                  </label>

                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    min={today || undefined}
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="from"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Start Time *
                    </label>

                    <input
                      id="from"
                      name="from"
                      type="time"
                      required
                      value={formData.from}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="to"
                      className="mb-2 block text-sm font-semibold"
                    >
                      End Time *
                    </label>

                    <input
                      id="to"
                      name="to"
                      type="time"
                      required
                      value={formData.to}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="msg"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Message to the Agent *
                  </label>

                  <textarea
                    id="msg"
                    name="msg"
                    required
                    minLength={3}
                    rows={5}
                    value={formData.msg}
                    onChange={handleChange}
                    placeholder="Hello, I would like to arrange a viewing of this property. Please let me know if this time is convenient."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !propertyId}
                  className="w-full rounded-lg bg-emerald-700 px-6 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Submitting Request..."
                    : "Book Viewing Appointment"}
                </button>

                <p className="text-xs leading-5 text-gray-500">
                  Your appointment is a request, not a confirmed viewing.
                  The agent may need to confirm the date and time.
                </p>
              </form>
            </>
          )}
        </section>
      </section>

      <footer className="bg-gray-950 px-4 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} HomeFind. All rights reserved.
      </footer>
    </main>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
          Loading appointment form...
        </main>
      }
    >
      <ContactPageContent />
    </Suspense>
  );
}
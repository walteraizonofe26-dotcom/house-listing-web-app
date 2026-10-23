
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";

function getList(result) {
  if (Array.isArray(result)) return result;

  const possibleLists = [
    result?.data,
    result?.data?.properties,
    result?.data?.results,
    result?.data?.items,
    result?.results,
    result?.properties,
    result?.items,
  ];

  for (const item of possibleLists) {
    if (Array.isArray(item)) return item;
    if (Array.isArray(item?.data)) return item.data;
    if (Array.isArray(item?.properties)) return item.properties;
    if (Array.isArray(item?.results)) return item.results;
  }

  return [];
}

function getId(item) {
  return (
    item?.property_id ??
    item?.propertyId ??
    item?.id ??
    item?._id ??
    item?.property?.property_id ??
    item?.property?.propertyId ??
    item?.property?.id ??
    item?.property?._id ??
    ""
  );
}

function getLocalProperties() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("recentlyCreatedProperties") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function mergeProperties(apiProperties, localProperties) {
  const combined = [...localProperties, ...apiProperties];

  return Array.from(
    new Map(
      combined
        .filter((property) => getId(property))
        .map((property) => [
          String(getId(property)),
          property,
        ])
    ).values()
  );
}

function getUserId(account) {
  return (
    account?.user_id ??
    account?.userId ??
    account?.id ??
    account?._id ??
    account?.user?.user_id ??
    account?.user?.id ??
    ""
  );
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    property_id: "",
    date: "",
    from: "10:00",
    to: "11:00",
    meeting_type: "physical",
    message: "",
  });

  useEffect(() => {
    let active = true;

    async function loadPageData() {
      setLoadingProperties(true);
      setError("");

      try {
        const savedAccount =
          localStorage.getItem("account") ||
          localStorage.getItem("user");

        let account = {};

        try {
          account = savedAccount
            ? JSON.parse(savedAccount)
            : {};
        } catch {
          account = {};
        }

        const user =
          account?.user ||
          account?.data?.user ||
          account;

        setForm((previous) => ({
          ...previous,
          full_name:
            user?.full_name ||
            user?.name ||
            user?.first_name ||
            "",
          email: user?.email || "",
          phone:
            user?.phone_number ||
            user?.phone ||
            "",
          property_id:
            searchParams.get("property_id") ||
            previous.property_id,
        }));

        // Read locally saved properties first.
        const localProperties = getLocalProperties();
        const token = localStorage.getItem("token");

        // Request the properties API with the current login token.
        const response = await fetch(
          `${API}/properties?offset=0&limit=100`,
          {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
            cache: "no-store",
          }
        );

        const result = await response.json().catch(() => ({}));

        console.log(
          "BOOKING PROPERTY RESPONSE:",
          result
        );

        // Handle expired authentication explicitly.
        const tokenExpired =
          response.status === 401 ||
          response.status === 419 ||
          result?.type === "TOKEN_EXPIRED" ||
          Number(result?.code) === 419;

        if (tokenExpired) {
          if (active) {
            setProperties(
              mergeProperties([], localProperties)
            );

            setError(
              "Your login session has expired. Please log in again before booking."
            );
          }

          localStorage.removeItem("token");
          return;
        }

        if (
          !response.ok ||
          result?.type === "BAD_REQUEST" ||
          result?.type === "INVALID_CREDENTIAL"
        ) {
          throw new Error(
            result?.msg ||
              result?.message ||
              "Unable to load properties. Please try again."
          );
        }

        // Combine API properties and locally saved properties.
        const apiProperties = getList(result);

        const combinedProperties = mergeProperties(
          apiProperties,
          localProperties
        );

        if (active) {
          setProperties(combinedProperties);

          if (combinedProperties.length === 0) {
            setError(
              "No properties were found. Please check that properties have been saved and are available from the properties API."
            );
          }
        }
      } catch (err) {
        if (active) {
          const localProperties = getLocalProperties();

          setProperties(
            mergeProperties([], localProperties)
          );

          setError(
            err.message ||
              "Unable to load the booking page."
          );
        }
      } finally {
        if (active) {
          setLoadingProperties(false);
        }
      }
    }

    loadPageData();

    return () => {
      active = false;
    };
  }, [searchParams, router]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    const savedAccount =
      localStorage.getItem("account") ||
      localStorage.getItem("user");

    if (!token || !savedAccount) {
      router.push("/login");
      return;
    }

    let account;

    try {
      account = JSON.parse(savedAccount);
    } catch {
      setError(
        "Your saved login information is invalid. Please log in again."
      );
      return;
    }

    const user =
      account?.user ||
      account?.data?.user ||
      account;

    const userId = getUserId(user);

    if (!userId) {
      setError(
        "Your user ID could not be found. Please log in again with your customer account."
      );
      return;
    }

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      setError(
        "Please enter your name, email address and phone number."
      );
      return;
    }

    if (!form.property_id) {
      setError(
        "Please select the property you want to discuss."
      );
      return;
    }

    if (!form.date || !form.from || !form.to) {
      setError(
        "Please choose an appointment date and time."
      );
      return;
    }

    const today = new Date();
    const localToday = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    if (form.date < localToday) {
      setError(
        "Please select today or a future date."
      );
      return;
    }

    if (form.to <= form.from) {
      setError(
        "The ending time must be later than the starting time."
      );
      return;
    }

    const contactDetails = [
      `Customer: ${form.full_name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Meeting type: ${form.meeting_type}`,
      form.message.trim()
        ? `Message: ${form.message.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      property_id: form.property_id,
      user_id: userId,
      date: form.date,
      msg: contactDetails,
      time: {
        from: form.from,
        to: form.to,
      },
    };

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API}/appointments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 401 ||
        response.status === 419 ||
        result?.type === "TOKEN_EXPIRED" ||
        Number(result?.code) === 419
      ) {
        localStorage.removeItem("token");

        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      if (
        !response.ok ||
        result?.type === "BAD_REQUEST"
      ) {
        throw new Error(
          result?.msg ||
            result?.message ||
            "The appointment could not be booked."
        );
      }

      setSuccess(
        "Your appointment request has been submitted successfully!"
      );

      setForm((previous) => ({
        ...previous,
        date: "",
        from: "10:00",
        to: "11:00",
        message: "",
      }));
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while booking your appointment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-2xl font-extrabold text-emerald-700"
          >
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/All-property"
              className="hidden font-medium hover:text-emerald-700 sm:block"
            >
              Properties
            </Link>

            <Link
              href="/my-appointments"
              className="rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              My Appointments
            </Link>
          </div>
        </nav>
      </header>

      <section className="bg-emerald-800 px-4 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-bold uppercase tracking-widest text-emerald-200">
            Let's help you find your property
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
            Book an Appointment
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-emerald-50">
            Schedule a meeting with our property team to
            discuss a property, arrange a viewing or get
            answers to your questions.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg sm:p-9">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold">
              Appointment Details
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Fill in your details below. Fields marked with *
              are required. Please log in with your customer
              account before booking.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{error}</p>

              {(error.toLowerCase().includes("login") ||
                error.toLowerCase().includes("session has expired")) && (
                <Link
                  href="/login"
                  className="mt-2 inline-block font-bold underline"
                >
                  Log in again
                </Link>
              )}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
            >
              <p className="font-bold">{success}</p>

              <p className="mt-1 text-sm">
                You can check the progress of your request
                on your My Appointments page.
              </p>

              <Link
                href="/my-appointments"
                className="mt-3 inline-block font-bold underline"
              >
                View My Appointments →
              </Link>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-7"
          >
            <div>
              <h3 className="mb-4 border-b pb-3 text-lg font-bold">
                1. Your Information
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="full_name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Full Name *
                  </label>

                  <input
                    id="full_name"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email Address *
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Phone Number *
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    autoComplete="tel"
                    placeholder="e.g. 08012345678"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 border-b pb-3 text-lg font-bold">
                2. Property Information
              </h3>

              <div>
                <label
                  htmlFor="property_id"
                  className="mb-2 block text-sm font-semibold"
                >
                  Select Property *
                </label>

                <select
                  id="property_id"
                  name="property_id"
                  value={form.property_id}
                  onChange={handleChange}
                  required
                  disabled={loadingProperties}
                  className={`${inputClass} disabled:bg-gray-100`}
                >
                  <option value="">
                    {loadingProperties
                      ? "Loading properties..."
                      : "Choose a property"}
                  </option>

                  {properties.map((property, index) => {
                    const id = getId(property);

                    if (!id) return null;

                    return (
                      <option
                        key={String(id) || index}
                        value={String(id)}
                      >
                        {property.name ||
                          property.title ||
                          property.address ||
                          `Property ${id}`}
                        {property.city
                          ? ` — ${property.city}`
                          : ""}
                      </option>
                    );
                  })}
                </select>

                {!loadingProperties &&
                  properties.length === 0 && (
                    <p className="mt-2 text-sm text-orange-700">
                      No selectable properties are available.
                      Check that your properties have been saved
                      and are returned by the API.
                    </p>
                  )}

                <p className="mt-2 text-xs text-gray-500">
                  Select the property you want to discuss with
                  an agent.
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 border-b pb-3 text-lg font-bold">
                3. Meeting Schedule
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Appointment Date *
                  </label>

                  <input
                    id="date"
                    name="date"
                    type="date"
                    min={(() => {
                      const today = new Date();
                      return [
                        today.getFullYear(),
                        String(today.getMonth() + 1).padStart(2, "0"),
                        String(today.getDate()).padStart(2, "0"),
                      ].join("-");
                    })()}
                    value={form.date}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="meeting_type"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Meeting Type *
                  </label>

                  <select
                    id="meeting_type"
                    name="meeting_type"
                    value={form.meeting_type}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="physical">
                      Physical property viewing
                    </option>
                    <option value="virtual">
                      Virtual meeting
                    </option>
                    <option value="office">
                      Meet at agent's office
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="from"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Starting Time *
                  </label>

                  <input
                    id="from"
                    name="from"
                    type="time"
                    value={form.from}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="to"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Ending Time *
                  </label>

                  <input
                    id="to"
                    name="to"
                    type="time"
                    value={form.to}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 border-b pb-3 text-lg font-bold">
                4. Additional Information
              </h3>

              <label
                htmlFor="message"
                className="mb-2 block text-sm font-semibold"
              >
                Message to the Agent
              </label>

              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={4}
                placeholder="Tell the agent what you would like to discuss..."
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingProperties ||
                properties.length === 0
              }
              className="w-full rounded-lg bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting Appointment..."
                : "Book Appointment"}
            </button>

            <p className="text-center text-xs leading-5 text-gray-500">
              Submitting a request does not mean the meeting
              is already confirmed. Check My Appointments for
              updates.
            </p>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Home
          </Link>
        </div>
      </section>

      <footer className="bg-gray-950 px-4 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} HomeFind. All rights reserved.
      </footer>
    </main>
  );
}

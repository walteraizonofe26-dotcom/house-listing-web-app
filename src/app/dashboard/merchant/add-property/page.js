
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";

const PROPERTIES_PAGE = "/dashboard/merchant/properties";
const DASHBOARD_PAGE = "/dashboard/merchant";

const initialForm = {
  name: "",
  price: "",
  country: "Nigeria",
  state: "",
  city: "",
  address: "",
  description: "",
  category: "FLAT",
  property_use: "RESIDENTIAL",
  payment_plan: "PER_ANNUM",
  type: "RENT",
  total_area: "",
  bedroom: "1",
  bathroom: "1",
  toilet: "1",
  parking_space: "0",
  furnishing: "UNFURNISHED",
  agent: "",
};

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "The server returned an invalid response. Please check the API URL."
    );
  }

  if (
    !response.ok ||
    result?.status === "BAD_REQUEST" ||
    result?.type === "BAD_REQUEST" ||
    Number(result?.code) >= 400
  ) {
    throw new Error(
      result?.msg ||
        result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
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
    property?.data?.propertyId ||
    property?.property?._id ||
    property?.property?.id ||
    ""
  );
}

function getResponseProperty(result) {
  return (
    result?.data?.property ||
    result?.property ||
    result?.data ||
    result ||
    {}
  );
}

function getRecentlyCreatedProperties() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("recentlyCreatedProperties") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getList(result) {
  const candidates = [
    result,
    result?.data,
    result?.data?.agents,
    result?.agents,
    result?.results,
    result?.items,
  ];

  return candidates.find(Array.isArray) || [];
}

function getAccountDetails(account) {
  const user =
    account?.merchant ||
    account?.agent ||
    account?.user ||
    account?.account ||
    account;

  const roleText = String(
    user?.role ||
      user?.type ||
      account?.role ||
      account?.type ||
      ""
  ).toLowerCase();

  const isMerchant =
    roleText.includes("merchant") ||
    Boolean(account?.merchant) ||
    Boolean(user?.merchant_id) ||
    Boolean(user?.merchantId);

  return { user, isMerchant };
}

export default function AddPropertyPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [agents, setAgents] = useState([]);
  const [role, setRole] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const token = localStorage.getItem("token");
        const saved = localStorage.getItem("account");

        if (!token || !saved) {
          router.replace("/login");
          return;
        }

        let account;

        try {
          account = JSON.parse(saved);
        } catch {
          throw new Error(
            "Your saved account information is invalid. Please log in again."
          );
        }

        const { user, isMerchant } = getAccountDetails(account);

        if (!active) return;

        setRole(isMerchant ? "merchant" : "agent");

        if (!isMerchant) {
          setError(
            "This page is for merchant accounts. Please use the correct dashboard for your account."
          );
          return;
        }

        setLoadingAgents(true);

        const response = await fetch(
          `${API}/merchants/agents?offset=0&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const result = await readResponse(response);

        if (active) {
          setAgents(getList(result));
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Could not load your account or available agents."
          );
        }
      } finally {
        if (active) {
          setLoadingAgents(false);
          setLoadingAccount(false);
        }
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));

    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function handleImages(event) {
    const selected = Array.from(event.target.files || []);

    setError("");
    setMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      selected.some((file) => !allowedTypes.includes(file.type))
    ) {
      setError("Please select JPG, PNG, or WEBP images only.");
      event.target.value = "";
      return;
    }

    if (
      selected.some((file) => file.size > 5 * 1024 * 1024)
    ) {
      setError("Each image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (selected.length + images.length > 10) {
      setError("You can select a maximum of 10 images.");
      event.target.value = "";
      return;
    }

    setImages((previous) => [...previous, ...selected]);
    event.target.value = "";
  }

  function removeImage(index) {
    setImages((previous) =>
      previous.filter((_, imageIndex) => imageIndex !== index)
    );

    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (saving) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (loadingAccount) {
      setError("Please wait while your account is being checked.");
      return;
    }

    if (role !== "merchant") {
      setError("Only a merchant can add a property from this page.");
      return;
    }

    if (!form.name.trim()) {
      setError("Please enter the property name.");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError("Please enter a valid property price.");
      return;
    }

    if (
      !form.state.trim() ||
      !form.city.trim() ||
      !form.address.trim()
    ) {
      setError("Please complete the state, city, and address fields.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a property description.");
      return;
    }

    if (images.length === 0) {
      setError("Please select at least one property image.");
      return;
    }

    if (!form.agent) {
      setError("Please select an agent for this property.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        total_area: form.total_area
          ? Number(form.total_area)
          : 0,
        bedroom: Number(form.bedroom),
        bathroom: Number(form.bathroom),
        toilet: Number(form.toilet),
        parking_space: Number(form.parking_space),
      };

      // Step 1: Create the property.
      const response = await fetch(`${API}/properties`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await readResponse(response);
      const property = getResponseProperty(result);
      const propertyId = getPropertyId(property);

      if (!propertyId) {
        throw new Error(
          "The API did not return a property ID. Check your properties before trying again to avoid creating a duplicate."
        );
      }

      // Step 2: Upload the selected images.
      const imageData = new FormData();

      images.forEach((image) => {
        imageData.append("images", image);
      });

      const imageResponse = await fetch(
        `${API}/properties/${encodeURIComponent(propertyId)}/resource`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: imageData,
        }
      );

      const imageResult = await readResponse(imageResponse);

      const uploadData =
        imageResult?.data?.property ||
        imageResult?.data ||
        imageResult?.property ||
        {};

      const uploadedDetails =
        uploadData &&
        typeof uploadData === "object" &&
        !Array.isArray(uploadData)
          ? uploadData
          : {};

      // Step 3: Save a local copy for the properties page.
      const savedProperty = {
        ...payload,
        ...(property &&
        typeof property === "object" &&
        !Array.isArray(property)
          ? property
          : {}),
        ...uploadedDetails,
        id: propertyId,
        _id: propertyId,
      };

      try {
        const previousProperties = getRecentlyCreatedProperties();

        const updatedProperties = [
          savedProperty,
          ...previousProperties.filter(
            (item) =>
              String(
                item?.id ||
                  item?._id ||
                  item?.property_id ||
                  item?.propertyId
              ) !== String(propertyId)
          ),
        ];

        localStorage.setItem(
          "recentlyCreatedProperties",
          JSON.stringify(updatedProperties)
        );
      } catch {
        console.warn(
          "The property was saved, but browser storage could not be updated."
        );
      }

      setMessage(
        "Property and images saved successfully. Opening your properties..."
      );

      // Step 4: Navigate to the correct merchant properties page.
      router.push(PROPERTIES_PAGE);
      router.refresh();
    } catch (err) {
      setError(
        err.message ||
          "Unable to save the property. Please check your information and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  const labelClass = "block text-sm font-semibold text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="text-2xl font-extrabold text-emerald-700"
          >
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <Link
            href={DASHBOARD_PAGE}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 sm:text-base"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8">
          <p className="font-bold uppercase tracking-widest text-emerald-700">
            Property management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Add a New Property
          </h1>

          <p className="mt-3 leading-7 text-gray-600">
            Enter the property details and upload clear images so
            potential customers can see what you are listing.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p className="font-bold">Unable to continue</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <section>
            <h2 className="text-xl font-bold">Basic Information</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>
                  Property Name *
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Modern 3-bedroom apartment"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className={labelClass}>
                  Price (₦) *
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="e.g. 2500000"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className={labelClass}>
                  Listing Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="RENT">For Rent</option>
                  <option value="LEASE">For Lease</option>
                  <option value="SALES">For Sale</option>
                </select>
              </div>

              <div>
                <label htmlFor="category" className={labelClass}>
                  Property Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="FLAT">Flat</option>
                  <option value="APPARTMENT">Apartment</option>
                  <option value="DUPLEX">Duplex</option>
                  <option value="LAND">Land</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="SHOP">Shop</option>
                </select>
              </div>

              <div>
                <label htmlFor="property_use" className={labelClass}>
                  Property Use
                </label>
                <select
                  id="property_use"
                  name="property_use"
                  value={form.property_use}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="INDUSTRIAL">Industrial</option>
                </select>
              </div>

              <div>
                <label htmlFor="payment_plan" className={labelClass}>
                  Payment Plan
                </label>
                <select
                  id="payment_plan"
                  name="payment_plan"
                  value={form.payment_plan}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="PER_ANNUM">Per Annum</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="PER_PLOT">Per Plot</option>
                  <option value="PER_DAY">Per Day</option>
                </select>
              </div>
            </div>
          </section>

          <section className="border-t pt-7">
            <h2 className="text-xl font-bold">Location</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="state" className={labelClass}>
                  State *
                </label>
                <input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="e.g. FCT"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="address" className={labelClass}>
                  Street Address *
                </label>
                <input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </section>

          <section className="border-t pt-7">
            <h2 className="text-xl font-bold">Property Features</h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="bedroom" className={labelClass}>
                  Bedrooms
                </label>
                <input
                  id="bedroom"
                  name="bedroom"
                  type="number"
                  min="0"
                  value={form.bedroom}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bathroom" className={labelClass}>
                  Bathrooms
                </label>
                <input
                  id="bathroom"
                  name="bathroom"
                  type="number"
                  min="0"
                  value={form.bathroom}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="toilet" className={labelClass}>
                  Toilets
                </label>
                <input
                  id="toilet"
                  name="toilet"
                  type="number"
                  min="0"
                  value={form.toilet}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="parking_space" className={labelClass}>
                  Parking Spaces
                </label>
                <input
                  id="parking_space"
                  name="parking_space"
                  type="number"
                  min="0"
                  value={form.parking_space}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="total_area" className={labelClass}>
                  Total Area (sqm)
                </label>
                <input
                  id="total_area"
                  name="total_area"
                  type="number"
                  min="0"
                  value={form.total_area}
                  onChange={handleChange}
                  placeholder="e.g. 150"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="furnishing" className={labelClass}>
                  Furnishing
                </label>
                <select
                  id="furnishing"
                  name="furnishing"
                  value={form.furnishing}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="UNFURNISHED">Unfurnished</option>
                  <option value="FURNISHED">Furnished</option>
                  <option value="SEMI_FURNISHED">Semi-furnished</option>
                </select>
              </div>

              {role === "merchant" && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="agent" className={labelClass}>
                    Assign Agent *
                  </label>

                  <select
                    id="agent"
                    name="agent"
                    value={form.agent}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    disabled={loadingAgents || loadingAccount}
                  >
                    <option value="">
                      {loadingAgents
                        ? "Loading agents..."
                        : "Select an agent"}
                    </option>

                    {agents.map((agent, index) => {
                      const id =
                        agent?._id ||
                        agent?.id ||
                        agent?.agent_id ||
                        agent?.agentId ||
                        "";

                      const name =
                        agent?.full_name ||
                        agent?.name ||
                        agent?.email ||
                        `Agent ${index + 1}`;

                      return id ? (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ) : null;
                    })}
                  </select>

                  {!loadingAgents &&
                    !loadingAccount &&
                    agents.length === 0 && (
                      <p className="mt-2 text-sm text-amber-700">
                        No agents were returned. Check that your
                        merchant account has agents assigned.
                      </p>
                    )}
                </div>
              )}
            </div>
          </section>

          <section className="border-t pt-7">
            <h2 className="text-xl font-bold">Description</h2>

            <label htmlFor="description" className={labelClass}>
              Describe the Property *
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Describe the property, its facilities and nearby amenities..."
              className={inputClass}
              required
            />
          </section>

          <section className="border-t pt-7">
            <h2 className="text-xl font-bold">Property Images</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Choose up to 10 images. JPG, PNG and WEBP are accepted,
              with a maximum size of 5 MB per image.
            </p>

            <label
              htmlFor="images"
              className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-10 text-center transition hover:bg-emerald-100"
            >
              <span className="text-4xl">📷</span>
              <span className="mt-3 font-bold text-emerald-800">
                Click to select property images
              </span>
              <span className="mt-1 text-sm text-gray-600">
                You can select multiple images
              </span>

              <input
                id="images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImages}
                className="sr-only"
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {previews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative overflow-hidden rounded-xl border"
                  >
                    <img
                      src={src}
                      alt={`Property preview ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-700"
                    >
                      Remove
                    </button>

                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1 text-center text-xs font-semibold text-white">
                        First image
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 text-sm text-gray-500">
              {images.length} of 10 images selected
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Link
              href={PROPERTIES_PAGE}
              className="rounded-xl border border-gray-300 px-6 py-3 text-center font-bold hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || loadingAccount || loadingAgents}
              className="rounded-xl bg-emerald-700 px-8 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving Property..." : "Save Property"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

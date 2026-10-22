
"use client";

import { useState, useEffect } from "react";

export default function UploadPropertyForm() {
  const API_BASE = "http://property.reworkstaging.name.ng/v1";

  const initialForm = {
    name: "",
    description: "",
    price: "",
    type: "SALES",
    category: "FLAT",
    image: "",
    country: "NIGERIA",
    state: "ABUJA",
    city: "",
    address: "",
    property_use: "RESIDENTIAL",
    payment_plan: "PER_ANNUM",
    furnishing: "UNFURNISHED",
    total_area: "",
    bedroom: "0",
    bathroom: "0",
    toilet: "0",
    parking_space: "0",
    lat: "",
    lng: "",
    disclaimer: "",
  };

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [role, setRole] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [files, setFiles] = useState([]);
const [fileKey, setFileKey] = useState(0); // used to clear the file box after saving

  const availableAmenities = [
    "BEDROOM",
    "TOILET",
    "GYM",
    "SWIMMING_POOL",
    "PARKING_SPACE",
    "BALCONY",
    "SECURITY",
    "WATER_SUPPLY",
    "ELECTRICITY",
  ];

  useEffect(() => {
    const auth = JSON.parse(
      localStorage.getItem("auth_data") || "{}"
    );

    const userRole = auth.data?.role;
    setRole(userRole);

    if (userRole !== "MERCHANT") return;

    async function loadAgents() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE}/merchants/agents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        console.log("Agents response:", data);

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : data.agents || [];

        setAgents(list);
      } catch (err) {
        console.error("Loading agents failed:", err);
      }
    }

    loadAgents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityChange = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity]
    );
  };

  const handleFilesChange = (e) => {
  const chosen = Array.from(e.target.files);
  if (chosen.length > 5) {
    setMessage({ type: "error", text: "You can add up to 5 images." });
  }
  setFiles(chosen.slice(0, 5));
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    
const token = localStorage.getItem("token");
const auth = JSON.parse(localStorage.getItem("auth_data") || "{}");
const agentId = auth.data?.id;

    if (!token) {
      setMessage({
        type: "error",
        text: "Please log in first.",
      });
      return;
    }

    if (!form.name.trim() || !form.price.trim()) {
      setMessage({
        type: "error",
        text: "Enter a property title and price.",
      });
      return;
    }

    if (role === "MERCHANT" && !agentId) {
      setMessage({
        type: "error",
        text: "Select an agent.",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: form.price,
      type: form.type,
      category: form.category,
      country: form.country,
      state: form.state,
      city: form.city,
      address: form.address,
      property_use: form.property_use,
      payment_plan: form.payment_plan,
      furnishing: form.furnishing,
      total_area: form.total_area,
      bedroom: Number(form.bedroom),
      bathroom: Number(form.bathroom),
      toilet: Number(form.toilet),
      parking_space: Number(form.parking_space),
      disclaimer: form.disclaimer,
      amenities,
    };

    // Include coordinates only when provided.
    if (form.lat.trim() !== "") {
      payload.lat = Number(form.lat);
    }

    if (form.lng.trim() !== "") {
      payload.lng = Number(form.lng);
    }

    // The API requires the agent key for merchant-created properties.
    if (role === "MERCHANT") {
      payload.agent = agentId;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();

      console.log("Create property status:", res.status);
      console.log("Create property response:", responseText);

      let data = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }

           if (!res.ok) {
        throw new Error(
          data.msg ||
          data.message ||
          data.error ||
          `Failed (status ${res.status})`
        );
      }

      const newId = data.data?.id;
      let imagesOk = true;

      if (files.length > 0 && newId) {
        const fd = new FormData();
        files.forEach((file) => fd.append("images", file));

        const imgRes = await fetch(`${API_BASE}/properties/${newId}/resource`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }, // no Content-Type for files
          body: fd,
        });

        console.log("Image upload status:", imgRes.status, await imgRes.text());
        imagesOk = imgRes.ok;
      }

      setMessage({
        type: imagesOk ? "success" : "error",
        text: imagesOk
          ? "Property created successfully!"
          : "Property created, but the images failed to upload. Check the console.",
      });

      setForm(initialForm);
      setAmenities([]);
      setAgentId("");
    } catch (err) {
      console.error("Create property error:", err);

      setMessage({
        type: "error",
        text: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const field =
    "border border-gray-300 rounded-md px-3 py-2 w-full text-sm";

  const label =
    "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl grid grid-cols-2 gap-4"
    >
      <div className="col-span-2">
        <label className={label}>Property Title</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className={field}
          placeholder="4-bedroom duplex in Maitama"
          required
        />
      </div>

      <div className="col-span-2">
        <label className={label}>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className={field}
          placeholder="Describe the property"
        />
      </div>

      <div>
        <label className={label}>Price (₦)</label>
        <input
          name="price"
          value={form.price}
          onChange={handleChange}
          className={field}
          placeholder="14405000"
          required
        />
      </div>

      <div>
        <label className={label}>Listing Type</label>
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className={field}
        >
          <option value="SALES">For Sale</option>
          <option value="RENT">For Rent</option>
          <option value="LEASE">For Lease</option>
        </select>
      </div>

      <div>
        <label className={label}>Category</label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className={field}
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
        <label className={label}>Property Use</label>
        <select
          name="property_use"
          value={form.property_use}
          onChange={handleChange}
          className={field}
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
        </select>
      </div>

      <div>
        <label className={label}>Payment Plan</label>
        <select
          name="payment_plan"
          value={form.payment_plan}
          onChange={handleChange}
          className={field}
        >
          <option value="PER_ANNUM">Per Annum</option>
          <option value="MONTHLY">Monthly</option>
          <option value="PER_PLOT">Per Plot</option>
          <option value="PER_DAY">Per Day</option>
        </select>
      </div>

      <div>
        <label className={label}>Furnishing</label>
        <select
          name="furnishing"
          value={form.furnishing}
          onChange={handleChange}
          className={field}
        >
          <option value="FURNISHED">Furnished</option>
          <option value="UNFURNISHED">Unfurnished</option>
        </select>
      </div>

      <div>
        <label className={label}>Total Area</label>
        <input
          name="total_area"
          value={form.total_area}
          onChange={handleChange}
          className={field}
          placeholder="220 sqm"
        />
      </div>

      <div>
        <label className={label}>Bedrooms</label>
        <input
          type="number"
          min="0"
          name="bedroom"
          value={form.bedroom}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>Bathrooms</label>
        <input
          type="number"
          min="0"
          name="bathroom"
          value={form.bathroom}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>Toilets</label>
        <input
          type="number"
          min="0"
          name="toilet"
          value={form.toilet}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>Parking Spaces</label>
        <input
          type="number"
          min="0"
          name="parking_space"
          value={form.parking_space}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>Country</label>
        <input
          name="country"
          value={form.country}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>State</label>
        <input
          name="state"
          value={form.state}
          onChange={handleChange}
          className={field}
        />
      </div>

      <div>
        <label className={label}>City</label>
        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          className={field}
          placeholder="Lugbe"
        />
      </div>

      <div className="col-span-2">
        <label className={label}>Full Address</label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          className={field}
          placeholder="No 5, Kaitam road, Lugbe, Abuja"
        />
      </div>

      <div>
        <label className={label}>Latitude (lat)</label>
        <input
          type="number"
          step="any"
          name="lat"
          value={form.lat}
          onChange={handleChange}
          className={field}
          placeholder="9.0765"
        />
      </div>

      <div>
        <label className={label}>Longitude (lng)</label>
        <input
          type="number"
          step="any"
          name="lng"
          value={form.lng}
          onChange={handleChange}
          className={field}
          placeholder="7.3986"
        />
      </div>

      <div className="col-span-2">
        <label className={label}>Amenities</label>

        <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3">
          {availableAmenities.map((amenity) => (
            <label
              key={amenity}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={amenities.includes(amenity)}
                onChange={() => handleAmenityChange(amenity)}
              />
              {amenity.replaceAll("_", " ")}
            </label>
          ))}
        </div>
      </div>

      <div className="col-span-2">
        <label className={label}>Disclaimer</label>
        <textarea
          name="disclaimer"
          value={form.disclaimer}
          onChange={handleChange}
          rows={2}
          className={field}
          placeholder="Additional information or disclaimer"
        />
      </div>

      {role === "MERCHANT" && (
        <div className="col-span-2">
          <label className={label}>Agent</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className={field}
            required
          >
            <option value="">Select an agent</option>

            {agents.map((a) => (
              <option
                key={a._id || a.id}
                value={a._id || a.id}
              >
                {a.full_name || a.name || a.email || a._id || a.id}
              </option>
            ))}
          </select>

          {agents.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No agents found. Create an agent first or check the agents API.
            </p>
          )}
        </div>
      )}

      <div className="col-span-2">
  <label className={label}>Images (up to 5)</label>
  <input
    key={fileKey}
    type="file"
    accept="image/*"
    multiple
    onChange={handleFilesChange}
    className={field}
  />
  {files.length > 0 && (
    <p className="mt-1 text-xs text-gray-500">
      {files.length} selected: {files.map((f) => f.name).join(", ")}
    </p>
  )}
</div>

      <div className="col-span-2">
        {message && (
          <p
            className={`mb-3 text-sm ${
              message.type === "error"
                ? "text-red-600"
                : "text-green-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-6 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload Property"}
        </button>
      </div>
    </form>
  );
}


"use client";

import { useState, useEffect } from "react";


const API_BASE = "http://property.reworkstaging.name.ng/v1";

export default function Properties_list() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [editing, setEditing] = useState(null);   // the property being edited
const [editForm, setEditForm] = useState({});
const [saving, setSaving] = useState(false);

 
useEffect(() => {
  async function getProperties() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in first. No token was found.");
      }

     

      const auth = JSON.parse(localStorage.getItem("auth_data") || "{}");
const role = auth.data?.role;
const id = auth.data?.id;

// Merchants filter by merchant, agents filter by agent
const filter = role === "AGENT" ? `agent=${id}` : `merchant=${id}`;
const headers = { Authorization: `Bearer ${token}` };

// The API hides unverified properties by default, so ask for both kinds
const urls = [
  `${API_BASE}/properties?${filter}&verified=true`,
  `${API_BASE}/properties?${filter}&verified=false`,
];

const results = await Promise.all(
  urls.map(async (url) => {
    const res = await fetch(url, { headers });
    const data = await res.json().catch(() => ({}));
    console.log("Properties API response:", url, data);

    if (!res.ok) {
      throw new Error(data.message || data.error || `Request failed: ${res.status}`);
    }
    return Array.isArray(data.data) ? data.data : [];
  })
);

const list = [...results[0], ...results[1]];
setProperties(list);
    } catch (err) {
      console.error("Loading properties failed:", err);
      setError(err.message || "Unable to load properties.");
    } finally {
      setLoading(false);
    }
  }

  getProperties();
}, []);

const setVerified = async (id, value) => {
  const token = localStorage.getItem("token");

  try {
    setUpdatingId(id);

    const res = await fetch(`${API_BASE}/properties/${id}/set-verified`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_verified: value }),
    });

const deleteProperty = async (id) => {
  if (!window.confirm("Delete this property? This cannot be undone.")) return;

  const token = localStorage.getItem("token");

  try {
    setUpdatingId(id);

    const res = await fetch(`${API_BASE}/properties/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    console.log("Delete response:", res.status, data);

    if (!res.ok) {
      throw new Error(
        data.msg || data.message || data.error || `Failed (status ${res.status})`
      );
    }

    // Remove the row from the screen
    setProperties((prev) => prev.filter((p) => p.id !== id));
  } catch (err) {
    alert(err.message);
  } finally {
    setUpdatingId(null);
  }
};    

const openEdit = (p) => {
  setEditing(p);
  setEditForm({
    name: p.name || "",
    price: p.price || "",
    address: typeof p.address === "string" ? p.address : "",
    description: p.description || "",
  });
};

const saveEdit = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");

  try {
    setSaving(true);

    const res = await fetch(`${API_BASE}/properties/${editing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm),
    });

    const data = await res.json().catch(() => ({}));
    console.log("Edit response:", res.status, data);

    if (!res.ok) {
      throw new Error(
        data.msg || data.message || data.error || `Failed (status ${res.status})`
      );
    }

    // Update the row on screen
    setProperties((prev) =>
      prev.map((p) => (p.id === editing.id ? { ...p, ...editForm } : p))
    );
    setEditing(null);
  } catch (err) {
    alert(err.message);
  } finally {
    setSaving(false);
  }
};
   const data = await res.json().catch(() => ({}));
console.log("Set verified response:", res.status, data);

if (!res.ok) {
  throw new Error(
    data.msg || data.message || data.error || `Failed (status ${res.status})`
  );
}
    // Update the row on screen without reloading the list
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_verified: value } : p))
    );
  } catch (err) {
    alert(err.message);
  } finally {
    setUpdatingId(null);
  }
};

  if (loading) {
    return <p className="text-gray-500">Loading properties...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 p-4">
        <p className="text-red-600">{error}</p>
        <p className="mt-2 text-sm text-gray-500">
          Open your browser console to inspect the API response.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My Properties</h2>
        <p className="text-sm text-gray-500">
          Total loaded: {properties.length}
        </p>
      </div>

      {properties.length === 0 ? (
        <p className="text-gray-500">
          No properties were returned by the API.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-600">
                <th className="p-3">Image</th>
                <th className="p-3">Property</th>
                <th className="p-3">Address</th>
                <th className="p-3">Price</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                 <th className="p-3">Action</th>


                 
              </tr>
            </thead>

            <tbody>
              {properties.map((p, index) => (
                <tr
                  key={p.id || p._id || index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-3">
  <img
    src={p.images?.[0] || "/shop.png"}
    alt={p.name || "Property"}
    className="h-12 w-16 rounded object-cover"
  />
</td>
                  <td className="p-3 font-medium">
                    {p.name || "Unnamed property"}
                  </td>

                  <td className="p-3">
                    {typeof p.address === "string"
                      ? p.address
                      : p.address?.address ||
                        p.city ||
                        "Not provided"}
                  </td>

                  <td className="p-3">
                    {p.price ??
                      p.amount ??
                      p.rent ??
                      "Not provided"}
                  </td>

                  <td className="p-3">
                    {p.category || "Not provided"}
                  </td>

                  <td className="p-3">
                    {p.type || p.contract_type || "Not provided"}
                  </td>

                  <td className="p-3">
                    {p.is_verified ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md">Verified</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md">Unverified</span>
                    )}
                  </td>

                  <td className="p-3">
  <div className="flex gap-2">
    <button
      onClick={() => setVerified(p.id, !p.is_verified)}
      disabled={updatingId === p.id}
      className="border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
    >
      {updatingId === p.id ? "Saving..." : p.is_verified ? "Unverify" : "Verify"}
    </button>

    <button
      onClick={() => openEdit(p)}
      className="border border-blue-300 text-blue-700 rounded-md px-3 py-1 hover:bg-blue-50"
    >
      Edit
    </button>

    <button
      onClick={() => deleteProperty(p.id)}
      disabled={updatingId === p.id}
      className="border border-red-300 text-red-700 rounded-md px-3 py-1 hover:bg-red-50 disabled:opacity-50"
    >
      Delete
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

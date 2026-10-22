"use client";

import { useState } from "react";

const API_BASE = "http://property.reworkstaging.name.ng/v1";

export default function Add_agent_form() {
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text: "..." }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const token = localStorage.getItem("token");
    if (!token) return setMessage({ type: "error", text: "Please log in first" });

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      return setMessage({ type: "error", text: "Fill in all fields" });
    }
    if (form.password.length < 8) {
      return setMessage({ type: "error", text: "Password must be at least 8 characters" });
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/merchants/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      console.log("Create agent response:", data);

      if (!res.ok) {
        throw new Error(data.message || data.error || data.msg || `Failed (status ${res.status})`);
      }

      setMessage({ type: "success", text: "Agent created" });
      setForm({ full_name: "", company: "", email: "", phone: "", password: "" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const field = "border border-gray-300 rounded-md px-3 py-2 w-full text-sm";
  const label = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className={label}>Full name</label>
        <input name="full_name" value={form.full_name} onChange={handleChange} className={field} placeholder="Agent's full name" />
      </div>

      <div>
        <label className={label}>Company</label>
        <input name="company" value={form.company} onChange={handleChange} className={field} placeholder="Company name" />
      </div>

      <div>
        <label className={label}>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className={field} placeholder="agent@example.com" />
      </div>

      <div>
        <label className={label}>Phone number</label>
        <input name="phone" value={form.phone} onChange={handleChange} className={field} placeholder="08012345678" />
      </div>

      <div>
        <label className={label}>Password</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} className={field} />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={loading} className="bg-gray-900 text-white font-semibold px-6 py-2 rounded-md">
        {loading ? "Creating..." : "Create agent"}
      </button>
    </form>
  );
}
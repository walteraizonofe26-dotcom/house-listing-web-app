"use client";

import { useState } from "react";
const API_BASE = "http://property.reworkstaging.name.ng/v1";

export default function RegisterForm() {
  const [form, setForm] = useState({
  full_name: "",
  email: "",
  phone: "",
  password: "",
});

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState(null); 

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage(null);

  if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
    return setMessage({ type: "error", text: "Fill in all fields" });
  }

  try {
    setLoading(true);
    const res = await fetch(`${API_BASE}/merchants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't create the merchant. Try again.");

    setMessage({ type: "success", text: "Merchant created" });
    setForm({ full_name: "", email: "", phone: "", password: "" });
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
      <div>Register </div>
      <div>
        <label className={label}>Full name</label>
      <input name="full_name" value={form.full_name} onChange={handleChange} className={field} placeholder="Write your full name" />
      </div>

      <div>
        <label className={label}>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className={field} placeholder="email" />
      </div>

      <div>
        <label className={label}>Phone number</label>
        <input name="phone" value={form.phone} onChange={handleChange} className={field} placeholder="08012345678" />
      </div>

      <div>
        <label className={label}>Account type</label>
        <select name="role" value={form.role} onChange={handleChange} className={field}>
          <option value="agent">Agent</option>
          <option value="merchant">Merchant</option>
        </select>
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
  {loading ? "Creating..." : "Create Account"}
</button>
    </form>
  );
}
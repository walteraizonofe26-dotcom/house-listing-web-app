"use client";

import { useState } from "react";

const API_BASE = "http://property.reworkstaging.name.ng/v1";

export default function Login_form() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text: "..." }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.email.trim() || !form.password) {
      return setMessage({ type: "error", text: "Enter your email and password" });
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("Login response:", data); // look at this to find the token

     if (!res.ok) {
  throw new Error(
    data.message || data.error || data.msg || `Login failed (status ${res.status})`
  );
}

// Look for the token in the usual places
const token =
  data.token ||
  data.access_token ||
  data.accessToken ||
  data.data?.token ||
  data.data?.access_token;

if (!token) {
  console.log("No token found. Full response:", data);
  throw new Error("Logged in, but no token was found in the response");
}

localStorage.setItem("token", token);
localStorage.setItem("auth_data", JSON.stringify(data)); // keeps the user details too

setMessage({ type: "success", text: "Login successful" });
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
      <h1>Login Form</h1>
    </div>
      <div>
        <label className={label}>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className={field} placeholder="name@example.com" />
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
        {loading ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
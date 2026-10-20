"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("merchant");

  const [formData, setFormData] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    password: "",
    merchantToken: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let endpoint = "";
      let body = {};
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (role === "merchant") {
        endpoint = "/merchants";

        body = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        };
      } else if (role === "agent") {
        endpoint = "/merchants/agents";

        if (!formData.merchantToken.trim()) {
          throw new Error(
            "A valid merchant access token is required to register an agent."
          );
        }

        headers.Authorization =
          `Bearer ${formData.merchantToken.trim()}`;

        body = {
          full_name: formData.full_name.trim(),
          company: formData.company.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        };
      } else {
        endpoint = "/users";

        body = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        };
      }

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      let result = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please try again."
        );
      }

      if (
        !response.ok ||
        result.code >= 400 ||
        result.type === "BAD_REQUEST"
      ) {
        throw new Error(
          result.msg ||
            result.message ||
            result.error?.message ||
            `Registration failed (${response.status}).`
        );
      }

      setSuccess(
        "Registration successful! Please log in with your new account."
      );

      // Send the selected role to the login page.
      setTimeout(() => {
        router.push(`/login?role=${role}`);
      }, 1200);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Create an Account
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Join PropertyHub to manage properties or book inspections.
        </p>

        <label
          htmlFor="role"
          className="mb-2 block font-medium text-gray-700"
        >
          Register as
        </label>

        <select
          id="role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setError("");
            setSuccess("");
          }}
          className="mb-5 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-600"
        >
          <option value="merchant">Merchant</option>
          <option value="agent">Agent</option>
          <option value="user">Customer / User</option>
        </select>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-700"
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "user" ? (
            <>
              <div>
                <label
                  htmlFor="first_name"
                  className="mb-1 block font-medium text-gray-700"
                >
                  First name
                </label>

                <input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                  required
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="mb-1 block font-medium text-gray-700"
                >
                  Last name
                </label>

                <input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  autoComplete="family-name"
                  required
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>
            </>
          ) : (
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block font-medium text-gray-700"
              >
                Full name
              </label>

              <input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                className="w-full rounded-lg border border-gray-300 p-3"
              />
            </div>
          )}

          {role === "agent" && (
            <>
              <div>
                <label
                  htmlFor="company"
                  className="mb-1 block font-medium text-gray-700"
                >
                  Company
                </label>

                <input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="merchantToken"
                  className="mb-1 block font-medium text-gray-700"
                >
                  Merchant access token
                </label>

                <input
                  id="merchantToken"
                  name="merchantToken"
                  type="password"
                  value={formData.merchantToken}
                  onChange={handleChange}
                  placeholder="Enter merchant token"
                  autoComplete="off"
                  required
                  className="w-full rounded-lg border border-gray-300 p-3"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Enter the access token of the merchant authorizing
                  this agent registration.
                </p>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1 block font-medium text-gray-700"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 p-3"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block font-medium text-gray-700"
            >
              Phone number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              autoComplete="tel"
              required
              className="w-full rounded-lg border border-gray-300 p-3"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={6}
              required
              className="w-full rounded-lg border border-gray-300 p-3"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

function getToken(result) {
  const candidates = [
    result,
    result?.data,
    result?.data?.data,
    result?.result,
    result?.result?.data,
    result?.account,
    result?.user,
    result?.customer,
    result?.merchant,
    result?.agent,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const token = item.token || item.access_token || item.accessToken;

    if (typeof token === "string" && token.trim()) {
      return token.trim();
    }
  }

  return "";
}

function getAccount(result) {
  const candidates = [
    result?.data?.data,
    result?.data,
    result?.result?.data,
    result?.result,
    result?.account,
    result?.user,
    result?.customer,
    result?.merchant,
    result?.agent,
  ];

  for (const item of candidates) {
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      (
        item.id ||
        item._id ||
        item.user_id ||
        item.userId ||
        item.merchant_id ||
        item.agent_id ||
        item.email
      )
    ) {
      return item;
    }
  }

  return result;
}

function getId(account) {
  return (
    account?.merchant_id ??
    account?.merchantId ??
    account?.agent_id ??
    account?.agentId ??
    account?.user_id ??
    account?.userId ??
    account?.id ??
    account?._id ??
    account?.user?.id ??
    account?.customer?.id ??
    ""
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedRole = searchParams.get("role");

  const [role, setRole] = useState(
    ["merchant", "agent", "user"].includes(requestedRole)
      ? requestedRole
      : "merchant"
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const responseText = await response.text();

      let result = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          "The server returned an unexpected response. Please check the login API endpoint."
        );
      }

      const responseCode = Number(result?.code);

      if (
        !response.ok ||
        (Number.isFinite(responseCode) &&
          responseCode >= 400) ||
        ["BAD_REQUEST", "UNAUTHORIZED", "TOKEN_EXPIRED"].includes(
          result?.type
        )
      ) {
        throw new Error(
          result?.msg ||
            result?.message ||
            result?.error?.message ||
            `Login failed (${response.status}).`
        );
      }

      const token = getToken(result);
      const account = getAccount(result);

      if (!token) {
        throw new Error(
          "The login response did not contain an access token. Please check the API response."
        );
      }

      if (
        !account ||
        typeof account !== "object" ||
        Array.isArray(account)
      ) {
        throw new Error("The API returned invalid account information.");
      }

      const accountId = getId(account);

      const savedAccount = {
        ...account,
        role,
      };

      // Clear data belonging to the previous account.
      const keysToClear = [
        "token",
        "role",
        "account",
        "merchantId",
        "agentId",
        "userId",
        "merchant",
        "agent",
        "user",
      ];

      keysToClear.forEach((key) => {
        localStorage.removeItem(key);
      });

      // Save the new account and token.
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("account", JSON.stringify(savedAccount));

      if (accountId) {
        if (role === "merchant") {
          localStorage.setItem("merchantId", String(accountId));
          localStorage.setItem("merchant", JSON.stringify(savedAccount));
        } else if (role === "agent") {
          localStorage.setItem("agentId", String(accountId));
          localStorage.setItem("agent", JSON.stringify(savedAccount));
        } else {
          localStorage.setItem("userId", String(accountId));
          localStorage.setItem("user", JSON.stringify(savedAccount));
        }
      }

      console.log("Login successful.");
      console.log("Selected role:", role);
      console.log("Account ID found:", Boolean(accountId));

      // Redirect each role to its own destination.
      if (role === "merchant") {
        router.replace("/dashboard/merchant");
      } else if (role === "agent") {
        router.replace("/dashboard/agent");
      } else {
        router.replace("/All-property");
      }
    } catch (err) {
      setError(
        err.message || "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Welcome Back
        </h1>

        <p className="mb-7 text-center text-gray-500">
          Login to your PropertyHub account.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="role"
              className="mb-2 block font-medium text-gray-700"
            >
              Login as
            </label>

            <select
              id="role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 p-3"
            >
              <option value="merchant">Merchant</option>
              <option value="agent">Agent</option>
              <option value="user">Customer / User</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-600 hover:underline"
          >
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-gray-600">Loading login...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FaFacebookF, FaGoogle } from "react-icons/fa";

const API_URL = "http://property.reworkstaging.name.ng/v1/auth/login";

export default function Login() {
  const router = useRouter();

  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errs = {};

    if (!values.email.trim()) {
      errs.email = "Email cannot be blank.";
    } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      errs.email = "Enter a valid email.";
    }

    if (!values.password) {
      errs.password = "Password cannot be blank.";
    }

    setErrors(errs);
    setMessage("");

    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.msg ||
          data.message ||
          data.error ||
          `Login failed (${response.status}).`
        );
      }

      const token =
        data.token ||
        data.data?.token ||
        data.access_token ||
        data.data?.access_token;

      if (!token) {
        throw new Error(
          data.msg ||
          data.message ||
          "Login response received, but no authentication token was found."
        );
      }

      // Store the token according to the Remember Me choice.
      if (remember) {
        localStorage.setItem("token", token);
      } else {
        sessionStorage.setItem("token", token);
      }

      setMessage("Login successful! Redirecting...");

      router.push("/");
    } catch (error) {
      setMessage(
        error.message ||
        "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <Nav />

      <div className="max-w-xl mx-auto my-8 px-6">
        <h1 className="text-3xl font-bold mb-4 text-center">
          Log In Your Account
        </h1>

        <p className="pb-5 text-center border-b border-gray-300">
          Please enter your Email and Password
        </p>

        <form onSubmit={handleSubmit} noValidate className="pt-6">
          <label htmlFor="email" className="block mb-1">
            Email<span className="text-red-600">*</span>
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            className={`w-full border p-2 rounded-sm ${
              errors.email ? "border-red-600" : "border-gray-400"
            }`}
          />

          {errors.email && (
            <p className="text-red-600 text-sm mt-1">
              {errors.email}
            </p>
          )}

          <label htmlFor="password" className="block mb-1 mt-5">
            Password<span className="text-red-600">*</span>
          </label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            className={`w-full border p-2 rounded-sm ${
              errors.password ? "border-red-600" : "border-gray-400"
            }`}
          />

          {errors.password && (
            <p className="text-red-600 text-sm mt-1">
              {errors.password}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember Me
            </label>

            <Link
              href="/forgot-password"
              className="text-red-700 hover:underline"
            >
              Forgot Your Password?
            </Link>
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 text-center ${
                message.startsWith("Login successful")
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="mt-6 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-sm"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-sm">OR</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <p className="text-center mb-5">
            Log In using one of the following social services:
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() =>
                setMessage("Facebook login has not been configured yet.")
              }
              className="flex items-center gap-3 bg-[#3b5998] hover:opacity-90 text-white font-bold text-lg px-5 py-3 rounded-full"
            >
              <span className="bg-[#2d4373] p-2 rounded-full">
                <FaFacebookF />
              </span>
              Facebook Login
            </button>

            <button
              type="button"
              onClick={() =>
                setMessage("Google login has not been configured yet.")
              }
              className="flex items-center gap-3 bg-[#dd4b39] hover:opacity-90 text-white font-bold text-lg px-5 py-3 rounded-full"
            >
              <span className="bg-[#a33a2c] p-2 rounded-full">
                <FaGoogle />
              </span>
              Google Login
            </button>
          </div>

          <p className="text-center mt-8 pt-4 border-t border-gray-200">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup_page"
              className="text-red-700 hover:underline"
            >
              Register
            </Link>
          </p>
        </form>
      </div>

      <Footer />
    </section>
  );
}

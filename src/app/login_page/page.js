"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FaFacebookF, FaGoogle } from "react-icons/fa";

export default function Login() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const errs = {};
    if (!values.email.trim()) errs.email = "Email cannot be blank.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) errs.email = "Enter a valid email.";
    if (!values.password) errs.password = "Password cannot be blank.";

    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      // send values (and remember) to your backend here
      console.log("Login:", values, "Remember:", remember);
    }
  }

  return (
    <section>
      <Nav />

      <div className="max-w-xl mx-auto my-8 px-6">
        <h1 className="text-3xl font-bold mb-4 text-center">Log In Your Account</h1>
        <p className="pb-5 text-center border-b border-gray-300">
          Please enter your Email and Password
        </p>

        <form onSubmit={handleSubmit} noValidate className="pt-6">
          {/* Email */}
          <label htmlFor="email" className="block mb-1">
            Email<span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={values.email}
            onChange={handleChange}
            className={`w-full border p-2 rounded-sm ${errors.email ? "border-red-600" : "border-gray-400"}`}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}

          {/* Password */}
          <label htmlFor="password" className="block mb-1 mt-5">
            Password<span className="text-red-600">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={values.password}
            onChange={handleChange}
            className={`w-full border p-2 rounded-sm ${errors.password ? "border-red-600" : "border-gray-400"}`}
          />
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}

          {/* Remember me + forgot password */}
          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember Me
            </label>
            <Link href="/forgot-password" className="text-red-700 hover:underline">
              Forgot Your Password?
            </Link>
          </div>

          {/* Login button */}
          <div className="text-center">
            <button
              type="submit"
              className="mt-6 bg-red-700 hover:bg-red-800 text-white font-bold px-8 py-3 rounded-sm"
            >
              Login
            </button>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-sm">OR</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <p className="text-center mb-5">Log In using one of the following social services:</p>

          {/* Social buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              className="flex items-center gap-3 bg-[#3b5998] hover:opacity-90 text-white font-bold text-lg px-5 py-3 rounded-full"
            >
              <span className="bg-[#2d4373] p-2 rounded-full">
                <FaFacebookF />
              </span>
              Facebook Login
            </button>
            <button
              type="button"
              className="flex items-center gap-3 bg-[#dd4b39] hover:opacity-90 text-white font-bold text-lg px-5 py-3 rounded-full"
            >
              <span className="bg-[#a33a2c] p-2 rounded-full">
                <FaGoogle />
              </span>
              Google Login
            </button>
          </div>

          {/* Register link */}
          <p className="text-center mt-8 pt-4 border-t border-gray-200">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-red-700 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>

      <Footer />
    </section>
  );
}
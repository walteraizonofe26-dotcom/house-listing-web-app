
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { CiLock, CiCircleList } from "react-icons/ci";
import { MdAddAlert, MdOutlineSyncAlt } from "react-icons/md";
import Link from "next/link";


const API_URL = "http://property.reworkstaging.name.ng/v1/users";


export default function Signup(){
const router = useRouter();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setMessage("Please fill in all required fields.");
      return;
    }

    

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.msg ||
          data.message ||
          data.error ||
          `Registration failed (${response.status}).`
        );
      }

      setSuccess(true);
      setMessage(
        data.msg || data.message || "Registration successful! Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login_page");
      }, 2000);
    } catch (error) {
      setMessage(
        error.message ||
        "Unable to register. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }


    return(
        <section>
        <Nav />
        <div className="align-center text-center px-63">
        <h1 className="text-3xl font-bold mb-4">Register Your Account</h1>
        <p className="pb-5" >New user? Please take a min to fill in your information. You will only have to do this once. We promise!</p>
        <div className="pb-4 flex gap-4  align-center justify-center pt-4 border-b-2 border-gray-500 border-t-2 border-gray-500">
          <CiLock  className="text-2xl text-red-600 "/>
          <h3> Save Favorites</h3>
          <MdAddAlert  className="text-2xl text-red-600 " />
          <h3> Get Alerts</h3>
          <MdOutlineSyncAlt  className="text-2xl text-red-600 " />
          <h3>Sync Devices</h3>
          <CiCircleList  className="text-2xl text-red-600  " />
          <h3>Adding Listing</h3>

        </div>
        </div>
        
       <div className="">
    <form onSubmit={handleSubmit} className="px-4 md:px-10 lg:px-60 py-10">
          <label htmlFor="userType" className="block mb-1">
            User Type<span className="text-red-600">*</span>
          </label>
          <select id="userType" className="w-full border border-gray-400 p-2 rounded-sm">
            <option value="">Select User type</option>
            <option value="Buyer">Buyer</option>
            <option value="agent">Agent</option>
            <option value="agency">Agency</option>
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            <div>
              <label htmlFor="first_name" className="block mb-1">First Name<span className="text-red-600">*</span></label>
              <input id="first_name" name="first_name" placeholder="First Name"  value={formData.first_name} className="w-full border border-gray-400 p-2 rounded-sm" onChange={handleChange} required/>
            </div>
            <div>
              <label htmlFor="last_name" className="block mb-1">Last Name<span className="text-red-600">*</span></label>
              <input id="last_name" name="last_name" placeholder="Last Name" value={formData.last_name} className="w-full border border-gray-400 p-2 rounded-sm"  onChange={handleChange} required/>
            </div>
            <div>
              <label htmlFor="email" className="block mb-1">Email<span className="text-red-600">*</span></label>
              <input id="email" name="email" type="email" placeholder="Email Address" className="w-full border border-gray-400 p-2 rounded-sm" value={formData.email}  onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="mobile" className="block mb-1">Phone Number<span className="text-red-600">*</span></label>
              <input id="phone" name="phone" type="telephone" placeholder="Mobile Number"  className="w-full border border-gray-400 p-2 rounded-sm" value={formData.phone}  onChange={handleChange} required  />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1">Password<span className="text-red-600">*</span></label>
              <input id="password" name="password" type="password" placeholder="Password" className="w-full border border-gray-400 p-2 rounded-sm" value={formData.password}  onChange={handleChange} required  />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1">Confirm Password<span className="text-red-600">*</span></label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm Password" className="w-full border border-gray-400 p-2 rounded-sm" value={formData.confirmPassword}  onChange={handleChange}  />
            </div>
          </div>
          {message && (
  <p
    role="status"
    className={`mt-4 text-center ${
      success ? "text-green-700" : "text-red-600"
    }`}
  >
    {message}
  </p>
)}
            <div className="text-center">
                 <button type="submit"  disabled={loading} className="mt-6 bg-red-700 hover:bg-red-800 text-white px-8 py-3 rounded-sm "> {loading ? "Registering..." : "Sign up"}</button>
            </div>
         <div className="text-center pt-4">
            <h1>Already Registered user? <Link href="/login_page" className="text-red-400 cursor-pointer">Login</Link></h1>
         </div>
        </form>
       </div>
        
        <Footer />
        </section>
        
    );
}
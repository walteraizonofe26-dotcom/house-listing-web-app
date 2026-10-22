"use client";
import { useState, useEffect } from "react";

import { IoHome } from "react-icons/io5";
import { FaBookOpen } from "react-icons/fa";
import { MdPriceChange } from "react-icons/md";
import { FaHouseUser } from "react-icons/fa";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

import { mockProperties } from "@/data/mockProperties";

const USE_MOCK = true; // set to false when the API is working


export default function Shop(){
    
const [properties, setProperties] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {

  
  const getProperties = async () => {

    if (USE_MOCK) {
    setProperties(mockProperties);
    setLoading(false);
    return;
  }
    try {
      const tokenResp = await fetch("https://property.reworkstaging.name.ng/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "d@g.com" }),
      });
      const tokenData = await tokenResp.json();
      const token = tokenData.token || tokenData.data?.token || tokenData.access_token;
      if (!tokenResp.ok || !token) throw new Error("Failed to get token");

      const resp = await fetch("https://property.reworkstaging.name.ng/v1/properties", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error("Failed to fetch properties");

      setProperties(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error(err);
      setError("Could not load properties.");
    } finally {
      setLoading(false);
    }
  };

  getProperties();
}, []);
    return(
        <div>
        <Nav />
 <section className="bg-gray-100 px-4 py-10 md:px-16 lg:px-24">
       <div className="mx-auto max-w-7xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="border-b border-gray-300">
        <h2 className="inline-block bg-red-700 px-5 py-3 text-lg text-white">New Hot Listing</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {loading ? (
    <p>Loading...</p>
  ) : error ? (
    <p>{error}</p>
  ) : properties.length > 0 ? (
    properties.map((property) => (
      <div key={property._id || property.id}>
        <div>
          <img
            src={property.images?.[0] || "/shop.png"}
            alt={property.name || "Property"}
            className="w-full h-auto"
          />
        </div>
        <div className="align-center text-center">
          <h3 className="border-b border-indigo-500 text-xl">{property.name}</h3>
          <p className="border-b border-indigo-500">
            At {property.city}, {property.state}
          </p>
          <h3 className="border-b border-indigo-500">NGN {property.price}</h3>
          <h4 className="border-b border-indigo-500">For {property.type}</h4>
          <h4 className="border-b border-indigo-500">
            {property.amenities?.join(", ") || "Property amenities"}
          </h4>
          <div className="flex pt-4 gap-4">
            <img src="/firm4.png" className="w-[20px]" />
            <h3>{property.agent?.full_name || "Property Agent"}</h3>
          </div>
        </div>
      </div>
    ))
  ) : (
    <p>No Property Found</p>
  )}
</div>

<div className="mt-6 flex justify-center">
  <button className="rounded bg-red-700 px-8 py-3 font-semibold text-white hover:bg-red-800">
    View All
  </button>
</div>
        <div className="grid grid-cols-5 text-center justify-center pt-4">
           <div className="border border-indigo-600 place-items-center  ">
           <IoHome   className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">3,411</h2>
            <p className="text-red-400">Homes for sale</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <FaBookOpen className="pt-4 w-[40px] h-[40px]" />
            <h2 className="pt-2">0</h2>
            <p className="text-red-400">Open houses</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">411</h2>
            <p className="text-red-400">Homes for lease</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
         <MdPriceChange className="pt-4 w-[40px] h-[40px]"  />
            <h2 className="pt-2">41</h2>
            <p className="text-red-400">Price Reduced</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">3,701</h2>
            <p className="text-red-400">Homes for sale/lease</p>
           </div>
        </div>
        </div>
         

         </section>
             <Footer />
        </div>

    );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCart, saveCart } from "@/utils/propertyHelper";
import Nav from "@/components/Nav"

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCartItems(getCart());
  }, []);

  const handleRemoveItem = (id) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    saveCart(updated);
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear all saved properties from your cart?")) {
      setCartItems([]);
      saveCart([]);
    }
  };

  // Calculate combined displayed listing value
  const totalValue = cartItems.reduce((sum, item) => {
    const numericPrice = parseFloat(item.price.replace(/,/g, "")) || 0;
    return sum + numericPrice;
  }, 0);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <Nav/>
    
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Property Shortlist (Cart)</h1>
            <p className="text-sm text-gray-500 mt-1">Properties you have saved for review and comparison.</p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-3 py-2 rounded transition"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Empty Cart State */}
        {cartItems.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🏠</div>
            <h2 className="text-xl font-semibold text-gray-800">Your cart is currently empty</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Browse available listings and click "Add to Cart" to save properties here.
            </p>
            <Link
              href="/shop/prop-101"
              className="inline-block bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-6 py-2.5 rounded transition shadow-sm"
            >
              Browse Sample Property
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Cart Items List */}
            <div className="divide-y divide-gray-200">
              {cartItems.map((item) => {
                const img = item.images && item.images.length > 0 ? item.images[0] : "/placeholder.jpg";
                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <img src={img} alt={item.name} className="w-20 h-20 object-cover rounded-md border border-gray-200" />
                      <div>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold uppercase">
                          {item.type}
                        </span>
                        <h3 className="font-bold text-gray-800 text-base mt-1">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.address}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {item.bedroom !== undefined ? `${item.bedroom} Beds • ` : ""}
                          {item.bathroom !== undefined ? `${item.bathroom} Baths` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                      <span className="font-extrabold text-gray-900 text-base">NGN {item.price}</span>
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/shop/${item.id}`}
                          className="text-xs text-red-700 hover:underline font-medium"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-xs text-gray-400 hover:text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary Box */}
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg space-y-3">
              <h3 className="font-bold text-gray-800 text-base border-b border-gray-200 pb-2">
                Shortlist Summary
              </h3>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Total Properties Saved:</span>
                <span className="font-bold">{cartItems.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Combined Listing Value:</span>
                <span className="font-extrabold text-gray-900">
                  NGN {totalValue.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 italic pt-1">
                * Note: This is only the combined value of the listed properties for comparison purposes, not a payment amount.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4">
              <Link
                href="/shop/prop-101"
                className="text-sm font-semibold text-red-700 hover:underline"
              >
                ← Continue Browsing
              </Link>
              <button
                onClick={() => alert("Inquiry submitted for all shortlisted properties.")}
                className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-6 py-2.5 rounded transition shadow-sm"
              >
                Enquire on All Saved Properties
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
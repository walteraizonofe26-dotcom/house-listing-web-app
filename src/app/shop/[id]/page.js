"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dummyProperties, getCart, saveCart } from "@/utils/propertyHelper";

export default function PropertyDetailsPage() {
  const params = useParams();
  const propertyId = params.id;

  const [property, setProperty] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedMessage, setAddedMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Future API Integration Note:
  // When your team's API is ready, replace this logic with:
  // useEffect(() => {
  //   async function fetchProperty() {
  //     // 1. Get token via POST http://property.reworkstaging.name.ng/v1/token
  //     // 2. Fetch GET http://property.reworkstaging.name.ng/v1/properties/PROPERTY_ID
  //   }
  //   fetchProperty();
  // }, [propertyId]);

  useEffect(() => {
    // For now, load from dummy data matching the ID from the dynamic URL
    const found = dummyProperties.find((p) => p.id === propertyId) || dummyProperties[0];
    setProperty(found);
    setLoading(false);
  }, [propertyId]);

  if (loading) {
    return <div className="p-12 text-center text-gray-600">Loading property details...</div>;
  }

  if (!property) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Property Not Found</h2>
        <Link href="/shop" className="text-red-700 underline mt-4 inline-block">Return to Shop</Link>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 ? property.images : ["/placeholder.jpg"];

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    const currentCart = getCart();
    // Prevent duplicate entries using property ID
    if (!currentCart.some((item) => item.id === property.id)) {
      const updatedCart = [...currentCart, property];
      saveCart(updatedCart);
    }
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <Nav />
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
        
        {/* Top Header / Agent Info Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 p-3 rounded bg-white flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">A</div>
            <div>
              <p className="text-xs text-gray-500">Listed by:</p>
              <p className="font-semibold text-gray-800 text-sm">Japhet Raishiwe 07056144444</p>
            </div>
          </div>
          <div className="border border-gray-200 p-3 rounded bg-white flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">M</div>
            <div>
              <p className="text-xs text-gray-500">Brokered by:</p>
              <p className="font-semibold text-gray-800 text-sm">The MLS Properties 07056144444</p>
            </div>
          </div>
        </div>

        {/* Main Content & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Gallery & Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Image Gallery */}
            <div className="relative bg-black rounded-lg overflow-hidden shadow-md">
              <div className="relative h-[350px] sm:h-[450px] w-full">
                <img
                  src={images[activeImageIndex]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Counter Badge */}
                <div className="absolute bottom-4 left-4 bg-red-700 text-white text-xs px-3 py-1 rounded font-medium">
                  {activeImageIndex + 1} / {images.length} Photos
                </div>

                {/* Navigation Arrows (Only if multiple images) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"
                      aria-label="Previous image"
                    >
                      ❮
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"
                      aria-label="Next image"
                    >
                      ❯
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 bg-gray-900 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition ${
                        activeImageIndex === idx ? "border-red-600 opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Title & Main Info */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded uppercase">
                  {property.type}
                </span>
                <span className="text-2xl font-extrabold text-gray-900">
                  NGN {property.price}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {property.name}
              </h1>
              <p className="text-gray-600 text-sm mb-1">{property.address}</p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                {property.id && <span>Property ID: <strong className="text-gray-700">#{property.id}</strong></span>}
                {property.city && <span>Location: <strong className="text-gray-700">{property.city}, {property.state}</strong></span>}
              </div>
            </div>

            {/* Property Information Cards */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-red-700 pl-2">
                Property Details for {property.city || property.state}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.category && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.category}</p>
                  </div>
                )}
                {property.type && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Listing Type</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.type}</p>
                  </div>
                )}
                {property.property_use && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Property Use</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.property_use}</p>
                  </div>
                )}
                {property.total_area && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Total Area</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.total_area}</p>
                  </div>
                )}
                {property.furnishing && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Furnishing</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.furnishing}</p>
                  </div>
                )}
                {property.payment_plan && (
                  <div className="border border-gray-200 p-3 rounded text-center bg-white shadow-xs">
                    <p className="text-xs text-gray-500">Payment Plan</p>
                    <p className="font-semibold text-gray-800 text-sm mt-1">{property.payment_plan}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Room Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-100 p-4 rounded-lg">
              {property.bedroom !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Bedrooms</span>
                  <span className="font-bold text-gray-800">{property.bedroom}</span>
                </div>
              )}
              {property.bathroom !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Bathrooms</span>
                  <span className="font-bold text-gray-800">{property.bathroom}</span>
                </div>
              )}
              {property.toilet !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Toilets</span>
                  <span className="font-bold text-gray-800">{property.toilet}</span>
                </div>
              )}
              {property.parking_space !== undefined && (
                <div className="text-center">
                  <span className="text-xs text-gray-500 block">Parking Space</span>
                  <span className="font-bold text-gray-800">{property.parking_space}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 border-l-4 border-red-700 pl-2">
                Property Description
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-red-700 pl-2">
                  Available Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, idx) => (
                    <span key={idx} className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full font-medium">
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Action Buttons Sidebar */}
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs space-y-3 sticky top-6">
              <h3 className="font-bold text-gray-800 text-base pb-2 border-b border-gray-100">
                Property Actions
              </h3>

              <button
                onClick={() => alert("Contact Agent form/modal triggered.")}
                className="w-full bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-2.5 px-4 rounded transition text-center block"
              >
                Contact Agent
              </button>

              <button
                onClick={() => alert("Private Showing request noted.")}
                className="w-full bg-white hover:bg-gray-50 text-red-700 border border-red-700 text-sm font-semibold py-2.5 px-4 rounded transition text-center block"
              >
                Request a Private Showing
              </button>

              <button
                onClick={handleAddToCart}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-2.5 px-4 rounded transition text-center block shadow-sm"
              >
                ❤️ Add to Cart (Shortlist)
              </button>

              <Link
                href="/cart"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-2.5 px-4 rounded transition text-center block"
              >
                🛒 View Cart
              </Link>

              <a
                href={`https://wa.me/2347056144444?text=Hello,%20I%20am%20interested%20in%20property%20${property.name}%20(ID:%20${property.id})`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 px-4 rounded transition text-center block"
              >
                💬 Enquire on WhatsApp
              </a>

              {addedMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-xs text-center font-medium animate-pulse">
                  Successfully added to your property cart!
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
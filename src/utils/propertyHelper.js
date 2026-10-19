// src/utils/propertyHelper.js

// TEMPORARY DUMMY DATA: Matches the school's property API fields
export const dummyProperties = [
  {
    id: "prop-101",
    name: "Luxury 5 Bedroom Terrace Duplex",
    price: "2,500,000,000",
    country: "NIGERIA",
    state: "ABUJA",
    city: "Katampe Extension",
    address: "Katampe Extension, Abuja FCT",
    description: "8 units of 5 bedroom terrace, featuring a basement comprising of a gym, games room, and meeting room. Includes sub-basement laundry, auxiliary generator buildings, borehole, and 24/7 security.",
    category: "DUPLEX",
    total_area: "450 sqm",
    property_use: "RESIDENTIAL",
    payment_plan: "PER_ANNUM",
    type: "SALES",
    bedroom: 5,
    bathroom: 6,
    toilet: 7,
    parking_space: 4,
    furnishing: "FURNISHED",
    amenities: ["BEDROOM", "TOILET", "GYM", "SWIMMING POOL", "PARKING SPACE"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80"
    ]
  },
  {
    id: "prop-102",
    name: "Modern 3 Bedroom Apartment",
    price: "14,405,000",
    country: "NIGERIA",
    state: "ABUJA",
    city: "Lugbe",
    address: "No 5, Kaitam road, Lugbe airport Abuja",
    description: "Spacious 3 bedroom flat with modern fittings, tiled floors, ample parking space, and reliable municipal power supply.",
    category: "FLAT",
    total_area: "220 sqm",
    property_use: "RESIDENTIAL",
    payment_plan: "PER_ANNUM",
    type: "RENT",
    bedroom: 3,
    bathroom: 3,
    toilet: 4,
    parking_space: 2,
    furnishing: "UNFURNISHED",
    amenities: ["BEDROOM", "TOILET", "PARKING SPACE", "WATER SUPPLY"],
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"
    ]
  },
  {
    id: "prop-103",
    name: "Commercial Office Space / Shop",
    price: "8,000,000",
    country: "NIGERIA",
    state: "ABUJA",
    city: "Central Area",
    address: "Constitution Avenue, Central Business District, Abuja",
    description: "Prime commercial shop suitable for retail stores, banking halls, or corporate offices with high pedestrian traffic.",
    category: "SHOP",
    total_area: "150 sqm",
    property_use: "COMMERCIAL",
    payment_plan: "PER_ANNUM",
    type: "LEASE",
    bedroom: 0,
    bathroom: 2,
    toilet: 2,
    parking_space: 6,
    furnishing: "UNFURNISHED",
    amenities: ["PARKING SPACE", "SECURITY", "ELEVATOR"],
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80"
    ]
  }
];

// CART LOCALSTORAGE UTILITIES (Client-Side Safe)
export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("naija_houses_cart");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveCart(cartItems) {
  if (typeof window === "undefined") return;
  localStorage.setItem("naija_houses_cart", JSON.stringify(cartItems));
}
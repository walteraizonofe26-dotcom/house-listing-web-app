"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const categories = [
  { name: "Flats & Apartments", value: "FLAT", icon: "🏢" },
  { name: "Duplexes", value: "DUPLEX", icon: "🏡" },
  { name: "Land", value: "LAND", icon: "🌳" },
  { name: "Shops & Offices", value: "SHOP", icon: "🏬" },
];

const cities = [
  {
    name: "Lagos",
    description: "Explore properties across Lagos",
    image:
      "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Abuja",
    description: "Find your next home in Abuja",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Port Harcourt",
    description: "Discover properties in Port Harcourt",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=800&q=80",
  },
];

const properties = [
  {
    id: "sample-1",
    name: "Luxury Family Duplex",
    location: "Lekki Phase 1, Lagos",
    price: 85000000,
    type: "FOR SALE",
    category: "DUPLEX",
    beds: 5,
    baths: 5,
    area: "450 sqm",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "sample-2",
    name: "Modern 3 Bedroom Apartment",
    location: "Victoria Island, Lagos",
    price: 4500000,
    type: "FOR RENT",
    category: "FLAT",
    beds: 3,
    baths: 3,
    area: "180 sqm",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "sample-3",
    name: "Residential Plot of Land",
    location: "Ibeju-Lekki, Lagos",
    price: 12000000,
    type: "FOR SALE",
    category: "LAND",
    beds: 0,
    baths: 0,
    area: "600 sqm",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "sample-4",
    name: "Contemporary Family Home",
    location: "Gwarinpa, Abuja",
    price: 65000000,
    type: "FOR SALE",
    category: "DUPLEX",
    beds: 4,
    baths: 4,
    area: "350 sqm",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "sample-5",
    name: "Furnished Shortlet Apartment",
    location: "Wuse 2, Abuja",
    price: 150000,
    type: "SHORTLET",
    category: "FLAT",
    beds: 2,
    baths: 2,
    area: "120 sqm",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: "sample-6",
    name: "Commercial Office Space",
    location: "Trans Amadi, Port Harcourt",
    price: 8000000,
    type: "FOR RENT",
    category: "SHOP",
    beds: 0,
    baths: 2,
    area: "250 sqm",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80",
  },
];

const formatPrice = (price) =>
  `₦${Number(price).toLocaleString("en-NG")}`;

export default function HomePage() {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [mobileMenu, setMobileMenu] = useState(false);

  const searchProperties = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (keyword.trim()) params.set("search", keyword.trim());
    if (purpose !== "ALL") params.set("type", purpose);
    if (category !== "ALL") params.set("category", category);

    const query = params.toString();

    router.push(query ? `/All-property?${query}` : "/All-property");
  };

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-extrabold text-emerald-700">
            HomeFind<span className="text-orange-500">.</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link href="/" className="font-medium text-emerald-700">
              Home
            </Link>
            <Link
              href="/All-property"
              className="font-medium hover:text-emerald-700"
            >
              Properties
            </Link>
            <Link
              href="/agents"
              className="font-medium hover:text-emerald-700"
            >
              Agents
            </Link>
            <Link
              href="/about"
              className="font-medium hover:text-emerald-700"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="font-medium hover:text-emerald-700"
            >
              Contact
            </Link>
            <Link
              href="/book-appointment"className="font-medium hover:text-emerald-700">Book Appointment</Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 font-semibold hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border px-3 py-2 text-xl md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenu ? "✕" : "☰"}
          </button>
        </nav>

        {mobileMenu && (
          <div className="space-y-1 border-t bg-white px-4 py-3 md:hidden">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Home
            </Link>
            <Link
              href="/All-property"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Properties
            </Link>
            <Link
              href="/agents"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Agents
            </Link>
            <Link
              href="/about"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Contact
            </Link>
            <Link
              href="/book-appointment"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}>Book Appointment</Link>
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="block rounded-lg px-3 py-2 font-semibold text-emerald-700 hover:bg-gray-100"
              onClick={() => setMobileMenu(false)}
            >
              Create Account
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=85')",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gray-950/65" />

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
          <div className="max-w-3xl">
            <p className="mb-5 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
              Find a place to call home
            </p>

            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Discover Your
              <span className="block text-emerald-300">
                Perfect Property
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-200 sm:text-lg">
              Explore houses, apartments, land and commercial properties
              across Nigeria. Your next property is just a few clicks away.
            </p>

            <form
              onSubmit={searchProperties}
              className="mt-10 grid gap-3 rounded-2xl bg-white p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="sm:col-span-2 lg:col-span-1">
                <label
                  htmlFor="keyword"
                  className="mb-1 block text-sm font-semibold text-gray-700"
                >
                  Location or keyword
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="e.g. Lekki, Lagos"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="purpose"
                  className="mb-1 block text-sm font-semibold text-gray-700"
                >
                  Property purpose
                </label>
                <select
                  id="purpose"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-600"
                >
                  <option value="ALL">Any purpose</option>
                  <option value="RENT">For rent</option>
                  <option value="SALES">For sale</option>
                  <option value="LEASE">For lease</option>
                  <option value="SHORTLET">Shortlet</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-1 block text-sm font-semibold text-gray-700"
                >
                  Property type
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-600"
                >
                  <option value="ALL">All types</option>
                  <option value="FLAT">Flat / Apartment</option>
                  <option value="DUPLEX">Duplex</option>
                  <option value="LAND">Land</option>
                  <option value="SHOP">Shop / Office</option>
                  <option value="WAREHOUSE">Warehouse</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800"
                >
                  Search Properties
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white">
              <span>✓ Homes for every budget</span>
              <span>✓ Multiple Nigerian cities</span>
              <span>✓ Simple property discovery</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="font-bold uppercase tracking-widest text-emerald-700">
            Browse by category
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            What Are You Looking For?
          </h2>
          <p className="mt-3 text-gray-600">
            Find the right kind of property for your needs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((item) => (
            <Link
              key={item.value}
              href={`/All-properties?category=${encodeURIComponent(item.value)}`}
              className="rounded-2xl border border-gray-200 p-6 text-center transition hover:-translate-y-1 hover:border-emerald-600 hover:shadow-lg"
            >
              <span className="text-4xl">{item.icon}</span>
              <h3 className="mt-4 font-bold">{item.name}</h3>
              <p className="mt-2 text-sm text-gray-500">
                Explore properties
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-bold uppercase tracking-widest text-emerald-700">
                Handpicked listings
              </p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Featured Properties
              </h2>
              <p className="mt-3 text-gray-600">
                Explore some example properties from our homepage.
              </p>
            </div>

            <Link
              href="/All-property"
              className="font-bold text-emerald-700 hover:text-emerald-900"
            >
              View All Properties →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <article
                key={property.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative">
                  <img
                    src={property.image}
                    alt={property.name}
                    className="h-56 w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">
                    {property.type}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-sm text-gray-500">
                    📍 {property.location}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{property.name}</h3>
                  <p className="mt-3 text-2xl font-extrabold text-emerald-700">
                    {formatPrice(property.price)}
                    {property.type === "FOR RENT" && (
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / year
                      </span>
                    )}
                    {property.type === "SHORTLET" && (
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / day
                      </span>
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-sm text-gray-600">
                    {property.beds > 0 && <span>🛏 {property.beds} Beds</span>}
                    {property.baths > 0 && (
                      <span>🛁 {property.baths} Baths</span>
                    )}
                    <span>📐 {property.area}</span>
                  </div>

                  <Link
                    href="/All-properties"
                    className="mt-5 block rounded-lg border border-emerald-700 px-4 py-3 text-center font-bold text-emerald-700 transition hover:bg-emerald-700 hover:text-white"
                  >
                    Explore Properties
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            These are sample listings for display. They are not fetched from
            your property API.
          </p>
        </div>
      </section>

      {/* CITIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="font-bold uppercase tracking-widest text-emerald-700">
            Explore locations
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Find Properties by City
          </h2>
          <p className="mt-3 text-gray-600">
            Start exploring popular property destinations in Nigeria.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cities.map((city) => (
            <Link
              key={city.name}
              href={`/All-property?search=${encodeURIComponent(city.name)}`}
              className="group relative isolate h-72 overflow-hidden rounded-2xl bg-gray-900"
            >
              <img
                src={city.image}
                alt={city.name}
                className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white">
                <h3 className="text-2xl font-extrabold">{city.name}</h3>
                <p className="mt-2 text-sm text-gray-200">
                  {city.description}
                </p>
                <span className="mt-4 inline-block font-bold">
                  Explore properties →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bg-emerald-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="font-bold uppercase tracking-widest text-emerald-700">
              Why HomeFind
            </p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              A Simpler Way to Find Property
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <span className="text-4xl">🔎</span>
              <h3 className="mt-4 text-xl font-bold">Easy Search</h3>
              <p className="mt-3 leading-7 text-gray-600">
                Browse listings by location, purpose and property category.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <span className="text-4xl">🏠</span>
              <h3 className="mt-4 text-xl font-bold">More Choices</h3>
              <p className="mt-3 leading-7 text-gray-600">
                Discover apartments, family homes, land and commercial spaces.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <span className="text-4xl">🤝</span>
              <h3 className="mt-4 text-xl font-bold">Connect with Agents</h3>
              <p className="mt-3 leading-7 text-gray-600">
                Find an agent to help you explore your next property.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AGENT CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-emerald-800 p-8 text-white sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="font-bold uppercase tracking-widest text-emerald-200">
              For property professionals
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Ready to List Your Property?
            </h2>
            <p className="mt-4 leading-7 text-emerald-50">
              Create an account to get started and manage your property
              listings.
            </p>
          </div>

          <Link
            href="/register"
            className="shrink-0 rounded-lg bg-white px-6 py-3.5 font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            Get Started Today →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Link href="/" className="text-2xl font-extrabold text-white">
              HomeFind<span className="text-orange-500">.</span>
            </Link>
            <p className="mt-4 max-w-xs leading-7 text-gray-400">
              Helping you discover your next home, land or commercial property
              across Nigeria.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white">Quick Links</h3>
            <div className="mt-4 space-y-3">
              <Link href="/" className="block hover:text-white">
                Home
              </Link>
              <Link
                href="/All-property"
                className="block hover:text-white"
              >
                Properties
              </Link>
              <Link href="/agents" className="block hover:text-white">
                Agents
              </Link>
              <Link href="/about" className="block hover:text-white">
                About Us
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white">Your Account</h3>
            <div className="mt-4 space-y-3">
              <Link href="/login" className="block hover:text-white">
                Login
              </Link>
              <Link href="/register" className="block hover:text-white">
                Create Account
              </Link>
              <Link href="/wishlist" className="block hover:text-white">
                My Wishlist
              </Link>
              <Link
                href="/my-appointments"
                className="block hover:text-white"
              >
                My Appointments
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white">Contact</h3>
            <div className="mt-4 space-y-3 text-gray-400">
              <p>Nigeria</p>
              <Link
                href="/contact"
                className="inline-block text-emerald-300 hover:text-white"
              >
                Contact our team →
              </Link>
              <Link
                href="/book-appointment"
                className="block hover:text-white">Book an Appointment</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-5 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} HomeFind. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

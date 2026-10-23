
"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="bg-[#f5f7f2] px-5 py-16 md:px-12 lg:px-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-4 font-semibold uppercase tracking-[0.2em] text-green-700">
              About HomeFind
            </p>

            <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Helping You Find a Place to Call Home.
            </h1>

            <p className="mb-8 max-w-xl text-base leading-8 text-gray-600 md:text-lg">
              Finding the right property should be simple.
              HomeFind connects people with properties, helping
              renters, buyers, property owners, and agents make
              their next move with greater confidence.
            </p>

            <Link
              href="/All-property"
              className="inline-block rounded-lg bg-green-800 px-7 py-4 font-semibold text-white transition hover:bg-green-900"
            >
              Explore Properties
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"
              alt="Beautiful modern home surrounded by greenery"
              className="h-[320px] w-full object-cover sm:h-[420px]"
            />
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="px-5 py-16 md:px-12 lg:px-20 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 font-semibold uppercase tracking-widest text-green-700">
            Who We Are
          </p>

          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            More Than Just Finding Property
          </h2>

          <p className="text-base leading-8 text-gray-600 md:text-lg">
            At HomeFind, we believe that every great journey
            begins with finding the right place. Whether you are
            searching for your first apartment, a family home,
            an investment property, or new clients for your
            property business, we aim to make the process easier.
            Our goal is to bring property seekers, owners, and
            agents together through one convenient platform.
          </p>
        </div>
      </section>

      {/* Mission and Vision */}
      <section className="bg-gray-50 px-5 py-16 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-8 shadow-sm md:p-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
              🎯
            </div>

            <h2 className="mb-4 text-2xl font-bold">
              Our Mission
            </h2>

            <p className="leading-8 text-gray-600">
              To make property discovery more accessible,
              convenient, and transparent by connecting people
              with suitable properties and the professionals
              who help them find their next home.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm md:p-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
              🏡
            </div>

            <h2 className="mb-4 text-2xl font-bold">
              Our Vision
            </h2>

            <p className="leading-8 text-gray-600">
              To become a trusted destination for property
              discovery, where finding a home or showcasing
              a property feels simpler, clearer, and more
              convenient for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="px-5 py-16 md:px-12 lg:px-20 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-3 font-semibold uppercase tracking-widest text-green-700">
              What Matters to Us
            </p>

            <h2 className="text-3xl font-bold sm:text-4xl">
              The Values Behind HomeFind
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="mb-5 block text-3xl">🤝</span>
              <h3 className="mb-3 text-xl font-bold">
                Trust & Transparency
              </h3>
              <p className="leading-7 text-gray-600">
                We want property seekers to have clear
                information that helps them make informed
                decisions.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="mb-5 block text-3xl">❤️</span>
              <h3 className="mb-3 text-xl font-bold">
                People First
              </h3>
              <p className="leading-7 text-gray-600">
                Every search represents a person, a family,
                or a business with its own needs and goals.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-7 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="mb-5 block text-3xl">🔎</span>
              <h3 className="mb-3 text-xl font-bold">
                Simpler Discovery
              </h3>
              <p className="leading-7 text-gray-600">
                We aim to make exploring properties and
                connecting with agents more convenient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-green-900 px-5 py-16 text-center text-white md:px-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 text-3xl font-bold sm:text-4xl">
            Your Next Home Starts Here
          </h2>

          <p className="mb-8 leading-8 text-green-100">
            Discover properties, explore your options, and
            take the next step towards a place that feels right
            for you.
          </p>

          <Link
            href="/All-property"
            className="inline-block rounded-lg bg-white px-7 py-4 font-semibold text-green-900 transition hover:bg-gray-100"
          >
            Find Your Next Home
          </Link>
        </div>
      </section>
    </main>
  );
}

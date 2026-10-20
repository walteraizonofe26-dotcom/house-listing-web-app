
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://property.reworkstaging.name.ng/v1";

function getAccount(value) {
  let account = value;

  for (let i = 0; i < 4 && account && typeof account === "object"; i++) {
    const nested =
      account.agent ||
      account.account ||
      account.user ||
      (account.data && !Array.isArray(account.data)
        ? account.data
        : null);

    if (!nested || nested === account) break;
    account = nested;
  }

  return account || {};
}

function getList(result) {
  if (Array.isArray(result)) return result;

  const candidates = [
    result?.data,
    result?.results,
    result?.properties,
    result?.appointments,
    result?.items,
    result?.data?.data,
    result?.data?.results,
    result?.data?.properties,
    result?.data?.appointments,
    result?.data?.items,
  ];

  return candidates.find(Array.isArray) || null;
}

function isCompleted(appointment) {
  const value =
    appointment?.completed ??
    appointment?.agent_completed ??
    appointment?.agentCompleted;

  return value === true || value === "true" || value === 1;
}

function isConfirmed(appointment) {
  const value =
    appointment?.confirmed ??
    appointment?.meeting_confirmed ??
    appointment?.meetingConfirmed ??
    appointment?.is_confirmed ??
    appointment?.isConfirmed ??
    appointment?.accepted;

  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

function getPropertyId(property) {
  return (
    property?.property_id ||
    property?.propertyId ||
    property?.id ||
    property?._id ||
    ""
  );
}

function getAppointmentId(appointment) {
  return (
    appointment?.appointment_id ||
    appointment?.appointmentId ||
    appointment?.id ||
    appointment?._id ||
    ""
  );
}

function getPropertyName(appointment) {
  const property =
    appointment?.property ||
    appointment?.property_details ||
    {};

  if (typeof property === "string") return property;

  return (
    property?.name ||
    property?.title ||
    appointment?.property_name ||
    "Property inspection"
  );
}

function getAppointmentDate(appointment) {
  const value = appointment?.date || appointment?.appointment_date;

  if (!value) return "Date not provided";

  if (/^\d{2}-\d{2}-\d{4}$/.test(String(value))) {
    return String(value);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(result, status) {
  return (
    result?.msg ||
    result?.message ||
    result?.error?.message ||
    `Request failed with status ${status}.`
  );
}

function StatCard({ title, value, description, color }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className={`mt-3 text-3xl font-bold ${color}`}>
        {value === null ? "—" : value}
      </p>

      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function NavigationCard({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
        {icon}
      </div>

      <h2 className="mt-4 text-lg font-bold text-gray-900 group-hover:text-blue-700">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {description}
      </p>

      <span className="mt-4 inline-block text-sm font-semibold text-blue-700">
        Open page →
      </span>
    </Link>
  );
}

export default function AgentDashboard() {
  const router = useRouter();

  const [account, setAccount] = useState(null);
  const [propertiesCount, setPropertiesCount] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const savedAccount = localStorage.getItem("account");

    if (!token || role?.toLowerCase() !== "agent") {
      router.replace("/login");
      return;
    }

    let parsedAccount = {};

    try {
      parsedAccount = savedAccount ? JSON.parse(savedAccount) : {};
    } catch {
      router.replace("/login");
      return;
    }

    const agent = getAccount(parsedAccount);
    setAccount(agent);

    const agentId =
      localStorage.getItem("agentId") ||
      agent.agent_id ||
      agent.agentId ||
      agent.id ||
      agent._id;

    if (!agentId) {
      setDashboardError(
        "Your agent ID could not be found. Please log out and log in again."
      );
      return;
    }

    setRefreshing(true);
    setDashboardError("");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const request = async (url) => {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(result, response.status));
      }

      if (
        result?.success === false ||
        result?.status === "error"
      ) {
        throw new Error(
          result?.msg || result?.message || "Request failed."
        );
      }

      return result;
    };

    const propertyParams = new URLSearchParams({
      agent: String(agentId),
    });

    const appointmentParams = new URLSearchParams({
      agent: String(agentId),
      page: "0",
      limit: "10",
    });

    const results = await Promise.allSettled([
      request(`${API}/properties?${propertyParams.toString()}`),
      request(`${API}/appointments?${appointmentParams.toString()}`),
      request(
        `${API}/agents/${encodeURIComponent(String(agentId))}/wishlist`
      ),
    ]);

    if (results[0].status === "fulfilled") {
      const list = getList(results[0].value);
      setPropertiesCount(list === null ? null : list.length);
    } else {
      setPropertiesCount(null);
    }

    if (results[1].status === "fulfilled") {
      const list = getList(results[1].value);
      setAppointments(list);
    } else {
      setAppointments(null);
    }

    if (results[2].status === "fulfilled") {
      const list = getList(results[2].value);
      setWishlistCount(list === null ? null : list.length);
    } else {
      setWishlistCount(null);
    }

    const failures = results.filter(
      (result) => result.status === "rejected"
    );

    if (failures.length === results.length) {
      setDashboardError(
        "Dashboard counts could not be loaded. You can still open each page to check its data."
      );
    } else if (failures.length > 0) {
      setDashboardError(
        "Some summary counts could not be loaded. Open the relevant page to check its data."
      );
    }

    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("account");
    localStorage.removeItem("agentId");
    localStorage.removeItem("agent");

    router.replace("/login");
  }

  if (!account) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading agent dashboard...</p>
      </main>
    );
  }

  const fullName =
    account.full_name ||
    account.fullName ||
    account.name ||
    "Agent";

  const completedCount =
    appointments === null
      ? null
      : appointments.filter(isCompleted).length;

  const pendingCount =
    appointments === null
      ? null
      : appointments.filter(
          (appointment) =>
            !isCompleted(appointment) && !isConfirmed(appointment)
        ).length;

  const recentAppointments =
    appointments === null
      ? []
      : [...appointments]
          .sort((a, b) => {
            const dateA = new Date(a.date || a.appointment_date || 0).getTime();
            const dateB = new Date(b.date || b.appointment_date || 0).getTime();

            return dateB - dateA;
          })
          .slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Agent workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              Agent Dashboard
            </h1>

            <p className="mt-3 text-gray-600">
              Welcome back, {fullName}! Manage your properties and customer
              appointments from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={refreshing}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh Dashboard"}
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        {dashboardError && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {dashboardError}
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Overview
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Summary of your current activity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="My Properties"
              value={propertiesCount}
              description="Properties returned by the API"
              color="text-blue-700"
            />

            <StatCard
              title="Appointments"
              value={appointments === null ? null : appointments.length}
              description="Appointments on the first page"
              color="text-purple-700"
            />

            <StatCard
              title="Awaiting Confirmation"
              value={pendingCount}
              description="Appointments not yet confirmed or completed"
              color="text-amber-700"
            />

            <StatCard
              title="Completed Meetings"
              value={completedCount}
              description="Completed appointments on the first page"
              color="text-green-700"
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Manage Your Account
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose a section to continue.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <NavigationCard
              href="/dashboard/agent/properties"
              icon="🏠"
              title="My Properties"
              description="View your property listings and their available details."
            />

            <NavigationCard
              href="/dashboard/agent/appointments"
              icon="📅"
              title="My Appointments"
              description="Review appointments, confirm meetings, and update completion."
            />

            <NavigationCard
              href="/dashboard/agent/wishlist"
              icon="❤️"
              title="My Wishlist"
              description="Browse properties saved to your wishlist."
            />

            <NavigationCard
              href="/dashboard/agent/profile"
              icon="👤"
              title="My Profile"
              description="View your account details and manage your profile image."
            />
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recent Appointments
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Your latest appointments returned by the API.
              </p>
            </div>

            <Link
              href="/dashboard/agent/appointments"
              className="font-semibold text-blue-700 hover:underline"
            >
              View all appointments →
            </Link>
          </div>

          {appointments === null ? (
            <p className="mt-6 rounded-lg bg-gray-50 p-5 text-sm text-gray-600">
              Recent appointments are unavailable right now. Open the
              appointments page to check them directly.
            </p>
          ) : recentAppointments.length === 0 ? (
            <p className="mt-6 rounded-lg bg-gray-50 p-5 text-sm text-gray-600">
              No appointments were returned for your account yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {recentAppointments.map((appointment, index) => {
                const id = getAppointmentId(appointment);
                const completed = isCompleted(appointment);
                const confirmed = isConfirmed(appointment);

                return (
                  <div
                    key={id || index}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getPropertyName(appointment)}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {getAppointmentDate(appointment)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        completed
                          ? "bg-green-100 text-green-700"
                          : confirmed
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {completed
                        ? "Completed"
                        : confirmed
                        ? "Confirmed"
                        : "Awaiting confirmation"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-gray-500">
          Agent Dashboard · Property Management
        </footer>
      </div>
    </main>
  );
}

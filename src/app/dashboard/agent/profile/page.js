
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://property.reworkstaging.name.ng/v1";

export default function AgentProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState({});
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfile = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const savedAccount = localStorage.getItem("account");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (role && role.toLowerCase() !== "agent") {
        router.replace("/dashboard/merchant");
        return;
      }

      let account = savedAccount ? JSON.parse(savedAccount) : {};

      // Handle different account response structures.
      for (let i = 0; i < 3; i++) {
        if (!account || typeof account !== "object") break;

        const nested =
          account.agent ||
          account.account ||
          account.user ||
          account.data;

        if (!nested || nested === account) break;
        account = nested;
      }

      setProfile(account);
      setAvatar(
        account.avatar ||
        account.profile_image ||
        account.image ||
        ""
      );
    } catch {
      setError("Unable to read your saved profile. Please log in again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveAvatar(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");

    const agentId =
      profile.agent_id ||
      profile.agentId ||
      profile.id ||
      profile._id ||
      localStorage.getItem("agentId");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!agentId) {
      setError(
        "Agent ID was not found. Please log in again and try once more."
      );
      return;
    }

    if (!avatar.trim()) {
      setError("Please enter an image URL or image filename.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/agents/${encodeURIComponent(agentId)}/resource`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatar: avatar.trim() }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.msg ||
          result.message ||
          "Unable to update your profile image."
        );
      }

      const updatedProfile = {
        ...profile,
        avatar: avatar.trim(),
      };

      setProfile(updatedProfile);
      localStorage.setItem("account", JSON.stringify(updatedProfile));
      setMessage("Profile image updated successfully.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading your profile...</p>
      </main>
    );
  }

  const fullName =
    profile.full_name ||
    profile.fullName ||
    profile.name ||
    "Agent";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/agent"
          className="mb-6 inline-block font-medium text-blue-700 hover:underline"
        >
          ← Back to Agent Dashboard
        </Link>

        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Profile
          </h1>

          <p className="mt-2 text-gray-600">
            View your account information and update your profile image.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 rounded-xl bg-gray-50 p-6 sm:flex-row sm:items-start">
            {avatar ? (
              <img
                src={avatar}
                alt="Agent profile"
                className="h-28 w-28 rounded-full border bg-white object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-700">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900">
                {fullName}
              </h2>
              <p className="mt-1 break-all text-gray-600">
                {profile.email || "Email not available"}
              </p>
              <p className="mt-1 text-gray-600">
                {profile.phone || profile.phone_number || "Phone not available"}
              </p>
              <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                Agent Account
              </span>
            </div>
          </div>

          <form onSubmit={saveAvatar} className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Update Profile Image
            </h2>

            <div>
              <label
                htmlFor="avatar"
                className="mb-2 block font-medium text-gray-700"
              >
                Image URL or filename
              </label>

              <input
                id="avatar"
                type="text"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="https://example.com/my-photo.jpg"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                required
              />

              <p className="mt-2 text-sm text-gray-500">
                This form sends the avatar value to the API as JSON.
                It does not upload a file from your computer.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-lg bg-green-50 p-3 text-green-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile Image"}
            </button>
          </form>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Account Details
            </h2>

            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500">Full Name</dt>
                <dd className="mt-1 break-words font-medium">
                  {fullName}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="mt-1 break-words font-medium">
                  {profile.email || "Not available"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="mt-1 break-words font-medium">
                  {profile.phone || profile.phone_number || "Not available"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">Agent ID</dt>
                <dd className="mt-1 break-all font-medium">
                  {profile.agent_id ||
                    profile.agentId ||
                    profile.id ||
                    profile._id ||
                    localStorage.getItem("agentId") ||
                    "Not available"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}

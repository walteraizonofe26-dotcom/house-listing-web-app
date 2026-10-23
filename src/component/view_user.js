
"use client";

import { useEffect, useState } from "react";

const API_BASE = "http://property.reworkstaging.name.ng/v1";

export default function View_Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getUsers() {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to view users.");
        }

        const response = await fetch(`${API_BASE}/users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.msg ||
              result.message ||
              "Unable to fetch users."
          );
        }

        // Support common API response formats.
        const userList = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.users)
          ? result.data.users
          : Array.isArray(result.users)
          ? result.users
          : null;

        if (!userList) {
          throw new Error(
            "The API response format is different from expected."
          );
        }

        setUsers(userList);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    getUsers();
  }, []);

  if (loading) {
    return <p className="mt-6 text-gray-500">Loading users...</p>;
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Registered Users
        </h2>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
          Total: {users.length}
        </span>
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">
          No users found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">S/N</th>
                <th className="p-3">First Name</th>
                <th className="p-3">Last Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.id || user._id || user.email || index}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">
                    {user.first_name || user.firstName || "-"}
                  </td>
                  <td className="p-3">
                    {user.last_name || user.lastName || "-"}
                  </td>
                  <td className="p-3">{user.email || "-"}</td>
                  <td className="p-3">{user.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

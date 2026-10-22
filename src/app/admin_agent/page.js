"use client";
import { useState } from "react";
import Upload_Property from "../../component/upload_property";
import Add_agent from "../../component/add_agent";
import View_Properties from "../../component/view_properties";
const MENU = [
  "Summary",
  "View Properties",
  "Upload Property",
  "Agents",
];

export default function AdminPage() {
  const [active, setActive] = useState("Summary");

  return (
    <div>
      {/* Top header */}
      <div className="border-b border-gray-200 p-3 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      <div className="flex flex-row">
        {/* Sidebar */}
        <div className="basis-1/4 border-r border-gray-200 p-4 min-h-screen">
          <h2 className="text-lg font-bold text-gray-900">NaijaHouses</h2>
          <p className="mb-6 text-xs text-gray-500">Admin for Agent</p>

          <ul className="flex flex-col gap-1">
            {MENU.map((item) => (
              <li key={item}>
                <button
                  onClick={() => setActive(item)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    active === item
                      ? "bg-gray-900 font-semibold text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="basis-3/4 border border-gray-200 p-6">
  <h1 className="text-2xl font-bold text-gray-900 mb-4">{active}</h1>

  {active === "Summary" && <p></p>}
  {active === "My Properties" && <View_Properties />}
  {active === "Upload Property" && <Upload_Property />}   
{active === "Agents" && <Add_agent />} 
</div>
      </div>
    </div>
  );
}
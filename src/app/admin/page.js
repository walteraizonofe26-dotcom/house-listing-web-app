
"use client";
import Upload_Property from "../../component/upload_property";
import View_Properties from "../../component/view_properties";
import Add_agent from "../../component/add_agent";
import View_Users from "../../component/view_user";

import Link from "next/link";

import { useState } from "react";

const MENU = ["Overview", "View Properties", "Agents", "Users", "Merchants", "Upload Property", ];

export default function AdminPage(){
    const [active, setActive] = useState("Overview");
    
    return(
        <div >
            
            <div className="text-center pt-2">
                <h1 className="text-2xl font-bold text-gray-900 border border-gray-200 p-2 outline-none">Admin Dashboard</h1>
            </div>
            <div className="flex flex-row">
                <div className="basis-1/4 border border-gray-200 p-4">
                 <h2 className="text-lg font-bold text-gray-900">NaijaHouses</h2>
                  <p className="text-xs text-gray-500 mb-6">Merchant Dashboard</p>

                 <ul className="flex flex-col gap-1">
                       {MENU.map((item) => (
                 <li key={item}>
                   <button
                  onClick={() => setActive(item)}
                   className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                   active === item
                   ? "bg-gray-900 text-white font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                         }`}
                       >
                    {item}
                    </button>
                        </li>
                      ))}
                 </ul>
                 </div>
               <div className="basis-3/4 border border-gray-200 p-6">
                  <h1 className="text-2xl font-bold text-gray-900">{active}</h1>
                
                      
{active === "Overview" && (
  <div className="space-y-6">
   

   

          
         
        </div>
      
      )}
               
                  {active === "Upload Property" && <Upload_Property />}
                 {active === "View Properties" && <View_Properties />}
                 
                  {active === "Agents" && <Add_agent />}
                  {active === "Users" && <View_Users />}

{active !== "Overview" &&
 active !== "View Properties" &&
 active !== "Upload Property" &&
 active !== "Agents" &&
 active !== "Users" && (
  <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500">
    The {active.toLowerCase()}
  </div>
)}
               </div>
            </div>
        </div>
    )
}
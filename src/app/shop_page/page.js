import { IoHome } from "react-icons/io5";
import { FaBookOpen } from "react-icons/fa";
import { MdPriceChange } from "react-icons/md";
import { FaHouseUser } from "react-icons/fa";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";


export default function Shop(){
    return(
        <div>
            <Nav />
            <section className="bg-gray-100 px-4 py-10 md:px-16 lg:px-24">
       <div className="mx-auto max-w-7xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="border-b border-gray-300">
        <h2 className="inline-block bg-red-700 px-5 py-3 text-lg text-white">New Hot Listing</h2>
        </div>
         <div className="grid grid-cols-4 gap-2">
            <div>
                <div>
                    <img src="/shop.png" alt="House 1" className="w-full h-auto" />
                </div>
                <div className="align-center text-center">
                    <h3 className="border-b-1 border-indigo-500 text-xl">FOUR BEDROOM FULLY DETACHED HOUSE PLUS BQ</h3>
                    <p className="border-b-1 border-indigo-500 ">At Chevron Drive, Lekki</p>
                    <h3 className="border-b-1 border-indigo-500 ">NGN 25,000,000</h3>
                    <h4 className="border-b-1 border-indigo-500 ">For Sale</h4>
                    <h4 className="border-b-1 border-indigo-500 ">BQ, packing space, swimming pool, balcony</h4>
                 <div className="flex pt-4 gap-4">
                    <img src="/firm4.png" className="w-[20px]" />
                     <h3>Chadwick Realtor</h3>
                 </div>
                </div>
            </div>
             <div>
                <div>
                    <img src="/shop.png" alt="House 1" className="w-full h-auto" />
                </div>
                <div className="align-center text-center">
                    <h3 className="border-b-1 border-indigo-500 text-xl">FOUR BEDROOM FULLY DETACHED HOUSE PLUS BQ</h3>
                    <p className="border-b-1 border-indigo-500 ">At Chevron Drive, Lekki</p>
                    <h3 className="border-b-1 border-indigo-500 ">NGN 25,000,000</h3>
                    <h4 className="border-b-1 border-indigo-500 ">For Sale</h4>
                    <h4 className="border-b-1 border-indigo-500 ">BQ, packing space, swimming pool, balcony</h4>
                 <div className="flex pt-4 gap-4">
                    <img src="/firm4.png" className="w-[20px]" />
                     <h3>Chadwick Realtor</h3>
                 </div>
                </div>
            </div>
             <div>
                <div>
                    <img src="/shop.png" alt="House 1" className="w-full h-auto" />
                </div>
                <div className="align-center text-center">
                    <h3 className="border-b-1 border-indigo-500 text-xl">FOUR BEDROOM FULLY DETACHED HOUSE PLUS BQ</h3>
                    <p className="border-b-1 border-indigo-500 ">At Chevron Drive, Lekki</p>
                    <h3 className="border-b-1 border-indigo-500 ">NGN 25,000,000</h3>
                    <h4 className="border-b-1 border-indigo-500 ">For Sale</h4>
                    <h4 className="border-b-1 border-indigo-500 ">BQ, packing space, swimming pool, balcony</h4>
                    <div className="flex pt-4 gap-4">
                    <img src="/firm4.png" className="w-[20px]" />
                     <h3>Chadwick Realtor</h3>
                 </div>
                </div>
            </div>
             <div>
                <div>
                    <img src="/shop.png" alt="House 1" className="w-full h-auto" />
                </div>
                <div className="align-center text-center">
                    <h3 className="border-b-1 border-indigo-500 text-xl">FOUR BEDROOM FULLY DETACHED HOUSE PLUS BQ</h3>
                    <p className="border-b-1 border-indigo-500 ">At Chevron Drive, Lekki</p>
                    <h3 className="border-b-1 border-indigo-500 ">NGN 25,000,000</h3>
                    <h4 className="border-b-1 border-indigo-500 ">For Sale</h4>
                    <h4 className="border-b-1 border-indigo-500 ">BQ, packing space, swimming pool, balcony</h4>
                 <div className="flex pt-4 gap-4">
                    <img src="/firm4.png" className="w-[20px]" />
                     <h3>Chadwick Realtor</h3>
                 </div>
                
                </div>

            </div>
             
         </div>

         <div className="mt-6  flex justify-center  ">
              <button className="rounded bg-red-700 px-8 py-3 font-semibold text-white hover:bg-red-800">
               View All
              </button>
        </div>
        <div className="grid grid-cols-5 text-center justify-center pt-4">
           <div className="border border-indigo-600 place-items-center  ">
           <IoHome   className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">3,411</h2>
            <p className="text-red-400">Homes for sale</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <FaBookOpen className="pt-4 w-[40px] h-[40px]" />
            <h2 className="pt-2">0</h2>
            <p className="text-red-400">Open houses</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">411</h2>
            <p className="text-red-400">Homes for lease</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
         <MdPriceChange className="pt-4 w-[40px] h-[40px]"  />
            <h2 className="pt-2">41</h2>
            <p className="text-red-400">Price Reduced</p>
           </div>
            <div className="border border-indigo-600 place-items-center  ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">3,701</h2>
            <p className="text-red-400">Homes for sale/lease</p>
           </div>
        </div>
        </div>
         
</section>
             <Footer />
        </div>

    );
}
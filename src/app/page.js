import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FaArrowLeftLong } from "react-icons/fa6";
// import Shop from "../app/shop_page/page";
import { FaHouseUser } from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { FaBookOpen } from "react-icons/fa";
import { MdPriceChange } from "react-icons/md";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <Nav />
      <section className="px-40 text-center relative bg-cover bg-center bg-no-repeat h-[350px] py-10" style={{ backgroundImage: `url('/hero.jpg')` }}  >
        <div className="text-4xl pb-2 text-white">FIND YOUR DREAM HOME.</div>
        <p className="pb-3 text-white">There are millions of home out there. Let's find the one that's the perfect one for you.  </p>
        <div className="bg-gray-600 align-center  justify-self-center px-10 py-10">
          <div className="flex justify-items-center pt-2 gap-2 align-center px-6">
            <div className="bg-black text-white px-10"><Link href="/shop_page"><h4>BUY</h4></Link></div>
            <div className="bg-black text-white px-10"><Link href="/shop_page"><h4>RENT</h4></Link></div>
            <div className="bg-black text-white px-10"><Link href="/shop_page"><h4>SHORT LET</h4></Link></div>
            <div className="bg-black text-white px-10"><Link href="/shop_page"><h4>PROJECTS</h4></Link></div>
          </div>
          <div className="flex p-4 gap-3">
          <input type="text" placeholder="Pls enter Area, Town, State" className="flex-1 p-3 rounded-sm outline-none bg-white"/>
          <button className="bg-red-600 text-white font-semibold px-6 rounded-sm whitespace-nowrap">Search Now</button>
          </div>
        </div>
      </section>

     <section className="bg-gray-100 px-4 py-10 md:px-16 lg:px-24">
       <div className="mx-auto max-w-7xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="border-b border-gray-300">
          <h2 className="inline-block bg-red-700 px-5 py-3 text-lg text-white">Top Agencies</h2>
          </div>

        <div className="grid grid-cols-2 gap-8 py-8 md:grid-cols-4 md:gap-5">
      {[
        { name: "Breepropertiesng", image: "/firm1.png" },
        { name: "Dayspring Concept", image: "/firm2.png" },
        { name: "The MLS Properties", image: "/firm3.png" },
        { name: "Ramos of Lagos Realty Ltd", image: "/firm4.png" },
      ].map((firm) => (
        <div
          key={firm.name}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-md">
            <img
              src={firm.image}
              alt={firm.name}
              className="h-full w-full object-contain"
            />
          </div>

          <h3 className="text-center text-base text-red-500">
            {firm.name}
          </h3>
        </div>
      ))}
    </div>
     <div className="flex items-center justify-center gap-6 pb-5 text-gray-800">
      <button className="font-semibold hover:text-red-600">1</button>
      <button className="hover:text-red-600">2</button>
      <button className="hover:text-red-600">3</button>
    </div>

    <div className="flex items-center justify-center gap-5 text-red-600">
      <button aria-label="Previous agencies" className="hover:text-red-800">
        <FaArrowLeftLong size={20} />
      </button>
      <button aria-label="Next agencies" className="hover:text-red-800">
        <FaLongArrowAltRight size={20} />
      </button>
    </div>

    <div className="mt-6 flex justify-center">
      <button className="rounded bg-red-700 px-8 py-3 font-semibold text-white hover:bg-red-800">
        View All
      </button>
    </div>

  </div>
     </section>
     {/* <Shop/> */}

     <section className="bg-gray-100 px-4 py-10 md:px-16 lg:px-24">
       <div className="mx-auto max-w-7xl border border-gray-200 bg-white p-5 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800">What Makes NaijaHouses The Preferred Choice</h1>

      </div>
      <div className="grid grid-cols-3  ">
         <div className="text-center border border-gray-200 bg-white p-5 shadow-sm place-items-center ">
          <FaHouseUser className="w-94" />
          <h3 className="text-2xl pb-2">Budget Conscious</h3>
          <p>We believe everyone should be able to rent a home without breaking the bank. Let us help you find rentals that fit within your budget.</p>
         </div>
          <div className="text-center border border-gray-200 bg-white p-5 shadow-sm place-items-center ">
          <FaHouseUser className="w-94" />
          <h3 className="text-2xl pb-2">Agents for Your Service</h3>
          <p>Advice from industry experts to help you make smart property decisions.</p>
         </div>
          <div className="text-center border border-gray-200 bg-white p-5 shadow-sm place-items-center ">
          <FaHouseUser className="w-94" />
          <h3 className="text-2xl pb-2">Best Price Guarantee</h3>
          <p>Why compromise? Let's find you a comfortable home where the amenities, appliances and services are all top of the line.</p>
         </div>
      </div>
     </section>
      <section className="px-40 text-center relative bg-cover bg-center bg-no-repeat h-[700px] py-10" style={{ backgroundImage: `url('/shop.png')` }} >
        <div  className=" bg-white px-4 py-5 md:px-10 lg:px-15">
          <h1 className="text-2xl text-center font-bold pt-4 pb-5">Blogs: Latest News & Advice</h1>
          <div className="grid grid-cols-4 gap-4 ">
            <div className="bg-gray-100 border border-gray-200 p-4 shadow-sm">
                 <div className=" shadow-sm">
                  <img src="/news.png" alt="Blog Image" className="py-4 px-4"/>
                 </div>
                 <div className="text-center">
                  <h3 className="text-red-500 font-bold pb-3">UPDC REIT Records 38% Yield as Nigerian Real Estate Funds End 2025 Strong</h3>
                  <p className="pb-3">Posted on 02/02/2026 11:00 AM | by NaijaHouses</p>
                  <p className="pb-2">Nigeria’s real estate mutual funds and Real Estate Investment Trusts (REITs) posted a...</p>
                  <button className="bg-red-400 text-white px-4 py-2">Read More</button>
                 </div>
            </div>
             <div className="bg-gray-100 border border-gray-200 p-4 shadow-sm">
                 <div className=" shadow-sm">
                  <img src="/news.png" alt="Blog Image" className="py-4 px-4"/>
                 </div>
                 <div className="text-center">
                  <h3 className="text-red-500 font-bold pb-3">UPDC REIT Records 38% Yield as Nigerian Real Estate Funds End 2025 Strong</h3>
                  <p className="pb-3">Posted on 02/02/2026 11:00 AM | by NaijaHouses</p>
                  <p className="pb-2">Nigeria’s real estate mutual funds and Real Estate Investment Trusts (REITs) posted a...</p>
                  <button className="bg-red-400 text-white px-4 py-2">Read More</button>
                 </div>
            </div>
             <div className="bg-gray-100 border border-gray-200 p-4 shadow-sm">
                 <div className=" shadow-sm">
                  <img src="/news.png" alt="Blog Image" className="py-4 px-4"/>
                 </div>
                 <div className="text-center">
                  <h3 className="text-red-500 font-bold pb-3">UPDC REIT Records 38% Yield as Nigerian Real Estate Funds End 2025 Strong</h3>
                  <p className="pb-3">Posted on 02/02/2026 11:00 AM | by NaijaHouses</p>
                  <p className="pb-2">Nigeria’s real estate mutual funds and Real Estate Investment Trusts (REITs) posted a...</p>
                  <button className="bg-red-400 text-white px-4 py-2">Read More</button>
                 </div>
            </div>
             <div className="bg-gray-100 border border-gray-200 p-4 shadow-sm">
                 <div className=" shadow-sm">
                  <img src="/news.png" alt="Blog Image" className="py-4 px-4"/>
                 </div>
                 <div className="text-center">
                  <h3 className="text-red-500 font-bold pb-3">UPDC REIT Records 38% Yield as Nigerian Real Estate Funds End 2025 Strong</h3>
                  <p className="pb-3">Posted on 02/02/2026 11:00 AM | by NaijaHouses</p>
                  <p className="pb-2">Nigeria’s real estate mutual funds and Real Estate Investment Trusts (REITs) posted a...</p>
                  <button className="bg-red-400 text-white px-4 py-2">Read More</button>
                 </div>
            </div>
          </div>
        </div>
      </section>
       <section className="bg-gray-100 px-4 py-10 md:px-16 lg:px-24">
       <div className="mx-auto max-w-7xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="border-b border-gray-300">
          <h2 className="inline-block bg-red-700 px-5 py-3 text-lg text-white">Top Agents</h2>
          </div>

        <div className="grid grid-cols-2 gap-8 py-8 md:grid-cols-4 md:gap-5">
      {[
        { name: "Breepropertiesng", image: "/firm1.png" },
        { name: "Dayspring Concept", image: "/firm2.png" },
        { name: "The MLS Properties", image: "/firm3.png" },
        { name: "Ramos of Lagos Realty Ltd", image: "/firm4.png" },
      ].map((firm) => (
        <div
          key={firm.name}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-md">
            <img
              src={firm.image}
              alt={firm.name}
              className="h-full w-full object-contain"
            />
          </div>

          <h3 className="text-center text-base text-red-500">
            {firm.name}
          </h3>
        </div>
      ))}
    </div>
     
    <div className="mt-6 flex justify-center">
      <button className="rounded bg-red-700 px-8 py-3 font-semibold text-white hover:bg-red-800">
        View All
      </button>
    </div>

  </div>
     </section>
     <section className="px-40 text-center relative bg-cover bg-center bg-no-repeat h-[350px] py-10" style={{ backgroundImage: `url('/buq.jpg')` }}>
      <p className="text-2xl font-bold text-white pb-4 pt-10">FIND YOUR NEIGHBORHOOD</p>
      <p className="text-white">
        Does it have pet-friendly rentals? What are the crime rates? How are the schools? Get important local information on the area you’re most interested in.
      </p>
     <div className="flex p-4 gap-3">
          <input type="text" placeholder="Pls enter Area, Town, State" className="flex-1 p-3 rounded-sm outline-none bg-white"/>
          <button className="bg-red-600 text-white font-semibold px-6 rounded-sm whitespace-nowrap">Search Local</button>
      </div>
     </section>
     <div className="px-30 pb-5">
      <div className="grid grid-cols-4 text-center justify-center pt-4">
           <div className="border border-gray-400 place-items-center shadow-sm ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">41</h2>
            <p className="">State</p>
           </div>
            <div className="border border-gray-400 place-items-center shadow-sm ">
           <FaBookOpen className="pt-4 w-[40px] h-[40px]" />
            <h2 className="pt-2">77</h2>
            <p className="">Towns</p>
           </div>
            <div className="border border-gray-400 place-items-center shadow-sm ">
           <IoHome  className="pt-4 w-[40px] h-[40px]"/>
            <h2 className="pt-2">411</h2>
            <p className="">Agents</p>
           </div>
            <div className="border border-gray-400 place-items-center shadow-sm ">
         <MdPriceChange className="pt-4 w-[40px] h-[40px]"  />
            <h2 className="pt-2">61</h2>
            <p className="">Agencies</p>
           </div>
          
        </div>
     </div>
     <section className="bg-black px-15 py-4">
      <div className="grid grid-cols-2">
        <div><h1 className="text-white text-3xl text-center justify-content pt-4"> Subscribe To Our Newsletter</h1></div>
        <div className="flex p-4 gap-3">
          <input type="text" placeholder="Enter your email" className="flex-1 p-3 rounded-sm outline-none bg-white"/>
          <button className="bg-red-600 text-white font-semibold px-6 rounded-sm whitespace-nowrap">Subscribe</button>
      </div>
      </div>
     </section>
     <Footer/>
    </div>
      
  );
}


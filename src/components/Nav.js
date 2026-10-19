import Link from "next/link";
import Image from "next/image";


import { MdAccountCircle, MdOutlineAccountCircle } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { FaFacebookSquare } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa";
import { IoLogoLinkedin } from "react-icons/io";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaSquareWhatsapp } from "react-icons/fa6";
import { FaInstagramSquare } from "react-icons/fa";
import { FaSquarePinterest } from "react-icons/fa6";



export default function Nav() {
  return (
    <nav className=" bg-white">
  <div className=" flex bg-black ">
    <div className="flex justify-between items-center w-full mx-10">
        <div className="flex gap-6 p-4">
        <Link href="/login" className="flex items-center gap-2 text-white">
          <MdAccountCircle size={14} />
          <span>Login</span>
        </Link>
        <Link href="/register" className="flex items-center gap-2 text-white">
          <MdOutlineAccountCircle size={14} />
          <span>Register</span>
        </Link>
      </div>
   <div className="flex gap-4 items-center">
      <div className="flex border border-white text-white gap-4 w-[300px] justify-center items-center ">
        <FaPhoneAlt className="text-white" />
        <span>feel free to call</span>
        <span>09056000005</span>
      </div>
      <div className="text-white flex gap-4 justify-center items-center">
        <FaFacebookSquare />
        <FaTwitter />
        <IoLogoLinkedin />
        <FaSquareXTwitter />
        <FaSquareWhatsapp />
        <FaInstagramSquare />
        <FaSquarePinterest />
      </div>
      <div className="border border-white text-white gap-4 w-[70px] justify-center items-center ">
        <select className="text-white bg-black">
            <option>NGN</option>
            <option className="">USD</option>
        </select>
      </div>
   </div>
   
    </div>
   
     
  </div>
 <div className="flex justify-between items-center w-full mx-10 py-4">
     <div>
       <Image src="/logo.png" alt="My logo" width={200} height={100} />
     </div>
  <div>
    <ul className="flex gap-6 justify-center items-center text-black font-bold mx-20 cursor-pointer">
        <li>BUY</li>
        <li>SELL</li>
        <li>RENT</li>
        <li>FIND AGENT</li>
        <li>NEWS & ADVICES</li>
        <li>CONTACT US</li>
    </ul>
  </div>
 </div>
    </nav>
  );
}
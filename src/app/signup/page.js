import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { CiLock } from "react-icons/ci";
import { MdAddAlert } from "react-icons/md";
import { MdOutlineSyncAlt } from "react-icons/md";
import { CiCircleList } from "react-icons/ci";

export default function Signup(){
    return(
        <section>
        <Nav />
        <div className="align-center text-center px-63">
        <h1 className="text-3xl font-bold mb-4">Register Your Account</h1>
        <p className="pb-5" >New user? Please take a min to fill in your information. You will only have to do this once. We promise!</p>
        <div className="pb-4 flex gap-4  align-center justify-center pt-4 border-b-2 border-gray-500 border-t-2 border-gray-500">
          <CiLock  className="text-2xl text-red-600 "/>
          <h3> Save Favorites</h3>
          <MdAddAlert  className="text-2xl text-red-600 " />
          <h3> Get Alerts</h3>
          <MdOutlineSyncAlt  className="text-2xl text-red-600 " />
          <h3>Sync Devices</h3>
          <CiCircleList  className="text-2xl text-red-600  " />
          <h3>Adding Listing</h3>

        </div>
        </div>
        
       <div className="">
         <form className="px-60 py-10">
          <label htmlFor="userType" className="block mb-1">
            User Type<span className="text-red-600">*</span>
          </label>
          <select id="userType" className="w-full border border-gray-400 p-2 rounded-sm">
            <option value="">Select User type</option>
            <option value="seller">Seller</option>
            <option value="buyer">Buyer</option>
            <option value="agent">Agent</option>
            <option value="agency">Agency</option>
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            <div>
              <label htmlFor="firstName" className="block mb-1">First Name<span className="text-red-600">*</span></label>
              <input id="firstName" name="firstName" placeholder="First Name" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
            <div>
              <label htmlFor="lastName" className="block mb-1">Last Name<span className="text-red-600">*</span></label>
              <input id="lastName" name="lastName" placeholder="Last Name" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
            <div>
              <label htmlFor="email" className="block mb-1">Email<span className="text-red-600">*</span></label>
              <input id="email" name="email" type="email" placeholder="Email Address" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
            <div>
              <label htmlFor="mobile" className="block mb-1">Mobile1<span className="text-red-600">*</span></label>
              <input id="mobile" name="mobile" type="tel" placeholder="Mobile Number" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1">Password<span className="text-red-600">*</span></label>
              <input id="password" name="password" type="password" placeholder="Password" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1">Confirm Password<span className="text-red-600">*</span></label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm Password" className="w-full border border-gray-400 p-2 rounded-sm" />
            </div>
          </div>
            <div className="text-center">
                 <button type="submit" className="mt-6 bg-red-700 hover:bg-red-800 text-white px-8 py-3 rounded-sm ">Sign up</button>
            </div>
         <div className="text-center pt-4">
            <h1>Already Registered user? <a className="text-red-400 cursor-pointer">Login</a></h1>
         </div>
        </form>
       </div>
        
        <Footer />
        </section>
        
    );
}
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";

export default function AppShell() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Fixed Sidebar with new design */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 ml-[256px] flex flex-col">
        {/* Blue Top Navbar */}
        <div className="bg-[#1e3a8a] text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Ascent Transport</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <ProfileDropdown user={user} />
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="bg-white shadow-card p-8 min-h-[calc(100vh-120px)] rounded-none">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

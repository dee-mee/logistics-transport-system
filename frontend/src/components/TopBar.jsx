import { Search, Bell, MoreVertical } from 'lucide-react';

function TopBar({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {/* Page Title + Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      
      {/* Right Side Cluster */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-64"
          />
        </div>
        
        {/* Notification Bell */}
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-status-red rounded-full border-2 border-white"></span>
        </button>
        
        {/* User Profile Chip */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-medium text-sm">
            SM
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-navy">Sam Morison</div>
            <div className="text-xs text-gray-500">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
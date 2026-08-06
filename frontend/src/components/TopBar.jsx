import { Search, Bell, MoreVertical } from 'lucide-react';

function TopBar({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" title="Notifications">
          <Bell size={20} className="text-gray-600" />
        </button>
        
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

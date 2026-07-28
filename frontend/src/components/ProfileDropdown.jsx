import { useState } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProfileDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <User size={16} className="text-[#1e3a8a]" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium">{user?.username || 'User'}</div>
          <div className="text-xs text-white/70 capitalize">{user?.role || 'Admin'}</div>
        </div>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              <div className="border-t my-2" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfileDropdown;
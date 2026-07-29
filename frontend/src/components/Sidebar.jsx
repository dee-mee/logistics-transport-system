import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Route, 
  Map, 
  AlertTriangle, 
  Fuel,
  Wrench,
  Bell,
  Users,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    operations: true,
    fleet: true,
    management: true,
    reports: false
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => location.pathname === path;

  // Role-based menu access
  const hasMenuAccess = (item) => {
    if (!user) return false;
    
    // Django superuser and staff have access to everything
    if (user.is_superuser || user.is_staff) return true;
    
    // Check custom role field
    if (!user?.role) return false;
    
    const role = user.role.toLowerCase();
    
    // Admin has access to everything
    if (role === 'admin' || role === 'owner') return true;
    
    // Dispatcher access
    if (role === 'dispatcher') {
      const dispatcherMenus = [
        '/dashboard', '/shipments', '/trips', '/live-map', '/alerts',
        '/fleet', '/fuel', '/maintenance', '/reports'
      ];
      return dispatcherMenus.includes(item.path);
    }
    
    // Driver access
    if (role === 'driver') {
      const driverMenus = [
        '/dashboard', '/trips', '/live-map', '/alerts', '/fuel', '/profile'
      ];
      return driverMenus.includes(item.path);
    }
    
    // Customer access
    if (role === 'customer') {
      const customerMenus = [
        '/dashboard', '/shipments', '/live-map', '/alerts', '/profile'
      ];
      return customerMenus.includes(item.path);
    }
    
    return false;
  };

  const menuSections = [
    {
      id: 'main',
      title: 'Main',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        { path: '/shipments', icon: Package, label: 'Shipments' },
        { path: '/trips', icon: Route, label: 'Trips' },
        { path: '/live-map', icon: Map, label: 'Live Map' },
        { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
      ]
    },
    {
      id: 'fleet',
      title: 'Fleet Management',
      items: [
        { path: '/fleet', icon: Truck, label: 'Fleet Overview' },
        { path: '/fuel', icon: Fuel, label: 'Fuel Management' },
        { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
      ]
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        { path: '/users', icon: Users, label: 'Users' },
        { path: '/organization', icon: Building2, label: 'Organization' },
        { path: '/documents', icon: FileText, label: 'Documents' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      items: [
        { path: '/reports', icon: FileText, label: 'Reports' },
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      items: [
        { path: '/profile', icon: User, label: 'Profile' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  // Filter menu items based on user role
  const filteredMenuSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(hasMenuAccess)
  })).filter(section => section.items.length > 0);

  return (
    <div className="w-64 bg-[#1e3a8a] flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Truck className="text-[#1e3a8a]" size={20} />
          </div>
          <span className="text-white font-semibold text-lg">LogisticsPro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredMenuSections.map((section) => (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <span>{section.title}</span>
              {expandedSections[section.id] ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            
            {expandedSections[section.id] && (
              <div className="mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                        isActive(item.path)
                          ? 'bg-white text-[#1e3a8a] font-medium'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Section - Integrated into sidebar */}
      <div className="mt-auto border-t border-white/10">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
              {user?.first_name?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.username || 'User'}
              </div>
              <div className="text-white/60 text-xs capitalize">
                {user?.is_superuser ? 'Superuser' : user?.is_staff ? 'Staff' : user?.role || 'Administrator'}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
            >
              <User size={16} />
              View Profile
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
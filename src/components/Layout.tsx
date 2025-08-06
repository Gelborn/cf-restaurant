import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Package, 
  Gift, 
  Heart, 
  User, 
  LogOut,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, removeToast } = useToast();

  React.useEffect(() => {
    fetchRestaurantName();
  }, [session]);

  const fetchRestaurantName = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data } = await supabase
        .from('restaurants')
        .select('name')
        .eq('user_id', session.user.id)
        .single();
      
      if (data) {
        setRestaurantName(data.name);
      }
    } catch (error) {
      console.error('Error fetching restaurant name:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/items', label: 'Items', icon: Package },
    { path: '/packages', label: 'Pacotes', icon: Gift },
    { path: '/donations', label: 'Doações', icon: Heart },
    { path: '/profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex-1 flex justify-center">
            <img 
              src="https://connectingfood.com/wp-content/uploads/2023/05/logo-CF.png" 
              alt="Connecting Food" 
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 mb-1 rounded-lg text-left transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3 mt-8 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Sair
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {restaurantName ? `Bem-vindo, ${restaurantName}` : 'Bem-vindo ao painel de controle'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4">
          <Outlet />
        </main>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default Layout;
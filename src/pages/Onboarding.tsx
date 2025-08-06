import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Onboarding: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cep: ''
  });
  
  const { session, checkRestaurantStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Onboarding - session:', session?.user?.email);
    checkUserStatus();
  }, [session]);

  const checkUserStatus = async () => {
    if (!session?.user?.id) {
      console.log('No session, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      // Use the auth context to check restaurant status
      const hasRestaurant = await checkRestaurantStatus();
      
      if (hasRestaurant) {
        // Já tem restaurante cadastrado, vai para dashboard
        console.log('Restaurant found, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }


      // Não tem restaurante, continua no onboarding
      console.log('No restaurant found, staying on onboarding');
      setLoading(false);
    } catch (error) {
      console.error('Error checking user status:', error);
      setError('Erro ao verificar status do usuário');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('register_restaurant', {
        body: {
          name: formData.name,
          phone: formData.phone,
          cep: formData.cep
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao registrar restaurante');
      }

      console.log('Restaurante cadastrado:', data);
      // Sucesso, redirecionar para dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error registering restaurant:', error);
      setError(error.message || 'Erro ao completar cadastro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Left side - Image/Illustration */}
        <div 
          className="hidden lg:flex lg:w-3/5 relative overflow-hidden"
          style={{
            backgroundImage: 'url(/bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(179, 91, 39, 0.20) 0%, rgba(179, 91, 39, 0.25) 50%, rgba(150, 76, 33, 0.30) 100%)'
          }}></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white w-full h-full text-center animate-fade-in">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4 leading-tight drop-shadow-lg">
                Finalize seu cadastro
              </h1>
              <p className="text-xl opacity-95 drop-shadow-md">
                Conecte seu restaurante à nossa rede solidária
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-8 lg:pl-12 relative">
          {/* Logo positioned in top right corner */}
          <div className="absolute top-8 right-8 transition-transform hover:scale-105">
            <img 
              src="https://connectingfood.com/wp-content/uploads/2023/05/logo-CF.png" 
              alt="Connecting Food" 
              className="h-8 w-auto drop-shadow-sm"
            />
          </div>
          
          <div className="w-full max-w-md">
            <div className="text-left mb-8">
              <p className="text-sm text-gray-500 mb-2 font-light tracking-wide">
                Finalizar cadastro
              </p>
              <h2 className="text-3xl font-light text-gray-900 mb-3 tracking-tight transition-all duration-300">
                Quase lá!
              </h2>
              <p className="text-gray-700 font-light">
                Precisamos de algumas informações sobre seu restaurante
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 tracking-wide">
                  <User size={16} className="inline mr-2" />
                  Nome do Restaurante
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-light transition-all duration-300"
                    placeholder="Digite o nome do restaurante"
                  />
                  <User size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 tracking-wide">
                  <Phone size={16} className="inline mr-2" />
                  Telefone
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-light transition-all duration-300"
                    placeholder="(11) 99999-9999"
                  />
                  <Phone size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-2 tracking-wide">
                  <MapPin size={16} className="inline mr-2" />
                  CEP
                </label>
                <div className="relative">
                  <input
                    id="cep"
                    name="cep"
                    type="text"
                    required
                    value={formData.cep}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-light transition-all duration-300"
                    placeholder="00000-000"
                  />
                  <MapPin size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Finalizando cadastro...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Finalizar cadastro</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-left">
              <p className="text-sm text-gray-600 font-light">
                Ao finalizar, você será redirecionado para o dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </>
  );
};

export default Onboarding;
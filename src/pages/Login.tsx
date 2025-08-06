import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  
  const { signInWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('📧 Starting OTP signin process...');

    try {
      await signInWithOtp(formData.email);
      console.log('✅ OTP sent successfully');
      setShowEmailSent(true);
    } catch (error: any) {
      console.error('❌ OTP error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Signups not allowed') || 
          error.message?.includes('signup') || 
          error.message?.includes('User not found') ||
          error.message?.includes('Invalid login credentials')) {
        setError('Este e-mail não está cadastrado no sistema. Entre em contato com o suporte para obter acesso.');
      } else if (error.message?.includes('Email rate limit exceeded')) {
        setError('Muitas tentativas de envio. Aguarde alguns minutos antes de tentar novamente.');
      } else {
        setError(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Validate email in real time
    if (e.target.name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValid(emailRegex.test(e.target.value));
    }
  };

  // Email sent confirmation screen
  if (showEmailSent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <CheckCircle size={80} className="mx-auto mb-4 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Verifique seu e-mail</h1>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <Mail size={48} className="mx-auto mb-4 text-blue-600" />
            <p className="text-lg text-gray-700 mb-2">
              Enviamos um link de acesso para:
            </p>
            <p className="font-semibold text-blue-600 mb-4">{formData.email}</p>
            <p className="text-gray-600">
              Clique no link do e-mail para fazer login automaticamente.
            </p>
          </div>

          <button
            onClick={() => {
              setShowEmailSent(false);
              setFormData({ email: '' });
            }}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Tentar com outro e-mail
          </button>
        </div>
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
              Conectando restaurantes e organizações sociais
            </h1>
            <p className="text-xl opacity-95 drop-shadow-md">
              Transformando excedentes em esperança
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
              Acesso à plataforma
            </p>
            <h2 className="text-3xl font-light text-gray-900 mb-3 tracking-tight transition-all duration-300">
              Bem-vindo de volta
            </h2>
            <p className="text-gray-700 font-light">
              Digite seu email para receber um link de acesso
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 tracking-wide">
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={`w-full px-4 py-3 pl-12 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 font-light transition-all duration-300 ${
                    emailFocused 
                      ? 'border-blue-400 focus:ring-blue-500 shadow-lg bg-white' 
                      : emailValid 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 bg-white'
                  }`}
                  placeholder="seu@email.com"
                />
                <Mail size={18} className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ${
                  emailFocused ? 'text-blue-500' : emailValid ? 'text-green-500' : 'text-gray-400'
                }`} />
                {emailValid && (
                  <CheckCircle size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-light tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Enviando link...</span>
                </div>
              ) : 'Enviar link de acesso'}
            </button>
          </form>

          <div className="mt-6 text-left">
            <p className="text-sm text-gray-600 font-light">
              Você receberá um e-mail com um link seguro para fazer login.
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

export default Login;
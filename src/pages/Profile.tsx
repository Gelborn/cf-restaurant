import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Restaurant } from '../types';
import { useToast } from '../hooks/useToast';

const Profile: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session?.user.id)
        .single();

      if (error) throw error;
      
      if (!data) {
        console.error('Restaurant not found for user');
        return;
      }
      
      setRestaurant(data);
      setFormData({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address || ''
      });
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      console.error('No authenticated user');
      return;
    }
    
    setSaving(true);

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        })
        .eq('user_id', session?.user.id);

      if (error) throw error;
      
      await fetchRestaurant();
      showSuccess('Perfil atualizado!', 'Suas informações foram salvas com sucesso.');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Erro ao atualizar perfil', 'Tente novamente em alguns instantes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <User className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={16} className="inline mr-2" />
                  Nome do Restaurante
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={16} className="inline mr-2" />
                  Telefone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={16} className="inline mr-2" />
                  Endereço
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {restaurant && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Informações da Conta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">ID do Usuário</p>
              <p className="font-mono text-sm">{restaurant.user_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ID do Restaurante</p>
              <p className="font-mono text-sm">{restaurant.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
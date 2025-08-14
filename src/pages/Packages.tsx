import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Filter, Package, Calendar, Clock, AlertTriangle, Trash2, X, CheckCircle, Heart, Construction } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package as PackageType, Item } from '../types';
import { useToast } from '../hooks/useToast';
import { formatWeight, formatNumber } from '../utils/formatters';

interface PackageWithItem extends PackageType {
  item: Item;
}

const Packages: React.FC = () => {
  const [packages, setPackages] = useState<PackageWithItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    label_code: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    item_id: '',
    quantity: '',
    label_code: ''
  });
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchPackages(), fetchItems()]);
  };

  const fetchPackages = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!restaurant) {
        console.error('Restaurant not found for user');
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          item:items(*)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!restaurant) return;

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const validateForm = () => {
    const errors = {
      item_id: '',
      quantity: '',
      label_code: ''
    };

    if (!formData.item_id) {
      errors.item_id = 'Item é obrigatório';
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      errors.quantity = 'Quantidade deve ser maior que 0';
    }

    if (!formData.label_code.trim()) {
      errors.label_code = 'Código da etiqueta é obrigatório';
    } else {
      // Check if label code already exists
      const existingPackage = packages.find(pkg => 
        pkg.label_code.toLowerCase().trim() === formData.label_code.toLowerCase().trim()
      );
      if (existingPackage) {
        errors.label_code = 'Este código de etiqueta já existe';
      }
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!session?.user?.id) return;
    
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!restaurant) throw new Error('Restaurant not found');

      const selectedItem = items.find(item => item.id === formData.item_id);
      if (!selectedItem) throw new Error('Item not found');

      const quantity = parseFloat(formData.quantity);
      let totalKg = 0;

      if (selectedItem.unit === 'kg') {
        totalKg = quantity;
      } else if (selectedItem.unit === 'unit' && selectedItem.unit_to_kg) {
        totalKg = quantity * selectedItem.unit_to_kg;
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedItem.validity_days);

      const { error } = await supabase
        .from('packages')
        .insert({
          restaurant_id: restaurant.id,
          item_id: formData.item_id,
          quantity,
          total_kg: totalKg,
          label_code: formData.label_code.trim(),
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;
      
      setShowModal(false);
      setFormData({ item_id: '', quantity: '', label_code: '' });
      setValidationErrors({ item_id: '', quantity: '', label_code: '' });
      fetchPackages();
      showSuccess('Pacote criado!', 'O novo pacote foi adicionado ao estoque.');
    } catch (error) {
      console.error('Error creating package:', error);
      showError('Erro ao criar pacote', 'Tente novamente em alguns instantes.');
    }
  };

  const handleDiscard = async (packageId: string) => {
    if (!confirm('Tem certeza que deseja descartar este pacote?')) return;

    try {
      const { error } = await supabase
        .from('packages')
        .update({ status: 'discarded' })
        .eq('id', packageId);

      if (error) throw error;
      
      fetchPackages();
      showSuccess('Pacote descartado!', 'O pacote foi marcado como descartado.');
    } catch (error) {
      console.error('Error discarding package:', error);
      showError('Erro ao descartar pacote', 'Tente novamente em alguns instantes.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'awaiting_acceptance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'picked_up':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'donated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'discarded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'Em Estoque';
      case 'awaiting_acceptance':
        return 'Aguardando Aceite';
      case 'picked_up':
        return 'Coletado';
      case 'donated':
        return 'Doado';
      case 'discarded':
        return 'Descartado';
      default:
        return status;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return { text: 'Vencido', isExpired: true, isUrgent: false };
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const isUrgent = diffDays <= 1; // 1 dia ou menos
    
    if (diffDays > 0) {
      return { 
        text: `${diffDays}d ${diffHours}h`, 
        isExpired: false, 
        isUrgent 
      };
    } else {
      return { 
        text: `${diffHours}h`, 
        isExpired: false, 
        isUrgent: true 
      };
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = 
      pkg.label_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.item?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Separate packages by status
  const inStockPackages = filteredPackages.filter(pkg => pkg.status === 'in_stock');
  const discardedPackages = filteredPackages.filter(pkg => pkg.status === 'discarded');

  // Package Card Component
  const PackageCard: React.FC<{ package: PackageWithItem; showDiscardButton?: boolean }> = ({ 
    package: pkg, 
    showDiscardButton = false 
  }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {/* Status no topo */}
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs border mb-3 ${getStatusColor(pkg.status)}`}>
          <span>{getStatusText(pkg.status)}</span>
        </div>

        {/* Conteúdo principal */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">{pkg.item?.name}</h3>
          <p className="text-sm text-gray-600 mb-3">Código: {pkg.label_code}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Quantidade:</span>
            <span className="font-medium">{formatNumber(pkg.quantity)} {pkg.item?.unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Peso total:</span>
            <span className="font-medium">{formatWeight(pkg.total_kg)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Criado:</span>
            <span>{new Date(pkg.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Validade:</span>
            <span className="font-medium">{new Date(pkg.expires_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Ações na parte inferior */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
          {showDiscardButton ? (
            <>
              <button
                onClick={() => handleDiscard(pkg.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remover
              </button>
              <button
                onClick={() => setShowComingSoonModal(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver etiqueta
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={() => setShowComingSoonModal(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver etiqueta
              </button>
            </div>
          )}
        </div>
      </div>
    );
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pacotes / Estoque</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowComingSoonModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Heart size={20} />
            <span>Doar Pacotes</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Novo Pacote</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por código ou nome do item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">Todos os Status</option>
            <option value="in_stock">Em Estoque</option>
            <option value="awaiting_acceptance">Aguardando Aceite</option>
            <option value="donated">Doado</option>
            <option value="discarded">Descartado</option>
          </select>
        </div>
      </div>

      {/* Em Estoque Section */}
      {inStockPackages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Package className="text-green-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-green-700">
                Em Estoque ({inStockPackages.length})
              </h2>
              <p className="text-sm text-green-600">
                Disponíveis para doação
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inStockPackages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} showDiscardButton={true} />
            ))}
          </div>
        </div>
      )}

      {/* Pacotes Vencidos Section */}
      {discardedPackages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-700">
                Pacotes Vencidos ({discardedPackages.length})
              </h2>
              <p className="text-sm text-red-600">
                Pacotes que venceram e devem ser descartados
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discardedPackages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pacote encontrado</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Crie seu primeiro pacote para começar.'
            }
          </p>
        </div>
      )}

      {/* Create Package Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Novo Pacote</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ item_id: '', quantity: '', label_code: '' });
                  setValidationErrors({ item_id: '', quantity: '', label_code: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item
                </label>
                <select
                  value={formData.item_id}
                  onChange={(e) => {
                    setFormData({...formData, item_id: e.target.value});
                    setValidationErrors(prev => ({...prev, item_id: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.item_id 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecione um item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
                {validationErrors.item_id && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.item_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({...formData, quantity: e.target.value});
                    setValidationErrors(prev => ({...prev, quantity: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.quantity 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ex: 2,5"
                />
                {validationErrors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código da Etiqueta
                </label>
                <input
                  type="text"
                  value={formData.label_code}
                  onChange={(e) => {
                    setFormData({...formData, label_code: e.target.value});
                    setValidationErrors(prev => ({...prev, label_code: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.label_code 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ex: PAO001"
                />
                {validationErrors.label_code && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.label_code}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Código único para identificar este pacote
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ item_id: '', quantity: '', label_code: '' });
                    setValidationErrors({ item_id: '', quantity: '', label_code: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Criar Pacote
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Coming Soon Modal */}
      {showComingSoonModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
            <div className="mb-4">
              <Construction size={48} className="mx-auto text-orange-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Em Breve!</h2>
              <p className="text-gray-600">
                Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
              </p>
            </div>
            
            <button
              onClick={() => setShowComingSoonModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default Packages;
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Edit2, Trash2, Gift, X, Tag, Printer, Upload, Construction, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Item } from '../types';

const Packages: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showSuccessCreateModal, setShowSuccessCreateModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [createdPackage, setCreatedPackage] = useState<Package | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationResult, setDonationResult] = useState<{ packagesCount: number } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: 1 as number,
    total_kg: 0 as number
  });
  const [editQuantity, setEditQuantity] = useState(1);
  const [editTotalKg, setEditTotalKg] = useState(0);
  const { session } = useAuth();

  // Toast functions
  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchPackages();
    fetchItems();
  }, []);

  const fetchPackages = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session?.user.id)
        .single();

      if (!restaurant) {
        console.error('Restaurant not found for user');
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          item:items!inner(
            *,
            restaurant_id
          )
        `)
        .eq('item.restaurant_id', restaurant.id)
        .eq('status', 'in_stock')
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
        .eq('user_id', session?.user.id)
        .single();

      if (!restaurant) {
        console.error('Restaurant not found for user');
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      console.error('No authenticated user');
      return;
    }
    
    setActionLoading('create');
    
    try {
      const selectedItem = items.find(item => item.id === formData.item_id);
      if (!selectedItem) {
        throw new Error('Item not found');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedItem.validity_days);

      const labelCode = generateLabelCode();

      const { error } = await supabase
        .from('packages')
        .insert({
          item_id: formData.item_id,
          quantity: formData.quantity,
          total_kg: formData.total_kg,
          expires_at: expiresAt.toISOString(),
          label_code: labelCode
        });

      if (error) throw error;

      // Get the created package for the success modal
      const { data: newPackage } = await supabase
        .from('packages')
        .select(`
          *,
          item:items(*)
        `)
        .eq('item_id', formData.item_id)
        .eq('label_code', labelCode)
        .single();

      setShowModal(false);
      setFormData({ item_id: '', quantity: 1, total_kg: 0 });
      fetchPackages();
      
      if (newPackage) {
        setCreatedPackage(newPackage);
        setShowSuccessCreateModal(true);
      } else {
        console.log('Package created successfully');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('Erro ao criar pacote. Tente novamente em alguns instantes.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPackage) return;
    
    setActionLoading('edit');
    
    try {
      const { error } = await supabase
        .from('packages')
        .update({ 
          quantity: editQuantity,
          total_kg: editTotalKg
        })
        .eq('id', selectedPackage.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedPackage(null);
      fetchPackages();
      alert('Pacote atualizado! A quantidade foi alterada com sucesso.');
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Erro ao atualizar pacote. Tente novamente em alguns instantes.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    
    setActionLoading('delete');
    
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', selectedPackage.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedPackage(null);
      fetchPackages();
      alert('Pacote removido! O pacote foi excluído com sucesso.');
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Erro ao remover pacote. Tente novamente em alguns instantes.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDonate = async () => {
    if (!session?.access_token || !session?.user?.id) return;
    
    console.log('🚀 Starting donation process...');
    console.log('📋 Session info:', {
      hasAccessToken: !!session.access_token,
      userId: session.user.id,
      userEmail: session.user.email
    });
    
    setActionLoading('donate');
    
    try {
      // Get restaurant ID first
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!restaurant) {
        throw new Error('Restaurante não encontrado');
      }

      console.log('🏪 Restaurant found:', restaurant.id);
      console.log('📞 Calling restaurant_create_donation function...');

      // Use supabase.functions.invoke instead of fetch
      const { data: responseData, error } = await supabase.functions.invoke(
        'restaurant_create_donation',
        {
          body: { restaurant_id: restaurant.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      console.log('📥 Function response:', { responseData, error });

      if (error) {
        const status = error.context.status
        console.log('🔍 Status:', status);
        // Handle specific error codes
        switch (status) {
          case 409:
            showToast('error', 'Sem pacotes em estoque', 'Adicione pacotes antes de tentar doar.');
            return;
          case 404:
            showToast('error', 'Nenhuma OSC parceira encontrada', 'Não há organizações sociais parceiras no momento. Entre em contato com o suporte.');
            return;
          case 500:
          default:
            showToast('error', 'Erro interno do servidor', 'Algo deu errado, tente novamente mais tarde.');
            return;
        }
      }

      console.log('✅ Donation successful:', responseData);
      
      // Refresh packages from database
      await fetchPackages();

      setShowDonateModal(false);
      setSelectedPackage(null);
      
      // Show success modal
      setShowSuccessModal(true);
      setDonationResult({
        packagesCount: responseData.packages_count || 0
      });
    } catch (error) {
      console.error('Error donating package:', error);
      showToast('error', 'Erro na doação', 'Não foi possível enviar os pacotes. Tente novamente.');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setEditQuantity(pkg.quantity);
    setEditTotalKg(pkg.total_kg || 0);
    setShowEditModal(true);
  };

  const openDeleteModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDeleteModal(true);
  };

  const openDonateModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDonateModal(true);
  };

  const openLabelModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowLabelModal(true);
  };

  const printLabel = () => {
    window.print();
  };

  const generateLabelCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'kg':
        return 'Quantidade (kg)';
      case 'g':
        return 'Quantidade (gramas)';
      case 'l':
        return 'Quantidade (litros)';
      case 'ml':
        return 'Quantidade (ml)';
      case 'unit':
        return 'Quantidade (unidades)';
      case 'pacote':
        return 'Quantidade (pacotes)';
      case 'caixa':
        return 'Quantidade (caixas)';
      default:
        return `Quantidade (${unit})`;
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.label_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = items.find(item => item.id === formData.item_id);

  // Calculate total_kg when quantity or item changes
  React.useEffect(() => {
    if (selectedItem && formData.quantity > 0) {
      let totalKg = 0;
      if (selectedItem.unit === 'kg') {
        totalKg = formData.quantity;
      } else if (selectedItem.unit === 'unit' && selectedItem.unit_to_kg) {
        totalKg = formData.quantity * selectedItem.unit_to_kg;
      }
      setFormData(prev => ({ ...prev, total_kg: totalKg }));
    }
  }, [formData.quantity, selectedItem]);

  // Calculate total_kg for edit modal
  React.useEffect(() => {
    if (selectedPackage?.item && editQuantity > 0) {
      let totalKg = 0;
      if (selectedPackage.item.unit === 'kg') {
        totalKg = editQuantity;
      } else if (selectedPackage.item.unit === 'unit' && selectedPackage.item.unit_to_kg) {
        totalKg = editQuantity * selectedPackage.item.unit_to_kg;
      }
      setEditTotalKg(totalKg);
    }
  }, [editQuantity, selectedPackage]);

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
            <Upload size={20} />
            <span>Subir Pacotes via Planilha</span>
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

      {/* Donate CTA */}
      {packages.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Pronto para doar?</h2>
              <p className="text-green-100">
                Você tem {packages.length} pacote{packages.length !== 1 ? 's' : ''} em estoque. 
                Envie para organizações sociais próximas!
              </p>
            </div>
            <button
              onClick={() => openDonateModal(packages[0] || null)}
              disabled={actionLoading !== null}
              className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Gift size={20} />
              <span>Doar Pacotes em Estoque</span>
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar pacotes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Packages Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            {/* Código do pacote em destaque */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Código do pacote</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <span className="font-mono text-lg font-bold text-blue-700">{pkg.label_code}</span>
              </div>
            </div>

            {/* Item info */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{pkg.item?.name}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Quantidade:</span>
                  <span className="font-medium">{pkg.quantity} {pkg.item?.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peso total:</span>
                  <span className="font-medium">{pkg.total_kg?.toFixed(3) || '0.000'} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <span className="font-medium">{pkg.item?.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Criado em:</span>
                  <span className="font-medium">{new Date(pkg.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expira em:</span>
                  <span className="font-medium">{new Date(pkg.expires_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-4 border-t">
              <button
                onClick={() => openEditModal(pkg)}
                disabled={actionLoading !== null}
                className="flex-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit2 size={14} />
                <span>Editar</span>
              </button>
              <button
                onClick={() => openDeleteModal(pkg)}
                disabled={actionLoading !== null}
                className="flex-1 text-red-600 hover:text-red-800 disabled:opacity-50 text-sm font-medium py-2 px-3 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center space-x-1"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
              <button
                onClick={() => openLabelModal(pkg)}
                disabled={actionLoading !== null}
                className="flex-1 text-green-600 hover:text-green-800 disabled:opacity-50 text-sm font-medium py-2 px-3 rounded-md hover:bg-green-50 transition-colors flex items-center justify-center space-x-1"
              >
                <Printer size={14} />
                <span>Ver Etiqueta</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Gift size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pacote em estoque</h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Crie seu primeiro pacote para começar a doar.'
            }
          </p>
        </div>
      )}

      {/* New Package Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Novo Pacote</h2>
              <button
                onClick={() => setShowModal(false)}
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
                  required
                  value={formData.item_id}
                  onChange={(e) => setFormData({...formData, item_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedItem ? getUnitLabel(selectedItem.unit) : 'Quantidade'}
                </label>
                <input
                  type="number"
                  min="1"
                  step={selectedItem?.unit === 'kg' ? '0.001' : '1'}
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: selectedItem?.unit === 'kg' ? parseFloat(e.target.value) : parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 0.500"
                />
              </div>

              {selectedItem && formData.quantity > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso total do pacote
                  </label>
                  <input
                    type="text"
                    value={`${formData.total_kg.toFixed(3)} kg`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'create' ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Edit Package Modal */}
      {showEditModal && selectedPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Pacote</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item (não editável)
                </label>
                <input
                  type="text"
                  value={selectedPackage.item?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedPackage.item ? getUnitLabel(selectedPackage.item.unit) : 'Quantidade'}
                </label>
                <input
                  type="number"
                  min="1"
                  step={selectedPackage.item?.unit === 'kg' ? '0.001' : '1'}
                  required
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(selectedPackage.item?.unit === 'kg' ? parseFloat(e.target.value) : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso total do pacote
                </label>
                <input
                  type="text"
                  value={`${editTotalKg.toFixed(3)} kg`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading === 'edit'}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'edit'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'edit' ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirmar Remoção</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Tem certeza que deseja remover o pacote de <strong>{selectedPackage.item?.name}</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading === 'delete'}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'delete' ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Donate Confirmation Modal */}
      {showDonateModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirmar Doação</h2>
              <button
                onClick={() => setShowDonateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Deseja enviar todos os pacotes em estoque para doação agora?
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Todos os pacotes em estoque serão enviados para organizações sociais próximas.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDonateModal(false)}
                disabled={actionLoading === 'donate'}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDonate}
                disabled={actionLoading === 'donate'}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === 'donate' ? 'Enviando...' : 'Enviar para Doação'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Success Modal */}
      {showSuccessModal && donationResult && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Gift className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Doação Enviada com Sucesso!
              </h2>
              
              <p className="text-gray-600 mb-4">
                Todos os pacotes foram enviados para organizações sociais próximas.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  Você pode acompanhar o status da doação na tela de <strong>Doações</strong>.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setDonationResult(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setDonationResult(null);
                    navigate('/donations');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Ver Doações
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Success Create Modal */}
      {showSuccessCreateModal && createdPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Gift className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Pacote adicionado ao estoque!
              </h2>
              
              <p className="text-gray-600 mb-4">
                O pacote <strong>{createdPackage.label_code}</strong> foi criado com sucesso.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessCreateModal(false);
                    setCreatedPackage(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowSuccessCreateModal(false);
                    setSelectedPackage(createdPackage);
                    setCreatedPackage(null);
                    setShowLabelModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                  <Printer size={16} />
                  <span>Imprimir Etiqueta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Label Modal */}
      {showLabelModal && selectedPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b print:hidden">
              <h2 className="text-xl font-bold">Etiqueta do Pacote</h2>
              <div className="flex space-x-2">
                <button
                  onClick={printLabel}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <Printer size={16} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setShowLabelModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Printable Label */}
            <div className="p-8 print:p-4">
              <div className="border-2 border-gray-800 rounded-lg p-6 print:border-black print:rounded-none">
                {/* Header */}
                <div className="text-center mb-6 print:mb-4">
                  <h1 className="text-2xl font-bold text-gray-900 print:text-black">Arcos Dourados</h1>
                  <p className="text-gray-600 print:text-black">Etiqueta do Pacote</p>
                </div>
                
                {/* Main Info */}
                <div className="space-y-4 print:space-y-2">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 print:text-black">Código da Etiqueta</p>
                    <p className="text-3xl font-mono font-bold text-blue-600 print:text-black bg-blue-50 print:bg-transparent px-4 py-2 rounded-md print:border print:border-black">
                      {selectedPackage.label_code}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 print:gap-2">
                    <div>
                      <p className="text-sm text-gray-600 print:text-black font-medium">Item:</p>
                      <p className="text-lg font-semibold print:text-black">{selectedPackage.item?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 print:text-black font-medium">Quantidade:</p>
                      <p className="text-lg font-semibold print:text-black">{selectedPackage.quantity} {selectedPackage.item?.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 print:text-black font-medium">Peso Total:</p>
                      <p className="text-lg font-semibold print:text-black">{selectedPackage.total_kg?.toFixed(3) || '0.000'} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 print:text-black font-medium">Data de Criação:</p>
                      <p className="text-lg print:text-black">{new Date(selectedPackage.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 print:text-black font-medium">Data de Validade:</p>
                      <p className="text-lg print:text-black">{new Date(selectedPackage.expires_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  {selectedPackage.item?.category && (
                    <div className="text-center pt-4 print:pt-2">
                      <p className="text-sm text-gray-600 print:text-black">Categoria: <span className="font-medium">{selectedPackage.item.category}</span></p>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="text-center mt-6 print:mt-4 pt-4 print:pt-2 border-t border-gray-200 print:border-black">
                  <p className="text-xs text-gray-500 print:text-black">
                    Plataforma de Doações - {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div className={`w-80 bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
            toast.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'
          }`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'error' ? (
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  )}
                </div>
                <div className="ml-3 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{toast.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setToast(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;
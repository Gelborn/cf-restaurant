import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit2, Trash2, Search, Upload, Construction } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Item } from '../types';
import { useToast } from '../hooks/useToast';
import { formatNumber } from '../utils/formatters';

const Items: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    validity_days: '' as string | number,
    unit_to_kg: 0
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdItem, setCreatedItem] = useState<Item | null>(null);
  const [nameError, setNameError] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    unit: '',
    validity_days: '',
    unit_to_kg: ''
  });
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

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
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateItemName = (name: string) => {
    const existingItem = items.find(item => 
      item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      item.id !== editingItem?.id
    );
    return !existingItem;
  };

  const validateForm = () => {
    const errors = {
      name: '',
      unit: '',
      validity_days: '',
      unit_to_kg: ''
    };

    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (!validateItemName(formData.name)) {
      errors.name = 'Este item já existe';
    }

    // Validate unit
    if (!formData.unit) {
      errors.unit = 'Unidade é obrigatória';
    }

    // Validate validity_days
    if (!formData.validity_days || formData.validity_days === '') {
      errors.validity_days = 'Validade é obrigatória';
    } else if (typeof formData.validity_days === 'number' && formData.validity_days < 1) {
      errors.validity_days = 'Validade deve ser pelo menos 1 dia';
    }

    // Validate unit_to_kg for unit type
    if (formData.unit === 'unit' && (!formData.unit_to_kg || formData.unit_to_kg <= 0)) {
      errors.unit_to_kg = 'Peso por unidade é obrigatório e deve ser maior que 0';
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    if (!session?.user?.id) {
      console.error('No authenticated user');
      return;
    }
    
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session?.user.id)
        .single();

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update({
            name: formData.name,
            description: formData.description,
            unit: formData.unit,
            validity_days: formData.validity_days,
            unit_to_kg: formData.unit === 'unit' ? formData.unit_to_kg : null
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        
        setShowModal(false);
        setEditingItem(null);
        setFormData({ name: '', description: '', unit: '', validity_days: '', unit_to_kg: 0 });
       setValidationErrors({ name: '', unit: '', validity_days: '', unit_to_kg: '' });
        fetchItems();
        showSuccess(
          'Item atualizado!',
          'As alterações foram salvas com sucesso.'
        );
      } else {
        const { error } = await supabase
          .from('items')
          .insert({
            restaurant_id: restaurant.id,
            name: formData.name,
            description: formData.description,
            unit: formData.unit,
            validity_days: formData.validity_days,
            unit_to_kg: formData.unit === 'unit' ? formData.unit_to_kg : null
          });

        if (error) throw error;
        
        // Get the created item for the success modal
        const { data: newItem } = await supabase
          .from('items')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('name', formData.name)
          .single();
        
        setShowModal(false);
        setFormData({ name: '', description: '', unit: '', validity_days: '', unit_to_kg: 0 });
       setValidationErrors({ name: '', unit: '', validity_days: '', unit_to_kg: '' });
        fetchItems();
        
        if (newItem) {
          setCreatedItem(newItem);
          setShowSuccessModal(true);
        } else {
          showSuccess('Item criado!', 'O novo item foi adicionado à sua lista.');
        }
      }
    } catch (error) {
      console.error('Error saving item:', error);
      showError('Erro ao salvar item', 'Tente novamente em alguns instantes.');
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      validity_days: item.validity_days,
      unit_to_kg: item.unit_to_kg || 0
    });
   setValidationErrors({ name: '', unit: '', validity_days: '', unit_to_kg: '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchItems();
      showSuccess('Item removido!', 'O item foi excluído com sucesso.');
    } catch (error) {
      console.error('Error deleting item:', error);
      showError('Erro ao remover item', 'Tente novamente em alguns instantes.');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const units = [
    { value: 'unit', label: 'Unidades' },
    { value: 'kg', label: 'Quilogramas (kg)' }
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowComingSoonModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Upload size={20} />
            <span>Subir Items via Planilha</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar items por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-900">Nome</th>
                <th className="text-left p-4 font-medium text-gray-900">Descrição</th>
                <th className="text-left p-4 font-medium text-gray-900">Unidade</th>
                <th className="text-left p-4 font-medium text-gray-900">Validade (dias)</th>
                <th className="text-left p-4 font-medium text-gray-900">Kilos por unidade</th>
                <th className="text-left p-4 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-900">{item.name}</td>
                  <td className="p-4 text-gray-600">{item.description || '-'}</td>
                  <td className="p-4 text-gray-600">{item.unit}</td>
                  <td className="p-4 text-gray-600">{item.validity_days}</td>
                  <td className="p-4 text-gray-600">
                    {item.unit === 'kg' ? '-' : (item.unit_to_kg ? formatNumber(item.unit_to_kg, 3) : '-')}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({...formData, name: e.target.value});
                    setValidationErrors(prev => ({...prev, name: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.name 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descreva o item (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => {
                    setFormData({...formData, unit: e.target.value});
                    setValidationErrors(prev => ({...prev, unit: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.unit 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Selecione uma unidade</option>
                  {units.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
                {validationErrors.unit && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.unit}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validade (dias)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.validity_days}
                  onChange={(e) => {
                    setFormData({...formData, validity_days: e.target.value ? parseInt(e.target.value) : ''});
                    setValidationErrors(prev => ({...prev, validity_days: ''}));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationErrors.validity_days 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ex: 7"
                />
                {validationErrors.validity_days && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.validity_days}</p>
                )}
              </div>

              {formData.unit === 'unit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilos por unidade *
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.unit_to_kg}
                    onChange={(e) => {
                      setFormData({...formData, unit_to_kg: parseFloat(e.target.value) || 0});
                      setValidationErrors(prev => ({...prev, unit_to_kg: ''}));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                      validationErrors.unit_to_kg 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Ex: 0,5"
                  />
                  {validationErrors.unit_to_kg && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.unit_to_kg}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Quantos quilos representa cada unidade deste item
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({ name: '', description: '', unit: '', validity_days: '', unit_to_kg: 0 });
                    setValidationErrors({ name: '', unit: '', validity_days: '', unit_to_kg: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Success Modal */}
      {showSuccessModal && createdItem && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Item adicionado com sucesso!
              </h2>
              
              <p className="text-gray-600 mb-4">
                O item <strong>{createdItem.name}</strong> foi criado e está pronto para uso.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  Agora você pode criar pacotes usando este item na tela de <strong>Pacotes / Estoque</strong>.
                </p>
              </div>
              
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedItem(null);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Fechar
              </button>
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
    </div>
  );
};

export default Items;
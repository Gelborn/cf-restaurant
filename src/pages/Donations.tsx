import React, { useState, useEffect } from 'react';
import { Search, Filter, Unlock, X, Package, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Construction } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Donation } from '../types';
import { useToast } from '../hooks/useToast';

interface DonationWithPackages extends Donation {
  packages?: any[];
  osc_name?: string;
}

const Donations: React.FC = () => {
  const [donations, setDonations] = useState<DonationWithPackages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [releaseCode, setReleaseCode] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseResult, setReleaseResult] = useState<any>(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
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
        .from('donations')
        .select(`
          *,
          osc:osc!inner(name),
          packages:donation_packages(
            package:packages(
              *,
              item:items(*)
            )
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to flatten packages
      const transformedData = (data || []).map(donation => ({
        ...donation,
        osc_name: donation.osc?.name,
        packages: donation.packages?.map((dp: any) => dp.package) || []
      }));
      
      setDonations(transformedData);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseDonation = async () => {
    if (!releaseCode.trim() || !session?.access_token) return;
    
    setReleaseLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant_release_donation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ security_code: releaseCode.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao liberar doação');
      }

      const result = await response.json();
      
      // Refresh donations list
      await fetchDonations();
      
      setShowReleaseModal(false);
      setReleaseCode('');
      setReleaseResult(result);
      setShowSuccessModal(true);
      
      showSuccess('Doação liberada!', 'A doação foi liberada para retirada com sucesso.');
    } catch (error: any) {
      console.error('Error releasing donation:', error);
      showError('Erro ao liberar doação', error.message || 'Tente novamente em alguns instantes.');
    } finally {
      setReleaseLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'released':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Esperando resposta da OSC';
      case 'accepted':
        return 'Aceito pela OSC';
      case 'released':
        return 'Liberado para retirada';
      case 'picked_up':
        return 'Coletado pela OSC';
      case 'denied':
        return 'Negado pela OSC';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'released':
        return <Unlock className="w-4 h-4" />;
      case 'picked_up':
        return <Package className="w-4 h-4" />;
      case 'denied':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Vencido';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else {
      return `${diffHours}h`;
    }
  };

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.security_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasAcceptedDonations = donations.some(d => d.status === 'accepted');

  // Componente do Card de Doação
  const DonationCard: React.FC<{ donation: DonationWithPackages }> = ({ donation }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Código: {donation.security_code}
          </h3>
          <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs border ${getStatusColor(donation.status)}`}>
            {getStatusIcon(donation.status)}
            <span>{getStatusText(donation.status)}</span>
          </div>
        </div>
        {donation.osc_name && (
          <div className="mb-2">
            <p className="text-sm font-medium text-blue-700">
              OSC Destino → {donation.osc_name}
            </p>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center space-x-2 text-gray-600">
          <Calendar size={14} />
          <span>Criado: {new Date(donation.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        
        {donation.accepted_at && (
          <div className="flex items-center space-x-2 text-gray-600">
            <CheckCircle size={14} />
            <span>Aceito: {new Date(donation.accepted_at).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
        
        {donation.picked_up_at && (
          <div className="flex items-center space-x-2 text-gray-600">
            <Package size={14} />
            <span>Coletado: {new Date(donation.picked_up_at).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Packages */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2 text-sm">
          Pacotes ({donation.packages?.length || 0})
        </h4>
        
        <div className="space-y-2">
          {donation.packages?.map((pkg: any) => (
            <div key={pkg.id} className="bg-gray-50 rounded p-3 text-sm">
              <p className="font-medium text-gray-900 mb-1">
                Etiqueta do pacote: {pkg.label_code}
              </p>
              <p className="text-gray-700 mb-1">
                {pkg.item?.name}
              </p>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{pkg.quantity} {pkg.item?.unit}</span>
                <span>Vence: {formatTimeRemaining(pkg.expires_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Doações</h1>
        <button
          onClick={() => setShowComingSoonModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
        >
          <FileText size={20} />
          <span>Adicionar NF a Doação</span>
        </button>
      </div>

      {/* Release CTA */}
      {hasAcceptedDonations && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">A ONG está aí para retirar o pacote?</h2>
              <p className="text-green-100">
                Clique aqui para liberar e peça o código para a pessoa!
              </p>
            </div>
            <button
              onClick={() => setShowReleaseModal(true)}
              className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center space-x-2"
            >
              <Unlock size={20} />
              <span>Liberar Doação</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por código de segurança..."
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
            <option value="pending">Esperando resposta</option>
            <option value="accepted">Aceito</option>
            <option value="released">Liberado</option>
            <option value="picked_up">Coletado</option>
            <option value="denied">Negado</option>
          </select>
        </div>
      </div>

      {/* Donations Cards */}
      <div className="space-y-8">
        {/* Aceitas */}
        {filteredDonations.filter(d => d.status === 'accepted').length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center">
              <CheckCircle size={24} className="mr-2" />
              Aceitas pela OSC ({filteredDonations.filter(d => d.status === 'accepted').length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonations.filter(d => d.status === 'accepted').map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          </div>
        )}

        {/* Pendentes */}
        {filteredDonations.filter(d => d.status === 'pending').length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-yellow-700 mb-4 flex items-center">
              <Clock size={24} className="mr-2" />
              Pendentes ({filteredDonations.filter(d => d.status === 'pending').length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonations.filter(d => d.status === 'pending').map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          </div>
        )}

        {/* Entregues */}
        {filteredDonations.filter(d => ['released', 'picked_up'].includes(d.status)).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center">
              <Package size={24} className="mr-2" />
              Entregues ({filteredDonations.filter(d => ['released', 'picked_up'].includes(d.status)).length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonations.filter(d => ['released', 'picked_up'].includes(d.status)).map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))}
            </div>
          </div>
        )}
      </div>

      {filteredDonations.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma doação encontrada</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Suas doações aparecerão aqui quando você enviar pacotes.'
            }
          </p>
        </div>
      )}

      {/* Release Donation Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Liberar Doação</h2>
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setReleaseCode('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Segurança
                </label>
                <input
                  type="text"
                  value={releaseCode}
                  onChange={(e) => setReleaseCode(e.target.value)}
                  placeholder="Digite o código de segurança"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Atenção:</strong> Esta ação irá liberar a doação para retirada pela organização social.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReleaseModal(false);
                    setReleaseCode('');
                  }}
                  disabled={releaseLoading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReleaseDonation}
                  disabled={releaseLoading || !releaseCode.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {releaseLoading ? 'Liberando...' : 'Liberar Doação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && releaseResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Código validado!
              </h2>
              
              <p className="text-lg text-gray-700">
                Entregue os seguintes pacotes para a OSC <strong>{releaseResult.osc}</strong>
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6 text-center text-gray-800">
                Pacotes para Entrega
              </h3>
              
              <div className="grid gap-4">
                {releaseResult.packages?.map((pkg: any) => (
                  <div key={pkg.id} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-blue-900 mb-2">
                          Código da etiqueta do pacote: {pkg.label_code}
                        </p>
                        <h4 className="text-xl font-semibold text-gray-900 mb-1">
                          {pkg.item?.name}
                        </h4>
                        <p className="text-gray-700">
                          Quantidade: <span className="font-medium">{pkg.quantity} {pkg.item?.unit}</span>
                        </p>
                      </div>
                      <Package size={32} className="text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setReleaseResult(null);
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      {showComingSoonModal && (
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
      )}
    </div>
  );
};

export default Donations;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Package, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

interface DonationItem {
  id: string;
  name: string;
  description: string;
  unit: string;
}

interface DonationPackage {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  item: DonationItem;
}

interface DonationDetails {
  id: string;
  status: string;
  created_at: string;
  restaurant: string;
  security_code: string;
  packages: DonationPackage[];
}

const ConfirmDonation: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [donation, setDonation] = useState<DonationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'accept' | 'deny' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (code) {
      fetchDonationDetails();
    }
  }, [code]);

  const fetchDonationDetails = async () => {
    if (!code) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get_donation_details`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ security_code: code }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Doação não encontrada ou código inválido');
      }

      const data = await response.json();
      setDonation(data);
    } catch (error: any) {
      console.error('Error fetching donation details:', error);
      setError(error.message || 'Erro ao carregar detalhes da doação');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!code) return;

    setActionLoading('accept');
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept_donation`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ security_code: code }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao aceitar doação');
      }

      setSuccess('Doação aceita com sucesso! O restaurante foi notificado.');
      // Refresh donation details to show updated status
      await fetchDonationDetails();
    } catch (error: any) {
      console.error('Error accepting donation:', error);
      setError(error.message || 'Erro ao aceitar doação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async () => {
    if (!code) return;

    setActionLoading('deny');
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deny_donation`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ security_code: code }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao recusar doação');
      }

      setSuccess('Doação recusada. O restaurante foi notificado.');
      // Refresh donation details to show updated status
      await fetchDonationDetails();
    } catch (error: any) {
      console.error('Error denying donation:', error);
      setError(error.message || 'Erro ao recusar doação');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'picked_up':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Aguardando Resposta';
      case 'accepted':
        return 'Aceita';
      case 'denied':
        return 'Recusada';
      case 'picked_up':
        return 'Coletado!';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5" />;
      case 'denied':
        return <XCircle className="w-5 h-5" />;
      case 'picked_up':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes da doação...</p>
        </div>
      </div>
    );
  }

  if (error && !donation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <img 
              src="https://connectingfood.com/wp-content/uploads/2023/05/logo-CF.png" 
              alt="Connecting Food" 
              className="h-8 w-auto"
            />
            <div>
              <p className="text-gray-600">Confirmação de Doação</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {donation && (
          <div className="space-y-6">
            {/* Donation Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalhes da Doação</h2>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getStatusColor(donation.status)}`}>
                  {getStatusIcon(donation.status)}
                  <span>{getStatusText(donation.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Restaurante</p>
                  <p className="font-semibold text-gray-900">{donation.restaurant}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Código de Segurança</p>
                  <p className="font-mono text-gray-900">{donation.security_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data da Doação</p>
                  <p className="text-gray-900">
                    {new Date(donation.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Packages List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Pacotes Incluídos ({donation.packages.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {donation.packages.map((pkg) => (
                  <div key={pkg.id} className="p-6">
                    <div>
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-1">{pkg.item.name}</h4>
                        {pkg.item.description && (
                          <p className="text-gray-600 text-sm mb-2">{pkg.item.description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-gray-600 mb-1">Quantidade</p>
                          <p className="font-semibold text-gray-900">{pkg.quantity} {pkg.item.unit}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-gray-600 mb-1">Criado em</p>
                          <p className="font-semibold text-gray-900">{new Date(pkg.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-gray-600 mb-1">Vence em</p>
                          <p className="font-semibold text-gray-900">{formatTimeRemaining(pkg.expires_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {donation.status === 'pending' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ação Necessária</h3>
                <p className="text-gray-600 mb-6">
                  Esta doação está aguardando sua resposta. Você pode aceitar ou recusar esta doação.
                </p>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle size={20} />
                    <span>{actionLoading === 'accept' ? 'Aceitando...' : 'Aceitar Doação'}</span>
                  </button>
                  
                  <button
                    onClick={handleDeny}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <XCircle size={20} />
                    <span>{actionLoading === 'deny' ? 'Recusando...' : 'Recusar Doação'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Info Footer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Após aceitar a doação, você receberá as instruções para retirada dos alimentos. 
                Certifique-se de que sua organização pode receber e distribuir estes itens adequadamente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmDonation;
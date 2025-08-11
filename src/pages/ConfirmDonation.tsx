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
  total_kg?: number;
}

interface DonationDetails {
  id: string;
  status: string;
  created_at: string;
  restaurant: string;
  security_code: string;
  expires_at: string;
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
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (code) {
      fetchDonationDetails();
    }
  }, [code]);

  // Timer effect
  useEffect(() => {
    if (!donation?.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(donation.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, isExpired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [donation?.expires_at]);
  const fetchDonationDetails = async () => {
    if (!code) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/osc_get_donation_details`,
        {
          method: 'POST',
          headers: {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/osc_accept_donation`,
        {
          method: 'POST',
          headers: {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/osc_deny_donation`,
        {
          method: 'POST',
          headers: {
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
      case 'expired':
        return 'bg-gray-100 text-gray-800';
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
      case 'expired':
        return 'Expirada';
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
      case 'expired':
        return <XCircle className="w-5 h-5" />;
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
            {/* Countdown Timer - Only show for pending donations */}
            {donation.status === 'pending' && donation.expires_at && (
              <div className={`rounded-lg p-6 text-center ${
                timeRemaining.isExpired 
                  ? 'bg-red-50 border border-red-200' 
                  : timeRemaining.hours <= 2 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-center mb-4">
                  <Clock className={`w-8 h-8 mr-3 ${
                    timeRemaining.isExpired 
                      ? 'text-red-500' 
                      : timeRemaining.hours <= 2 
                        ? 'text-orange-500' 
                        : 'text-blue-500'
                  }`} />
                  <h3 className={`text-xl font-bold ${
                    timeRemaining.isExpired 
                      ? 'text-red-800' 
                      : timeRemaining.hours <= 2 
                        ? 'text-orange-800' 
                        : 'text-blue-800'
                  }`}>
                    {timeRemaining.isExpired ? 'Tempo Esgotado' : 'Tempo Restante'}
                  </h3>
                </div>
                
                {timeRemaining.isExpired ? (
                  <div>
                    <p className="text-red-700 text-lg font-medium mb-2">
                      Esta oferta de doação expirou
                    </p>
                    <p className="text-red-600 text-sm">
                      O prazo para resposta foi ultrapassado
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center items-center space-x-6 mb-4">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${
                          timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                        }`}>
                          {String(timeRemaining.hours).padStart(2, '0')}
                        </div>
                        <div className={`text-sm font-medium ${
                          timeRemaining.hours <= 2 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          Horas
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${
                        timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                      }`}>:</div>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${
                          timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                        }`}>
                          {String(timeRemaining.minutes).padStart(2, '0')}
                        </div>
                        <div className={`text-sm font-medium ${
                          timeRemaining.hours <= 2 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          Minutos
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${
                        timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                      }`}>:</div>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${
                          timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                        }`}>
                          {String(timeRemaining.seconds).padStart(2, '0')}
                        </div>
                        <div className={`text-sm font-medium ${
                          timeRemaining.hours <= 2 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          Segundos
                        </div>
                      </div>
                    </div>
                    
                    <p className={`text-lg font-medium ${
                      timeRemaining.hours <= 2 ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {timeRemaining.hours <= 2 
                        ? '⚠️ Tempo limitado para responder!' 
                        : 'Prazo para aceitar ou recusar a doação'
                      }
                    </p>
                    
                    <p className={`text-sm mt-2 ${
                      timeRemaining.hours <= 2 ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      Expira em: {new Date(donation.expires_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
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
                          <p className="text-gray-600 mb-1">Peso Total</p>
                          <p className="font-semibold text-gray-900">{pkg.total_kg?.toFixed(3) || '0.000'} kg</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {donation.status === 'pending' && !timeRemaining.isExpired && (
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

            {/* Expired Message */}
            {donation.status === 'pending' && timeRemaining.isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <XCircle className="w-6 h-6 text-red-500 mr-3" />
                  <h3 className="text-lg font-semibold text-red-800">Oferta Expirada</h3>
                </div>
                <p className="text-red-700 mb-4">
                  O prazo para responder a esta oferta de doação foi ultrapassado. 
                  A doação não está mais disponível para aceite.
                </p>
                <p className="text-sm text-red-600">
                  Entre em contato com o restaurante se ainda tiver interesse nos itens.
                </p>
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
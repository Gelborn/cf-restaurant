import React, { useState, useEffect } from 'react';
import { Package, Gift, Heart, TrendingUp, Users, Award, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  totalDonations: number;
  totalKilos: number;
  totalUnits: number;
  packagesInStock: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalDonations: 0,
    totalKilos: 0,
    totalUnits: 0,
    packagesInStock: 0,
  });
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!restaurant) return;

      // Buscar doações
      const { data: donations } = await supabase
        .from('donations')
        .select('id, status')
        .eq('restaurant_id', restaurant.id);

      // Buscar items do restaurante
      const { data: items } = await supabase
        .from('items')
        .select('id, unit')
        .eq('restaurant_id', restaurant.id);

      const itemIds = items?.map(item => item.id) || [];
      let packages: any[] = [];
      let totalKilos = 0;
      let totalUnits = 0;

      if (itemIds.length > 0) {
        // Buscar todos os pacotes (incluindo doados)
        const { data: allPackages } = await supabase
          .from('packages')
          .select('id, status, quantity, item:items(unit)')
          .in('item_id', itemIds);

        // Pacotes em estoque
        packages = allPackages?.filter(p => p.status === 'in_stock') || [];

        // Calcular totais doados (pacotes que não estão mais em estoque)
        const donatedPackages = allPackages?.filter(p => p.status !== 'in_stock') || [];
        donatedPackages.forEach(pkg => {
          if (pkg.item?.unit === 'kg') {
            totalKilos += pkg.quantity;
          } else {
            totalUnits += pkg.quantity;
          }
        });
      }

      setStats({
        totalDonations: donations?.filter(d => d.status !== 'pending').length || 0,
        totalKilos,
        totalUnits,
        packagesInStock: packages.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data para gráficos
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      date: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      donations: Math.floor(Math.random() * 25) + 10,
      kilos: Math.floor(Math.random() * 150) + 50,
      units: Math.floor(Math.random() * 400) + 100,
    };
  });

  // Mock data para OSCs
  const oscStats = {
    totalOscs: 12,
    topOscs: [
      { name: 'Casa da Esperança', kilos: 45.2, units: 156 },
      { name: 'Lar dos Idosos São José', kilos: 38.7, units: 134 },
      { name: 'Creche Pequenos Anjos', kilos: 32.1, units: 98 },
      { name: 'Instituto Vida Nova', kilos: 28.5, units: 87 },
      { name: 'Associação Mãos Solidárias', kilos: 24.3, units: 76 },
    ]
  };

  const maxDonations = Math.max(...chartData.map(d => d.donations));
  const maxKilos = Math.max(...chartData.map(d => d.kilos));
  const maxUnits = Math.max(...chartData.map(d => d.units));

  // Função para converter valor em % de altura mínima de 5%
  const percent = (value: number, max: number) => Math.max((value / max) * 100, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral das suas doações</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Doações Feitas</p>
              <p className="text-3xl font-bold">{stats.totalDonations}</p>
              <p className="text-blue-100 text-sm">Total realizadas</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Heart size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Kilos Doados</p>
              <p className="text-3xl font-bold">{stats.totalKilos.toFixed(1)}</p>
              <p className="text-green-100 text-sm">Em peso total</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <TrendingUp size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Unidades Doadas</p>
              <p className="text-3xl font-bold">{stats.totalUnits}</p>
              <p className="text-purple-100 text-sm">Total de itens</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Package size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Em Estoque</p>
              <p className="text-3xl font-bold">{stats.packagesInStock}</p>
              <p className="text-orange-100 text-sm">Pacotes prontos</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Gift size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Atividade dos Últimos 6 Meses</h3>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Doações</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Kilos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Unidades</span>
            </div>
          </div>

          {/* Chart */}
          <div className="overflow-x-auto px-4 flex-1 flex flex-col justify-end">
            <div className="flex justify-between" style={{ minWidth: '400px' }}>
              {chartData.map((item, index) => (
                <div key={index} className="flex flex-col items-center h-full">
                  <div 
                    className="flex items-end justify-center space-x-1 w-full flex-1"
                    style={{ height: '150px' }}
                  >
                    <div
                      className="w-3 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-sm"
                      style={{ height: `${Math.max((item.donations / maxDonations) * 200, 12)}px` }}
                      title={`${item.donations} doações`} />
                    <div
                      className="w-3 bg-gradient-to-t from-green-500 to-green-600 rounded-t-sm"
                      style={{ height: `${Math.max((item.kilos / maxKilos) * 200, 12)}px` }}
                      title={`${item.kilos} kg`} />
                    <div
                      className="w-3 bg-gradient-to-t from-purple-500 to-purple-600 rounded-t-sm"
                      style={{ height: `${Math.max((item.units / maxUnits) * 200, 12)}px` }}
                      title={`${item.units} unidades`} />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap mt-2">{item.date}</span>
                </div>
              ))}
            </div>
            {/* Linha horizontal única */}
            <div className="border-t border-gray-200 w-full mt-2"></div>
          </div>
        </div>

        {/* Pie Chart - 1/3 width */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Package className="text-indigo-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Itens Mais Doados</h3>
          </div>

          {/* Pie Chart */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                
                {/* Pão - 30% */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="35" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="10"
                  strokeDasharray="66 154"
                  strokeDashoffset="0"
                />
                
                {/* Frutas - 25% */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="35" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="10"
                  strokeDasharray="55 165"
                  strokeDashoffset="-66"
                />
                
                {/* Verduras - 20% */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="35" 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="10"
                  strokeDasharray="44 176"
                  strokeDashoffset="-121"
                />
                
                {/* Laticínios - 15% */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="35" 
                  fill="none" 
                  stroke="#f59e0b" 
                  strokeWidth="10"
                  strokeDasharray="33 187"
                  strokeDashoffset="-165"
                />
                
                {/* Outros - 10% */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="35" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="10"
                  strokeDasharray="22 198"
                  strokeDashoffset="-198"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Pão</span>
              </div>
              <span className="text-sm font-medium text-gray-900">30%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Frutas</span>
              </div>
              <span className="text-sm font-medium text-gray-900">25%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Verduras</span>
              </div>
              <span className="text-sm font-medium text-gray-900">20%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Laticínios</span>
              </div>
              <span className="text-sm font-medium text-gray-900">15%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Outros</span>
              </div>
              <span className="text-sm font-medium text-gray-900">10%</span>
            </div>
          </div>
        </div>
      </div>

      {/* OSCs Beneficiadas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="text-indigo-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">OSCs Beneficiadas</h3>
          </div>
          <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
            {oscStats.totalOscs} organizações
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 flex items-center">
            <Award className="text-yellow-500 mr-2" size={20} />
            Top 5 Organizações
          </h4>
          {oscStats.topOscs.map((osc, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 text-indigo-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{osc.name}</p>
                  <p className="text-sm text-gray-600">Organização Social</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex space-x-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{osc.kilos}kg</p>
                    <p className="text-xs text-gray-500">Peso</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600">{osc.units}</p>
                    <p className="text-xs text-gray-500">Unidades</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
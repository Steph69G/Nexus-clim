import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, Users, Wrench, Clock, CheckCircle, AlertTriangle, Printer } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { supabase } from '@/supabase';

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

type ActivityStats = {
  totalMissions: number;
  completedMissions: number;
  inProgressMissions: number;
  cancelledMissions: number;
  totalRevenue: number;
  averageCompletionTime: number;
  customerSatisfaction: number;
  technicianUtilization: number;
};

export default function AdminPilotageReports() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [stats, setStats] = useState<ActivityStats>({
    totalMissions: 0,
    completedMissions: 0,
    inProgressMissions: 0,
    cancelledMissions: 0,
    totalRevenue: 0,
    averageCompletionTime: 0,
    customerSatisfaction: 0,
    technicianUtilization: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadStats();
  }, [period, customDates]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end = new Date();

    switch (period) {
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        return {
          start: customDates.start,
          end: customDates.end,
        };
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const { data: missions } = await supabase
        .from('missions')
        .select('id, status, scheduled_date, completed_at')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('issue_date', start)
        .lte('issue_date', end)
        .eq('payment_status', 'paid');

      const { data: surveys } = await supabase
        .from('satisfaction_surveys')
        .select('overall_rating')
        .gte('created_at', start)
        .lte('created_at', end)
        .not('overall_rating', 'is', null);

      const totalMissions = missions?.length || 0;
      const completedMissions = missions?.filter(m => m.status === 'completed').length || 0;
      const inProgressMissions = missions?.filter(m => ['scheduled', 'in_progress', 'confirmed'].includes(m.status)).length || 0;
      const cancelledMissions = missions?.filter(m => m.status === 'cancelled').length || 0;
      const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

      const completedWithDates = missions?.filter(m => m.completed_at && m.scheduled_date) || [];
      const averageCompletionTime = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, m) => {
            const start = new Date(m.scheduled_date).getTime();
            const end = new Date(m.completed_at).getTime();
            return sum + (end - start) / (1000 * 60 * 60);
          }, 0) / completedWithDates.length
        : 0;

      const customerSatisfaction = surveys && surveys.length > 0
        ? surveys.reduce((sum, s) => sum + s.overall_rating, 0) / surveys.length
        : 0;

      const technicianUtilization = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

      setStats({
        totalMissions,
        completedMissions,
        inProgressMissions,
        cancelledMissions,
        totalRevenue,
        averageCompletionTime,
        customerSatisfaction,
        technicianUtilization,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = (format: 'pdf' | 'print') => {
    setGenerating(true);

    const { start, end } = getDateRange();
    const periodLabel = period === 'custom'
      ? `${new Date(start).toLocaleDateString('fr-FR')} - ${new Date(end).toLocaleDateString('fr-FR')}`
      : period === 'week' ? '7 derniers jours'
      : period === 'month' ? 'Mois en cours'
      : period === 'quarter' ? 'Trimestre en cours'
      : 'Année en cours';

    const reportContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapport d'Activité - ${periodLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
    .header h1 { color: #1f2937; margin: 0; }
    .header p { color: #6b7280; margin: 5px 0; }
    .section { margin: 30px 0; }
    .section h2 { color: #f97316; border-bottom: 2px solid #fed7aa; padding-bottom: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .stat-card h3 { color: #6b7280; font-size: 14px; margin: 0 0 10px 0; }
    .stat-card p { color: #1f2937; font-size: 32px; font-weight: bold; margin: 0; }
    .summary { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rapport d'Activité</h1>
    <p><strong>Période:</strong> ${periodLabel}</p>
    <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
  </div>

  <div class="section">
    <h2>📊 Vue d'ensemble</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Missions totales</h3>
        <p>${stats.totalMissions}</p>
      </div>
      <div class="stat-card">
        <h3>Missions terminées</h3>
        <p>${stats.completedMissions}</p>
      </div>
      <div class="stat-card">
        <h3>Missions en cours</h3>
        <p>${stats.inProgressMissions}</p>
      </div>
      <div class="stat-card">
        <h3>Missions annulées</h3>
        <p>${stats.cancelledMissions}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>💰 Performance Financière</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Chiffre d'affaires</h3>
        <p>${stats.totalRevenue.toFixed(2)} €</p>
      </div>
      <div class="stat-card">
        <h3>CA moyen / mission</h3>
        <p>${stats.completedMissions > 0 ? (stats.totalRevenue / stats.completedMissions).toFixed(2) : '0.00'} €</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>⚙️ Performance Opérationnelle</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Temps moyen d'intervention</h3>
        <p>${stats.averageCompletionTime.toFixed(1)} h</p>
      </div>
      <div class="stat-card">
        <h3>Taux d'utilisation techniciens</h3>
        <p>${stats.technicianUtilization.toFixed(1)} %</p>
      </div>
      <div class="stat-card">
        <h3>Satisfaction client (NPS)</h3>
        <p>${stats.customerSatisfaction.toFixed(1)} / 5</p>
      </div>
      <div class="stat-card">
        <h3>Taux de complétion</h3>
        <p>${stats.totalMissions > 0 ? ((stats.completedMissions / stats.totalMissions) * 100).toFixed(1) : '0.0'} %</p>
      </div>
    </div>
  </div>

  <div class="summary">
    <h3>📈 Résumé Exécutif</h3>
    <p>
      Sur la période ${periodLabel}, l'activité a généré <strong>${stats.totalMissions} missions</strong>
      dont <strong>${stats.completedMissions} complétées</strong>, pour un chiffre d'affaires de
      <strong>${stats.totalRevenue.toFixed(2)} €</strong>.
    </p>
    <p>
      La satisfaction client moyenne est de <strong>${stats.customerSatisfaction.toFixed(1)}/5</strong>
      avec un taux d'utilisation des techniciens de <strong>${stats.technicianUtilization.toFixed(1)}%</strong>.
    </p>
  </div>

  <div class="footer">
    <p>Clim Passion - Rapport d'activité généré automatiquement</p>
    <p>Document confidentiel - Usage interne uniquement</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    if (format === 'pdf') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_activite_${period}_${Date.now()}.html`;
      link.click();
      URL.revokeObjectURL(url);
      alert('Rapport HTML téléchargé. Ouvrez-le dans votre navigateur puis imprimez en PDF (Ctrl+P).');
    } else {
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }

    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-600" />
            Rapports d'Activité & Exports
          </h1>
          <p className="mt-2 text-gray-600">
            Générez des rapports stratégiques visuels pour la direction et le management
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Période du rapport</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 derniers jours
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mois en cours
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'quarter'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'year'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'custom'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personnalisé
            </button>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={customDates.start}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={customDates.end}
                  onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Wrench className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">Missions</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalMissions}</p>
            <p className="text-sm text-green-600 mt-2">{stats.completedMissions} terminées</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">CA</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{(stats.totalRevenue / 1000).toFixed(1)}k €</p>
            <p className="text-sm text-gray-600 mt-2">
              {stats.completedMissions > 0 ? (stats.totalRevenue / stats.completedMissions).toFixed(0) : '0'} € / mission
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">NPS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.customerSatisfaction.toFixed(1)}</p>
            <p className="text-sm text-gray-600 mt-2">sur 5.0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">Temps moy.</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.averageCompletionTime.toFixed(1)}h</p>
            <p className="text-sm text-gray-600 mt-2">par intervention</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Opérationnelle</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taux de complétion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalMissions > 0 ? ((stats.completedMissions / stats.totalMissions) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilisation techniciens</p>
                <p className="text-2xl font-bold text-gray-900">{stats.technicianUtilization.toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Missions annulées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cancelledMissions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            Générer le rapport
          </h2>
          <p className="text-gray-700 mb-6">
            Créez un rapport d'activité complet avec toutes les statistiques et indicateurs de performance
            pour la période sélectionnée.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => generateReport('pdf')}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 font-medium"
            >
              <Download className="w-5 h-5" />
              {generating ? 'Génération...' : 'Télécharger HTML'}
            </button>
            <button
              onClick={() => generateReport('print')}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
            >
              <Printer className="w-5 h-5" />
              Imprimer
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Le rapport HTML peut être converti en PDF en l'ouvrant dans votre navigateur puis en utilisant
            la fonction d'impression (Ctrl+P) et "Enregistrer au format PDF".
          </p>
        </div>
      </div>
    </div>
  );
}

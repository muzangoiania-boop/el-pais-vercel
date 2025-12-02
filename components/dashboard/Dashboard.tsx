import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, TrendingUp, TrendingDown, Clock, Target, AlertTriangle,
  CheckCircle, XCircle, BarChart3, PieChart as PieChartIcon, Activity,
  Calendar, RefreshCw, Lock, Eye, EyeOff, Database, Zap, ArrowUpRight,
  ArrowDownRight, Timer, MousePointer, UserCheck, UserX, Percent,
  LayoutDashboard, Filter, Download, ChevronRight, Info, Award,
  AlertCircle, TrendingUp as Trend, BarChart2, Layers, Play, LogOut
} from 'lucide-react';
import { getLocalEvents, calculateDashboardData, DashboardData } from '../../lib/analyticsData';
import { QuizEvent } from '../../lib/analytics';
import { getEventsFromSupabase, convertToQuizEvent } from '../../lib/supabase';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const GRADIENT_COLORS = {
  primary: ['#F7D844', '#F7931E'],
  success: ['#10B981', '#059669'],
  danger: ['#EF4444', '#DC2626'],
  info: ['#3B82F6', '#2563EB'],
  purple: ['#8B5CF6', '#7C3AED'],
};

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export const Dashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<QuizEvent[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'behavior' | 'answers' | 'events'>('overview');
  const [dataSource, setDataSource] = useState<'local' | 'supabase' | 'mixed'>('local');

  const dateRanges: Record<string, DateRange> = {
    '24h': { start: subDays(new Date(), 1), end: new Date(), label: 'Últimas 24h' },
    '7d': { start: subDays(new Date(), 7), end: new Date(), label: '7 dias' },
    '30d': { start: subDays(new Date(), 30), end: new Date(), label: '30 dias' },
    '90d': { start: subDays(new Date(), 90), end: new Date(), label: '90 dias' },
    'all': { start: new Date(2020, 0, 1), end: new Date(), label: 'Tudo' }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const correctPassword = 'admin123';
    if (password === correctPassword) {
      setIsAuthenticated(true);
      loadEvents();
    } else {
      setError('Senha incorreta');
    }
    setLoading(false);
  };

  const loadEvents = async () => {
    setLoading(true);
    const localEvents = getLocalEvents();
    let allEvents: QuizEvent[] = [...localEvents];
    let source: 'local' | 'supabase' | 'mixed' = 'local';

    try {
      const supabaseEvents = await getEventsFromSupabase();
      if (supabaseEvents.length > 0) {
        const convertedEvents = supabaseEvents.map(convertToQuizEvent);
        allEvents = [...localEvents, ...convertedEvents];
        source = localEvents.length > 0 ? 'mixed' : 'supabase';
      }
    } catch (error) {
      console.warn('Could not fetch from Supabase:', error);
    }

    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
    setEvents(uniqueEvents);
    setDataSource(source);
    setLoading(false);
  };

  const dashboardData = useMemo(() => {
    const range = dateRanges[selectedRange];
    return calculateDashboardData(events, { start: startOfDay(range.start), end: endOfDay(range.end) });
  }, [events, selectedRange]);

  const advancedMetrics = useMemo(() => {
    if (!events.length) return null;
    
    const range = dateRanges[selectedRange];
    const filteredEvents = events.filter(e => {
      const d = new Date(e.timestamp);
      return d >= range.start && d <= range.end;
    });

    const sessions = new Map<string, QuizEvent[]>();
    filteredEvents.forEach(e => {
      const arr = sessions.get(e.sessionId) || [];
      arr.push(e);
      sessions.set(e.sessionId, arr);
    });

    let totalTimeOnQuiz = 0;
    let completedCount = 0;
    let maxStepReached: Record<number, number> = {};
    let deviceBreakdown = { mobile: 0, desktop: 0 };
    let hourlyActivity: Record<number, number> = {};
    let stepTimes: Record<number, number[]> = {};
    
    for (let i = 0; i < 24; i++) hourlyActivity[i] = 0;
    for (let i = 0; i <= 18; i++) {
      maxStepReached[i] = 0;
      stepTimes[i] = [];
    }

    sessions.forEach(sessionEvents => {
      const sorted = sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
      const firstEvent = sorted[0];
      const lastEvent = sorted[sorted.length - 1];
      
      if (firstEvent && lastEvent) {
        totalTimeOnQuiz += (lastEvent.timestamp - firstEvent.timestamp) / 1000;
      }

      const hasComplete = sorted.some(e => e.eventType === 'quiz_complete');
      if (hasComplete) completedCount++;

      const maxStep = Math.max(...sorted.map(e => e.step));
      maxStepReached[maxStep] = (maxStepReached[maxStep] || 0) + 1;

      if (firstEvent?.metadata?.screenWidth) {
        if (firstEvent.metadata.screenWidth < 768) {
          deviceBreakdown.mobile++;
        } else {
          deviceBreakdown.desktop++;
        }
      }

      const hour = new Date(firstEvent?.timestamp || 0).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;

      sorted.forEach(e => {
        if (e.timeSpentOnStep && e.step >= 0) {
          stepTimes[e.step] = stepTimes[e.step] || [];
          stepTimes[e.step].push(e.timeSpentOnStep / 1000);
        }
      });
    });

    const avgTimePerStep = Object.entries(stepTimes).map(([step, times]) => ({
      step: parseInt(step),
      avgTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      count: times.length
    })).filter(s => s.count > 0);

    const dropoffPoints = Object.entries(maxStepReached)
      .map(([step, count]) => ({ step: parseInt(step), count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const hourlyData = Object.entries(hourlyActivity).map(([hour, count]) => ({
      hour: `${hour}h`,
      sessoes: count
    }));

    const conversionByDevice = {
      mobile: { total: deviceBreakdown.mobile, label: 'Mobile' },
      desktop: { total: deviceBreakdown.desktop, label: 'Desktop' }
    };

    const engagementScore = sessions.size > 0 
      ? Math.min(100, Math.round((completedCount / sessions.size) * 100 + (totalTimeOnQuiz / sessions.size / 60) * 5))
      : 0;

    return {
      totalSessions: sessions.size,
      avgSessionDuration: sessions.size > 0 ? totalTimeOnQuiz / sessions.size : 0,
      completedCount,
      dropoffPoints,
      avgTimePerStep,
      hourlyData,
      conversionByDevice,
      engagementScore,
      totalEvents: filteredEvents.length,
      eventsPerSession: sessions.size > 0 ? filteredEvents.length / sessions.size : 0
    };
  }, [events, selectedRange]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5" />
        <div className="relative bg-[#12121A] border border-gray-800 rounded-3xl p-10 w-full max-w-md shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Pro</h1>
            <p className="text-gray-500">Dashboard de Análise Avançada</p>
          </div>

          <div className="space-y-5">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite sua senha"
                className="w-full bg-[#1A1A24] border border-gray-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10 transition-all"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !password}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verificando...
                </span>
              ) : 'Acessar Dashboard'}
            </button>
          </div>

          <p className="text-gray-600 text-xs text-center mt-8">
            Senha padrão: <span className="text-gray-500 font-mono">admin123</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="bg-[#12121A]/80 backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  Analytics Pro
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">LIVE</span>
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">{events.length.toLocaleString()} eventos</span>
                  <span className="w-1 h-1 bg-gray-700 rounded-full" />
                  <span className={`flex items-center gap-1.5 ${
                    dataSource === 'supabase' ? 'text-green-400' :
                    dataSource === 'mixed' ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    <Database className="w-3 h-3" />
                    {dataSource === 'supabase' ? 'Supabase' : dataSource === 'mixed' ? 'Híbrido' : 'Local'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-[#1A1A24] rounded-lg p-1 border border-gray-800">
                {Object.entries(dateRanges).map(([key, range]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedRange(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      selectedRange === key
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <button
                onClick={loadEvents}
                disabled={loading}
                className="bg-[#1A1A24] hover:bg-[#22222E] border border-gray-800 rounded-lg p-2.5 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-400' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>

          <div className="flex gap-1 mt-4 border-b border-gray-800/50 -mb-px">
            {[
              { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'funnel', label: 'Funil', icon: Filter },
              { id: 'behavior', label: 'Comportamento', icon: Activity },
              { id: 'answers', label: 'Respostas', icon: BarChart2 },
              { id: 'events', label: 'Eventos', icon: Layers }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MetricCard
                title="Sessões"
                value={dashboardData.totalSessions}
                icon={<Users className="w-5 h-5" />}
                color="blue"
                subtitle="total"
              />
              <MetricCard
                title="Conversões"
                value={dashboardData.completedSessions}
                icon={<CheckCircle className="w-5 h-5" />}
                color="green"
                subtitle={formatPercent(dashboardData.completionRate)}
                trend={dashboardData.completionRate > 20 ? 'up' : 'down'}
              />
              <MetricCard
                title="Abandonos"
                value={dashboardData.abandonedSessions}
                icon={<XCircle className="w-5 h-5" />}
                color="red"
                subtitle={formatPercent(dashboardData.totalSessions > 0 ? (dashboardData.abandonedSessions / dashboardData.totalSessions) * 100 : 0)}
              />
              <MetricCard
                title="Tempo Médio"
                value={formatTime(advancedMetrics?.avgSessionDuration || 0)}
                icon={<Clock className="w-5 h-5" />}
                color="purple"
                subtitle="por sessão"
              />
              <MetricCard
                title="Engajamento"
                value={advancedMetrics?.engagementScore || 0}
                icon={<Zap className="w-5 h-5" />}
                color="yellow"
                subtitle="score"
                isScore
              />
              <MetricCard
                title="Eventos/Sessão"
                value={(advancedMetrics?.eventsPerSession || 0).toFixed(1)}
                icon={<MousePointer className="w-5 h-5" />}
                color="cyan"
                subtitle="interações"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-500" />
                    Sessões ao Longo do Tempo
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-400" />
                      Sessões
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400" />
                      Conversões
                    </span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dashboardData.timeSeriesData}>
                      <defs>
                        <linearGradient id="gradientSessions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F7D844" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#F7D844" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" vertical={false} />
                      <XAxis dataKey="date" stroke="#4B5563" tick={{ fontSize: 12 }} axisLine={false} />
                      <YAxis stroke="#4B5563" tick={{ fontSize: 12 }} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '12px' }}
                        labelStyle={{ color: '#F7D844', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="sessions" name="Sessões" stroke="#F7D844" fill="url(#gradientSessions)" strokeWidth={2} />
                      <Line type="monotone" dataKey="completions" name="Conversões" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-yellow-500" />
                  Status das Sessões
                </h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Concluídos', value: dashboardData.completedSessions, color: '#10B981' },
                          { name: 'Abandonados', value: dashboardData.abandonedSessions, color: '#EF4444' },
                          { name: 'Em Andamento', value: Math.max(0, dashboardData.totalSessions - dashboardData.completedSessions - dashboardData.abandonedSessions), color: '#F7D844' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { color: '#10B981' },
                          { color: '#EF4444' },
                          { color: '#F7D844' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {[
                    { label: 'Concluídos', value: dashboardData.completedSessions, color: 'bg-green-500', percent: dashboardData.completionRate },
                    { label: 'Abandonados', value: dashboardData.abandonedSessions, color: 'bg-red-500', percent: dashboardData.totalSessions > 0 ? (dashboardData.abandonedSessions / dashboardData.totalSessions) * 100 : 0 },
                    { label: 'Em Andamento', value: Math.max(0, dashboardData.totalSessions - dashboardData.completedSessions - dashboardData.abandonedSessions), color: 'bg-yellow-500', percent: dashboardData.totalSessions > 0 ? (Math.max(0, dashboardData.totalSessions - dashboardData.completedSessions - dashboardData.abandonedSessions) / dashboardData.totalSessions) * 100 : 0 }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-sm text-gray-400">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.value}</span>
                        <span className="text-xs text-gray-500">({item.percent.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-yellow-500" />
                  Tempo Médio por Etapa
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advancedMetrics?.avgTimePerStep.slice(0, 10) || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" horizontal={false} />
                      <XAxis type="number" stroke="#4B5563" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}s`} />
                      <YAxis dataKey="step" type="category" stroke="#4B5563" tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => `#${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(1)}s`, 'Tempo médio']}
                      />
                      <Bar dataKey="avgTime" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Atividade por Horário
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={advancedMetrics?.hourlyData || []}>
                      <defs>
                        <linearGradient id="gradientHourly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" vertical={false} />
                      <XAxis dataKey="hour" stroke="#4B5563" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#4B5563" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="sessoes" name="Sessões" stroke="#3B82F6" fill="url(#gradientHourly)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'funnel' && (
          <div className="space-y-6">
            <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-yellow-500" />
                    Funil de Conversão Detalhado
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">Acompanhe a jornada completa do usuário</p>
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A24] rounded-lg px-4 py-2">
                  <span className="text-gray-400 text-sm">Taxa de Conversão Final:</span>
                  <span className="text-2xl font-bold text-green-400">{formatPercent(dashboardData.completionRate)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {dashboardData.funnel.filter(f => f.step <= 18).map((step, index) => {
                  const maxUsers = dashboardData.funnel[0]?.users || 1;
                  const widthPercent = (step.users / maxUsers) * 100;
                  const prevStep = index > 0 ? dashboardData.funnel[index - 1] : null;
                  const stepConversion = prevStep && prevStep.users > 0 ? (step.users / prevStep.users) * 100 : 100;
                  
                  return (
                    <div key={step.step} className="group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${
                          step.dropoffRate > 30 ? 'bg-red-500/20 text-red-400' :
                          step.dropoffRate > 15 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-white">{step.stepName}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-400">{step.users} usuários</span>
                              {prevStep && (
                                <span className={`flex items-center gap-1 ${stepConversion >= 80 ? 'text-green-400' : stepConversion >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {stepConversion >= 80 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {stepConversion.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-8 bg-[#1A1A24] rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-700 ease-out"
                              style={{ width: `${widthPercent}%` }}
                            />
                            {step.dropoff > 0 && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs">
                                <span className="text-red-400 font-medium">-{step.dropoff}</span>
                                <span className="text-gray-500">({step.dropoffRate.toFixed(1)}% saíram)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Pontos Críticos de Abandono
                </h3>
                <div className="space-y-3">
                  {dashboardData.stepStats
                    .filter(s => s.abandonRate > 10)
                    .sort((a, b) => b.abandonRate - a.abandonRate)
                    .slice(0, 5)
                    .map((step, index) => (
                      <div key={step.step} className="flex items-center justify-between p-3 bg-[#1A1A24] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-red-500/20 text-red-400' :
                            index === 1 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            #{step.step}
                          </span>
                          <span className="text-sm">{step.stepName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${step.abandonRate}%` }} />
                          </div>
                          <span className="text-red-400 font-medium text-sm w-14 text-right">{step.abandonRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  Melhores Taxas de Retenção
                </h3>
                <div className="space-y-3">
                  {dashboardData.stepStats
                    .filter(s => s.views > 0)
                    .sort((a, b) => a.abandonRate - b.abandonRate)
                    .slice(0, 5)
                    .map((step, index) => (
                      <div key={step.step} className="flex items-center justify-between p-3 bg-[#1A1A24] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-green-500/20 text-green-400' :
                            index === 1 ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-teal-500/20 text-teal-400'
                          }`}>
                            #{step.step}
                          </span>
                          <span className="text-sm">{step.stepName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${100 - step.abandonRate}%` }} />
                          </div>
                          <span className="text-green-400 font-medium text-sm w-14 text-right">{(100 - step.abandonRate).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-500" />
                  Métricas de Engajamento
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[#1A1A24] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Score de Engajamento</span>
                      <span className="text-2xl font-bold text-yellow-400">{advancedMetrics?.engagementScore || 0}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500" 
                        style={{ width: `${advancedMetrics?.engagementScore || 0}%` }} 
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-[#1A1A24] rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Eventos por Sessão</span>
                      <span className="text-xl font-bold">{(advancedMetrics?.eventsPerSession || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#1A1A24] rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Duração Média</span>
                      <span className="text-xl font-bold">{formatTime(advancedMetrics?.avgSessionDuration || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Onde os Usuários Param
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advancedMetrics?.dropoffPoints.slice(0, 8) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" vertical={false} />
                      <XAxis dataKey="step" stroke="#4B5563" tick={{ fontSize: 11 }} tickFormatter={(v) => `Etapa ${v}`} />
                      <YAxis stroke="#4B5563" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '8px' }}
                        formatter={(value: number) => [value, 'Usuários que pararam']}
                      />
                      <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'answers' && (
          <div className="space-y-6">
            {Object.entries(dashboardData.answerDistribution).length === 0 ? (
              <div className="bg-[#12121A] border border-gray-800 rounded-2xl p-16 text-center">
                <PieChartIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">Nenhuma resposta registrada</h3>
                <p className="text-gray-600">As respostas aparecerão aqui quando os usuários completarem o quiz</p>
              </div>
            ) : (
              Object.entries(dashboardData.answerDistribution).map(([stepNum, answers]) => {
                const step = parseInt(stepNum);
                const stepStats = dashboardData.stepStats.find(s => s.step === step);
                const sortedAnswers = Object.entries(answers).sort(([, a], [, b]) => b - a);
                const totalAnswers = sortedAnswers.reduce((sum, [, count]) => sum + count, 0);

                return (
                  <div key={step} className="bg-[#12121A] border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <span className="text-xs text-yellow-500 font-medium">ETAPA {step}</span>
                        <h3 className="text-lg font-semibold">{stepStats?.stepName}</h3>
                      </div>
                      <span className="text-gray-500 text-sm">{totalAnswers} respostas</span>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        {sortedAnswers.map(([answer, count], index) => {
                          const percentage = (count / totalAnswers) * 100;
                          return (
                            <div key={answer}>
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-gray-300 truncate max-w-xs">{answer}</span>
                                <span className="text-gray-500 ml-2">{count} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="h-3 bg-[#1A1A24] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={sortedAnswers.map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {sortedAnswers.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid #2D2D3A', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-[#12121A] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-yellow-500" />
                  Log de Eventos em Tempo Real
                </h3>
                <span className="text-gray-500 text-sm">{dashboardData.recentEvents.length} eventos recentes</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1A1A24]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resposta</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {dashboardData.recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-[#1A1A24]/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {format(new Date(event.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4">
                        <EventBadge type={event.eventType} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="text-gray-500">#{event.step}</span>
                        <span className="text-gray-300 ml-2">{event.stepName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                        {event.answer || <span className="text-gray-600">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.timeSpentOnStep ? formatTime(event.timeSpentOnStep / 1000) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {event.sessionId.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {dashboardData.recentEvents.length === 0 && (
                <div className="p-16 text-center">
                  <Activity className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Nenhum evento registrado</h3>
                  <p className="text-gray-600">Os eventos aparecerão aqui em tempo real</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'cyan';
  subtitle?: string;
  trend?: 'up' | 'down';
  isScore?: boolean;
}> = ({ title, value, icon, color, subtitle, trend, isScore }) => {
  const colors = {
    blue: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/20', icon: 'text-blue-400', text: 'text-blue-400' },
    green: { bg: 'from-green-500/10 to-green-600/5', border: 'border-green-500/20', icon: 'text-green-400', text: 'text-green-400' },
    red: { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/20', icon: 'text-red-400', text: 'text-red-400' },
    purple: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/20', icon: 'text-purple-400', text: 'text-purple-400' },
    yellow: { bg: 'from-yellow-500/10 to-yellow-600/5', border: 'border-yellow-500/20', icon: 'text-yellow-400', text: 'text-yellow-400' },
    cyan: { bg: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/20', icon: 'text-cyan-400', text: 'text-cyan-400' },
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color].bg} border ${colors[color].border} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`${colors[color].icon}`}>{icon}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          {isScore && <span className="text-gray-500 text-sm">/100</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">{title}</span>
          {subtitle && <span className={`text-xs ${colors[color].text}`}>{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

const EventBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    quiz_start: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Início' },
    step_view: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Visualização' },
    step_complete: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Concluído' },
    answer_selected: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Resposta' },
    quiz_complete: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Finalizado' },
    quiz_abandon: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Abandono' },
  };

  const style = config[type] || config.step_view;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

export default Dashboard;

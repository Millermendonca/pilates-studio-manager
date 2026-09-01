'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Flame,
  Moon,
  Sun,
  Sunrise,
  MessageSquare,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
  ChevronRight,
  Layers,
  Zap,
  Target,
  ArrowDownRight,
  HelpCircle,
  Phone,
  Printer,
  X,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { getStudentAvatar } from '@/lib/avatar';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda', fullName: 'Segunda-feira' },
  { id: 2, name: 'Terça', fullName: 'Terça-feira' },
  { id: 3, name: 'Quarta', fullName: 'Quarta-feira' },
  { id: 4, name: 'Quinta', fullName: 'Quinta-feira' },
  { id: 5, name: 'Sexta', fullName: 'Sexta-feira' },
  { id: 6, name: 'Sábado', fullName: 'Sábado' },
];

export default function RelatoriosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAYS' | 'HOURS' | 'HEATMAP' | 'OPPORTUNITIES' | 'RETENTION'>('OVERVIEW');
  const [selectedSlotModal, setSelectedSlotModal] = useState<any | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Calculando métricas avançadas de ocupação e inteligência de grade...</p>
      </div>
    );
  }

  const { occupancy, students, financial, rules } = data || {};
  const occupancyByDay = occupancy?.occupancyByDay || [];
  const occupancyByTimeSlot = occupancy?.occupancyByTimeSlot || [];
  const occupancyByPeriod = occupancy?.occupancyByPeriod || {};
  const topPeakSlots = occupancy?.topPeakSlots || [];
  const topIdleSlots = occupancy?.topIdleSlots || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300 pb-12">
      
      {/* Header Principal com Ações e Impressão */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Inteligência Operacional & Analytics Estratégico</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Relatórios Estratégicos & Taxa de Ocupação</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão aprofundada da taxa de ocupação geral, por dia da semana, horários específicos, turnos, picos e oportunidades de receita.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Imprimir Relatório Executivo"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>

          <button
            onClick={fetchReports}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pilates-600/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalcular</span>
          </button>
        </div>
      </div>

      {/* CARDS DE KPIS EXECUTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Taxa de Ocupação Geral */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ocupação Geral da Grade</span>
            <div className="p-2 rounded-xl bg-pilates-50 text-pilates-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{occupancy?.averageRate}%</span>
            <span className="text-xs text-slate-500 font-semibold">
              ({occupancy?.totalSlotsOccupied} / {occupancy?.totalSlotsAvailable} vagas)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                occupancy?.averageRate >= 75
                  ? 'bg-emerald-500'
                  : occupancy?.averageRate >= 45
                  ? 'bg-pilates-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${occupancy?.averageRate}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 pt-0.5">
            Capacidade padrão: <strong className="text-slate-800">{rules?.capacityPerSlot || 4} alunos/turma</strong>
          </p>
        </div>

        {/* KPI 2: Potencial de Faturamento Ocioso */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Potencial com Vagas Livres</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-emerald-600">
              + R$ {occupancy?.potentialMonthlyRevenueGain?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">/mês</span>
          </div>
          <div className="text-[11px] text-slate-500">
            <strong>{occupancy?.idleSlotsCount || 0} vagas livres</strong> (equivale a ~{occupancy?.potentialNewStudents} novos alunos)
          </div>
        </div>

        {/* KPI 3: Desempenho por Turno */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Ocupação por Turnos</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 block">Manhã</span>
              <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.manha?.rate || 0}%</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 block">Tarde</span>
              <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.tarde?.rate || 0}%</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 block">Noite</span>
              <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.noite?.rate || 0}%</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Manhã: 07-11h • Tarde: 14-17h • Noite: 18-20h</p>
        </div>

        {/* KPI 4: Alunos Ativos & Retenção */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Retenção & Alunos Ativos</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{students?.active} alunos</span>
            <span className="text-xs text-purple-700 font-bold">
              ({students?.retentionRate}% retenção)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Pausados: {students?.paused}</span>
            <span>Churn: {students?.churnRate}%</span>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO ANALÍTICA */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'OVERVIEW', label: 'Visão Geral & Turnos', icon: Layers },
          { id: 'DAYS', label: 'Ocupação por Dia da Semana', icon: Calendar },
          { id: 'HOURS', label: 'Ocupação por Horário (07h às 20h)', icon: Clock },
          { id: 'HEATMAP', label: 'Mapa Térmico Completo (Heatmap)', icon: Flame },
          { id: 'OPPORTUNITIES', label: 'Picos & Oportunidades', icon: Target },
          { id: 'RETENTION', label: 'Retenção & Anti-Churn', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-pilates-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= ABA 1: VISÃO GERAL & TURNOS ================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Card de Análise Estratégica dos 3 Turnos */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span>Análise de Desempenho por Turno</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição de ocupação entre os períodos da manhã, tarde e noite em toda a semana.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Turno Manhã */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sunrise className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-sm text-slate-900">Manhã (07:00 - 11:00)</h4>
                  </div>
                  <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.manha?.rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${occupancyByPeriod?.manha?.rate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  <strong>{occupancyByPeriod?.manha?.occupied} vagas ocupadas</strong> de {occupancyByPeriod?.manha?.capacity} totais na semana.
                </p>
                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                  {occupancyByPeriod?.manha?.rate >= 75 ? (
                    <span className="text-emerald-700 font-semibold">🔥 Alta procura matinal. Excelente aproveitamento.</span>
                  ) : (
                    <span className="text-slate-600">💡 Horário com vagas disponíveis para reposições e novas matrículas.</span>
                  )}
                </div>
              </div>

              {/* Turno Tarde */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-sky-500" />
                    <h4 className="font-bold text-sm text-slate-900">Tarde (14:00 - 17:00)</h4>
                  </div>
                  <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.tarde?.rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${occupancyByPeriod?.tarde?.rate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  <strong>{occupancyByPeriod?.tarde?.occupied} vagas ocupadas</strong> de {occupancyByPeriod?.tarde?.capacity} totais na semana.
                </p>
                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                  {occupancyByPeriod?.tarde?.rate <= 40 ? (
                    <span className="text-amber-800 font-semibold">🎯 Oportunidade: Criar pacotes especiais para o turno da tarde.</span>
                  ) : (
                    <span className="text-slate-600">Equilíbrio saudável de ocupação vespertina.</span>
                  )}
                </div>
              </div>

              {/* Turno Noite */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-4 h-4 text-purple-500" />
                    <h4 className="font-bold text-sm text-slate-900">Noite (18:00 - 20:00)</h4>
                  </div>
                  <span className="text-xs font-black text-slate-900">{occupancyByPeriod?.noite?.rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${occupancyByPeriod?.noite?.rate}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  <strong>{occupancyByPeriod?.noite?.occupied} vagas ocupadas</strong> de {occupancyByPeriod?.noite?.capacity} totais na semana.
                </p>
                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                  {occupancyByPeriod?.noite?.rate >= 75 ? (
                    <span className="text-purple-700 font-semibold">🌟 Horário nobre com alta fidelização e fila de espera.</span>
                  ) : (
                    <span className="text-slate-600">Horário pós-trabalho com vagas para expansão.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Rápido por Dia */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Ocupação Sintética por Dia da Semana</h3>
              <button
                onClick={() => setActiveTab('DAYS')}
                className="text-xs font-bold text-pilates-600 hover:text-pilates-800 flex items-center space-x-1"
              >
                <span>Ver Detalhes Completos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {occupancyByDay.map((d: any) => (
                <div
                  key={d.dayOfWeek}
                  onClick={() => setActiveTab('DAYS')}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 transition-colors cursor-pointer space-y-2 text-center"
                >
                  <span className="text-xs font-black text-slate-700 block">{d.dayName}</span>
                  <div className="text-xl font-black text-slate-900">{d.rate}%</div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        d.rate >= 75 ? 'bg-rose-500' : d.rate >= 45 ? 'bg-pilates-600' : 'bg-amber-400'
                      }`}
                      style={{ width: `${d.rate}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{d.occupied}/{d.capacity} vagas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 2: OCUPAÇÃO POR DIA DA SEMANA ================= */}
      {activeTab === 'DAYS' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-pilates-600" />
              <span>Taxa de Ocupação Detalhada por Dia da Semana</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Descubra quais dias têm maior engajamento dos alunos, picos de lotação e horários mais ociosos para cada dia da semana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {occupancyByDay.map((d: any) => {
              let statusBadge = { label: 'Ocioso', bg: 'bg-slate-100 text-slate-600' };
              if (d.rate >= 80) statusBadge = { label: '🔥 Pico / Lotado', bg: 'bg-rose-100 text-rose-800' };
              else if (d.rate >= 55) statusBadge = { label: '🟢 Saudável', bg: 'bg-emerald-100 text-emerald-800' };
              else if (d.rate >= 30) statusBadge = { label: '🟡 Moderado', bg: 'bg-amber-100 text-amber-800' };

              return (
                <div key={d.dayOfWeek} className="p-5 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-slate-900">{d.dayName}</h4>
                      <span className="text-[11px] text-slate-500">{d.occupied} de {d.capacity} vagas preenchidas</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-600">Taxa de Lotação</span>
                      <span className="text-xl font-black text-slate-900">{d.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          d.rate >= 80
                            ? 'bg-rose-500'
                            : d.rate >= 55
                            ? 'bg-emerald-500'
                            : d.rate >= 30
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Horário de Pico</span>
                      <strong className="text-slate-800 text-xs">{d.peakTime}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Mais Ocioso</span>
                      <strong className="text-slate-800 text-xs">{d.idleTime}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= ABA 3: OCUPAÇÃO POR FAIXA DE HORÁRIO ================= */}
      {activeTab === 'HOURS' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-pilates-600" />
              <span>Taxa de Ocupação Consolidada por Horário (07:00 às 20:00)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Média de preenchimento de cada horário somando todos os dias da semana para identificar gargalos e horários livres.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {occupancyByTimeSlot.map((t: any) => {
              const isPeak = t.rate >= 75;
              const isIdle = t.rate <= 25;

              return (
                <div
                  key={t.time}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    isPeak
                      ? 'border-rose-300 bg-rose-50/40'
                      : isIdle
                      ? 'border-slate-200 bg-slate-50/60'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-slate-900 px-2 py-0.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                        {t.time}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {t.period === 'MANHA' ? '🌅 Manhã' : t.period === 'TARDE' ? '☀️ Tarde' : '🌙 Noite'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPeak
                          ? 'bg-rose-100 text-rose-800 font-black'
                          : isIdle
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.rate}% Ocupado
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPeak ? 'bg-rose-500' : isIdle ? 'bg-slate-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${t.rate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{t.occupied} alunos na semana</span>
                    <span>Capacidade: {t.capacity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= ABA 4: MAPA TÉRMICO COMPLETO (HEATMAP) ================= */}
      {activeTab === 'HEATMAP' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Mapa Térmico Interativo da Grade (Pico vs. Ocioso)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Clique em qualquer horário para inspecionar os alunos matriculados, vagas restantes e planos.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                <span>Pico (≥75%)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-400"></span>
                <span>Médio (26-74%)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span>
                <span>Ocioso (≤25%)</span>
              </span>
            </div>
          </div>

          {/* Tabela do Heatmap */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 text-left w-24">Horário</th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d.id} className="p-3 text-center">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800 bg-slate-50/50">
                      {time}
                    </td>
                    {DAYS_OF_WEEK.map((day) => {
                      const slot = occupancy?.matrix?.find(
                        (m: any) => m.dayOfWeek === day.id && m.time === time
                      );
                      const rate = slot?.occupancyRate || 0;
                      const occupied = slot?.occupied || 0;
                      const capacity = slot?.capacity || rules?.capacityPerSlot || 8;

                      let bgClass = 'bg-emerald-50/60 text-emerald-800 border border-emerald-200/60 hover:border-emerald-400';
                      if (rate >= 75) {
                        bgClass = 'bg-rose-500 text-white font-black shadow-2xs hover:bg-rose-600';
                      } else if (rate > 25) {
                        bgClass = 'bg-amber-100 text-amber-950 font-bold border border-amber-300 hover:border-amber-400';
                      }

                      return (
                        <td key={day.id} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedSlotModal(slot)}
                            className={`w-full py-2.5 px-1 rounded-xl text-center transition-all cursor-pointer ${bgClass}`}
                            title={`Clique para ver detalhes de ${day.name} às ${time}`}
                          >
                            <div className="font-bold">{occupied}/{capacity}</div>
                            <div className="text-[10px] opacity-90">{rate}%</div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 5: PICOS & OPORTUNIDADES ================= */}
      {activeTab === 'OPPORTUNITIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Horários de Maior Pico (Gargalos) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <span>Top 5 Horários de Pico (Maior Demanda)</span>
                </h3>
                <p className="text-xs text-slate-500">Turmas com lotação máxima ou fila de espera.</p>
              </div>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full uppercase">
                Gargalos
              </span>
            </div>

            <div className="space-y-2.5">
              {topPeakSlots.map((slot: any, idx: number) => (
                <div
                  key={`${slot.dayOfWeek}-${slot.time}`}
                  onClick={() => setSelectedSlotModal(slot)}
                  className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-200 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{slot.dayName} às {slot.time}</h4>
                      <p className="text-[11px] text-slate-500">
                        {slot.occupied} de {slot.capacity} vagas ocupadas
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-rose-700">{slot.occupancyRate}%</span>
                    <span className="text-[10px] text-rose-600 block font-semibold">100% Lotado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Horários Mais Ociosos (Oportunidades de Campanha) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <span>Top 5 Horários Mais Ociosos (Oportunidades)</span>
                </h3>
                <p className="text-xs text-slate-500">Ideais para promoções, pacotes corporativos ou experimentais.</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">
                Oportunidades
              </span>
            </div>

            <div className="space-y-2.5">
              {topIdleSlots.map((slot: any, idx: number) => (
                <div
                  key={`${slot.dayOfWeek}-${slot.time}`}
                  onClick={() => setSelectedSlotModal(slot)}
                  className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{slot.dayName} às {slot.time}</h4>
                      <p className="text-[11px] text-slate-500">
                        {slot.capacity - slot.occupied} vaga(s) disponível(is)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-700">{slot.occupancyRate}%</span>
                    <span className="text-[10px] text-slate-400 block">Vagas livres</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 6: RETENÇÃO & ANTI-CHURN ================= */}
      {activeTab === 'RETENTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anti-Churn: Alunos Ausentes */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Alunos Ausentes (&gt;10 Dias)</h3>
                  <p className="text-xs text-slate-500">Contato de retenção para evitar evasão</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                {students?.absentAlerts?.length || 0} alunos
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {students?.absentAlerts?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum aluno com ausência crítica registrada. Excelente retenção! 🎉
                </div>
              ) : (
                students?.absentAlerts?.map((std: any) => {
                  const avatar = getStudentAvatar({
                    name: std.name,
                    avatarUrl: std.avatarUrl,
                    photoCompressed: std.photoCompressed,
                  });

                  return (
                    <div
                      key={std.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={avatar}
                          alt={std.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900">{std.name}</h4>
                          <p className="text-[11px] text-slate-500">
                            {std.daysSinceLastClass >= 90
                              ? 'Nunca realizou check-in'
                              : `Ausente há ${std.daysSinceLastClass} dias`}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/55${std.phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(std.name)}%2C%20tudo%20bem%3F%20Sentimos%20sua%20falta%20nas%20aulas%20de%20Pilates!%20Vamos%20agendar%20sua%20volta%3F`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Regra de Perda de Vaga: Atraso > 5 dias ou Pausados */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Vagas Liberadas (Regra dos 5 Dias / Pausa)</h3>
                  <p className="text-xs text-slate-500">
                    Atraso &gt; {rules?.maxOverdueDaysBeforeSlotRelease}d ou matrícula pausada
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {students?.studentsAtRiskOfSlotLoss?.length || 0} alunos
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {students?.studentsAtRiskOfSlotLoss?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum aluno em atraso crítico ou pausado no momento.
                </div>
              ) : (
                students?.studentsAtRiskOfSlotLoss?.map((std: any) => {
                  const avatar = getStudentAvatar({
                    name: std.name,
                    avatarUrl: std.avatarUrl,
                    photoCompressed: std.photoCompressed,
                  });

                  return (
                    <div
                      key={std.id}
                      className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={avatar}
                          alt={std.name}
                          className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900">{std.name}</h4>
                          <p className="text-[11px] text-amber-900">
                            {std.isPaused ? 'Matrícula Pausada' : `Inadimplente (> ${rules?.maxOverdueDaysBeforeSlotRelease} dias)`} • {std.schedulesCount} vaga(s)
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold">
                        Liberada p/ Fila
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER DE INSPEÇÃO DO HORÁRIO SELECIONADO NO MAPA TÉRMICO */}
      {selectedSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pilates-500/20 border border-pilates-400/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-pilates-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {selectedSlotModal.dayName} às {selectedSlotModal.time}
                  </h3>
                  <span className="text-[11px] text-slate-300">
                    Ocupação: <strong>{selectedSlotModal.occupancyRate}%</strong> ({selectedSlotModal.occupied}/{selectedSlotModal.capacity} vagas preenchidas)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlotModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alunos com Horário Fixo nesta Turma:
                </h4>
              </div>

              {selectedSlotModal.students && selectedSlotModal.students.length > 0 ? (
                <div className="space-y-2">
                  {selectedSlotModal.students.map((st: any) => {
                    const avatar = getStudentAvatar({
                      name: st.name,
                      avatarUrl: st.avatarUrl,
                      photoCompressed: st.photoCompressed,
                    });

                    return (
                      <div
                        key={st.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={avatar}
                            alt={st.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <h5 className="font-bold text-slate-900">{st.name}</h5>
                            <p className="text-[10px] text-slate-500">{st.planName || 'Plano Semanal'}</p>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/55${st.phone?.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Nenhum aluno fixo matriculado neste horário no momento. Vagas 100% disponíveis!
                </div>
              )}

              {/* Informações da Turma */}
              <div className="p-3 bg-pilates-50 rounded-2xl border border-pilates-100 text-xs space-y-1 text-pilates-900">
                <div className="flex justify-between">
                  <span>Vagas Disponíveis:</span>
                  <strong>{selectedSlotModal.capacity - selectedSlotModal.occupied} vaga(s)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Capacidade Máxima:</span>
                  <strong>{selectedSlotModal.capacity} alunos</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Link
                href="/agenda"
                className="text-xs font-bold text-pilates-600 hover:text-pilates-800 flex items-center space-x-1"
              >
                <span>Abrir na Agenda</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setSelectedSlotModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

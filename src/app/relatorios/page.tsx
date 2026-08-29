'use client';

import React, { useEffect, useState } from 'react';
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
  MessageSquare,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' },
];

export default function RelatoriosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <p className="text-xs font-semibold text-slate-500">Calculando métricas e ocupação da grade...</p>
      </div>
    );
  }

  const { occupancy, students, financial, rules } = data || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Inteligência Operacional & Analytics</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Relatórios Estratégicos do Estúdio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Análise de taxa de ocupação, horários de pico vs. ociosos, retenção de alunos (anti-churn) e previsão de receita.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Atualizar Indicadores</span>
        </button>
      </div>

      {/* CARDS DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Taxa de Ocupação */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Taxa Média de Ocupação</span>
            <div className="p-2 rounded-xl bg-pilates-50 text-pilates-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{occupancy?.averageRate}%</span>
            <span className="text-xs text-slate-400 font-semibold">
              ({occupancy?.totalSlotsOccupied} de {occupancy?.totalSlotsAvailable} vagas)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-pilates-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancy?.averageRate}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Retenção & Alunos */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Retenção de Alunos</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{students?.retentionRate}%</span>
            <span className="text-xs text-emerald-600 font-bold">
              {students?.active} ativos
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Pausados: {students?.paused}</span>
            <span>Churn: {students?.churnRate}%</span>
          </div>
        </div>

        {/* KPI 3: Receita Prevista */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Faturamento Mensal Previsto</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              R$ {financial?.expectedMonthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Ticket Médio: <strong className="text-slate-800">R$ {financial?.averageTicket?.toFixed(2)}/aluno</strong>
          </p>
        </div>

        {/* KPI 4: Alertas de Ausência & Perda de Vaga */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Alerta Anti-Churn (Ausentes)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">
              {students?.absentAlerts?.length || 0}
            </span>
            <span className="text-xs text-slate-400 font-semibold">alunos sem vir há &gt;10d</span>
          </div>
          <p className="text-[11px] text-rose-700 font-medium">
            Risco de evasão: contatar no WhatsApp
          </p>
        </div>
      </div>

      {/* SEÇÃO 1: MATRIZ DE OCUPAÇÃO DA GRADE (HEATMAP DE HORÁRIOS) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Mapa de Ocupação da Grade (Pico vs. Ocioso)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Identifique horários com 100% de lotação para abrir novas turmas e horários ociosos para promoções.
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
                    const capacity = slot?.capacity || 4;

                    let bgClass = 'bg-emerald-50/60 text-emerald-800 border border-emerald-200/60';
                    if (rate >= 75) {
                      bgClass = 'bg-rose-500 text-white font-black shadow-2xs';
                    } else if (rate > 25) {
                      bgClass = 'bg-amber-100 text-amber-950 font-bold border border-amber-300';
                    }

                    return (
                      <td key={day.id} className="p-2 text-center">
                        <div
                          className={`py-2 px-1 rounded-xl text-center transition-all ${bgClass}`}
                          title={`${day.name} às ${time}: ${occupied}/${capacity} alunos (${rate}% de ocupação)`}
                        >
                          <div className="font-bold">{occupied}/{capacity}</div>
                          <div className="text-[10px] opacity-80">{rate}%</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: ALERTA ANTI-CHURN & PERDA DE VAGAS */}
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

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {students?.absentAlerts?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum aluno com ausência crítica registrada. Excelente retenção! 🎉
              </div>
            ) : (
              students?.absentAlerts?.map((std: any) => (
                <div
                  key={std.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{std.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {std.daysSinceLastClass >= 90
                        ? 'Nunca realizou check-in'
                        : `Ausente há ${std.daysSinceLastClass} dias`}
                    </p>
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
              ))
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

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {students?.studentsAtRiskOfSlotLoss?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum aluno em atraso crítico ou pausado no momento.
              </div>
            ) : (
              students?.studentsAtRiskOfSlotLoss?.map((std: any) => (
                <div
                  key={std.id}
                  className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{std.name}</h4>
                    <p className="text-[11px] text-amber-900">
                      {std.isPaused ? 'Matrícula Pausada' : `Inadimplente (> ${rules?.maxOverdueDaysBeforeSlotRelease} dias)`} • {std.schedulesCount} vaga(s) na grade
                    </p>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold">
                    Vaga Liberada para Fila
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

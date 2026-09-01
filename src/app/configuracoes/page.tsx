'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Clock,
  Users,
  MapPin,
  QrCode,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Share2,
  Building2,
  FileText,
  Search,
  Lock,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
  CreditCard,
  MessageSquare,
  DollarSign,
  Plus,
  Tag,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { fetchAddressByCep } from '@/lib/cep';
import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  formatStudioOperatingSummary,
} from '@/lib/operatingHours';

export interface PlanConfigItem {
  id: string;
  name: string;
  price: number;
  weeklyDays: number;
  description: string;
}

export const DEFAULT_PLANS: PlanConfigItem[] = [
  { id: '1x', name: '1x por Semana', price: 220.0, weeklyDays: 1, description: '1 aula fixa por semana (4 aulas/mês)' },
  { id: '2x', name: '2x por Semana', price: 340.0, weeklyDays: 2, description: '2 aulas fixas por semana (8 aulas/mês)' },
  { id: '3x', name: '3x por Semana', price: 460.0, weeklyDays: 3, description: '3 aulas fixas por semana (12 aulas/mês)' },
  { id: '4x', name: '4x por Semana', price: 580.0, weeklyDays: 4, description: '4 aulas fixas por semana (16 aulas/mês)' },
  { id: 'livre', name: 'Plano Livre / Diário', price: 750.0, weeklyDays: 6, description: 'Acesso livre / aulas diárias' },
  { id: 'avulsa', name: 'Aula Avulsa / Experimental', price: 85.0, weeklyDays: 0, description: 'Cobrança avulsa por aula avulsa/experimental' },
];

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanConfigItem[]>(DEFAULT_PLANS);
  const [operatingHours, setOperatingHours] = useState<OperatingDayConfig[]>(DEFAULT_OPERATING_HOURS);

  const [form, setForm] = useState({
    studioName: 'Studio Pilates Harmonia',
    cep: '01310-100',
    address: 'Av. Paulista, 1500',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    latitude: -23.561684,
    longitude: -46.655981,
    cancelWindowHours: 2,
    creditValidityDays: 30,
    defaultClassCapacity: 4,
    checkinRadiusMeters: 60.0,
    checkinDwellMinutes: 30,
    monthlyRescheduleLimit: 2,
    maxOverdueDaysBeforeSlotRelease: 5,
    contractTermsText: '',
    pixKey: 'contato@pilatesharmonia.com.br',
    pixKeyType: 'EMAIL',
    pixRecipientName: 'Studio Pilates Harmonia Ltda',
    pixRecipientCity: 'SAO PAULO',
    bancoInterClientId: '',
    bancoInterClientSecret: '',
    bancoInterCertPath: '',
    bancoInterKeyPath: '',
    bancoInterContaCorrente: '',
    bancoInterAmbiente: 'SANDBOX',
    bancoInterPixChave: '',
    googleReviewUrl: 'https://maps.app.goo.gl/sUoFd6YoGGLMLkMi9',
    instagram: 'pilatescenter',
    whatsapp: '22999623247',
    whatsappInviteTemplate: 'Olá, {NOME}! Seja muito bem-vindo(a) ao {ESTUDIO}! 🧘‍♀️✨\n\nSeu pré-cadastro foi realizado com sucesso. Para completar sua ficha médica, endereço e assinar o contrato digital no celular, acesse o link abaixo:\n{LINK}',
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) {
        setForm({
          studioName: data.studioName || 'Studio Pilates Harmonia',
          cep: data.cep || '01310-100',
          address: data.address || 'Av. Paulista, 1500',
          neighborhood: data.neighborhood || 'Bela Vista',
          city: data.city || 'São Paulo',
          state: data.state || 'SP',
          latitude: data.latitude || -23.561684,
          longitude: data.longitude || -46.655981,
          cancelWindowHours: data.cancelWindowHours ?? 2,
          creditValidityDays: data.creditValidityDays ?? 30,
          defaultClassCapacity: data.defaultClassCapacity ?? 4,
          checkinRadiusMeters: data.checkinRadiusMeters ?? 60.0,
          checkinDwellMinutes: data.checkinDwellMinutes ?? 30,
          monthlyRescheduleLimit: data.monthlyRescheduleLimit ?? 2,
          maxOverdueDaysBeforeSlotRelease: data.maxOverdueDaysBeforeSlotRelease ?? 5,
          contractTermsText: data.contractTermsText || '',
          pixKey: data.pixKey || '',
          pixKeyType: data.pixKeyType || 'EMAIL',
          pixRecipientName: data.pixRecipientName || '',
          pixRecipientCity: data.pixRecipientCity || '',
          bancoInterClientId: data.bancoInterClientId || '',
          bancoInterClientSecret: data.bancoInterClientSecret || '',
          bancoInterCertPath: data.bancoInterCertPath || '',
          bancoInterKeyPath: data.bancoInterKeyPath || '',
          bancoInterContaCorrente: data.bancoInterContaCorrente || '',
          bancoInterAmbiente: data.bancoInterAmbiente || 'SANDBOX',
          bancoInterPixChave: data.bancoInterPixChave || '',
          googleReviewUrl: data.googleReviewUrl || 'https://maps.app.goo.gl/sUoFd6YoGGLMLkMi9',
          instagram: data.instagram || 'pilatescenter',
          whatsapp: data.whatsapp || '22999623247',
          whatsappInviteTemplate: data.whatsappInviteTemplate || 'Olá, {NOME}! Seja muito bem-vindo(a) ao {ESTUDIO}! 🧘‍♀️✨\n\nSeu pré-cadastro foi realizado com sucesso. Para completar sua ficha médica, endereço e assinar o contrato digital no celular, acesse o link abaixo:\n{LINK}',
        });

        if (data.plansJson) {
          try {
            const parsed = JSON.parse(data.plansJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPlans(parsed);
            }
          } catch (e) {
            console.error('Erro ao ler plansJson:', e);
          }
        }

        if (data.operatingHoursJson) {
          try {
            const parsed = JSON.parse(data.operatingHoursJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setOperatingHours(parsed);
            }
          } catch (e) {
            console.error('Erro ao ler operatingHoursJson:', e);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOperatingDayChange = (dayOfWeek: number, field: keyof OperatingDayConfig, value: any) => {
    setOperatingHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const handleReplicateWeekdayHours = (sourceDayOfWeek: number = 1) => {
    const source = operatingHours.find((d) => d.dayOfWeek === sourceDayOfWeek);
    if (!source) return;

    setOperatingHours((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
          return {
            ...d,
            isOpen: source.isOpen,
            openTime: source.openTime,
            closeTime: source.closeTime,
          };
        }
        return d;
      })
    );
  };

  const handlePlanChange = (index: number, field: keyof PlanConfigItem, value: any) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddPlan = () => {
    const newId = `plano_${Date.now()}`;
    setPlans((prev) => [
      ...prev,
      {
        id: newId,
        name: 'Novo Plano',
        price: 350.0,
        weeklyDays: 2,
        description: 'Descrição do novo plano',
      },
    ]);
  };

  const handleRemovePlan = (index: number) => {
    setPlans((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetPlans = () => {
    setPlans(DEFAULT_PLANS);
  };

  const handleStudioCepLookup = async (cepInput: string) => {
    const raw = cepInput.replace(/\D/g, '');
    if (raw.length !== 8) return;

    setCepLoading(true);
    setCepFeedback(null);
    try {
      const data = await fetchAddressByCep(raw);
      if (data) {
        setForm((prev) => ({
          ...prev,
          cep: data.cep,
          address: data.street,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          latitude: data.latitude || prev.latitude,
          longitude: data.longitude || prev.longitude,
        }));
        setCepFeedback(`✓ Endereço localizado no mapa: ${data.city} - ${data.state}`);
      }
    } catch (err: any) {
      setCepFeedback(`✕ ${err.message || 'Erro ao buscar CEP'}`);
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          plansJson: JSON.stringify(plans),
          operatingHoursJson: JSON.stringify(operatingHours),
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      setSuccess('Configurações, horários de funcionamento, tabela de planos/preços e credenciais salvas com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);

  const handleResetTestData = async () => {
    setResettingData(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/reset-test-data', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao resetar dados de teste');
      }
      setSuccess(data.message || 'Base de dados de teste limpa com sucesso!');
      setResetModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao resetar base de teste');
    } finally {
      setResettingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Carregando configurações do estúdio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-bold text-xs uppercase tracking-wider mb-1">
            <SettingsIcon className="w-4 h-4" />
            <span>Painel Administrativo & Integrações</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Configurações & Regras do Estúdio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina o endereço por CEP, regras de cancelamento, perda de vaga por atraso (>5d), contrato digital e integração com Banco Inter.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pilates-600/20 disabled:opacity-50 transition-all whitespace-nowrap"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar Todas as Regras</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CARD DE DESTAQUE: CENTRAL DE COMUNICAÇÃO & AUTOMAÇÃO */}
      <div className="bg-gradient-to-r from-pilates-700 via-pilates-800 to-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-white">Central de Comunicação & Automação</h2>
              <span className="bg-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase">Novo</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              Configure quais eventos disparam mensagens, personalize textos com variáveis dinâmicas e escolha os canais (WhatsApp, Chat do App, Push, E-mail e SMS).
            </p>
          </div>
        </div>

        <Link
          href="/configuracoes/comunicacao"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black rounded-2xl shadow-lg transition-transform hover:scale-105 shrink-0"
        >
          <span>Abrir Central de Comunicação</span>
          <ExternalLink className="w-4 h-4 text-pilates-600" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SEÇÃO 1: ENDEREÇO DO ESTÚDIO COM CEP & GEOLOCALIZAÇÃO */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-pilates-50 text-pilates-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Identificação & Localização (Busca por CEP)</h2>
              <p className="text-xs text-slate-500">
                Endereço oficial do estúdio e ponto central do mapa de calor e raio de check-in GPS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Estúdio *
              </label>
              <input
                type="text"
                value={form.studioName}
                onChange={(e) => handleChange('studioName', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            {/* CEP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CEP do Estúdio (8 dígitos) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => {
                    handleChange('cep', e.target.value);
                    if (e.target.value.replace(/\D/g, '').length === 8) {
                      handleStudioCepLookup(e.target.value);
                    }
                  }}
                  onBlur={() => handleStudioCepLookup(form.cep)}
                  placeholder="01310-100"
                  className="w-full pl-3.5 pr-9 py-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleStudioCepLookup(form.cep)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-pilates-600"
                >
                  {cepLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {cepFeedback && (
                <p className="text-[11px] font-bold mt-1 text-pilates-700">{cepFeedback}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logradouro / Endereço Completo
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Av. Paulista, 1500"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => handleChange('neighborhood', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO: HORÁRIOS DE FUNCIONAMENTO & DIAS DA SEMANA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-pilates-50 text-pilates-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-black text-slate-900">Horários de Funcionamento & Dias de Abertura</h2>
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Expediente</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure abertura, fechamento e dias de funcionamento. A agenda e relatórios calculam os slots de aula automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleReplicateWeekdayHours(1)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-pilates-200 bg-pilates-50/70 text-xs font-bold text-pilates-800 hover:bg-pilates-100 transition-colors"
                title="Copiar horários de Segunda-feira para Terça, Quarta, Quinta e Sexta"
              >
                <Sparkles className="w-3.5 h-3.5 text-pilates-600" />
                <span>Replicar Seg p/ Ter-Sex</span>
              </button>
            </div>
          </div>

          {/* Resumo Formatado */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resumo do Expediente:</span>
              <strong className="text-slate-800 font-bold">{formatStudioOperatingSummary(operatingHours)}</strong>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Exibido no App do Aluno e Rodapés</span>
          </div>

          {/* Grid dos 7 Dias da Semana */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {operatingHours.map((day) => {
              const daySlots = generateSlotsForDay(day);
              const lastSlot = daySlots[daySlots.length - 1];

              return (
                <div
                  key={day.dayOfWeek}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    day.isOpen
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/60 opacity-75'
                  }`}
                >
                  {/* Topo do Card do Dia */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{day.dayName}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          day.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {day.isOpen ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>

                    {/* Switch Aberto / Fechado */}
                    <button
                      type="button"
                      onClick={() => handleOperatingDayChange(day.dayOfWeek, 'isOpen', !day.isOpen)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        day.isOpen ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={day.isOpen ? 'Clique para fechar o estúdio neste dia' : 'Clique para abrir o estúdio neste dia'}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          day.isOpen ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {day.isOpen ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Abertura
                          </label>
                          <input
                            type="time"
                            value={day.openTime}
                            onChange={(e) => handleOperatingDayChange(day.dayOfWeek, 'openTime', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Fechamento
                          </label>
                          <input
                            type="time"
                            value={day.closeTime}
                            onChange={(e) => handleOperatingDayChange(day.dayOfWeek, 'closeTime', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div className="p-2 bg-pilates-50/60 rounded-xl border border-pilates-100 text-[10px] text-pilates-900 space-y-0.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Último horário de aula:</span>
                          <strong className="font-mono font-bold text-pilates-800">{lastSlot || '--:--'}</strong>
                        </div>
                        <span className="text-[9px] text-slate-500 block">
                          Aula de 1h termina às {day.closeTime} • {daySlots.length} turmas no dia
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400 font-medium">
                      Estúdio fechado aos {day.dayName.toLowerCase()}s. Nenhuma aula disponível.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SEÇÃO 2: GESTÃO DE PLANOS & TABELA DE PREÇOS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Planos de Aulas & Tabela de Preços</h2>
                <p className="text-xs text-slate-500">
                  Edite os valores das mensalidades, limites de dias fixos por semana e crie novos planos personalizados.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetPlans}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Restaurar planos padrão recomendados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrões</span>
              </button>
              <button
                type="button"
                onClick={handleAddPlan}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Plano</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, index) => (
              <div
                key={plan.id || index}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Plano #{index + 1}</span>
                  </div>
                  {plans.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlan(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Excluir este plano"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Plano</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                    placeholder="Ex: 2x por Semana"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Preço Mensal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={plan.price}
                      onChange={(e) => handlePlanChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-black text-emerald-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Dias/Semana (Limite)</label>
                    <select
                      value={plan.weeklyDays}
                      onChange={(e) => handlePlanChange(index, 'weeklyDays', parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value={0}>0 (Apenas Avulso)</option>
                      <option value={1}>1 dia / semana</option>
                      <option value={2}>2 dias / semana</option>
                      <option value={3}>3 dias / semana</option>
                      <option value={4}>4 dias / semana</option>
                      <option value={5}>5 dias / semana</option>
                      <option value={6}>6 dias (Livre/Ilimitado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrição Breve</label>
                  <input
                    type="text"
                    value={plan.description || ''}
                    onChange={(e) => handlePlanChange(index, 'description', e.target.value)}
                    placeholder="Ex: 8 aulas/mês com reposição"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-[11px] text-slate-600 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO 3: REGRAS OPERACIONAIS, REMARCAÇÃO & PERDA DE VAGA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Regras Operacionais, Limites & Vagas Fixas</h2>
              <p className="text-xs text-slate-500">
                Configure limites de remarcação e a política de liberação de vagas para a fila de espera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Limite de Remarcação por Mês */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Limite de Remarcações por Mês
              </label>
              <p className="text-[11px] text-slate-500">
                Quantidade máxima de trocas de horário permitidas por aluno a cada ciclo mensal.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.monthlyRescheduleLimit}
                  onChange={(e) => handleChange('monthlyRescheduleLimit', parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-center"
                />
                <span className="text-xs font-semibold text-slate-600">remarcações/mês</span>
              </div>
            </div>

            {/* Perda de Vaga por Atraso */}
            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1">
              <label className="block text-xs font-bold text-rose-900">
                Perda de Vaga por Inadimplência
              </label>
              <p className="text-[11px] text-rose-800">
                Dias de atraso na fatura para liberar automaticamente a vaga fixa para a fila de espera.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.maxOverdueDaysBeforeSlotRelease}
                  onChange={(e) => handleChange('maxOverdueDaysBeforeSlotRelease', parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-rose-300 rounded-xl text-xs font-bold bg-white text-center text-rose-900"
                />
                <span className="text-xs font-semibold text-rose-800">dias de atraso</span>
              </div>
            </div>

            {/* Janela de Cancelamento */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Aviso Prévio de Cancelamento
              </label>
              <p className="text-[11px] text-slate-500">
                Horas de antecedência para que a ausência gere crédito de reposição.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.cancelWindowHours}
                  onChange={(e) => handleChange('cancelWindowHours', parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-center"
                />
                <span className="text-xs font-semibold text-slate-600">horas antes da aula</span>
              </div>
            </div>

            {/* Validade dos Créditos */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Validade do Crédito de Reposição
              </label>
              <p className="text-[11px] text-slate-500">
                Dias de prazo para o aluno agendar a reposição antes do crédito expirar.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={form.creditValidityDays}
                  onChange={(e) => handleChange('creditValidityDays', parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-center"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>

            {/* Capacidade por Horário */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Capacidade Padrão da Turma
              </label>
              <p className="text-[11px] text-slate-500">
                Número máximo de alunos atendidos simultaneamente por horário.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.defaultClassCapacity}
                  onChange={(e) => handleChange('defaultClassCapacity', parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-center"
                />
                <span className="text-xs font-semibold text-slate-600">alunos / horário</span>
              </div>
            </div>

            {/* Raio de Check-in GPS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Raio de Check-in GPS Automático
              </label>
              <p className="text-[11px] text-slate-500">
                Distância máxima do estúdio para validar a presença do aluno.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={form.checkinRadiusMeters}
                  onChange={(e) => handleChange('checkinRadiusMeters', parseFloat(e.target.value))}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-center"
                />
                <span className="text-xs font-semibold text-slate-600">metros do estúdio</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: CONTRATO DIGITAL & TERMOS DE RESPONSABILIDADE */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Contrato de Prestação de Serviços & Termos</h2>
              <p className="text-xs text-slate-500">
                Este texto será exibido para o aluno dar o aceite digital obrigatório no primeiro acesso ao App e na matrícula.
              </p>
            </div>
          </div>

          <div>
            <textarea
              rows={8}
              value={form.contractTermsText}
              onChange={(e) => handleChange('contractTermsText', e.target.value)}
              placeholder="Digite os termos do contrato do seu estúdio..."
              className="w-full p-4 border border-slate-300 rounded-2xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dica: Você pode usar variáveis como <code>&#123;&#123;NOME_ALUNO&#125;&#125;</code>, <code>&#123;&#123;PLANO&#125;&#125;</code> e <code>&#123;&#123;VALOR&#125;&#125;</code>.
            </p>
          </div>
        </div>

        {/* SEÇÃO 4: INTEGRAÇÃO BANCO INTER & PIX AUTOMÁTICO */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Integração Bancária: Banco Inter & PIX Automático</h2>
                <p className="text-xs text-slate-500">
                  Configure as chaves e certificados mTLS para cobrança instantânea e recorrência automática.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
              API Inter v2
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Chave PIX Padrão */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chave PIX do Estúdio *
              </label>
              <input
                type="text"
                value={form.pixKey}
                onChange={(e) => handleChange('pixKey', e.target.value)}
                placeholder="contato@seuestudio.com.br ou CNPJ"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Nome do Beneficiário */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Beneficiário (Razão Social / Titular)
              </label>
              <input
                type="text"
                value={form.pixRecipientName}
                onChange={(e) => handleChange('pixRecipientName', e.target.value)}
                placeholder="Studio Pilates Harmonia Ltda"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Ambiente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ambiente da API Inter
              </label>
              <select
                value={form.bancoInterAmbiente}
                onChange={(e) => handleChange('bancoInterAmbiente', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="SANDBOX">Sandbox (Testes)</option>
                <option value="PRODUCAO">Produção (Conta Real Inter Empresas)</option>
              </select>
            </div>

            {/* Conta Corrente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Conta Corrente Banco Inter
              </label>
              <input
                type="text"
                value={form.bancoInterContaCorrente}
                onChange={(e) => handleChange('bancoInterContaCorrente', e.target.value)}
                placeholder="Ex: 1234567-8"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client ID (Aplicações Banco Inter)
              </label>
              <input
                type="text"
                value={form.bancoInterClientId}
                onChange={(e) => handleChange('bancoInterClientId', e.target.value)}
                placeholder="Cole o Client ID gerado no Internet Banking"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={form.bancoInterClientSecret}
                onChange={(e) => handleChange('bancoInterClientSecret', e.target.value)}
                placeholder="••••••••••••••••••••••••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Caminho Certificado CRT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Caminho do Certificado (.crt)
              </label>
              <input
                type="text"
                value={form.bancoInterCertPath}
                onChange={(e) => handleChange('bancoInterCertPath', e.target.value)}
                placeholder="Ex: certs/inter.crt"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Caminho Chave KEY */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Caminho da Chave Privada (.key)
              </label>
              <input
                type="text"
                value={form.bancoInterKeyPath}
                onChange={(e) => handleChange('bancoInterKeyPath', e.target.value)}
                placeholder="Ex: certs/inter.key"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 5: REDES SOCIAIS & WHATSAPP */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Canais de Comunicação & Avaliação</h2>
              <p className="text-xs text-slate-500">
                Links exibidos para os alunos no aplicativo e botões de contato rápido.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp do Estúdio</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="22999623247"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instagram (@)</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="pilatescenter"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps (Avaliações)</label>
              <input
                type="text"
                value={form.googleReviewUrl}
                onChange={(e) => handleChange('googleReviewUrl', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              />
            </div>
          </div>

          {/* MODELO DE MENSAGEM DO WHATSAPP DE CONVITE */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Mensagem Automática de Convite no WhatsApp (Cadastro Rápido)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Tags Dinâmicas Disponíveis
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Esta é a mensagem que será enviada quando o administrador cadastrar um novo aluno e clicar em <strong>"📲 Enviar Convite no WhatsApp"</strong>. Você pode personalizar o texto e usar as tags abaixo:
            </p>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                <strong className="text-pilates-700">{'{NOME}'}</strong> = Nome do Aluno
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                <strong className="text-pilates-700">{'{ESTUDIO}'}</strong> = Nome do Estúdio
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                <strong className="text-pilates-700">{'{LINK}'}</strong> = Link Único de Matrícula
              </span>
            </div>

            <textarea
              rows={5}
              value={form.whatsappInviteTemplate}
              onChange={(e) => handleChange('whatsappInviteTemplate', e.target.value)}
              placeholder="Olá, {NOME}! Seja muito bem-vindo(a)..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none font-mono leading-relaxed"
            />

            {/* Prévia em tempo real */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Prévia ao Vivo do que o Aluno Receberá no WhatsApp:
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">WhatsApp Web / Mobile</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-xs font-sans">
                {form.whatsappInviteTemplate
                  ? form.whatsappInviteTemplate
                      .replace(/{NOME}/g, 'Mariana Silva')
                      .replace(/{ESTUDIO}/g, form.studioName || 'Studio Pilates Harmonia')
                      .replace(
                        /{LINK}/g,
                        'http://localhost:3000/matricula?phone=22998505276'
                      )
                  : ''}
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 6: MANUTENÇÃO & LIMPEZA DE DADOS DE TESTE */}
        <div className="bg-gradient-to-r from-rose-50/70 via-white to-rose-50/70 p-6 rounded-3xl shadow-sm border border-rose-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Manutenção & Limpeza de Dados de Teste</h2>
                <p className="text-xs text-slate-500">
                  Zere todos os alunos e agendamentos de teste antes de iniciar a operação real do estúdio.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>🧹 Zerar Dados de Teste</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/90 rounded-2xl border border-rose-100 text-slate-700 space-y-1">
              <span className="font-bold text-rose-900 flex items-center space-x-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>O que será apagado:</span>
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1 text-[11px]">
                <li>Todos os <strong>alunos cadastrados</strong> no teste</li>
                <li>Toda a <strong>agenda</strong> (aulas agendadas, presenças e faltas)</li>
                <li>Todas as <strong>faturas e cobranças PIX</strong> geradas no teste</li>
                <li>Filas de espera e créditos de reposição</li>
              </ul>
            </div>

            <div className="p-3 bg-white/90 rounded-2xl border border-emerald-200 text-slate-700 space-y-1">
              <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>O que permanece 100% SEGURO e INTACTO:</span>
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1 text-[11px]">
                <li><strong>Nome, Endereço e CEP</strong> do estúdio</li>
                <li><strong>Coordenadas do Mapa</strong> e raio de check-in GPS</li>
                <li><strong>WhatsApp, Instagram e link de avaliações</strong></li>
                <li><strong>Chave PIX e Credenciais do Banco Inter</strong></li>
                <li><strong>Cláusulas do Contrato Digital</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botão Final Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-8 py-3 bg-pilates-600 hover:bg-pilates-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-pilates-600/20 disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>

      {/* MODAL DE CONFIRMAÇÃO DE RESET */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between border-b border-rose-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-600/40 border border-rose-400/30 text-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Confirmar Limpeza de Teste</h3>
                  <p className="text-xs text-rose-200">Esta ação é irreversível para os alunos fakes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-1.5">
                <p className="font-bold">⚠️ Tem certeza que deseja zerar a base de testes?</p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Todos os alunos simulados, aulas marcadas e cobranças serão excluídos para que você possa cadastrar os alunos reais.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 space-y-1 text-[11px]">
                <p>✅ <strong>Configurações do Estúdio mantidas:</strong></p>
                <p>Endereço, WhatsApp, Instagram, Google Maps, Contrato e credenciais do Banco Inter não serão afetados.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetTestData}
                disabled={resettingData}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
              >
                {resettingData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpando base...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Zerar Tudo Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

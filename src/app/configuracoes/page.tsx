'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { fetchAddressByCep } from '@/lib/cep';

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);

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
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      setSuccess('Configurações, regras operacionais e credenciais salvas com sucesso!');
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

        {/* SEÇÃO 2: REGRAS OPERACIONAIS, REMARCAÇÃO & PERDA DE VAGA */}
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

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Smartphone,
  Mail,
  Bell,
  Radio,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  Share2,
  Layers,
  Clock,
  DollarSign,
  HeartPulse,
  UserPlus,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Send,
  Zap,
  Info,
  ShieldCheck,
  Server,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  CommunicationRule,
  CommunicationChannel,
  CommunicationCategory,
  GatewaySettings,
  DEFAULT_COMMUNICATION_RULES,
  renderMessageTemplate,
} from '@/lib/communication';

const CHANNEL_INFO: Record<
  CommunicationChannel,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }
> = {
  WHATSAPP: {
    label: 'WhatsApp',
    icon: Smartphone,
    color: 'emerald',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  CHAT: {
    label: 'Chat do App',
    icon: MessageSquare,
    color: 'sky',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  PUSH: {
    label: 'Push Notification',
    icon: Bell,
    color: 'purple',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  EMAIL: {
    label: 'E-mail',
    icon: Mail,
    color: 'amber',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  SMS: {
    label: 'SMS',
    icon: Radio,
    color: 'rose',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

const CATEGORIES: { id: 'ALL' | CommunicationCategory | 'GATEWAYS'; label: string; icon: any }[] = [
  { id: 'ALL', label: 'Todos os Eventos', icon: Layers },
  { id: 'MATRICULA', label: 'Matrícula & Cadastro', icon: UserPlus },
  { id: 'AGENDA', label: 'Agenda & Horários', icon: Clock },
  { id: 'FINANCEIRO', label: 'Financeiro & PIX', icon: DollarSign },
  { id: 'FIDELIZACAO', label: 'Fidelização & Cuidados', icon: HeartPulse },
  { id: 'GATEWAYS', label: 'Provedores & Gateways', icon: Server },
];

export default function CommunicationSettingsPage() {
  const [rules, setRules] = useState<CommunicationRule[]>(DEFAULT_COMMUNICATION_RULES);
  const [gateways, setGateways] = useState<GatewaySettings>({});
  const [studioName, setStudioName] = useState('Studio Pilates Center');
  const [whatsappNumber, setWhatsappNumber] = useState('22999623247');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeCategory, setActiveCategory] = useState<'ALL' | CommunicationCategory | 'GATEWAYS'>('ALL');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('PRE_REGISTRATION_INVITE');
  const [previewChannel, setPreviewChannel] = useState<CommunicationChannel>('WHATSAPP');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Dados fictícios para o simulador
  const [sampleStudent, setSampleStudent] = useState({
    nome: 'Mariana Silva',
    horario: '09:00',
    data: 'Quarta-feira, 03/09',
    plano: '2x por Semana',
    valor: '340,00',
    vencimento: '05/09/2026',
    pix: '00020126580014br.gov.bcb.pix0136contato@pilatesharmonia.com.br5204000053039865406340.005802BR5920Studio Pilates Center6009SAO PAULO62070503***6304E8A2',
    link: 'http://localhost:3000/matricula?phone=22998505276',
    telefone: '(22) 99850-5276',
    aviso_minimo: '2',
    validade_credito: '03/10/2026',
    total_creditos: '1',
    minutos_expira: '30',
    dia_semana: 'Quarta-feira',
    tipo_agendamento: 'Horário Fixo Semanal',
    convenio: 'Wellhub (Gympass)',
  });

  const fetchCommunicationSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/communication');
      const data = await res.json();
      if (data && data.rules) {
        setRules(data.rules);
        if (data.gateways) setGateways(data.gateways);
        if (data.studioName) setStudioName(data.studioName);
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
      }
    } catch (err) {
      console.error('Erro ao carregar comunicação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunicationSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch('/api/settings/communication', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules,
          gateways,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveFeedback({ type: 'success', message: 'Regras de comunicação e canais salvos com sucesso!' });
      } else {
        setSaveFeedback({ type: 'error', message: data.error || 'Erro ao salvar regras' });
      }
    } catch (err: any) {
      setSaveFeedback({ type: 'error', message: err.message || 'Erro inesperado' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleToggleChannel = (ruleId: string, channel: CommunicationChannel) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const exists = r.channels.includes(channel);
        const updated = exists
          ? r.channels.filter((c) => c !== channel)
          : [...r.channels, channel];
        return { ...r, channels: updated };
      })
    );
  };

  const handleTemplateChange = (ruleId: string, templateText: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, template: templateText } : r))
    );
  };

  const handleEmailSubjectChange = (ruleId: string, subject: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, emailSubject: subject } : r))
    );
  };

  const handleInsertTag = (ruleId: string, tag: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        return { ...r, template: `${r.template} ${tag}` };
      })
    );
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleResetToDefault = (ruleId: string) => {
    const defaultRule = DEFAULT_COMMUNICATION_RULES.find((d) => d.id === ruleId);
    if (!defaultRule) return;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...defaultRule } : r))
    );
  };

  const currentSelectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  // Variáveis para renderização no preview
  const previewVariables: Record<string, string> = {
    '{NOME}': sampleStudent.nome,
    '{ESTUDIO}': studioName,
    '{LINK}': sampleStudent.link,
    '{TELEFONE}': sampleStudent.telefone,
    '{HORARIO}': sampleStudent.horario,
    '{DATA}': sampleStudent.data,
    '{PLANO}': sampleStudent.plano,
    '{VALOR}': sampleStudent.valor,
    '{VENCIMENTO}': sampleStudent.vencimento,
    '{PIX_COPIA_E_COLA}': sampleStudent.pix,
    '{AVISO_MINIMO}': sampleStudent.aviso_minimo,
    '{VALIDADE_CREDITO}': sampleStudent.validade_credito,
    '{TOTAL_CREDITOS}': sampleStudent.total_creditos,
    '{MINUTOS_EXPIRA}': sampleStudent.minutos_expira,
    '{DIA_SEMANA}': sampleStudent.dia_semana,
    '{TIPO_AGENDAMENTO}': sampleStudent.tipo_agendamento,
    '{CONVENIO}': sampleStudent.convenio,
  };

  const renderedPreviewText = currentSelectedRule
    ? renderMessageTemplate(currentSelectedRule.template, previewVariables)
    : '';

  const renderedSubjectText = currentSelectedRule?.emailSubject
    ? renderMessageTemplate(currentSelectedRule.emailSubject, previewVariables)
    : '';

  const filteredRules =
    activeCategory === 'ALL'
      ? rules
      : rules.filter((r) => r.category === activeCategory);

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header com Breadcrumb e Ação de Salvar */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-pilates-600 mb-1">
            <Link href="/configuracoes" className="hover:underline flex items-center space-x-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </Link>
            <span>/</span>
            <span className="text-slate-400">Central de Comunicação & Automação</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pilates-600 to-pilates-500 text-white shadow-md shadow-pilates-600/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Central de Comunicação & Automação Multicanal
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure os eventos do estúdio, personalize as mensagens e escolha por onde disparar (WhatsApp, Chat, Push, E-mail e SMS).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setRules(DEFAULT_COMMUNICATION_RULES)}
            className="px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5"
            title="Restaurar todas as mensagens para o padrão do estúdio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrões de Fábrica</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pilates-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {saveFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200 ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {saveFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
          <button onClick={() => setSaveFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Eventos Totais</span>
            <Layers className="w-4 h-4 text-pilates-500" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{rules.length}</p>
          <span className="text-[10px] text-slate-400">Gatilhos operacionais mapeados</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Automações Ativas</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 mt-1">{activeCount} / {rules.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Prontas para disparo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Canais Habilitados</span>
            <Radio className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl font-black text-sky-600 mt-1">5 Canais</p>
          <span className="text-[10px] text-slate-400">WhatsApp, Chat, Push, E-mail, SMS</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Simulador ao Vivo</span>
            <Smartphone className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-600 mt-1">100% Interativo</p>
          <span className="text-[10px] text-purple-600 font-medium">Pré-visualização em tempo real</span>
        </div>
      </div>

      {/* Tabs de Filtro de Categoria */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-pilates-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {activeCategory === 'GATEWAYS' ? (
        /* ================= SEÇÃO DE PROVEDORES & GATEWAYS ================= */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Server className="w-5 h-5 text-pilates-600" />
              <span>Provedores & Gateways de Envio Automático</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Conecte suas credenciais para que o sistema execute disparos de <strong>E-mail via SMTP</strong>, <strong>WhatsApp API</strong> e <strong>SMS Gateway</strong> automaticamente sem intervenção manual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Gateway de E-mail (SMTP) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Mail className="w-4 h-4 text-amber-600" />
                <span>Servidor de E-mail (SMTP / Transacional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Configure para envio de faturas, contratos e lembretes por e-mail (Resend, SendGrid, Gmail SMTP, Hostinger, etc.).
              </p>

              <div className="space-y-2.5 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Host SMTP</label>
                  <input
                    type="text"
                    value={gateways.smtpHost || ''}
                    onChange={(e) => setGateways({ ...gateways, smtpHost: e.target.value })}
                    placeholder="smtp.resend.com / smtp.gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Porta</label>
                    <input
                      type="number"
                      value={gateways.smtpPort || 587}
                      onChange={(e) => setGateways({ ...gateways, smtpPort: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Usuário SMTP</label>
                    <input
                      type="text"
                      value={gateways.smtpUser || ''}
                      onChange={(e) => setGateways({ ...gateways, smtpUser: e.target.value })}
                      placeholder="apikey / seu@email.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Senha / Token SMTP</label>
                  <input
                    type="password"
                    value={gateways.smtpPass || ''}
                    onChange={(e) => setGateways({ ...gateways, smtpPass: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Gateway de WhatsApp API */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp API Gateway (Disparo Direto em Segundo Plano)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Integração com Evolution API, Z-API ou Baileys para disparar sem abrir o link wa.me manualmente.
              </p>

              <div className="space-y-2.5 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Endpoint API do WhatsApp</label>
                  <input
                    type="text"
                    value={gateways.whatsappApiUrl || ''}
                    onChange={(e) => setGateways({ ...gateways, whatsappApiUrl: e.target.value })}
                    placeholder="https://api.seugateway.com/message/sendText"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">API Key / Token</label>
                  <input
                    type="password"
                    value={gateways.whatsappApiToken || ''}
                    onChange={(e) => setGateways({ ...gateways, whatsappApiToken: e.target.value })}
                    placeholder="Bearer Token / API Key"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome / ID da Instância</label>
                  <input
                    type="text"
                    value={gateways.whatsappInstanceId || ''}
                    onChange={(e) => setGateways({ ...gateways, whatsappInstanceId: e.target.value })}
                    placeholder="studio-pilates-01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Gateway de SMS */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Radio className="w-4 h-4 text-rose-600" />
                <span>Gateway de SMS (Twilio / Zenvia / Comtele)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Disparo de mensagens SMS para avisos urgentes ou lembretes quando o aluno estiver sem internet.
              </p>

              <div className="space-y-2.5 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Token de Autenticação / API Key</label>
                  <input
                    type="password"
                    value={gateways.smsApiKey || ''}
                    onChange={(e) => setGateways({ ...gateways, smsApiKey: e.target.value })}
                    placeholder="API Token Zenvia / Twilio Auth"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Remetente / Sender ID</label>
                  <input
                    type="text"
                    value={gateways.smsSenderId || ''}
                    onChange={(e) => setGateways({ ...gateways, smsSenderId: e.target.value })}
                    placeholder="StudioPilates"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Push Notifications */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Bell className="w-4 h-4 text-purple-600" />
                <span>Push Notifications (Firebase Cloud Messaging / OneSignal)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Notificações instantâneas na barra de status do celular Android ou Web Push no navegador do aluno.
              </p>

              <div className="space-y-2.5 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">FCM Server Key / OneSignal App ID</label>
                  <input
                    type="password"
                    value={gateways.pushServerKey || ''}
                    onChange={(e) => setGateways({ ...gateways, pushServerKey: e.target.value })}
                    placeholder="Chave do Servidor Firebase Cloud Messaging"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= 2 COLUNAS: LISTA DE EVENTOS + SIMULADOR ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: LISTA E EDITOR DE EVENTOS (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {filteredRules.map((rule) => {
              const isSelected = selectedRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={`bg-white rounded-3xl border transition-all p-5 shadow-xs space-y-4 cursor-pointer ${
                    isSelected
                      ? 'border-pilates-500 ring-2 ring-pilates-200 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Topo do Card: Switch Liga/Desliga + Título + Categoria */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRule(rule.id);
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 flex items-center ${
                          rule.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={rule.enabled ? 'Clique para Desativar este evento' : 'Clique para Ativar este evento'}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-sm text-slate-900">{rule.title}</h3>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              rule.enabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {rule.enabled ? 'Ativo' : 'Desativado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Seleção de Canais de Envio Multicanal */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Canais de Envio Selecionados para este Evento:
                    </label>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['WHATSAPP', 'CHAT', 'PUSH', 'EMAIL', 'SMS'] as CommunicationChannel[]).map((chan) => {
                        const info = CHANNEL_INFO[chan];
                        const Icon = info.icon;
                        const isChecked = rule.channels.includes(chan);

                        return (
                          <button
                            key={chan}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChannel(rule.id, chan);
                            }}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              isChecked
                                ? info.badge + ' shadow-2xs'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{info.label}</span>
                            {isChecked ? (
                              <Check className="w-3 h-3 ml-0.5" />
                            ) : (
                              <span className="text-[10px] ml-0.5 text-slate-300">+</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assunto de E-mail (quando canal Email estiver ativo) */}
                  {rule.channels.includes('EMAIL') && (
                    <div className="space-y-1 pt-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-amber-600" />
                        <span>Assunto do E-mail:</span>
                      </label>
                      <input
                        type="text"
                        value={rule.emailSubject || ''}
                        onChange={(e) => handleEmailSubjectChange(rule.id, e.target.value)}
                        placeholder="Ex: Confirmação de aula no Studio..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Editor do Texto da Mensagem */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Texto da Mensagem / Template:
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetToDefault(rule.id);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center space-x-1"
                        title="Restaurar este texto para o padrão"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Restaurar Padrão</span>
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={rule.template}
                      onChange={(e) => handleTemplateChange(rule.id, e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-slate-50/50"
                    />

                    {/* Tags Dinâmicas Clicáveis */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 block">
                        Clique para inserir variáveis dinâmicas no texto:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rule.variables.map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsertTag(rule.id, v.tag);
                            }}
                            className="text-[10px] font-mono font-bold bg-pilates-50 text-pilates-800 hover:bg-pilates-100 hover:border-pilates-300 px-2 py-0.8 rounded-lg border border-pilates-200 transition-all flex items-center space-x-1 shadow-2xs"
                            title={`Exemplo: ${v.example} (${v.description})`}
                          >
                            <span>{v.tag}</span>
                            {copiedTag === v.tag && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* COLUNA DIREITA: SIMULADOR AO VIVO DE SMARTPHONE (Col 5) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            {/* Seletor do Modo de Visualização do Simulador */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-pilates-600" />
                <span>Simulador ao Vivo:</span>
              </span>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                {(['WHATSAPP', 'CHAT', 'PUSH', 'EMAIL'] as CommunicationChannel[]).map((chan) => (
                  <button
                    key={chan}
                    onClick={() => setPreviewChannel(chan)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      previewChannel === chan
                        ? 'bg-pilates-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {chan === 'WHATSAPP' ? 'WhatsApp' : chan === 'CHAT' ? 'Chat App' : chan === 'PUSH' ? 'Push' : 'E-mail'}
                  </button>
                ))}
              </div>
            </div>

            {/* MOCKUP DO SMARTPHONE */}
            <div className="relative mx-auto w-full max-w-[340px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-950/20">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>

              {/* TELA DO SMARTPHONE */}
              <div className="bg-slate-100 rounded-[34px] overflow-hidden h-[540px] flex flex-col justify-between text-slate-900 relative shadow-inner">
                
                {/* 1. PREVIEW WHATSAPP */}
                {previewChannel === 'WHATSAPP' && (
                  <div className="h-full flex flex-col justify-between bg-[#efeae2]">
                    {/* Header WhatsApp */}
                    <div className="bg-[#075e54] text-white p-3 pt-6 flex items-center space-x-2.5 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        🧘
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate leading-tight">{studioName}</h4>
                        <span className="text-[9px] text-emerald-200 block">Conta Comercial Oficial</span>
                      </div>
                    </div>

                    {/* Balão de Mensagem WhatsApp */}
                    <div className="p-3.5 space-y-2 overflow-y-auto flex-1 flex flex-col justify-end">
                      <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-200/60 max-w-[92%] space-y-2">
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {renderedPreviewText}
                        </p>
                        <div className="flex items-center justify-end space-x-1 text-[9px] text-slate-400">
                          <span>10:30</span>
                          <span className="text-sky-500 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>

                    {/* Input Falso WhatsApp */}
                    <div className="p-2 bg-slate-200/80 flex items-center space-x-2 border-t border-slate-300">
                      <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                        Mensagem do aluno...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#075e54] text-white flex items-center justify-center text-xs shadow-xs">
                        <Send className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PREVIEW CHAT DO APLICATIVO */}
                {previewChannel === 'CHAT' && (
                  <div className="h-full flex flex-col justify-between bg-slate-50">
                    {/* Header Chat App */}
                    <div className="bg-gradient-to-r from-pilates-700 to-pilates-800 text-white p-3 pt-6 flex items-center space-x-2.5 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate leading-tight">Chat & Central de Avisos</h4>
                        <span className="text-[9px] text-pilates-200 block">Studio Pilates Mobile</span>
                      </div>
                    </div>

                    {/* Balão Chat Interno */}
                    <div className="p-3.5 space-y-2 overflow-y-auto flex-1 flex flex-col justify-end">
                      <div className="bg-white rounded-2xl rounded-bl-none p-3 shadow-md border border-slate-200 max-w-[94%] space-y-2">
                        <div className="flex items-center space-x-1 text-[10px] font-bold text-pilates-700">
                          <Sparkles className="w-3 h-3" />
                          <span>Mensagem Automática</span>
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {renderedPreviewText}
                        </p>
                        <span className="text-[9px] text-slate-400 block text-right">Agora mesmo</span>
                      </div>
                    </div>

                    <div className="p-2 bg-white flex items-center space-x-2 border-t border-slate-200">
                      <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                        Responder ao estúdio...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-pilates-600 text-white flex items-center justify-center text-xs">
                        <Send className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PREVIEW PUSH NOTIFICATION */}
                {previewChannel === 'PUSH' && (
                  <div className="h-full flex flex-col justify-between bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-4 pt-10">
                    <div className="text-center space-y-1">
                      <span className="text-3xl font-light">10:30</span>
                      <span className="text-[10px] text-slate-400 block">Quarta-feira, 3 de Setembro</span>
                    </div>

                    {/* Card de Notificação Push */}
                    <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-xl space-y-1.5 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <div className="flex items-center space-x-1.5 font-bold text-white">
                          <div className="w-4 h-4 rounded-full bg-pilates-500 flex items-center justify-center text-[8px]">
                            🧘
                          </div>
                          <span>{studioName}</span>
                        </div>
                        <span>Agora</span>
                      </div>
                      <h5 className="font-bold text-xs text-white">{currentSelectedRule.title}</h5>
                      <p className="text-[11px] text-slate-200 line-clamp-3 leading-snug">
                        {renderedPreviewText}
                      </p>
                    </div>

                    <div className="text-center text-[10px] text-slate-500">
                      Toque para abrir no aplicativo
                    </div>
                  </div>
                )}

                {/* 4. PREVIEW E-MAIL */}
                {previewChannel === 'EMAIL' && (
                  <div className="h-full flex flex-col justify-between bg-white text-slate-900 p-4 pt-8 overflow-y-auto">
                    <div className="border-b border-slate-200 pb-3 space-y-1">
                      <span className="text-[10px] font-bold text-pilates-700 uppercase">E-mail Transacional</span>
                      <h4 className="font-bold text-xs text-slate-900">{renderedSubjectText || currentSelectedRule.title}</h4>
                      <p className="text-[10px] text-slate-500">De: {studioName} &lt;contato@pilatescenter.com.br&gt;</p>
                    </div>

                    <div className="py-4 space-y-3 flex-1">
                      <div className="p-2.5 rounded-xl bg-pilates-50 border border-pilates-200 text-center">
                        <span className="font-bold text-xs text-pilates-900">{studioName}</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {renderedPreviewText}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400">
                      Enviado por {studioName} • Pilates & Bem-Estar
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

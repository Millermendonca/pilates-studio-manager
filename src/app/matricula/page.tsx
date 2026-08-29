'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CreditCard,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  HeartPulse,
  ShieldCheck,
  Star,
  Zap,
  Info,
  CalendarDays,
  Smartphone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const DAY_OPTIONS = [
  { day: 1, name: 'Segunda-feira', short: 'Seg' },
  { day: 2, name: 'Terça-feira', short: 'Ter' },
  { day: 3, name: 'Quarta-feira', short: 'Qua' },
  { day: 4, name: 'Quinta-feira', short: 'Qui' },
  { day: 5, name: 'Sexta-feira', short: 'Sex' },
  { day: 6, name: 'Sábado', short: 'Sáb' },
];

const AVAILABLE_HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function MatriculaPage() {
  const router = useRouter();

  // Wizard Steps: 1 = Plano, 2 = Horários, 3 = Dados/Anamnese, 4 = Pagamento PIX & Sucesso
  const [step, setStep] = useState<number>(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_2x');
  const [selectedSlots, setSelectedSlots] = useState<{ dayOfWeek: number; startTime: string }[]>([
    { dayOfWeek: 2, startTime: '08:00' },
    { dayOfWeek: 4, startTime: '08:00' },
  ]);

  // Form Dados Pessoais
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [password, setPassword] = useState('senha123');

  // Estado de Contratação & PIX
  const [submitting, setSubmitting] = useState(false);
  const [completedStudent, setCompletedStudent] = useState<any>(null);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [payingPix, setPayingPix] = useState(false);
  const [pixPaidSuccess, setPixPaidSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/matricula')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          setPlans(data.plans);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || {
    name: '2x por Semana',
    price: 340.0,
    timesPerWeek: 2,
  };

  // Ajustar slots padrão ao trocar de plano
  const handleSelectPlan = (plan: any) => {
    setSelectedPlanId(plan.id);
    if (plan.timesPerWeek === 1) {
      setSelectedSlots([{ dayOfWeek: 2, startTime: '08:00' }]);
    } else if (plan.timesPerWeek === 2) {
      setSelectedSlots([
        { dayOfWeek: 2, startTime: '08:00' },
        { dayOfWeek: 4, startTime: '08:00' },
      ]);
    } else if (plan.timesPerWeek === 3) {
      setSelectedSlots([
        { dayOfWeek: 1, startTime: '08:00' },
        { dayOfWeek: 3, startTime: '08:00' },
        { dayOfWeek: 5, startTime: '08:00' },
      ]);
    } else {
      setSelectedSlots([
        { dayOfWeek: 1, startTime: '08:00' },
        { dayOfWeek: 2, startTime: '08:00' },
        { dayOfWeek: 3, startTime: '08:00' },
        { dayOfWeek: 4, startTime: '08:00' },
        { dayOfWeek: 5, startTime: '08:00' },
      ]);
    }
  };

  const handleUpdateSlot = (index: number, field: 'dayOfWeek' | 'startTime', value: any) => {
    const updated = [...selectedSlots];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedSlots(updated);
  };

  // Submissão da Matrícula e Contratação
  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/matricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          cpf,
          address,
          neighborhood,
          healthNotes,
          planId: selectedPlanId,
          selectedDays: selectedSlots,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedStudent(data.student);
        setCompletedInvoice(data.invoice);
        setStep(4);
      } else {
        alert(data.error || 'Erro ao processar matrícula');
      }
    } catch (err) {
      console.error('Erro na contratação:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handlePayInvoice = async () => {
    if (!completedInvoice) return;
    setPayingPix(true);
    try {
      const res = await fetch(`/api/invoices/${completedInvoice.id}/pay`, {
        method: 'POST',
      });
      if (res.ok) {
        setPixPaidSuccess(true);
      }
    } catch (err) {
      console.error('Erro ao liquidar fatura:', err);
    } finally {
      setPayingPix(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-pilates-50 text-pilates-700 rounded-full text-xs font-bold border border-pilates-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Matrícula 100% Online • Studio Pilates Center</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Contrate seu Plano de Pilates em 3 Minutos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Escolha seu plano ideal, selecione seus dias e horários fixos e ative seu acesso imediato ao aplicativo!
        </p>
      </div>

      {/* Stepper Visual */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto">
        {[
          { num: 1, title: '1. Plano' },
          { num: 2, title: '2. Horários' },
          { num: 3, title: '3. Cadastro' },
          { num: 4, title: '4. Pagamento PIX' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-2xl border text-center transition-all ${
              step === s.num
                ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold'
                : step > s.num
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <div className="text-[11px] sm:text-xs truncate">{s.title}</div>
          </div>
        ))}
      </div>

      {/* ================= PASSO 1: ESCOLHA DO PLANO ================= */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                    isSelected
                      ? 'border-pilates-600 bg-pilates-50/40 shadow-lg shadow-pilates-500/10 scale-[1.02]'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Badge de Destaque */}
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pilates-600 to-pilates-700 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-sm">
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-slate-900">{plan.name}</h3>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-pilates-600 bg-pilates-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="text-2xl font-black text-slate-900">
                      R$ {plan.price.toFixed(2)}
                      <span className="text-xs font-medium text-slate-400">/mês</span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">{plan.description}</p>

                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                      {plan.features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full mt-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-pilates-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Plano Selecionado' : 'Selecionar Plano'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition-all"
            >
              <span>Avançar para Escolha de Horários</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PASSO 2: ESCOLHA DE DIAS & HORÁRIOS ================= */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Selecione seus Dias e Horários Fixos
              </h3>
              <span className="text-xs font-bold text-pilates-700 bg-pilates-50 px-2.5 py-1 rounded-full">
                {selectedPlan.name} ({selectedPlan.timesPerWeek} aula(s)/semana)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Esses serão seus horários garantidos toda semana. Você poderá remarcar aulas avulsas quando precisar direto no app.
            </p>
          </div>

          <div className="space-y-4">
            {selectedSlots.map((slot, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-pilates-600" />
                    <span>Aula {idx + 1} da Semana</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Turmas com vagas abertas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dia da Semana</label>
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => handleUpdateSlot(idx, 'dayOfWeek', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.day} value={d.day}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Horário da Turma</label>
                    <select
                      value={slot.startTime}
                      onChange={(e) => handleUpdateSlot(idx, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                    >
                      {AVAILABLE_HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h} às {(parseInt(h.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Planos</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition-all"
            >
              <span>Avançar para Cadastro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= PASSO 3: DADOS CADASTRAIS & ANAMNESE ================= */}
      {step === 3 && (
        <form
          onSubmit={handleSubmitEnrollment}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200"
        >
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-base text-slate-900">Seus Dados & Pré-Anamnese de Saúde</h3>
            <p className="text-xs text-slate-500">
              Essas informações são essenciais para personalizarmos os exercícios de Pilates para o seu corpo.
            </p>
          </div>

          <div className="space-y-4">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silva Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>
            </div>

            {/* E-mail e WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seuemail@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp / Celular *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* CPF e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bairro / Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bela Vista / São Paulo"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Pré-Anamnese Clínica */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                <span>Histórico de Saúde / Lesões / Dores</span>
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Hérnia de disco L4-L5, dores na lombar, condromalácia patelar, postura ou apenas condicionamento físico..."
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Resumo do Pedido */}
          <div className="p-4 bg-pilates-50/70 border border-pilates-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{selectedPlan.name}</span>
              <span className="text-pilates-700 font-mono text-sm">R$ {selectedPlan.price.toFixed(2)}/mês</span>
            </div>
            <div className="text-[11px] text-slate-600">
              Horários: {selectedSlots.map((s) => `${DAY_OPTIONS.find((d) => d.day === s.dayOfWeek)?.short} às ${s.startTime}`).join(', ')}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Horários</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Ativando Matrícula...</span>
                </>
              ) : (
                <>
                  <span>Concluir e Gerar PIX</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ================= PASSO 4: PAGAMENTO PIX & CONCLUIDO ================= */}
      {step === 4 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-lg mx-auto space-y-6 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Matrícula Concluída com Sucesso!</h2>
            <p className="text-xs text-slate-500">
              Parabéns, <strong>{completedStudent?.name}</strong>! Seu plano e horários já estão reservados na grade do estúdio.
            </p>
          </div>

          {/* QR Code PIX e Copia e Cola */}
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pague com PIX para Ativação Instantânea:
            </span>

            <div className="w-48 h-48 bg-white p-2 rounded-2xl border-2 border-slate-200 mx-auto flex items-center justify-center shadow-xs">
              {completedInvoice?.pixQrCode ? (
                <img
                  src={completedInvoice.pixQrCode}
                  alt="QR Code PIX"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-32 h-32 text-slate-400" />
              )}
            </div>

            <div className="text-2xl font-black text-slate-900 font-mono">
              R$ {completedInvoice?.amount?.toFixed(2) || selectedPlan.price.toFixed(2)}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => copyPixCode(completedInvoice?.pixCopiaECola || '')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPix ? 'Código PIX Copiado!' : 'Copiar Código PIX (Copia e Cola)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePayInvoice}
                disabled={payingPix || pixPaidSuccess}
                className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                  pixPaidSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{pixPaidSuccess ? '✅ Pagamento PIX Confirmado!' : 'Simular Pagamento Instantâneo'}</span>
              </button>
            </div>
          </div>

          {/* Botão Acessar App do Aluno */}
          <Link
            href="/aluno-app"
            className="w-full py-3.5 bg-gradient-to-r from-pilates-600 to-pilates-700 hover:from-pilates-700 hover:to-pilates-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-pilates-600/25 flex items-center justify-center space-x-2 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>Abrir Meu Aplicativo do Aluno</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

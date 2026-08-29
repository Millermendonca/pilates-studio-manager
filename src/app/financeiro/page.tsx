'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import PixPaymentModal from '@/components/PixPaymentModal';
import { format } from 'date-fns';

export default function FinanceiroPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);

  // Nova Cobrança Form Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('320.00');
  const [title, setTitle] = useState('Mensalidade Pilates');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const [resInvoices, resStudents] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/students'),
      ]);
      const invData = await resInvoices.json();
      const stdData = await resStudents.json();
      setInvoices(invData);
      setStudents(stdData);
      if (stdData.length > 0) setSelectedStudentId(stdData[0].id);
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          title,
          amount: parseFloat(amount),
          dueDate,
          isRecurring: true,
        }),
      });
      const data = await res.json();
      setCreateModalOpen(false);
      fetchInvoices();
      setSelectedInvoice(data);
      setPixModalOpen(true);
    } catch (err) {
      console.error('Erro ao criar cobrança:', err);
    }
  };

  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalPending = invoices
    .filter((i) => i.status === 'PENDING')
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-semibold text-xs uppercase tracking-wider mb-0.5">
            <DollarSign className="w-4 h-4" />
            <span>Gestão Financeira & Cobranças</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Financeiro & PIX Recorrente</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gere cobranças instantâneas com QR Code, acompanhe pagamentos e configure planos automáticos.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Cobrança PIX</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Total Recebido no Mês</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            R$ {totalPaid.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Liquidados via PIX instantâneo
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Previsão a Receber</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            R$ {totalPending.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Faturas em aberto / aguardando pagamento
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Forma de Pagamento</span>
            <div className="p-2 rounded-xl bg-pilates-50 text-pilates-600">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            PIX & PIX Recorrente
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            0% de taxa de atraso com QR Code no App
          </span>
        </div>
      </div>

      {/* Tabela de Faturas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-pilates-600" />
            <h3 className="font-bold text-sm text-slate-900">Histórico de Cobranças & Mensalidades</h3>
          </div>
          <span className="text-xs text-slate-400">{invoices.length} faturas registradas</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Aluno</th>
                  <th className="px-5 py-3">Descrição / Plano</th>
                  <th className="px-5 py-3">Valor</th>
                  <th className="px-5 py-3">Vencimento</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{inv.student?.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.student?.phone}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium">{inv.title}</td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        R$ {inv.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-5 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAGO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>PENDENTE</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPixModalOpen(true);
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-pilates-50 text-slate-700 hover:text-pilates-700 font-semibold rounded-lg border border-slate-200 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Ver PIX</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Cobrança */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Header Fixo */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Gerar Nova Cobrança PIX</h3>
                  <p className="text-xs text-emerald-100">Emita um QR Code para o aluno pagar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selecione o Aluno</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-semibold"
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.planName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título / Descrição</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Footer Fixo */}
              <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
                >
                  Gerar QR Code PIX
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PIX */}
      <PixPaymentModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        invoice={selectedInvoice}
        onPaymentConfirmed={fetchInvoices}
      />
    </div>
  );
}

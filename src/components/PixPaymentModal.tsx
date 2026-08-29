'use client';

import React, { useState } from 'react';
import { QrCode, Copy, Check, X, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onPaymentConfirmed: () => void;
}

export default function PixPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentConfirmed,
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleCopy = () => {
    if (invoice.pixCopiaECola) {
      navigator.clipboard.writeText(invoice.pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onPaymentConfirmed();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao simular pagamento:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
        {/* Header Fixo */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-white/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Cobrança PIX</h3>
              <p className="text-xs text-emerald-100">Pagamento Instantâneo ou Recorrente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Rolável */}
        <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
          {success ? (
            <div className="py-8 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Pagamento Confirmado!</h4>
              <p className="text-xs text-slate-500">
                A mensalidade de R$ {invoice.amount.toFixed(2)} foi liquidada com sucesso via PIX.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Valor a Pagar
                </p>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  R$ {invoice.amount?.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aluno: <strong className="text-slate-800">{invoice.student?.name}</strong>
                </p>
              </div>

              {/* QR Code */}
              {invoice.pixQrCode ? (
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl inline-block shadow-inner">
                  <img
                    src={invoice.pixQrCode}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-100 rounded-xl text-xs text-slate-500">
                  Gerando QR Code PIX...
                </div>
              )}

              {/* PIX Copia e Cola */}
              {invoice.pixCopiaECola && (
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Código PIX Copia e Cola:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={invoice.pixCopiaECola}
                      className="w-full text-xs font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 select-all"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Simulação Webhook */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleSimulatePayment}
                  disabled={simulating}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando Webhook PIX...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simular Pagamento Confirmado (Webhook)</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Em produção, o webhook bancário atualiza este status automaticamente em milissegundos.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

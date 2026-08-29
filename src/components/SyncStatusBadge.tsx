'use client';

import React, { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export default function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>({
    isOnline: true,
    pendingCount: 0,
    lastSyncAt: null,
    cloudEndpoint: 'https://api.studiopilates.com.br/api/sync',
  });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Monitorar conectividade do navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Checar status inicial
    fetchStatus();
    const interval = setInterval(fetchStatus, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      setSyncStatus(data);
    } catch (err) {
      console.log('Sem resposta da API de status');
    }
  };

  const triggerSync = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      setFeedback(data.message);
      fetchStatus();
    } catch (err) {
      setFeedback('Erro ao conectar com o servidor de sincronização');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = syncStatus?.pendingCount || 0;

  return (
    <>
      {/* Badge no Header */}
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shadow-2xs ${
          !isOnline
            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            : pendingCount > 0
            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
        }`}
        title="Status de Sincronização Local & Nuvem"
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Offline (Local)</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
            <span>{pendingCount} pendente(s)</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">PostgreSQL</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200/60"></span>
          </>
        )}
      </button>

      {/* Modal de Detalhes da Sincronização */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-pilates-500/20 border border-pilates-400/30">
                  <Database className="w-5 h-5 text-pilates-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Sincronização & PostgreSQL</h3>
                  <p className="text-xs text-slate-300">Arquitetura Offline-First Local + Nuvem</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4 text-xs">
              {feedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Status dos Bancos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                    <Database className="w-4 h-4 text-pilates-600" />
                    <span>Banco Local</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 block">
                    ● Ativo & Gravando
                  </span>
                  <p className="text-[10px] text-slate-500">PostgreSQL / Local DB</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <span>Servidor Nuvem</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold block ${
                      isOnline ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ● {isOnline ? 'Conectado' : 'Sem Conexão'}
                  </span>
                  <p className="text-[10px] text-slate-500 truncate">
                    {syncStatus?.cloudEndpoint || 'api.studiopilates.com.br'}
                  </p>
                </div>
              </div>

              {/* Fila de Pendências */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Itens na Fila de Sync:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      pendingCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {pendingCount} pendentes
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Quando você cadastra alunos, altera a grade ou marca presenças sem internet, os dados são salvos localmente e adicionados à fila. Quando a conexão retorna, tudo é enviado automaticamente sem perda!
                </p>
              </div>

              {/* Última Sincronização */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Último sincronismo com sucesso:</span>
                <span className="font-semibold text-slate-700">
                  {syncStatus?.lastSyncAt
                    ? format(new Date(syncStatus.lastSyncAt), 'dd/MM/yyyy HH:mm:ss')
                    : 'Recente'}
                </span>
              </div>

              {/* Botão Forçar Sincronização */}
              <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  onClick={triggerSync}
                  disabled={loading}
                  className="w-full py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white font-bold text-xs rounded-xl shadow-md shadow-pilates-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando com a Nuvem...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar com Nuvem Agora</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

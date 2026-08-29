'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Check,
  CheckCheck,
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  User,
  Phone,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MESSAGE_TEMPLATES = [
  {
    label: '🧘‍♀️ Lembrete de Aula',
    action: 'SEND_CLASS_REMINDER',
    type: 'CLASS_REMINDER',
  },
  {
    label: '💳 Cobrança PIX de Mensalidade',
    action: 'SEND_PAYMENT_REMINDER',
    type: 'PAYMENT_REMINDER',
  },
  {
    label: '🟣 Aviso de Crédito a Vencer',
    action: 'SEND_CREDIT_ALERT',
    type: 'CREDIT_ALERT',
  },
];

export default function MensagensPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'pendingInvoice'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      setThreads(data);
      if (data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0].studentId);
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (studentId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat?studentId=${studentId}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchMessages(selectedStudentId);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedStudentId) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          sender: 'STUDIO',
          message: text,
          messageType: 'TEXT',
        }),
      });

      if (res.ok) {
        fetchMessages(selectedStudentId);
        fetchThreads();
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTriggerAction = async (action: string) => {
    if (!selectedStudentId) return;
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          action,
        }),
      });

      if (res.ok) {
        fetchMessages(selectedStudentId);
        fetchThreads();
      }
    } catch (err) {
      console.error('Erro ao disparar template:', err);
    } finally {
      setSending(false);
    }
  };

  const selectedThread = threads.find((t) => t.studentId === selectedStudentId);

  // Filtragem da lista lateral
  const filteredThreads = threads.filter((t) => {
    const matchesSearch = t.studentName.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'unread') return t.unreadCount > 0;
    if (activeFilter === 'pendingInvoice') return t.hasPendingInvoice;
    return true;
  });

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">
              Central de Mensagens & Notificações Automáticas
            </h1>
            <p className="text-xs text-slate-500">
              Dispare lembretes de aula, avisos de vencimento PIX e converse com os alunos estilo WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Push & Chat Ativos</span>
          </span>
        </div>
      </div>

      {/* Main WhatsApp-Style Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
        {/* ================= 1. SIDEBAR DE CONVERSAS (Col 4) ================= */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 min-h-0">
          {/* Barra de Busca e Filtros */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar aluno ou conversa..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pilates-500"
              />
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center space-x-1 text-[11px] font-semibold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'unread'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Não Lidos
              </button>
              <button
                onClick={() => setActiveFilter('pendingInvoice')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'pendingInvoice'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                PIX Pendente
              </button>
            </div>
          </div>

          {/* Lista de Alunos / Conversas */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {loadingThreads ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pilates-600" />
                Carregando conversas...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum aluno encontrado.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.studentId === selectedStudentId;

                return (
                  <div
                    key={thread.studentId}
                    onClick={() => setSelectedStudentId(thread.studentId)}
                    className={`p-3 cursor-pointer transition-all flex items-center space-x-3 ${
                      isSelected
                        ? 'bg-white border-l-4 border-pilates-600 shadow-2xs'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0">
                      <img
                        src={
                          thread.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(thread.studentName)}`
                        }
                        alt={thread.studentName}
                        className="w-full h-full object-cover"
                      />
                      {thread.unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {thread.studentName}
                        </h4>
                        {thread.lastMessage && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(thread.lastMessage.createdAt), 'HH:mm')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-slate-500 truncate pr-2">
                          {thread.lastMessage ? thread.lastMessage.text : 'Sem mensagens recentes'}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= 2. ÁREA PRINCIPAL DO CHAT (Col 8) ================= */}
        <div className="md:col-span-8 flex flex-col h-full bg-[#efeae2]/40 min-h-0">
          {selectedThread ? (
            <>
              {/* Header do Chat */}
              <div className="p-3 px-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={
                        selectedThread.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedThread.studentName)}`
                      }
                      alt={selectedThread.studentName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {selectedThread.studentName}
                    </h3>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span>{selectedThread.phone}</span>
                      <span>•</span>
                      <span className="text-pilates-700 font-semibold">{selectedThread.planName}</span>
                    </div>
                  </div>
                </div>

                {/* Botões Rápidos de Disparo Automático */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MESSAGE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.action}
                      onClick={() => handleTriggerAction(tmpl.action)}
                      disabled={sending}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-pilates-50 hover:text-pilates-700 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensagens (Estilo WhatsApp) */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-pilates-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs bg-white/70 backdrop-blur rounded-2xl max-w-sm mx-auto p-6 border border-slate-200">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Nenhuma mensagem anterior. Use os botões no topo para disparar lembretes ou digite abaixo.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStudio = msg.sender === 'STUDIO';
                    const isSystem = msg.sender === 'SYSTEM';
                    const isStudent = msg.sender === 'STUDENT';

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isStudent ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 shadow-2xs relative text-xs leading-relaxed ${
                            isSystem
                              ? 'bg-gradient-to-br from-pilates-900 to-slate-900 text-white rounded-tr-none'
                              : isStudio
                              ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200'
                              : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                          }`}
                        >
                          {/* Badge de Tipo de Mensagem Automática */}
                          {isSystem && (
                            <div className="flex items-center space-x-1 text-[10px] font-bold text-pilates-300 uppercase tracking-wider mb-1.5 pb-1 border-b border-white/10">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>
                                {msg.messageType === 'CLASS_REMINDER'
                                  ? 'Notificação Automática • Lembrete de Aula'
                                  : msg.messageType === 'PAYMENT_REMINDER'
                                  ? 'Notificação Automática • Mensalidade PIX'
                                  : msg.messageType === 'CREDIT_ALERT'
                                  ? 'Notificação Automática • Reposição'
                                  : 'Notificação do Sistema'}
                              </span>
                            </div>
                          )}

                          {/* Conteúdo do Texto */}
                          <div className="whitespace-pre-line">{msg.message}</div>

                          {/* Footer da Bolha: Hora + Checkmarks */}
                          <div
                            className={`flex items-center justify-end space-x-1 text-[9px] mt-1.5 font-mono ${
                              isSystem ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                            {!isStudent && (
                              <CheckCheck className="w-3 h-3 text-sky-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra Inferior de Envio */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder={`Responder para ${selectedThread.studentName.split(' ')[0]}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pilates-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <span>Selecione um aluno na lista ao lado para ver o histórico.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

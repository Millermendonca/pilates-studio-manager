'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  X,
  UserPlus,
  Search,
  User,
  Check,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  CalendarDays,
  Repeat,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getStudentAvatar } from '@/lib/avatar';
import { getStudentDisplayName, getStudentFullName } from '@/lib/studentHelper';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: {
    id?: string;
    name?: string;
    avatarUrl?: string | null;
    photoCompressed?: string | null;
    planName?: string;
    schedules?: any[];
  } | null;
  currentAttendanceId?: string;
  currentScheduleId?: string;
  initialDate?: string;
  initialTime?: string;
  onSuccess: () => void;
  onOpenNewStudent?: (targetDate: string, targetTime: string) => void;
}

import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  getUnifiedTimeSlots,
} from '@/lib/operatingHours';

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const getPlanLimit = (planName?: string): number => {
  if (!planName) return 2;
  const p = planName.toLowerCase();
  if (p.includes('1x')) return 1;
  if (p.includes('2x')) return 2;
  if (p.includes('3x')) return 3;
  if (p.includes('4x')) return 4;
  if (p.includes('livre') || p.includes('diário') || p.includes('diario')) return 6;
  if (p.includes('avulsa') || p.includes('experimental')) return 0;
  if (p.includes('wellhub') || p.includes('totalpass')) return 6;
  return 2;
};

export default function ScheduleModal({
  isOpen,
  onClose,
  student,
  currentAttendanceId,
  currentScheduleId,
  initialDate,
  initialTime,
  onSuccess,
  onOpenNewStudent,
}: ScheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    initialDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedTime, setSelectedTime] = useState(initialTime || '08:00');
  const [scope, setScope] = useState<'SINGLE' | 'RECURRING_FUTURE'>('RECURRING_FUTURE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [operatingHours, setOperatingHours] = useState<OperatingDayConfig[]>(DEFAULT_OPERATING_HOURS);

  // Lista de Alunos e Busca
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentObj, setSelectedStudentObj] = useState<any | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Substituição de Horário quando no limite do plano
  const [scheduleToReplaceId, setScheduleToReplaceId] = useState<string | null>(null);

  // Estados de Exclusão de Agendamento
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'SINGLE' | 'PERMANENT'>('SINGLE');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.operatingHoursJson) {
          try {
            const parsed = JSON.parse(data.operatingHoursJson);
            if (Array.isArray(parsed) && parsed.length > 0) setOperatingHours(parsed);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const targetDayOfWeek = selectedDate ? parseISO(selectedDate).getDay() : 1;
  const dayConfig = operatingHours.find((d) => d.dayOfWeek === targetDayOfWeek);
  const availableSlotsForDate = dayConfig && dayConfig.isOpen
    ? generateSlotsForDay(dayConfig)
    : getUnifiedTimeSlots(operatingHours);

  useEffect(() => {
    if (isOpen) {
      if (initialDate) setSelectedDate(initialDate);
      if (initialTime) setSelectedTime(initialTime);
      setScheduleToReplaceId(null);
      setShowDeleteConfirm(false);
      setDeleteMode('SINGLE');
      setError('');
      setSuccessMessage('');

      // Se veio um aluno com id válido
      if (student?.id) {
        setSelectedStudentObj(student);
      } else {
        setSelectedStudentObj(null);
      }

      // Buscar todos os alunos para o seletor
      fetchStudents();
    }
  }, [initialDate, initialTime, student, isOpen]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudentsList(data);
        // Atualizar selectedStudentObj com dados frescos (incluindo schedules) se já houver um selecionado
        if (student?.id) {
          const fresh = data.find((s) => s.id === student.id);
          if (fresh) setSelectedStudentObj(fresh);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar lista de alunos:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (!isOpen) return null;

  const isCreatingNewSlot = !currentAttendanceId && !currentScheduleId && !student?.id;

  const filteredStudents = studentsList.filter((s) =>
    s.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.phone?.includes(searchStudent) ||
    s.email?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Cálculo de Limite do Plano
  const activeSchedules: any[] = selectedStudentObj?.schedules?.filter((sc: any) => sc.active !== false) || [];
  const planLimit = getPlanLimit(selectedStudentObj?.planName);
  const isLimitReached = !currentScheduleId && activeSchedules.length >= planLimit && scope === 'RECURRING_FUTURE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStudentId = selectedStudentObj?.id || student?.id;

    if (!finalStudentId) {
      setError('Por favor, selecione um aluno para agendar.');
      return;
    }

    // Se atingiu o limite do plano e está tentando adicionar fixo sem escolher qual substituir
    if (isLimitReached && !scheduleToReplaceId && scope === 'RECURRING_FUTURE') {
      setError('⚠️ Limite de horários do plano atingido. Selecione abaixo qual horário fixo você deseja substituir pelo novo, ou marque "Apenas nesta data específica (Troca Única)".');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: finalStudentId,
          attendanceId: currentAttendanceId,
          scheduleId: currentScheduleId || scheduleToReplaceId || undefined,
          currentDate: initialDate,
          newDate: selectedDate,
          newStartTime: selectedTime,
          scope,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao agendar horário');
      }

      setSuccessMessage(data.message || 'Agendamento confirmado com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    const finalStudentId = selectedStudentObj?.id || student?.id;
    if (!finalStudentId && !currentAttendanceId && !currentScheduleId) return;

    setDeleting(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: finalStudentId,
          attendanceId: currentAttendanceId,
          scheduleId: currentScheduleId || scheduleToReplaceId || undefined,
          date: selectedDate,
          startTime: selectedTime,
          mode: deleteMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir agendamento');
      }

      setSuccessMessage(data.message || 'Agendamento excluído com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir agendamento');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCreateNewClick = () => {
    onClose();
    if (onOpenNewStudent) {
      onOpenNewStudent(selectedDate, selectedTime);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
        
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-pilates-600/40 border border-pilates-400/30">
              <Calendar className="w-5 h-5 text-pilates-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isCreatingNewSlot ? 'Agendar Aluno na Turma' : 'Alterar / Excluir Horário de Aula'}
              </h3>
              <p className="text-xs text-slate-300">
                {selectedStudentObj?.name
                  ? `Aluno: ${selectedStudentObj.name.toUpperCase()}`
                  : 'Selecione um aluno ou faça um novo cadastro'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* PAINEL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {showDeleteConfirm && (
              <div className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Excluir Agendamento de {selectedStudentObj?.name || student?.name || 'Aluno'}</span>
                </div>

                <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                  Como você deseja excluir este agendamento?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteMode('SINGLE')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      deleteMode === 'SINGLE'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    <span className="font-bold block">Apenas Desta Data</span>
                    <span className="text-[10px] opacity-85 block mt-0.5">
                      Desmarca a aula de {selectedDate ? format(parseISO(selectedDate), 'dd/MM') : 'hoje'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteMode('PERMANENT')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                      deleteMode === 'PERMANENT'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    <span className="font-bold block">Horário Fixo Semanal</span>
                    <span className="text-[10px] opacity-85 block mt-0.5">
                      Remove definitivamente da grade fixa
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-rose-200/80">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 font-bold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSchedule}
                    disabled={deleting}
                    className="px-4 py-2 text-xs text-white bg-rose-600 hover:bg-rose-700 font-bold rounded-xl shadow-md shadow-rose-600/20 inline-flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Excluindo...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirmar Exclusão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SELEÇÃO DO ALUNO (OU CRIAR NOVO) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Aluno *
                </label>
                <button
                  type="button"
                  onClick={handleCreateNewClick}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-pilates-600 hover:text-pilates-800 bg-pilates-50 hover:bg-pilates-100 px-2.5 py-1 rounded-lg border border-pilates-200 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Cadastrar Novo Aluno</span>
                </button>
              </div>

              {selectedStudentObj ? (
                <div className="p-3.5 bg-pilates-50/60 border-2 border-pilates-300 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-pilates-400 bg-white shrink-0 shadow-xs">
                      <img
                        src={getStudentAvatar(selectedStudentObj)}
                        alt={selectedStudentObj.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 uppercase">
                        {getStudentFullName(selectedStudentObj)} {selectedStudentObj.nickname ? `(${selectedStudentObj.nickname.toUpperCase()})` : ''}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-pilates-200/80 text-pilates-900 rounded-md">
                          Plano: {selectedStudentObj.planName || '2x por Semana'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({activeSchedules.length}/{planLimit} dias fixos)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentObj(null);
                      setScheduleToReplaceId(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-2 py-1"
                  >
                    Trocar Aluno
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      placeholder="Pesquisar por nome, apelido ou WhatsApp..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
                    {loadingStudents ? (
                      <p className="text-center text-xs text-slate-400 py-3">Carregando alunos...</p>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-4 space-y-1">
                        <p className="text-xs text-slate-500">Nenhum aluno encontrado.</p>
                        <button
                          type="button"
                          onClick={handleCreateNewClick}
                          className="text-xs font-bold text-pilates-600 underline"
                        >
                          Clique aqui para cadastrar um novo aluno
                        </button>
                      </div>
                    ) : (
                      filteredStudents.map((std: any) => (
                        <div
                          key={std.id}
                          onClick={() => {
                            setSelectedStudentObj(std);
                            setScheduleToReplaceId(null);
                          }}
                          className="p-2 rounded-lg hover:bg-white flex items-center justify-between cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                          title={getStudentFullName(std)}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                              <img
                                src={getStudentAvatar(std)}
                                alt={getStudentFullName(std)}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800 block leading-tight uppercase">
                                {std.name} {std.nickname ? `(${std.nickname.toUpperCase()})` : ''}
                              </span>
                              <span className="text-[10px] text-slate-400">{std.planName}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-pilates-600">Selecionar</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SELETOR DE ESCOPO: APENAS ESTA DATA OU SEMANAL FIXO */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tipo de Agendamento *
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScope('RECURRING_FUTURE');
                    setError('');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    scope === 'RECURRING_FUTURE'
                      ? 'border-pilates-500 bg-pilates-50/80 text-pilates-950 shadow-xs ring-2 ring-pilates-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Repeat className={`w-4 h-4 ${scope === 'RECURRING_FUTURE' ? 'text-pilates-600' : 'text-slate-400'}`} />
                    {scope === 'RECURRING_FUTURE' && (
                      <span className="w-2 h-2 rounded-full bg-pilates-600 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Horário Fixo Semanal</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Toda semana neste dia/hora
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScope('SINGLE');
                    setScheduleToReplaceId(null);
                    setError('');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    scope === 'SINGLE'
                      ? 'border-pilates-500 bg-pilates-50/80 text-pilates-950 shadow-xs ring-2 ring-pilates-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <CalendarDays className={`w-4 h-4 ${scope === 'SINGLE' ? 'text-pilates-600' : 'text-slate-400'}`} />
                    {scope === 'SINGLE' && (
                      <span className="w-2 h-2 rounded-full bg-pilates-600 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Apenas Esta Data</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Troca/Reposição pontual
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* SELEÇÃO DE DIA E HORÁRIO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data da Aula *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setError('');
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
                {selectedDate && (
                  <span className="text-[10px] text-pilates-700 font-bold block mt-1">
                    {DAY_NAMES[parseISO(selectedDate).getDay()] || ''}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horário de Início *
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => {
                    setSelectedTime(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                >
                  {availableSlotsForDate.map((time) => (
                    <option key={time} value={time}>
                      {time} às {`${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ================= ALERTA INTERATIVO: LIMITE DO PLANO ATINGIDO ================= */}
            {isLimitReached && (
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Limite do Plano Atingido ({activeSchedules.length} de {planLimit} dias fixos)</span>
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong className="uppercase">{selectedStudentObj.name}</strong> possui o plano <strong>{selectedStudentObj.planName}</strong> e já tem todos os seus {planLimit} horários fixos preenchidos na grade.
                </p>

                <div className="space-y-2 pt-1 border-t border-amber-200/80">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Deseja substituir um dos horários fixos atuais?
                  </span>
                  
                  <div className="space-y-1.5">
                    {activeSchedules.map((sc: any) => {
                      const isSelectedToReplace = scheduleToReplaceId === sc.id;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => {
                            setScheduleToReplaceId(sc.id);
                            setError('');
                          }}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                            isSelectedToReplace
                              ? 'bg-pilates-600 text-white border-pilates-700 shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-pilates-400 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <ArrowRightLeft className={`w-3.5 h-3.5 ${isSelectedToReplace ? 'text-white' : 'text-slate-400'}`} />
                            <span>
                              Substituir: <strong>{DAY_NAMES[sc.dayOfWeek] || `Dia ${sc.dayOfWeek}`} às {sc.startTime}</strong>
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSelectedToReplace ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isSelectedToReplace ? '✓ Selecionado' : 'Clique para Trocar'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Fixo */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              {/* Botão de Excluir Agendamento (visível ao editar um aluno já existente) */}
              {(selectedStudentObj?.id || student?.id || currentAttendanceId || currentScheduleId) && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all inline-flex items-center space-x-1.5 ${
                    showDeleteConfirm
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'text-rose-600 bg-white border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                  }`}
                  title="Excluir agendamento desta data ou da grade semanal fixa"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Excluir Agendamento</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!selectedStudentObj && !student?.id)}
              className="inline-flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-pilates-600 hover:bg-pilates-700 rounded-xl shadow-md shadow-pilates-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {scope === 'RECURRING_FUTURE' && scheduleToReplaceId
                      ? 'Confirmar Substituição'
                      : 'Confirmar Agendamento'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

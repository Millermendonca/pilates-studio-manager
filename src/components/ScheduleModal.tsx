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
} from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: {
    id?: string;
    name?: string;
    avatarUrl?: string | null;
    photoCompressed?: string | null;
    planName?: string;
  } | null;
  currentAttendanceId?: string;
  currentScheduleId?: string;
  initialDate?: string;
  initialTime?: string;
  onSuccess: () => void;
  onOpenNewStudent?: (targetDate: string, targetTime: string) => void;
}

const AVAILABLE_HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

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

  // Lista de Alunos e Busca
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentObj, setSelectedStudentObj] = useState<any | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialDate) setSelectedDate(initialDate);
      if (initialTime) setSelectedTime(initialTime);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStudentId = selectedStudentObj?.id || student?.id;

    if (!finalStudentId) {
      setError('Por favor, selecione um aluno para agendar.');
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
          scheduleId: currentScheduleId,
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

  const handleCreateNewClick = () => {
    onClose();
    if (onOpenNewStudent) {
      onOpenNewStudent(selectedDate, selectedTime);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header Fixo */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-pilates-600/40 border border-pilates-400/30">
              <Calendar className="w-5 h-5 text-pilates-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isCreatingNewSlot ? 'Agendar Aluno na Turma' : 'Alterar Horário de Aula'}
              </h3>
              <p className="text-xs text-slate-300">
                {selectedStudentObj?.name
                  ? `Aluno: ${selectedStudentObj.name}`
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

        {/* Formulário com Corpo Rolável e Footer Fixo */}
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
              <div className="p-3 bg-pilates-50/60 border-2 border-pilates-300 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-pilates-400 bg-white shrink-0">
                    <img
                      src={
                        selectedStudentObj.photoCompressed ||
                        selectedStudentObj.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedStudentObj.name || 'Aluno')}`
                      }
                      alt={selectedStudentObj.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{selectedStudentObj.name}</h4>
                    <p className="text-[11px] text-slate-500">{selectedStudentObj.planName || 'Plano Padrão'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudentObj(null)}
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
                    placeholder="Pesquisar por nome ou WhatsApp..."
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
                    filteredStudents.map((std) => (
                      <div
                        key={std.id}
                        onClick={() => setSelectedStudentObj(std)}
                        className="p-2 rounded-lg hover:bg-white flex items-center justify-between cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0">
                            <img
                              src={
                                std.photoCompressed ||
                                std.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name)}`
                              }
                              alt={std.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">{std.name}</span>
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

          {/* Seleção de Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Data da Aula
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pilates-500 text-xs bg-slate-50 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Horário da Turma
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pilates-500 text-xs bg-slate-50 font-semibold"
              >
                {AVAILABLE_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour} às {`${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Agendamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Agendamento
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Opção 1: Horário Fixo / Permanente */}
              <label
                className={`relative flex items-start p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  scope === 'RECURRING_FUTURE'
                    ? 'border-pilates-600 bg-pilates-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={scope === 'RECURRING_FUTURE'}
                  onChange={() => setScope('RECURRING_FUTURE')}
                  className="mt-0.5 text-pilates-600 focus:ring-pilates-500"
                />
                <div className="ml-3">
                  <span className="block text-xs font-bold text-slate-900">
                    📌 Horário Fixo Semanal (Grade Permanente)
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Define este horário fixo para o aluno toda semana.
                  </span>
                </div>
              </label>

              {/* Opção 2: Apenas nesta data (Avulsa / Reposição) */}
              <label
                className={`relative flex items-start p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  scope === 'SINGLE'
                    ? 'border-pilates-600 bg-pilates-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={scope === 'SINGLE'}
                  onChange={() => setScope('SINGLE')}
                  className="mt-0.5 text-pilates-600 focus:ring-pilates-500"
                />
                <div className="ml-3">
                  <span className="block text-xs font-bold text-slate-900">
                    🔄 Apenas nesta data específica (Aula Avulsa / Reposição)
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Agenda somente para este dia, sem alterar a grade padrão das próximas semanas.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

          {/* Footer Fixo */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>
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
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

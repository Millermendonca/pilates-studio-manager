'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  UserPlus,
  Settings,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Plus,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  GripVertical,
  Hourglass,
  Heart,
  Users,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ScheduleModal from '@/components/ScheduleModal';
import StudentFormModal from '@/components/StudentFormModal';
import Link from 'next/link';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'recurring_waitlist'>('day');
  const [data, setData] = useState<any>(null);
  const [recurringWaitlists, setRecurringWaitlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and Drop State
  const [draggedStudent, setDraggedStudent] = useState<any | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null); // "YYYY-MM-DD_HH:MM"

  // Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | undefined>(undefined);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>(undefined);
  const [modalTargetDate, setModalTargetDate] = useState<string | undefined>(undefined);
  const [modalTargetTime, setModalTargetTime] = useState<string | undefined>(undefined);

  // Cadastro de Novo Aluno direto da Agenda
  const [studentFormModalOpen, setStudentFormModalOpen] = useState(false);
  const [newStudentInitialData, setNewStudentInitialData] = useState<any | null>(null);

  const handleOpenCreateWithSlot = (targetDate: string, targetTime: string) => {
    const dayOfWeek = parseISO(targetDate).getDay() || 1;
    const hourNum = parseInt(targetTime.split(':')[0]);
    const endTime = `${(hourNum + 1).toString().padStart(2, '0')}:00`;

    setNewStudentInitialData({
      schedules: [
        { dayOfWeek, startTime: targetTime, endTime },
      ],
    });
    setStudentFormModalOpen(true);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      if (viewMode === 'recurring_waitlist') {
        const res = await fetch('/api/waitlist/recurring');
        const json = await res.json();
        setRecurringWaitlists(Array.isArray(json) ? json : []);
      } else {
        const res = await fetch(`/api/schedule?date=${currentDate}&view=${viewMode}`);
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erro ao buscar grade:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [currentDate, viewMode]);

  // Navegação de Datas
  const handlePrev = () => {
    const current = parseISO(currentDate);
    if (viewMode === 'day') {
      setCurrentDate(format(subDays(current, 1), 'yyyy-MM-dd'));
    } else if (viewMode === 'week') {
      setCurrentDate(format(subWeeks(current, 1), 'yyyy-MM-dd'));
    } else if (viewMode === 'month') {
      setCurrentDate(format(subMonths(current, 1), 'yyyy-MM-dd'));
    }
  };

  const handleNext = () => {
    const current = parseISO(currentDate);
    if (viewMode === 'day') {
      setCurrentDate(format(addDays(current, 1), 'yyyy-MM-dd'));
    } else if (viewMode === 'week') {
      setCurrentDate(format(addWeeks(current, 1), 'yyyy-MM-dd'));
    } else if (viewMode === 'month') {
      setCurrentDate(format(addMonths(current, 1), 'yyyy-MM-dd'));
    }
  };

  const handleToday = () => {
    setCurrentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSelectDayFromMonth = (dateStr: string) => {
    setCurrentDate(dateStr);
    setViewMode('day');
  };

  // Abrir Modal de Edição Direta
  const handleOpenScheduleChange = (
    student: any,
    attendanceId?: string,
    scheduleId?: string,
    initialDate?: string,
    initialTime?: string
  ) => {
    setSelectedStudent(student);
    setSelectedAttendanceId(attendanceId);
    setSelectedScheduleId(scheduleId);
    setModalTargetDate(initialDate || currentDate);
    setModalTargetTime(initialTime || '08:00');
    setScheduleModalOpen(true);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, student: any, attendanceId?: string, scheduleId?: string, sourceDate?: string, sourceTime?: string) => {
    const payload = {
      student,
      attendanceId,
      scheduleId,
      sourceDate: sourceDate || currentDate,
      sourceTime,
    };
    setDraggedStudent(payload);
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotKey) {
      setDragOverSlot(slotKey);
    }
  };

  const handleDragLeave = (slotKey: string) => {
    if (dragOverSlot === slotKey) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetTime: string) => {
    e.preventDefault();
    setDragOverSlot(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      const payload = dataStr ? JSON.parse(dataStr) : draggedStudent;

      if (!payload || !payload.student) return;

      // Abrir modal com a data e horário destino já preenchidos pelo drop
      setSelectedStudent(payload.student);
      setSelectedAttendanceId(payload.attendanceId);
      setSelectedScheduleId(payload.scheduleId);
      setModalTargetDate(targetDate);
      setModalTargetTime(targetTime);
      setScheduleModalOpen(true);
    } catch (err) {
      console.error('Erro no drag and drop:', err);
    } finally {
      setDraggedStudent(null);
    }
  };

  const capacity = data?.capacity || 8;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header com Navegação, Seletor de Visão e Configurações */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-semibold text-xs uppercase tracking-wider mb-0.5">
            <CalendarIcon className="w-4 h-4" />
            <span>Grade & Calendário de Aulas</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 capitalize">
            {viewMode === 'month'
              ? format(parseISO(currentDate), "MMMM 'de' yyyy", { locale: ptBR })
              : viewMode === 'week'
              ? `Semana de ${format(parseISO(currentDate), "dd 'de' MMMM", { locale: ptBR })}`
              : format(parseISO(currentDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
              ✋ Arraste e Solte Ativo
            </span>
            <span>Segure e arraste qualquer aluno para o horário ou dia desejado.</span>
          </div>
        </div>

        {/* Controles: Seletor de Visão + Navegação */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Visão */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'day'
                  ? 'bg-pilates-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>

            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-pilates-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>

            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-pilates-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>

            <button
              onClick={() => setViewMode('recurring_waitlist')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'recurring_waitlist'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100/70'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Filas Fixas & Casais</span>
            </button>
          </div>

          {/* Navegação Anterior / Hoje / Próximo */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-800 hover:bg-white rounded-lg transition-colors"
            >
              Hoje
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/configuracoes"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            title="Capacidade máxima da turma"
          >
            <Settings className="w-3.5 h-3.5 text-pilates-600" />
            <span>Capacidade: <strong className="text-emerald-700 font-bold">{capacity} alunos</strong></span>
          </Link>
        </div>
      </div>

      {/* Conteúdo Conforme a Visão */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 mt-2">Carregando visualização da grade...</p>
        </div>
      ) : viewMode === 'month' ? (
        /* ================= 1. VISÃO MENSAL ================= */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span className="text-slate-400">Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {data?.days?.map((day: any) => {
              const count = day.totalClasses || 0;
              const hasClasses = count > 0;

              return (
                <div
                  key={day.date}
                  onClick={() => handleSelectDayFromMonth(day.date)}
                  className={`min-h-[105px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    day.isToday
                      ? 'border-pilates-500 bg-pilates-50/50 shadow-sm ring-1 ring-pilates-500'
                      : !day.isCurrentMonth
                      ? 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60'
                      : hasClasses
                      ? 'bg-white border-slate-200 hover:border-pilates-400 hover:shadow-md'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono ${
                        day.isToday
                          ? 'bg-pilates-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasClasses && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-pilates-100 text-pilates-800">
                        {count} alunos
                      </span>
                    )}
                  </div>

                  {hasClasses && day.students ? (
                    <div className="flex items-center -space-x-1.5 my-1 overflow-hidden">
                      {day.students.slice(0, 3).map((std: any) => (
                        <div
                          key={std.id}
                          className="w-5 h-5 rounded-full overflow-hidden border border-white shrink-0 shadow-2xs"
                          title={std.name}
                        >
                          <img
                            src={std.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name)}`}
                            alt={std.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {day.students.length > 3 && (
                        <span className="text-[9px] font-bold text-slate-500 pl-2">
                          +{day.students.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-4"></div>
                  )}

                  <div className="text-[9px] text-slate-400 text-right">
                    {hasClasses ? 'Ver turmas →' : 'Livre'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* ================= 2. VISÃO SEMANAL COM DRAG & DROP ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <div className="p-3 text-center text-slate-400 border-r border-slate-200">
                Horário
              </div>
              {data?.days?.map((day: any) => (
                <div
                  key={day.date}
                  className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${
                    day.isToday ? 'bg-pilates-50 text-pilates-800' : ''
                  }`}
                >
                  <div className="capitalize">{day.dayName}</div>
                  <div className="text-[11px] text-slate-500 font-mono font-normal">
                    {day.dayNumber}
                  </div>
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="grid grid-cols-7 text-xs">
                  <div className="p-3 font-mono font-bold text-slate-700 bg-slate-50/60 border-r border-slate-200 flex items-center justify-center">
                    {time}
                  </div>

                  {data?.days?.map((day: any) => {
                    const slotKey = `${day.date}_${time}`;
                    const isDragOver = dragOverSlot === slotKey;

                    const attendances =
                      day.attendances?.filter((a: any) => a.startTime === time) || [];
                    const recurring =
                      day.recurring?.filter((r: any) => r.startTime === time) || [];

                    const studentsMap = new Map();
                    recurring.forEach((r: any) => {
                      studentsMap.set(r.studentId, {
                        student: r.student,
                        scheduleId: r.id,
                        status: 'SCHEDULED',
                      });
                    });
                    attendances.forEach((a: any) => {
                      studentsMap.set(a.studentId, {
                        student: a.student,
                        attendanceId: a.id,
                        status: a.status,
                        isReplacement: a.isReplacement,
                      });
                    });

                    const enrolled = Array.from(studentsMap.values());
                    const occupied = enrolled.length;
                    const isFull = occupied >= capacity;

                    return (
                      <div
                        key={day.date}
                        onDragOver={(e) => handleDragOver(e, slotKey)}
                        onDragLeave={() => handleDragLeave(slotKey)}
                        onDrop={(e) => handleDrop(e, day.date, time)}
                        className={`p-2 border-r border-slate-200 last:border-r-0 min-h-[85px] space-y-1.5 flex flex-col justify-between transition-all ${
                          isDragOver
                            ? 'bg-emerald-50 border-2 border-dashed border-emerald-500 scale-[0.98]'
                            : day.isToday
                            ? 'bg-pilates-50/20'
                            : isFull
                            ? 'bg-rose-50/30'
                            : 'bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          {enrolled.map(({ student, attendanceId, scheduleId, status, isReplacement }) => (
                            <div
                              key={student.id}
                              draggable={true}
                              onDragStart={(e) =>
                                handleDragStart(e, student, attendanceId, scheduleId, day.date, time)
                              }
                              onClick={() =>
                                handleOpenScheduleChange(student, attendanceId, scheduleId, day.date, time)
                              }
                              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-pilates-500 shadow-2xs cursor-grab active:cursor-grabbing flex items-center justify-between text-[11px] group transition-all"
                              title="Segure e arraste para outro dia/horário ou clique para editar"
                            >
                              <div className="flex items-center space-x-1.5 overflow-hidden">
                                <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-300 shrink-0 bg-slate-100">
                                  <img
                                    src={student.photoCompressed || student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`}
                                    alt={student.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                                <span className="truncate max-w-[65px] font-semibold text-slate-800 group-hover:text-pilates-700">
                                  {student.name.split(' ')[0]}
                                </span>
                              </div>

                              {(student.isPaused || student.status === 'PAUSED') ? (
                                <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold" title="Matrícula Pausada">
                                  ⏸
                                </span>
                              ) : isReplacement ? (
                                <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-bold">
                                  R
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1">
                          <span className={isFull ? 'text-rose-600 font-bold' : ''}>
                            {occupied}/{capacity}
                          </span>
                          {!isFull && (
                            <button
                              onClick={() =>
                                handleOpenScheduleChange(
                                  { id: '', name: 'Novo Aluno' },
                                  undefined,
                                  undefined,
                                  day.date,
                                  time
                                )
                              }
                              className="text-pilates-600 hover:underline font-bold"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'day' ? (
        /* ================= 3. VISÃO DIÁRIA COM DRAG & DROP ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIME_SLOTS.map((time) => {
            const slotKey = `${currentDate}_${time}`;
            const isDragOver = dragOverSlot === slotKey;

            const attendances =
              data?.attendances?.filter((a: any) => a.startTime === time) || [];
            const recurring =
              data?.recurring?.filter((r: any) => r.startTime === time) || [];

            const studentsMap = new Map();
            recurring.forEach((r: any) => {
              studentsMap.set(r.studentId, {
                student: r.student,
                scheduleId: r.id,
                status: 'SCHEDULED',
                isRecurring: true,
              });
            });
            attendances.forEach((a: any) => {
              studentsMap.set(a.studentId, {
                student: a.student,
                attendanceId: a.id,
                status: a.status,
                isReplacement: a.isReplacement,
                isRecurring: false,
              });
            });

            const enrolledStudents = Array.from(studentsMap.values());
            const occupied = enrolledStudents.length;
            const isFull = occupied >= capacity;

            return (
              <div
                key={time}
                onDragOver={(e) => handleDragOver(e, slotKey)}
                onDragLeave={() => handleDragLeave(slotKey)}
                onDrop={(e) => handleDrop(e, currentDate, time)}
                className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                  isDragOver
                    ? 'border-2 border-dashed border-emerald-500 bg-emerald-50/50 shadow-md scale-[0.99]'
                    : isFull
                    ? 'border-rose-200/90 bg-rose-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header do Slot */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900">{time}</span>
                      <span className="text-[11px] text-slate-400 block">
                        até {(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      isFull
                        ? 'bg-rose-100 text-rose-800'
                        : occupied > 0
                        ? 'bg-pilates-50 text-pilates-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {occupied}/{capacity} vagas
                  </span>
                </div>

                {/* Lista de Alunos com suporte a Drag */}
                <div className="p-4 space-y-2.5 flex-1">
                  {enrolledStudents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                      Arraste um aluno para cá ou clique em + Agendar
                    </div>
                  ) : (
                    enrolledStudents.map(({ student, attendanceId, scheduleId, status, isReplacement }) => {
                      const isGPS = status === 'CONFIRMED_GPS';
                      const isManual = status === 'CONFIRMED_MANUAL';

                      return (
                        <div
                          key={student.id}
                          draggable={true}
                          onDragStart={(e) =>
                            handleDragStart(e, student, attendanceId, scheduleId, currentDate, time)
                          }
                          onClick={() =>
                            handleOpenScheduleChange(student, attendanceId, scheduleId, currentDate, time)
                          }
                          className="group p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-pilates-400 hover:shadow-md cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
                          title="Segure e arraste para alterar de horário ou clique para abrir o modal"
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
                            <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-slate-200 shrink-0 shadow-2xs bg-slate-100">
                              <img
                                src={student.photoCompressed || student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`}
                                alt={student.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-pilates-700 transition-colors flex items-center space-x-1.5">
                                <span>{student.name}</span>
                                {(student.isPaused || student.status === 'PAUSED') && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                    Pausado
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] text-slate-500">{student.planName}</span>
                                {isReplacement && (
                                  <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded">
                                    Reposição
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isGPS ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                📡 GPS
                              </span>
                            ) : isManual ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Presente</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 group-hover:text-pilates-600 underline">
                                Mover / Editar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Seção Fila de Espera (Ordem de Chegada) */}
                  {(() => {
                    const slotWaitlists = data?.waitlists?.filter((w: any) => w.startTime === time) || [];
                    if (slotWaitlists.length === 0) return null;

                    return (
                      <div className="mt-2.5 p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 space-y-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                          <span className="flex items-center space-x-1">
                            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
                            <span>Fila de Espera ({slotWaitlists.length} aguardando)</span>
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold bg-white px-1.5 py-0.2 rounded border border-amber-200">
                            Entra automático se vagar
                          </span>
                        </div>
                        <div className="space-y-1">
                          {slotWaitlists.map((w: any, idx: number) => (
                            <div
                              key={w.id}
                              className="p-1.5 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                  <img
                                    src={w.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(w.student.name)}`}
                                    alt={w.student.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[130px]">
                                  {w.student.name}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {format(new Date(w.createdAt), 'HH:mm')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
                  <span>{isFull ? 'Turma Completa' : `${capacity - occupied} vaga(s) disponível(is)`}</span>
                  {!isFull && (
                    <button
                      onClick={() =>
                        handleOpenScheduleChange(
                          { id: '', name: 'Novo Aluno' },
                          undefined,
                          undefined,
                          currentDate,
                          time
                        )
                      }
                      className="text-pilates-600 hover:text-pilates-800 font-bold text-[11px] flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= 4. VISÃO DE FILAS DE HORÁRIOS FIXOS & CASAIS ================= */
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-1">
                <Hourglass className="w-4 h-4" />
                <span>Gestão de Filas de Espera Fixas & Recorrentes</span>
              </div>
              <h2 className="text-lg font-black">Alunos & Casais Aguardando Horários Definitivos</h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                O sistema gerencia automaticamente a ordem de chegada, respeita a necessidade de <strong>2 vagas juntas para casais</strong> e envia um aviso prévio no app para o aluno aceitar ou passar a vez antes de consolidar a mudança na grade.
              </p>
            </div>

            <button
              onClick={fetchSchedule}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0"
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Atualizar Fila</span>
            </button>
          </div>

          {recurringWaitlists.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <Hourglass className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nenhum aluno na fila de horários fixos</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Quando alunos ou casais solicitarem entrada na fila de espera para horários semanais fixos pelo app ou recepção, eles aparecerão aqui ordenados por posição.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringWaitlists.map((entry: any, index: number) => {
                const DAY_NAMES = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                const isOffered = entry.status === 'OFFERED';

                return (
                  <div
                    key={entry.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-sm space-y-3 ${
                      isOffered
                        ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/20'
                        : entry.isCouple
                        ? 'border-indigo-300 bg-indigo-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Topo: Horário Fixo & Posição */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Toda {DAY_NAMES[entry.dayOfWeek]} às {entry.startTime}</span>
                      </span>
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        {index + 1}º da Fila
                      </span>
                    </div>

                    {/* Aluno Titular */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-400 shrink-0">
                        <img
                          src={entry.student?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.student?.name || 'Aluno')}`}
                          alt={entry.student?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{entry.student?.name}</h4>
                        <span className="text-[10px] text-slate-400">{entry.student?.phone || 'Sem telefone'}</span>
                      </div>
                    </div>

                    {/* Se for Casal / Dupla */}
                    {entry.isCouple && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                        <div className="flex items-center space-x-1 font-bold text-rose-800 text-[11px]">
                          <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                          <span>Vaga para Casal / Dupla (2 vagas juntas)</span>
                        </div>
                        <p className="text-[11px] text-rose-950 font-medium">
                          Parceiro(a): <strong>{entry.partnerStudent?.name || entry.partnerName || 'Parceiro(a)'}</strong>
                        </p>
                      </div>
                    )}

                    {/* Status da Oferta */}
                    <div className="pt-1">
                      {isOffered ? (
                        <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5 animate-pulse">
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>🎉 Oferta Enviada! Aguardando o aluno confirmar no app.</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-medium flex items-center justify-between">
                          <span>⏳ Status:</span>
                          <span className="font-bold text-indigo-700">
                            {entry.isCouple ? 'Aguardando 2 vagas' : 'Aguardando 1 vaga'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Agendamento / Remarcação */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        currentAttendanceId={selectedAttendanceId}
        currentScheduleId={selectedScheduleId}
        initialDate={modalTargetDate || currentDate}
        initialTime={modalTargetTime || '08:00'}
        onSuccess={fetchSchedule}
        onOpenNewStudent={handleOpenCreateWithSlot}
      />

      {/* Modal de Cadastro de Novo Aluno */}
      <StudentFormModal
        isOpen={studentFormModalOpen}
        onClose={() => {
          setStudentFormModalOpen(false);
          setNewStudentInitialData(null);
        }}
        student={newStudentInitialData}
        onSuccess={() => {
          fetchSchedule();
        }}
      />
    </div>
  );
}

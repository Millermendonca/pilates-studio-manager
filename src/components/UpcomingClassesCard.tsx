'use client';

import React from 'react';
import { Clock, Users, ArrowRight, PlusCircle, CheckCircle2 } from 'lucide-react';

interface UpcomingClassesCardProps {
  slots: {
    time: string;
    students: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      planName: string;
      status: string;
    }[];
  }[];
  capacity: number;
  onOpenScheduleModal: (student: any) => void;
  onNewBooking?: (time: string) => void;
}

export default function UpcomingClassesCard({
  slots,
  capacity,
  onOpenScheduleModal,
  onNewBooking,
}: UpcomingClassesCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-pilates-50 text-pilates-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Próximos Horários de Hoje</h3>
            <p className="text-xs text-slate-500">Capacidade máxima por turma: {capacity} alunos</p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {slots.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            Nenhuma turma restante para hoje.
          </div>
        ) : (
          slots.map((slot) => {
            const occupied = slot.students.length;
            const percentage = Math.min(100, Math.round((occupied / capacity) * 100));
            const isFull = occupied >= capacity;

            return (
              <div
                key={slot.time}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-800 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {slot.time}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : occupied > 0
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {occupied}/{capacity} vagas {isFull ? '(Lotado)' : ''}
                    </span>
                  </div>

                  {/* Barra de Ocupação */}
                  <div className="w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-rose-500'
                          : percentage > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Lista de Alunos no Horário */}
                {slot.students.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {slot.students.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => onOpenScheduleModal(student)}
                        className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:border-pilates-500 hover:text-pilates-700 cursor-pointer transition-all shadow-2xs"
                        title="Clique para remarcar horário deste aluno"
                      >
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-300">
                          <img
                            src={student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="truncate max-w-[110px]">{student.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-1">Nenhum aluno agendado ainda.</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

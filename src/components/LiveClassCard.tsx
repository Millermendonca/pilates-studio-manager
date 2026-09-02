'use client';

import React, { useState } from 'react';
import {
  UserCheck,
  MapPin,
  Clock,
  HeartPulse,
  CheckCircle,
  AlertTriangle,
  Radio,
  UserX,
  Sparkles,
} from 'lucide-react';
import { getStudentAvatar } from '@/lib/avatar';
import { getStudentDisplayName, getStudentFullName } from '@/lib/studentHelper';

interface Student {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  photoCompressed?: string | null;
  planName: string;
  healthNotes?: string | null;
  restrictions?: string | null;
}

interface AttendanceItem {
  id: string;
  studentId: string;
  student: Student;
  startTime: string;
  endTime: string;
  status: string; // SCHEDULED, CONFIRMED_MANUAL, CONFIRMED_GPS, CANCELLED_WITH_CREDIT, ABSENT
  gpsDwellMinutes?: number | null;
}

interface LiveClassCardProps {
  currentHour: string;
  capacity: number;
  attendances: AttendanceItem[];
  onCheckin: (attendanceId: string, type: 'MANUAL' | 'GPS') => void;
  onOpenScheduleModal: (student: Student, attendanceId?: string) => void;
}

export default function LiveClassCard({
  currentHour,
  capacity,
  attendances,
  onCheckin,
  onOpenScheduleModal,
}: LiveClassCardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleManualCheckin = async (attendanceId: string) => {
    setLoadingId(attendanceId);
    await onCheckin(attendanceId, 'MANUAL');
    setLoadingId(null);
  };

  const confirmedCount = attendances.filter(
    (a) => a.status === 'CONFIRMED_MANUAL' || a.status === 'CONFIRMED_GPS'
  ).length;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
      {/* Header do Card Ao Vivo */}
      <div className="bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-pilates-500/20 border border-pilates-400/40 flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AO VIVO AGORA
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Horário: {currentHour} - {(parseInt(currentHour.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Turma em Sala de Aula
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400">
              {attendances.length}
              <span className="text-sm font-semibold text-slate-400">/{capacity}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {confirmedCount} presentes
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Alunos da Turma Atual */}
      <div className="p-5">
        {attendances.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">Nenhum aluno agendado para este horário.</p>
            <p className="text-xs text-slate-400 mt-1">
              Capacidade livre: até {capacity} alunos podem ser alocados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendances.map((att) => {
              const student = att.student;
              const isConfirmedGPS = att.status === 'CONFIRMED_GPS';
              const isConfirmedManual = att.status === 'CONFIRMED_MANUAL';
              const isConfirmed = isConfirmedGPS || isConfirmedManual;

              return (
                <div
                  key={att.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isConfirmed
                      ? 'bg-emerald-50/40 border-emerald-200/80 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pilates-500 shadow-sm bg-slate-100">
                          <img
                            src={getStudentAvatar(student)}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {isConfirmedGPS && (
                          <span
                            title="Presença confirmada por Geolocalização GPS (>30min no estúdio)"
                            className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold p-1 rounded-full border border-white shadow"
                          >
                            📡
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 uppercase">
                          {getStudentFullName(student)} {student.nickname ? `(${student.nickname.toUpperCase()})` : ''}
                        </h4>
                        <span className="inline-block text-[11px] font-medium text-pilates-700 bg-pilates-50 px-2 py-0.5 rounded-md mt-0.5">
                          {student.planName}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isConfirmedGPS ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>GPS Automático</span>
                        </span>
                      ) : isConfirmedManual ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Presente</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Aguardando</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ficha Rápida de Saúde / Lesão / Cuidados no Pilates */}
                  {(student.healthNotes || student.restrictions) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100/80 text-xs text-rose-900">
                      <div className="flex items-center space-x-1 font-bold text-rose-800 mb-0.5">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Atenção no Aparelho:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-950 font-medium">
                        {student.healthNotes || student.restrictions}
                      </p>
                    </div>
                  )}

                  {/* Ações Rápidas */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => onOpenScheduleModal(student, att.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium underline-offset-2 hover:underline"
                    >
                      Remarcar Horário
                    </button>

                    {!isConfirmed && (
                      <button
                        onClick={() => handleManualCheckin(att.id)}
                        disabled={loadingId === att.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{loadingId === att.id ? 'Marcando...' : 'Confirmar Presença'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

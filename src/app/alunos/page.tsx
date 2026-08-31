'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  HeartPulse,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  Activity,
  MessageSquare,
  FileText,
  UserX,
  PauseCircle,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import StudentFormModal from '@/components/StudentFormModal';
import PixPaymentModal from '@/components/PixPaymentModal';
import { format, differenceInDays, subDays } from 'date-fns';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AlunosPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'STANDARD' | 'CORPORATE' | 'PAUSED' | 'ABSENT' | 'BLOCKED'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);

  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      setStudents(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const handleOpenCreate = () => {
    setSelectedStudentForEdit(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (student: any) => {
    setSelectedStudentForEdit(student);
    setFormModalOpen(true);
  };

  const handleOpenPix = async (student: any) => {
    try {
      const res = await fetch('/api/inter/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          title: `Mensalidade Pilates - ${student.planName}`,
          amount: student.monthlyFee,
        }),
      });
      const pixData = await res.json();
      setSelectedInvoice({
        id: pixData.txid,
        amount: pixData.valor || student.monthlyFee,
        title: `Mensalidade Pilates - ${student.name}`,
        dueDate: new Date().toISOString(),
        pixQrCode: pixData.qrCodeBase64,
        pixCopiaECola: pixData.pixCopiaECola,
        student: { name: student.name, email: student.email },
      });
      setPixModalOpen(true);
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
    }
  };

  const handleToggleCorporateBlock = async (studentId: string, currentBlocked: boolean) => {
    const action = currentBlocked ? 'APPROVE' : 'BLOCK';
    const confirmMsg = currentBlocked
      ? 'Deseja desbloquear os agendamentos deste aluno?'
      : 'Deseja bloquear os agendamentos deste aluno por falta sem aviso prévio de 2h? O aluno receberá uma notificação no app para enviar o check-in do convênio.';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/corporate/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Status atualizado com sucesso!');
        fetchStudents();
      }
    } catch (err) {
      console.error('Erro ao atualizar bloqueio:', err);
    }
  };

  // Exportação Completa de CRM para CSV / Excel
  const handleExportCSV = () => {
    if (!students || students.length === 0) {
      alert('Nenhum aluno encontrado para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Nome Completo',
      'Status',
      'Telefone / WhatsApp',
      'E-mail',
      'CPF',
      'Data de Nascimento',
      'CEP',
      'Endereço',
      'Bairro',
      'Cidade',
      'Estado',
      'Plano Contratado',
      'Valor Mensalidade (R$)',
      'É Convênio',
      'Provedor Convênio',
      'Bloqueado',
      'Contato Emergência - Nome',
      'Contato Emergência - Telefone',
      'Contato Emergência - Parentesco',
      'Histórico de Saúde / Anamnese',
      'Lesões e Dores',
      'Cirurgias',
      'Restrições de Movimento',
      'Nível de Dor (0-10)',
      'Objetivos',
      'Contrato Aceito',
      'Data Aceite Contrato',
      'Total de Aulas',
      'Data de Cadastro',
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = students.map((s) => [
      escapeCSV(s.id),
      escapeCSV(s.name),
      escapeCSV(s.status || (s.active ? 'Ativo' : 'Inativo')),
      escapeCSV(s.phone),
      escapeCSV(s.email || ''),
      escapeCSV(s.cpf || ''),
      escapeCSV(s.birthDate ? format(new Date(s.birthDate), 'dd/MM/yyyy') : ''),
      escapeCSV(s.cep || ''),
      escapeCSV(s.address || ''),
      escapeCSV(s.neighborhood || ''),
      escapeCSV(s.city || ''),
      escapeCSV(s.state || ''),
      escapeCSV(s.planName || ''),
      escapeCSV(s.monthlyFee ? s.monthlyFee.toFixed(2) : '0.00'),
      escapeCSV(s.isCorporate ? 'Sim' : 'Não'),
      escapeCSV(s.corporateProvider || ''),
      escapeCSV(s.isBlocked ? 'Sim' : 'Não'),
      escapeCSV(s.emergencyContactName || ''),
      escapeCSV(s.emergencyContactPhone || ''),
      escapeCSV(s.emergencyContactRelation || ''),
      escapeCSV(s.healthNotes || ''),
      escapeCSV(s.injuries || ''),
      escapeCSV(s.surgeries || ''),
      escapeCSV(s.movementRestrictions || ''),
      escapeCSV(s.painLevel ?? 0),
      escapeCSV(s.goals || ''),
      escapeCSV(s.contractAccepted ? 'Sim' : 'Não'),
      escapeCSV(s.contractAcceptedAt ? format(new Date(s.contractAcceptedAt), 'dd/MM/yyyy HH:mm') : ''),
      escapeCSV(s._count?.attendances ?? 0),
      escapeCSV(s.createdAt ? format(new Date(s.createdAt), 'dd/MM/yyyy') : ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `planilha_crm_alunos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Alunos ausentes (> 10 dias sem presença)
  const tenDaysAgo = subDays(new Date(), 10);
  const absentCount = students.filter((s) => {
    if (!s.active || s.status !== 'ACTIVE' || s.isPaused) return false;
    const lastAttendance = s.attendances && s.attendances[0];
    if (!lastAttendance) return true;
    return new Date(lastAttendance.classDate) < tenDaysAgo;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-bold text-xs uppercase tracking-wider mb-0.5">
            <Users className="w-4 h-4" />
            <span>Gestão Cadastral, Prontuário & Anamnese</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Alunos & Prontuários Clínicos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro completo por CEP, anamnese, restrições de movimento, acompanhamento de evolução aula a aula e cobrança PIX.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition-all"
            title="Exportar base completa para Excel / CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CRM (CSV)</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pilates-600/20 transition-all whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* Busca & Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, CPF, telefone, CEP, bairro ou restrição médica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Todos ({students.length})
          </button>

          <button
            onClick={() => setFilterType('STANDARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'STANDARD'
                ? 'bg-pilates-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Particulares ({students.filter((s) => !s.isCorporate && !s.isPaused).length})
          </button>

          <button
            onClick={() => setFilterType('CORPORATE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'CORPORATE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            🏢 Convênios ({students.filter((s) => s.isCorporate).length})
          </button>

          <button
            onClick={() => setFilterType('PAUSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'PAUSED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            ⏸ Pausados ({students.filter((s) => s.isPaused || s.status === 'PAUSED').length})
          </button>

          {absentCount > 0 && (
            <button
              onClick={() => setFilterType('ABSENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'ABSENT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              ⚠️ Alerta de Evasão / Ausentes ({absentCount})
            </button>
          )}

          {students.some((s) => s.isBlocked) && (
            <button
              onClick={() => setFilterType('BLOCKED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all animate-pulse ${
                filterType === 'BLOCKED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🔒 Bloqueados ({students.filter((s) => s.isBlocked).length})
            </button>
          )}
        </div>
      </div>

      {/* Grid de Cards de Alunos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 mt-2">Carregando prontuários...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nenhum aluno encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente outro termo de busca ou cadastre um novo aluno para iniciar o gerenciamento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students
            .filter((s) => {
              if (filterType === 'STANDARD') return !s.isCorporate && !s.isPaused;
              if (filterType === 'CORPORATE') return s.isCorporate;
              if (filterType === 'PAUSED') return s.isPaused || s.status === 'PAUSED';
              if (filterType === 'BLOCKED') return s.isBlocked;
              if (filterType === 'ABSENT') {
                const last = s.attendances && s.attendances[0];
                return s.active && !s.isPaused && (!last || new Date(last.classDate) < tenDaysAgo);
              }
              return true;
            })
            .map((student) => {
              const isPaused = student.isPaused || student.status === 'PAUSED';
              const isBlocked = student.isBlocked;
              const hasRestrictions = !!(student.movementRestrictions || student.restrictions || student.healthNotes);
              const avatar = student.photoCompressed || student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`;

              // Verificar atraso > 5 dias
              const hasOverdue5d = student.invoices?.some((inv: any) => {
                if (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()) {
                  return differenceInDays(new Date(), new Date(inv.dueDate)) >= 5;
                }
                return false;
              });

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                    isBlocked
                      ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/10'
                      : isPaused
                      ? 'border-amber-300 bg-amber-50/20'
                      : hasOverdue5d
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Topo: Foto / Miniatura Compactada + Nome + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-pilates-500 shrink-0 shadow-sm bg-slate-100">
                          <img
                            src={avatar}
                            alt={student.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-tight flex items-center space-x-1.5">
                            <span>{student.name}</span>
                            {isPaused && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                                Pausado
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center space-x-1.5 mt-1">
                            <span className="text-[11px] font-semibold text-pilates-800 bg-pilates-50 px-2 py-0.5 rounded-md border border-pilates-200/60">
                              {student.planName}
                            </span>
                            {student.isCorporate && (
                              <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                                {student.corporateProvider || 'CONVÊNIO'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="p-2 text-slate-400 hover:text-pilates-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Abrir Prontuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Alerta de Inadimplência / Perda de Vaga */}
                    {hasOverdue5d && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Fatura vencida há &gt; 5 dias (Vaga liberada)</span>
                        </span>
                      </div>
                    )}

                    {/* Contato & Endereço */}
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{student.phone || 'Sem telefone'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">
                          {student.cep ? `CEP ${student.cep} • ` : ''}
                          {student.address || student.neighborhood || 'São Paulo'}
                        </span>
                      </div>
                    </div>

                    {/* Horários Fixos */}
                    {student.schedules && student.schedules.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Horários Fixos Semanais:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {student.schedules.map((sch: any) => (
                            <span
                              key={sch.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-medium"
                            >
                              <span className="font-bold text-pilates-700">{DAY_NAMES[sch.dayOfWeek]}:</span>
                              <span>{sch.startTime}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ficha de Saúde / Restrições (Crítico para Pilates) */}
                    {hasRestrictions && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900">
                        <div className="flex items-center space-x-1 font-bold text-rose-800 mb-0.5">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                          <span>Restrições & Anamnese:</span>
                        </div>
                        <p className="text-[11px] text-rose-950 line-clamp-2">
                          {student.movementRestrictions || student.restrictions || student.healthNotes}
                        </p>
                      </div>
                    )}

                    {/* Última Anotação de Evolução */}
                    {student.evolutions && student.evolutions.length > 0 && (
                      <div className="mt-2.5 p-2 rounded-xl bg-pilates-50/70 border border-pilates-100 text-xs text-pilates-950">
                        <div className="flex items-center justify-between font-bold text-pilates-800 text-[10px] uppercase">
                          <span className="flex items-center space-x-1">
                            <Activity className="w-3 h-3 text-pilates-600" />
                            <span>Última Evolução:</span>
                          </span>
                          <span>{format(new Date(student.evolutions[0].date), 'dd/MM')}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 line-clamp-1 mt-0.5">
                          {student.evolutions[0].notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações Inferiores */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {student.isCorporate ? (
                        <span className="text-xs font-bold text-purple-700">Convênio</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-900">
                          R$ {student.monthlyFee?.toFixed(2)}/mês
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={`https://wa.me/55${student.phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(student.name)}%2C%20tudo%20bem%3F%20Aqui%20%C3%A9%20do%20Studio%20Pilates.`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>

                      {!student.isCorporate && (
                        <button
                          onClick={() => handleOpenPix(student)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>PIX Inter</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de Formulário & Prontuário */}
      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        student={selectedStudentForEdit}
        onSuccess={fetchStudents}
      />

      {/* Modal de PIX */}
      {selectedInvoice && (
        <PixPaymentModal
          isOpen={pixModalOpen}
          onClose={() => setPixModalOpen(false)}
          invoice={selectedInvoice}
          onPaymentConfirmed={fetchStudents}
        />
      )}
    </div>
  );
}

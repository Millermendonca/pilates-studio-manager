'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  HeartPulse,
  DollarSign,
  Phone,
  MapPin,
  Edit,
  Trash2,
  AlertTriangle,
  Activity,
  MessageSquare,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Download,
  LayoutGrid,
  List,
  CreditCard,
  X,
  RefreshCw,
  CheckSquare,
  Square,
  ArrowUpDown,
  FileText,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import StudentFormModal from '@/components/StudentFormModal';
import PixPaymentModal from '@/components/PixPaymentModal';
import { format, differenceInDays, subDays } from 'date-fns';
import { getStudentAvatar } from '@/lib/avatar';
import { getStudentFullName, getStudentNickname } from '@/lib/studentHelper';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type FilterType = 'ALL' | 'STANDARD' | 'CORPORATE' | 'PAUSED' | 'RESTRICTIONS' | 'ABSENT' | 'BLOCKED';
type ViewMode = 'COMPACT' | 'LIST' | 'CARDS';
type SortBy = 'NAME_ASC' | 'PLAN' | 'FEE_DESC' | 'RECENT';

export default function AlunosPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('COMPACT');
  const [sortBy, setSortBy] = useState<SortBy>('NAME_ASC');
  const [loading, setLoading] = useState(true);

  // Seleção em lote para exclusão rápida
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);

  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Modal de Confirmação de Exclusão (Individual ou em Lote)
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Carregar preferência de visualização salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pilates_alunos_view_mode') as ViewMode | null;
      if (saved && ['COMPACT', 'LIST', 'CARDS'].includes(saved)) {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('pilates_alunos_view_mode', mode);
    } catch {}
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`, { cache: 'no-store' });
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
        title: `Mensalidade Pilates - ${getStudentFullName(student)}`,
        dueDate: new Date().toISOString(),
        pixQrCode: pixData.qrCodeBase64,
        pixCopiaECola: pixData.pixCopiaECola,
        student: { name: getStudentFullName(student), email: student.email },
      });
      setPixModalOpen(true);
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
    }
  };

  // Excluir um único aluno
  const handleConfirmSingleDelete = async () => {
    if (!studentToDelete?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedIds((prev) => prev.filter((id) => id !== studentToDelete.id));
        setStudentToDelete(null);
        await fetchStudents();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Erro ao excluir aluno.');
      }
    } catch (err) {
      console.error('Erro ao excluir aluno:', err);
      alert('Erro de comunicação ao excluir aluno.');
    } finally {
      setDeleting(false);
    }
  };

  // Alternar Pausa Rápida (alternativa suave à exclusão)
  const handleQuickTogglePause = async (student: any) => {
    const currentlyPaused = student.isPaused || student.status === 'PAUSED';
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentlyPaused ? 'ACTIVE' : 'PAUSED',
          isPaused: !currentlyPaused,
        }),
      });
      if (res.ok) {
        setStudentToDelete(null);
        await fetchStudents();
      }
    } catch (err) {
      console.error('Erro ao pausar/reativar aluno:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Excluir múltiplos alunos selecionados em lote
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        setBulkDeleteConfirmOpen(false);
        await fetchStudents();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Erro ao excluir alunos selecionados.');
      }
    } catch (err) {
      console.error('Erro ao excluir em lote:', err);
      alert('Erro ao excluir alunos em lote.');
    } finally {
      setDeleting(false);
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
      'Apelido (Nome de Exibição)',
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
      escapeCSV(getStudentFullName(s)),
      escapeCSV(getStudentNickname(s)),
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

  // Métricas e contadores dos filtros
  const tenDaysAgo = useMemo(() => subDays(new Date(), 10), []);

  const counts = useMemo(() => {
    const standard = students.filter((s) => !s.isCorporate && !s.isPaused && s.status !== 'PAUSED').length;
    const corporate = students.filter((s) => s.isCorporate).length;
    const paused = students.filter((s) => s.isPaused || s.status === 'PAUSED').length;
    const restrictions = students.filter(
      (s) => !!(s.movementRestrictions || s.restrictions || s.healthNotes || s.injuries)
    ).length;
    const blocked = students.filter((s) => s.isBlocked).length;
    const absent = students.filter((s) => {
      if (!s.active || s.status !== 'ACTIVE' || s.isPaused) return false;
      const lastAttendance = s.attendances && s.attendances[0];
      if (!lastAttendance) return true;
      return new Date(lastAttendance.classDate) < tenDaysAgo;
    }).length;

    return {
      total: students.length,
      standard,
      corporate,
      paused,
      restrictions,
      blocked,
      absent,
    };
  }, [students, tenDaysAgo]);

  // Lista filtrada e ordenada
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      if (filterType === 'STANDARD') return !s.isCorporate && !s.isPaused && s.status !== 'PAUSED';
      if (filterType === 'CORPORATE') return s.isCorporate;
      if (filterType === 'PAUSED') return s.isPaused || s.status === 'PAUSED';
      if (filterType === 'RESTRICTIONS') {
        return !!(s.movementRestrictions || s.restrictions || s.healthNotes || s.injuries);
      }
      if (filterType === 'BLOCKED') return s.isBlocked;
      if (filterType === 'ABSENT') {
        const last = s.attendances && s.attendances[0];
        return s.active && !s.isPaused && s.status === 'ACTIVE' && (!last || new Date(last.classDate) < tenDaysAgo);
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'PLAN') {
        return (a.planName || '').localeCompare(b.planName || '');
      }
      if (sortBy === 'FEE_DESC') {
        return (b.monthlyFee || 0) - (a.monthlyFee || 0);
      }
      if (sortBy === 'RECENT') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return getStudentFullName(a).localeCompare(getStudentFullName(b));
    });
  }, [students, filterType, sortBy, tenDaysAgo]);

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.includes(s.id));

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Header Compacto de Alta Densidade */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white px-4 py-3 rounded-2xl shadow-2xs border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-pilates-50 border border-pilates-200/80 flex items-center justify-center text-pilates-600 shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Alunos & Prontuários
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Gestão rápida de fichas clínicas, horários fixos, cobrança PIX e exclusão de registros.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all animate-in zoom-in-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all"
            title="Exportar base completa para Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-pilates-600/20 transition-all whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* Barra Unificada: Busca + Filtros + Ordenação + Alternador de Densidade/Visualização */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Campo de Busca Compacto */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, apelido, telefone, CPF, bairro, plano ou restrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controles de Ordenação e Modo de Exibição */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            {/* Seletor de Ordenação */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                title="Ordenar alunos"
              >
                <option value="NAME_ASC">Ordem A–Z</option>
                <option value="PLAN">Por Plano</option>
                <option value="FEE_DESC">Maior Mensalidade</option>
                <option value="RECENT">Mais Recentes</option>
              </select>
            </div>

            {/* Seletor de Modo de Visualização (Densidade) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleChangeViewMode('COMPACT')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  viewMode === 'COMPACT'
                    ? 'bg-white text-pilates-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grade Compacta (4 por linha - cabem muito mais alunos)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Compacto</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeViewMode('LIST')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  viewMode === 'LIST'
                    ? 'bg-white text-pilates-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo Lista / Tabela (Máxima densidade por tela)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeViewMode('CARDS')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  viewMode === 'CARDS'
                    ? 'bg-white text-pilates-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Cards Clínicos Detalhados (Com resumo de anamnese e evolução)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detalhado</span>
              </button>
            </div>
          </div>
        </div>

        {/* Linha de Filtros Rápidos + Selecionar Todos */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Todos ({counts.total})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('STANDARD')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterType === 'STANDARD'
                  ? 'bg-pilates-700 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Particulares ({counts.standard})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('CORPORATE')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterType === 'CORPORATE'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              🏢 Convênios ({counts.corporate})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('PAUSED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterType === 'PAUSED'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50/70 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              ⏸ Pausados ({counts.paused})
            </button>

            {counts.restrictions > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('RESTRICTIONS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterType === 'RESTRICTIONS'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50/70 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                }`}
              >
                🩺 Com Restrição ({counts.restrictions})
              </button>
            )}

            {counts.absent > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('ABSENT')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterType === 'ABSENT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                ⚠️ Ausentes ({counts.absent})
              </button>
            )}

            {counts.blocked > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('BLOCKED')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  filterType === 'BLOCKED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                🔒 Bloqueados ({counts.blocked})
              </button>
            )}
          </div>

          {filteredStudents.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-pilates-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-7 h-7 border-3 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500 mt-2">Carregando alunos...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2.5">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Nenhum aluno encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente outro termo de busca, altere o filtro acima ou cadastre um novo aluno.
          </p>
        </div>
      ) : viewMode === 'LIST' ? (
        /* =====================================================================
           MODO 1: LISTA / TABELA DE ALTA DENSIDADE (15 a 22+ alunos por tela)
           ===================================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pl-3 pr-1 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-3.5 h-3.5 rounded accent-pilates-600 cursor-pointer"
                      title="Selecionar todos"
                    />
                  </th>
                  <th className="py-2.5 px-2.5">Aluno</th>
                  <th className="py-2.5 px-2.5">Plano & Status</th>
                  <th className="py-2.5 px-2.5">Horários Fixos</th>
                  <th className="py-2.5 px-2.5 hidden md:table-cell">Telefone / Bairro</th>
                  <th className="py-2.5 px-2.5 text-right">Mensalidade</th>
                  <th className="py-2.5 pl-2.5 pr-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((student) => {
                  const isPaused = student.isPaused || student.status === 'PAUSED';
                  const isBlocked = student.isBlocked;
                  const restrictionText =
                    student.movementRestrictions || student.restrictions || student.healthNotes || student.injuries;
                  const hasRestrictions = !!restrictionText;
                  const avatar = getStudentAvatar(student);
                  const isSelected = selectedIds.includes(student.id);

                  const hasOverdue5d = student.invoices?.some((inv: any) => {
                    if (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()) {
                      return differenceInDays(new Date(), new Date(inv.dueDate)) >= 5;
                    }
                    return false;
                  });

                  return (
                    <tr
                      key={student.id}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-pilates-50/60 hover:bg-pilates-50'
                          : isBlocked
                          ? 'bg-rose-50/20 hover:bg-rose-50/40'
                          : isPaused
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-2 pl-3 pr-1 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="w-3.5 h-3.5 rounded accent-pilates-600 cursor-pointer"
                        />
                      </td>

                      {/* Aluno + Avatar + Alertas Clínicos */}
                      <td className="py-2 px-2.5 align-middle">
                        <div className="flex items-center space-x-2.5 min-w-[180px] max-w-[280px]">
                          <img
                            src={avatar}
                            alt={student.name}
                            onClick={() => handleOpenEdit(student)}
                            className="w-8 h-8 rounded-xl object-cover border border-pilates-400 shrink-0 bg-slate-100 cursor-pointer"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(student)}
                                className="font-bold text-xs text-slate-900 hover:text-pilates-600 truncate uppercase text-left transition-colors"
                                title="Clique para abrir o prontuário completo"
                              >
                                {getStudentFullName(student)}
                              </button>
                              {student.nickname && (
                                <span className="text-[9px] font-bold bg-pilates-100 text-pilates-800 px-1.5 py-0.2 rounded shrink-0">
                                  {student.nickname.toUpperCase()}
                                </span>
                              )}
                              {hasRestrictions && (
                                <span
                                  className="inline-flex items-center text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded text-[9px] font-bold shrink-0"
                                  title={`Restrição / Anamnese: ${restrictionText}`}
                                >
                                  <HeartPulse className="w-2.5 h-2.5 mr-0.5" />
                                  Restrição
                                </span>
                              )}
                            </div>
                            {hasRestrictions && (
                              <p className="text-[10px] text-rose-700 truncate">
                                {restrictionText}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plano & Status */}
                      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-pilates-800 bg-pilates-50 px-2 py-0.5 rounded-md border border-pilates-200/60">
                            {student.planName}
                          </span>
                          {student.isCorporate && (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                              {student.corporateProvider || 'CONVÊNIO'}
                            </span>
                          )}
                          {isPaused && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">
                              ⏸ Pausado
                            </span>
                          )}
                          {isBlocked && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md">
                              🔒 Bloqueado
                            </span>
                          )}
                          {hasOverdue5d && (
                            <span
                              className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md flex items-center space-x-0.5"
                              title="Fatura vencida há mais de 5 dias"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>&gt;5d</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Horários Fixos */}
                      <td className="py-2 px-2.5 align-middle">
                        {student.schedules && student.schedules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.schedules.map((sch: any) => (
                              <span
                                key={sch.id}
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold"
                              >
                                <span className="font-bold text-pilates-700">{DAY_NAMES[sch.dayOfWeek]}</span>
                                <span>{sch.startTime}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Avulso / Sem fixo</span>
                        )}
                      </td>

                      {/* Contato & Bairro */}
                      <td className="py-2 px-2.5 align-middle hidden md:table-cell">
                        <div className="text-[11px] text-slate-700 font-medium">{student.phone || '—'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                          {student.neighborhood || student.address || student.city || 'São Paulo'}
                        </div>
                      </td>

                      {/* Mensalidade */}
                      <td className="py-2 px-2.5 align-middle text-right whitespace-nowrap">
                        {student.isCorporate ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            {student.corporateProvider === 'TOTALPASS' ? 'TotalPass' : 'Wellhub'}
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-slate-900">
                            R$ {student.monthlyFee !== undefined ? student.monthlyFee.toFixed(2) : '0.00'}
                          </span>
                        )}
                      </td>

                      {/* Ações Rápidas (incluindo Excluir Aluno) */}
                      <td className="py-2 pl-2.5 pr-3.5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end space-x-1">
                          {!student.isCorporate && (
                            <button
                              type="button"
                              onClick={() => handleOpenPix(student)}
                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                              title="Gerar Cobrança PIX"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <a
                            href={`https://wa.me/55${student.phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(getStudentFullName(student))}%2C%20tudo%20bem%3F%20Aqui%20%C3%A9%20do%20Studio%20Pilates.`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          <Link
                            href={`/mensagens?studentId=${student.id}`}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Abrir Chat no Aplicativo"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-600 hover:text-pilates-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar Prontuário / Ficha"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 bg-rose-50/70 rounded-lg transition-colors"
                            title="Excluir Aluno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'COMPACT' ? (
        /* =====================================================================
           MODO 2: GRADE COMPACTA (4 Colunas no Desktop - 12 a 16+ alunos/tela)
           ===================================================================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredStudents.map((student) => {
            const isPaused = student.isPaused || student.status === 'PAUSED';
            const isBlocked = student.isBlocked;
            const restrictionText =
              student.movementRestrictions || student.restrictions || student.healthNotes || student.injuries;
            const hasRestrictions = !!restrictionText;
            const avatar = getStudentAvatar(student);
            const isSelected = selectedIds.includes(student.id);

            const hasOverdue5d = student.invoices?.some((inv: any) => {
              if (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()) {
                return differenceInDays(new Date(), new Date(inv.dueDate)) >= 5;
              }
              return false;
            });

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl border transition-all p-3 flex flex-col justify-between gap-2 shadow-2xs hover:shadow-md ${
                  isSelected
                    ? 'border-pilates-500 ring-2 ring-pilates-100 bg-pilates-50/10'
                    : isBlocked
                    ? 'border-rose-300 bg-rose-50/10'
                    : isPaused
                    ? 'border-amber-300 bg-amber-50/20'
                    : hasOverdue5d
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Topo: Checkbox + Avatar + Nome + Botões Editar e Excluir */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(student.id)}
                        className="w-3.5 h-3.5 rounded accent-pilates-600 cursor-pointer shrink-0"
                        title="Selecionar aluno"
                      />
                      <img
                        src={avatar}
                        alt={student.name}
                        onClick={() => handleOpenEdit(student)}
                        className="w-9 h-9 rounded-xl object-cover border border-pilates-500 shrink-0 bg-slate-100 cursor-pointer"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(student)}
                          className="font-bold text-xs text-slate-900 hover:text-pilates-600 leading-tight truncate block max-w-full uppercase text-left"
                          title={getStudentFullName(student)}
                        >
                          {getStudentFullName(student)}
                        </button>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {student.nickname && (
                            <span className="text-[9px] font-bold bg-pilates-100 text-pilates-800 px-1.5 py-0.2 rounded">
                              {student.nickname.toUpperCase()}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-pilates-800 bg-pilates-50 px-1.5 py-0.2 rounded border border-pilates-200/60">
                            {student.planName}
                          </span>
                          {student.isCorporate && (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                              {student.corporateProvider || 'CONVÊNIO'}
                            </span>
                          )}
                          {isPaused && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Pausado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões rápidos de Prontuário e Exclusão */}
                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(student)}
                        className="p-1.5 text-slate-400 hover:text-pilates-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Abrir Prontuário / Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentToDelete(student)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Aluno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Linha Compacta: Telefone + Bairro + Indicador de Restrição / Inadimplência */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                    <span className="flex items-center space-x-1 truncate">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{student.phone || 'Sem tel.'}</span>
                    </span>
                    <span className="flex items-center space-x-1 truncate text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                      <span className="truncate">{student.neighborhood || student.city || 'SP'}</span>
                    </span>
                  </div>

                  {/* Horários Fixos + Badges Clínicos na mesma área compacta */}
                  <div className="flex items-center justify-between gap-1 flex-wrap pt-1 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {student.schedules && student.schedules.length > 0 ? (
                        student.schedules.map((sch: any) => (
                          <span
                            key={sch.id}
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-medium"
                          >
                            <span className="font-bold text-pilates-700">{DAY_NAMES[sch.dayOfWeek]}</span>
                            <span>{sch.startTime}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem horário fixo</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {hasRestrictions && (
                        <span
                          className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold"
                          title={`Restrições: ${restrictionText}`}
                        >
                          <HeartPulse className="w-2.5 h-2.5 text-rose-600" />
                          <span>Restrição</span>
                        </span>
                      )}
                      {hasOverdue5d && (
                        <span
                          className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold"
                          title="Fatura vencida há mais de 5 dias"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          <span>&gt;5d</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé Compacto: Valor + Ações Rápidas */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {student.isCorporate ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                        {student.corporateProvider === 'TOTALPASS' ? 'TotalPass' : 'Wellhub'}
                      </span>
                    ) : (
                      <span className="text-xs font-extrabold text-slate-900">
                        R$ {student.monthlyFee !== undefined ? student.monthlyFee.toFixed(2) : '0.00'}
                        <span className="text-[10px] font-normal text-slate-400">/mês</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <Link
                      href={`/mensagens?studentId=${student.id}`}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Abrir Chat no App"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Link>

                    <a
                      href={`https://wa.me/55${student.phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(getStudentFullName(student))}%2C%20tudo%20bem%3F%20Aqui%20%C3%A9%20do%20Studio%20Pilates.`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>

                    {!student.isCorporate && (
                      <button
                        type="button"
                        onClick={() => handleOpenPix(student)}
                        className="inline-flex items-center space-x-0.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors"
                        title="Gerar QR Code PIX"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>PIX</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =====================================================================
           MODO 3: CARDS CLÍNICOS DETALHADOS (Com Anamnese, Evolução e Exclusão)
           ===================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStudents.map((student) => {
            const isPaused = student.isPaused || student.status === 'PAUSED';
            const isBlocked = student.isBlocked;
            const hasRestrictions = !!(
              student.movementRestrictions ||
              student.restrictions ||
              student.healthNotes ||
              student.injuries
            );
            const avatar = getStudentAvatar(student);
            const isSelected = selectedIds.includes(student.id);

            const hasOverdue5d = student.invoices?.some((inv: any) => {
              if (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()) {
                return differenceInDays(new Date(), new Date(inv.dueDate)) >= 5;
              }
              return false;
            });

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-pilates-500 ring-2 ring-pilates-100 bg-pilates-50/10'
                    : isBlocked
                    ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/10'
                    : isPaused
                    ? 'border-amber-300 bg-amber-50/20'
                    : hasOverdue5d
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Topo: Foto + Nome + Ações (Editar & Excluir) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(student.id)}
                        className="w-3.5 h-3.5 rounded accent-pilates-600 cursor-pointer shrink-0"
                      />
                      <div
                        onClick={() => handleOpenEdit(student)}
                        className="w-10 h-10 rounded-xl overflow-hidden border-2 border-pilates-500 shrink-0 shadow-2xs bg-slate-100 cursor-pointer"
                      >
                        <img
                          src={avatar}
                          alt={student.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3
                          onClick={() => handleOpenEdit(student)}
                          className="font-bold text-xs text-slate-900 hover:text-pilates-600 leading-tight truncate uppercase cursor-pointer"
                        >
                          {getStudentFullName(student)}
                        </h3>
                        <div className="flex items-center flex-wrap gap-1 mt-1">
                          {student.nickname && (
                            <span className="text-[9px] font-bold bg-pilates-100 text-pilates-800 px-1.5 py-0.2 rounded">
                              {student.nickname.toUpperCase()}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-pilates-800 bg-pilates-50 px-1.5 py-0.2 rounded border border-pilates-200/60">
                            {student.planName}
                          </span>
                          {student.isCorporate && (
                            <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                              {student.corporateProvider || 'CONVÊNIO'}
                            </span>
                          )}
                          {isPaused && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Pausado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(student)}
                        className="p-1.5 text-slate-400 hover:text-pilates-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Abrir Prontuário"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentToDelete(student)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Excluir Aluno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alerta de Inadimplência */}
                  {hasOverdue5d && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-center space-x-1 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Fatura vencida há &gt; 5 dias</span>
                    </div>
                  )}

                  {/* Contato & Endereço */}
                  <div className="mt-2.5 space-y-0.5 text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{student.phone || 'Sem telefone'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {student.cep ? `CEP ${student.cep} • ` : ''}
                        {student.address || student.neighborhood || 'São Paulo'}
                      </span>
                    </div>
                  </div>

                  {/* Horários Fixos */}
                  {student.schedules && student.schedules.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {student.schedules.map((sch: any) => (
                          <span
                            key={sch.id}
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-medium"
                          >
                            <span className="font-bold text-pilates-700">{DAY_NAMES[sch.dayOfWeek]}:</span>
                            <span>{sch.startTime}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ficha de Saúde / Restrições */}
                  {hasRestrictions && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900">
                      <div className="flex items-center space-x-1 font-bold text-rose-800 text-[10px] mb-0.5">
                        <HeartPulse className="w-3 h-3 text-rose-600" />
                        <span>Restrições & Anamnese:</span>
                      </div>
                      <p className="text-[11px] text-rose-950 line-clamp-2">
                        {student.movementRestrictions ||
                          student.restrictions ||
                          student.healthNotes ||
                          student.injuries}
                      </p>
                    </div>
                  )}

                  {/* Última Anotação de Evolução */}
                  {student.evolutions && student.evolutions.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-pilates-50/70 border border-pilates-100 text-xs text-pilates-950">
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
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {student.isCorporate ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        {student.corporateProvider === 'TOTALPASS' ? 'TotalPass' : 'Wellhub'}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-900">
                        R$ {student.monthlyFee !== undefined ? student.monthlyFee.toFixed(2) : '0.00'}/mês
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <Link
                      href={`/mensagens?studentId=${student.id}`}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Abrir Chat no Aplicativo com este Aluno"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Link>

                    <a
                      href={`https://wa.me/55${student.phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(getStudentFullName(student))}%2C%20tudo%20bem%3F%20Aqui%20%C3%A9%20do%20Studio%20Pilates.`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>

                    {!student.isCorporate && (
                      <button
                        type="button"
                        onClick={() => handleOpenPix(student)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-2xs transition-colors"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>PIX</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900">Excluir Aluno</h3>
                <p className="text-xs text-slate-500 truncate">
                  {getStudentFullName(studentToDelete)} • {studentToDelete.planName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Tem certeza que deseja excluir este aluno?</span>
              </div>
              <p className="text-[11px] text-rose-800/90 leading-relaxed">
                Esta ação removerá permanentemente o cadastro de{' '}
                <strong>{getStudentFullName(studentToDelete)}</strong>, liberando seus horários fixos na grade e apagando o histórico de presenças, faturas e evoluções.
              </p>
            </div>

            {/* Opção rápida de apenas Pausar caso o gestor queira preservar o histórico */}
            {!(studentToDelete.isPaused || studentToDelete.status === 'PAUSED') && (
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2">
                <div className="text-[11px] text-amber-900">
                  <span className="font-bold block">Quer manter o histórico clínico?</span>
                  <span>Você pode apenas pausar a matrícula do aluno.</span>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleQuickTogglePause(studentToDelete)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmSingleDelete}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deleting ? 'Excluindo...' : 'Excluir Permanentemente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Lote */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Excluir {selectedIds.length} Aluno(s) Selecionado(s)
                </h3>
                <p className="text-xs text-slate-500">Exclusão definitiva em lote</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Atenção: Ação Irreversível!</span>
              </div>
              <p className="text-[11px] text-rose-800/90 leading-relaxed">
                Os <strong>{selectedIds.length} alunos selecionados</strong> e todos os seus respectivos horários fixos, presenças, faturas e evoluções serão excluídos permanentemente do sistema.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmBulkDelete}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deleting ? 'Excluindo...' : `Sim, Excluir (${selectedIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário & Prontuário */}
      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedStudentForEdit(null);
        }}
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

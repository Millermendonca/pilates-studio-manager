'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  HeartPulse,
  Calendar,
  DollarSign,
  MapPin,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  Camera,
  Upload,
  Search,
  CheckCircle2,
  ShieldAlert,
  Activity,
  PhoneCall,
  FileText,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Zap,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Share2,
  Receipt,
  QrCode,
  Edit3,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { compressStudentPhoto } from '@/lib/imageCompression';
import { fetchAddressByCep } from '@/lib/cep';
import { format } from 'date-fns';
import PixPaymentModal from '@/components/PixPaymentModal';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any | null;
  onSuccess: () => void;
}

import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  getUnifiedTimeSlots,
  getOperatingDaysList,
} from '@/lib/operatingHours';

const DEFAULT_DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' },
];

const DEFAULT_PLANS = [
  { id: '1x', name: '1x por Semana', price: 220.0, weeklyDays: 1, description: '1 aula fixa por semana (4 aulas/mês)' },
  { id: '2x', name: '2x por Semana', price: 340.0, weeklyDays: 2, description: '2 aulas fixas por semana (8 aulas/mês)' },
  { id: '3x', name: '3x por Semana', price: 460.0, weeklyDays: 3, description: '3 aulas fixas por semana (12 aulas/mês)' },
  { id: '4x', name: '4x por Semana', price: 580.0, weeklyDays: 4, description: '4 aulas fixas por semana (16 aulas/mês)' },
  { id: 'livre', name: 'Plano Livre / Diário', price: 750.0, weeklyDays: 6, description: 'Acesso livre / aulas diárias' },
  { id: 'avulsa', name: 'Aula Avulsa / Experimental', price: 85.0, weeklyDays: 0, description: 'Cobrança avulsa por aula avulsa/experimental' },
];

const getPlanLimit = (pName?: string, planList: any[] = DEFAULT_PLANS): number => {
  if (!pName) return 2;
  const found = planList.find((p) => p.name?.toLowerCase() === pName?.toLowerCase());
  if (found && found.weeklyDays !== undefined) return found.weeklyDays;
  const p = pName.toLowerCase();
  if (p.includes('1x')) return 1;
  if (p.includes('2x')) return 2;
  if (p.includes('3x')) return 3;
  if (p.includes('4x')) return 4;
  if (p.includes('livre') || p.includes('diário') || p.includes('diario')) return 6;
  if (p.includes('avulsa') || p.includes('experimental')) return 0;
  if (p.includes('wellhub') || p.includes('totalpass')) return 6;
  return 2;
};

export default function StudentFormModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentFormModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'anamnese' | 'evolution' | 'emergency' | 'schedule' | 'financial'>('personal');
  const [availablePlans, setAvailablePlans] = useState<any[]>(DEFAULT_PLANS);

  // Dados Pessoais & Endereço
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);

  // Foto
  const [photoCompressed, setPhotoCompressed] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plano & Status
  const [planName, setPlanName] = useState('2x por Semana');
  const [monthlyFee, setMonthlyFee] = useState('340.00');
  const [status, setStatus] = useState('ACTIVE');
  const [isCorporate, setIsCorporate] = useState(false);
  const [corporateProvider, setCorporateProvider] = useState('WELLHUB');

  // Contato de Emergência
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');

  // Anamnese & Saúde
  const [medicalHistory, setMedicalHistory] = useState('');
  const [injuries, setInjuries] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [movementRestrictions, setMovementRestrictions] = useState('');
  const [physicalAssessment, setPhysicalAssessment] = useState('');
  const [painLevel, setPainLevel] = useState<number>(0);
  const [goals, setGoals] = useState('');

  // Horários Fixos
  const [schedules, setSchedules] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([
    { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
    { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' },
  ]);
  const [operatingHours, setOperatingHours] = useState<OperatingDayConfig[]>(DEFAULT_OPERATING_HOURS);

  // Evoluções Aula a Aula
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newExercises, setNewExercises] = useState('');
  const [newNotePain, setNewNotePain] = useState(0);
  const [newNoteType, setNewNoteType] = useState('CLASS_NOTE');
  const [savingNote, setSavingNote] = useState(false);

  // Gestão Financeira do Aluno
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedPixInvoice, setSelectedPixInvoice] = useState<any | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);
  const [newInvTitle, setNewInvTitle] = useState('Mensalidade Pilates');
  const [newInvAmount, setNewInvAmount] = useState('340.00');
  const [newInvDueDate, setNewInvDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newInvIsPaid, setNewInvIsPaid] = useState(false);
  const [newInvPaidDate, setNewInvPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);

  // Contrato Digital
  const [contractAccepted, setContractAccepted] = useState(false);

  // Modo de Cadastro: Rápido (Recepção) vs Completo (Prontuário)
  const [regMode, setRegMode] = useState<'QUICK' | 'FULL'>('QUICK');
  const [quickSuccess, setQuickSuccess] = useState<{
    student: any;
    shareLink: string;
    whatsappUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(student && student.id);

  useEffect(() => {
    // Buscar planos e horários de funcionamento do sistema
    const fetchPlansAndSettings = async () => {
      try {
        const [plansRes, settingsRes] = await Promise.all([
          fetch('/api/plans', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);

        if (plansRes.ok) {
          const data = await plansRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setAvailablePlans(
              data.map((p: any) => ({
                ...p,
                price: typeof p.price === 'number' ? p.price : (parseFloat(String(p.price).replace(',', '.')) || 0),
              }))
            );
          }
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData?.plansJson) {
            try {
              const parsedPlans = typeof sData.plansJson === 'string' ? JSON.parse(sData.plansJson) : sData.plansJson;
              if (Array.isArray(parsedPlans) && parsedPlans.length > 0) {
                setAvailablePlans(
                  parsedPlans.map((p: any) => ({
                    ...p,
                    price: typeof p.price === 'number' ? p.price : (parseFloat(String(p.price).replace(',', '.')) || 0),
                  }))
                );
              }
            } catch (e) {}
          }
          if (sData?.operatingHoursJson) {
            try {
              const parsed = JSON.parse(sData.operatingHoursJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setOperatingHours(parsed);
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Erro ao buscar planos ou configurações:', e);
      }
    };
    fetchPlansAndSettings();

    setQuickSuccess(null);
    setCopiedLink(false);
    setError('');

    if (student && student.id) {
      setRegMode('FULL');
      setName(student.name || '');
      setNickname(student.nickname || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setCpf(student.cpf || '');
      setBirthDate(student.birthDate ? format(new Date(student.birthDate), 'yyyy-MM-dd') : '');
      setCep(student.cep || '');
      setAddress(student.address || '');
      setNeighborhood(student.neighborhood || '');
      setCity(student.city || 'São Paulo');
      setState(student.state || 'SP');
      setLatitude(student.latitude ? student.latitude.toString() : '');
      setLongitude(student.longitude ? student.longitude.toString() : '');
      setPhotoCompressed(student.photoCompressed || student.avatarUrl || null);
      
      const initialPlan = student.planName || '2x por Semana';
      setPlanName(initialPlan);
      const matchedPlan = availablePlans.find((p) => p.name?.toLowerCase() === initialPlan.toLowerCase());
      const planPrice = matchedPlan?.price !== undefined ? Number(matchedPlan.price).toFixed(2) : '340.00';
      setMonthlyFee(student.isCorporate ? '0.00' : (student.monthlyFee !== undefined && student.monthlyFee !== null ? student.monthlyFee.toString() : planPrice));
      
      setStatus(student.status || (student.isPaused ? 'PAUSED' : 'ACTIVE'));
      setIsCorporate(!!student.isCorporate);
      setCorporateProvider(student.corporateProvider || 'WELLHUB');
      setEmergencyContactName(student.emergencyContactName || '');
      setEmergencyContactPhone(student.emergencyContactPhone || '');
      setEmergencyContactRelation(student.emergencyContactRelation || '');
      setMedicalHistory(student.medicalHistory || student.healthNotes || '');
      setInjuries(student.injuries || '');
      setSurgeries(student.surgeries || '');
      setMovementRestrictions(student.movementRestrictions || student.restrictions || '');
      setPhysicalAssessment(student.physicalAssessment || '');
      setPainLevel(student.painLevel ?? 0);
      setGoals(student.goals || '');
      setContractAccepted(!!student.contractAccepted);

      if (student.schedules && student.schedules.length > 0) {
        setSchedules(
          student.schedules.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );
      }

      if (student.evolutions) {
        setEvolutions(student.evolutions);
      }

      if (student.invoices) {
        setInvoices(student.invoices);
      }
      fetchStudentInvoices(student.id);
    } else {
      // Reset form para novo aluno (podendo herdar initial presets como horários da grade)
      setRegMode('QUICK');
      setName(student?.name || '');
      setNickname(student?.nickname || '');
      setEmail(student?.email || '');
      setPhone(student?.phone || '');
      setCpf(student?.cpf || '');
      setBirthDate(student?.birthDate ? format(new Date(student.birthDate), 'yyyy-MM-dd') : '');
      setCep(student?.cep || '');
      setAddress(student?.address || '');
      setNeighborhood(student?.neighborhood || '');
      setCity(student?.city || '');
      setState(student?.state || '');
      setLatitude(student?.latitude ? student.latitude.toString() : '');
      setLongitude(student?.longitude ? student.longitude.toString() : '');
      setPhotoCompressed(null);
      
      const initialPlan = student?.planName || '2x por Semana';
      setPlanName(initialPlan);
      const matchedPlan = availablePlans.find((p) => p.name?.toLowerCase() === initialPlan.toLowerCase());
      const planPrice = matchedPlan?.price !== undefined ? Number(matchedPlan.price).toFixed(2) : '340.00';
      setMonthlyFee(student?.isCorporate ? '0.00' : planPrice);
      
      setStatus('ACTIVE');
      setIsCorporate(!!student?.isCorporate);
      setCorporateProvider(student?.corporateProvider || 'WELLHUB');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setEmergencyContactRelation('');
      setMedicalHistory('');
      setInjuries('');
      setSurgeries('');
      setMovementRestrictions('');
      setPhysicalAssessment('');
      setPainLevel(0);
      setGoals('');
      setContractAccepted(false);
      setEvolutions([]);
      setInvoices([]);

      if (student?.schedules && student.schedules.length > 0) {
        setSchedules(student.schedules);
      } else {
        setSchedules([
          { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
          { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' },
        ]);
      }
    }
  }, [student, isOpen]);

  // Buscar Faturas do Aluno em Tempo Real
  const fetchStudentInvoices = async (studentId: string) => {
    if (!studentId) return;
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/invoices?studentId=${studentId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar faturas do aluno:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Criar Nova Fatura / Lançamento Manual para o Aluno
  const handleCreateStudentInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;
    setSavingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          title: newInvTitle,
          amount: parseFloat(newInvAmount),
          dueDate: newInvDueDate,
          status: newInvIsPaid ? 'PAID' : 'PENDING',
          paidAt: newInvIsPaid ? newInvPaidDate : null,
          isRecurring: true,
        }),
      });

      if (res.ok) {
        setNewInvoiceModalOpen(false);
        await fetchStudentInvoices(student.id);
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Erro ao criar fatura');
      }
    } catch (err) {
      console.error('Erro ao criar fatura:', err);
    } finally {
      setSavingInvoice(false);
    }
  };

  // Atualizar Fatura Existente
  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice?.id) return;
    setSavingEditInvoice(true);
    try {
      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingInvoice.title,
          amount: parseFloat(editingInvoice.amount),
          dueDate: editingInvoice.dueDate,
          status: editingInvoice.status,
          paidAt: editingInvoice.status === 'PAID' ? (editingInvoice.paidAt || new Date().toISOString()) : null,
        }),
      });

      if (res.ok) {
        setEditingInvoice(null);
        if (student?.id) await fetchStudentInvoices(student.id);
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Erro ao atualizar fatura');
      }
    } catch (err) {
      console.error('Erro ao atualizar fatura:', err);
    } finally {
      setSavingEditInvoice(false);
    }
  };

  // Alternar Status: Marcar como Pago ou Reverter para Pendente
  const handleToggleInvoiceStatus = async (inv: any) => {
    const isPaid = inv.status === 'PAID';
    const confirmMsg = isPaid
      ? `Deseja reverter a fatura "${inv.title}" de volta para PENDENTE? A data de liquidação será removida.`
      : `Deseja marcar a fatura "${inv.title}" como PAGA agora?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isPaid ? 'PENDING' : 'PAID',
          paidAt: isPaid ? null : new Date().toISOString(),
        }),
      });

      if (res.ok) {
        if (student?.id) await fetchStudentInvoices(student.id);
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Erro ao alterar status da fatura');
      }
    } catch (err) {
      console.error('Erro ao alterar status da fatura:', err);
    }
  };

  // Excluir Fatura (Permitido mesmo se PAGA)
  const handleDeleteInvoice = async (invId: string, invTitle: string) => {
    if (!confirm(`⚠️ Tem certeza que deseja excluir permanentemente a fatura "${invTitle}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${invId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (student?.id) await fetchStudentInvoices(student.id);
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Erro ao excluir fatura');
      }
    } catch (err) {
      console.error('Erro ao excluir fatura:', err);
    }
  };

  // Busca CEP Automática
  const handleCepLookup = async (cepInput: string) => {
    const raw = cepInput.replace(/\D/g, '');
    if (raw.length !== 8) return;

    setCepLoading(true);
    setCepFeedback(null);
    try {
      const data = await fetchAddressByCep(raw);
      if (data) {
        setAddress(data.street);
        setNeighborhood(data.neighborhood);
        setCity(data.city);
        setState(data.state);
        if (data.latitude) setLatitude(data.latitude.toString());
        if (data.longitude) setLongitude(data.longitude.toString());
        setCepFeedback(`✓ Endereço localizado: ${data.city}/${data.state}`);
      }
    } catch (err: any) {
      setCepFeedback(`✕ ${err.message || 'Erro ao buscar CEP'}`);
    } finally {
      setCepLoading(false);
    }
  };

  // Upload e Compactação de Foto
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    try {
      const compressed = await compressStudentPhoto(file, 240, 240, 0.82);
      setPhotoCompressed(compressed);
    } catch (err) {
      console.error('Erro ao compactar foto:', err);
      alert('Erro ao processar a foto. Tente outra imagem.');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Adicionar Anotação de Evolução
  const handleAddEvolutionNote = async () => {
    if (!newNote.trim() || !student?.id) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/students/${student.id}/evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: newNote,
          exercisesPerformed: newExercises,
          painLevel: newNotePain,
          type: newNoteType,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setEvolutions([created, ...evolutions]);
        setNewNote('');
        setNewExercises('');
        setNewNotePain(0);
      }
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
    } finally {
      setSavingNote(false);
    }
  };

  // Salvar Aluno
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const maxAllowedSchedules = getPlanLimit(planName, availablePlans);
      if (schedules.length > maxAllowedSchedules) {
        throw new Error(`⚠️ O plano selecionado '${planName}' permite no máximo ${maxAllowedSchedules} horário(s) semanal(is). Você incluiu ${schedules.length} horários. Remova o excesso antes de salvar.`);
      }

      if (regMode === 'QUICK' && !isEditing) {
        if (!name.trim()) throw new Error('O nome do aluno é obrigatório');
        if (!phone.trim()) throw new Error('O telefone/WhatsApp do aluno é obrigatório');

        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim().toUpperCase(),
            nickname: nickname.trim() ? nickname.trim().toUpperCase() : null,
            phone: phone.trim(),
            email: email.trim() || undefined,
            planName,
            monthlyFee: isCorporate ? 0 : (monthlyFee !== '' && !isNaN(Number(monthlyFee))) ? parseFloat(monthlyFee) : 340.0,
            isCorporate,
            corporateProvider: isCorporate ? corporateProvider : null,
            schedules,
          }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erro ao realizar cadastro rápido');
        }

        const createdStudent = await res.json();
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const cleanPhone = phone.replace(/\D/g, '');
        const shareLink = `${origin}/matricula?phone=${encodeURIComponent(cleanPhone)}`;

        // Buscar template personalizado e nome do estúdio nas configurações
        let template = 'Olá, {NOME}! Seja muito bem-vindo(a) ao {ESTUDIO}! 🧘‍♀️✨\n\nSeu pré-cadastro foi realizado com sucesso. Para completar sua ficha médica, endereço e assinar o contrato digital no celular, acesse o link abaixo:\n{LINK}';
        let studioName = 'Studio Pilates Harmonia';

        try {
          const settingsRes = await fetch('/api/settings');
          if (settingsRes.ok) {
            const sData = await settingsRes.json();
            if (sData.whatsappInviteTemplate) template = sData.whatsappInviteTemplate;
            if (sData.studioName) studioName = sData.studioName;
          }
        } catch (e) {
          console.error('Erro ao buscar template de WhatsApp:', e);
        }

        const formattedMsg = template
          .replace(/{NOME}/g, name.trim().toUpperCase())
          .replace(/{ESTUDIO}/g, studioName)
          .replace(/{LINK}/g, shareLink);

        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;

        setQuickSuccess({
          student: createdStudent,
          shareLink,
          whatsappUrl,
        });
        onSuccess();
        return;
      }

      const payload = {
        name: name.trim().toUpperCase(),
        nickname: nickname.trim() ? nickname.trim().toUpperCase() : null,
        email: email.trim() || null,
        phone: phone.trim(),
        cpf: cpf.trim(),
        birthDate: birthDate || null,
        cep,
        address,
        neighborhood,
        city,
        state,
        latitude,
        longitude,
        photoCompressed,
        planName,
        monthlyFee: isCorporate ? 0 : (monthlyFee !== '' && !isNaN(Number(monthlyFee))) ? parseFloat(monthlyFee) : 340.0,
        status,
        isPaused: status === 'PAUSED',
        isCorporate,
        corporateProvider: isCorporate ? corporateProvider : null,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        medicalHistory,
        injuries,
        surgeries,
        movementRestrictions,
        physicalAssessment,
        painLevel,
        goals,
        contractAccepted,
        schedules,
      };

      const url = isEditing ? `/api/students/${student.id}` : '/api/students';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || (isEditing ? 'Erro ao atualizar dados do aluno' : 'Erro ao salvar aluno'));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header com Avatar/Foto */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="w-12 h-12 rounded-2xl bg-pilates-600/40 border border-pilates-400/40 overflow-hidden flex items-center justify-center text-white">
                {photoCompressed ? (
                  <img src={photoCompressed} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-pilates-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1 bg-pilates-500 hover:bg-pilates-400 text-white rounded-lg shadow-sm text-[10px]"
                title="Trocar Foto"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEditing ? 'Prontuário & Ficha do Aluno' : 'Novo Cadastro de Aluno'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing ? `Editando registro de ${name || student?.name}` : 'Preencha os dados, anamnese e horários fixos'}
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

        {/* Alternador de Modo: Cadastro Rápido vs Completo (somente para novo cadastro) */}
        {!isEditing && (
          <div className="flex-shrink-0 bg-slate-100/90 p-2 border-b border-slate-200 flex justify-center">
            <div className="bg-slate-200/80 p-1 rounded-2xl flex space-x-1.5 w-full max-w-lg">
              <button
                type="button"
                onClick={() => setRegMode('QUICK')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  regMode === 'QUICK'
                    ? 'bg-pilates-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Cadastro Rápido (Recepção)</span>
              </button>

              <button
                type="button"
                onClick={() => setRegMode('FULL')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  regMode === 'FULL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📋 Ficha Completa (Prontuário)</span>
              </button>
            </div>
          </div>
        )}

        {/* Abas de Navegação Fixas (Modo Completo ou Edição) */}
        {(regMode === 'FULL' || isEditing) && (
          <div className="flex-shrink-0 flex border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
            {[
              { id: 'personal', name: '1. Dados & CEP', icon: User },
              { id: 'emergency', name: '2. Emergência', icon: PhoneCall },
              { id: 'anamnese', name: '3. Anamnese & Saúde', icon: HeartPulse, alert: !!movementRestrictions },
              { id: 'evolution', name: '4. Evolução Aula a Aula', icon: Activity, hidden: !isEditing },
              { id: 'schedule', name: '5. Plano & Grade Fixa', icon: Calendar },
              { id: 'financial', name: '6. Histórico Financeiro', icon: DollarSign, hidden: !isEditing },
            ]
              .filter((t) => !t.hidden)
              .map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                      isActive
                        ? 'border-pilates-600 text-pilates-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-pilates-600' : 'text-slate-400'}`} />
                    <span>{tab.name}</span>
                    {tab.alert && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                  </button>
                );
              })}
          </div>
        )}

        {/* Formulário com Corpo Rolável e Footer Fixo */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* ================= MODO CADASTRO RÁPIDO (NOME + WHATSAPP) ================= */}
          {regMode === 'QUICK' && !isEditing && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-gradient-to-r from-pilates-50 to-emerald-50 border border-pilates-200 rounded-2xl space-y-1.5">
                <div className="flex items-center space-x-2 text-pilates-800 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-pilates-600" />
                  <span>Agilidade na Recepção: Cadastre em 10 segundos!</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Informe o <strong>Nome</strong>, o <strong>Apelido (opcional)</strong> e o <strong>WhatsApp</strong> do aluno. O sistema vai gerar um link personalizado para o aluno completar a ficha médica (anamnese), endereço por CEP e assinar o contrato digital no próprio celular dele.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="EX: MARIANA SILVA"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apelido / Nome de Exibição na Agenda <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.toUpperCase())}
                    placeholder="EX: MARI, JOÃO..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {nickname.trim()
                      ? `✓ Na agenda será mostrado: "${nickname.trim().toUpperCase()}"`
                      : 'Quando vazio, a agenda mostrará o primeiro nome apenas.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(22) 99962-3247"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@exemplo.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Plano & Valor Unificado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano Escolhido
                  </label>
                  <select
                    value={planName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      setPlanName(selectedName);
                      if (selectedName.includes('Wellhub') || selectedName.includes('TotalPass')) {
                        setIsCorporate(true);
                        setMonthlyFee('0.00');
                      } else {
                        setIsCorporate(false);
                        const p = availablePlans.find((pl) => pl.name === selectedName);
                        if (p && p.price !== undefined) {
                          setMonthlyFee(Number(p.price).toFixed(2));
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  >
                    {availablePlans.map((pl) => (
                      <option key={pl.id || pl.name} value={pl.name}>
                        {pl.name} (R$ {Number(pl.price).toFixed(2)})
                      </option>
                    ))}
                    <option value="Wellhub (Gympass) / TotalPass">Wellhub (Gympass) / TotalPass (R$ 0,00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor da Mensalidade
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {isCorporate ? 'R$ 0,00' : `R$ ${Number(monthlyFee).toFixed(2)}`}
                    </span>
                    <span className="text-[11px] font-semibold text-pilates-700 bg-pilates-100/70 px-2 py-0.5 rounded-md">
                      {isCorporate ? 'Repasse Convênio' : 'Definido no Plano'}
                    </span>
                  </div>
                  {isCorporate && (
                    <span className="text-[10px] text-purple-700 font-semibold block mt-1">
                      ✓ Isento de mensalidade direta (repasse via convênio)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= MODO FICHA COMPLETA ================= */}
          {/* ABA 1: DADOS PESSOAIS & ENDEREÇO COM CEP */}
          {(regMode === 'FULL' || isEditing) && activeTab === 'personal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="EX: MARIANA SILVA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apelido / Nome de Exibição na Agenda <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.toUpperCase())}
                    placeholder="EX: MARI, JOÃO..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@exemplo.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status da Matrícula
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white"
                  >
                    <option value="ACTIVE">● Ativo (Frequência Regular)</option>
                    <option value="PAUSED">⏸ Pausado (Libera Vaga Fixa)</option>
                    <option value="INACTIVE">✕ Inativo / Desistente</option>
                  </select>
                  {status === 'PAUSED' && (
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      ⚠️ Ao pausar, a vaga fixa na grade será liberada para a fila de espera.
                    </p>
                  )}
                </div>
              </div>

              {/* Seção de Endereço Iniciando por CEP */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-pilates-600" />
                  <span>Endereço Residencial (Inicie pelo CEP)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CEP (8 dígitos)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => {
                          setCep(e.target.value);
                          if (e.target.value.replace(/\D/g, '').length === 8) {
                            handleCepLookup(e.target.value);
                          }
                        }}
                        onBlur={() => handleCepLookup(cep)}
                        placeholder="01310-100"
                        className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCepLookup(cep)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-pilates-600"
                      >
                        {cepLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                    {cepFeedback && (
                      <p className="text-[11px] font-semibold mt-1 text-pilates-700">
                        {cepFeedback}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Logradouro / Rua e Número
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Av. Paulista, 1500"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bela Vista"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="SP"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CONTATO DE EMERGÊNCIA */}
          {activeTab === 'emergency' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start space-x-2.5">
                <PhoneCall className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Contato em Caso de Urgência / Emergência</h4>
                  <p className="text-[11px] text-amber-800">
                    Pessoa autorizada a ser contatada em caso de intercorrências ou mal-estar durante as aulas de Pilates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Contato de Emergência
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo (Marido / Mãe)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone de Emergência
                  </label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="(11) 99999-8888"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grau de Parentesco
                  </label>
                  <input
                    type="text"
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                    placeholder="Cônjuge / Pai / Irmão"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: ANAMNESE DETALHADA & RESTRIÇÕES (CRÍTICO PARA PILATES) */}
          {activeTab === 'anamnese' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">
                  Prontuário Clínico & Segurança: Indique abaixo lesões e restrições de movimento.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-800 mb-1">
                  ⚠️ Restrições de Movimento & Exercícios Contraindicados (Crítico para Pilates)
                </label>
                <textarea
                  rows={2}
                  value={movementRestrictions}
                  onChange={(e) => setMovementRestrictions(e.target.value)}
                  placeholder="Ex: Proibido hiperextensão lombar, evitar rotações bruscas, carga leve em joelho esquerdo..."
                  className="w-full px-3 py-2 border-2 border-rose-300 bg-rose-50/40 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lesões Prévias / Patologias da Coluna
                  </label>
                  <textarea
                    rows={2}
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    placeholder="Ex: Hérnia discal L4-L5, condromalácia patelar grau II, escoliose em S..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cirurgias Anteriores
                  </label>
                  <textarea
                    rows={2}
                    value={surgeries}
                    onChange={(e) => setSurgeries(e.target.value)}
                    placeholder="Ex: Artroscopia de joelho (2022), cesariana..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Histórico Médico Geral & Medicamentos
                </label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Ex: Hipertensão controlada, labirintite..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>

              {/* Escala Visual Analógica de Dor (EVA 0 a 10) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Escala de Dor Atual (0 = Sem Dor, 10 = Dor Extrema):
                  </span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    painLevel > 6 ? 'bg-rose-100 text-rose-700' : painLevel > 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Nível {painLevel} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(parseInt(e.target.value))}
                  className="w-full accent-pilates-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Objetivos Principais no Pilates
                </label>
                <input
                  type="text"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Ex: Reabilitação postural, alívio de dor lombar e tonificação"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ABA 4: EVOLUÇÃO AULA A AULA & HISTÓRICO POSTURAL */}
          {activeTab === 'evolution' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Adicionar Nova Anotação */}
              <div className="p-4 bg-pilates-50/60 border border-pilates-200/80 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-pilates-900 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-pilates-600" />
                  <span>Nova Anotação de Evolução / Aula a Aula</span>
                </h4>

                <div>
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Descreva a evolução do aluno nesta aula, ajustes posturais ou observações..."
                    className="w-full px-3 py-2 border border-pilates-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newExercises}
                      onChange={(e) => setNewExercises(e.target.value)}
                      placeholder="Exercícios executados (Ex: Footwork, Spine Stretch...)"
                      className="w-full px-3 py-1.5 border border-pilates-300 rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 whitespace-nowrap">Dor (0-10):</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newNotePain}
                      onChange={(e) => setNewNotePain(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-pilates-300 rounded-lg text-xs bg-white text-center"
                    />
                    <button
                      type="button"
                      onClick={handleAddEvolutionNote}
                      disabled={savingNote || !newNote.trim()}
                      className="px-4 py-1.5 bg-pilates-600 hover:bg-pilates-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      {savingNote ? 'Salvando...' : 'Registrar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista Cronológica de Evoluções */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700">Histórico de Evolução Registrado</h4>
                {evolutions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    Nenhuma anotação de evolução cadastrada ainda.
                  </p>
                ) : (
                  evolutions.map((ev) => (
                    <div key={ev.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {format(new Date(ev.date), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                          Por: {ev.authorName || 'Instrutor'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{ev.notes}</p>
                      {ev.exercisesPerformed && (
                        <p className="text-[11px] text-pilates-700 font-medium">
                          <strong>Exercícios:</strong> {ev.exercisesPerformed}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 5: PLANO, GRADE FIXA & CONTRATO */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano de Aulas
                  </label>
                  <select
                    value={planName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      setPlanName(selectedName);
                      if (selectedName.includes('Wellhub') || selectedName.includes('TotalPass')) {
                        setIsCorporate(true);
                        setMonthlyFee('0.00');
                      } else {
                        setIsCorporate(false);
                        const p = availablePlans.find((pl) => pl.name === selectedName);
                        if (p && p.price !== undefined) {
                          setMonthlyFee(Number(p.price).toFixed(2));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white font-semibold"
                  >
                    {availablePlans.map((pl) => (
                      <option key={pl.id || pl.name} value={pl.name}>
                        {pl.name} (R$ {Number(pl.price).toFixed(2)})
                      </option>
                    ))}
                    <option value="Wellhub (Gympass) / TotalPass">Wellhub (Gympass) / TotalPass (R$ 0,00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor da Mensalidade
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {isCorporate ? 'R$ 0,00' : `R$ ${Number(monthlyFee).toFixed(2)}`}
                    </span>
                    <span className="text-[11px] font-semibold text-pilates-700 bg-pilates-100/70 px-2 py-0.5 rounded-md">
                      {isCorporate ? 'Repasse Convênio' : 'Definido no Plano'}
                    </span>
                  </div>
                  {isCorporate && (
                    <span className="text-[10px] text-purple-700 font-semibold block mt-1">
                      ✓ Isento de mensalidade direta (repasse via convênio)
                    </span>
                  )}
                </div>
              </div>

              {/* Convênio Corporativo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Convênio Corporativo</h4>
                  <p className="text-[11px] text-slate-500">Wellhub (Gympass) ou TotalPass</p>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="corpCheck"
                    checked={isCorporate}
                    onChange={(e) => {
                      setIsCorporate(e.target.checked);
                      if (e.target.checked) {
                        setMonthlyFee('0.00');
                      }
                    }}
                    className="w-4 h-4 accent-pilates-600 rounded"
                  />
                  {isCorporate && (
                    <select
                      value={corporateProvider}
                      onChange={(e) => setCorporateProvider(e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="WELLHUB">Wellhub</option>
                      <option value="TOTALPASS">TotalPass</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Horários Fixos Semanais com Limite Estrito */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-pilates-600" />
                      <span>Horários Fixos na Grade Semanal</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Limite do plano: <strong>{schedules.length}</strong> de <strong>{getPlanLimit(planName, availablePlans)}</strong> horários
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={schedules.length >= getPlanLimit(planName, availablePlans)}
                    onClick={() => {
                      const limit = getPlanLimit(planName, availablePlans);
                      if (schedules.length < limit) {
                        setSchedules([...schedules, { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }]);
                      }
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-pilates-50 hover:bg-pilates-100 disabled:opacity-40 disabled:cursor-not-allowed text-pilates-700 text-[11px] font-bold rounded-lg border border-pilates-200 transition-colors"
                    title={schedules.length >= getPlanLimit(planName, availablePlans) ? 'Limite de horários do plano atingido' : 'Adicionar mais um horário fixo'}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Horário</span>
                  </button>
                </div>

                {schedules.length >= getPlanLimit(planName, availablePlans) && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Limite do plano <strong>{planName}</strong> atingido ({getPlanLimit(planName, availablePlans)} horário(s) semanal(is)). Para adicionar mais dias, selecione um plano com maior frequência.
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {schedules.map((slot, index) => {
                    const openDaysList = getOperatingDaysList(operatingHours);
                    const dayConfig = operatingHours.find((d) => d.dayOfWeek === slot.dayOfWeek);
                    const slotsForDay = dayConfig && dayConfig.isOpen
                      ? generateSlotsForDay(dayConfig)
                      : getUnifiedTimeSlots(operatingHours);

                    return (
                      <div key={index} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <select
                          value={slot.dayOfWeek}
                          onChange={(e) => {
                            const updated = [...schedules];
                            const newDayOfWeek = parseInt(e.target.value);
                            updated[index].dayOfWeek = newDayOfWeek;
                            const targetDay = operatingHours.find((d) => d.dayOfWeek === newDayOfWeek);
                            const validSlots = targetDay && targetDay.isOpen ? generateSlotsForDay(targetDay) : [];
                            if (validSlots.length > 0 && !validSlots.includes(updated[index].startTime)) {
                              updated[index].startTime = validSlots[0];
                              const hNum = parseInt(validSlots[0].split(':')[0]);
                              updated[index].endTime = `${(hNum + 1).toString().padStart(2, '0')}:00`;
                            }
                            setSchedules(updated);
                          }}
                          className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                        >
                          {openDaysList.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>

                        <select
                          value={slot.startTime}
                          onChange={(e) => {
                            const updated = [...schedules];
                            const start = e.target.value;
                            const hourNum = parseInt(start.split(':')[0]);
                            const end = `${(hourNum + 1).toString().padStart(2, '0')}:00`;
                            updated[index].startTime = start;
                            updated[index].endTime = end;
                            setSchedules(updated);
                          }}
                          className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                        >
                          {slotsForDay.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>

                        <span className="text-xs text-slate-400">até {slot.endTime}</span>

                        <button
                          type="button"
                          onClick={() => setSchedules(schedules.filter((_, i) => i !== index))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aceite de Contrato */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-pilates-600" />
                    <span>Contrato & Termo de Responsabilidade</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {contractAccepted ? '✓ Contrato aceito digitalmente pelo aluno' : 'Pendente de aceite no app/matrícula'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => setContractAccepted(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </div>
            </div>
          )}

          {/* ABA 6: HISTÓRICO FINANCEIRO & PAGAMENTOS */}
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header com Totais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                    <span>Total Pago / Liquidado</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    R$ {invoices.filter((i) => i.status === 'PAID').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {invoices.filter((i) => i.status === 'PAID').length} pagamento(s) confirmado(s)
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                    <span>Total Pendente / Aberto</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-700 mt-1">
                    R$ {invoices.filter((i) => i.status === 'PENDING').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">
                    {invoices.filter((i) => i.status === 'PENDING').length} fatura(s) aguardando
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
                    <span>Plano & Mensalidade</span>
                    <CreditCard className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {isCorporate ? 'R$ 0,00' : `R$ ${Number(monthlyFee).toFixed(2)}`}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium truncate block">
                    {planName} {isCorporate ? `(${corporateProvider})` : '/mês'}
                  </span>
                </div>
              </div>

              {/* Barra de Ações do Histórico */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-pilates-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Histórico de Mensalidades & Cobranças ({invoices.length})
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewInvTitle(`Mensalidade - ${planName || 'Pilates'}`);
                    setNewInvAmount(isCorporate ? '0.00' : Number(monthlyFee).toFixed(2));
                    setNewInvDueDate(format(new Date(), 'yyyy-MM-dd'));
                    setNewInvIsPaid(false);
                    setNewInvPaidDate(format(new Date(), 'yyyy-MM-dd'));
                    setNewInvoiceModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Lançamento / Fatura</span>
                </button>
              </div>

              {/* Tabela de Faturas */}
              {loadingInvoices ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Nenhuma fatura registrada para este aluno.</p>
                  <p className="text-[11px] text-slate-400">Clique no botão acima para gerar uma cobrança PIX ou registrar um pagamento manual.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="px-4 py-2.5">Descrição</th>
                          <th className="px-4 py-2.5">Valor</th>
                          <th className="px-4 py-2.5">Vencimento</th>
                          <th className="px-4 py-2.5">Data / Hora Pagamento</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {invoices.map((inv) => {
                          const isPaid = inv.status === 'PAID';
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-900">{inv.title}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">R$ {inv.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {inv.paidAt ? (
                                  <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{format(new Date(inv.paidAt), "dd/MM/yyyy 'às' HH:mm")}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isPaid ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>PAGO</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3" />
                                    <span>PENDENTE</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  {/* Ver PIX */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPixInvoice({
                                        ...inv,
                                        student: { name, email },
                                      });
                                      setPixModalOpen(true);
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-pilates-50 text-slate-700 hover:text-pilates-700 rounded-lg transition-colors"
                                    title="Ver QR Code PIX"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Alternar Status: Marcar Pago / Reverter p/ Pendente */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInvoiceStatus(inv)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isPaid
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                    }`}
                                    title={isPaid ? 'Reverter para Pendente (Desmarcar Pago)' : 'Marcar como Pago'}
                                  >
                                    {isPaid ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </button>

                                  {/* Editar Fatura */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingInvoice({
                                        id: inv.id,
                                        title: inv.title,
                                        amount: inv.amount.toString(),
                                        dueDate: format(new Date(inv.dueDate), 'yyyy-MM-dd'),
                                        status: inv.status,
                                        paidAt: inv.paidAt ? format(new Date(inv.paidAt), 'yyyy-MM-dd') : '',
                                      });
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                    title="Editar Fatura"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Excluir Fatura (Permitido mesmo se PAGA!) */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInvoice(inv.id, inv.title)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                    title="Excluir Fatura (Mesmo se Paga)"
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
              )}
            </div>
          )}
          </div>

          {/* Footer Fixo de Ações */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pilates-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>
                {student
                  ? 'Salvar Alterações'
                  : regMode === 'QUICK'
                  ? '⚡ Salvar & Gerar Link de WhatsApp'
                  : 'Concluir Cadastro'}
              </span>
            </button>
          </div>
        </form>

        {/* MODAL DE CRIAÇÃO MANUAL DE FATURA */}
        {newInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col my-auto animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Nova Fatura / Lançamento</h3>
                    <p className="text-xs text-emerald-100">Aluno: {name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewInvoiceModalOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStudentInvoice} className="p-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título / Descrição</label>
                  <input
                    type="text"
                    value={newInvTitle}
                    onChange={(e) => setNewInvTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInvAmount}
                      onChange={(e) => setNewInvAmount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento</label>
                    <input
                      type="date"
                      value={newInvDueDate}
                      onChange={(e) => setNewInvDueDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="newInvPaidCheck"
                      checked={newInvIsPaid}
                      onChange={(e) => setNewInvIsPaid(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <label htmlFor="newInvPaidCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Marcar como já PAGO (Lançamento retroativo / dinheiro / cartão)
                    </label>
                  </div>

                  {newInvIsPaid && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data do Pagamento</label>
                      <input
                        type="date"
                        value={newInvPaidDate}
                        onChange={(e) => setNewInvPaidDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setNewInvoiceModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingInvoice}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    {savingInvoice ? 'Salvando...' : 'Salvar Fatura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE FATURA */}
        {editingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col my-auto animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Editar Fatura</h3>
                    <p className="text-xs text-slate-300">Alterar dados do lançamento</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateInvoice} className="p-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título / Descrição</label>
                  <input
                    type="text"
                    value={editingInvoice.title}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, title: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvoice.amount}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento</label>
                    <input
                      type="date"
                      value={editingInvoice.dueDate}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status da Fatura</label>
                  <select
                    value={editingInvoice.status}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50"
                  >
                    <option value="PENDING">PENDENTE (Aguardando Pagamento)</option>
                    <option value="PAID">PAGO (Liquidado)</option>
                    <option value="OVERDUE">ATRASADO</option>
                    <option value="CANCELLED">CANCELADO</option>
                  </select>
                </div>

                {editingInvoice.status === 'PAID' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Pagamento</label>
                    <input
                      type="date"
                      value={editingInvoice.paidAt || format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, paidAt: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditInvoice}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    {savingEditInvoice ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PIX PARA VISUALIZAÇÃO E COPIA E COLA */}
        <PixPaymentModal
          isOpen={pixModalOpen}
          onClose={() => setPixModalOpen(false)}
          invoice={selectedPixInvoice}
          onPaymentConfirmed={() => {
            if (student?.id) fetchStudentInvoices(student.id);
          }}
        />

        {/* MODAL DE SUCESSO DO CADASTRO RÁPIDO COM LINK DE WHATSAPP */}
        {quickSuccess && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-100">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Pré-Cadastro Realizado!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>{quickSuccess.student?.name}</strong> foi registrado(a) com sucesso no plano{' '}
                  <span className="text-pilates-600 font-bold">{quickSuccess.student?.planName}</span>.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-left">
                <label className="block text-[11px] font-bold text-slate-700">
                  Link de Auto-Cadastro do Aluno:
                </label>
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-300">
                  <input
                    type="text"
                    readOnly
                    value={quickSuccess.shareLink}
                    className="w-full text-xs text-slate-600 bg-transparent outline-none font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(quickSuccess.shareLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  O aluno usará este link para preencher o endereço por CEP, anamnese médica e assinar o contrato digital.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={quickSuccess.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>📲 Enviar Convite no WhatsApp do Aluno</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setQuickSuccess(null);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

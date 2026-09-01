'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Smartphone,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Bell,
  HeartPulse,
  Home,
  User,
  CreditCard,
  PlusCircle,
  Copy,
  Check,
  CalendarDays,
  ChevronRight,
  Info,
  CalendarRange,
  Flame,
  CheckCircle,
  MessageSquare,
  Send,
  CheckCheck,
  Star,
  ExternalLink,
  Hourglass,
  AlertTriangle,
  Users,
  Heart,
  X,
  Share2,
  PlusSquare,
  FileText,
} from 'lucide-react';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStudentAvatar } from '@/lib/avatar';
import {
  OperatingDayConfig,
  DEFAULT_OPERATING_HOURS,
  generateSlotsForDay,
  getUnifiedTimeSlots,
  getOperatingDaysList,
  formatStudioOperatingSummary,
} from '@/lib/operatingHours';

const DAY_NAMES = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const QUICK_REPLIES = [
  '🧘‍♀️ Confirmado, estarei aí!',
  '🚗 Vou me atrasar 5 minutinhos',
  '🔄 Gostaria de remarcar minha aula',
  '💳 Já efetuei o pagamento via PIX',
];

const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/sUoFd6YoGGLMLkMi9';
const INSTAGRAM_URL = 'https://instagram.com/pilatescenter';
const WHATSAPP_URL = 'https://wa.me/5522999623247?text=Ol%C3%A1%2C%20Studio%20Pilates%20Center!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida.';

export default function AlunoAppPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentData, setStudentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [studentWaitlists, setStudentWaitlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const operatingHours: OperatingDayConfig[] = useMemo(() => {
    if (settings?.operatingHoursJson) {
      try {
        const parsed = JSON.parse(settings.operatingHoursJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_OPERATING_HOURS;
  }, [settings]);

  const operatingSummary = useMemo(() => {
    return formatStudioOperatingSummary(operatingHours);
  }, [operatingHours]);

  // App Mobile Active Tab
  const [activeTab, setActiveTab] = useState<'home' | 'classes' | 'credits' | 'pix' | 'chat' | 'profile'>('home');

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // GPS Simulation State
  const [simulatedDwell, setSimulatedDwell] = useState(35);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  // Action Feedback & States
  const [actionFeedback, setActionFeedback] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [payingPix, setPayingPix] = useState(false);

  // Modal de Agendamento Avulso / Reposição
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('08:00');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Modal de Remarcação de Aula
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAttendance, setRescheduleAttendance] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [rescheduleTime, setRescheduleTime] = useState('08:00');
  const [rescheduleScope, setRescheduleScope] = useState<'SINGLE' | 'RECURRING_FUTURE'>('SINGLE');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Banco Inter - PIX Automático & Contrato Digital
  const [activatingPixAuto, setActivatingPixAuto] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [acceptingContract, setAcceptingContract] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  // PWA / iOS Install Detection
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      const dismissed = localStorage.getItem('ios_install_guide_dismissed');

      setIsIosDevice(isIos);
      if (isIos && !isStandalone && !dismissed) {
        setShowIosInstallGuide(true);
      }
    }
  }, []);

  // Vagas em Tempo Real por Horário (ex: 7/8 vs 8/8 Lotado)
  const [daySlots, setDaySlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchDaySlots = async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/schedule?date=${dateStr}&view=day`);
      const json = await res.json();
      setDaySlots(json.slots || []);
    } catch (err) {
      console.error('Erro ao buscar slots do dia:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Convênios Corporativos (Wellhub / TotalPass)
  const [corporateTokenInput, setCorporateTokenInput] = useState('');
  const [submittingCorporateToken, setSubmittingCorporateToken] = useState(false);

  const handleSubmitCorporateToken = async () => {
    if (!studentData || !corporateTokenInput.trim()) return;
    setSubmittingCorporateToken(true);

    try {
      const res = await fetch('/api/corporate/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          token: corporateTokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCorporateTokenInput('');
        setActionFeedback({
          success: true,
          message: data.message || 'Check-in enviado com sucesso! Aguardando aprovação.',
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao enviar check-in');
      }
    } catch (err) {
      console.error('Erro ao enviar check-in corporativo:', err);
    } finally {
      setSubmittingCorporateToken(false);
    }
  };

  const loadData = async () => {
    try {
      const [resStudents, resSettings, resAvail] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/settings'),
        fetch('/api/schedule?view=availability'),
      ]);
      const stdData = await resStudents.json();
      const stgData = await resSettings.json();
      const availData = await resAvail.json();

      setStudents(stdData);
      setSettings(stgData);
      setAvailabilityData(availData);

      if (stdData.length > 0) {
        const defaultId = selectedStudentId || stdData[0].id;
        setSelectedStudentId(defaultId);
        await fetchStudentDetail(defaultId);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const [studentRecurringWaitlists, setStudentRecurringWaitlists] = useState<any[]>([]);
  const [recurringWaitlistModalOpen, setRecurringWaitlistModalOpen] = useState(false);
  const [recWaitlistDay, setRecWaitlistDay] = useState(5); // Sexta
  const [recWaitlistTime, setRecWaitlistTime] = useState('18:00');
  const [recWaitlistIsCouple, setRecWaitlistIsCouple] = useState(false);
  const [recWaitlistPartnerId, setRecWaitlistPartnerId] = useState('');
  const [recWaitlistPartnerName, setRecWaitlistPartnerName] = useState('');
  const [recWaitlistLoading, setRecWaitlistLoading] = useState(false);
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);

  const fetchStudentDetail = async (id: string) => {
    try {
      const [resStd, resAvail, resChat, resWaitlist, resRecWaitlist] = await Promise.all([
        fetch(`/api/students/${id}`),
        fetch('/api/schedule?view=availability'),
        fetch(`/api/chat?studentId=${id}`),
        fetch(`/api/waitlist?studentId=${id}`),
        fetch(`/api/waitlist/recurring?studentId=${id}`),
      ]);
      const data = await resStd.json();
      const avail = await resAvail.json();
      const chat = await resChat.json();
      const waitlist = await resWaitlist.json();
      const recWaitlist = await resRecWaitlist.json();

      setStudentData(data);
      setAvailabilityData(avail);
      setChatMessages(chat);
      setStudentWaitlists(Array.isArray(waitlist) ? waitlist : []);
      setStudentRecurringWaitlists(Array.isArray(recWaitlist) ? recWaitlist : []);
      setActionFeedback(null);
      setGpsFeedback(null);
    } catch (err) {
      console.error('Erro ao obter detalhes do aluno:', err);
    }
  };

  // Entrar na Fila de Horário Fixo (com suporte a Casal)
  const handleJoinRecurringWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;
    setRecWaitlistLoading(true);

    try {
      const res = await fetch('/api/waitlist/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          dayOfWeek: recWaitlistDay,
          startTime: recWaitlistTime,
          isCouple: recWaitlistIsCouple,
          partnerStudentId: recWaitlistPartnerId || undefined,
          partnerName: recWaitlistPartnerName || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRecurringWaitlistModalOpen(false);
        setActionFeedback({
          success: true,
          message: data.message || 'Você entrou na fila de espera de horário fixo!',
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao entrar na fila fixa');
      }
    } catch (err) {
      console.error('Erro ao entrar na fila fixa:', err);
    } finally {
      setRecWaitlistLoading(false);
    }
  };

  // Responder Oferta de Horário Fixo (Aceitar ou Recusar/Passar Vez)
  const handleRespondRecurringOffer = async (entryId: string, action: 'ACCEPT' | 'DECLINE') => {
    setRespondingOfferId(entryId);
    try {
      const res = await fetch('/api/waitlist/recurring/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          success: true,
          message: data.message,
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao processar resposta');
      }
    } catch (err) {
      console.error('Erro ao responder oferta:', err);
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Sair da Fila de Horário Fixo
  const handleLeaveRecurringWaitlist = async (waitlistId: string) => {
    try {
      const res = await fetch('/api/waitlist/recurring', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistId }),
      });

      if (res.ok) {
        setActionFeedback({
          success: true,
          message: 'Você saiu da fila de espera de horário fixo.',
        });
        fetchStudentDetail(selectedStudentId);
      }
    } catch (err) {
      console.error('Erro ao sair da fila fixa:', err);
    }
  };

  // Entrar na Fila de Espera
  const handleJoinWaitlist = async (dateToJoin?: string, timeToJoin?: string, creditIdToUse?: string) => {
    if (!studentData) return;
    const targetDate = dateToJoin || bookingDate || rescheduleDate;
    const targetTime = timeToJoin || bookingTime || rescheduleTime;

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          classDate: targetDate,
          startTime: targetTime,
          usedCreditId: creditIdToUse || selectedCreditId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingModalOpen(false);
        setRescheduleModalOpen(false);
        setActionFeedback({
          success: true,
          message: data.message || 'Você entrou na fila de espera com sucesso!',
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao entrar na fila');
      }
    } catch (err) {
      console.error('Erro ao entrar na fila:', err);
    }
  };

  // Sair da Fila de Espera
  const handleLeaveWaitlist = async (waitlistId: string) => {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistId }),
      });

      if (res.ok) {
        setActionFeedback({
          success: true,
          message: 'Você saiu da fila de espera.',
        });
        fetchStudentDetail(selectedStudentId);
      }
    } catch (err) {
      console.error('Erro ao sair da fila:', err);
    }
  };

  // Ativar PIX Automático do Banco Inter
  const handleActivatePixAutomatico = async () => {
    if (!studentData) return;
    setActivatingPixAuto(true);

    try {
      const res = await fetch('/api/inter/pix-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          diaVencimento: 10,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          success: true,
          message: data.mensagem || 'PIX Automático Banco Inter solicitado com sucesso!',
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao ativar PIX Automático');
      }
    } catch (err) {
      console.error('Erro ao ativar PIX Automático:', err);
    } finally {
      setActivatingPixAuto(false);
    }
  };

  // Aceite de Contrato Digital
  const handleAcceptContract = async () => {
    if (!studentData) return;
    setAcceptingContract(true);

    try {
      const res = await fetch(`/api/students/${studentData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAccepted: true,
          contractSignature: signatureName || studentData.name,
        }),
      });

      if (res.ok) {
        setContractModalOpen(false);
        setActionFeedback({
          success: true,
          message: 'Termos e contrato aceitos digitalmente com sucesso!',
        });
        fetchStudentDetail(selectedStudentId);
      }
    } catch (err) {
      console.error('Erro ao aceitar contrato:', err);
    } finally {
      setAcceptingContract(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (bookingModalOpen) {
      fetchDaySlots(bookingDate);
    }
  }, [bookingDate, bookingModalOpen]);

  useEffect(() => {
    if (rescheduleModalOpen) {
      fetchDaySlots(rescheduleDate);
    }
  }, [rescheduleDate, rescheduleModalOpen]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    fetchStudentDetail(id);
  };

  // Enviar Mensagem do Aluno no Chat
  const handleSendStudentMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatInput.trim();
    if (!textToSend || !studentData) return;

    setSendingChat(true);
    setChatInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          sender: 'STUDENT',
          message: textToSend,
          messageType: 'TEXT',
        }),
      });

      if (res.ok) {
        const resChat = await fetch(`/api/chat?studentId=${studentData.id}`);
        const chat = await resChat.json();
        setChatMessages(chat);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem do aluno:', err);
    } finally {
      setSendingChat(false);
    }
  };

  // Desmarcar aula
  const handleCancelClass = async (attendanceId: string) => {
    try {
      const res = await fetch('/api/attendance/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          reason: 'Cancelamento solicitado pelo app do aluno',
        }),
      });
      const data = await res.json();
      setActionFeedback(data);
      fetchStudentDetail(selectedStudentId);
    } catch (err) {
      console.error('Erro ao cancelar aula:', err);
    }
  };

  // Abrir Modal de Remarcação (Avulsa ou Permanente)
  const handleOpenReschedule = (att?: any, forcePermanent = false) => {
    if (att) {
      setRescheduleAttendance(att);
      setRescheduleDate(format(addDays(new Date(att.classDate), 1), 'yyyy-MM-dd'));
      setRescheduleTime(att.startTime || '08:00');
    } else {
      setRescheduleAttendance({
        id: '',
        classDate: new Date(),
        startTime: '08:00',
      });
      setRescheduleDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      setRescheduleTime('08:00');
    }
    setRescheduleScope(forcePermanent ? 'RECURRING_FUTURE' : 'SINGLE');
    setRescheduleModalOpen(true);
  };

  // Executar Remarcação de Aula
  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    setRescheduleLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          attendanceId: rescheduleAttendance?.id || undefined,
          currentDate: rescheduleAttendance?.classDate
            ? format(new Date(rescheduleAttendance.classDate), 'yyyy-MM-dd')
            : undefined,
          newDate: rescheduleDate,
          newStartTime: rescheduleTime,
          scope: rescheduleScope,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRescheduleModalOpen(false);
        setActionFeedback({
          success: true,
          message:
            rescheduleScope === 'RECURRING_FUTURE'
              ? `Horário fixo alterado com sucesso para ${rescheduleTime}! Todas as semanas futuras foram atualizadas.`
              : data.message || `Aula remarcada com sucesso para ${format(new Date(rescheduleDate), 'dd/MM/yyyy')} às ${rescheduleTime}!`,
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao remarcar aula');
      }
    } catch (err) {
      console.error('Erro ao remarcar aula:', err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Selecionar sugestão inteligente de horário permanente
  const handleSelectSuggestedSlot = (suggestion: any) => {
    const targetDayOfWeek = suggestion.days[0];
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    let diff = targetDayOfWeek - currentDayOfWeek;
    if (diff <= 0) diff += 7;
    const nextDate = addDays(today, diff);

    setRescheduleDate(format(nextDate, 'yyyy-MM-dd'));
    setRescheduleTime(suggestion.time);
    setRescheduleScope('RECURRING_FUTURE');
  };

  // Pagar Fatura PIX via Simulação de Webhook
  const handlePayInvoice = async (invoiceId: string) => {
    setPayingPix(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionFeedback({
          success: true,
          message: 'Pagamento PIX liquidado e confirmado instantaneamente!',
        });
        fetchStudentDetail(selectedStudentId);
      }
    } catch (err) {
      console.error('Erro ao liquidar fatura:', err);
    } finally {
      setPayingPix(false);
    }
  };

  // Abrir Modal de Agendamento (com ou sem crédito)
  const handleOpenBookingModal = (creditId?: string) => {
    setSelectedCreditId(creditId || null);
    setBookingDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setBookingTime('08:00');
    setBookingModalOpen(true);
  };

  // Agendar Aula Avulsa / Reposição
  const handleBookClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    setBookingLoading(true);
    try {
      const isRep = !!selectedCreditId;
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          classDate: bookingDate,
          startTime: bookingTime,
          isReplacement: isRep,
          usedCreditId: selectedCreditId || undefined,
          notes: isRep
            ? 'Reposição com crédito agendada via app'
            : studentData.isCorporate
            ? `Aula agendada via convênio ${studentData.corporateProvider || 'Wellhub/TotalPass'}`
            : 'Aula avulsa agendada via app do aluno',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingModalOpen(false);
        setActionFeedback({
          success: true,
          message: isRep
            ? `Aula de reposição agendada para ${format(new Date(bookingDate), 'dd/MM/yyyy')} às ${bookingTime}!`
            : `Aula avulsa confirmada para ${format(new Date(bookingDate), 'dd/MM/yyyy')} às ${bookingTime}!`,
        });
        fetchStudentDetail(selectedStudentId);
      } else {
        alert(data.error || 'Erro ao agendar aula');
      }
    } catch (err) {
      console.error('Erro ao agendar aula:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  // Simular Ping de GPS com permanência
  const handleSendGpsPing = async () => {
    if (!studentData) return;
    setGpsLoading(true);
    setGpsFeedback(null);

    try {
      const studioLat = settings?.latitude || -23.561684;
      const studioLng = settings?.longitude || -46.655981;

      const res = await fetch('/api/geo/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          latitude: studioLat + 0.0001,
          longitude: studioLng + 0.0001,
          simulatedDwellMinutes: simulatedDwell,
        }),
      });

      const data = await res.json();
      setGpsFeedback(data.message);
      fetchStudentDetail(selectedStudentId);
    } catch (err) {
      console.error('Erro no ping de GPS:', err);
    } finally {
      setGpsLoading(false);
    }
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const nextAttendance = studentData?.attendances?.find(
    (a: any) =>
      a.status === 'SCHEDULED' ||
      a.status === 'CONFIRMED_GPS' ||
      a.status === 'CONFIRMED_MANUAL'
  );

  const activeCredits = studentData?.credits?.filter((c: any) => !c.used) || [];
  const pendingInvoices = studentData?.invoices?.filter((i: any) => i.status === 'PENDING') || [];
  const recurringSchedules = studentData?.schedules || [];

  const suggestions2x = availabilityData?.suggestions?.twoTimesWeek || [];
  const suggestions3x = availabilityData?.suggestions?.threeTimesWeek || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Seletor de Aluno */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider mb-0.5">
            <Smartphone className="w-4 h-4" />
            <span>Studio Pilates Center • App do Aluno</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Aplicativo Mobile do Aluno (Simulador)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Com avaliação 5 estrelas no Google Maps, botão de WhatsApp direto e perfil oficial do Instagram.
          </p>
        </div>

        {/* Seletor de Aluno */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600">Simular como:</span>
          <select
            value={selectedStudentId}
            onChange={(e) => handleSelectStudent(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.planName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Smartphone Mockup no centro e Painel de Testes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Mockup do Smartphone (Coluna 5) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[370px] bg-slate-950 p-3.5 rounded-[44px] shadow-2xl border-4 border-slate-800">
            {/* Top Bar / Notch */}
            <div className="w-32 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-slate-950 rounded-full"></div>
            </div>

            {/* Tela Interna do Smartphone */}
            <div className="bg-slate-50 rounded-[32px] overflow-hidden h-[640px] flex flex-col justify-between text-slate-900 shadow-inner">
              {/* Header do App Mobile */}
              <div className="bg-gradient-to-r from-pilates-700 via-pilates-800 to-slate-900 text-white p-4 pt-3 shadow-md shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 shrink-0 bg-white">
                      <img
                        src={getStudentAvatar(studentData)}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-pilates-200 uppercase font-semibold">Olá,</span>
                      <h3 className="font-bold text-xs leading-tight truncate max-w-[170px]">{studentData?.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white relative transition-colors"
                    title="Abrir Chat & Notificações"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {chatMessages.length > 0 && (
                      <span className="w-2 h-2 bg-emerald-400 rounded-full absolute top-1.5 right-1.5"></span>
                    )}
                  </button>
                </div>

                <div className="mt-2.5 bg-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] backdrop-blur">
                  <span>Plano: <strong>{studentData?.planName}</strong></span>
                  {studentData?.isCorporate ? (
                    <span className="bg-purple-500 text-[10px] font-black px-2 py-0.5 rounded-full text-white">
                      {studentData.corporateProvider || 'CONVÊNIO'}
                    </span>
                  ) : (
                    <span className="bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">Ativo</span>
                  )}
                </div>
              </div>

              {/* Corpo da Tela Conforme a Aba Ativa */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto min-h-0">
                {/* Feedback de Ação */}
                {actionFeedback && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-semibold space-y-1 animate-in fade-in duration-200 ${
                      actionFeedback.qualifiesForCredit || actionFeedback.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <div className="flex items-start space-x-1.5">
                      {actionFeedback.qualifiesForCredit || actionFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span>{actionFeedback.message}</span>
                    </div>
                  </div>
                )}

                {/* ABA 1: INÍCIO */}
                {activeTab === 'home' && (
                  <div className="space-y-3">
                    {/* BANNER DE INSTALAÇÃO NO IPHONE / PWA */}
                    {showIosInstallGuide && (
                      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 rounded-2xl border border-indigo-400/40 shadow-sm relative animate-in fade-in duration-200">
                        <button
                          onClick={() => {
                            setShowIosInstallGuide(false);
                            localStorage.setItem('ios_install_guide_dismissed', 'true');
                          }}
                          className="absolute top-2 right-2 text-slate-400 hover:text-white p-1"
                          title="Dispensar aviso"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-start space-x-2.5 pr-4">
                          <div className="p-2 rounded-xl bg-indigo-600/50 text-indigo-300 shrink-0 mt-0.5">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="space-y-1 text-slate-200">
                            <h4 className="font-bold text-[11px] text-white flex items-center space-x-1">
                              <span>📲 Instalar no seu iPhone</span>
                            </h4>
                            <p className="text-[10px] text-slate-300 leading-tight">
                              Para abrir como aplicativo direto na tela de início:
                            </p>
                            <div className="flex flex-col gap-1 pt-1 text-[10px]">
                              <span className="inline-flex items-center space-x-1 bg-white/10 px-2 py-0.5 rounded-lg text-indigo-200">
                                <span>1. Toque em</span>
                                <Share2 className="w-3 h-3 text-white inline" />
                                <span><strong>Compartilhar</strong> no Safari</span>
                              </span>
                              <span className="inline-flex items-center space-x-1 bg-indigo-600/70 px-2 py-0.5 rounded-lg text-white font-semibold">
                                <span>2. Selecione</span>
                                <PlusSquare className="w-3 h-3 text-white inline" />
                                <span><strong>"Adicionar à Tela de Início"</strong></span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* ================= ALERTA DE BLOQUEIO POR FALTA NO CONVÊNIO ================= */}
                    {studentData?.isBlocked && (
                      <div className="bg-rose-50 border-2 border-rose-400 p-3.5 rounded-2xl space-y-2.5 shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center space-x-1.5 text-rose-900 font-black text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Agendamentos Temporariamente Bloqueados</span>
                        </div>

                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          Identificamos uma <strong>falta sem cancelamento prévio de 2h</strong> no seu plano {studentData.corporateProvider || 'Wellhub/TotalPass'}.
                        </p>

                        {studentData.pendingCheckinStatus === 'SUBMITTED_FOR_REVIEW' ? (
                          <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl text-[11px] text-amber-950 font-medium space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span>⏳ Check-in em Análise:</span>
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-amber-900 border border-amber-300">
                                {studentData.pendingCheckinToken}
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-800">
                              Aguardando a recepção do estúdio confirmar o check-in na plataforma para liberação.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <label className="block text-[11px] font-bold text-rose-900">
                              Faça o check-in no app {studentData.corporateProvider || 'Wellhub/TotalPass'} e insira o código aqui:
                            </label>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                placeholder="Ex: TP-849201"
                                value={corporateTokenInput}
                                onChange={(e) => setCorporateTokenInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-rose-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                              <button
                                onClick={handleSubmitCorporateToken}
                                disabled={submittingCorporateToken || !corporateTokenInput.trim()}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-colors"
                              >
                                {submittingCorporateToken ? '...' : 'Enviar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ================= OFERTA DE HORÁRIO FIXO DISPONÍVEL (CONFIRMAÇÃO PRÉVIA) ================= */}
                    {studentRecurringWaitlists.filter((w) => w.status === 'OFFERED').map((offer) => (
                      <div
                        key={offer.id}
                        className="bg-emerald-500/15 border-2 border-emerald-500 p-3.5 rounded-2xl space-y-2.5 shadow-sm animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Vaga Fixa Liberada para Você!</span>
                          </span>
                          <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            {offer.isCouple ? '👫 Vaga em Dupla' : '1 Vaga'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-xs text-emerald-950">
                            Toda {offer.dayName} às {offer.startTime}
                          </h4>
                          <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                            {offer.isCouple
                              ? `Surgiram 2 vagas juntas para você e ${offer.partnerName || 'sua parceria'}! Desejam assumir este horário semanal definitivo?`
                              : 'Uma vaga fixa permanente abriu para você! Deseja confirmar a troca definitiva do seu horário padrão?'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleRespondRecurringOffer(offer.id, 'ACCEPT')}
                            disabled={respondingOfferId === offer.id}
                            className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{respondingOfferId === offer.id ? 'Salvando...' : 'Aceitar Troca Definitiva'}</span>
                          </button>

                          <button
                            onClick={() => handleRespondRecurringOffer(offer.id, 'DECLINE')}
                            disabled={respondingOfferId === offer.id}
                            className="py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition-all"
                          >
                            <span>Não Quero (Passar a Vez)</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* ================= FILA DE HORÁRIOS FIXOS RECURRENTES ATIVA ================= */}
                    {studentRecurringWaitlists.filter((w) => w.status === 'WAITING').map((w) => (
                      <div key={w.id} className="bg-indigo-50 border-2 border-indigo-300 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-1">
                            <Hourglass className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Fila de Horário Fixo Permanente</span>
                          </span>
                          <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                            {w.position}º lugar
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-indigo-950 flex items-center space-x-1.5">
                            <span>Toda {w.dayName} às {w.startTime}</span>
                            {w.isCouple && (
                              <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-bold">
                                👫 Casal / Dupla
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-indigo-900 mt-0.5 leading-relaxed">
                            {w.isCouple
                              ? `Aguardando 2 vagas juntas para você e ${w.partnerName || 'sua parceria'}. Você será consultado(a) antes de concluir a troca.`
                              : 'Você receberá uma notificação para confirmar a troca assim que uma vaga definitiva abrir.'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleLeaveRecurringWaitlist(w.id)}
                          className="w-full py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition-colors"
                        >
                          Sair da Fila de Horário Fixo
                        </button>
                      </div>
                    ))}

                    {/* Card de Horário Fixo Semanal com Botões de Troca e Fila */}
                    <div className="bg-gradient-to-br from-slate-900 to-pilates-950 text-white rounded-2xl p-3.5 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-pilates-300 uppercase tracking-wider">
                          Seu Horário Fixo Padrão
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Recorrente
                        </span>
                      </div>

                      {recurringSchedules.length > 0 ? (
                        <div className="space-y-1">
                          {recurringSchedules.map((sc: any) => (
                            <div key={sc.id} className="flex items-center justify-between text-xs">
                              <span className="font-semibold">{DAY_NAMES[sc.dayOfWeek] || 'Dia'}s</span>
                              <span className="font-mono text-pilates-200 font-bold">{sc.startTime} às {sc.endTime}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300">Nenhum horário fixo configurado.</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleOpenReschedule(undefined, true)}
                          className="py-1.5 bg-pilates-600 hover:bg-pilates-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center space-x-1.5"
                        >
                          <CalendarRange className="w-3.5 h-3.5" />
                          <span>Trocar Horário</span>
                        </button>

                        <button
                          onClick={() => {
                            setRecWaitlistDay(5);
                            setRecWaitlistTime('18:00');
                            setRecWaitlistIsCouple(false);
                            setRecurringWaitlistModalOpen(true);
                          }}
                          className="py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center justify-center space-x-1.5"
                        >
                          <Hourglass className="w-3.5 h-3.5 text-amber-300" />
                          <span>Fila de Horário Fixo</span>
                        </button>
                      </div>
                    </div>

                    {/* Próxima Aula Card com DOIS BOTÕES: Desmarcar e Remarcar */}
                    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Sua Próxima Aula
                        </span>
                        <span className="text-[10px] font-bold text-pilates-700 bg-pilates-50 px-2 py-0.5 rounded-md">
                          Studio Pilates Center
                        </span>
                      </div>

                      {nextAttendance ? (
                        <div>
                          <div className="flex items-center space-x-2 text-slate-800 text-xs font-bold capitalize">
                            <Calendar className="w-3.5 h-3.5 text-pilates-600" />
                            <span>
                              {format(new Date(nextAttendance.classDate), "EEEE, dd 'de' MMMM", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-600 text-xs mt-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-pilates-600" />
                            <span>
                              {nextAttendance.startTime} às {nextAttendance.endTime}
                            </span>
                          </div>

                          {/* Status de Presença ou BOTÕES DUPLOS (Desmarcar & Remarcar) */}
                          <div className="mt-2.5">
                            {nextAttendance.status === 'CONFIRMED_GPS' ? (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center space-x-1.5">
                                <span>📡 Presença Confirmada por GPS!</span>
                              </div>
                            ) : nextAttendance.status === 'CONFIRMED_MANUAL' ? (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Presença Confirmada em Sala</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  onClick={() => handleCancelClass(nextAttendance.id)}
                                  className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-xl border border-rose-200 transition-colors text-center"
                                >
                                  🔴 Desmarcar
                                </button>
                                <button
                                  onClick={() => handleOpenReschedule(nextAttendance, false)}
                                  className="py-2 px-2 bg-pilates-600 hover:bg-pilates-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-colors text-center flex items-center justify-center space-x-1"
                                >
                                  <CalendarRange className="w-3.5 h-3.5" />
                                  <span>Remarcar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhuma aula agendada para hoje.</p>
                      )}
                    </div>

                    {/* ================= CARD DE FILA DE ESPERA ATIVA ================= */}
                    {studentWaitlists.length > 0 && (
                      <div className="space-y-2">
                        {studentWaitlists.map((w: any) => (
                          <div
                            key={w.id}
                            className="bg-amber-500/10 border-2 border-amber-400 p-3.5 rounded-2xl space-y-2 animate-in fade-in duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1">
                                <Hourglass className="w-3.5 h-3.5 text-amber-600" />
                                <span>Fila de Espera Ativa</span>
                              </span>
                              <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                                {w.position}º da fila
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-amber-950">
                                {format(new Date(w.classDate), "EEEE, dd 'de' MMMM", { locale: ptBR })} às {w.startTime}
                              </h4>
                              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                Você está aguardando uma vaga ({w.totalInQueue} pessoas na fila). <strong>Se algum aluno desmarcar, você entrará automaticamente!</strong>
                              </p>
                            </div>

                            <button
                              onClick={() => handleLeaveWaitlist(w.id)}
                              className="w-full py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-[11px] font-bold transition-colors"
                            >
                              Sair da Fila de Espera
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ================= CARD DE AVALIAÇÃO NO GOOGLE MAPS ================= */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-200 p-3.5 rounded-2xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                          Sua Opinião Vale Muito!
                        </span>
                        <div className="flex items-center space-x-0.5 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                        </div>
                      </div>

                      <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                        Gostando das aulas? Deixe sua avaliação <strong>5 estrelas no Google Maps</strong> e ajude mais pessoas a conhecerem nosso espaço!
                      </p>

                      <a
                        href={GOOGLE_REVIEW_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        <span>Avaliar no Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* ================= BOTOES INSTAGRAM E WHATSAPP ================= */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botão Instagram */}
                      <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 shadow-sm hover:opacity-90 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        <span>@pilatescenter</span>
                      </a>

                      {/* Botão WhatsApp */}
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* ABA 2: MINHAS AULAS */}
                {activeTab === 'classes' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Histórico e Próximas Aulas
                      </h4>
                      <button
                        onClick={() => handleOpenBookingModal()}
                        className="px-3 py-1.5 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Marcar Aula Avulsa</span>
                      </button>
                    </div>

                    {studentData?.attendances?.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Nenhuma aula registrada.</p>
                    ) : (
                      <div className="space-y-2">
                        {studentData.attendances.map((att: any) => {
                          const isGPS = att.status === 'CONFIRMED_GPS';
                          const isManual = att.status === 'CONFIRMED_MANUAL';
                          const isCancelled = att.status.includes('CANCELLED');

                          return (
                            <div
                              key={att.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800">
                                  {format(new Date(att.classDate), 'dd/MM/yyyy')}
                                </span>
                                <span className="font-semibold text-slate-600">
                                  {att.startTime} às {att.endTime}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <div>
                                  {isGPS ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                      📡 GPS Confirmado
                                    </span>
                                  ) : isManual ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                      ✅ Presente
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                      Cancelada
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-pilates-700 bg-pilates-50 px-2 py-0.5 rounded-md">
                                      Agendada
                                    </span>
                                  )}
                                </div>

                                {att.status === 'SCHEDULED' && (
                                  <div className="flex items-center space-x-2.5">
                                    <button
                                      onClick={() => handleCancelClass(att.id)}
                                      className="text-[10px] font-bold text-rose-600 hover:underline"
                                    >
                                      Desmarcar
                                    </button>
                                    <button
                                      onClick={() => handleOpenReschedule(att, false)}
                                      className="text-[10px] font-bold text-pilates-600 hover:underline flex items-center space-x-0.5"
                                    >
                                      <CalendarRange className="w-3 h-3" />
                                      <span>Remarcar</span>
                                    </button>
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

                {/* ABA 3: CRÉDITOS */}
                {activeTab === 'credits' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Créditos de Reposição
                      </h4>
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {activeCredits.length} ativo(s)
                      </span>
                    </div>

                    {activeCredits.length === 0 ? (
                      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">Nenhum crédito disponível</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeCredits.map((credit: any) => (
                          <div
                            key={credit.id}
                            className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-purple-900">1 Aula de Reposição</span>
                              <span className="text-[10px] font-bold bg-white text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                Expira em {differenceInDays(new Date(credit.expiresAt), new Date())} dias
                              </span>
                            </div>
                            <p className="text-[10px] text-purple-700">{credit.originReason}</p>

                            <button
                              onClick={() => {
                                setSelectedCreditId(credit.id);
                                setBookingModalOpen(true);
                              }}
                              className="w-full py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                            >
                              Agendar Reposição Agora
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 4: PIX */}
                {activeTab === 'pix' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        {studentData?.isCorporate ? 'Convênio Corporativo' : 'Pagamento PIX da Mensalidade'}
                      </h4>
                    </div>

                    {/* Banner de Aceite de Contrato Digital */}
                    {studentData && !studentData.contractAccepted && (
                      <div className="p-3.5 bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 text-white rounded-2xl shadow-sm flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center space-x-2.5">
                          <FileText className="w-5 h-5 text-purple-300 shrink-0" />
                          <div>
                            <h4 className="font-bold text-xs">Contrato do Estúdio</h4>
                            <p className="text-[10px] text-purple-200">Leia e dê o aceite digital nos termos de responsabilidade.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setContractModalOpen(true)}
                          className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-950 font-bold text-[11px] rounded-xl shadow-xs shrink-0 transition-colors"
                        >
                          Ler & Assinar
                        </button>
                      </div>
                    )}

                    {/* Card PIX Automático do Banco Inter */}
                    {!studentData?.isCorporate && (
                      <div className="p-4 bg-gradient-to-br from-slate-900 via-pilates-950 to-slate-900 text-white rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold">PIX Automático Banco Inter</span>
                          </div>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              studentData?.interPixAutomaticoStatus === 'ATIVO'
                                ? 'bg-emerald-400 text-emerald-950'
                                : 'bg-amber-400 text-amber-950'
                            }`}
                          >
                            {studentData?.interPixAutomaticoStatus === 'ATIVO'
                              ? '● RECORRÊNCIA ATIVA'
                              : 'RECORRÊNCIA DISPONÍVEL'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {studentData?.interPixAutomaticoStatus === 'ATIVO'
                            ? `Seu plano (R$ ${studentData.monthlyFee.toFixed(2)}/mês) é debitado automaticamente via Banco Inter sem necessidade de escanear QR Code todo mês.`
                            : 'Ative a recorrência automática para debitar sua mensalidade todo mês sem risco de esquecimento ou perda de vaga fixa.'}
                        </p>

                        {studentData?.interPixAutomaticoStatus !== 'ATIVO' && (
                          <button
                            onClick={handleActivatePixAutomatico}
                            disabled={activatingPixAuto}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all"
                          >
                            {activatingPixAuto ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Ativar PIX Automático (Banco Inter)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {studentData?.isCorporate ? (
                      <div className="p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-purple-900 font-bold text-xs">
                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                            <span>{studentData.corporateProvider || 'Wellhub / TotalPass'} Ativo</span>
                          </div>
                          <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            Sem Mensalidade Studio
                          </span>
                        </div>

                        <p className="text-[11px] text-purple-950 font-medium leading-relaxed">
                          Sua assinatura de Pilates é gerenciada e liquidada diretamente pela sua empresa/aplicativo corporativo.
                        </p>

                        <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Regra de Faltas & Check-in:</span>
                          <p className="text-[11px] text-slate-700">
                            Para manter suas aulas liberadas, desmarque com pelo menos <strong>2h de antecedência</strong> ou realize o check-in no seu app em caso de imprevisto.
                          </p>
                        </div>
                      </div>
                    ) : (
                      studentData?.invoices?.map((inv: any) => {
                      const isPaid = inv.status === 'PAID';
                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-bold text-xs text-slate-900">{inv.title}</h5>
                              <span className="text-[10px] text-slate-400">
                                Vencimento: {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isPaid ? 'PAGO' : 'EM ABERTO'}
                            </span>
                          </div>

                          <div className="text-xl font-black text-slate-900">
                            R$ {inv.amount.toFixed(2)}
                          </div>

                          {!isPaid && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => copyPixCode(inv.pixCopiaECola || '00020126580014br.gov.bcb.pix')}
                                className="w-full py-2 bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs"
                              >
                                {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedPix ? 'Código PIX Copiado!' : 'Copiar Código PIX'}</span>
                              </button>

                              <button
                                onClick={() => handlePayInvoice(inv.id)}
                                disabled={payingPix}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Simular Pagamento Instantâneo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                )}

                {/* ABA 5: CHAT & NOTIFICAÇÕES (WhatsApp Style) */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full space-y-2 -m-3.5 p-3 bg-[#efeae2]/30">
                    <div className="flex-1 overflow-y-auto space-y-2.5 p-1 pr-2 min-h-0">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs bg-white/80 rounded-2xl p-4 border border-slate-200">
                          Nenhuma mensagem ainda. Envie uma resposta rápida abaixo!
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isStudent = msg.sender === 'STUDENT';
                          const isSystem = msg.sender === 'SYSTEM';

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-2.5 text-[11px] shadow-2xs relative ${
                                  isStudent
                                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200'
                                    : isSystem
                                    ? 'bg-slate-900 text-white rounded-tl-none'
                                    : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                                }`}
                              >
                                {isSystem && (
                                  <div className="text-[9px] font-bold text-amber-300 mb-1 flex items-center space-x-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Notificação Automática</span>
                                  </div>
                                )}

                                <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>

                                <div
                                  className={`text-[8px] text-right mt-1 flex items-center justify-end space-x-1 ${
                                    isSystem ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                >
                                  <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                  {isStudent && <CheckCheck className="w-3 h-3 text-sky-500" />}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Respostas Rápidas */}
                    <div className="flex overflow-x-auto space-x-1.5 pb-1 shrink-0">
                      {QUICK_REPLIES.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendStudentMessage(reply)}
                          disabled={sendingChat}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-2xs transition-colors shrink-0"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>

                    {/* Campo de Entrada de Texto */}
                    <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs shrink-0">
                      <input
                        type="text"
                        placeholder="Escreva uma mensagem..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendStudentMessage();
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 rounded-xl focus:outline-none"
                      />
                      <button
                        onClick={() => handleSendStudentMessage()}
                        disabled={!chatInput.trim() || sendingChat}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ABA 6: PERFIL */}
                {activeTab === 'profile' && (
                  <div className="space-y-3 text-xs">
                    {/* Horários Fixos */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                          Grade Semanal Fixa
                        </h4>
                        <button
                          onClick={() => handleOpenReschedule(undefined, true)}
                          className="text-[10px] font-bold text-pilates-600 hover:underline"
                        >
                          Alterar →
                        </button>
                      </div>
                      {recurringSchedules.map((sc: any) => (
                        <div key={sc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-[11px]">
                          <span className="font-semibold text-slate-700">{DAY_NAMES[sc.dayOfWeek]}</span>
                          <span className="font-mono font-bold text-pilates-700">{sc.startTime} às {sc.endTime}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ficha Clínica */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                        Ficha de Saúde & Anamnese
                      </h4>
                      {studentData?.healthNotes ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-900 space-y-1">
                          <span className="font-bold text-[11px] flex items-center space-x-1 text-rose-800">
                            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                            <span>Observações Clínicas:</span>
                          </span>
                          <p className="text-[11px] leading-relaxed">{studentData.healthNotes}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Nenhuma lesão registrada.</p>
                      )}
                    </div>

                    {/* Informações Oficiais & Expediente do Estúdio */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                          {settings?.studioName || 'Studio Pilates Harmonia'}
                        </h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          Aberto
                        </span>
                      </div>

                      {/* Endereço */}
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-pilates-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">{settings?.address || 'Av. Paulista, 1500'}</p>
                          <p className="text-[10px] text-slate-500">{settings?.neighborhood || 'Bela Vista'} • {settings?.city || 'São Paulo'}/{settings?.state || 'SP'}</p>
                        </div>
                      </div>

                      {/* Horário de Funcionamento / Expediente */}
                      <div className="p-2 bg-indigo-50/80 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                        <div className="flex items-center space-x-1.5 font-bold text-[10px] text-indigo-900 uppercase">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span>Horários de Funcionamento</span>
                        </div>
                        <p className="text-[10px] font-semibold text-indigo-800">
                          {operatingSummary}
                        </p>
                      </div>

                      {/* Redes & Contato */}
                      <div className="space-y-1.5 pt-1">
                        <a
                          href={settings?.googleReviewUrl || GOOGLE_REVIEW_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between font-semibold"
                        >
                          <span className="flex items-center space-x-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>Avaliar no Google Maps</span>
                          </span>
                          <ExternalLink className="w-3 h-3 text-amber-600" />
                        </a>

                        <a
                          href={settings?.instagram ? `https://instagram.com/${settings.instagram.replace('@', '')}` : INSTAGRAM_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-pink-50 rounded-xl border border-pink-200 text-pink-900 flex items-center justify-between font-semibold"
                        >
                          <span>📸 Instagram @{settings?.instagram?.replace('@', '') || 'pilatescenter'}</span>
                          <ExternalLink className="w-3 h-3 text-pink-600" />
                        </a>

                        <a
                          href={settings?.whatsapp ? `https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}` : WHATSAPP_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center justify-between font-semibold"
                        >
                          <span>💬 WhatsApp ({settings?.whatsapp?.slice(0, 2) || '22'}) {settings?.whatsapp?.slice(2) || '99962-3247'}</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Nav com 5 Abas Clicáveis */}
              <div className="bg-white border-t border-slate-200 p-2 px-2.5 flex justify-around text-slate-400 text-[10px] font-bold shrink-0">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`flex flex-col items-center space-y-0.5 transition-colors ${
                    activeTab === 'home' ? 'text-pilates-600 font-black' : 'hover:text-slate-700'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Início</span>
                </button>

                <button
                  onClick={() => setActiveTab('classes')}
                  className={`flex flex-col items-center space-y-0.5 transition-colors ${
                    activeTab === 'classes' ? 'text-pilates-600 font-black' : 'hover:text-slate-700'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Aulas</span>
                </button>

                <button
                  onClick={() => setActiveTab('credits')}
                  className={`flex flex-col items-center space-y-0.5 transition-colors ${
                    activeTab === 'credits' ? 'text-purple-600 font-black' : 'hover:text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Créditos</span>
                </button>

                <button
                  onClick={() => setActiveTab('pix')}
                  className={`flex flex-col items-center space-y-0.5 transition-colors ${
                    activeTab === 'pix' ? 'text-emerald-600 font-black' : 'hover:text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>PIX</span>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex flex-col items-center space-y-0.5 transition-colors relative ${
                    activeTab === 'chat' ? 'text-emerald-600 font-black' : 'hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                  {chatMessages.length > 0 && (
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute top-0 right-1"></span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Lateral: Redes do Estúdio, Sugestões & GPS */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Links Oficiais Pilates Center */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <h3 className="font-bold text-sm text-slate-900">
                Studio Pilates Center • Links Rápidos & Avaliação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card Google Maps */}
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center space-x-1 text-amber-500 mb-1">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <h4 className="font-bold text-xs">Avaliar no Google</h4>
                  <p className="text-[10px] text-amber-800 mt-0.5">Google Maps Link</p>
                </div>
                <div className="text-[11px] font-bold text-amber-700 flex items-center space-x-1 group-hover:underline">
                  <span>Abrir Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>

              {/* Card Instagram */}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-pink-50 hover:bg-pink-100/80 border border-pink-200 text-pink-950 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <span className="text-base">📸</span>
                  <h4 className="font-bold text-xs mt-1">Instagram</h4>
                  <p className="text-[10px] text-pink-800 mt-0.5">@pilatescenter</p>
                </div>
                <div className="text-[11px] font-bold text-pink-700 flex items-center space-x-1 group-hover:underline">
                  <span>Ver Perfil</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>

              {/* Card WhatsApp */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <span className="text-base">💬</span>
                  <h4 className="font-bold text-xs mt-1">WhatsApp</h4>
                  <p className="text-[10px] text-emerald-800 mt-0.5">(22) 99962-3247</p>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1 group-hover:underline">
                  <span>Iniciar Conversa</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            </div>
          </div>

          {/* Card: Sugestões de Horários Fixos Disponíveis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-pilates-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Sugestões de Horários com Vagas para Troca Permanente
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live do Estúdio
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sugestões 2x por semana */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Planos 2x / Semana</span>
                  <span className="text-[10px] font-bold text-pilates-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Seg/Qua ou Ter/Qui
                  </span>
                </div>
                <div className="space-y-1.5">
                  {suggestions2x.slice(0, 3).map((sug: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleSelectSuggestedSlot(sug);
                        setRescheduleModalOpen(true);
                      }}
                      className="p-2 bg-white rounded-xl border border-slate-200 hover:border-pilates-500 hover:shadow-xs cursor-pointer flex items-center justify-between text-xs transition-all group"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 group-hover:text-pilates-700">{sug.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {sug.availableSeats} vaga(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sugestões 3x por semana */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Planos 3x / Semana</span>
                  <span className="text-[10px] font-bold text-pilates-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Seg/Qua/Sex
                  </span>
                </div>
                <div className="space-y-1.5">
                  {suggestions3x.slice(0, 3).map((sug: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleSelectSuggestedSlot(sug);
                        setRescheduleModalOpen(true);
                      }}
                      className="p-2 bg-white rounded-xl border border-slate-200 hover:border-pilates-500 hover:shadow-xs cursor-pointer flex items-center justify-between text-xs transition-all group"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 group-hover:text-pilates-700">{sug.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {sug.availableSeats} vaga(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Teste de Check-in GPS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-900">
                Simulador de Presença por Geolocalização (GPS)
              </h3>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Tempo de permanência simulado:</span>
                <span className="font-bold font-mono text-pilates-700">{simulatedDwell} minutos</span>
              </div>

              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={simulatedDwell}
                onChange={(e) => setSimulatedDwell(parseInt(e.target.value))}
                className="w-full accent-pilates-600"
              />

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>5 min (Chegou agora)</span>
                <span>30 min (Meta para Check-in)</span>
                <span>60 min (Aula completa)</span>
              </div>
            </div>

            {gpsFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{gpsFeedback}</span>
              </div>
            )}

            <button
              onClick={handleSendGpsPing}
              disabled={gpsLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {gpsLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando coordenadas GPS...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Simular Chegada ao Estúdio ({simulatedDwell} min)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Agendamento de Aula Avulsa / Reposição */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header Fixo */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-pilates-600/40 border border-pilates-400/30">
                  <Calendar className="w-5 h-5 text-pilates-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {selectedCreditId
                      ? 'Agendar Aula com Crédito de Reposição'
                      : studentData?.isCorporate
                      ? `Agendar Aula • Convênio ${studentData?.corporateProvider || 'Wellhub/TotalPass'}`
                      : 'Marcar Nova Aula Avulsa'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Veja as vagas em tempo real e escolha seu horário
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Corpo Rolável e Footer Fixo */}
            <form onSubmit={handleBookClass} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecione a Data Desejada:
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Grid de Horários em Tempo Real com Ocupação (ex: 7/8) e Fila */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Horários & Ocupação em Tempo Real:
                    </label>
                    {loadingSlots && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-pilates-500" />
                        <span>Atualizando vagas...</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {daySlots.length === 0 ? (
                      (() => {
                        const targetDayOfWeek = bookingDate ? parseISO(bookingDate).getDay() : 1;
                        const dayCfg = operatingHours.find((d) => d.dayOfWeek === targetDayOfWeek);
                        const fallbackSlots = dayCfg && dayCfg.isOpen
                          ? generateSlotsForDay(dayCfg)
                          : getUnifiedTimeSlots(operatingHours);

                        return fallbackSlots.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setBookingTime(h)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                              bookingTime === h
                                ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {h} às {(parseInt(h.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                          </button>
                        ));
                      })()
                    ) : (
                      daySlots.map((slot) => {
                        const isSelected = bookingTime === slot.startTime;
                        const isFull = slot.isFull;
                        const cap = slot.capacity || 8;
                        const occupied = slot.occupied || 0;
                        const available = slot.availableSeats;
                        const waitCount = slot.waitlistCount || 0;

                        return (
                          <div
                            key={slot.startTime}
                            onClick={() => {
                              if (!isFull) setBookingTime(slot.startTime);
                            }}
                            className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between space-y-1.5 ${
                              isFull
                                ? 'bg-rose-50/40 border-rose-200'
                                : isSelected
                                ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-pilates-400 cursor-pointer shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{slot.startTime} às {slot.endTime}</span>
                              </span>

                              {isFull ? (
                                <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                                  Lotado ({occupied}/{cap})
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                  {occupied}/{cap} vagas
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              {isFull ? (
                                <>
                                  <span className="text-amber-900 font-semibold text-[10px]">
                                    ⏳ {waitCount > 0 ? `${waitCount} na fila` : 'Fila livre (1º)'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinWaitlist(bookingDate, slot.startTime, selectedCreditId || undefined);
                                    }}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors flex items-center space-x-1"
                                  >
                                    <Hourglass className="w-3 h-3" />
                                    <span>Entrar na Fila</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-emerald-700 font-medium text-[10px]">
                                    ✨ {available} vaga(s) livre(s)
                                  </span>
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-400'}`}>
                                    {isSelected ? '✓ Selecionado' : 'Agendar'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Fixo */}
              <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || daySlots.find((s) => s.startTime === bookingTime)?.isFull}
                  className="px-6 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pilates-600/20 disabled:opacity-40 transition-all"
                >
                  {bookingLoading ? 'Agendando...' : `Confirmar para ${bookingTime}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Remarcação de Aula do Aluno */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header Fixo */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-900 via-pilates-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-pilates-600/40 border border-pilates-400/30">
                  <CalendarRange className="w-5 h-5 text-pilates-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {rescheduleScope === 'RECURRING_FUTURE'
                      ? 'Alterar Horário Fixo Permanente'
                      : 'Remarcar Horário de Aula'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {rescheduleAttendance?.classDate
                      ? `Aula atual: ${format(new Date(rescheduleAttendance.classDate), 'dd/MM/yyyy')} às ${rescheduleAttendance.startTime}`
                      : 'Escolha seu novo dia e horário com vagas em tempo real'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReschedule} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Tipo de Alteração:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRescheduleScope('SINGLE')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        rescheduleScope === 'SINGLE'
                          ? 'border-pilates-600 bg-pilates-50 text-pilates-800 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      📅 Aula Avulsa
                    </button>

                    <button
                      type="button"
                      onClick={() => setRescheduleScope('RECURRING_FUTURE')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        rescheduleScope === 'RECURRING_FUTURE'
                          ? 'border-pilates-600 bg-pilates-50 text-pilates-800 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🔄 Fixa Permanente
                    </button>
                  </div>
                </div>

                {rescheduleScope === 'RECURRING_FUTURE' && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sugestões Inteligentes com Vagas Abertas:</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {suggestions2x.map((sug: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestedSlot(sug)}
                          className="w-full text-left p-1.5 bg-white rounded-lg border border-emerald-200 hover:border-emerald-500 text-[11px] flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-800">{sug.title}</span>
                          <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">
                            {sug.availableSeats} vagas
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {rescheduleScope === 'RECURRING_FUTURE' ? 'A partir do Dia:' : 'Nova Data Desejada:'}
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Grid de Horários em Tempo Real com Ocupação (ex: 7/8) e Fila */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Horários & Vagas do Dia:
                    </label>
                    {loadingSlots && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-pilates-500" />
                        <span>Atualizando vagas...</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {daySlots.length === 0 ? (
                      (() => {
                        const targetDayOfWeek = rescheduleDate ? parseISO(rescheduleDate).getDay() : 1;
                        const dayCfg = operatingHours.find((d) => d.dayOfWeek === targetDayOfWeek);
                        const fallbackSlots = dayCfg && dayCfg.isOpen
                          ? generateSlotsForDay(dayCfg)
                          : getUnifiedTimeSlots(operatingHours);

                        return fallbackSlots.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setRescheduleTime(h)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                              rescheduleTime === h
                                ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {h} às {(parseInt(h.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                          </button>
                        ));
                      })()
                    ) : (
                      daySlots.map((slot) => {
                        const isSelected = rescheduleTime === slot.startTime;
                        const isFull = slot.isFull;
                        const cap = slot.capacity || 8;
                        const occupied = slot.occupied || 0;
                        const available = slot.availableSeats;
                        const waitCount = slot.waitlistCount || 0;

                        return (
                          <div
                            key={slot.startTime}
                            onClick={() => {
                              if (!isFull) setRescheduleTime(slot.startTime);
                            }}
                            className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between space-y-1.5 ${
                              isFull
                                ? 'bg-rose-50/40 border-rose-200'
                                : isSelected
                                ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-pilates-400 cursor-pointer shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{slot.startTime} às {slot.endTime}</span>
                              </span>

                              {isFull ? (
                                <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                                  Lotado ({occupied}/{cap})
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                  {occupied}/{cap} vagas
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              {isFull ? (
                                <>
                                  <span className="text-amber-900 font-semibold text-[10px]">
                                    ⏳ {waitCount > 0 ? `${waitCount} na fila` : 'Fila livre (1º)'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinWaitlist(rescheduleDate, slot.startTime);
                                    }}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors flex items-center space-x-1"
                                  >
                                    <Hourglass className="w-3 h-3" />
                                    <span>Entrar na Fila</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-emerald-700 font-medium text-[10px]">
                                    ✨ {available} vaga(s) livre(s)
                                  </span>
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-400'}`}>
                                    {isSelected ? '✓ Selecionado' : 'Selecionar'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Fixo */}
              <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || daySlots.find((s) => s.startTime === rescheduleTime)?.isFull}
                  className="px-6 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pilates-600/20 disabled:opacity-40 transition-all"
                >
                  {rescheduleLoading
                    ? 'Salvando...'
                    : rescheduleScope === 'RECURRING_FUTURE'
                    ? `Confirmar Mudança para ${rescheduleTime}`
                    : `Confirmar Remarcação para ${rescheduleTime}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: FILA DE HORÁRIO FIXO COM CASAL/DUPLA ================= */}
      {recurringWaitlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header Fixo */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/40 border border-indigo-400/30">
                  <Hourglass className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Fila de Horário Fixo Permanente</h3>
                  <p className="text-xs text-slate-300">Entre na fila para assumir um horário semanal definitivo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecurringWaitlistModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinRecurringWaitlist} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
                {/* Dia da Semana Desejado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dia da Semana Desejado</label>
                  <select
                    value={recWaitlistDay}
                    onChange={(e) => {
                      const newDay = parseInt(e.target.value);
                      setRecWaitlistDay(newDay);
                      const targetCfg = operatingHours.find((d) => d.dayOfWeek === newDay);
                      const validSlots = targetCfg && targetCfg.isOpen ? generateSlotsForDay(targetCfg) : [];
                      if (validSlots.length > 0 && !validSlots.includes(recWaitlistTime)) {
                        setRecWaitlistTime(validSlots[0]);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {getOperatingDaysList(operatingHours).map((d) => (
                      <option key={d.id} value={d.id}>Toda {d.name}-feira</option>
                    ))}
                  </select>
                </div>

                {/* Horário Desejado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Horário Desejado</label>
                  <select
                    value={recWaitlistTime}
                    onChange={(e) => setRecWaitlistTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {(() => {
                      const targetCfg = operatingHours.find((d) => d.dayOfWeek === recWaitlistDay);
                      const validSlots = targetCfg && targetCfg.isOpen
                        ? generateSlotsForDay(targetCfg)
                        : getUnifiedTimeSlots(operatingHours);

                      return validSlots.map((h) => (
                        <option key={h} value={h}>
                          {h} às {(parseInt(h.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Opção para Casal / Dupla */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recWaitlistIsCouple}
                      onChange={(e) => setRecWaitlistIsCouple(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>Aguardar 2 vagas juntas para Casal / Dupla</span>
                    </span>
                  </label>

                  {recWaitlistIsCouple && (
                    <div className="space-y-2 pt-1 border-t border-slate-200">
                      <p className="text-[10px] text-slate-500 leading-tight">
                        A vaga só será chamada quando houverem <strong>2 vagas disponíveis no mesmo horário</strong> para vocês dois treinarem juntos.
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Selecione ou digite o nome/usuário da outra pessoa:
                        </label>
                        <select
                          value={recWaitlistPartnerId}
                          onChange={(e) => {
                            setRecWaitlistPartnerId(e.target.value);
                            const p = students.find((s) => s.id === e.target.value);
                            if (p) setRecWaitlistPartnerName(p.name);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">Selecione um aluno cadastrado...</option>
                          {students
                            .filter((s) => s.id !== studentData?.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.planName})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Ou digite o nome completo / username do parceiro"
                          value={recWaitlistPartnerName}
                          onChange={(e) => setRecWaitlistPartnerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Informação sobre confirmação prévia */}
                <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-[10px] text-indigo-900 leading-relaxed">
                  💡 <strong>Aviso Prévio:</strong> Quando a vaga abrir, você receberá uma notificação no app perguntando se ainda deseja efetuar a troca. Se recusar, passará a vez para o próximo da fila.
                </div>
              </div>

              {/* Footer Fixo */}
              <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRecurringWaitlistModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={recWaitlistLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors"
                >
                  {recWaitlistLoading ? 'Salvando...' : 'Entrar na Fila'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRATO DIGITAL & TERMOS DE RESPONSABILIDADE */}
      {contractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header Fixo */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 text-white flex items-center justify-between border-b border-purple-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-600/40 border border-purple-400/30">
                  <FileText className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Contrato & Termo de Responsabilidade</h3>
                  <p className="text-xs text-purple-200">Termos oficiais do Studio Pilates Harmonia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-line">
                  {settings?.contractTermsText ||
                    `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES E TERMO DE RESPONSABILIDADE\n\n1. DO OBJETO: Prestação de serviços de aulas de Pilates para o aluno ${studentData?.name}.\n2. DO PLANO: ${studentData?.planName} (R$ ${studentData?.monthlyFee?.toFixed(2)}/mês).\n3. DAS REMARCAÇÕES: Limite de até ${settings?.monthlyRescheduleLimit || 2} remarcações por mês com aviso prévio de ${settings?.cancelWindowHours || 2}h.\n4. DA INADIMPLÊNCIA: O atraso superior a ${settings?.maxOverdueDaysBeforeSlotRelease || 5} dias ou pausa na matrícula autoriza a liberação da vaga fixa para a fila de espera.\n5. DECLARAÇÃO DE SAÚDE: O aluno declara estar apto para a prática das atividades.`}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Digite seu Nome Completo para Assinatura Digital:
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder={studentData?.name || 'Seu nome completo'}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer Fixo */}
              <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setContractModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleAcceptContract}
                  disabled={acceptingContract}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors flex items-center space-x-1.5"
                >
                  {acceptingContract ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Li e Aceito Digitalmente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

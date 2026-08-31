'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CreditCard,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  HeartPulse,
  ShieldCheck,
  Star,
  Zap,
  Info,
  CalendarDays,
  Smartphone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  MapPin,
  Camera,
  Upload,
  AlertCircle,
  FileText,
  PhoneCall,
  Activity,
  Heart,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { fetchAddressByCep } from '@/lib/cep';
import { compressStudentPhoto } from '@/lib/imageCompression';

function MatriculaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados de Identificação Inicial
  const [identifiedMode, setIdentifiedMode] = useState<'CHOICE' | 'LOOKUP' | 'WIZARD'>('CHOICE');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ success?: boolean; message: string } | null>(null);

  // Aluno Carregado / Criado
  const [studentId, setStudentId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Etapas do Wizard: 1 = Pessoal, 2 = Endereço, 3 = Emergência, 4 = Saúde/Anamnese, 5 = Foto, 6 = Contrato, 7 = Sucesso
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ETAPA 1: DADOS PESSOAIS
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [planName, setPlanName] = useState('2x por Semana');
  const [monthlyFee, setMonthlyFee] = useState(340.0);

  // ETAPA 2: ENDEREÇO & CEP
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string | null>(null);

  // ETAPA 3: CONTATO DE EMERGÊNCIA
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');

  // ETAPA 4: ANAMNESE & SAÚDE
  const [goals, setGoals] = useState('Melhorar postura e condicionamento físico');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [injuries, setInjuries] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [movementRestrictions, setMovementRestrictions] = useState('');
  const [painLevel, setPainLevel] = useState<number>(0);

  // ETAPA 5: FOTO DE PERFIL
  const [photoCompressed, setPhotoCompressed] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ETAPA 6: CONTRATO DIGITAL
  const [contractTerms, setContractTerms] = useState<string>('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [contractSignature, setContractSignature] = useState('');

  // Configurações do Estúdio
  const [studioSettings, setStudioSettings] = useState<any>(null);

  // Buscar Configurações e Checar Query Param `phone`
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setStudioSettings(data);
        if (data.contractTermsText) {
          setContractTerms(data.contractTermsText);
        }
      })
      .catch((err) => console.error(err));

    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      setLookupPhone(phoneParam);
      handlePerformLookup(phoneParam);
    }
  }, [searchParams]);

  // Função de Busca por Telefone
  const handlePerformLookup = async (phoneToSearch: string) => {
    const raw = phoneToSearch.replace(/\D/g, '');
    if (raw.length < 8) return;

    setLookupLoading(true);
    setLookupFeedback(null);

    try {
      const res = await fetch(`/api/matricula/lookup?phone=${encodeURIComponent(raw)}`);
      const data = await res.json();

      if (res.ok && data.found && data.student) {
        const s = data.student;
        setStudentId(s.id);
        setName(s.name || '');
        setPhone(s.phone || phoneToSearch);
        setEmail(s.email || '');
        setCpf(s.cpf || '');
        setBirthDate(s.birthDate ? format(new Date(s.birthDate), 'yyyy-MM-dd') : '');
        setPlanName(s.planName || '2x por Semana');
        setMonthlyFee(s.monthlyFee || 340.0);

        setCep(s.cep || '');
        setAddress(s.address || '');
        setNeighborhood(s.neighborhood || '');
        setCity(s.city || 'São Paulo');
        setState(s.state || 'SP');
        setLatitude(s.latitude ? s.latitude.toString() : '');
        setLongitude(s.longitude ? s.longitude.toString() : '');

        setEmergencyContactName(s.emergencyContactName || '');
        setEmergencyContactPhone(s.emergencyContactPhone || '');
        setEmergencyContactRelation(s.emergencyContactRelation || '');

        setGoals(s.goals || 'Melhorar postura e condicionamento físico');
        setMedicalHistory(s.medicalHistory || s.healthNotes || '');
        setInjuries(s.injuries || '');
        setSurgeries(s.surgeries || '');
        setMovementRestrictions(s.movementRestrictions || s.restrictions || '');
        setPainLevel(s.painLevel ?? 0);

        setPhotoCompressed(s.photoCompressed || s.avatarUrl || null);
        setContractAccepted(!!s.contractAccepted);
        setContractSignature(s.contractSignature || s.name || '');

        setLookupFeedback({
          success: true,
          message: data.message || `Olá, ${s.name}! Encontramos seu cadastro.`,
        });

        // Determinar etapa inicial inteligente
        if (!s.cep) {
          setCurrentStep(2);
        } else if (!s.emergencyContactPhone) {
          setCurrentStep(3);
        } else if (!s.goals && !s.injuries) {
          setCurrentStep(4);
        } else if (!s.contractAccepted) {
          setCurrentStep(6);
        } else {
          setCurrentStep(1);
        }

        setIdentifiedMode('WIZARD');
      } else {
        setLookupFeedback({
          success: false,
          message: data.message || 'Nenhum cadastro encontrado com este telefone. Você pode iniciar um novo!',
        });
      }
    } catch (err: any) {
      setLookupFeedback({
        success: false,
        message: err.message || 'Erro ao consultar telefone',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Busca Inteligente de Endereço por CEP
  const handleCepLookup = async (cepInput: string) => {
    const raw = cepInput.replace(/\D/g, '');
    if (raw.length !== 8) return;

    setCepLoading(true);
    setCepFeedback(null);
    try {
      const data = await fetchAddressByCep(raw);
      if (data) {
        setAddress(data.street || address);
        setNeighborhood(data.neighborhood || neighborhood);
        setCity(data.city || city);
        setState(data.state || state);
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
      // Auto-save foto
      await performAutoSave({ photoCompressed: compressed });
    } catch (err) {
      console.error('Erro ao compactar foto:', err);
      alert('Erro ao processar imagem. Tente outra foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Função Central de Auto-Save em Tempo Real
  const performAutoSave = async (overrideData?: any) => {
    setSavingStep(true);
    setAutoSaveStatus('Salvando...');

    const payload = {
      name,
      phone,
      email,
      cpf,
      birthDate,
      planName,
      monthlyFee,
      cep,
      address,
      neighborhood,
      city,
      state,
      latitude,
      longitude,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      goals,
      medicalHistory,
      injuries,
      surgeries,
      movementRestrictions,
      painLevel,
      photoCompressed,
      contractAccepted,
      contractSignature: contractSignature || name,
      ...overrideData,
    };

    try {
      const res = await fetch('/api/matricula/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          data: payload,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (!studentId && json.studentId) {
          setStudentId(json.studentId);
        }
        setAutoSaveStatus('✓ Salvo automaticamente');
        setTimeout(() => setAutoSaveStatus(null), 3500);
        return true;
      } else {
        setAutoSaveStatus('✕ Erro ao salvar');
        return false;
      }
    } catch (err) {
      console.error('Erro no auto-save:', err);
      setAutoSaveStatus('✕ Erro ao salvar');
      return false;
    } finally {
      setSavingStep(false);
    }
  };

  // Avançar para Próxima Etapa com Validação e Auto-Save
  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        alert('Por favor, informe seu nome completo.');
        return;
      }
      if (!phone.trim()) {
        alert('Por favor, informe seu WhatsApp / Telefone.');
        return;
      }
    }

    // Salvar estado atual antes de passar
    await performAutoSave();

    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Voltar Etapa
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Concluir e Assinar Contrato Digital
  const handleFinishContract = async () => {
    if (!contractAccepted) {
      alert('Por favor, marque o termo de aceite do contrato para concluir.');
      return;
    }

    const sig = contractSignature.trim() || name.trim();
    const success = await performAutoSave({
      contractAccepted: true,
      contractSignature: sig,
    });

    if (success) {
      setCurrentStep(7); // Tela de Sucesso
    }
  };

  const stepsList = [
    { num: 1, title: 'Dados Básicos', icon: User },
    { num: 2, title: 'Endereço', icon: MapPin },
    { num: 3, title: 'Emergência', icon: PhoneCall },
    { num: 4, title: 'Saúde & Anamnese', icon: HeartPulse },
    { num: 5, title: 'Foto de Perfil', icon: Camera },
    { num: 6, title: 'Contrato Digital', icon: FileText },
  ];

  return (
    <div className="min-h-[85vh] py-6 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Brand Header */}
      <div className="text-center space-y-1.5 max-w-xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-pilates-50 text-pilates-700 rounded-full text-xs font-bold border border-pilates-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{studioSettings?.studioName || 'Studio Pilates Harmonia'} • Auto-Cadastro & Matrícula</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Ficha Cadastral & Contrato Digital
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Rápido, tela por tela e salvo em tempo real. Leva menos de 2 minutinhos!
        </p>
      </div>

      {/* ================= TELA DE ESCOLHA INICIAL: JÁ É ALUNO OU NOVO ================= */}
      {identifiedMode === 'CHOICE' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-pilates-50 text-pilates-600 rounded-2xl flex items-center justify-center mx-auto border border-pilates-100 shadow-inner">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Bem-vindo(a) ao Studio de Pilates! 🧘‍♀️
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Para começarmos, selecione uma das opções abaixo:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
            <button
              type="button"
              onClick={() => setIdentifiedMode('LOOKUP')}
              className="p-5 rounded-2xl border-2 border-pilates-600 bg-pilates-50/60 hover:bg-pilates-100/80 text-left transition-all space-y-2 group shadow-sm hover:shadow-md"
            >
              <div className="p-2.5 rounded-xl bg-pilates-600 text-white w-fit">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-pilates-800">
                  🧘 Já sou Aluno do Estúdio
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  A recepção já iniciou meu cadastro e quero completar minha ficha pelo WhatsApp.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIdentifiedMode('WIZARD');
                setCurrentStep(1);
              }}
              className="p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-left transition-all space-y-2 group shadow-sm hover:shadow-md"
            >
              <div className="p-2.5 rounded-xl bg-slate-900 text-white w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-800">
                  ✨ Quero me Matricular Agora
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sou um aluno novo e desejo iniciar meu cadastro do zero.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ================= TELA DE IDENTIFICAÇÃO POR TELEFONE ================= */}
      {identifiedMode === 'LOOKUP' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 max-w-md mx-auto animate-in zoom-in-95 duration-200">
          <div className="flex items-center space-x-2 text-slate-600 text-xs font-bold">
            <button
              onClick={() => setIdentifiedMode('CHOICE')}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span>Voltar</span>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <PhoneCall className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Localizar Meu Cadastro</h2>
            <p className="text-xs text-slate-500">
              Digite o seu número de WhatsApp cadastrado na recepção para puxarmos seus dados.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePerformLookup(lookupPhone);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seu WhatsApp / Telefone
              </label>
              <input
                type="text"
                required
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="(22) 99962-3247"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                autoFocus
              />
            </div>

            {lookupFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  lookupFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {lookupFeedback.message}
              </div>
            )}

            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full py-3 bg-pilates-600 hover:bg-pilates-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pilates-600/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {lookupLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Localizando cadastro...</span>
                </>
              ) : (
                <>
                  <span>Localizar e Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIdentifiedMode('WIZARD');
                setCurrentStep(1);
              }}
              className="text-xs text-pilates-600 hover:underline font-semibold"
            >
              Não tem cadastro? Iniciar novo cadastro ➜
            </button>
          </div>
        </div>
      )}

      {/* ================= FLUXO WIZARD TELA POR TELA ================= */}
      {identifiedMode === 'WIZARD' && currentStep <= 6 && (
        <div className="space-y-4">
          {/* Status de Auto-Save & Barra de Progresso */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">
                Etapa {currentStep} de 6:
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {stepsList[currentStep - 1]?.title}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {autoSaveStatus && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1 animate-in fade-in">
                  <Save className="w-3 h-3" />
                  <span>{autoSaveStatus}</span>
                </span>
              )}

              {/* Progress Pill */}
              <div className="w-24 sm:w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-pilates-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card Principal da Etapa */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[440px] justify-between animate-in fade-in duration-200">
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* ================= ETAPA 1: DADOS BÁSICOS ================= */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <User className="w-5 h-5 text-pilates-600" />
                      <span>1. Seus Dados Pessoais</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Informações para identificação e contato da sua ficha no estúdio.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Mariana Silva"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
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
                        placeholder="(22) 99962-3247"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
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
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
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
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ETAPA 2: ENDEREÇO & CEP ================= */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-pilates-600" />
                      <span>2. Seu Endereço Residencial</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Digite o CEP para preenchimento automático da sua rua e bairro.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CEP (Busca Automática)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => {
                            setCep(e.target.value);
                            handleCepLookup(e.target.value);
                          }}
                          placeholder="00000-000"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                          maxLength={9}
                        />
                        {cepLoading && (
                          <RefreshCw className="w-4 h-4 text-pilates-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      {cepFeedback && (
                        <p className="text-[11px] font-bold text-emerald-600 mt-1">
                          {cepFeedback}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Rua / Logradouro & Número
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Ex: Rua das Flores, 120 - Apto 402"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
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
                          placeholder="Bairro"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Estado (UF)</label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ETAPA 3: CONTATO DE EMERGÊNCIA ================= */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <PhoneCall className="w-5 h-5 text-pilates-600" />
                      <span>3. Contato de Emergência</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pessoa de confiança (cônjuge, familiar ou amigo) para eventuais necessidades.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome do Contato de Emergência
                      </label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="Ex: Carlos Silva (Esposo)"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Telefone / WhatsApp do Contato
                        </label>
                        <input
                          type="text"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          placeholder="(22) 99888-7766"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Grau de Parentesco
                        </label>
                        <select
                          value={emergencyContactRelation}
                          onChange={(e) => setEmergencyContactRelation(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="Cônjuge">Cônjuge / Parceiro(a)</option>
                          <option value="Mãe / Pai">Mãe / Pai</option>
                          <option value="Filho(a)">Filho(a)</option>
                          <option value="Irmão(ã)">Irmão(ã)</option>
                          <option value="Amigo(a)">Amigo(a)</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ETAPA 4: SAÚDE & ANAMNESE ================= */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <HeartPulse className="w-5 h-5 text-rose-600" />
                      <span>4. Ficha de Saúde & Anamnese</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ajude os instrutores a adaptarem os exercícios de Pilates para seu corpo e objetivos.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quais são seus principais objetivos no Pilates?
                      </label>
                      <input
                        type="text"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="Ex: Alívio de dor na lombar, flexibilidade, fortalecimento..."
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Possui dores frequentes ou lesões? (Coluna, Joelho, Ombro, etc.)
                      </label>
                      <textarea
                        rows={2}
                        value={injuries}
                        onChange={(e) => setInjuries(e.target.value)}
                        placeholder="Ex: Hérnia de disco L4-L5, tendinite no ombro direito..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cirurgias anteriores?
                        </label>
                        <input
                          type="text"
                          value={surgeries}
                          onChange={(e) => setSurgeries(e.target.value)}
                          placeholder="Ex: Nenhuma ou Artroscopia joelho (2022)"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nível atual de dor corporal (0 a 10)
                        </label>
                        <div className="flex items-center space-x-3 pt-1">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={painLevel}
                            onChange={(e) => setPainLevel(parseInt(e.target.value))}
                            className="flex-1 accent-rose-600"
                          />
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${
                              painLevel === 0
                                ? 'bg-emerald-500'
                                : painLevel <= 3
                                ? 'bg-amber-500'
                                : painLevel <= 7
                                ? 'bg-orange-500'
                                : 'bg-rose-600'
                            }`}
                          >
                            {painLevel} / 10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ETAPA 5: FOTO DE PERFIL ================= */}
              {currentStep === 5 && (
                <div className="space-y-5 text-center animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3 text-left">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-pilates-600" />
                      <span>5. Foto de Perfil</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Para identificação na recepção e no aplicativo. (Opcional)
                    </p>
                  </div>

                  <div className="flex flex-col items-center space-y-3 pt-2">
                    <div className="w-28 h-28 rounded-full border-4 border-pilates-200 overflow-hidden bg-slate-100 shadow-md flex items-center justify-center relative">
                      {photoCompressed ? (
                        <img src={photoCompressed} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-slate-400" />
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoLoading}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        {photoLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{photoCompressed ? 'Trocar Foto' : 'Escolher Foto'}</span>
                      </button>

                      {photoCompressed && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoCompressed(null);
                            performAutoSave({ photoCompressed: null });
                          }}
                          className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ETAPA 6: CONTRATO DIGITAL ================= */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-pilates-600" />
                      <span>6. Termos & Contrato de Prestação de Serviços</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Leia os termos do estúdio e confirme seu aceite digital.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-56 overflow-y-auto text-xs text-slate-700 space-y-2 whitespace-pre-line font-mono text-[11px] leading-relaxed">
                    {contractTerms ||
                      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES E TERMO DE RESPONSABILIDADE\n\n1. DO OBJETO: O presente contrato tem por objeto a prestação de serviços de aulas de Pilates pelo estúdio ao aluno matriculado.\n2. DA FREQUÊNCIA E REMARCAÇÕES: As aulas possuem horários fixos. O aluno poderá solicitar remarcação respeitando o aviso prévio mínimo de 2 horas e o limite mensal de remarcações.\n3. DO CANCELAMENTO E CRÉDITOS: Cancelamentos efetuados com antecedência geram crédito para reposição com validade de 30 dias.\n4. DA PONTUALIDADE E SAÚDE: O aluno declara estar em plenas condições físicas para a prática das atividades e compromete-se a informar qualquer alteração em seu estado de saúde.\n5. DO PAGAMENTO: O atraso no pagamento da mensalidade autoriza o estúdio a liberar a vaga fixa para a fila de espera.`}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Digite seu Nome Completo para Assinatura Digital:
                      </label>
                      <input
                        type="text"
                        value={contractSignature || name}
                        onChange={(e) => setContractSignature(e.target.value)}
                        placeholder="Nome completo para assinatura"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-start space-x-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contractAccepted}
                        onChange={(e) => setContractAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-emerald-600 rounded"
                      />
                      <span className="text-xs text-emerald-950 font-medium leading-relaxed">
                        Li, compreendi e concordo integralmente com os termos do contrato e as regras operacionais do estúdio.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Fixo de Navegação */}
            <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={savingStep}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-pilates-600 hover:bg-pilates-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pilates-600/20 disabled:opacity-50 transition-all"
                >
                  <span>Avançar para Etapa {currentStep + 1}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishContract}
                  disabled={savingStep || !contractAccepted}
                  className="inline-flex items-center space-x-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir e Assinar Contrato</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TELA 7: SUCESSO & BOAS-VINDAS AO APP ================= */}
      {currentStep === 7 && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-300 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Cadastro Concluído com Sucesso!</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Parabéns, <strong>{name}</strong>! Sua ficha cadastral, prontuário e contrato digital foram registrados no estúdio.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Plano Selecionado:</span>
              <strong className="text-pilates-700">{planName}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Contrato Digital:</span>
              <span className="font-bold text-emerald-600">✓ Assinado e Ativo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Acesso ao App:</span>
              <span className="font-bold text-slate-900">Liberado</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/aluno-app"
              className="w-full inline-flex items-center justify-center space-x-2 py-3.5 px-6 bg-pilates-600 hover:bg-pilates-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-pilates-600/20 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Acessar Meu Aplicativo de Aluno ➜</span>
            </Link>

            <p className="text-[11px] text-slate-500">
              Dica: No iPhone ou Android, adicione o aplicativo à sua tela de início para abrir como app nativo!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatriculaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="w-10 h-10 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Carregando matrícula online...</p>
        </div>
      }
    >
      <MatriculaContent />
    </Suspense>
  );
}

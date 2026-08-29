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
} from 'lucide-react';
import { compressStudentPhoto } from '@/lib/imageCompression';
import { fetchAddressByCep } from '@/lib/cep';
import { format } from 'date-fns';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any | null;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda' },
  { id: 2, name: 'Terça' },
  { id: 3, name: 'Quarta' },
  { id: 4, name: 'Quinta' },
  { id: 5, name: 'Sexta' },
  { id: 6, name: 'Sábado' },
];

const AVAILABLE_HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function StudentFormModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentFormModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'anamnese' | 'evolution' | 'emergency' | 'schedule'>('personal');

  // Dados Pessoais & Endereço
  const [name, setName] = useState('');
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
  const [monthlyFee, setMonthlyFee] = useState('320.00');
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

  // Evoluções Aula a Aula
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newExercises, setNewExercises] = useState('');
  const [newNotePain, setNewNotePain] = useState(0);
  const [newNoteType, setNewNoteType] = useState('CLASS_NOTE');
  const [savingNote, setSavingNote] = useState(false);

  // Contrato Digital
  const [contractAccepted, setContractAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name || '');
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
      setPlanName(student.planName || '2x por Semana');
      setMonthlyFee(student.monthlyFee ? student.monthlyFee.toString() : '320.00');
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
    } else {
      // Reset form para novo aluno
      setName('');
      setEmail('');
      setPhone('');
      setCpf('');
      setBirthDate('');
      setCep('');
      setAddress('');
      setNeighborhood('');
      setCity('São Paulo');
      setState('SP');
      setLatitude('-23.561684');
      setLongitude('-46.655981');
      setPhotoCompressed(null);
      setPlanName('2x por Semana');
      setMonthlyFee('320.00');
      setStatus('ACTIVE');
      setIsCorporate(false);
      setCorporateProvider('WELLHUB');
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
      setSchedules([
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' },
      ]);
    }
  }, [student, isOpen]);

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
      const payload = {
        name,
        email,
        phone,
        cpf,
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
        monthlyFee,
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

      const url = student ? `/api/students/${student.id}` : '/api/students';
      const method = student ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao salvar aluno');
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
                {student ? 'Prontuário & Ficha do Aluno' : 'Novo Cadastro de Aluno'}
              </h2>
              <p className="text-xs text-slate-300">
                {student ? `Editando registro de ${student.name}` : 'Preencha os dados, anamnese e horários fixos'}
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

        {/* Abas de Navegação Fixas */}
        <div className="flex-shrink-0 flex border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
          {[
            { id: 'personal', name: '1. Dados & CEP', icon: User },
            { id: 'emergency', name: '2. Emergência', icon: PhoneCall },
            { id: 'anamnese', name: '3. Anamnese & Saúde', icon: HeartPulse, alert: !!movementRestrictions },
            { id: 'evolution', name: '4. Evolução Aula a Aula', icon: Activity, hidden: !student },
            { id: 'schedule', name: '5. Plano & Grade Fixa', icon: Calendar },
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

        {/* Formulário com Corpo Rolável e Footer Fixo */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* ABA 1: DADOS PESSOAIS & ENDEREÇO COM CEP */}
          {activeTab === 'personal' && (
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Mariana Silva"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mariana@exemplo.com"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plano de Aulas
                  </label>
                  <select
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none bg-white"
                  >
                    <option value="1x por Semana">1x por Semana (4 aulas/mês)</option>
                    <option value="2x por Semana">2x por Semana (8 aulas/mês)</option>
                    <option value="3x por Semana">3x por Semana (12 aulas/mês)</option>
                    <option value="Personal / Avulso">Personal / Aulas Avulsas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
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
                    onChange={(e) => setIsCorporate(e.target.checked)}
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

              {/* Horários Fixos Semanais */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-pilates-600" />
                    <span>Horários Fixos na Grade Semanal</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSchedules([...schedules, { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }])}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-pilates-50 hover:bg-pilates-100 text-pilates-700 text-[11px] font-bold rounded-lg border border-pilates-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Horário</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {schedules.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => {
                          const updated = [...schedules];
                          updated[index].dayOfWeek = parseInt(e.target.value);
                          setSchedules(updated);
                        }}
                        className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                      >
                        {DAYS_OF_WEEK.map((d) => (
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
                        {AVAILABLE_HOURS.map((h) => (
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
                  ))}
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
              <span>{student ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

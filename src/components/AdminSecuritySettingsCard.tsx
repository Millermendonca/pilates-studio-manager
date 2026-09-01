'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  LogOut,
  Clock,
  Globe,
  AlertCircle,
  Sparkles,
  Layers,
  History,
} from 'lucide-react';

interface SecurityLog {
  id: string;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface AdminProfile {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  passwordChangedAt: string;
  isDefaultPassword?: boolean;
}

export default function AdminSecuritySettingsCard() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Formulário de Identidade
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Formulário de Troca de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados de Ação
  const [savingCreds, setSavingCreds] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Carregar perfil do Admin e Logs de Segurança
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [resMe, resLogs] = await Promise.all([
        fetch('/api/auth/admin/me'),
        fetch('/api/auth/admin/security-logs'),
      ]);

      if (resMe.ok) {
        const dataMe = await resMe.json();
        if (dataMe.authenticated && dataMe.admin) {
          setAdmin(dataMe.admin);
          setName(dataMe.admin.name || '');
          setUsername(dataMe.admin.username || '');
          setEmail(dataMe.admin.email || '');
        }
      }

      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        if (Array.isArray(dataLogs.logs)) {
          setLogs(dataLogs.logs);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar segurança do administrador:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    setRefreshingLogs(true);
    try {
      const res = await fetch('/api/auth/admin/security-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingLogs(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Medidor de Força de Senha
  const calculateStrength = (pwd: string) => {
    const minLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (hasUpper && hasLower) score++;
    if (hasNum && hasSpecial) score++;

    let label = 'Muito Fraca';
    let color = 'bg-rose-500';
    let percent = 20;

    if (score === 1) {
      label = 'Fraca';
      color = 'bg-rose-400';
      percent = 40;
    } else if (score === 2) {
      label = 'Média';
      color = 'bg-amber-500';
      percent = 60;
    } else if (score === 3) {
      label = 'Forte';
      color = 'bg-emerald-500';
      percent = 85;
    } else if (score >= 4) {
      label = 'Excelente / Altamente Segura';
      color = 'bg-emerald-600';
      percent = 100;
    }

    return {
      score,
      label,
      color,
      percent,
      rules: {
        minLength,
        hasUpper,
        hasLower,
        hasNum,
        hasSpecial,
      },
    };
  };

  const strength = calculateStrength(newPassword);

  // Submissão: Troca de Senha / Credenciais
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Informe sua senha atual para autorizar as alterações de segurança.');
      return;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setErrorMsg('A nova senha e a confirmação de senha não coincidem.');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMsg('A nova senha deve ter no mínimo 8 caracteres.');
        return;
      }
    }

    setSavingCreds(true);
    try {
      const res = await fetch('/api/auth/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: username,
          newName: name,
          newEmail: email,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar credenciais.');
      }

      setSuccessMsg(data.message || 'Credenciais de segurança atualizadas com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (data.admin) {
        setAdmin((prev) => ({ ...prev, ...data.admin, isDefaultPassword: false }));
      }
      handleRefreshLogs();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSavingCreds(false);
    }
  };

  // Revogação de Sessões em outros aparelhos
  const handleRevokeAllSessions = async () => {
    if (
      !confirm(
        'Tem certeza que deseja desconectar todas as outras sessões? Qualquer outro aparelho conectado terá o acesso encerrado imediatamente.'
      )
    ) {
      return;
    }

    setRevokingSessions(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/admin/revoke-sessions', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao revogar sessões.');
      }
      setSuccessMsg(data.message || 'Todas as outras sessões foram desconectadas.');
      handleRefreshLogs();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao revogar sessões.');
    } finally {
      setRevokingSessions(false);
    }
  };

  const formatEventBadge = (event: string) => {
    switch (event) {
      case 'LOGIN_SUCCESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
            Login Autorizado
          </span>
        );
      case 'LOGIN_FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
            Falha / Senha Incorreta
          </span>
        );
      case 'ACCOUNT_LOCKED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-700 text-white">
            Conta Bloqueada (15m)
          </span>
        );
      case 'PASSWORD_CHANGED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
            Senha Alterada
          </span>
        );
      case 'USERNAME_CHANGED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800">
            Usuário Alterado
          </span>
        );
      case 'SESSIONS_REVOKED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
            Sessões Revogadas
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
            Logout
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {event}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-center py-10 space-x-3">
        <RefreshCw className="w-5 h-5 text-pilates-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Carregando módulo de segurança...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-pilates-800 text-white shadow-md shadow-slate-900/20">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black text-slate-900">Segurança & Acesso do Gestor</h2>
              <span className="bg-slate-900 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full border border-slate-700">
                Bcrypt 12 Rounds + JWT
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gerencie suas credenciais de login, política de senhas, sessões ativas e auditoria de invasão.
            </p>
          </div>
        </div>

        {admin?.isDefaultPassword && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
            <span>Senha padrão ativa. Recomendamos alterá-la abaixo!</span>
          </div>
        )}
      </div>

      {/* Alertas de Feedback */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulário Principal: Credenciais & Troca de Senha */}
      <form onSubmit={handleUpdateCredentials} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BLOCO 1: IDENTIDADE DO ADMINISTRADOR */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <User className="w-4 h-4 text-pilates-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Identidade & Login
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Administrador
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do Gestor"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome de Usuário (Username para Login) *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Usado para acessar o painel em <code className="font-mono text-slate-600">/admin/login</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail de Notificação & Recuperação
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestor@estudio.com.br"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 2: ALTERAÇÃO DE SENHA COM MEDIDOR DE FORÇA */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. Alteração de Senha Segura
              </h3>
            </div>

            <div className="space-y-3">
              {/* Nova Senha */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nova Senha (deixe em branco para manter)
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco se não quiser alterar"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Medidor Dinâmico de Força da Senha */}
              {newPassword && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600">Força da Senha:</span>
                    <span className={`font-black ${strength.score >= 3 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {strength.label}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.percent}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                    <div className={strength.rules.minLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {strength.rules.minLength ? '✓' : '○'} Mínimo 8 caracteres
                    </div>
                    <div className={strength.rules.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {strength.rules.hasUpper ? '✓' : '○'} Letra Maiúscula (A-Z)
                    </div>
                    <div className={strength.rules.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {strength.rules.hasLower ? '✓' : '○'} Letra Minúscula (a-z)
                    </div>
                    <div className={strength.rules.hasNum ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {strength.rules.hasNum ? '✓' : '○'} Número (0-9)
                    </div>
                    <div className={`col-span-2 ${strength.rules.hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {strength.rules.hasSpecial ? '✓' : '○'} Caractere Especial (!@#$%...)
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmar Nova Senha */}
              {newPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha exatamente"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AUTORIZAÇÃO: SENHA ATUAL OBRIGATÓRIA */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-slate-900/10">
          <div className="space-y-1 max-w-md">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>Autorização de Segurança</span>
            </div>
            <p className="text-xs text-slate-300">
              Digite sua <strong className="text-white">senha atual</strong> para confirmar qualquer alteração de usuário, nome ou senha.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative w-48 sm:w-60">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sua Senha Atual *"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={savingCreds || !currentPassword}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-40 whitespace-nowrap"
            >
              {savingCreds ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* BLOCO 3: SESSÕES & DISPOSITIVOS CONECTADOS */}
      <div className="pt-2 border-t border-slate-100">
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-pilates-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Sessão Ativa & Proteção Multi-Dispositivo
              </h3>
            </div>

            <button
              type="button"
              onClick={handleRevokeAllSessions}
              disabled={revokingSessions}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {revokingSessions ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Desconectar todos os outros aparelhos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Último Acesso</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {admin?.lastLoginAt
                  ? new Date(admin.lastLoginAt).toLocaleString('pt-BR')
                  : 'Sessão Atual'}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Endereço IP do Gestor</span>
              <p className="font-mono font-bold text-slate-800 mt-0.5">
                {admin?.lastLoginIp || 'Localhost / 127.0.0.1'}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Senha Alterada em</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {admin?.passwordChangedAt
                  ? new Date(admin.passwordChangedAt).toLocaleDateString('pt-BR')
                  : 'Data de criação'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 4: HISTÓRICO DE AUDITORIA & REGISTRO DE INVASÕES */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Trilha de Auditoria & Registro de Tentativas (Últimos 50 Eventos)
            </h3>
          </div>

          <button
            type="button"
            onClick={handleRefreshLogs}
            disabled={refreshingLogs}
            className="text-xs font-bold text-pilates-700 hover:text-pilates-800 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingLogs ? 'animate-spin' : ''}`} />
            <span>Atualizar Logs</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Nenhum evento registrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Evento</th>
                  <th className="py-2.5 px-3">IP de Origem</th>
                  <th className="py-2.5 px-3">Detalhes do Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{formatEventBadge(log.event)}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {log.details || 'Sem detalhes adicionais'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

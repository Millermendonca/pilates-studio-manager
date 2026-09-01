'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setRemainingAttempts(null);
    setLockoutMinutes(null);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ACCOUNT_LOCKED') {
          setLockoutMinutes(data.remainingMinutes || 15);
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      setSuccess(data.message || 'Login autorizado com sucesso! Carregando painel...');
      setTimeout(() => {
        router.push(returnUrl);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setUsername('admin');
    setPassword('Admin@Pilates2026!');
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Card Principal de Autenticação */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-200/90 space-y-6 relative overflow-hidden backdrop-blur-xl">
          {/* Barra Superior de Status Criptográfico */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pilates-500 via-emerald-500 to-pilates-700"></div>

          {/* Cabeçalho */}
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 bg-gradient-to-tr from-slate-900 via-slate-800 to-pilates-800 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-slate-900/20 ring-4 ring-slate-100">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3 h-3 text-pilates-600" />
                <span>Área Restrita do Gestor</span>
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                Autenticação Segura
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Acesse o painel central de controle, finanças, matrículas e agenda do estúdio.
              </p>
            </div>
          </div>

          {/* Alertas de Erro ou Bloqueio */}
          {error && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-start space-x-3 animate-in fade-in zoom-in-95 duration-150 ${
                lockoutMinutes
                  ? 'bg-rose-100 border-rose-300 text-rose-950'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">{error}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-[11px] text-rose-700 font-medium">
                    Aviso: Mais {remainingAttempts} erro(s) bloquearão o login por 15 minutos.
                  </p>
                )}
                {lockoutMinutes && (
                  <p className="text-[11px] text-rose-800 font-semibold">
                    Tempo de espera estimado: ~{lockoutMinutes} minutos.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-3 animate-in fade-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Campo Usuário */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuário ou E-mail do Gestor
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:border-pilates-500 focus:bg-white focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha Criptografada
                </label>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:border-pilates-500 focus:bg-white focus:outline-none transition-all tracking-wide"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opção Lembrar Acesso */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-pilates-600 focus:ring-pilates-500 border-slate-300"
                />
                <span>Manter este aparelho conectado (7 dias)</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading || !!lockoutMinutes}
              className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-pilates-700 hover:from-black hover:to-pilates-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verificando credenciais e segurança...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Entrar no Painel do Gestor</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Dica de Acesso Inicial Seguro */}
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pilates-600" />
                  <span>Credencial de Acesso Inicial:</span>
                </span>
                <button
                  type="button"
                  onClick={handleFillDefault}
                  className="text-[10px] bg-white hover:bg-slate-100 text-pilates-700 font-bold px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                >
                  Preencher
                </button>
              </div>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                Usuário: <code className="font-mono bg-white px-1 py-0.5 rounded text-slate-800">admin</code> • Senha:{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded text-slate-800">Admin@Pilates2026!</code>
              </p>
              <p className="text-[10px] text-amber-700 font-medium">
                💡 Você poderá alterar o usuário e a senha a qualquer momento na tela de Configurações.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé Alternativo */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <div>
            <span>É um aluno do estúdio? </span>
            <Link href="/login" className="font-bold text-pilates-600 hover:underline inline-flex items-center space-x-1">
              <span>Ir para o Portal do Aluno</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

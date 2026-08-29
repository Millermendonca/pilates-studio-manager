'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('senha123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demoStudents, setDemoStudents] = useState<any[]>([]);

  // Carregar alunos para atalho rápido
  useEffect(() => {
    fetch('/api/students')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDemoStudents(data.slice(0, 4));
          if (data.length > 0) {
            setEmail(data[0].email);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // 1. Login Tradicional com E-mail e Senha
  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar');
      }

      setSuccess(`Bem-vindo(a) de volta, ${data.student.name}! Redirecionando...`);
      setTimeout(() => {
        router.push('/aluno-app');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // 2. Login com Google One Tap / Google OAuth
  const handleGoogleOneTapLogin = async (customProfile?: any) => {
    setGoogleLoading(true);
    setError('');
    setSuccess('');

    try {
      // Perfil simulado do Google One Tap ou personalizado
      const profile = customProfile || {
        sub: 'google_user_1092837465',
        email: email || 'aluno.google@gmail.com',
        name: 'Aluno Google',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGoogle: true,
          googleProfile: profile,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no login com Google');
      }

      setSuccess(`Autenticado com sucesso via Google! Olá, ${data.student.name}.`);
      setTimeout(() => {
        router.push('/aluno-app');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro no login com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 3. Preenchimento de Atalho Rápido de Teste
  const handleSelectDemo = (std: any) => {
    setEmail(std.email);
    setPassword('senha123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Card Principal de Login */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Logo e Cabeçalho */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-pilates-500 to-pilates-700 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-pilates-600/30">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Área do Aluno</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Acesse sua grade de aulas, créditos de reposição, faturas PIX e converse com o estúdio.
            </p>
          </div>

          {/* Feedback de Erro ou Sucesso */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* ================= 1. BOTAO GOOGLE ONE TAP ================= */}
          <div>
            <button
              type="button"
              onClick={() => handleGoogleOneTapLogin()}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all flex items-center justify-center space-x-3 disabled:opacity-60"
            >
              {/* Ícone Oficial do Google */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{googleLoading ? 'Conectando ao Google...' : 'Continuar com o Google (One Tap)'}</span>
            </button>
          </div>

          {/* Divisor "OU" */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ou com e-mail
            </span>
            <div className="border-t border-slate-200 w-full"></div>
          </div>

          {/* ================= 2. FORMULÁRIO TRADICIONAL ================= */}
          <form onSubmit={handleTraditionalLogin} className="space-y-4">
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Seu E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Para redefinir sua senha, solicite um link pelo chat ou use a senha padrão: senha123');
                  }}
                  className="text-[11px] font-semibold text-pilates-600 hover:underline"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-pilates-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar-me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-pilates-600 focus:ring-pilates-500"
                />
                <span>Lembrar meu acesso neste aparelho</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pilates-600 to-pilates-700 hover:from-pilates-700 hover:to-pilates-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-pilates-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Entrando na sua conta...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Portal do Aluno</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ================= 3. ATALHOS RAPIDOS DE TESTE ================= */}
          {demoStudents.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                ⚡ Atalhos Rápidos para Demonstração:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoStudents.map((std) => (
                  <button
                    key={std.id}
                    type="button"
                    onClick={() => handleSelectDemo(std)}
                    className="p-2 bg-slate-50 hover:bg-pilates-50 text-slate-700 hover:text-pilates-800 border border-slate-200 rounded-xl text-[11px] font-semibold text-left truncate transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{std.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer do Card */}
        <div className="text-center text-xs text-slate-500 space-y-1.5">
          <div>
            <span>Ainda não é nosso aluno? </span>
            <Link href="/matricula" className="font-bold text-emerald-600 hover:underline">
              Escolher plano e matricular-se online →
            </Link>
          </div>
          <div>
            <Link href="/aluno-app" className="font-semibold text-slate-400 hover:text-slate-600">
              Abrir Simulador do App Mobile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

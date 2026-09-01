'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Settings,
  Smartphone,
  Sparkles,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import SyncStatusBadge from './SyncStatusBadge';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Alunos', href: '/alunos', icon: Users },
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { name: 'Mapa', href: '/mapa', icon: MapPin },
  { name: 'Mensagens', href: '/mensagens', icon: MessageSquare },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // Fechar menus ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
    setQuickMenuOpen(false);
  }, [pathname]);

  // Fechar dropdown de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#quick-actions-menu')) {
        setQuickMenuOpen(false);
      }
    };
    if (quickMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [quickMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2 sm:gap-4">
          
          {/* Logo & Marca do Estúdio */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pilates-700 via-pilates-600 to-pilates-500 flex items-center justify-center text-white shadow-md shadow-pilates-600/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-black text-slate-800 tracking-tight group-hover:text-pilates-600 transition-colors">
                    Studio Pilates
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-slate-500 font-medium tracking-wide">
                    Painel do Gestor
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navegação Desktop Principal */}
          <nav className="hidden lg:flex items-center space-x-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-pilates-50 text-pilates-800 border border-pilates-200/70 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-pilates-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Ações Rápidas & Portais à Direita */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Status Sincronização PostgreSQL / Nuvem */}
            <SyncStatusBadge />

            {/* Botão Matrícula Online */}
            <Link
              href="/matricula"
              className="hidden xl:inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl shadow-2xs transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Matrícula</span>
            </Link>

            {/* Botão App do Aluno */}
            <Link
              href="/aluno-app"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-pilates-600 to-pilates-700 hover:from-pilates-700 hover:to-pilates-800 rounded-xl shadow-xs shadow-pilates-600/20 transition-all whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App do Aluno</span>
            </Link>

            {/* Menu Dropdown de Mais Opções / Acesso Rápido */}
            <div className="relative" id="quick-actions-menu">
              <button
                onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                aria-label="Mais opções"
                className={`p-2 rounded-xl border text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all ${
                  quickMenuOpen ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    quickMenuOpen ? 'rotate-180 text-pilates-600' : ''
                  }`}
                />
              </button>

              {/* Dropdown Card */}
              {quickMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Portais & Acessos
                    </span>
                  </div>

                  <Link
                    href="/matricula"
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-pilates-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Matrícula Online</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>

                  <Link
                    href="/login"
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-pilates-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-3.5 h-3.5 text-slate-500" />
                      <span>Login do Aluno</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>

                  <Link
                    href="/aluno-app"
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-pilates-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-3.5 h-3.5 text-pilates-600" />
                      <span>Simulador PWA</span>
                    </div>
                    <span className="text-[9px] font-bold bg-pilates-100 text-pilates-700 px-1.5 py-0.5 rounded">
                      Mobile
                    </span>
                  </Link>

                  <Link
                    href="/configuracoes/comunicacao"
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-pilates-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                      <span>Comunicação & Automação</span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      Novo
                    </span>
                  </Link>

                  <div className="my-1 border-t border-slate-100"></div>

                  <div className="px-3 py-1.5">
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>PostgreSQL + Offline Local</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Hambúrguer Mobile / Tablet (< lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Drawer Mobile & Tablet */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-xl">
          
          {/* Sessão: Módulos de Gestão */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Módulos de Gestão
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-pilates-600 text-white font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sessão: Portais & Links Externos */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Portais do Aluno & Matrícula
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/aluno-app"
                className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-gradient-to-r from-pilates-600 to-pilates-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <Smartphone className="w-4 h-4" />
                <span>App Aluno</span>
              </Link>
              
              <Link
                href="/matricula"
                className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Matrícula</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

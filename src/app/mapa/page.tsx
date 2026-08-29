'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Flame, Layers, Navigation, Sparkles, Building, Users } from 'lucide-react';
import Link from 'next/link';

// Importação dinâmica do componente de mapa para evitar erros de SSR com Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[620px] bg-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-2 border border-slate-200">
      <div className="w-8 h-8 border-4 border-pilates-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-semibold text-slate-500">Carregando mapa geográfico do estúdio...</span>
    </div>
  ),
});

export default function MapaPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [studio, setStudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMapData() {
      try {
        const [resStudents, resSettings] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/settings'),
        ]);

        const studentsData = await resStudents.json();
        const settingsData = await resSettings.json();

        setStudents(studentsData);
        setStudio(settingsData);
      } catch (err) {
        console.error('Erro ao carregar dados do mapa:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMapData();
  }, []);

  // Agrupamento de alunos por bairro
  const neighborhoodCounts: { [key: string]: number } = {};
  students.forEach((s) => {
    const neighborhood = s.neighborhood || 'Outros / Centro';
    neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1;
  });

  const sortedNeighborhoods = Object.entries(neighborhoodCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-pilates-600 font-semibold text-xs uppercase tracking-wider mb-0.5">
            <MapPin className="w-4 h-4" />
            <span>Geomarketing & Geolocalização</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Mapa Geográfico dos Alunos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Alterne entre os marcadores individuais e o mapa de calor térmico para análise de densidade.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/configuracoes"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            Ajustar Raio GPS ({studio?.checkinRadiusMeters || 60}m)
          </Link>
        </div>
      </div>

      {/* Grid Principal: Mapa e Análise por Bairro */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mapa (3 colunas) */}
        <div className="lg:col-span-3">
          {studio && <MapComponent students={students} studio={studio} />}
        </div>

        {/* Sidebar com Concentração por Bairro e Estatísticas */}
        <div className="space-y-4">
          {/* Card Bairros */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-pilates-600" />
                <h3 className="font-bold text-sm text-slate-900">Bairros Atendidos</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {sortedNeighborhoods.length} regiões
              </span>
            </div>

            <div className="space-y-2.5">
              {sortedNeighborhoods.map(([neighborhood, count]) => {
                const percentage = Math.round((count / students.length) * 100);
                return (
                  <div key={neighborhood} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">{neighborhood}</span>
                      <span className="text-slate-500 font-bold">{count} alunos ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-pilates-500 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dica de Geomarketing */}
          <div className="bg-gradient-to-br from-pilates-900 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Dica de Captação</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              O Mapa de Calor revela áreas com grande densidade de alunos em potencial. Excelente para planejar campanhas de tráfego local no Instagram/Google Ads focadas em raio de 2km.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

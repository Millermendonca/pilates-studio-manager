'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, Flame, MapPin, Navigation, Info, User, HeartPulse, CheckCircle2 } from 'lucide-react';
import { getStudentAvatar } from '@/lib/avatar';
import { getStudentFullName, getStudentDisplayName } from '@/lib/studentHelper';

interface StudentLocation {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  photoCompressed?: string | null;
  planName: string;
  address?: string | null;
  neighborhood?: string | null;
  latitude: number;
  longitude: number;
  healthNotes?: string | null;
  phone?: string | null;
}

interface StudioInfo {
  studioName: string;
  latitude: number;
  longitude: number;
  address: string;
  checkinRadiusMeters: number;
}

interface MapComponentProps {
  students: StudentLocation[];
  studio: StudioInfo;
}

export default function MapComponent({ students, studio }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const studioCircleRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<'PINS' | 'HEATMAP'>('PINS');
  const [selectedStudent, setSelectedStudent] = useState<StudentLocation | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Fix default leaflet icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [studio.latitude, studio.longitude],
          zoom: 14,
          zoomControl: true,
        });

        // OpenStreetMap Tile Layer oficial limpo e 100% gratuito sem marcas d'água
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Studio Pilates',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(map);

        // Marcador do Estúdio com Círculo de Geofence (Raio GPS de Check-in)
        const studioIcon = L.divIcon({
          className: 'studio-marker',
          html: `
            <div style="background: #0f172a; color: #38bdf8; border: 2px solid white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: bold; font-size: 16px;">
              🧘
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        L.marker([studio.latitude, studio.longitude], { icon: studioIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: system-ui; padding: 4px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">${studio.studioName}</h4>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">${studio.address}</p>
              <div style="margin-top: 6px; padding: 3px 6px; background: #f0fdf4; border-radius: 4px; font-size: 10px; color: #16a34a; font-weight: 600;">
                🎯 Raio de Check-in GPS: ${studio.checkinRadiusMeters}m
              </div>
            </div>
          `);

        // Círculo representando o raio de check-in GPS configurado
        const studioCircle = L.circle([studio.latitude, studio.longitude], {
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '4, 6',
          radius: studio.checkinRadiusMeters,
        }).addTo(map);

        studioCircleRef.current = studioCircle;
        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);

        if (isMounted) setIsMapLoaded(true);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [studio]);

  // Atualização dos Marcadores / Heatmap quando o modo ou os dados mudam
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;

    async function updateLayers() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Limpar camadas anteriores
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (mapMode === 'PINS') {
        // MODO PINS INDIVIDUAIS
        students.forEach((student) => {
          if (!student.latitude || !student.longitude) return;

          const avatarImg = getStudentAvatar(student);

          const studentIcon = L.divIcon({
            className: 'student-pin',
            html: `
              <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; border: 2.5px solid #4f979a; background: white; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.2s;">
                <img src="${avatarImg}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([student.latitude, student.longitude], {
            icon: studentIcon,
          });

          marker.on('click', () => {
            setSelectedStudent(student);
          });

          marker.bindPopup(`
            <div style="font-family: system-ui; width: 220px; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 1.5px solid #4f979a; flex-shrink: 0;">
                  <img src="${avatarImg}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${getStudentFullName(student)} ${student.nickname ? `(${student.nickname.toUpperCase()})` : ''}</h4>
                  <span style="font-size: 10px; font-weight: 600; color: #4f979a; background: #e5f2f2; padding: 1px 6px; border-radius: 4px;">${student.planName}</span>
                </div>
              </div>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">📍 ${student.address || student.neighborhood || 'Endereço cadastrado'}</p>
              ${
                student.healthNotes
                  ? `<div style="background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 4px; padding: 4px; font-size: 10px; color: #be123c; margin-top: 4px;"><strong>Saúde:</strong> ${student.healthNotes.substring(0, 70)}...</div>`
                  : ''
              }
            </div>
          `);

          markersLayerRef.current.addLayer(marker);
        });
      } else {
        // MODO MAPA DE CALOR (HEATMAP)
        // Usamos círculos com gradientes térmicos ponderados por densidade
        const heatGroup = L.layerGroup();

        students.forEach((student) => {
          if (!student.latitude || !student.longitude) return;

          // Camada externa difusa (calor suave)
          L.circle([student.latitude, student.longitude], {
            radius: 450,
            stroke: false,
            fillColor: '#ef4444',
            fillOpacity: 0.18,
          }).addTo(heatGroup);

          // Camada intermediária
          L.circle([student.latitude, student.longitude], {
            radius: 250,
            stroke: false,
            fillColor: '#f97316',
            fillOpacity: 0.35,
          }).addTo(heatGroup);

          // Núcleo de alta concentração
          L.circle([student.latitude, student.longitude], {
            radius: 100,
            stroke: false,
            fillColor: '#eab308',
            fillOpacity: 0.55,
          }).addTo(heatGroup);
        });

        heatGroup.addTo(map);
        heatLayerRef.current = heatGroup;
      }

      if (studio?.latitude && studio?.longitude) {
        map.setView([studio.latitude, studio.longitude], map.getZoom() || 14);
      }
    }

    updateLayers();
  }, [mapMode, students, isMapLoaded]);

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
      {/* Controles Flutuantes do Mapa */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200/80 flex items-center space-x-1">
        <button
          onClick={() => setMapMode('PINS')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            mapMode === 'PINS'
              ? 'bg-pilates-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Pins Individuais</span>
        </button>

        <button
          onClick={() => setMapMode('HEATMAP')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            mapMode === 'HEATMAP'
              ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Mapa de Calor (Heatmap)</span>
        </button>
      </div>

      {/* Legenda Informativa Flutuante */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-slate-200 max-w-xs text-xs space-y-2">
        <div className="flex items-center justify-between font-bold text-slate-800">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-pilates-600" />
            <span>{mapMode === 'PINS' ? 'Modo Pins Individuais' : 'Modo Mapa de Calor'}</span>
          </span>
          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono text-slate-600">
            {students.length} alunos
          </span>
        </div>

        {mapMode === 'HEATMAP' ? (
          <div>
            <p className="text-[11px] text-slate-500 mb-2">
              Densidade geográfica de residência/trabalho dos alunos:
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span>Baixa</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span>Média</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span>Alta Concentração</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-slate-900 border border-white flex items-center justify-center text-[7px] text-sky-400 font-bold">
                🧘
              </span>
              <span>Localização do Studio Pilates</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full border border-dashed border-sky-600 bg-sky-100"></span>
              <span>Raio de Check-in GPS ({studio.checkinRadiusMeters}m)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-pilates-500 border border-white"></span>
              <span>Alunos (clique para ver a ficha)</span>
            </div>
          </div>
        )}
      </div>

      {/* Detalhes do Aluno Selecionado (Drawer flutuante) */}
      {selectedStudent && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 max-w-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-pilates-500 shrink-0">
                <img
                  src={getStudentAvatar(selectedStudent)}
                  alt={selectedStudent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 leading-tight uppercase">
                  {getStudentFullName(selectedStudent)} {selectedStudent.nickname ? `(${selectedStudent.nickname.toUpperCase()})` : ''}
                </h4>
                <span className="inline-block text-[10px] font-semibold bg-pilates-100 text-pilates-800 px-2 py-0.5 rounded-md mt-0.5">
                  {selectedStudent.planName}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-slate-600">
            <p className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{selectedStudent.address || selectedStudent.neighborhood || 'Endereço não informado'}</span>
            </p>
            {selectedStudent.phone && (
              <p className="text-slate-500">📞 {selectedStudent.phone}</p>
            )}
          </div>

          {selectedStudent.healthNotes && (
            <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-800">
              <div className="flex items-center space-x-1 font-bold mb-0.5 text-rose-900">
                <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                <span>Observação de Saúde:</span>
              </div>
              <p className="line-clamp-2">{selectedStudent.healthNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

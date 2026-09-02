import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_PLANS = [
  { id: '1x', name: '1x por Semana', price: 220.0, weeklyDays: 1, description: '1 aula fixa por semana (4 aulas/mês)' },
  { id: '2x', name: '2x por Semana', price: 340.0, weeklyDays: 2, description: '2 aulas fixas por semana (8 aulas/mês)' },
  { id: '3x', name: '3x por Semana', price: 460.0, weeklyDays: 3, description: '3 aulas fixas por semana (12 aulas/mês)' },
  { id: '4x', name: '4x por Semana', price: 580.0, weeklyDays: 4, description: '4 aulas fixas por semana (16 aulas/mês)' },
  { id: 'livre', name: 'Plano Livre / Diário', price: 750.0, weeklyDays: 6, description: 'Acesso livre / aulas diárias' },
  { id: 'avulsa', name: 'Aula Avulsa / Experimental', price: 85.0, weeklyDays: 0, description: 'Cobrança avulsa por aula avulsa/experimental' },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await prisma.studioSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (settings?.plansJson) {
      try {
        const parsed = typeof settings.plansJson === 'string' ? JSON.parse(settings.plansJson) : settings.plansJson;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((p: any) => ({
            id: p.id || p.name,
            name: p.name,
            price: typeof p.price === 'number' ? p.price : (parseFloat(String(p.price).replace(',', '.')) || 0),
            weeklyDays: p.weeklyDays !== undefined ? Number(p.weeklyDays) : 2,
            description: p.description || '',
          }));
          return NextResponse.json(formatted, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          });
        }
      } catch (e) {
        console.error('Erro ao fazer parse de plansJson:', e);
      }
    }
    return NextResponse.json(DEFAULT_PLANS, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json(DEFAULT_PLANS);
  }
}

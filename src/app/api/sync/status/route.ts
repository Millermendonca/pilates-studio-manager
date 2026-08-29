import { NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/syncEngine';

export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Erro na rota de status de sync:', error);
    return NextResponse.json({ error: 'Erro ao verificar status de sincronização' }, { status: 500 });
  }
}

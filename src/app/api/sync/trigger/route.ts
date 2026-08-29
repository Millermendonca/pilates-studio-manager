import { NextResponse } from 'next/server';
import { executeSync } from '@/lib/syncEngine';

export async function POST() {
  try {
    const result = await executeSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao executar sincronização:', error);
    return NextResponse.json({ error: 'Erro ao executar sincronização' }, { status: 500 });
  }
}

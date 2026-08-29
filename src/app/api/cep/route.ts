import { NextRequest, NextResponse } from 'next/server';
import { fetchAddressByCep } from '@/lib/cep';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cep = searchParams.get('cep');

  if (!cep) {
    return NextResponse.json({ error: 'Parâmetro CEP é obrigatório.' }, { status: 400 });
  }

  try {
    const addressData = await fetchAddressByCep(cep);
    return NextResponse.json(addressData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao buscar CEP.' }, { status: 404 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    cookies().delete('student_session');
    return NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deslogar' }, { status: 500 });
  }
}

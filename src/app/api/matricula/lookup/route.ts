import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  const last4 = digits.slice(-4);
  return `(**) *****-${last4}`;
}

function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0] || '*'}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

async function handleLookup(phone?: string | null) {
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
  }

  const rawDigits = phone.replace(/\D/g, '');
  if (rawDigits.length < 8) {
    return NextResponse.json({ error: 'Telefone inválido (mínimo 8 dígitos)' }, { status: 400 });
  }

  // Buscar alunos ativos e comparar dígitos limpos
  const allStudents = await prisma.student.findMany({
    where: { isDeleted: false },
  });

  const foundStudent = allStudents.find((s: any) => {
    const studentDigits = (s.phone || '').replace(/\D/g, '');
    return (
      studentDigits === rawDigits ||
      studentDigits.endsWith(rawDigits) ||
      rawDigits.endsWith(studentDigits)
    );
  });

  if (!foundStudent) {
    return NextResponse.json({
      found: false,
      message: 'Nenhum aluno encontrado com este telefone. Você pode iniciar um novo cadastro!',
    });
  }

  // Retornar estritamente apenas informações seguras e mascaradas (Zero Vazamento LGPD)
  const student: Record<string, any> = {
    id: foundStudent.id,
    name: foundStudent.name,
    phone: maskPhone(foundStudent.phone),
    email: maskEmail(foundStudent.email),
  };

  if (foundStudent.planName) {
    student.planName = foundStudent.planName;
  }
  if (foundStudent.status) {
    student.status = foundStudent.status;
  }

  return NextResponse.json({
    found: true,
    student,
    message: `Olá, ${foundStudent.name}! Encontramos seu cadastro. Complete seus dados a seguir.`,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    return await handleLookup(phone);
  } catch (error: any) {
    console.error('Erro na busca de aluno por telefone:', error);
    return NextResponse.json({ error: 'Erro ao buscar cadastro' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = body?.phone || body?.telephone;
    return await handleLookup(phone);
  } catch (error: any) {
    console.error('Erro na busca de aluno por telefone:', error);
    return NextResponse.json({ error: 'Erro ao buscar cadastro' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Executar limpeza em transação para garantir integridade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Apagar mensagens e logs
      await tx.chatMessage.deleteMany({});
      await tx.locationPing.deleteMany({});
      await tx.studentEvolution.deleteMany({});

      // 2. Apagar presenças, créditos e faturas
      await tx.attendance.deleteMany({});
      await tx.classCredit.deleteMany({});
      await tx.invoice.deleteMany({});

      // 3. Apagar filas de espera (diárias e recorrentes)
      await tx.recurringWaitlistEntry.deleteMany({});
      await tx.waitlistEntry.deleteMany({});

      // 4. Apagar grades de alunos e fila de sincronização
      await tx.studentSchedule.deleteMany({});
      await tx.syncQueue.deleteMany({});

      // 5. Apagar todos os alunos de teste
      const deletedStudents = await tx.student.deleteMany({});

      return {
        deletedStudentsCount: deletedStudents.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Base de dados de teste limpa com sucesso! ${result.deletedStudentsCount} alunos de teste e toda a agenda foram zerados. As configurações do estúdio foram preservadas.`,
    });
  } catch (error: any) {
    console.error('Erro ao resetar dados de teste:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao resetar dados de teste' },
      { status: 500 }
    );
  }
}

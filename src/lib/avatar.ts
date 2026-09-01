/**
 * Helper padronizado para resolução da foto/avatar do aluno em todo o sistema.
 * 
 * Ordem de prioridade estrita:
 * 1. `photoCompressed` (Foto real tirada ou enviada pelo aluno/estúdio em base64)
 * 2. `avatarUrl` (Foto do Google ou URL externa)
 * 3. DiceBear Avatar SVG com semente do nome do aluno
 */
export function getStudentAvatar(
  student?: {
    name?: string | null;
    photoCompressed?: string | null;
    avatarUrl?: string | null;
  } | null
): string {
  if (!student) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aluno';
  }

  // 1. Foto real compactada (base64 / data URL)
  if (student.photoCompressed && student.photoCompressed.trim().length > 10) {
    return student.photoCompressed;
  }

  // 2. Avatar URL salvo
  if (student.avatarUrl && student.avatarUrl.trim().length > 10) {
    return student.avatarUrl;
  }

  // 3. Fallback Dicebear com o nome do aluno
  const seed = student.name ? encodeURIComponent(student.name.trim()) : 'Aluno';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

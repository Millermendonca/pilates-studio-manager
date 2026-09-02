/**
 * Helper centralizado para exibição e formatação de nomes de alunos no sistema.
 * 
 * Regras estritas:
 * 1. Todos os nomes e apelidos são sempre retornados em MAIÚSCULAS (UPPERCASE).
 * 2. `getStudentDisplayName`:
 *    - Se houver `nickname` (apelido / nome de exibição), retorna o apelido em MAIÚSCULAS.
 *    - Se NÃO houver apelido, retorna apenas o PRIMEIRO NOME do aluno em MAIÚSCULAS.
 * 3. `getStudentFullName`:
 *    - Retorna o nome completo do aluno em MAIÚSCULAS (usado no tooltip / title ao passar o mouse).
 */

export interface StudentNameable {
  name?: string | null;
  nickname?: string | null;
}

/**
 * Retorna o nome que deve ser exibido visualmente na agenda/grade:
 * - Se possui apelido cadastrado -> Apelido em MAIÚSCULAS
 * - Se não possui apelido -> Primeiro nome apenas em MAIÚSCULAS
 */
export function getStudentDisplayName(student?: StudentNameable | null): string {
  if (!student) return '';

  const nickname = student.nickname ? student.nickname.trim().toUpperCase() : '';
  if (nickname.length > 0) {
    return nickname;
  }

  const fullName = student.name ? student.name.trim().toUpperCase() : '';
  if (fullName.length > 0) {
    const firstName = fullName.split(/\s+/)[0];
    return firstName || fullName;
  }

  return '';
}

/**
 * Retorna o nome completo do aluno em MAIÚSCULAS.
 * Utilizado para títulos, tooltips ao parar o mouse por cima e fichas completas.
 */
export function getStudentFullName(student?: StudentNameable | null): string {
  if (!student || !student.name) return '';
  return student.name.trim().toUpperCase();
}

/**
 * Retorna o apelido do aluno em MAIÚSCULAS (se houver).
 */
export function getStudentNickname(student?: StudentNameable | null): string {
  if (!student || !student.nickname) return '';
  return student.nickname.trim().toUpperCase();
}

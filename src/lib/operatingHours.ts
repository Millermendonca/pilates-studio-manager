/**
 * Módulo Central de Gestão de Horários de Funcionamento do Estúdio
 * Studio Pilates - Gestão Inteligente
 */

export interface OperatingDayConfig {
  dayOfWeek: number; // 0 (Domingo) a 6 (Sábado)
  dayName: string;
  isOpen: boolean;
  openTime: string;  // "06:00"
  closeTime: string; // "22:00"
}

export const DEFAULT_OPERATING_HOURS: OperatingDayConfig[] = [
  { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '05:00', closeTime: '22:00' },
  { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '05:00', closeTime: '22:00' },
  { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '05:00', closeTime: '22:00' },
  { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '05:00', closeTime: '22:00' },
  { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '05:00', closeTime: '22:00' },
  { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:00', closeTime: '13:00' },
  { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '08:00', closeTime: '12:00' },
];

/**
 * Converte string de hora ("06:00") para minutos a partir da meia-noite (360)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Converte minutos para string formatada ("06:00")
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Gera a lista de slots disponíveis para agendamento em um determinado dia.
 * Regra: Se o estúdio fecha às 22:00, o último slot de aula de 1h é 21:00.
 */
export function generateSlotsForDay(
  dayConfig?: OperatingDayConfig,
  slotDurationMinutes: number = 60
): string[] {
  if (!dayConfig || !dayConfig.isOpen) {
    return [];
  }

  const openMinutes = timeStringToMinutes(dayConfig.openTime);
  const closeMinutes = timeStringToMinutes(dayConfig.closeTime);

  // O último horário de agendamento precisa terminar antes ou no horário de fechamento
  const lastPossibleStartMinutes = closeMinutes - slotDurationMinutes;

  if (openMinutes > lastPossibleStartMinutes) {
    return [];
  }

  const slots: string[] = [];
  for (let current = openMinutes; current <= lastPossibleStartMinutes; current += slotDurationMinutes) {
    slots.push(minutesToTimeString(current));
  }

  return slots;
}

/**
 * Retorna todos os horários únicos da grade (união de todos os dias abertos),
 * ordenados cronologicamente.
 */
export function getUnifiedTimeSlots(
  operatingHoursList: OperatingDayConfig[] = DEFAULT_OPERATING_HOURS,
  slotDurationMinutes: number = 60
): string[] {
  const slotsSet = new Set<string>();

  operatingHoursList.forEach((day) => {
    if (day.isOpen) {
      const daySlots = generateSlotsForDay(day, slotDurationMinutes);
      daySlots.forEach((slot) => slotsSet.add(slot));
    }
  });

  return Array.from(slotsSet).sort((a, b) => timeStringToMinutes(a) - timeStringToMinutes(b));
}

/**
 * Retorna a lista de dias em que o estúdio está aberto (ex: Segunda a Sábado).
 */
export function getOperatingDaysList(
  operatingHoursList: OperatingDayConfig[] = DEFAULT_OPERATING_HOURS
): { id: number; name: string; fullName: string; isOpen: boolean; openTime: string; closeTime: string }[] {
  const nameMap: Record<number, { short: string; full: string }> = {
    0: { short: 'Domingo', full: 'Domingo' },
    1: { short: 'Segunda', full: 'Segunda-feira' },
    2: { short: 'Terça', full: 'Terça-feira' },
    3: { short: 'Quarta', full: 'Quarta-feira' },
    4: { short: 'Quinta', full: 'Quinta-feira' },
    5: { short: 'Sexta', full: 'Sexta-feira' },
    6: { short: 'Sábado', full: 'Sábado' },
  };

  // Ordenar começando na Segunda (1..6, 0)
  const orderedList = [...operatingHoursList].sort((a, b) => {
    const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  return orderedList
    .filter((d) => d.isOpen)
    .map((d) => ({
      id: d.dayOfWeek,
      name: nameMap[d.dayOfWeek]?.short || d.dayName,
      fullName: nameMap[d.dayOfWeek]?.full || d.dayName,
      isOpen: d.isOpen,
      openTime: d.openTime,
      closeTime: d.closeTime,
    }));
}

/**
 * Formata um resumo amigável dos horários de funcionamento para exibir ao aluno.
 * Ex: "Seg a Sex: 06h às 22h • Sáb: 08h às 13h • Dom: Fechado"
 */
export function formatStudioOperatingSummary(
  operatingHoursList: OperatingDayConfig[] = DEFAULT_OPERATING_HOURS
): string {
  const seg = operatingHoursList.find((d) => d.dayOfWeek === 1);
  const sex = operatingHoursList.find((d) => d.dayOfWeek === 5);
  const sab = operatingHoursList.find((d) => d.dayOfWeek === 6);
  const dom = operatingHoursList.find((d) => d.dayOfWeek === 0);

  const parts: string[] = [];

  // Checar se Seg a Sex têm horários iguais
  const weekdaysSame = [2, 3, 4, 5].every((dw) => {
    const day = operatingHoursList.find((d) => d.dayOfWeek === dw);
    return (
      day?.isOpen === seg?.isOpen &&
      day?.openTime === seg?.openTime &&
      day?.closeTime === seg?.closeTime
    );
  });

  if (seg?.isOpen && weekdaysSame) {
    parts.push(`Seg a Sex: ${seg.openTime} às ${seg.closeTime}`);
  } else {
    operatingHoursList
      .filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.isOpen)
      .forEach((d) => {
        parts.push(`${d.dayName.slice(0, 3)}: ${d.openTime}-${d.closeTime}`);
      });
  }

  if (sab?.isOpen) {
    parts.push(`Sáb: ${sab.openTime} às ${sab.closeTime}`);
  } else {
    parts.push('Sáb: Fechado');
  }

  if (dom?.isOpen) {
    parts.push(`Dom: ${dom.openTime} às ${dom.closeTime}`);
  } else {
    parts.push('Dom: Fechado');
  }

  return parts.join(' • ');
}

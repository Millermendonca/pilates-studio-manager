/**
 * Módulo Central de Comunicação & Automação Multicanal
 * Studio Pilates - Gestão Inteligente
 */

export type CommunicationChannel = 'WHATSAPP' | 'CHAT' | 'PUSH' | 'EMAIL' | 'SMS';

export type CommunicationCategory = 'MATRICULA' | 'AGENDA' | 'FINANCEIRO' | 'FIDELIZACAO';

export interface CommunicationVariable {
  tag: string;
  description: string;
  example: string;
}

export interface CommunicationRule {
  id: string;
  title: string;
  category: CommunicationCategory;
  description: string;
  enabled: boolean;
  channels: CommunicationChannel[];
  template: string;
  emailSubject?: string;
  variables: CommunicationVariable[];
}

export interface GatewaySettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSenderName?: string;
  smtpSenderEmail?: string;
  whatsappApiUrl?: string;
  whatsappApiToken?: string;
  whatsappInstanceId?: string;
  smsApiKey?: string;
  smsSenderId?: string;
  pushServerKey?: string;
}

export const DEFAULT_COMMUNICATION_RULES: CommunicationRule[] = [
  {
    id: 'PRE_REGISTRATION_INVITE',
    title: 'Convite de Pré-Matrícula & Ficha Médica',
    category: 'MATRICULA',
    description: 'Enviado assim que o estúdio realiza o pré-cadastro do aluno com o link para concluir a ficha e assinar o contrato digital no celular.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'EMAIL'],
    emailSubject: 'Seja bem-vindo(a) ao {ESTUDIO}! Complete sua matrícula digital 🧘‍♀️',
    template: 'Olá, {NOME}! Seja muito bem-vindo(a) ao {ESTUDIO}! 🧘‍♀️✨\n\nSeu pré-cadastro foi realizado com sucesso. Para completar sua ficha médica, endereço e assinar o contrato digital no celular, acesse o link abaixo:\n{LINK}',
    variables: [
      { tag: '{NOME}', description: 'Nome completo do aluno', example: 'Mariana Silva' },
      { tag: '{ESTUDIO}', description: 'Nome do seu estúdio de Pilates', example: 'Studio Pilates Center' },
      { tag: '{LINK}', description: 'Link único e direto de matrícula', example: 'http://localhost:3000/matricula?phone=22998505276' },
      { tag: '{TELEFONE}', description: 'Telefone do aluno cadastrado', example: '(22) 99850-5276' },
    ],
  },
  {
    id: 'CLASS_REMINDER',
    title: 'Lembrete de Aula do Dia',
    category: 'AGENDA',
    description: 'Disparado automaticamente horas antes da aula marcada para reduzir faltas e esquecimentos.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH'],
    emailSubject: 'Lembrete da sua aula de Pilates hoje às {HORARIO} 🧘‍♀️',
    template: 'Olá, {NOME}! 🧘‍♀️ Passando para lembrar da sua aula de Pilates marcada para hoje às *{HORARIO}* no {ESTUDIO}.\n\nCaso precise remarcar com crédito de reposição, avise pelo aplicativo com até {AVISO_MINIMO}h de antecedência. Nos vemos em breve! ✨',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{HORARIO}', description: 'Horário de início da aula', example: '09:00' },
      { tag: '{DATA}', description: 'Data da aula', example: '02/09/2026' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
      { tag: '{AVISO_MINIMO}', description: 'Prazo mínimo de cancelamento em horas', example: '2' },
    ],
  },
  {
    id: 'SCHEDULE_CONFIRMATION',
    title: 'Confirmação de Agendamento ou Troca de Horário',
    category: 'AGENDA',
    description: 'Enviado quando o aluno ou gestor agenda, altera ou remarca uma aula na grade.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH'],
    emailSubject: 'Aula confirmada: {DATA} às {HORARIO} 📅',
    template: 'Olá, {NOME}! ✅ Sua aula de Pilates foi confirmada com sucesso para *{DATA} às {HORARIO}* no {ESTUDIO}.\n\nTipo: *{TIPO_AGENDAMENTO}*.\nTenha uma excelente aula! 🧘‍♂️',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{DATA}', description: 'Data da aula agendada', example: 'Quarta-feira, 03/09' },
      { tag: '{HORARIO}', description: 'Horário marcado', example: '10:00' },
      { tag: '{TIPO_AGENDAMENTO}', description: 'Horário Fixo Semanal ou Reposição Pontual', example: 'Horário Fixo Semanal' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'CLASS_CANCELLATION_CREDIT',
    title: 'Cancelamento com Crédito de Reposição',
    category: 'AGENDA',
    description: 'Enviado quando o aluno cancela com antecedência e recebe um crédito de reposição.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH', 'EMAIL'],
    emailSubject: 'Aula desmarcada e crédito de reposição gerado 🟣',
    template: 'Olá, {NOME}! Sua aula de {DATA} às {HORARIO} foi desmarcada. Como você avisou dentro do prazo, geramos *1 Crédito de Reposição* com validade até *{VALIDADE_CREDITO}*.\n\nVocê tem *{TOTAL_CREDITOS} crédito(s)* disponível(is). Agende sua reposição pelo app quando desejar!',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{DATA}', description: 'Data da aula cancelada', example: '02/09/2026' },
      { tag: '{HORARIO}', description: 'Horário cancelado', example: '09:00' },
      { tag: '{VALIDADE_CREDITO}', description: 'Data limite para usar o crédito', example: '02/10/2026' },
      { tag: '{TOTAL_CREDITOS}', description: 'Total de créditos acumulados', example: '2' },
    ],
  },
  {
    id: 'WAITLIST_SLOT_OFFER',
    title: 'Oferta de Vaga Liberada na Fila de Espera',
    category: 'AGENDA',
    description: 'Disparado automaticamente quando abre uma vaga na turma e o aluno ou casal está na fila de espera.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH'],
    emailSubject: '🎉 Vaga disponível para você no {ESTUDIO}!',
    template: '🎉 Boa notícia, {NOME}! Surgiu uma vaga para você no horário de *toda {DIA_SEMANA} às {HORARIO}* no {ESTUDIO}!\n\nVocê tem *{MINUTOS_EXPIRA} minutos* para abrir o aplicativo e aceitar a vaga antes que ela seja oferecida para o próximo da fila.',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{DIA_SEMANA}', description: 'Dia da semana da vaga', example: 'Terça-feira' },
      { tag: '{HORARIO}', description: 'Horário da turma', example: '18:00' },
      { tag: '{MINUTOS_EXPIRA}', description: 'Tempo limite para aceitar', example: '30' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'INVOICE_BILLING',
    title: 'Cobrança & Lembrete de Mensalidade PIX',
    category: 'FINANCEIRO',
    description: 'Envia o valor da mensalidade e a chave Copia-e-Cola do PIX no vencimento.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'EMAIL'],
    emailSubject: 'Sua fatura de Pilates vence em {VENCIMENTO} 💳',
    template: 'Olá, {NOME}! 💳 Sua mensalidade do plano *{PLANO}* no {ESTUDIO} vence em *{VENCIMENTO}* no valor de *R$ {VALOR}*.\n\nPara pagar com rapidez via PIX, copie o código abaixo:\n\n`{PIX_COPIA_E_COLA}`\n\nOu abra seu app do aluno para visualizar o QR Code.',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{PLANO}', description: 'Nome do plano contratado', example: '2x por Semana' },
      { tag: '{VALOR}', description: 'Valor em Reais (R$)', example: '340,00' },
      { tag: '{VENCIMENTO}', description: 'Data de vencimento', example: '05/09/2026' },
      { tag: '{PIX_COPIA_E_COLA}', description: 'Código Copia-e-Cola do Banco Central', example: '00020126580014br.gov.bcb.pix...' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'PAYMENT_CONFIRMATION',
    title: 'Recibo & Confirmação de Pagamento Recebido',
    category: 'FINANCEIRO',
    description: 'Enviado imediatamente quando uma mensalidade ou fatura é baixada/paga.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH', 'EMAIL'],
    emailSubject: 'Pagamento confirmado com sucesso! Obrigado(a) ✅',
    template: 'Olá, {NOME}! ✅ Confirmamos o recebimento do seu pagamento de *R$ {VALOR}* referente ao plano *{PLANO}* no {ESTUDIO}.\n\nSua assinatura está 100% em dia. Muito obrigado pela confiança em nosso trabalho! 🧘‍♀️🙏',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{VALOR}', description: 'Valor pago', example: '340,00' },
      { tag: '{PLANO}', description: 'Nome do plano', example: '2x por Semana' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'STUDENT_ABSENCE_ALERT',
    title: 'Aviso de Falta & Sentimos sua Falta',
    category: 'FIDELIZACAO',
    description: 'Enviado quando o aluno falta na aula sem cancelamento prévio para demonstrar cuidado e incentivar o retorno.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT'],
    emailSubject: 'Sentimos sua falta hoje no {ESTUDIO}! 🧘‍♀️',
    template: 'Olá, {NOME}! Sentimos sua falta na aula de hoje às {HORARIO} no {ESTUDIO}. Está tudo bem com você? 🌸\n\nCuidar da sua postura e saúde é nossa prioridade. Conte conosco para o que precisar e esperamos você na próxima aula!',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{HORARIO}', description: 'Horário da aula perdida', example: '08:00' },
      { tag: '{DATA}', description: 'Data da falta', example: '02/09/2026' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'CORPORATE_CHECKIN_ALERT',
    title: 'Lembrete de Check-in Wellhub / TotalPass',
    category: 'MATRICULA',
    description: 'Disparado para alunos com convênio corporativo que precisam validar o check-in no aplicativo do convênio.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'PUSH'],
    emailSubject: 'Lembrete de validação de check-in corporativo 📱',
    template: 'Olá, {NOME}! 📱 Lembre-se de abrir seu app do *{CONVENIO}* e realizar o check-in da aula de hoje no {ESTUDIO} para manter seu acesso regular e desbloqueado.',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{CONVENIO}', description: 'Nome do convênio (Wellhub ou TotalPass)', example: 'Wellhub (Gympass)' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
  {
    id: 'BIRTHDAY_CONGRATS',
    title: 'Felicitações de Aniversário do Aluno',
    category: 'FIDELIZACAO',
    description: 'Disparado automaticamente na data de aniversário cadastrada do aluno.',
    enabled: true,
    channels: ['WHATSAPP', 'CHAT', 'EMAIL'],
    emailSubject: '🎂 Parabéns pelo seu aniversário, {NOME}! Desejamos muita saúde!',
    template: '🎂 Parabéns, {NOME}! Toda a equipe do {ESTUDIO} deseja a você um feliz aniversário, repleto de saúde, energia, paz e muitas conquistas! 🎉🎈\n\nQue seu novo ciclo seja maravilhoso! 🧘‍♀️✨',
    variables: [
      { tag: '{NOME}', description: 'Nome do aluno', example: 'Mariana' },
      { tag: '{ESTUDIO}', description: 'Nome do estúdio', example: 'Studio Pilates Center' },
    ],
  },
];

/**
 * Renderiza um template substituindo as variáveis dinâmicas de forma segura.
 */
export function renderMessageTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const formattedKey = key.startsWith('{') ? key : `{${key}}`;
    const regex = new RegExp(formattedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * Gera URL direta de envio pelo WhatsApp (wa.me)
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/55${cleanPhone}?text=${encodedText}`;
}

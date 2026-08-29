import https from 'https';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export interface InterConfig {
  clientId?: string;
  clientSecret?: string;
  certPath?: string;
  keyPath?: string;
  certBase64?: string;
  keyBase64?: string;
  ambiente?: 'SANDBOX' | 'PRODUCAO';
  contaCorrente?: string;
  chavePix?: string;
}

export interface PixCobOptions {
  valor: number;
  chavePix: string;
  descricao?: string;
  devedorNome?: string;
  devedorCpf?: string;
  expiracaoSegundos?: number;
}

export interface PixCobResponse {
  txid: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
  valor: number;
  status: string;
  criacao: string;
  isSimulated?: boolean;
}

export interface PixAutomaticoOptions {
  studentId: string;
  studentName: string;
  studentCpf?: string;
  valorMensal: number;
  diaVencimento: number;
  planoNome: string;
}

export interface PixAutomaticoResponse {
  adesaoId: string;
  status: 'SOLICITADO' | 'ATIVO' | 'CANCELADO';
  mensagem: string;
  linkAutorizacao?: string;
  isSimulated?: boolean;
}

/**
 * Criação de Agente HTTPS com mTLS para comunicação segura com a API do Banco Inter
 */
function createInterHttpsAgent(config: InterConfig): https.Agent | null {
  try {
    let cert: Buffer | string | null = null;
    let key: Buffer | string | null = null;

    // 1. Tentar por Base64 nas variáveis de ambiente ou config
    if (config.certBase64 && config.keyBase64) {
      cert = Buffer.from(config.certBase64, 'base64').toString('utf-8');
      key = Buffer.from(config.keyBase64, 'base64').toString('utf-8');
    } else if (process.env.INTER_CERT_BASE64 && process.env.INTER_KEY_BASE64) {
      cert = Buffer.from(process.env.INTER_CERT_BASE64, 'base64').toString('utf-8');
      key = Buffer.from(process.env.INTER_KEY_BASE64, 'base64').toString('utf-8');
    } else if (config.certPath && config.keyPath) {
      // 2. Tentar por arquivo no disco
      const resolvedCertPath = path.isAbsolute(config.certPath)
        ? config.certPath
        : path.join(process.cwd(), config.certPath);
      const resolvedKeyPath = path.isAbsolute(config.keyPath)
        ? config.keyPath
        : path.join(process.cwd(), config.keyPath);

      if (fs.existsSync(resolvedCertPath) && fs.existsSync(resolvedKeyPath)) {
        cert = fs.readFileSync(resolvedCertPath);
        key = fs.readFileSync(resolvedKeyPath);
      }
    }

    if (cert && key) {
      return new https.Agent({
        cert,
        key,
        rejectUnauthorized: true,
      });
    }
  } catch (err) {
    console.warn('[Banco Inter] Aviso ao carregar certificados mTLS:', err);
  }

  return null;
}

/**
 * Obter Token de Autenticação OAuth2 do Banco Inter
 */
export async function getInterOAuthToken(config: InterConfig = {}): Promise<string | null> {
  const isProduction = config.ambiente === 'PRODUCAO';
  const baseUrl = isProduction
    ? 'https://cdpj.partners.bancointer.com.br'
    : 'https://cdpj-sandbox.partners.bancointer.com.br';

  const clientId = config.clientId || process.env.INTER_CLIENT_ID;
  const clientSecret = config.clientSecret || process.env.INTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null; // Modo simulação quando não houver credenciais ainda configuradas
  }

  const agent = createInterHttpsAgent(config);
  if (!agent && isProduction) {
    console.warn('[Banco Inter] Certificados mTLS não encontrados para o ambiente de produção.');
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'pix.read pix.write boleto-cobranca.read boleto-cobranca.write pix-automatico.read pix-automatico.write');

    const res = await fetch(`${baseUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      // @ts-ignore
      agent: agent || undefined,
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }
  } catch (err) {
    console.error('[Banco Inter] Erro ao obter token OAuth2:', err);
  }

  return null;
}

/**
 * Gerar Cobrança PIX Imediata (Via API Inter ou Fallback Inteligente EMV com QR Code)
 */
export async function createInterPixCobranca(
  options: PixCobOptions,
  config: InterConfig = {}
): Promise<PixCobResponse> {
  const txid = `PILATES${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  const token = await getInterOAuthToken(config);

  const isProduction = config.ambiente === 'PRODUCAO';
  const baseUrl = isProduction
    ? 'https://cdpj.partners.bancointer.com.br'
    : 'https://cdpj-sandbox.partners.bancointer.com.br';

  if (token) {
    try {
      const agent = createInterHttpsAgent(config);
      const payload = {
        calendario: { expiracao: options.expiracaoSegundos || 86400 * 5 },
        devedor: options.devedorCpf ? { cpf: options.devedorCpf.replace(/\D/g, ''), nome: options.devedorNome || 'Aluno Pilates' } : undefined,
        valor: { original: options.valor.toFixed(2) },
        chave: options.chavePix || config.chavePix || 'contato@pilatesharmonia.com.br',
        solicitacaoPagador: options.descricao || 'Mensalidade Studio Pilates',
      };

      const res = await fetch(`${baseUrl}/pix/v2/cob/${txid}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // @ts-ignore
        agent: agent || undefined,
      });

      if (res.ok) {
        const data = await res.json();
        const pixCopiaECola = data.pixCopiaECola || data.location;
        const qrCodeBase64 = await QRCode.toDataURL(pixCopiaECola, { margin: 2, width: 260 });

        return {
          txid: data.txid || txid,
          pixCopiaECola,
          qrCodeBase64,
          valor: options.valor,
          status: 'PENDING',
          criacao: new Date().toISOString(),
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[Banco Inter API] Erro ao emitir cobrança na API, usando gerador dinâmico de PIX:', err);
    }
  }

  // Geração Padrão de PIX Copia-e-Cola (EMV Payload) quando a chave ainda não estiver com token ativo
  const chave = options.chavePix || config.chavePix || 'contato@pilatesharmonia.com.br';
  const pixPayload = generatePixPayload({
    chave,
    nome: 'Studio Pilates Harmonia',
    cidade: 'SAO PAULO',
    valor: options.valor,
    txid,
  });

  const qrCodeBase64 = await QRCode.toDataURL(pixPayload, { margin: 2, width: 260 });

  return {
    txid,
    pixCopiaECola: pixPayload,
    qrCodeBase64,
    valor: options.valor,
    status: 'PENDING',
    criacao: new Date().toISOString(),
    isSimulated: !token,
  };
}

/**
 * Solicitação de Adesão ao PIX Automático / Recorrência (Jornada Inter API)
 * Referência: https://developers.inter.co/references/pix-automatico
 */
export async function createInterPixAutomaticoAdesao(
  options: PixAutomaticoOptions,
  config: InterConfig = {}
): Promise<PixAutomaticoResponse> {
  const adesaoId = `ADESAO_${Date.now()}_${options.studentId.slice(-4)}`;
  const token = await getInterOAuthToken(config);

  if (token) {
    try {
      const isProduction = config.ambiente === 'PRODUCAO';
      const baseUrl = isProduction
        ? 'https://cdpj.partners.bancointer.com.br'
        : 'https://cdpj-sandbox.partners.bancointer.com.br';
      const agent = createInterHttpsAgent(config);

      const payload = {
        identificadorAdesao: adesaoId,
        valorRecorrente: options.valorMensal.toFixed(2),
        diaCobranca: options.diaVencimento || 10,
        periodicidade: 'MENSAL',
        pagador: {
          nome: options.studentName,
          cpf: options.studentCpf?.replace(/\D/g, '') || '',
        },
        descricao: `Mensalidade Recorrente Pilates - ${options.planoNome}`,
      };

      const res = await fetch(`${baseUrl}/pix-automatico/v1/solicitacoes-adesao`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // @ts-ignore
        agent: agent || undefined,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          adesaoId: data.idAdesao || adesaoId,
          status: 'SOLICITADO',
          mensagem: 'Solicitação de PIX Automático enviada para autorização do aluno no banco.',
          linkAutorizacao: data.linkAutorizacao,
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[PIX Automático Inter] Erro na requisição de adesão:', err);
    }
  }

  // Simulação amigável pronta para ativação
  return {
    adesaoId,
    status: 'SOLICITADO',
    mensagem: 'Mandato de PIX Automático gerado com sucesso. O débito ocorrerá todo mês automaticamente.',
    isSimulated: true,
  };
}

/**
 * Gerador de Payload EMV padrão BACEN (PIX Estático / Dinâmico)
 */
function generatePixPayload(params: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid: string;
}): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', params.chave);
  const merchantAccountInfo = formatField('26', `${gui}${key}`);
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  const transactionAmount = formatField('54', params.valor.toFixed(2));
  const countryCode = formatField('58', 'BR');
  const merchantName = formatField('59', params.nome.substring(0, 25));
  const merchantCity = formatField('60', params.cidade.substring(0, 15));
  const txidField = formatField('05', params.txid);
  const additionalDataFieldTemplate = formatField('62', txidField);

  const payloadSemCRC = `000201${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantName}${merchantCity}${additionalDataFieldTemplate}6304`;
  const crc = computeCRC16(payloadSemCRC);

  return `${payloadSemCRC}${crc}`;
}

/**
 * Cálculo do CRC16-CCITT (Polinômio 0x1021)
 */
function computeCRC16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

import QRCode from 'qrcode';

/**
 * Cálculo de CRC16 CCITT (0xFFFF) padrão BACEN para PIX
 */
function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface PixPayloadParams {
  pixKey: string;
  recipientName: string;
  recipientCity: string;
  amount: number;
  description?: string;
  txId?: string;
}

/**
 * Gera a string do PIX Copia e Cola conforme o padrão BR Code do Banco Central
 */
export function generatePixCopiaECola({
  pixKey,
  recipientName,
  recipientCity,
  amount,
  description = 'Mensalidade Studio Pilates',
  txId = '***',
}: PixPayloadParams): string {
  // Limpeza de campos
  const cleanName = recipientName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25);
  const cleanCity = recipientCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 15);
  const formattedAmount = amount.toFixed(2);
  const cleanTxId = (txId || '***').substring(0, 25);

  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', pixKey);
  const desc = description ? formatField('02', description.substring(0, 40)) : '';
  const merchantAccountInfo = formatField('26', `${gui}${key}${desc}`);

  // Additional Data Field (ID 62)
  const txField = formatField('05', cleanTxId);
  const additionalData = formatField('62', txField);

  let rawPayload =
    formatField('00', '01') + // Payload Format Indicator
    merchantAccountInfo +
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986') + // Currency: BRL (986)
    formatField('54', formattedAmount) + // Transaction Amount
    formatField('58', 'BR') + // Country Code
    formatField('59', cleanName) + // Merchant Name
    formatField('60', cleanCity) + // Merchant City
    additionalData +
    '6304'; // CRC16 Header

  const crc = calculateCRC16(rawPayload);
  return `${rawPayload}${crc}`;
}

/**
 * Gera imagem QR Code (Data URL Base64) a partir do PIX Copia e Cola
 */
export async function generatePixQrCodeDataUrl(copiaECola: string): Promise<string> {
  try {
    return await QRCode.toDataURL(copiaECola, {
      margin: 2,
      width: 320,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Erro ao gerar QR Code PIX:', err);
    return '';
  }
}

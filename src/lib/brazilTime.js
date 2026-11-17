/**
 * Utilitários de Data e Hora padronizados para o fuso oficial do Brasil (America/Sao_Paulo / UTC-3).
 * Evita bugs de virada de dia às 21h00 BRT causados por .toISOString() (UTC) e problemas de parsing no Safari/iOS.
 */

export const BRAZIL_TZ = 'America/Sao_Paulo';

const brazilPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BRAZIL_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Extrai componentes de data e hora no fuso America/Sao_Paulo de forma 100% compatível com Safari/iOS e Node.
 */
export function getBrazilNowParts(date = new Date()) {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date);
  const parts = brazilPartsFormatter.formatToParts(validDate);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);
  const second = Number(map.second);

  const yearStr = String(year).padStart(4, '0');
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    yearStr,
    monthStr,
    dayStr,
    hourStr,
    minuteStr,
    dateStr: `${yearStr}-${monthStr}-${dayStr}`,
    yearMonth: `${yearStr}-${monthStr}`,
  };
}

/**
 * Retorna a data de hoje (ou de um Date/ISO) em 'YYYY-MM-DD' no fuso America/Sao_Paulo.
 */
export function getBrazilDateString(date = new Date()) {
  return getBrazilNowParts(date).dateStr;
}

/**
 * Retorna 'YYYY-MM' no fuso America/Sao_Paulo.
 */
export function getBrazilYearMonth(date = new Date()) {
  return getBrazilNowParts(date).yearMonth;
}

/**
 * Retorna a hora atual (0..23) em America/Sao_Paulo.
 */
export function getBrazilHour(date = new Date()) {
  return getBrazilNowParts(date).hour;
}

/**
 * Retorna o total de minutos desde 00:00 em America/Sao_Paulo.
 */
export function getBrazilMinutesNow(date = new Date()) {
  const { hour, minute } = getBrazilNowParts(date);
  return hour * 60 + minute;
}

/**
 * Retorna 'YYYY-MM-DD' de N dias atrás (ou à frente se negativo) no calendário do Brasil.
 */
export function getBrazilDateOffset(offsetDays = 0, baseDate = new Date()) {
  const { year, month, day } = getBrazilNowParts(baseDate);
  const utcNoon = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata um objeto Date local (criado via new Date(ano, mesIndex, dia)) para 'YYYY-MM-DD' sem conversão UTC.
 */
export function formatLocalDateYYYYMMDD(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte data ('YYYY-MM-DD') + horário ('HH:mm') de Brasília (UTC-03:00) para timestamp em ms,
 * sem usar Date.parse em string (100% imune a falhas do Safari/iOS).
 */
export function parseBrazilDateTimeMs(dateStr, timeStr = '00:00') {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  const cleanDate = dateStr.split('T')[0];
  const [y, m, d] = cleanDate.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  if (!y || !m || !d || isNaN(hh) || isNaN(mm)) return NaN;
  // Brasília = UTC-3 -> somar 3 horas para obter o instante UTC exato
  return Date.UTC(y, m - 1, d, hh + 3, mm, 0, 0);
}


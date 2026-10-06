const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** 1305 → "1 305" (separador de miles con espacio, como en el diseño). */
export const formatearMiles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** "HH:MM" de una fecha. */
export const formatearHora = (fecha: Date) => `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

/** "dd/MM" de una fecha. */
export const formatearDiaMes = (fecha: Date) => `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}`;

const inicioDelDia = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();

/** Días calendario entre dos fechas (0 = mismo día). */
export const diasDeDiferencia = (desde: Date, hasta: Date) =>
  Math.round((inicioDelDia(hasta) - inicioDelDia(desde)) / 86_400_000);

/** "23:15 +1d" cuando la hora cae en otro día que la referencia, "15:15" si es el mismo. */
export const formatearHoraRelativa = (fecha: Date, referencia: Date) => {
  const dias = diasDeDiferencia(referencia, fecha);
  return dias === 0 ? formatearHora(fecha) : `${formatearHora(fecha)} +${dias}d`;
};

/** 240 → "4 h 00 min"; 38 → "38 min". */
export const formatearDuracion = (minutos: number) => {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return horas === 0 ? `${resto} min` : `${horas} h ${dosDigitos(resto)} min`;
};

/** Holgura en "HH:MM", con signo negativo si ya venció: 56 → "00:56", -36 → "-00:36". */
export const formatearHolgura = (minutos: number) => {
  const absoluto = Math.abs(Math.round(minutos));
  const texto = `${dosDigitos(Math.floor(absoluto / 60))}:${dosDigitos(absoluto % 60)}`;
  return minutos < 0 ? `-${texto}` : texto;
};

export const sumarMinutos = (fecha: Date, minutos: number) => new Date(fecha.getTime() + minutos * 60_000);

/** "moto o auto" → "Moto o auto". */
export const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** ["bicicleta", "moto"] → "bicicleta o moto". */
export const unirAlternativas = (partes: string[], conector = 'o') =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} ${conector} ${partes[partes.length - 1]}`;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "28 ago 2026 · 14:37:20" (sin segundos: "28 ago 2026 · 14:37"). */
export const formatearFechaLarga = (fecha: Date, conSegundos = true) =>
  `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()} · ${formatearHora(fecha)}` +
  (conSegundos ? `:${dosDigitos(fecha.getSeconds())}` : '');

/** "03/09/2026 · 00:00" (con segundos: "03/09/2026 · 00:00:00"). */
export const formatearFechaNumerica = (fecha: Date, conSegundos = false) =>
  `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()} · ${formatearHora(fecha)}` +
  (conSegundos ? `:${dosDigitos(fecha.getSeconds())}` : '');

/** Duración real como cronómetro: "21:14" o "1:05:09". */
export const formatearCronometro = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${dosDigitos(m)}:${dosDigitos(s)}` : `${dosDigitos(m)}:${dosDigitos(s)}`;
};

/** Duración simulada larga: "4 d 09 h 12 m". */
export const formatearDiasHoras = (ms: number) => {
  const minutos = Math.floor(ms / 60_000);
  return `${Math.floor(minutos / 1440)} d ${dosDigitos(Math.floor((minutos % 1440) / 60))} h ${dosDigitos(minutos % 60)} m`;
};

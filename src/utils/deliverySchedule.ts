export type LastDayDeliveryPhase =
  | "inactive"
  | "en_route"
  | "arriving"
  | "nearby"
  | "arrived"
  | "reschedule";

export interface SaoPauloTimeParts {
  dateKey: string;
  hour: number;
  minute: number;
  second: number;
  totalSeconds: number;
}

export interface LastDayDeliveryInput {
  now?: Date;
  statusLabel?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
}

export interface LastDayDeliveryEvaluation {
  isOutForDeliveryLastDay: boolean;
  phase: LastDayDeliveryPhase;
  headline: string;
  subtext: string;
  routeProgress: number;
  keepEstimatedDeliveryUnchanged: boolean;
  saoPauloTimeLabel: string;
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

function normalizeDateInput(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const raw = String(input || "").trim();
  if (!raw) return null;

  // Date-only ISO strings (YYYY-MM-DD) should stay on that calendar date in BRT
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00-03:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSaoPauloTimeParts(date: Date = new Date()): SaoPauloTimeParts {
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(safeDate);
  const byType: Record<string, string> = {};
  for (const part of parts) {
    byType[part.type] = part.value;
  }

  const year = byType.year || "1970";
  const month = byType.month || "01";
  const day = byType.day || "01";
  const rawHour = Number(byType.hour || 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(byType.minute || 0);
  const second = Number(byType.second || 0);

  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
    second,
    totalSeconds: hour * 3600 + minute * 60 + second,
  };
}

export function getSaoPauloDateKey(input: string | Date): string | null {
  const date = normalizeDateInput(input);
  if (!date) return null;
  return getSaoPauloTimeParts(date).dateKey;
}

export function formatDateSaoPauloBR(input?: string | Date | null): string {
  if (!input) return "";
  const date = normalizeDateInput(input);
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeSaoPauloBR(input?: string | Date | null): string {
  if (!input) return "";
  const date = normalizeDateInput(input);
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function evaluateLastDayDeliverySchedule(
  input: LastDayDeliveryInput
): LastDayDeliveryEvaluation {
  const now = input.now instanceof Date && !Number.isNaN(input.now.getTime())
    ? input.now
    : new Date();
  const timeParts = getSaoPauloTimeParts(now);
  const hh = String(timeParts.hour).padStart(2, "0");
  const mm = String(timeParts.minute).padStart(2, "0");
  const saoPauloTimeLabel = `${hh}:${mm}`;

  const normalizedStatus = (input.statusLabel || "").toLowerCase().trim();
  const isDelivered =
    Boolean(input.deliveredAt) || normalizedStatus.includes("entregue");
  const isCancelled = normalizedStatus.includes("cancelad");

  if (isDelivered || isCancelled) {
    return {
      isOutForDeliveryLastDay: false,
      phase: "inactive",
      headline: input.statusLabel || (isDelivered ? "Entregue" : "Cancelado"),
      subtext: isDelivered
        ? "Pedido entregue no endereço cadastrado"
        : "Pedido cancelado",
      routeProgress: isDelivered ? 0.98 : 0.05,
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  const hasOutForDeliveryStatus =
    normalizedStatus.includes("saiu para entrega");
  const estimatedDateKey = input.estimatedDeliveryAt
    ? getSaoPauloDateKey(input.estimatedDeliveryAt)
    : null;
  const isEstimatedToday =
    Boolean(estimatedDateKey) && estimatedDateKey === timeParts.dateKey;

  const isOutForDeliveryLastDay = hasOutForDeliveryStatus || isEstimatedToday;

  if (!isOutForDeliveryLastDay) {
    const dayRatio = Math.max(0, Math.min(1, timeParts.totalSeconds / 86400));
    const activeCircuitProgress = Number((0.28 + dayRatio * 0.36).toFixed(4));

    return {
      isOutForDeliveryLastDay: false,
      phase: "inactive",
      headline: "Em rota na região",
      subtext: "Seu pedido segue no veículo junto com outras entregas em andamento",
      routeProgress: activeCircuitProgress,
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  const t = timeParts.totalSeconds;
  const H19 = 19 * 3600;
  const H20 = 20 * 3600;
  const H21 = 21 * 3600;
  const H21_30 = 21 * 3600 + 30 * 60;

  if (t < H19) {
    const startSec = 8 * 3600;
    const ratio = Math.max(0, Math.min(1, (t - startSec) / (H19 - startSec)));
    return {
      isOutForDeliveryLastDay: true,
      phase: "en_route",
      headline: "Em rota na região",
      subtext: "Veículo realizando outras entregas na região — seu pedido está a bordo",
      routeProgress: 0.18 + ratio * (0.48 - 0.18),
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  if (t < H20) {
    const ratio = (t - H19) / (H20 - H19);
    return {
      isOutForDeliveryLastDay: true,
      phase: "arriving",
      headline: "Seu pedido começa a chegar",
      subtext: "Concluindo entregas próximas na região com seu pedido a bordo",
      routeProgress: 0.48 + ratio * (0.74 - 0.48),
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  if (t < H21) {
    const ratio = (t - H20) / (H21 - H20);
    return {
      isOutForDeliveryLastDay: true,
      phase: "nearby",
      headline: "Seu pedido está próximo",
      subtext: "Veículo finalizando paradas vizinhas na sua região",
      routeProgress: 0.74 + ratio * (0.94 - 0.74),
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  if (t <= H21_30) {
    return {
      isOutForDeliveryLastDay: true,
      phase: "arrived",
      headline: "Seu pedido chegou",
      subtext: "Veículo de entregas chegou na sua região",
      routeProgress: 0.97,
      keepEstimatedDeliveryUnchanged: false,
      saoPauloTimeLabel,
    };
  }

  return {
    isOutForDeliveryLastDay: true,
    phase: "reschedule",
    headline: "Seu pedido será remarcado para outra data",
    subtext: "Previsão de entrega mantida conforme o agendamento atual",
    routeProgress: 0.97,
    keepEstimatedDeliveryUnchanged: true,
    saoPauloTimeLabel,
  };
}

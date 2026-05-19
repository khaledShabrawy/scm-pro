// APICS CPIM V8.1 — Official Formulas & Algorithms

// ─── DEMAND PLANNING ────────────────────────────────────

/** Simple Exponential Smoothing: Ft+1 = Ft + α(At - Ft) */
export function ses(data: number[], alpha: number): number[] {
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(result[i - 1] + alpha * (data[i - 1] - result[i - 1]));
  }
  return result;
}

/** Holt's Double Exponential (Trend): Level + Trend */
export function holt(data: number[], alpha: number, beta: number): number[] {
  let L = data[0];
  let T = data[1] - data[0];
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const prevL = L;
    L = alpha * data[i] + (1 - alpha) * (L + T);
    T = beta * (L - prevL) + (1 - beta) * T;
    result.push(L + T);
  }
  return result;
}

/** Holt-Winters Triple Exponential (Trend + Seasonality) */
export function holtWinters(
  data: number[], alpha: number, beta: number, gamma: number, period: number
): number[] {
  const seasonals: number[] = [];
  for (let i = 0; i < period; i++) {
    seasonals.push(data[i] / (data.reduce((s, v) => s + v, 0) / data.length));
  }
  let L = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  let T = 0;
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const s = seasonals[i % period];
    const prevL = L;
    L = alpha * (data[i] / s) + (1 - alpha) * (L + T);
    T = beta * (L - prevL) + (1 - beta) * T;
    seasonals[i % period] = gamma * (data[i] / L) + (1 - gamma) * s;
    result.push((L + T) * seasonals[i % period]);
  }
  return result;
}

// ─── APICS ERROR METRICS ────────────────────────────────

/** MAD: Σ|A-F| / n  (APICS preferred metric) */
export function mad(actual: number[], forecast: number[]): number {
  const n = Math.min(actual.length, forecast.length);
  return actual.slice(0, n).reduce((s, a, i) => s + Math.abs(a - forecast[i]), 0) / n;
}

/** MAPE: Σ|(A-F)/A| / n × 100 */
export function mape(actual: number[], forecast: number[]): number {
  const n = Math.min(actual.length, forecast.length);
  const valid = actual.slice(0, n).map((a, i) => a !== 0 ? Math.abs((a - forecast[i]) / a) : 0);
  return (valid.reduce((s, v) => s + v, 0) / n) * 100;
}

/** WMAPE: Σ|A-F| / ΣA × 100  (volume-weighted, preferred over MAPE) */
export function wmape(actual: number[], forecast: number[]): number {
  const n = Math.min(actual.length, forecast.length);
  const sumAbs = actual.slice(0, n).reduce((s, a, i) => s + Math.abs(a - forecast[i]), 0);
  const sumActual = actual.slice(0, n).reduce((s, a) => s + a, 0);
  return sumActual === 0 ? 0 : (sumAbs / sumActual) * 100;
}

/** Tracking Signal (APICS): RSFE / MAD  — Alert if |TS| > ±4 */
export function trackingSignal(actual: number[], forecast: number[]): number {
  const n = Math.min(actual.length, forecast.length);
  const rsfe = actual.slice(0, n).reduce((s, a, i) => s + (a - forecast[i]), 0);
  const madVal = mad(actual, forecast);
  return madVal === 0 ? 0 : rsfe / madVal;
}

/** Bias = RSFE / n */
export function bias(actual: number[], forecast: number[]): number {
  const n = Math.min(actual.length, forecast.length);
  return actual.slice(0, n).reduce((s, a, i) => s + (a - forecast[i]), 0) / n;
}

// ─── INVENTORY (APICS CPIM V8.1) ────────────────────────

/**
 * Safety Stock — APICS Formula (variable demand + variable LT)
 * SS = Z × √(LT_avg × σ²_demand + D²_avg × σ²_LT)
 */
export function safetyStock(
  Z: number,
  avgLT: number,
  sigmaDemand: number,
  avgDemand: number,
  sigmaLT: number
): number {
  return Z * Math.sqrt(avgLT * sigmaDemand ** 2 + avgDemand ** 2 * sigmaLT ** 2);
}

/** Service level Z-values (APICS standard table) */
export const SERVICE_LEVEL_Z: Record<number, number> = {
  50: 0.000, 75: 0.674, 80: 0.842, 84: 1.000,
  85: 1.036, 90: 1.282, 92: 1.405, 95: 1.645,
  97: 1.881, 98: 2.054, 99: 2.326, 99.5: 2.576, 99.9: 3.090,
};

/** ROP = (D̄ × LT) + SS */
export function reorderPoint(avgDailyDemand: number, leadTimeDays: number, ss: number): number {
  return avgDailyDemand * leadTimeDays + ss;
}

/** Average Inventory = Q/2 + SS  (APICS) */
export function avgInventory(orderQty: number, ss: number): number {
  return orderQty / 2 + ss;
}

/**
 * EOQ = √(2DS / iC)  (APICS standard)
 * D=annual demand, S=order cost, i=carrying rate, C=unit cost
 */
export function eoq(D: number, S: number, i: number, C: number): number {
  return Math.sqrt((2 * D * S) / (i * C));
}

/** Total Annual Inventory Cost = (D/Q)×S + (Q/2)×i×C */
export function totalInventoryCost(D: number, Q: number, S: number, i: number, C: number): number {
  return (D / Q) * S + (Q / 2) * i * C;
}

/** POQ (Periodic Order Quantity) = EOQ / avg weekly demand */
export function poq(eoqVal: number, avgWeeklyDemand: number): number {
  return eoqVal / avgWeeklyDemand;
}

/**
 * Kanban = (D × LT × (1 + α)) / C   (APICS/Lean)
 * D=demand/period, LT=lead time periods, α=safety factor, C=container size
 */
export function kanban(D: number, LT: number, alpha: number, C: number): number {
  return Math.ceil((D * LT * (1 + alpha)) / C);
}

/** Takt Time = Available time / Customer demand */
export function taktTime(availableTime: number, customerDemand: number): number {
  return availableTime / customerDemand;
}

// ─── CAPACITY (APICS) ────────────────────────────────────

/** Utilization = Actual Hours / Available Hours × 100 */
export function utilization(actualHours: number, availableHours: number): number {
  return (actualHours / availableHours) * 100;
}

/** Efficiency = Standard Hours / Actual Hours × 100 */
export function efficiency(stdHours: number, actualHours: number): number {
  return (stdHours / actualHours) * 100;
}

/** Rated Capacity = Available × Utilization% × Efficiency% */
export function ratedCapacity(available: number, util: number, eff: number): number {
  return available * (util / 100) * (eff / 100);
}

/** OEE = Availability × Performance × Quality */
export function oee(availability: number, performance: number, quality: number): number {
  return availability * performance * quality * 100;
}

// ─── S&OP (APICS) ────────────────────────────────────────

/** Required Production = Forecast + Desired EI - BI + Backlog */
export function requiredProduction(
  forecast: number, desiredEI: number, beginningInv: number, backlog: number
): number {
  return forecast + desiredEI - beginningInv + backlog;
}

/** Closing Inventory = Opening + Production - Sales */
export function closingInventory(opening: number, production: number, sales: number): number {
  return opening + production - sales;
}

// ─── FINANCIAL / SCOR ────────────────────────────────────

/** Inventory Turns = COGS / Avg Inventory Value */
export function inventoryTurns(cogs: number, avgInvValue: number): number {
  return cogs / avgInvValue;
}

/** DIO = Inventory / COGS × 365 */
export function dio(inventory: number, cogs: number): number {
  return (inventory / cogs) * 365;
}

/** DSO = Receivables / Revenue × 365 */
export function dso(receivables: number, revenue: number): number {
  return (receivables / revenue) * 365;
}

/** DPO = Payables / COGS × 365 */
export function dpo(payables: number, cogs: number): number {
  return (payables / cogs) * 365;
}

/** Cash-to-Cash = DIO + DSO - DPO */
export function cashToCash(dioVal: number, dsoVal: number, dpoVal: number): number {
  return dioVal + dsoVal - dpoVal;
}

// ─── QUALITY ─────────────────────────────────────────────

/** Cp = (USL - LSL) / 6σ */
export function cp(usl: number, lsl: number, sigma: number): number {
  return (usl - lsl) / (6 * sigma);
}

/** Cpk = min[(USL-μ)/3σ, (μ-LSL)/3σ] */
export function cpk(usl: number, lsl: number, mu: number, sigma: number): number {
  return Math.min((usl - mu) / (3 * sigma), (mu - lsl) / (3 * sigma));
}

/** DPMO = (Defects / (Units × Opportunities)) × 1,000,000 */
export function dpmo(defects: number, units: number, opportunities: number): number {
  return (defects / (units * opportunities)) * 1_000_000;
}

// ─── ABC CLASSIFICATION ──────────────────────────────────

export function abcClassify(items: { id: string; value: number }[]): { id: string; class: "A"|"B"|"C" }[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  let cum = 0;
  return sorted.map(item => {
    cum += item.value / total;
    return { id: item.id, class: cum <= 0.8 ? "A" : cum <= 0.95 ? "B" : "C" };
  });
}

/** CV = σ/μ → X(<0.5), Y(0.5-1.0), Z(>1.0) */
export function xyzClassify(cv: number): "X"|"Y"|"Z" {
  return cv < 0.5 ? "X" : cv <= 1.0 ? "Y" : "Z";
}

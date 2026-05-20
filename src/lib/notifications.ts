// ─── SCM Pro Notifications / Alert Engine ─────────────────────────────────────
// Generates live alerts from inventory, forecast, and supply data.
// Used by every page's Navbar via the `alerts` prop.

export type AlertLevel = "high" | "medium" | "low";

export interface Alert {
  id:    string;
  level: AlertLevel;
  msg:   string;
  page:  string;
}

// ── Inventory Alerts ──────────────────────────────────────────────────────────
// Based on INV_TABLE from inventory/page.tsx
interface InvItem {
  sku: string; name: string; onHand: number;
  rop: number; ss: number; status: string;
}

export function inventoryAlerts(items: InvItem[]): Alert[] {
  return items.flatMap(item => {
    const alerts: Alert[] = [];
    if (item.onHand < item.rop) {
      alerts.push({
        id: `inv-rop-${item.sku}`,
        level: "high",
        msg: `${item.name} — On-Hand (${item.onHand.toLocaleString()}) below ROP (${item.rop.toLocaleString()})`,
        page: "Inventory · EOQ Table",
      });
    } else if (item.onHand < item.ss * 1.5) {
      alerts.push({
        id: `inv-ss-${item.sku}`,
        level: "medium",
        msg: `${item.name} — Stock approaching Safety Stock (${Math.round(item.ss * 1.5).toLocaleString()} threshold)`,
        page: "Inventory · Safety Stock",
      });
    }
    return alerts;
  });
}

// ── Forecast Alerts ───────────────────────────────────────────────────────────
export function forecastAlerts(ts: number, wmape: number): Alert[] {
  const alerts: Alert[] = [];
  if (Math.abs(ts) > 4) {
    alerts.push({
      id: "fc-ts",
      level: "high",
      msg: `Tracking Signal out of control: TS = ${ts.toFixed(2)} (limit ±4)`,
      page: "Demand Planning · Forecast",
    });
  } else if (Math.abs(ts) > 3) {
    alerts.push({
      id: "fc-ts-warn",
      level: "medium",
      msg: `Tracking Signal approaching limit: TS = ${ts.toFixed(2)}`,
      page: "Demand Planning · Forecast",
    });
  }
  if (wmape > 15) {
    alerts.push({
      id: "fc-wmape",
      level: "medium",
      msg: `Forecast accuracy below target: WMAPE = ${wmape.toFixed(1)}% (target < 15%)`,
      page: "Demand Planning · WMAPE",
    });
  }
  return alerts;
}

// ── S&OP Alerts ───────────────────────────────────────────────────────────────
export function sopAlerts(totalGap: number, avgInv: number, targetInv: number): Alert[] {
  const alerts: Alert[] = [];
  if (totalGap < -1000) {
    alerts.push({
      id: "sop-gap",
      level: "high",
      msg: `Supply gap: Demand exceeds Supply by ${Math.abs(totalGap).toLocaleString()} units this period`,
      page: "S&OP Balance · Supply Review",
    });
  }
  if (avgInv < targetInv * 0.85) {
    alerts.push({
      id: "sop-inv",
      level: "medium",
      msg: `Avg Inventory (${avgInv.toLocaleString()}) below S&OP target (${targetInv.toLocaleString()})`,
      page: "S&OP Balance · Inventory",
    });
  }
  return alerts;
}

// ── Distribution Alerts ───────────────────────────────────────────────────────
export function distributionAlerts(): Alert[] {
  return [
    {
      id: "dist-white-spots",
      level: "medium",
      msg: "5 white-spot zones detected — 47K uncovered stores in Greater Cairo",
      page: "Distribution · Market Intelligence",
    },
    {
      id: "dist-coverage",
      level: "low",
      msg: "Route coverage at 89.2% — 3 routes need re-sequencing",
      page: "Distribution · Vonoy VRP",
    },
  ];
}

// ── Master Alert Generator (used by all pages) ────────────────────────────────
export function buildAlerts(params: {
  invItems?: InvItem[];
  trackingSignal?: number;
  wmape?: number;
  sopGap?: number;
  sopAvgInv?: number;
  sopTargetInv?: number;
  includeDistribution?: boolean;
}): Alert[] {
  const alerts: Alert[] = [];
  if (params.invItems?.length)
    alerts.push(...inventoryAlerts(params.invItems));
  if (params.trackingSignal !== undefined && params.wmape !== undefined)
    alerts.push(...forecastAlerts(params.trackingSignal, params.wmape));
  if (params.sopGap !== undefined && params.sopAvgInv !== undefined && params.sopTargetInv !== undefined)
    alerts.push(...sopAlerts(params.sopGap, params.sopAvgInv, params.sopTargetInv));
  if (params.includeDistribution)
    alerts.push(...distributionAlerts());
  return alerts;
}

// ── Pre-built default alerts (shown when page doesn't compute its own) ────────
export const DEFAULT_ALERTS: Alert[] = [
  { id:"inv-rop-bev001",  level:"high",   msg:"Beverage A 330ml — On-Hand (11,204) below ROP (12,320)",       page:"Inventory · EOQ Table"          },
  { id:"inv-rop-bev002",  level:"high",   msg:"Beverage B 500ml — On-Hand (8,250) below ROP (9,870)",         page:"Inventory · EOQ Table"          },
  { id:"inv-ss-dai001",   level:"medium", msg:"Dairy Milk 1L — Stock approaching Safety Stock threshold",      page:"Inventory · Safety Stock"       },
  { id:"fc-ts-warn",      level:"medium", msg:"Tracking Signal approaching limit: TS = -3.27",                 page:"Demand Planning · Forecast"     },
  { id:"dist-white",      level:"medium", msg:"5 white-spot zones — 47K uncovered stores in Greater Cairo",   page:"Distribution · Market Intel"    },
  { id:"sop-gap",         level:"low",    msg:"Jan–Feb supply gap: 1,100 units shortfall vs Demand plan",      page:"S&OP Balance · Supply Review"   },
];

/**
 * SCM Pro — Database Access Layer
 *
 * Every function tries Supabase first; if not configured or query fails,
 * it falls back to the local mock data already in the app.
 *
 * Usage example:
 *   import { getInventoryItems } from "@/lib/db";
 *   const items = await getInventoryItems();   // real DB or mock
 */

import { supabase } from "./supabase";
import type {
  InventoryItemRow,
  DemandForecastRow,
  SopRow,
  CustomerRow,
  TerritoryRow,
  AlertRow,
  SettingsRow,
} from "@/types/database";

// ─── Generic helper — wraps any Supabase call with fallback ──────────────────
async function sbFetch<T>(
  fn: () => PromiseLike<unknown>,
  fallback: T[]
): Promise<T[]> {
  if (!supabase) return fallback;
  try {
    const res = await (fn() as Promise<{ data: unknown; error: unknown }>);
    if (res.error || !Array.isArray(res.data) || !res.data.length) return fallback;
    return res.data as T[];
  } catch {
    return fallback;
  }
}

async function sbFetchOne<T>(
  fn: () => PromiseLike<unknown>,
  fallback: T
): Promise<T> {
  if (!supabase) return fallback;
  try {
    const res = await (fn() as Promise<{ data: unknown; error: unknown }>);
    if (res.error || !res.data) return fallback;
    return res.data as T;
  } catch {
    return fallback;
  }
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export async function getInventoryItems(fallback: InventoryItemRow[] = []): Promise<InventoryItemRow[]> {
  return sbFetch<InventoryItemRow>(
    () => supabase!.from("inventory_items").select("*").order("sku"),
    fallback
  );
}

export async function upsertInventoryItem(item: Omit<InventoryItemRow, "id" | "created_at" | "updated_at">): Promise<void> {
  if (!supabase) return;
  await (supabase.from("inventory_items").upsert(item as never, { onConflict: "sku" }) as PromiseLike<unknown>);
}

// ─── Demand Forecast ──────────────────────────────────────────────────────────
export async function getDemandForecast(fallback: DemandForecastRow[] = []): Promise<DemandForecastRow[]> {
  return sbFetch<DemandForecastRow>(
    () => supabase!.from("demand_forecast").select("*").order("id"),
    fallback
  );
}

export async function upsertDemandRow(row: Omit<DemandForecastRow, "id" | "created_at" | "updated_at">): Promise<void> {
  if (!supabase) return;
  await (supabase.from("demand_forecast").upsert(row as never) as PromiseLike<unknown>);
}

// ─── S&OP Balance ─────────────────────────────────────────────────────────────
export async function getSopBalance(fallback: SopRow[] = []): Promise<SopRow[]> {
  return sbFetch<SopRow>(
    () => supabase!.from("sop_balance").select("*").order("id"),
    fallback
  );
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function getCustomers(fallback: CustomerRow[] = []): Promise<CustomerRow[]> {
  return sbFetch<CustomerRow>(
    () => supabase!.from("customers").select("*").order("id"),
    fallback
  );
}

// ─── Territory Polygons ───────────────────────────────────────────────────────
export async function getTerritories(fallback: TerritoryRow[] = []): Promise<TerritoryRow[]> {
  return sbFetch<TerritoryRow>(
    () => supabase!.from("territories").select("*"),
    fallback
  );
}

export async function saveTerritoryPolygon(
  repId: string,
  coords: { lat: number; lng: number }[]
): Promise<void> {
  if (!supabase) return;
  const payload = { rep_id: repId, polygon_coords: coords };
  await (supabase.from("territories").upsert(payload as never, { onConflict: "rep_id" }) as PromiseLike<unknown>);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getActiveAlerts(fallback: AlertRow[] = []): Promise<AlertRow[]> {
  return sbFetch<AlertRow>(
    () => supabase!.from("alerts").select("*").eq("resolved" as never, false).order("created_at", { ascending: false }),
    fallback
  );
}

export async function resolveAlert(id: string): Promise<void> {
  if (!supabase) return;
  await (supabase.from("alerts").update({ resolved: true } as never).eq("id" as never, id) as PromiseLike<unknown>);
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings(fallback: SettingsRow): Promise<SettingsRow> {
  return sbFetchOne<SettingsRow>(
    () => supabase!.from("settings").select("*").eq("id" as never, "default").single(),
    fallback
  );
}

export async function updateSettings(patch: Partial<Omit<SettingsRow, "id" | "updated_at">>): Promise<void> {
  if (!supabase) return;
  await (supabase.from("settings").update(patch as never).eq("id" as never, "default") as PromiseLike<unknown>);
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────
/** Seed demand forecast — safe to run multiple times (insert-ignore on month). */
export async function seedDemandForecast(rows: Omit<DemandForecastRow, "id" | "created_at" | "updated_at">[]): Promise<void> {
  if (!supabase) return;
  await (supabase.from("demand_forecast").upsert(rows as never[], { ignoreDuplicates: true }) as PromiseLike<unknown>);
}

/** Seed inventory items — safe to run multiple times (insert-ignore on sku). */
export async function seedInventoryItems(rows: Omit<InventoryItemRow, "id" | "created_at" | "updated_at">[]): Promise<void> {
  if (!supabase) return;
  await (supabase.from("inventory_items").upsert(rows as never[], { onConflict: "sku", ignoreDuplicates: true }) as PromiseLike<unknown>);
}

/** Seed customer list — safe to run multiple times (insert-ignore on id). */
export async function seedCustomers(rows: Omit<CustomerRow, "created_at">[]): Promise<void> {
  if (!supabase) return;
  await (supabase.from("customers").upsert(rows as never[], { onConflict: "id", ignoreDuplicates: true }) as PromiseLike<unknown>);
}

/**
 * TypeScript types for the SCM Pro Supabase database schema.
 * Generated from the SQL migration in /supabase/migrations/0001_scm_pro_initial.sql
 *
 * To regenerate after schema changes:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Row types ────────────────────────────────────────────────────────────────

export interface DemandForecastRow {
  id: number;
  month: string;               // "Jan 25"
  actual: number | null;
  forecast: number;
  last_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemRow {
  id: number;
  sku: string;                 // "SKU-001"
  name: string;
  sl: number;                  // service level %: 90/95/99
  d_avg: number;               // avg daily demand (units)
  sigma_d: number;             // demand std dev
  lt: number;                  // lead time (days)
  sigma_lt: number;            // lead time std dev
  unit_cost: number;           // EGP
  on_hand: number;             // current on-hand units
  status: "OK" | "Low" | "Reorder";
  created_at: string;
  updated_at: string;
}

export interface SopRow {
  id: number;
  month: string;
  forecast: number;
  supply: number;
  gap: number;
  opening_inv: number;
  closing_inv: number;
  backlog: number;
  sales_actual: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupplyPlanRow {
  id: number;
  variable: string;            // LP variable name
  qty: number;
  cost_per_unit: number;
  total_cost: number;
  status: "Active" | "Idle" | "At Capacity";
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;                  // "C01"
  name: string;
  lat: number;
  lng: number;
  rep_id: string;              // "R1"–"R6"
  type: "Supermarket" | "Grocery" | "Kiosk" | "Horeca" | "Pharmacy" | "Wholesale";
  visit_days: string[];        // ["Sat","Tue"]
  freq: "W" | "B" | "M";
  created_at: string;
}

export interface TerritoryRow {
  id: number;
  rep_id: string;
  polygon_coords: { lat: number; lng: number }[];  // JSON array
  updated_at: string;
}

export interface AlertRow {
  id: string;                  // UUID
  level: "high" | "medium" | "low";
  msg: string;
  page: string;
  resolved: boolean;
  created_at: string;
}

export interface SettingsRow {
  id: string;                  // "default"
  service_level: number;
  holding_rate: number;
  order_cost: number;
  lead_time_days: number;
  lead_time_sigma: number;
  ts_alert_threshold: number;
  mape_alert_threshold: number;
  updated_at: string;
}

// ─── Database shape (for SupabaseClient<Database>) ────────────────────────────

export interface Database {
  public: {
    Tables: {
      demand_forecast: {
        Row:    DemandForecastRow;
        Insert: Omit<DemandForecastRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DemandForecastRow, "id" | "created_at">>;
      };
      inventory_items: {
        Row:    InventoryItemRow;
        Insert: Omit<InventoryItemRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<InventoryItemRow, "id" | "created_at">>;
      };
      sop_balance: {
        Row:    SopRow;
        Insert: Omit<SopRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SopRow, "id" | "created_at">>;
      };
      supply_plan: {
        Row:    SupplyPlanRow;
        Insert: Omit<SupplyPlanRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SupplyPlanRow, "id" | "created_at">>;
      };
      customers: {
        Row:    CustomerRow;
        Insert: Omit<CustomerRow, "created_at">;
        Update: Partial<Omit<CustomerRow, "id" | "created_at">>;
      };
      territories: {
        Row:    TerritoryRow;
        Insert: Omit<TerritoryRow, "id" | "updated_at">;
        Update: Partial<Omit<TerritoryRow, "id">>;
      };
      alerts: {
        Row:    AlertRow;
        Insert: Omit<AlertRow, "created_at">;
        Update: Partial<Omit<AlertRow, "id" | "created_at">>;
      };
      settings: {
        Row:    SettingsRow;
        Insert: Omit<SettingsRow, "updated_at">;
        Update: Partial<Omit<SettingsRow, "id">>;
      };
    };
    Views:   Record<string, never>;
    Functions: Record<string, never>;
    Enums:   Record<string, never>;
  };
}

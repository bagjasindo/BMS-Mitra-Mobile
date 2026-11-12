-- BMS schema snapshot 2026-10-03, build 2343. No business rows or credentials.

-- Fresh Supabase project only. Managed auth/storage schemas must already exist.

BEGIN;

SET LOCAL check_function_bodies = off;

CREATE SCHEMA IF NOT EXISTS "private";

CREATE SCHEMA IF NOT EXISTS "bms_backup";

CREATE TYPE "public"."bms_role" AS ENUM ('ADMIN', 'LOGISTIK', 'PPL', 'MARKETING', 'KEUANGAN', 'OWNER');

CREATE TYPE "public"."cycle_state" AS ENUM ('ACTIVE', 'READY_RHPP', 'CLOSED');

CREATE TABLE "bms_backup"."daily_snapshots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "backup_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "table_count" integer DEFAULT 0 NOT NULL,
  "row_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checksum" text
);

CREATE TABLE "bms_backup"."download_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "backup_date" date NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone
);

CREATE TABLE "private"."bms_operation_receipts" (
  "actor" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "request_hash" text NOT NULL,
  "action" text NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "private"."bms_rpc_allowlist" (
  "function_oid" regprocedure NOT NULL,
  "action" text NOT NULL
);

CREATE TABLE "public"."abk_cycle_salaries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "abk_id" uuid NOT NULL,
  "gross_salary" numeric NOT NULL,
  "advance_deduction" numeric DEFAULT 0 NOT NULL,
  "net_paid" numeric NOT NULL,
  "paid_on" date NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."abk_league_settings" (
  "id" boolean DEFAULT true NOT NULL,
  "season_start" date DEFAULT CURRENT_DATE NOT NULL,
  "reset_count" integer DEFAULT 0 NOT NULL,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."advance_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "advance_id" uuid NOT NULL,
  "paid_on" date NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "method" text NOT NULL,
  "reference" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."advances" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "advanced_on" date NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "description" text,
  "reference" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "contract_assignment_id" uuid,
  "barn_id" uuid,
  "is_historical_balance" boolean DEFAULT false NOT NULL
);

CREATE TABLE "public"."audit_events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "actor" uuid DEFAULT auth.uid(),
  "action" text NOT NULL,
  "table_name" text NOT NULL,
  "record_id" text,
  "old_data" jsonb,
  "new_data" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."barn_assets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "barn_id" uuid,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "acquired_on" date NOT NULL,
  "acquisition_value" numeric(18,2) NOT NULL,
  "condition" text DEFAULT 'BAIK'::text NOT NULL,
  "status" text DEFAULT 'AKTIF'::text NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "quantity" numeric,
  "unit" text,
  "location_type" text DEFAULT 'KANDANG'::text NOT NULL
);

CREATE TABLE "public"."barn_maintenance_costs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid,
  "barn_id" uuid NOT NULL,
  "incurred_on" date NOT NULL,
  "category" text NOT NULL,
  "amount" numeric NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_by" text DEFAULT 'COMPANY'::text NOT NULL
);

CREATE TABLE "public"."barns" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "capacity" integer NOT NULL,
  "kind" text NOT NULL,
  "location" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."bop" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "incurred_on" date NOT NULL,
  "category" text NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "reference" text,
  "notes" text,
  "contract_assignment_id" uuid,
  "barn_id" uuid,
  "source_type" text,
  "source_id" uuid,
  "paid_by" text DEFAULT 'COMPANY'::text NOT NULL
);

CREATE TABLE "public"."bop_outside" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "incurred_on" date NOT NULL,
  "category" text NOT NULL,
  "amount" numeric NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_by" text DEFAULT 'COMPANY'::text NOT NULL,
  "expense_scope" text
);

CREATE TABLE "public"."chick_ins" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "arrived_on" date NOT NULL,
  "hatchery" text,
  "strain" text,
  "shipped" integer NOT NULL,
  "received" integer NOT NULL,
  "doa" integer NOT NULL,
  "avg_weight" numeric(10,2),
  "delivery_number" text,
  "notes" text,
  "sample_count" integer,
  "sample_weight_total_g" numeric(12,2),
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."company_profile" (
  "id" boolean DEFAULT true NOT NULL,
  "company_name" text NOT NULL,
  "legal_name" text,
  "logo_url" text,
  "address" text,
  "phone" text,
  "email" text,
  "website" text,
  "tax_number" text,
  "business_id" text,
  "signatory_name" text,
  "signatory_title" text,
  "stamp_url" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "bank_name" text,
  "bank_account_number" text,
  "bank_account_name" text
);

CREATE TABLE "public"."contract_bonuses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "metric" text NOT NULL,
  "min_value" numeric(12,4),
  "max_value" numeric(12,4),
  "rupiah_per_kg" numeric(18,2) DEFAULT 0 NOT NULL,
  "notes" text
);

CREATE TABLE "public"."contract_live_prices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "min_weight_kg" numeric(8,3) NOT NULL,
  "max_weight_kg" numeric(8,3),
  "price_per_kg" numeric(18,2) NOT NULL
);

CREATE TABLE "public"."contracts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "number" text NOT NULL,
  "contract_date" date,
  "integrator" text,
  "doc_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "pre_starter_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "starter_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "finisher_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "ovk_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "harvest_price" numeric(18,2) DEFAULT 0 NOT NULL,
  "parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ovk_price_basis" text DEFAULT 'FIXED'::text NOT NULL,
  "ovk_vat_percent" numeric(6,3),
  "signed_reference" text,
  "source_master_contract_id" uuid,
  "frozen_at" timestamp with time zone,
  "performance_template_name" text DEFAULT 'Performa Bounty'::text
);

CREATE TABLE "public"."cycles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "barn_id" uuid NOT NULL,
  "chick_in_date" date,
  "initial_population" integer,
  "strain" text,
  "ppl_id" uuid,
  "state" public.cycle_state DEFAULT 'ACTIVE'::public.cycle_state NOT NULL,
  "bop_complete" boolean DEFAULT false NOT NULL,
  "ready_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "abk_id" uuid
);

CREATE TABLE "public"."employees" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "phone" text,
  "job_title" text,
  "joined_on" date,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text
);

CREATE TABLE "public"."expedition_customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "phone" text,
  "tax_number" text,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."expedition_destinations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."expedition_drivers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "license_number" text,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."expedition_routes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "route_name" text NOT NULL,
  "default_trip_price" numeric NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "bop_bbm" numeric DEFAULT 0 NOT NULL,
  "bop_tol" numeric DEFAULT 0 NOT NULL,
  "bop_uang_jalan" numeric DEFAULT 0 NOT NULL,
  "bop_makan_sopir" numeric DEFAULT 0 NOT NULL,
  "bop_bongkar_muat" numeric DEFAULT 0 NOT NULL,
  "bop_operasional" numeric DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."expedition_vehicles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "plate_number" text NOT NULL,
  "vehicle_type" text,
  "capacity_qty" numeric,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."expeditions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "departed_on" date NOT NULL,
  "destination" text NOT NULL,
  "vehicle" text,
  "driver" text,
  "cargo" text,
  "reference" text,
  "notes" text,
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."finance_asset_purchase_invoices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
  "supplier_name" text,
  "asset_location_type" text NOT NULL,
  "barn_id" uuid,
  "payment_method" text NOT NULL,
  "reference" text,
  "notes" text,
  "total_amount" numeric NOT NULL,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_bop_period_access" (
  "contract_assignment_id" uuid NOT NULL,
  "is_open" boolean DEFAULT false NOT NULL,
  "changed_by" uuid NOT NULL,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_direct_purchases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
  "purchase_type" text NOT NULL,
  "standard_name" text NOT NULL,
  "description" text,
  "supplier_id" uuid,
  "supplier_name" text,
  "barn_id" uuid,
  "contract_assignment_id" uuid,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "unit_price" numeric NOT NULL,
  "total_amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "reference" text,
  "notes" text,
  "linked_table" text,
  "linked_id" uuid,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "asset_location_type" text DEFAULT 'KANDANG'::text NOT NULL,
  "invoice_id" uuid
);

CREATE TABLE "public"."finance_expedition_bop" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "incurred_on" date NOT NULL,
  "category" text NOT NULL,
  "amount" numeric NOT NULL,
  "trip_id" uuid,
  "driver" text,
  "vehicle" text,
  "route" text,
  "qty" numeric,
  "unit_price" numeric,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_invoice_counters" (
  "invoice_year" integer NOT NULL,
  "last_no" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_invoice_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "trip_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_invoices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" text NOT NULL,
  "invoice_date" date NOT NULL,
  "due_date" date,
  "customer_name" text NOT NULL,
  "customer_address" text,
  "status" text DEFAULT 'DRAFT'::text NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_maintenance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "incurred_on" date NOT NULL,
  "category" text NOT NULL,
  "vehicle" text,
  "amount" numeric NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "paid_on" date NOT NULL,
  "amount" numeric NOT NULL,
  "method" text,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_trip_destinations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "line_no" integer NOT NULL,
  "destination_id" uuid,
  "destination_name" text NOT NULL,
  "cargo" text,
  "qty" numeric,
  "unit" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_expedition_trips" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "trip_date" date NOT NULL,
  "mts_sj" text,
  "rr" text,
  "driver" text,
  "vehicle" text,
  "zone" text,
  "destination" text NOT NULL,
  "cargo" text,
  "total_qty" numeric,
  "trip_price" numeric DEFAULT 0 NOT NULL,
  "additional" numeric DEFAULT 0 NOT NULL,
  "deduction" numeric DEFAULT 0 NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_mandiri_sales_receipts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "harvest_id" uuid NOT NULL,
  "received_on" date DEFAULT CURRENT_DATE NOT NULL,
  "amount" numeric(16,2) NOT NULL,
  "method" text NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_mandiri_supplier_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_id" uuid NOT NULL,
  "paid_on" date NOT NULL,
  "amount" numeric NOT NULL,
  "method" text NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."finance_reference_counters" (
  "prefix" text NOT NULL,
  "ref_date" date NOT NULL,
  "last_no" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."finance_stock_purchase_invoices" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_date" date NOT NULL,
  "supplier_name" text,
  "payment_method" text NOT NULL,
  "reference" text,
  "notes" text,
  "total_amount" numeric DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."harvests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "harvested_on" date NOT NULL,
  "transaction_number" text NOT NULL,
  "delivery_number" text,
  "birds" integer NOT NULL,
  "net_weight_kg" numeric(18,2) NOT NULL,
  "price_per_kg" numeric(18,2) NOT NULL,
  "buyer" text,
  "vehicle" text,
  "driver" text,
  "notes" text,
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "feed_phase" text,
  "unit" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "kg_per_unit" numeric(10,2),
  "supplier_id" uuid,
  "ovk_type" text
);

CREATE TABLE "public"."logistics_company_feed_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "retained_feed_id" uuid NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "direction" text NOT NULL,
  "quantity" numeric NOT NULL,
  "transferred_on" date DEFAULT CURRENT_DATE NOT NULL,
  "reference" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_contract_assignment_abks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "abk_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "initial_birds" integer,
  "feed_pre_bags" numeric,
  "feed_starter_bags" numeric,
  "feed_finisher_bags" numeric,
  "basics_locked_at" timestamp with time zone
);

CREATE TABLE "public"."logistics_contract_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "barn_id" uuid NOT NULL,
  "master_contract_id" uuid,
  "performance_template_name" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "start_date" date DEFAULT CURRENT_DATE NOT NULL,
  "abk_id" uuid,
  "ppl_id" uuid,
  "cycle_type" text DEFAULT 'MITRA'::text NOT NULL
);

CREATE TABLE "public"."logistics_equipment_purchases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
  "quantity" numeric NOT NULL,
  "purchase_unit_price" numeric NOT NULL,
  "reference_number" text,
  "notes" text,
  "asset_id" uuid,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_external_return_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_return_id" uuid NOT NULL,
  "external_shipment_item_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "quantity_kg" numeric,
  "purchase_unit_price" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_external_return_transfers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_return_item_id" uuid NOT NULL,
  "source_contract_assignment_id" uuid NOT NULL,
  "source_barn_id" uuid NOT NULL,
  "target_contract_assignment_id" uuid NOT NULL,
  "target_barn_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "quantity_kg" numeric,
  "unit_price" numeric NOT NULL,
  "transferred_on" date DEFAULT CURRENT_DATE NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_external_returns" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_shipment_id" uuid NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "return_date" date DEFAULT CURRENT_DATE NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'DRAFT'::text NOT NULL,
  "sent_at" timestamp with time zone
);

CREATE TABLE "public"."logistics_external_shipment_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_shipment_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric(14,2) NOT NULL,
  "quantity_kg" numeric(14,2),
  "purchase_unit_price" numeric(14,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_external_shipments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "shipment_date" date DEFAULT CURRENT_DATE NOT NULL,
  "reference_number" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_mandiri_purchase_allocations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_id" uuid NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_mandiri_purchases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
  "quantity" numeric NOT NULL,
  "purchase_unit_price" numeric NOT NULL,
  "reference_number" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_mitra_retained_feed" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "return_id" uuid NOT NULL,
  "return_item_id" uuid,
  "source_assignment_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "unit_price" numeric NOT NULL,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."logistics_return_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "return_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "quantity_kg" numeric,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "unit_price" numeric(14,2)
);

CREATE TABLE "public"."logistics_returns" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "barn_id" uuid NOT NULL,
  "return_date" date DEFAULT CURRENT_DATE NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "contract_assignment_id" uuid NOT NULL
);

CREATE TABLE "public"."logistics_shipment_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "shipment_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "quantity" numeric NOT NULL,
  "quantity_kg" numeric,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "unit_price" numeric(14,2)
);

CREATE TABLE "public"."logistics_shipments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "barn_id" uuid NOT NULL,
  "shipment_date" date DEFAULT CURRENT_DATE NOT NULL,
  "delivery_number" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "shipping_note_number" text,
  "contract_assignment_id" uuid NOT NULL
);

CREATE TABLE "public"."marketing_contract_harvests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "harvested_on" date DEFAULT CURRENT_DATE NOT NULL,
  "birds" numeric(14,2) NOT NULL,
  "net_weight_kg" numeric(14,2) NOT NULL,
  "avg_weight_kg" numeric(14,4) GENERATED ALWAYS AS ((net_weight_kg / NULLIF(birds, (0)::numeric))) STORED,
  "price_per_kg" numeric(14,2) NOT NULL,
  "total_amount" numeric(16,2) GENERATED ALWAYS AS ((net_weight_kg * COALESCE(price_per_kg, (0)::numeric))) STORED,
  "buyer_name" text,
  "transaction_number" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "vehicle_number" text,
  "market_price_per_kg" numeric,
  "market_total_amount" numeric,
  "buyer_id" uuid
);

CREATE TABLE "public"."marketing_customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "phone" text,
  "notes" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."marketing_external_meat_purchases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "supplier_id" uuid NOT NULL,
  "purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
  "product_name" text DEFAULT 'Daging/Ayam'::text NOT NULL,
  "weight_kg" numeric(14,2) NOT NULL,
  "purchase_price_per_kg" numeric(14,2) NOT NULL,
  "reference_number" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL
);

CREATE TABLE "public"."performance_standards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "age_days" integer NOT NULL,
  "std_body_weight_g" numeric(10,2),
  "std_fcr" numeric(8,2),
  "std_feed_g_per_bird" numeric(10,2),
  "template_name" text DEFAULT 'Performa Bounty'::text NOT NULL
);

CREATE TABLE "public"."production_abk_result_sizes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "result_id" uuid NOT NULL,
  "birds" integer NOT NULL,
  "weight_kg" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "harvest_date" date NOT NULL
);

CREATE TABLE "public"."production_abk_results" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "abk_id" uuid NOT NULL,
  "harvest_date" date NOT NULL,
  "feed_pre_kg" numeric DEFAULT 0 NOT NULL,
  "feed_starter_kg" numeric DEFAULT 0 NOT NULL,
  "feed_finisher_kg" numeric DEFAULT 0 NOT NULL,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."production_estimate_sizes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "estimate_id" uuid NOT NULL,
  "birds" integer NOT NULL,
  "bw_kg" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."production_estimates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "estimated_on" date DEFAULT CURRENT_DATE NOT NULL,
  "remaining_birds" integer NOT NULL,
  "feed_used_kg" numeric NOT NULL,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "estimated_revenue" numeric,
  "estimated_cost" numeric,
  "estimated_profit" numeric,
  "profit_per_chick_in" numeric
);

CREATE TABLE "public"."production_feed_stock_adjustments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "adjustment_units" numeric NOT NULL,
  "adjustment_date" date DEFAULT CURRENT_DATE NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."production_mandiri_final" (
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "chick_in_birds" numeric DEFAULT 0 NOT NULL,
  "depletion_birds" numeric DEFAULT 0 NOT NULL,
  "total_harvest_birds" numeric DEFAULT 0 NOT NULL,
  "total_harvest_kg" numeric DEFAULT 0 NOT NULL,
  "avg_bw_kg" numeric DEFAULT 0 NOT NULL,
  "weighted_age" numeric DEFAULT 0 NOT NULL,
  "net_feed_kg" numeric DEFAULT 0 NOT NULL,
  "fcr_actual" numeric DEFAULT 0 NOT NULL,
  "ip" numeric DEFAULT 0 NOT NULL,
  "closed_on" date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "harvest_value" numeric,
  "sapronak_cost" numeric,
  "source_reference" text,
  "mortality_pct" numeric DEFAULT 0
);

CREATE TABLE "public"."profiles" (
  "user_id" uuid NOT NULL,
  "role" public.bms_role NOT NULL,
  "full_name" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."recording_weight_samples" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "recording_id" uuid NOT NULL,
  "weight_g" numeric NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."recordings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "recorded_on" date NOT NULL,
  "age_days" integer NOT NULL,
  "mortality" integer DEFAULT 0 NOT NULL,
  "culling" integer DEFAULT 0 NOT NULL,
  "feed_kg" numeric(18,2) DEFAULT 0 NOT NULL,
  "avg_weight_kg" numeric(12,2),
  "sample_count" integer,
  "temperature" numeric(6,2),
  "humidity" numeric(6,2),
  "notes" text,
  "feed_item_id" uuid,
  "feed_bags_in" numeric(12,2),
  "feed_bags_out" numeric(12,2),
  "feed_bags_balance" numeric(12,2),
  "actual_fcr" numeric(8,2),
  "ip" numeric(10,2),
  "medication_notes" text,
  "sample_weight_total_kg" numeric(12,2),
  "contract_assignment_id" uuid,
  "barn_id" uuid,
  "feed_quantity_units" numeric,
  "photo_data" text
);

CREATE TABLE "public"."rhpp_estimates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "estimated_on" date NOT NULL,
  "age_days" integer,
  "performance" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "projected_amount" numeric(18,2),
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."rhpp_real" (
  "cycle_id" uuid,
  "amount" numeric(18,2) NOT NULL,
  "received_on" date NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."rhpp_system_final" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contract_assignment_id" uuid NOT NULL,
  "barn_id" uuid NOT NULL,
  "system_amount" numeric NOT NULL,
  "harvest_value" numeric DEFAULT 0 NOT NULL,
  "sapronak_cost" numeric DEFAULT 0 NOT NULL,
  "external_meat_cost" numeric DEFAULT 0 NOT NULL,
  "bonus_ip" numeric DEFAULT 0 NOT NULL,
  "bonus_fc" numeric DEFAULT 0 NOT NULL,
  "bonus_depletion" numeric DEFAULT 0 NOT NULL,
  "fcr_actual" numeric,
  "fcr_standard" numeric,
  "ip" numeric,
  "mortality_pct" numeric,
  "population_variance_birds" numeric,
  "closed_on" date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
  "closed_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "chick_in_birds" numeric,
  "total_harvest_birds" numeric,
  "total_harvest_kg" numeric,
  "avg_bw_kg" numeric,
  "weighted_age" numeric,
  "depletion_birds" numeric,
  "net_feed_kg" numeric,
  "main_doc_cost" numeric,
  "main_feed_cost" numeric,
  "main_ovk_cost" numeric,
  "main_other_cost" numeric,
  "main_return_cost" numeric,
  "external_sapronak_cost" numeric,
  "total_rhpp_cost" numeric,
  "base_profit" numeric,
  "bonus_ip_rate" numeric,
  "bonus_fc_rate" numeric,
  "bonus_depletion_rate" numeric,
  "profit_per_chick_in" numeric,
  "profit_per_harvested_bird" numeric,
  "std_bw_kg" numeric,
  "chick_in_date" date
);

CREATE TABLE "public"."supplier_payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_type" text NOT NULL,
  "source_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "contract_assignment_id" uuid,
  "barn_id" uuid NOT NULL,
  "paid_on" date NOT NULL,
  "amount" numeric NOT NULL,
  "method" text NOT NULL,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."suppliers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "phone" text,
  "contact_person" text,
  "bank_name" text,
  "bank_account_number" text,
  "bank_account_name" text,
  "tax_number" text,
  "business_id" text,
  "notes" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "supplier_type" text DEFAULT 'SAPRONAK'::text NOT NULL
);

CREATE TABLE "public"."supplies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "item_id" uuid NOT NULL,
  "quantity" numeric(18,3) NOT NULL,
  "received_on" date NOT NULL,
  "delivery_number" text,
  "reference" text,
  "notes" text,
  "created_by" uuid DEFAULT auth.uid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "quantity_kg" numeric(18,2),
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."user_activity_logs" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "actor" uuid NOT NULL,
  "event_type" text NOT NULL,
  "tab_key" text,
  "device_type" text,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."visits" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cycle_id" uuid,
  "visited_on" date NOT NULL,
  "findings" text,
  "recommendation" text,
  "follow_up" text,
  "follow_up_status" text,
  "notes" text,
  "contract_assignment_id" uuid,
  "barn_id" uuid
);

CREATE TABLE "public"."warehouse_stock_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "standard_name" text NOT NULL,
  "description" text,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "unit_price" numeric NOT NULL,
  "total_amount" numeric NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "stock_kind" text DEFAULT 'ASET'::text NOT NULL
);

CREATE TABLE "public"."warehouse_stock_shipments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "stock_item_id" uuid NOT NULL,
  "shipment_date" date NOT NULL,
  "destination_type" text NOT NULL,
  "barn_id" uuid,
  "quantity" numeric NOT NULL,
  "make_asset" boolean DEFAULT false NOT NULL,
  "asset_id" uuid,
  "reference" text,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION private.my_bms_role()
 RETURNS public.bms_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select role
  from public.profiles
  where user_id = (select auth.uid()) and active
$function$;

CREATE OR REPLACE FUNCTION private.can_read_cycle(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.cycles c
    where c.id = cid
      and (
        private.my_bms_role() in ('ADMIN','OWNER','KEUANGAN','LOGISTIK','MARKETING')
        or (private.my_bms_role() = 'PPL' and c.ppl_id = (select auth.uid()))
      )
  )
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_cycle(cid uuid, allowed public.bms_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.cycles c
    where c.id=cid
      and c.state='ACTIVE'
      and (
        private.my_bms_role()='ADMIN'::public.bms_role
        or (
          private.my_bms_role()=any(allowed)
          and (private.my_bms_role()<>'PPL'::public.bms_role or c.ppl_id=(select auth.uid()))
        )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.audit_and_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cid uuid;
  state_now public.cycle_state;
  rid text;
begin
  cid := case when TG_OP = 'DELETE' then old.cycle_id else new.cycle_id end;

  if not (TG_TABLE_NAME = 'contracts' and cid is null) then
    select state into state_now
    from public.cycles
    where id = cid
    for update;

    if state_now is null then
      raise exception 'Siklus tidak ditemukan';
    end if;

    if TG_TABLE_NAME in ('rhpp_real','bop') then
      if state_now = 'CLOSED'
         or (TG_TABLE_NAME = 'rhpp_real' and state_now <> 'READY_RHPP') then
        raise exception 'Transaksi keuangan terkunci';
      end if;
    elsif state_now <> 'ACTIVE' then
      raise exception 'Transaksi operasional terkunci';
    end if;
  end if;

  if TG_TABLE_NAME = 'rhpp_real' then
    rid := cid::text;
  elsif TG_OP = 'DELETE' then
    rid := old.id::text;
  else
    rid := new.id::text;
  end if;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    rid,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) end
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.set_cycle_state(p_cycle uuid, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS public.cycles
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.set_cycle_state_impl(p_cycle,p_action,p_reason)
$function$;

CREATE OR REPLACE FUNCTION public.reset_bop_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.cycles set bop_complete = false where id = new.cycle_id;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.assign_bms_role(p_email text, p_role public.bms_role, p_name text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.assign_bms_role_impl(p_email,p_role,p_name)
$function$;

CREATE OR REPLACE FUNCTION public.check_advance_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare limit_amount numeric; total_paid numeric;
begin
  select amount into limit_amount from public.advances where id=new.advance_id for update;
  select coalesce(sum(amount),0) into total_paid from public.advance_payments where advance_id=new.advance_id;
  if total_paid+new.amount > limit_amount then raise exception 'Pembayaran melebihi sisa kasbon'; end if;
  insert into public.audit_events(actor,action,table_name,record_id,new_data)
  values(auth.uid(),'PAY_ADVANCE','advance_payments',new.id::text,to_jsonb(new));
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.validate_chick_in()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cap integer; planned integer;
begin
  select b.capacity,c.initial_population into cap,planned
  from public.cycles c join public.barns b on b.id=c.barn_id
  where c.id=new.cycle_id;
  if new.received > cap then raise exception 'Jumlah diterima melebihi kapasitas kandang'; end if;
  if planned is not null and new.received <> planned then
    raise exception 'Populasi Chick-In harus sama dengan populasi awal siklus';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.validate_cycle_population()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare qty_received integer; dead integer; harvested integer;
begin
  select ci.received into qty_received from public.chick_ins ci where cycle_id=new.cycle_id;
  if qty_received is null then raise exception 'Chick-In wajib tersedia'; end if;
  select coalesce(sum(mortality+culling),0) into dead
    from public.recordings where cycle_id=new.cycle_id and id is distinct from new.id;
  select coalesce(sum(birds),0) into harvested
    from public.harvests where cycle_id=new.cycle_id and id is distinct from new.id;
  if TG_TABLE_NAME='recordings' then dead:=dead+new.mortality+new.culling; end if;
  if TG_TABLE_NAME='harvests' then harvested:=harvested+new.birds; end if;
  if dead+harvested>qty_received then
    raise exception 'Mortalitas, afkir, dan panen melebihi populasi diterima';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.audit_master_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),TG_OP,TG_TABLE_NAME,
    case when TG_OP='DELETE' then old.id::text else new.id::text end,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) end);
  if TG_OP='DELETE' then return old; end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_contract_detail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cid uuid;
  st public.cycle_state;
  rec_id text;
begin
  select k.cycle_id into cid
  from public.contracts k
  where k.id=new.contract_id;

  if not found then
    raise exception 'Kontrak tidak ditemukan';
  end if;

  if cid is not null then
    select state into st
    from public.cycles
    where id=cid
    for update;

    if st is null then
      raise exception 'Siklus tidak ditemukan';
    end if;

    if st <> 'ACTIVE' then
      raise exception 'Kontrak siklus terkunci';
    end if;
  end if;

  if TG_TABLE_NAME = 'contract_live_prices' then
    if exists (
      select 1
      from public.contract_live_prices p
      where p.contract_id=new.contract_id
        and p.id<>new.id
        and numrange(p.min_weight_kg,coalesce(p.max_weight_kg,1000000),'[)')
          && numrange(new.min_weight_kg,coalesce(new.max_weight_kg,1000000),'[)')
    ) then
      raise exception 'Rentang bobot kontrak tumpang tindih';
    end if;
  end if;

  rec_id := new.id::text;

  insert into public.audit_events(actor,action,table_name,record_id,new_data)
  values(auth.uid(),TG_OP,TG_TABLE_NAME,rec_id,to_jsonb(new));

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.assign_bms_role_impl(p_email text, p_role public.bms_role, p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare target_id uuid;
begin
  if private.my_bms_role() IS DISTINCT FROM 'ADMIN' then
    raise exception 'Hanya Administrator';
  end if;

  select id into target_id
  from auth.users
  where lower(email)=lower(trim(p_email))
    and email_confirmed_at is not null;

  if target_id is null then
    raise exception 'Akun belum ditemukan atau email belum diverifikasi';
  end if;

  insert into public.profiles(user_id,role,full_name,active)
  values(target_id,p_role,p_name,true)
  on conflict(user_id) do update
    set role=excluded.role,full_name=excluded.full_name,active=true;

  insert into public.audit_events(actor,action,table_name,record_id,new_data)
  values(auth.uid(),'ASSIGN_ROLE','profiles',target_id::text,
    jsonb_build_object('role',p_role,'name',p_name));

  return target_id;
end
$function$;

CREATE OR REPLACE FUNCTION private.set_cycle_state_impl(p_cycle uuid, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS public.cycles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.cycles;
  role_now public.bms_role;
  contract_ok boolean;
  missing text[];
begin
  role_now := private.my_bms_role();

  select * into c
  from public.cycles
  where id=p_cycle
  for update;

  if not found then
    raise exception 'Siklus tidak ditemukan';
  end if;

  if p_action='READY' and role_now='ADMIN' and c.state='ACTIVE' then
    select cr.is_complete, cr.missing_components
      into contract_ok, missing
    from public.contract_readiness cr
    where cr.cycle_id=p_cycle;

    if contract_ok is distinct from true then
      raise exception 'Kontrak belum lengkap: %',
        array_to_string(coalesce(missing,array['Kontrak belum tersedia']::text[]),', ');
    end if;

    if not exists(select 1 from public.chick_ins where cycle_id=p_cycle)
       or not exists(select 1 from public.supplies where cycle_id=p_cycle)
       or not exists(select 1 from public.recordings where cycle_id=p_cycle)
       or not exists(select 1 from public.harvests where cycle_id=p_cycle) then
      raise exception 'Chick-In, sapronak, recording, dan panen wajib tersedia';
    end if;

    update public.cycles
      set state='READY_RHPP',ready_at=now(),bop_complete=false
      where id=p_cycle returning * into c;

  elsif p_action='UNLOCK'
    and role_now='ADMIN'
    and c.state='READY_RHPP'
    and length(trim(coalesce(p_reason,''))) >= 10 then

    if exists(select 1 from public.rhpp_real where cycle_id=p_cycle)
       or exists(select 1 from public.bop where cycle_id=p_cycle) then
      raise exception 'Hapus atau koreksi transaksi keuangan melalui proses revisi sebelum membuka kunci';
    end if;

    update public.cycles
      set state='ACTIVE',ready_at=null,bop_complete=false
      where id=p_cycle returning * into c;

  elsif p_action='BOP_COMPLETE'
    and role_now in ('ADMIN','KEUANGAN')
    and c.state='READY_RHPP' then

    update public.cycles
      set bop_complete=true
      where id=p_cycle returning * into c;

  elsif p_action='CLOSE'
    and role_now in ('ADMIN','KEUANGAN')
    and c.state='READY_RHPP'
    and c.bop_complete
    and exists(select 1 from public.rhpp_real where cycle_id=p_cycle) then

    update public.cycles
      set state='CLOSED',closed_at=now()
      where id=p_cycle returning * into c;

  else
    raise exception 'Aksi ditolak: role, status, alasan, atau syarat belum sesuai';
  end if;

  insert into public.audit_events(actor,action,table_name,record_id,new_data)
  values(
    auth.uid(),p_action,'cycles',p_cycle::text,
    jsonb_build_object('reason',p_reason,'state',c.state)
  );

  return c;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_barn_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.capacity <= 0 then
    raise exception 'Kapasitas kandang harus lebih dari 0';
  end if;

  if old.active=true and new.active=false
     and exists(
       select 1 from public.logistics_contract_assignments a
       where a.barn_id=old.id and a.active=true
     ) then
    raise exception 'Kandang tidak dapat dinonaktifkan karena masih memiliki Kontrak Logistik aktif';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_barn_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.code is null or btrim(new.code) = '' then
    loop
      new.code := 'KD-' || lpad(nextval('public.barn_code_seq')::text,3,'0');
      exit when not exists(select 1 from public.barns where code=new.code);
    end loop;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.assign_master_auto_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  prefix text;
  seq regclass;
begin
  case TG_TABLE_NAME
    when 'barns' then
      prefix := 'KD-';
      seq := 'public.barn_code_seq'::regclass;
    when 'cycles' then
      prefix := 'SK-';
      seq := 'public.cycle_code_seq'::regclass;
    when 'items' then
      prefix := 'SP-';
      seq := 'public.item_code_seq'::regclass;
    when 'employees' then
      if new.kind='ABK' then
        prefix := 'ABK-';
        seq := 'public.abk_code_seq'::regclass;
      else
        prefix := 'KY-';
        seq := 'public.employee_code_seq'::regclass;
      end if;
    else
      raise exception 'Tabel tidak didukung untuk kode otomatis: %', TG_TABLE_NAME;
  end case;

  loop
    new.code := prefix || lpad(nextval(seq)::text,3,'0');

    exit when not exists (
      select 1 from public.barns b
      where TG_TABLE_NAME='barns' and b.code=new.code
    )
    and not exists (
      select 1 from public.cycles c
      where TG_TABLE_NAME='cycles' and c.code=new.code
    )
    and not exists (
      select 1 from public.items i
      where TG_TABLE_NAME='items' and i.code=new.code
    )
    and not exists (
      select 1 from public.employees e
      where TG_TABLE_NAME='employees' and e.code=new.code
    );
  end loop;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.protect_master_auto_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.code is distinct from old.code then
    raise exception 'Kode dibuat otomatis dan tidak dapat diubah';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.compute_recording_avg_weight()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.sample_count is not null and new.sample_count > 0
     and new.sample_weight_total_kg is not null then
    new.avg_weight_kg := round(new.sample_weight_total_kg / new.sample_count, 2);
  elsif new.sample_count is not null or new.sample_weight_total_kg is not null then
    new.avg_weight_kg := null;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.compute_chickin_avg_weight()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.sample_count is not null and new.sample_count > 0
     and new.sample_weight_total_g is not null then
    new.avg_weight := round(new.sample_weight_total_g / new.sample_count, 2);
  elsif new.sample_count is not null or new.sample_weight_total_g is not null then
    new.avg_weight := null;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.normalize_item_unit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.category='DOC' then
    new.unit := 'EKOR';
    new.kg_per_unit := null;
  elsif new.category='PAKAN' then
    new.unit := 'ZAK';
    new.kg_per_unit := 50.00;
  else
    new.unit := upper(trim(new.unit));
    new.kg_per_unit := null;
    if new.unit is null or new.unit='' then
      raise exception 'Satuan wajib diisi untuk OVK/LAINNYA';
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.compute_supply_quantity_kg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cat text;
  kg_unit numeric;
begin
  select category,kg_per_unit
    into cat,kg_unit
  from public.items
  where id=new.item_id;

  if cat='PAKAN' then
    new.quantity_kg := round(new.quantity * coalesce(kg_unit,50),2);
  else
    new.quantity_kg := null;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.compute_recording_feed_kg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cat text;
  kg_unit numeric;
begin
  if new.feed_item_id is not null and new.feed_bags_out is not null then
    select category,kg_per_unit
      into cat,kg_unit
    from public.items
    where id=new.feed_item_id;

    if cat='PAKAN' then
      new.feed_kg := round(new.feed_bags_out * coalesce(kg_unit,50),2);
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.bind_master_contract_to_cycle(p_master_contract_id uuid, p_cycle_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.bind_master_contract_to_cycle_core(p_master_contract_id,p_cycle_id)
$function$;

CREATE OR REPLACE FUNCTION public.protect_frozen_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.cycle_id is not null and old.frozen_at is not null then
    raise exception 'Kontrak Siklus sudah terkunci dan tidak dapat diubah';
  end if;
  return case when TG_OP='DELETE' then old else new end;
end
$function$;

CREATE OR REPLACE FUNCTION public.protect_frozen_contract_detail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cid uuid;
begin
  if TG_OP='DELETE' then
    cid := old.contract_id;
  else
    cid := new.contract_id;
  end if;

  if exists(
    select 1
    from public.contracts
    where id=cid
      and cycle_id is not null
      and frozen_at is not null
  ) then
    raise exception 'Detail kontrak Siklus sudah terkunci dan tidak dapat diubah';
  end if;

  if TG_OP='DELETE' then
    return old;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.reassign_employee_code_on_kind_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  seq regclass;
  prefix text;
begin
  if new.kind is distinct from old.kind then
    if new.kind='ABK' then
      prefix:='ABK-';
      seq:='public.abk_code_seq'::regclass;
    else
      prefix:='KY-';
      seq:='public.employee_code_seq'::regclass;
    end if;

    loop
      new.code:=prefix||lpad(nextval(seq)::text,3,'0');
      exit when not exists (
        select 1 from public.employees e
        where e.code=new.code and e.id<>old.id
      );
    end loop;
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.prevent_employee_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  raise exception 'Data Karyawan/ABK tidak boleh dihapus. Gunakan status Nonaktif agar riwayat Kasbon/Cicilan tetap aman.';
end
$function$;

CREATE OR REPLACE FUNCTION private.admin_list_bms_users_impl()
 RETURNS TABLE(user_id uuid, email text, full_name text, role public.bms_role, active boolean, email_confirmed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if private.my_bms_role() IS DISTINCT FROM 'ADMIN'::public.bms_role then
    raise exception 'Akses hanya untuk Administrator';
  end if;

  return query
  select p.user_id,
         u.email::text,
         p.full_name,
         p.role,
         p.active,
         (u.email_confirmed_at is not null)
  from public.profiles p
  join auth.users u on u.id=p.user_id
  order by p.full_name, u.email;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_bms_users()
 RETURNS TABLE(user_id uuid, email text, full_name text, role public.bms_role, active boolean, email_confirmed boolean)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select * from private.admin_list_bms_users_impl()
$function$;

CREATE OR REPLACE FUNCTION private.admin_update_bms_user_impl(p_user_id uuid, p_name text, p_role public.bms_role, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if private.my_bms_role() IS DISTINCT FROM 'ADMIN'::public.bms_role then
    raise exception 'Akses hanya untuk Administrator';
  end if;

  if p_user_id is null or nullif(trim(p_name),'') is null then
    raise exception 'Data pengguna tidak lengkap';
  end if;

  if p_user_id = auth.uid()
     and (p_role <> 'ADMIN'::public.bms_role or coalesce(p_active,true)=false) then
    raise exception 'ADMIN yang sedang login tidak boleh menonaktifkan atau mengganti role akun sendiri';
  end if;

  update public.profiles
  set full_name=trim(p_name),
      role=p_role,
      active=coalesce(p_active,true)
  where user_id=p_user_id;

  if not found then
    raise exception 'Pengguna tidak ditemukan';
  end if;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_bms_user(p_user_id uuid, p_name text, p_role public.bms_role, p_active boolean)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.admin_update_bms_user_impl(p_user_id,p_name,p_role,p_active)
$function$;

CREATE OR REPLACE FUNCTION public.prepare_logistics_contract_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.cycle_type='MITRA' then
    if new.master_contract_id is null then
      raise exception 'Master Kontrak wajib dipilih untuk siklus Mitra';
    end if;
    if new.performance_template_name is null or btrim(new.performance_template_name)='' then
      raise exception 'Template Performa wajib dipilih untuk siklus Mitra';
    end if;
    if not exists (
      select 1 from public.contracts c
      where c.id=new.master_contract_id and c.cycle_id is null
    ) then
      raise exception 'Kontrak yang dipilih bukan Master Kontrak';
    end if;
    if not exists (
      select 1 from public.performance_standards p
      where p.contract_id=new.master_contract_id
        and p.template_name=new.performance_template_name
    ) then
      raise exception 'Template Performa tidak tersedia pada kontrak yang dipilih';
    end if;
  elsif new.cycle_type='MANDIRI' then
    new.master_contract_id:=null;
    if new.performance_template_name is null or btrim(new.performance_template_name)='' then
      raise exception 'Template Performa wajib dipilih untuk siklus Mandiri';
    end if;
    if not exists (
      select 1 from public.performance_standards p
      where p.template_name=new.performance_template_name
    ) then
      raise exception 'Template Performa Mandiri tidak tersedia';
    end if;
  else
    raise exception 'Jenis siklus tidak valid';
  end if;

  update public.logistics_contract_assignments
  set active=false
  where barn_id=new.barn_id
    and active=true
    and id is distinct from new.id;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_logistics_shipment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op='UPDATE' and exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=old.contract_assignment_id and a.active=false
  ) then
    raise exception 'Pengiriman terkunci karena kontrak Logistik sudah CLOSED';
  end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=new.contract_assignment_id
      and a.barn_id=new.barn_id
      and a.active=true
  ) then
    raise exception 'Kontrak aktif kandang tidak sesuai';
  end if;

  if tg_op='UPDATE' then new.updated_at:=now(); end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_logistics_shipment_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_shipment uuid;
  v_kg numeric;
begin
  v_shipment:=coalesce(new.shipment_id,old.shipment_id);

  if exists (
    select 1
    from public.logistics_shipments s
    join public.logistics_contract_assignments a on a.id=s.contract_assignment_id
    where s.id=v_shipment and a.active=false
  ) then
    raise exception 'Pengiriman terkunci karena kontrak Logistik sudah CLOSED';
  end if;

  if tg_op<>'DELETE' then
    select case when i.category='PAKAN' then coalesce(i.kg_per_unit,50) * new.quantity else null end
    into v_kg
    from public.items i
    where i.id=new.item_id;
    new.quantity_kg:=v_kg;
  end if;

  return case when tg_op='DELETE' then old else new end;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_logistics_return()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op='UPDATE' and exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=old.contract_assignment_id and a.active=false
  ) then
    raise exception 'Retur terkunci karena kontrak Logistik sudah CLOSED';
  end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=new.contract_assignment_id
      and a.barn_id=new.barn_id
      and a.active=true
  ) then
    raise exception 'Kontrak aktif kandang tidak sesuai';
  end if;

  if tg_op='UPDATE' then new.updated_at:=now(); end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_logistics_return_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_return uuid;
  v_kg numeric;
begin
  v_return:=coalesce(new.return_id,old.return_id);

  if exists (
    select 1
    from public.logistics_returns r
    join public.logistics_contract_assignments a on a.id=r.contract_assignment_id
    where r.id=v_return and a.active=false
  ) then
    raise exception 'Retur terkunci karena kontrak Logistik sudah CLOSED';
  end if;

  if tg_op<>'DELETE' then
    select case when i.category='PAKAN' then coalesce(i.kg_per_unit,50) * new.quantity else null end
    into v_kg
    from public.items i
    where i.id=new.item_id;
    new.quantity_kg:=v_kg;
  end if;

  return case when tg_op='DELETE' then old else new end;
end
$function$;

CREATE OR REPLACE FUNCTION public.autofill_logistics_shipment_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_category text;
  v_phase text;
  v_kg numeric;
  v_doc numeric;
  v_pre numeric;
  v_start numeric;
  v_finish numeric;
  v_ovk_basis text;
  v_ovk numeric;
begin
  select i.category::text,coalesce(i.feed_phase,''),coalesce(i.kg_per_unit,50)
    into v_category,v_phase,v_kg
  from public.items i
  where i.id=new.item_id;

  select c.doc_price,c.pre_starter_price,c.starter_price,c.finisher_price,
         c.ovk_price_basis::text,c.ovk_price
    into v_doc,v_pre,v_start,v_finish,v_ovk_basis,v_ovk
  from public.logistics_shipments s
  join public.logistics_contract_assignments a on a.id=s.contract_assignment_id
  join public.contracts c on c.id=a.master_contract_id
  where s.id=new.shipment_id;

  if v_category='DOC' then
    new.unit_price:=v_doc;
  elsif v_category='PAKAN' then
    if lower(v_phase) like '%pre%' then
      new.unit_price:=v_pre*v_kg;
    elsif lower(v_phase) like '%fin%' then
      new.unit_price:=v_finish*v_kg;
    elsif lower(v_phase) like '%starter%' then
      new.unit_price:=v_start*v_kg;
    else
      raise exception 'Fase pakan belum dipetakan ke harga kontrak.';
    end if;
  elsif v_category='OVK' and v_ovk_basis='FIXED' then
    new.unit_price:=v_ovk;
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_logistics_contract_close_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.active=true and new.active=false then
    if exists (
      select 1
      from public.logistics_shipments s
      join public.logistics_shipment_items si on si.shipment_id=s.id
      where s.contract_assignment_id=old.id
        and (si.unit_price is null or si.unit_price<=0)
    ) then
      raise exception 'Tidak bisa Close: masih ada Pengiriman tanpa harga';
    end if;

    if exists (
      select 1
      from public.logistics_returns r
      join public.logistics_return_items ri on ri.return_id=r.id
      where r.contract_assignment_id=old.id
        and (ri.unit_price is null or ri.unit_price<=0)
    ) then
      raise exception 'Tidak bisa Close: masih ada Retur tanpa harga';
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.autofill_logistics_return_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_category text;
  v_phase text;
  v_kg numeric;
  v_doc numeric;
  v_pre numeric;
  v_start numeric;
  v_finish numeric;
  v_ovk_basis text;
  v_ovk numeric;
begin
  select i.category::text,coalesce(i.feed_phase,''),coalesce(i.kg_per_unit,50)
    into v_category,v_phase,v_kg
  from public.items i
  where i.id=new.item_id;

  select c.doc_price,c.pre_starter_price,c.starter_price,c.finisher_price,
         c.ovk_price_basis::text,c.ovk_price
    into v_doc,v_pre,v_start,v_finish,v_ovk_basis,v_ovk
  from public.logistics_returns r
  join public.logistics_contract_assignments a on a.id=r.contract_assignment_id
  join public.contracts c on c.id=a.master_contract_id
  where r.id=new.return_id;

  if v_category='DOC' then
    new.unit_price:=v_doc;
  elsif v_category='PAKAN' then
    if lower(v_phase) like '%pre%' then
      new.unit_price:=v_pre*v_kg;
    elsif lower(v_phase) like '%fin%' then
      new.unit_price:=v_finish*v_kg;
    elsif lower(v_phase) like '%starter%' then
      new.unit_price:=v_start*v_kg;
    else
      raise exception 'Fase pakan belum dipetakan ke harga kontrak.';
    end if;
  elsif v_category='OVK' and v_ovk_basis='FIXED' then
    new.unit_price:=v_ovk;
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.assign_supplier_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.code is null or btrim(new.code)='' then
    loop
      new.code := 'SUP-' || lpad(nextval('public.supplier_code_seq')::text,3,'0');
      exit when not exists(select 1 from public.suppliers s where s.code=new.code);
    end loop;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.fill_external_shipment_quantity_kg()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  kg numeric;
begin
  select kg_per_unit into kg from public.items where id=new.item_id;
  if kg is not null then new.quantity_kg := new.quantity * kg;
  else new.quantity_kg := null;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_logistics_external_header()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  st text;
begin
  if tg_op in ('UPDATE','DELETE') then
    select * into a from public.logistics_contract_assignments where id=old.contract_assignment_id;
    if a.id is null or not a.active then
      raise exception 'Kontrak Logistik sudah CLOSED. Tambah Sapronak terkunci.';
    end if;
    if tg_op='DELETE' then return old; end if;
  end if;

  select * into a from public.logistics_contract_assignments where id=new.contract_assignment_id;
  if a.id is null or not a.active then
    raise exception 'Kontrak Logistik tidak aktif.';
  end if;
  if a.barn_id<>new.barn_id then
    raise exception 'Kandang tidak sesuai kontrak aktif.';
  end if;
  if new.shipment_date<a.start_date then
    raise exception 'Tanggal Tambah Sapronak tidak boleh sebelum tanggal mulai kontrak.';
  end if;
  select supplier_type into st from public.suppliers where id=new.supplier_id and active=true;
  if st is distinct from 'SAPRONAK' then
    raise exception 'Supplier harus berasal dari Master Supplier Sapronak.';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.guard_logistics_external_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  header_supplier uuid;
  item_supplier uuid;
  st text;
begin
  select h.supplier_id into header_supplier
  from public.logistics_external_shipments h
  where h.id=new.external_shipment_id;
  if header_supplier is null then
    raise exception 'Header Tambah Sapronak tidak ditemukan.';
  end if;

  select i.supplier_id,s.supplier_type into item_supplier,st
  from public.items i
  left join public.suppliers s on s.id=i.supplier_id
  where i.id=new.item_id;

  if item_supplier is null or item_supplier<>header_supplier then
    raise exception 'Sapronak tidak sesuai Supplier.';
  end if;
  if st is distinct from 'SAPRONAK' then
    raise exception 'Item harus terkait Supplier Sapronak.';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.guard_marketing_harvest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  v_avg_bw numeric;
  v_price numeric;
begin
  if tg_op in ('UPDATE','DELETE') then
    select * into a
    from public.logistics_contract_assignments
    where id=old.contract_assignment_id;

    if a.id is null or not a.active then
      raise exception 'Siklus sudah CLOSED. Data panen terkunci.';
    end if;

    if tg_op='DELETE' then
      return old;
    end if;
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null or not a.active then
    raise exception 'Siklus tidak aktif.';
  end if;

  if a.barn_id<>new.barn_id then
    raise exception 'Kandang tidak sesuai siklus aktif.';
  end if;

  if new.harvested_on<a.start_date then
    raise exception 'Tanggal panen tidak boleh sebelum tanggal mulai siklus.';
  end if;

  if coalesce(new.birds,0)<=0 then
    raise exception 'Jumlah ekor harus lebih dari 0.';
  end if;

  if coalesce(new.net_weight_kg,0)<=0 then
    raise exception 'Berat panen harus lebih dari 0 Kg.';
  end if;

  v_avg_bw:=new.net_weight_kg/new.birds;

  if a.cycle_type='MANDIRI' then
    if coalesce(new.price_per_kg,0)<=0 then
      raise exception 'Harga jual Mandiri wajib lebih dari 0.';
    end if;
    if new.buyer_id is null then
      raise exception 'Pelanggan Mandiri wajib dipilih.';
    end if;
    if not exists (
      select 1 from public.marketing_customers c
      where c.id=new.buyer_id and c.active
    ) then
      raise exception 'Pelanggan Mandiri tidak aktif atau tidak ditemukan.';
    end if;
    select c.name into new.buyer_name
    from public.marketing_customers c
    where c.id=new.buyer_id;
  else
    select lp.price_per_kg into v_price
    from public.contract_live_prices lp
    where lp.contract_id=a.master_contract_id
      and v_avg_bw>=lp.min_weight_kg
      and (lp.max_weight_kg is null or v_avg_bw<lp.max_weight_kg)
    order by lp.min_weight_kg desc
    limit 1;

    if v_price is null then
      raise exception 'Harga kontrak untuk BW rata-rata % Kg belum tersedia.',round(v_avg_bw,3);
    end if;

    new.price_per_kg:=v_price;
    new.buyer_id:=null;
  end if;

  new.updated_at:=now();
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_marketing_meat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  st text;
begin
  if tg_op in ('UPDATE','DELETE') then
    select * into a from public.logistics_contract_assignments where id=old.contract_assignment_id;
    if a.id is null or not a.active then
      raise exception 'Kontrak sudah CLOSED. Tambah Daging terkunci.';
    end if;
    if tg_op='DELETE' then return old; end if;
  end if;

  select * into a from public.logistics_contract_assignments where id=new.contract_assignment_id;
  if a.id is null or not a.active then raise exception 'Kontrak tidak aktif.'; end if;
  if a.barn_id<>new.barn_id then raise exception 'Kandang tidak sesuai kontrak aktif.'; end if;
  if new.purchase_date<a.start_date then raise exception 'Tanggal Tambah Daging tidak boleh sebelum tanggal mulai kontrak.'; end if;
  select supplier_type into st from public.suppliers where id=new.supplier_id and active=true;
  if st is distinct from 'DAGING' then raise exception 'Supplier harus berasal dari Master Supplier Daging.'; end if;
  if new.purchase_price_per_kg<=0 then raise exception 'Harga beli per Kg wajib lebih dari 0.'; end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.guard_item_supplier_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare st text;
begin
  if new.supplier_id is not null then
    select supplier_type into st from public.suppliers where id=new.supplier_id;
    if st is distinct from 'SAPRONAK' then
      raise exception 'Master Sapronak hanya boleh memakai Supplier Sapronak.';
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.bind_master_contract_to_cycle_core(p_master_contract_id uuid, p_cycle_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.contracts%rowtype;
  new_contract_id uuid;
  st public.cycle_state;
begin
  if private.my_bms_role() IS DISTINCT FROM 'ADMIN'::public.bms_role then
    raise exception 'Hanya ADMIN yang dapat mengikat kontrak';
  end if;

  select * into m
  from public.contracts
  where id=p_master_contract_id
    and cycle_id is null;

  if not found then
    raise exception 'Master Kontrak tidak ditemukan';
  end if;

  if m.performance_template_name is null then
    raise exception 'Template performa belum dipilih';
  end if;

  if not exists(
    select 1 from public.performance_standards
    where contract_id=m.id and template_name=m.performance_template_name
  ) then
    raise exception 'Template performa tidak ditemukan';
  end if;

  select state into st
  from public.cycles
  where id=p_cycle_id
  for update;

  if st is null then raise exception 'Siklus tidak ditemukan'; end if;
  if st <> 'ACTIVE' then raise exception 'Siklus tidak aktif'; end if;
  if exists(select 1 from public.contracts where cycle_id=p_cycle_id) then
    raise exception 'Siklus sudah memiliki kontrak';
  end if;

  insert into public.contracts(
    cycle_id,number,contract_date,integrator,
    doc_price,pre_starter_price,starter_price,finisher_price,
    ovk_price,harvest_price,parameters,ovk_price_basis,
    ovk_vat_percent,signed_reference,
    source_master_contract_id,frozen_at,performance_template_name
  )
  values(
    p_cycle_id,
    m.number || '-' || (select code from public.cycles where id=p_cycle_id),
    m.contract_date,m.integrator,
    m.doc_price,m.pre_starter_price,m.starter_price,m.finisher_price,
    m.ovk_price,m.harvest_price,m.parameters,m.ovk_price_basis,
    m.ovk_vat_percent,m.signed_reference,
    m.id,now(),m.performance_template_name
  )
  returning id into new_contract_id;

  insert into public.contract_live_prices(contract_id,min_weight_kg,max_weight_kg,price_per_kg)
  select new_contract_id,min_weight_kg,max_weight_kg,price_per_kg
  from public.contract_live_prices
  where contract_id=p_master_contract_id;

  insert into public.contract_bonuses(contract_id,metric,min_value,max_value,rupiah_per_kg,notes)
  select new_contract_id,metric,min_value,max_value,rupiah_per_kg,notes
  from public.contract_bonuses
  where contract_id=p_master_contract_id;

  insert into public.performance_standards(
    contract_id,template_name,age_days,std_body_weight_g,std_fcr,std_feed_g_per_bird
  )
  select new_contract_id,template_name,age_days,std_body_weight_g,std_fcr,std_feed_g_per_bird
  from public.performance_standards
  where contract_id=p_master_contract_id
    and template_name=m.performance_template_name;

  return new_contract_id;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_chick_in_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
begin
  if tg_op='DELETE' then
    select * into a
    from public.logistics_contract_assignments
    where id=old.contract_assignment_id;

    if old.contract_assignment_id is not null and coalesce(a.active,false)=false then
      raise exception 'Kontrak sudah CLOSED. Chick-In terkunci.';
    end if;
    return old;
  end if;

  if new.contract_assignment_id is null or new.barn_id is null then
    raise exception 'Kandang / Kontrak Aktif wajib dipilih.';
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null then
    raise exception 'Kontrak kandang tidak ditemukan.';
  end if;

  if a.active=false then
    raise exception 'Kontrak sudah CLOSED. Chick-In terkunci.';
  end if;

  if a.barn_id<>new.barn_id then
    raise exception 'Kandang tidak sesuai kontrak aktif.';
  end if;

  if new.arrived_on<a.start_date then
    raise exception 'Tanggal Chick-In tidak boleh sebelum tanggal mulai kontrak.';
  end if;

  if new.received<=0 or new.doa<0 or new.doa>=new.received then
    raise exception 'Jumlah DOC/DOA tidak valid. Populasi bersih harus lebih dari 0.';
  end if;

  if new.avg_weight is not null and new.avg_weight<=0 then
    raise exception 'Bobot DOC rata-rata harus lebih dari 0.';
  end if;

  new.shipped:=new.received;
  new.cycle_id:=null;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_production_recording()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  ci public.chick_ins%rowtype;
  kg_per numeric;
  used_dead integer;
  sent_units numeric;
  external_units numeric;
  returned_units numeric;
  used_units numeric;
  available_units numeric;
begin
  if tg_op='DELETE' then
    select * into a
    from public.logistics_contract_assignments
    where id=old.contract_assignment_id;

    if old.contract_assignment_id is not null and coalesce(a.active,false)=false then
      raise exception 'Kontrak sudah CLOSED. Recording terkunci.';
    end if;
    return old;
  end if;

  if new.contract_assignment_id is null or new.barn_id is null then
    raise exception 'Kandang / Kontrak Aktif wajib dipilih.';
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null or not a.active then
    raise exception 'Kontrak tidak aktif.';
  end if;

  if a.barn_id<>new.barn_id then
    raise exception 'Kandang tidak sesuai kontrak.';
  end if;

  select * into ci
  from public.chick_ins
  where contract_assignment_id=a.id
  order by arrived_on desc
  limit 1;

  if ci.id is null then
    raise exception 'Chick-In harus diisi sebelum Recording PPL.';
  end if;

  if new.age_days is null or new.age_days < 1 then
    raise exception 'Hari recording harus dimulai dari Hari ke-1.';
  end if;

  -- Umur 1 adalah hari Chick-In.
  new.recorded_on := ci.arrived_on + (new.age_days - 1);

  if exists (
    select 1
    from public.recordings r
    where r.contract_assignment_id=new.contract_assignment_id
      and r.age_days=new.age_days
      and r.id is distinct from new.id
  ) then
    raise exception 'Hari ke-% sudah pernah diisi.', new.age_days;
  end if;

  if new.feed_item_id is null or new.feed_quantity_units is null or new.feed_quantity_units<=0 then
    raise exception 'Pakan dan jumlah pemakaian wajib diisi.';
  end if;

  select i.kg_per_unit into kg_per
  from public.items i
  where i.id=new.feed_item_id and i.category='PAKAN' and i.active=true;

  if kg_per is null or kg_per<=0 then
    raise exception 'Konversi Kg/Satuan pakan belum tersedia.';
  end if;

  select coalesce(sum(li.quantity),0)
    into sent_units
  from public.logistics_shipments s
  join public.logistics_shipment_items li on li.shipment_id=s.id
  where s.contract_assignment_id=new.contract_assignment_id
    and li.item_id=new.feed_item_id;

  select coalesce(sum(li.quantity),0)
    into external_units
  from public.logistics_external_shipments s
  join public.logistics_external_shipment_items li on li.external_shipment_id=s.id
  where s.contract_assignment_id=new.contract_assignment_id
    and li.item_id=new.feed_item_id;

  select coalesce(sum(li.quantity),0)
    into returned_units
  from public.logistics_returns r
  join public.logistics_return_items li on li.return_id=r.id
  where r.contract_assignment_id=new.contract_assignment_id
    and li.item_id=new.feed_item_id;

  select coalesce(sum(r.feed_quantity_units),0)
    into used_units
  from public.recordings r
  where r.contract_assignment_id=new.contract_assignment_id
    and r.feed_item_id=new.feed_item_id
    and r.id is distinct from new.id;

  available_units := sent_units + external_units - returned_units - used_units;

  if available_units<=0 then
    raise exception 'Stok pakan ini sudah habis.';
  end if;

  if new.feed_quantity_units>available_units then
    raise exception 'Pemakaian pakan melebihi sisa stok. Sisa: % satuan.', available_units;
  end if;

  new.feed_kg := new.feed_quantity_units*kg_per;

  select coalesce(sum(r.mortality+r.culling),0)
    into used_dead
  from public.recordings r
  where r.contract_assignment_id=new.contract_assignment_id
    and r.id is distinct from new.id;

  if used_dead + coalesce(new.mortality,0) + coalesce(new.culling,0) >= (ci.received-ci.doa) then
    raise exception 'Kematian dan afkir tidak boleh menghabiskan seluruh populasi.';
  end if;

  new.cycle_id:=null;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_production_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  ci public.chick_ins%rowtype;
begin
  if tg_op='DELETE' then
    select * into a
    from public.logistics_contract_assignments
    where id=old.contract_assignment_id;

    if old.contract_assignment_id is not null
       and coalesce(a.active,false)=false then
      raise exception 'Kontrak sudah CLOSED. Kunjungan terkunci.';
    end if;
    return old;
  end if;

  if new.contract_assignment_id is null or new.barn_id is null then
    raise exception 'Kandang / Kontrak Aktif wajib dipilih.';
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null or not a.active or a.barn_id<>new.barn_id then
    raise exception 'Kontrak/kandang tidak aktif atau tidak sesuai.';
  end if;

  select * into ci
  from public.chick_ins
  where contract_assignment_id=a.id
  limit 1;

  if ci.id is null then
    raise exception 'Chick-In harus tersedia sebelum Kunjungan PPL.';
  end if;

  if new.visited_on < ci.arrived_on then
    raise exception 'Tanggal Kunjungan tidak boleh sebelum Chick-In.';
  end if;

  if length(trim(coalesce(new.findings,''))) < 3 then
    raise exception 'Temuan Kunjungan wajib diisi.';
  end if;

  if length(trim(coalesce(new.recommendation,''))) < 3 then
    raise exception 'Rekomendasi Kunjungan wajib diisi.';
  end if;

  if length(trim(coalesce(new.follow_up,''))) < 3 then
    raise exception 'Tindak lanjut Kunjungan wajib diisi.';
  end if;

  new.follow_up_status := upper(trim(coalesce(new.follow_up_status,'')));
  if new.follow_up_status not in ('BELUM','PROSES','SELESAI') then
    raise exception 'Status tindak lanjut harus BELUM, PROSES, atau SELESAI.';
  end if;

  new.cycle_id := null;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_production_estimate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  ci public.chick_ins%rowtype;
begin
  if tg_op='DELETE' then
    select * into a
    from public.logistics_contract_assignments
    where id=old.contract_assignment_id;

    if coalesce(a.active,false)=false then
      raise exception 'Kontrak sudah CLOSED. Estimasi terkunci.';
    end if;
    return old;
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null or not a.active or a.barn_id<>new.barn_id then
    raise exception 'Kontrak/kandang tidak aktif atau tidak sesuai.';
  end if;

  select * into ci
  from public.chick_ins
  where contract_assignment_id=a.id;

  if ci.id is null then
    raise exception 'Chick-In belum tersedia.';
  end if;

  -- Hari Chick-In dihitung sebagai umur 1.
  if ((new.estimated_on - ci.arrived_on) + 1) < 23 then
    raise exception 'Estimasi dimulai minimal umur 23 hari.';
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_production_abk_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
    declare a public.logistics_contract_assignments%rowtype;
            ci public.chick_ins%rowtype;
    begin
      if tg_op='DELETE' then
        select * into a from public.logistics_contract_assignments where id=old.contract_assignment_id;
        if coalesce(a.active,false)=false then raise exception 'Kontrak sudah CLOSED. Liga ABK terkunci.'; end if;
        return old;
      end if;
      select * into a from public.logistics_contract_assignments where id=new.contract_assignment_id;
      if a.id is null or not a.active or a.barn_id<>new.barn_id then raise exception 'Kontrak/kandang tidak aktif atau tidak sesuai.'; end if;
      if not exists(select 1 from public.logistics_contract_assignment_abks x where x.contract_assignment_id=a.id and x.abk_id=new.abk_id) then
        raise exception 'ABK tidak terdaftar pada kontrak kandang ini.';
      end if;
      select * into ci from public.chick_ins where contract_assignment_id=a.id;
      if ci.id is null or new.harvest_date<ci.arrived_on then raise exception 'Tanggal panen tidak valid.'; end if;
      return new;
    end $function$;

CREATE OR REPLACE FUNCTION public.production_feed_stock(p_contract_assignment_id uuid)
 RETURNS TABLE(item_id uuid, code text, name text, unit text, kg_per_unit numeric, sent_units numeric, external_units numeric, returned_units numeric, used_units numeric, remaining_units numeric, remaining_kg numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active;

  if (v_role IS NULL OR v_role not in ('ADMIN'::public.bms_role,'OWNER'::public.bms_role,'PPL'::public.bms_role)) then
    raise exception 'Akses ditolak.';
  end if;

  if not exists (
    select 1
    from public.logistics_contract_assignments a
    where a.id=p_contract_assignment_id
      and (
        v_role in ('ADMIN'::public.bms_role,'OWNER'::public.bms_role)
        or (v_role='PPL'::public.bms_role and a.ppl_id=auth.uid())
      )
  ) then
    raise exception 'Kontrak tidak ditemukan atau tidak dapat diakses.';
  end if;

  return query
  with feed as (
    select i.id item_id,i.code,i.name,i.unit,coalesce(i.kg_per_unit,0) kg_per_unit
    from public.items i where i.active=true and i.category='PAKAN'
  ),
  sent as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_shipments s
    join public.logistics_shipment_items li on li.shipment_id=s.id
    where s.contract_assignment_id=p_contract_assignment_id
    group by li.item_id
  ),
  ext as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_external_shipments s
    join public.logistics_external_shipment_items li on li.external_shipment_id=s.id
    where s.contract_assignment_id=p_contract_assignment_id
    group by li.item_id
  ),
  ret as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_returns r
    join public.logistics_return_items li on li.return_id=r.id
    where r.contract_assignment_id=p_contract_assignment_id
    group by li.item_id
  ),
  retained as (
    select l.item_id,sum(l.quantity) qty
    from public.logistics_mitra_retained_feed l
    where l.source_assignment_id=p_contract_assignment_id
    group by l.item_id
  ),
  company_move as (
    select l.item_id,sum(case when m.direction='IN' then m.quantity else -m.quantity end) qty
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    where m.contract_assignment_id=p_contract_assignment_id
    group by l.item_id
  ),
  mandiri as (
    select p.item_id,coalesce(sum(a.quantity),0) qty
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_mandiri_purchases p on p.id=a.purchase_id
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id and ca.cycle_type='MANDIRI'
    where a.contract_assignment_id=p_contract_assignment_id
    group by p.item_id
  ),
  used as (
    select r.feed_item_id item_id,coalesce(sum(r.feed_quantity_units),0) qty
    from public.recordings r
    where r.contract_assignment_id=p_contract_assignment_id
    group by r.feed_item_id
  ),
  adj as (
    select a.item_id,coalesce(sum(a.adjustment_units),0) qty
    from public.production_feed_stock_adjustments a
    where a.contract_assignment_id=p_contract_assignment_id
    group by a.item_id
  )
  select
    f.item_id,f.code,f.name,f.unit,f.kg_per_unit,
    coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0),
    coalesce(e.qty,0),
    coalesce(rt.qty,0)+coalesce(rs.qty,0),
    coalesce(u.qty,0),
    greatest(0,
      coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)
      -coalesce(rt.qty,0)-coalesce(rs.qty,0)-coalesce(u.qty,0)+coalesce(a.qty,0)
    ),
    greatest(0,
      coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)
      -coalesce(rt.qty,0)-coalesce(rs.qty,0)-coalesce(u.qty,0)+coalesce(a.qty,0)
    )*f.kg_per_unit
  from feed f
  left join sent s on s.item_id=f.item_id
  left join mandiri m on m.item_id=f.item_id
  left join company_move cm on cm.item_id=f.item_id
  left join retained rs on rs.item_id=f.item_id
  left join ext e on e.item_id=f.item_id
  left join ret rt on rt.item_id=f.item_id
  left join used u on u.item_id=f.item_id
  left join adj a on a.item_id=f.item_id
  where coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)-coalesce(rt.qty,0)-coalesce(rs.qty,0)<>0
  order by f.code;
end
$function$;

CREATE OR REPLACE FUNCTION private.can_read_assignment(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.logistics_contract_assignments a
    join public.profiles p on p.user_id=(select auth.uid()) and p.active
    where a.id=aid
      and p.role in ('ADMIN','OWNER','KEUANGAN','LOGISTIK','MARKETING','PPL')
      and (p.role <> 'PPL'::public.bms_role or a.ppl_id=(select auth.uid()))
  )
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_assignment(aid uuid, allowed public.bms_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.logistics_contract_assignments a
    join public.profiles p on p.user_id=(select auth.uid()) and p.active
    where a.id=aid
      and p.role=any(allowed)
      and (
        p.role='ADMIN'::public.bms_role
        or (
          a.active=true
          and (p.role <> 'PPL'::public.bms_role or a.ppl_id=(select auth.uid()))
        )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION private.guard_assignment_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 a public.logistics_contract_assignments%rowtype;
 aid uuid;
 finance_access boolean;
begin
 aid:=case when tg_op='DELETE' then old.contract_assignment_id else new.contract_assignment_id end;
 if aid is null then raise exception 'Kandang / Kontrak Logistik wajib dipilih.'; end if;
 select * into a from public.logistics_contract_assignments where id=aid;
 if a.id is null then raise exception 'Kontrak Logistik tidak ditemukan.'; end if;
 finance_access:=tg_table_schema='public' and tg_table_name='bop' and exists(
  select 1 from public.profiles p where p.user_id=auth.uid() and p.active
   and p.role in ('ADMIN','KEUANGAN') and (tg_op<>'DELETE' or p.role='ADMIN')
 ) and exists(select 1 from public.finance_bop_period_access x where x.contract_assignment_id=aid and x.is_open);
 if not a.active and not finance_access then raise exception 'Kontrak Logistik sudah CLOSED dan data terkunci. Untuk BOP, ADMIN dapat Buka Pencatatan BOP.'; end if;
 if tg_table_schema='public' and tg_table_name='bop' and tg_op='UPDATE' and old.contract_assignment_id is distinct from new.contract_assignment_id then
  if exists(select 1 from public.logistics_contract_assignments x where x.id=old.contract_assignment_id and not x.active)
   and not (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')) and exists(select 1 from public.finance_bop_period_access x where x.contract_assignment_id=old.contract_assignment_id and x.is_open))
  then raise exception 'BOP periode asal CLOSED masih terkunci.'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 new.barn_id:=a.barn_id;
 new.cycle_id:=null;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.guard_logistics_assignment_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.active=true and new.active=false then
    if coalesce(current_setting('bms.allow_production_close',true),'') <> '1' then
      raise exception 'Close Produksi hanya dapat dilakukan dari RHPP Administrator.';
    end if;
  end if;
  if old.active=false and new.active=true then
    if coalesce(current_setting('bms.allow_production_reopen',true),'') <> '1'
       or not exists (
         select 1 from public.profiles p
         where p.user_id=auth.uid() and p.active and p.role='ADMIN'
       ) then
      raise exception 'Buka Kembali Siklus hanya dapat dilakukan Administrator.';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, sapronak_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with harvest as (
    select
      h.contract_assignment_id,
      sum(h.birds)::numeric as birds,
      sum(h.net_weight_kg)::numeric as kg,
      sum(h.total_amount)::numeric as value,
      sum(h.birds * ((h.harvested_on-ci.arrived_on)+1))::numeric
        / nullif(sum(h.birds),0) as weighted_age
    from public.marketing_contract_harvests h
    join public.chick_ins ci on ci.contract_assignment_id=h.contract_assignment_id
    group by h.contract_assignment_id
  ),
  feed_ship as (
    select s.contract_assignment_id,coalesce(sum(li.quantity_kg),0)::numeric as kg
    from public.logistics_shipments s
    join public.logistics_shipment_items li on li.shipment_id=s.id
    join public.items i on i.id=li.item_id
    where i.category='PAKAN'
    group by s.contract_assignment_id
  ),
  feed_ret as (
    select r.contract_assignment_id,coalesce(sum(li.quantity_kg),0)::numeric as kg
    from public.logistics_returns r
    join public.logistics_return_items li on li.return_id=r.id
    join public.items i on i.id=li.item_id
    where i.category='PAKAN'
    group by r.contract_assignment_id
  ),
  raw as (
    select
      a.id as assignment_id,
      a.barn_id,
      b.code as barn_code,
      b.name as barn_name,
      c.number as contract_number,
      a.active,
      (ci.received-ci.doa)::numeric as chick_in_birds,
      coalesce(h.birds,0)::numeric as total_harvest_birds,
      coalesce(h.kg,0)::numeric as total_harvest_kg,
      case when coalesce(h.birds,0)>0 then h.kg/h.birds else 0 end::numeric as avg_bw_kg,
      coalesce(h.weighted_age,0)::numeric as weighted_age,
      ((ci.received-ci.doa)-coalesce(h.birds,0))::numeric as implied_depletion_birds,
      ((ci.received-ci.doa)-coalesce(h.birds,0))::numeric as recorded_depletion_birds,
      0::numeric as depletion_variance_birds,
      case when (ci.received-ci.doa)>0
        then (((ci.received-ci.doa)-coalesce(h.birds,0))::numeric/(ci.received-ci.doa))*100
        else 0 end::numeric as mortality_pct,
      greatest(0,coalesce(fs.kg,0)-coalesce(fr.kg,0))::numeric as net_feed_kg,
      coalesce(h.value,0)::numeric as harvest_value,
      coalesce(cs.net_sapronak_cost,0)::numeric as sapronak_cost,
      a.master_contract_id,
      a.performance_template_name
    from public.logistics_contract_assignments a
    join public.barns b on b.id=a.barn_id
    join public.contracts c on c.id=a.master_contract_id
    join public.chick_ins ci on ci.contract_assignment_id=a.id
    left join harvest h on h.contract_assignment_id=a.id
    left join feed_ship fs on fs.contract_assignment_id=a.id
    left join feed_ret fr on fr.contract_assignment_id=a.id
    left join public.logistics_rhpp_cost_summary cs on cs.contract_assignment_id=a.id
  ),
  metrics as (
    select
      r.*,
      case when r.total_harvest_kg>0 then r.net_feed_kg/r.total_harvest_kg else 0 end::numeric as fcr_actual,
      lo.age_days as lo_age,lo.std_fcr as lo_fcr,
      hi.age_days as hi_age,hi.std_fcr as hi_fcr
    from raw r
    left join lateral (
      select ps.age_days,ps.std_fcr
      from public.performance_standards ps
      where ps.contract_id=r.master_contract_id
        and ps.template_name=r.performance_template_name
        and ps.age_days<=r.weighted_age
      order by ps.age_days desc
      limit 1
    ) lo on true
    left join lateral (
      select ps.age_days,ps.std_fcr
      from public.performance_standards ps
      where ps.contract_id=r.master_contract_id
        and ps.template_name=r.performance_template_name
        and ps.age_days>=r.weighted_age
      order by ps.age_days asc
      limit 1
    ) hi on true
  ),
  scored as (
    select
      m.*,
      case
        when m.lo_fcr is null then m.hi_fcr
        when m.hi_fcr is null then m.lo_fcr
        when m.hi_age=m.lo_age then m.lo_fcr
        else m.lo_fcr + ((m.weighted_age-m.lo_age)/(m.hi_age-m.lo_age))*(m.hi_fcr-m.lo_fcr)
      end::numeric as fcr_standard,
      case
        when m.weighted_age>0 and m.fcr_actual>0 then
          ((100-m.mortality_pct)*m.avg_bw_kg*100)/(m.weighted_age*m.fcr_actual)
        else 0
      end::numeric as ip
    from metrics m
  ),
  bonus_rates as (
    select
      s.*,
      coalesce(ipb.rupiah_per_kg,0)::numeric as bonus_ip_rate,
      coalesce(fcb.rupiah_per_kg,0)::numeric as bonus_fc_rate
    from scored s
    left join lateral (
      select cb.rupiah_per_kg
      from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id
        and cb.metric='IP'
        and (cb.min_value is null or s.ip>=cb.min_value)
        and (cb.max_value is null or s.ip<cb.max_value)
      order by cb.min_value desc nulls last
      limit 1
    ) ipb on true
    left join lateral (
      select cb.rupiah_per_kg
      from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id
        and cb.metric='FCR_DIFFERENCE'
        and (cb.min_value is null or (s.fcr_standard-s.fcr_actual)>=cb.min_value)
        and (cb.max_value is null or (s.fcr_standard-s.fcr_actual)<cb.max_value)
      order by cb.min_value desc nulls last
      limit 1
    ) fcb on true
  )
  select
    br.assignment_id,
    br.barn_id,
    br.barn_code,
    br.barn_name,
    br.contract_number,
    br.active,
    br.chick_in_birds,
    br.total_harvest_birds,
    br.total_harvest_kg,
    br.avg_bw_kg,
    br.weighted_age,
    br.implied_depletion_birds,
    br.recorded_depletion_birds,
    br.depletion_variance_birds,
    br.mortality_pct,
    br.net_feed_kg,
    br.fcr_actual,
    br.fcr_standard,
    (coalesce(br.fcr_standard,0)-br.fcr_actual)::numeric as diff_fcr,
    br.ip,
    br.harvest_value,
    br.sapronak_cost,
    (br.harvest_value-br.sapronak_cost)::numeric as base_profit,
    br.bonus_ip_rate,
    (br.total_harvest_kg*br.bonus_ip_rate)::numeric as bonus_ip,
    br.bonus_fc_rate,
    (br.total_harvest_kg*br.bonus_fc_rate)::numeric as bonus_fc,
    0::numeric as bonus_mortality,
    (br.harvest_value-br.sapronak_cost
      + br.total_harvest_kg*br.bonus_ip_rate
      + br.total_harvest_kg*br.bonus_fc_rate)::numeric as farmer_profit,
    case when br.chick_in_birds>0 then
      (br.harvest_value-br.sapronak_cost
       + br.total_harvest_kg*br.bonus_ip_rate
       + br.total_harvest_kg*br.bonus_fc_rate)/br.chick_in_birds
      else 0 end::numeric as profit_per_chick_in,
    case when br.total_harvest_birds>0 then
      (br.harvest_value-br.sapronak_cost
       + br.total_harvest_kg*br.bonus_ip_rate
       + br.total_harvest_kg*br.bonus_fc_rate)/br.total_harvest_birds
      else 0 end::numeric as profit_per_harvested_bird,
    (br.chick_in_birds>0 and br.total_harvest_birds>0 and br.total_harvest_kg>0
     and br.net_feed_kg>0 and br.sapronak_cost>0)::boolean as ready_financial
  from bonus_rates br
  order by br.active desc,br.barn_code;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_logistics_shipment_atomic(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_shipment_date date, p_shipping_note_number text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  x jsonb;
begin
  if coalesce(jsonb_array_length(p_items),0)=0 then
    raise exception 'Minimal satu Sapronak wajib diisi.';
  end if;

  if p_id is null then
    insert into public.logistics_shipments(
      barn_id,contract_assignment_id,shipment_date,shipping_note_number,notes
    ) values (
      p_barn_id,p_assignment_id,p_shipment_date,p_shipping_note_number,p_notes
    ) returning id into v_id;
  else
    v_id:=p_id;
    update public.logistics_shipments
       set barn_id=p_barn_id,
           contract_assignment_id=p_assignment_id,
           shipment_date=p_shipment_date,
           shipping_note_number=p_shipping_note_number,
           notes=p_notes
     where id=v_id;
    if not found then raise exception 'Pengiriman tidak ditemukan.'; end if;
    delete from public.logistics_shipment_items where shipment_id=v_id;
  end if;

  for x in select * from jsonb_array_elements(p_items)
  loop
    insert into public.logistics_shipment_items(shipment_id,item_id,quantity,unit_price)
    values(
      v_id,
      (x->>'item_id')::uuid,
      (x->>'quantity')::numeric,
      nullif(x->>'unit_price','')::numeric
    );
  end loop;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.save_logistics_return_atomic(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  x record;
  v_sent numeric;
  v_prev_return numeric;
begin
  if coalesce(jsonb_array_length(p_items),0)=0 then
    raise exception 'Minimal satu Sapronak retur wajib diisi.';
  end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=p_assignment_id and a.barn_id=p_barn_id and a.active=true
  ) then raise exception 'Kontrak aktif kandang tidak sesuai.'; end if;

  for x in
    select (e->>'item_id')::uuid item_id, sum((e->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_items) e
    group by (e->>'item_id')::uuid
  loop
    select coalesce(sum(si.quantity),0)
      into v_sent
    from public.logistics_shipments s
    join public.logistics_shipment_items si on si.shipment_id=s.id
    where s.contract_assignment_id=p_assignment_id and si.item_id=x.item_id;

    select coalesce(sum(ri.quantity),0)
      into v_prev_return
    from public.logistics_returns r
    join public.logistics_return_items ri on ri.return_id=r.id
    where r.contract_assignment_id=p_assignment_id
      and ri.item_id=x.item_id
      and (p_id is null or r.id<>p_id);

    if x.quantity<=0 then raise exception 'Jumlah retur harus lebih dari 0.'; end if;
    if x.quantity > v_sent-v_prev_return then
      raise exception 'Jumlah retur melebihi pengiriman kontrak. Maksimal %.', greatest(0,v_sent-v_prev_return);
    end if;
  end loop;

  if p_id is null then
    insert into public.logistics_returns(barn_id,contract_assignment_id,return_date,reference,notes)
    values(p_barn_id,p_assignment_id,p_return_date,p_reference,p_notes)
    returning id into v_id;
  else
    v_id:=p_id;
    update public.logistics_returns
       set barn_id=p_barn_id,contract_assignment_id=p_assignment_id,return_date=p_return_date,
           reference=p_reference,notes=p_notes
     where id=v_id;
    if not found then raise exception 'Retur tidak ditemukan.'; end if;
    delete from public.logistics_return_items where return_id=v_id;
  end if;

  for x in
    select (e->>'item_id')::uuid item_id, sum((e->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_items) e
    group by (e->>'item_id')::uuid
  loop
    insert into public.logistics_return_items(return_id,item_id,quantity)
    values(v_id,x.item_id,x.quantity);
  end loop;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_external_sapronak_atomic(p_header_id uuid, p_detail_id uuid, p_assignment_id uuid, p_barn_id uuid, p_supplier_id uuid, p_shipment_date date, p_reference_number text, p_notes text, p_item_id uuid, p_quantity numeric, p_purchase_unit_price numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_header uuid;
  v_detail uuid;
begin
  if p_header_id is null then
    insert into public.logistics_external_shipments(
      contract_assignment_id,barn_id,supplier_id,shipment_date,reference_number,notes
    ) values(
      p_assignment_id,p_barn_id,p_supplier_id,p_shipment_date,p_reference_number,p_notes
    ) returning id into v_header;

    insert into public.logistics_external_shipment_items(
      external_shipment_id,item_id,quantity,purchase_unit_price
    ) values(v_header,p_item_id,p_quantity,p_purchase_unit_price);
  else
    v_header:=p_header_id;
    update public.logistics_external_shipments
       set contract_assignment_id=p_assignment_id,
           barn_id=p_barn_id,
           supplier_id=p_supplier_id,
           shipment_date=p_shipment_date,
           reference_number=p_reference_number,
           notes=p_notes
     where id=v_header;
    if not found then raise exception 'Tambah Sapronak tidak ditemukan.'; end if;

    if p_detail_id is null then
      select id into v_detail
      from public.logistics_external_shipment_items
      where external_shipment_id=v_header
      order by created_at
      limit 1;
    else
      v_detail:=p_detail_id;
    end if;

    if v_detail is null then
      insert into public.logistics_external_shipment_items(
        external_shipment_id,item_id,quantity,purchase_unit_price
      ) values(v_header,p_item_id,p_quantity,p_purchase_unit_price);
    else
      update public.logistics_external_shipment_items
         set item_id=p_item_id,
             quantity=p_quantity,
             purchase_unit_price=p_purchase_unit_price
       where id=v_detail and external_shipment_id=v_header;
      if not found then raise exception 'Detail Tambah Sapronak tidak ditemukan.'; end if;
    end if;
  end if;
  return v_header;
end $function$;

CREATE OR REPLACE FUNCTION public.save_recording_atomic(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_recorded_on date, p_age_days integer, p_mortality integer, p_culling integer, p_feed_item_id uuid, p_feed_quantity_units numeric, p_sample_count integer, p_sample_weight_total_kg numeric, p_notes text, p_photo_data text, p_weights jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  x jsonb;
  v_count integer;
  v_total_kg numeric;
begin
  if coalesce(jsonb_array_length(p_weights),0)=0 then
    raise exception 'Minimal satu sampel bobot wajib diisi.';
  end if;

  if p_id is null then
    insert into public.recordings(
      contract_assignment_id,barn_id,recorded_on,age_days,mortality,culling,
      feed_item_id,feed_quantity_units,sample_count,sample_weight_total_kg,
      notes,photo_data
    ) values(
      p_assignment_id,p_barn_id,p_recorded_on,p_age_days,p_mortality,p_culling,
      p_feed_item_id,p_feed_quantity_units,p_sample_count,p_sample_weight_total_kg,
      p_notes,p_photo_data
    ) returning id into v_id;
  else
    v_id:=p_id;
    update public.recordings
       set contract_assignment_id=p_assignment_id,
           barn_id=p_barn_id,
           recorded_on=p_recorded_on,
           age_days=p_age_days,
           mortality=p_mortality,
           culling=p_culling,
           feed_item_id=p_feed_item_id,
           feed_quantity_units=p_feed_quantity_units,
           sample_count=p_sample_count,
           sample_weight_total_kg=p_sample_weight_total_kg,
           notes=p_notes,
           photo_data=p_photo_data
     where id=v_id;
    if not found then raise exception 'Recording tidak ditemukan.'; end if;
    delete from public.recording_weight_samples where recording_id=v_id;
  end if;

  for x in select * from jsonb_array_elements(p_weights)
  loop
    insert into public.recording_weight_samples(recording_id,weight_g)
    values(v_id,(x->>'weight_g')::numeric);
  end loop;

  select count(*)::integer,
         coalesce(sum(weight_g),0)/1000
    into v_count,v_total_kg
  from public.recording_weight_samples
  where recording_id=v_id;

  update public.recordings
     set sample_count=v_count,
         sample_weight_total_kg=v_total_kg
   where id=v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_production_estimate_atomic(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_estimated_on date, p_remaining_birds integer, p_feed_used_kg numeric, p_notes text, p_estimated_revenue numeric, p_estimated_cost numeric, p_estimated_profit numeric, p_profit_per_chick_in numeric, p_sizes jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_size jsonb;
  v_sum integer := 0;
  v_arrived_on date;
begin
  if p_estimated_on is null then
    raise exception 'Tanggal estimasi wajib diisi.';
  end if;

  if p_remaining_birds < 0 then
    raise exception 'Sisa ayam tidak boleh negatif.';
  end if;

  if coalesce(p_feed_used_kg,0) < 0 then
    raise exception 'Pakan terpakai tidak boleh negatif.';
  end if;

  if not exists (
    select 1
    from public.logistics_contract_assignments a
    where a.id=p_assignment_id
      and a.barn_id=p_barn_id
      and a.active=true
  ) then
    raise exception 'Kontrak kandang tidak aktif atau kandang tidak sesuai.';
  end if;

  select ci.arrived_on into v_arrived_on
  from public.chick_ins ci
  where ci.contract_assignment_id=p_assignment_id
  limit 1;

  if v_arrived_on is null then
    raise exception 'Chick-In belum tersedia.';
  end if;

  if ((p_estimated_on-v_arrived_on)+1) < 23 then
    raise exception 'Estimasi dimulai umur 23 hari.';
  end if;

  if exists (
    select 1
    from public.production_estimates e
    where e.contract_assignment_id=p_assignment_id
      and e.estimated_on=p_estimated_on
      and (p_id is null or e.id<>p_id)
  ) then
    raise exception 'Estimasi tanggal ini sudah tersimpan. Gunakan Edit.';
  end if;

  if coalesce(jsonb_array_length(p_sizes),0)=0 then
    raise exception 'Minimal satu ukuran estimasi wajib diisi.';
  end if;

  select coalesce(sum((elem.value->>'birds')::integer),0)
    into v_sum
  from jsonb_array_elements(p_sizes) as elem(value);

  if v_sum<>p_remaining_birds then
    raise exception 'Total ayam per ukuran harus sama dengan Sisa Ayam Real.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sizes) as elem(value)
    where coalesce((elem.value->>'birds')::integer,0)<=0
       or coalesce((elem.value->>'bw_kg')::numeric,0)<=0
  ) then
    raise exception 'Jumlah ayam dan BW semua ukuran harus lebih dari 0.';
  end if;

  if p_id is null then
    insert into public.production_estimates(
      contract_assignment_id,barn_id,estimated_on,remaining_birds,feed_used_kg,notes,
      estimated_revenue,estimated_cost,estimated_profit,profit_per_chick_in
    ) values(
      p_assignment_id,p_barn_id,p_estimated_on,p_remaining_birds,p_feed_used_kg,p_notes,
      p_estimated_revenue,p_estimated_cost,p_estimated_profit,p_profit_per_chick_in
    ) returning id into v_id;
  else
    v_id:=p_id;
    update public.production_estimates
       set contract_assignment_id=p_assignment_id,
           barn_id=p_barn_id,
           estimated_on=p_estimated_on,
           remaining_birds=p_remaining_birds,
           feed_used_kg=p_feed_used_kg,
           notes=p_notes,
           estimated_revenue=p_estimated_revenue,
           estimated_cost=p_estimated_cost,
           estimated_profit=p_estimated_profit,
           profit_per_chick_in=p_profit_per_chick_in,
           updated_at=now()
     where id=v_id;

    if not found then
      raise exception 'Estimasi tidak ditemukan.';
    end if;

    delete from public.production_estimate_sizes where estimate_id=v_id;
  end if;

  for v_size in
    select elem.value
    from jsonb_array_elements(p_sizes) as elem(value)
  loop
    insert into public.production_estimate_sizes(estimate_id,birds,bw_kg)
    values(
      v_id,
      (v_size->>'birds')::integer,
      (v_size->>'bw_kg')::numeric
    );
  end loop;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_production_abk_result_atomic(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric, p_sizes jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  x jsonb;
begin
  if coalesce(jsonb_array_length(p_sizes),0)=0 then
    raise exception 'Minimal satu ukuran panen ABK wajib diisi.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_sizes) x
    where coalesce((x->>'birds')::integer,0)<=0
       or coalesce((x->>'weight_kg')::numeric,0)<=0
  ) then
    raise exception 'Ekor dan berat panen setiap ukuran harus lebih dari 0.';
  end if;

  if p_id is null then
    insert into public.production_abk_results(
      contract_assignment_id,barn_id,abk_id,harvest_date,
      feed_pre_kg,feed_starter_kg,feed_finisher_kg
    ) values(
      p_assignment_id,p_barn_id,p_abk_id,p_harvest_date,
      p_feed_pre_kg,p_feed_starter_kg,p_feed_finisher_kg
    ) returning id into v_id;
  else
    v_id:=p_id;
    update public.production_abk_results
       set contract_assignment_id=p_assignment_id,
           barn_id=p_barn_id,
           abk_id=p_abk_id,
           harvest_date=p_harvest_date,
           feed_pre_kg=p_feed_pre_kg,
           feed_starter_kg=p_feed_starter_kg,
           feed_finisher_kg=p_feed_finisher_kg,
           updated_at=now()
     where id=v_id;
    if not found then raise exception 'Hasil ABK tidak ditemukan.'; end if;
    delete from public.production_abk_result_sizes where result_id=v_id;
  end if;

  for x in select * from jsonb_array_elements(p_sizes)
  loop
    insert into public.production_abk_result_sizes(result_id,birds,weight_kg)
    values(v_id,(x->>'birds')::integer,(x->>'weight_kg')::numeric);
  end loop;

  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.save_production_abk_harvest_atomic(p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_feed_pre numeric;
  v_feed_starter numeric;
  v_feed_finisher numeric;
begin
  if p_harvest_date is null then raise exception 'Tanggal Panen wajib diisi.'; end if;
  if coalesce(p_birds,0)<=0 then raise exception 'Ekor harus lebih dari 0.'; end if;
  if coalesce(p_weight_kg,0)<=0 then raise exception 'KG harus lebih dari 0.'; end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=p_assignment_id and a.barn_id=p_barn_id and a.active=true
  ) then
    raise exception 'Kontrak kandang tidak aktif atau sudah Close.';
  end if;

  select coalesce(l.feed_pre_bags,0)*50,
         coalesce(l.feed_starter_bags,0)*50,
         coalesce(l.feed_finisher_bags,0)*50
    into v_feed_pre,v_feed_starter,v_feed_finisher
  from public.logistics_contract_assignment_abks l
  where l.contract_assignment_id=p_assignment_id
    and l.abk_id=p_abk_id
    and l.basics_locked_at is not null;

  if not found then
    raise exception 'Pakan ABK belum disimpan dan dikunci.';
  end if;

  select id into v_id
  from public.production_abk_results
  where contract_assignment_id=p_assignment_id and abk_id=p_abk_id
  limit 1;

  if v_id is null then
    insert into public.production_abk_results(
      contract_assignment_id,barn_id,abk_id,harvest_date,
      feed_pre_kg,feed_starter_kg,feed_finisher_kg
    ) values(
      p_assignment_id,p_barn_id,p_abk_id,p_harvest_date,
      v_feed_pre,v_feed_starter,v_feed_finisher
    ) returning id into v_id;
  else
    update public.production_abk_results
       set barn_id=p_barn_id,
           harvest_date=greatest(coalesce(harvest_date,p_harvest_date),p_harvest_date),
           feed_pre_kg=v_feed_pre,
           feed_starter_kg=v_feed_starter,
           feed_finisher_kg=v_feed_finisher,
           updated_at=now()
     where id=v_id;
  end if;

  insert into public.production_abk_result_sizes(result_id,harvest_date,birds,weight_kg)
  values(v_id,p_harvest_date,p_birds,p_weight_kg);

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.update_production_abk_harvest_atomic(p_size_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_result_id uuid;
  v_assignment_id uuid;
  v_abk_id uuid;
  v_feed_pre numeric;
  v_feed_starter numeric;
  v_feed_finisher numeric;
begin
  if p_harvest_date is null then raise exception 'Tanggal Panen wajib diisi.'; end if;
  if coalesce(p_birds,0)<=0 then raise exception 'Ekor harus lebih dari 0.'; end if;
  if coalesce(p_weight_kg,0)<=0 then raise exception 'KG harus lebih dari 0.'; end if;

  select s.result_id,r.contract_assignment_id,r.abk_id
    into v_result_id,v_assignment_id,v_abk_id
  from public.production_abk_result_sizes s
  join public.production_abk_results r on r.id=s.result_id
  where s.id=p_size_id
  for update of s,r;

  if v_result_id is null then raise exception 'Transaksi Panen ABK tidak ditemukan.'; end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=v_assignment_id and a.active=true
  ) then
    raise exception 'Kontrak kandang sudah Close. Data terkunci.';
  end if;

  select coalesce(l.feed_pre_bags,0)*50,
         coalesce(l.feed_starter_bags,0)*50,
         coalesce(l.feed_finisher_bags,0)*50
    into v_feed_pre,v_feed_starter,v_feed_finisher
  from public.logistics_contract_assignment_abks l
  where l.contract_assignment_id=v_assignment_id
    and l.abk_id=v_abk_id
    and l.basics_locked_at is not null;

  if not found then
    raise exception 'Pakan ABK belum disimpan dan dikunci.';
  end if;

  update public.production_abk_result_sizes
     set harvest_date=p_harvest_date,
         birds=p_birds,
         weight_kg=p_weight_kg
   where id=p_size_id;

  update public.production_abk_results
     set harvest_date=(select max(s.harvest_date) from public.production_abk_result_sizes s where s.result_id=v_result_id),
         feed_pre_kg=v_feed_pre,
         feed_starter_kg=v_feed_starter,
         feed_finisher_kg=v_feed_finisher,
         updated_at=now()
   where id=v_result_id;

  return v_result_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.delete_production_abk_harvest_atomic(p_size_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_result_id uuid;
  v_assignment_id uuid;
begin
  select s.result_id,r.contract_assignment_id
    into v_result_id,v_assignment_id
  from public.production_abk_result_sizes s
  join public.production_abk_results r on r.id=s.result_id
  where s.id=p_size_id
  for update of s,r;

  if v_result_id is null then raise exception 'Transaksi Panen ABK tidak ditemukan.'; end if;

  if not exists (
    select 1 from public.logistics_contract_assignments a
    where a.id=v_assignment_id and a.active=true
  ) then
    raise exception 'Kontrak kandang sudah Close. Data terkunci.';
  end if;

  delete from public.production_abk_result_sizes where id=p_size_id;

  if exists (select 1 from public.production_abk_result_sizes s where s.result_id=v_result_id) then
    update public.production_abk_results
       set harvest_date=(select max(s.harvest_date) from public.production_abk_result_sizes s where s.result_id=v_result_id),
           updated_at=now()
     where id=v_result_id;
  else
    delete from public.production_abk_results where id=v_result_id;
  end if;

  return v_result_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.lock_production_abk_basics_atomic(p_link_id uuid, p_initial_birds integer, p_feed_pre_bags numeric, p_feed_starter_bags numeric, p_feed_finisher_bags numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_assignment_id uuid;
  v_initial integer;
  v_role public.bms_role;
  v_active boolean;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active=true;

  select l.contract_assignment_id,l.initial_birds
    into v_assignment_id,v_initial
  from public.logistics_contract_assignment_abks l
  where l.id=p_link_id
  for update;

  if v_assignment_id is null then
    raise exception 'Data ABK pada kontrak tidak ditemukan.';
  end if;

  select a.active into v_active
  from public.logistics_contract_assignments a
  where a.id=v_assignment_id;

  if coalesce(v_active,false)=false then
    raise exception 'Siklus sudah CLOSED. Data Pakan ABK tidak dapat diubah.';
  end if;

  if v_role='ADMIN' then
    null;
  elsif v_role='PPL' then
    if not exists (
      select 1 from public.logistics_contract_assignments a
      where a.id=v_assignment_id
        and a.active=true
        and a.ppl_id=auth.uid()
    ) then
      raise exception 'PPL hanya dapat mengubah ABK pada kandang aktif yang menjadi tanggung jawabnya.';
    end if;
  else
    raise exception 'Akses ditolak.';
  end if;

  if coalesce(p_feed_pre_bags,0)<0
     or coalesce(p_feed_starter_bags,0)<0
     or coalesce(p_feed_finisher_bags,0)<0 then
    raise exception 'Jumlah zak pakan tidak boleh minus.';
  end if;

  if coalesce(p_feed_pre_bags,0)+coalesce(p_feed_starter_bags,0)+coalesce(p_feed_finisher_bags,0)<=0 then
    raise exception 'Total Penempatan Pakan wajib diisi.';
  end if;

  if coalesce(v_initial,0)<=0 then
    raise exception 'Populasi Awal ABK belum tersedia.';
  end if;

  update public.logistics_contract_assignment_abks
     set feed_pre_bags=coalesce(p_feed_pre_bags,0),
         feed_starter_bags=coalesce(p_feed_starter_bags,0),
         feed_finisher_bags=coalesce(p_feed_finisher_bags,0),
         basics_locked_at=coalesce(basics_locked_at,now())
   where id=p_link_id;

  return p_link_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_locked_abk_basics_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_active boolean;
begin
  select a.active into v_active
  from public.logistics_contract_assignments a
  where a.id=coalesce(new.contract_assignment_id,old.contract_assignment_id);

  if coalesce(v_active,false)=false and old.basics_locked_at is not null and (
       new.feed_pre_bags is distinct from old.feed_pre_bags
    or new.feed_starter_bags is distinct from old.feed_starter_bags
    or new.feed_finisher_bags is distinct from old.feed_finisher_bags
    or new.basics_locked_at is distinct from old.basics_locked_at
  ) then
    raise exception 'Siklus sudah CLOSED. Penempatan Pakan ABK tidak dapat diubah.';
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_production_abk_initial_population_atomic(p_link_id uuid, p_initial_birds integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_assignment_id uuid;
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active=true;

  select l.contract_assignment_id into v_assignment_id
  from public.logistics_contract_assignment_abks l
  where l.id=p_link_id;

  if v_assignment_id is null then
    raise exception 'Data ABK pada kontrak tidak ditemukan.';
  end if;

  if v_role='ADMIN' then
    null;
  elsif v_role='PPL' then
    if not exists (
      select 1 from public.logistics_contract_assignments a
      where a.id=v_assignment_id
        and a.active=true
        and a.ppl_id=auth.uid()
    ) then
      raise exception 'PPL hanya dapat mengisi ABK pada kandang aktif yang menjadi tanggung jawabnya.';
    end if;
  else
    raise exception 'Akses ditolak.';
  end if;

  if coalesce(p_initial_birds,0)<=0 then
    raise exception 'Populasi Awal ABK wajib lebih dari 0.';
  end if;

  update public.logistics_contract_assignment_abks
     set initial_birds=p_initial_birds
   where id=p_link_id;

  return p_link_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_external_sapronak_return_atomic(p_id uuid, p_external_shipment_item_id uuid, p_return_date date, p_reference text, p_notes text, p_quantity numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_source record;
  v_returned numeric;
  v_transfer_count bigint;
begin
  if (select private.my_bms_role()) not in ('ADMIN'::public.bms_role,'LOGISTIK'::public.bms_role) then
    raise exception 'Akses hanya untuk Administrator atau Logistik.';
  end if;

  if p_quantity is null or p_quantity<=0 then
    raise exception 'Jumlah retur harus lebih dari 0.';
  end if;

  select
    ei.id as source_item_id,
    ei.external_shipment_id,
    ei.item_id,
    ei.quantity as source_quantity,
    ei.purchase_unit_price,
    es.contract_assignment_id,
    es.barn_id,
    es.supplier_id,
    a.active,
    coalesce(i.kg_per_unit,0) as kg_per_unit
  into v_source
  from public.logistics_external_shipment_items ei
  join public.logistics_external_shipments es on es.id=ei.external_shipment_id
  join public.logistics_contract_assignments a on a.id=es.contract_assignment_id
  join public.items i on i.id=ei.item_id
  where ei.id=p_external_shipment_item_id;

  if v_source.source_item_id is null then raise exception 'Pembelian Tambah Sapronak tidak ditemukan.'; end if;
  if not v_source.active then raise exception 'Kontrak Logistik sudah CLOSED.'; end if;

  if p_id is not null then
    select count(*)
    into v_transfer_count
    from public.logistics_external_return_transfers t
    join public.logistics_external_return_items ri on ri.id=t.external_return_item_id
    where ri.external_return_id=p_id;

    if v_transfer_count>0 then
      raise exception 'Draft yang sudah pernah dikirim tidak dapat diubah.';
    end if;
  end if;

  select coalesce(sum(eri.quantity),0)
  into v_returned
  from public.logistics_external_return_items eri
  join public.logistics_external_returns er on er.id=eri.external_return_id
  where eri.external_shipment_item_id=p_external_shipment_item_id
    and (p_id is null or er.id<>p_id);

  if p_quantity > v_source.source_quantity-v_returned then
    raise exception 'Jumlah retur melebihi sisa pembelian luar. Maksimal %.', greatest(0,v_source.source_quantity-v_returned);
  end if;

  if p_id is null then
    insert into public.logistics_external_returns(
      external_shipment_id,contract_assignment_id,barn_id,supplier_id,return_date,reference,notes,status,sent_at
    ) values (
      v_source.external_shipment_id,v_source.contract_assignment_id,v_source.barn_id,v_source.supplier_id,
      p_return_date,p_reference,p_notes,'DRAFT',null
    ) returning id into v_id;
  else
    v_id:=p_id;
    update public.logistics_external_returns
       set external_shipment_id=v_source.external_shipment_id,
           contract_assignment_id=v_source.contract_assignment_id,
           barn_id=v_source.barn_id,
           supplier_id=v_source.supplier_id,
           return_date=p_return_date,
           reference=p_reference,
           notes=p_notes,
           status='DRAFT',
           sent_at=null,
           updated_at=now()
     where id=v_id and status='DRAFT';
    if not found then raise exception 'Draft retur tidak ditemukan atau sudah diproses.'; end if;
    delete from public.logistics_external_return_items where external_return_id=v_id;
  end if;

  insert into public.logistics_external_return_items(
    external_return_id,external_shipment_item_id,item_id,quantity,quantity_kg,purchase_unit_price
  ) values (
    v_id,p_external_shipment_item_id,v_source.item_id,p_quantity,
    case when v_source.kg_per_unit>0 then p_quantity*v_source.kg_per_unit else null end,
    v_source.purchase_unit_price
  );

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.transfer_external_sapronak_return_atomic(p_external_return_item_id uuid, p_target_assignment_id uuid, p_quantity numeric, p_transferred_on date, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_src record;
  v_target record;
  v_already numeric;
  v_total_sent numeric;
begin
  if (select private.my_bms_role()) not in ('ADMIN'::public.bms_role,'LOGISTIK'::public.bms_role) then
    raise exception 'Akses hanya untuk Administrator atau Logistik.';
  end if;

  if p_quantity is null or p_quantity<=0 then
    raise exception 'Jumlah kirim harus lebih dari 0.';
  end if;

  select
    eri.id as return_item_id,
    eri.external_return_id,
    eri.item_id,
    eri.quantity as returned_quantity,
    eri.purchase_unit_price,
    er.contract_assignment_id as source_assignment_id,
    er.barn_id as source_barn_id,
    er.status,
    coalesce(i.kg_per_unit,0) as kg_per_unit
  into v_src
  from public.logistics_external_return_items eri
  join public.logistics_external_returns er on er.id=eri.external_return_id
  join public.items i on i.id=eri.item_id
  where eri.id=p_external_return_item_id
  for update of er;

  if v_src.return_item_id is null then
    raise exception 'Draft retur tidak ditemukan.';
  end if;
  if v_src.status='SENT' then
    raise exception 'Draft retur sudah terkirim seluruhnya.';
  end if;

  select a.id,a.barn_id,a.active
  into v_target
  from public.logistics_contract_assignments a
  where a.id=p_target_assignment_id;

  if v_target.id is null or not v_target.active then
    raise exception 'Kandang tujuan belum memiliki kontrak aktif.';
  end if;
  if v_target.barn_id=v_src.source_barn_id then
    raise exception 'Kandang tujuan harus berbeda dari kandang asal.';
  end if;

  select coalesce(sum(t.quantity),0)
  into v_already
  from public.logistics_external_return_transfers t
  where t.external_return_item_id=p_external_return_item_id;

  if p_quantity > v_src.returned_quantity-v_already then
    raise exception 'Jumlah kirim melebihi stok draft. Maksimal %.', greatest(0,v_src.returned_quantity-v_already);
  end if;

  insert into public.logistics_external_return_transfers(
    external_return_item_id,source_contract_assignment_id,source_barn_id,
    target_contract_assignment_id,target_barn_id,item_id,quantity,quantity_kg,
    unit_price,transferred_on,notes
  ) values (
    v_src.return_item_id,v_src.source_assignment_id,v_src.source_barn_id,
    v_target.id,v_target.barn_id,v_src.item_id,p_quantity,
    case when v_src.kg_per_unit>0 then p_quantity*v_src.kg_per_unit else null end,
    v_src.purchase_unit_price,coalesce(p_transferred_on,current_date),p_notes
  )
  returning id into v_id;

  v_total_sent:=v_already+p_quantity;
  update public.logistics_external_returns
     set status=case when v_total_sent>=v_src.returned_quantity then 'SENT' else 'PARTIAL' end,
         sent_at=case when v_total_sent>=v_src.returned_quantity then now() else null end,
         updated_at=now()
   where id=v_src.external_return_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v2()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, ready_financial boolean)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with base as (
    select * from public.finance_rhpp_summary()
  ),
  meat as (
    select
      m.contract_assignment_id,
      coalesce(sum(m.weight_kg * m.purchase_price_per_kg),0)::numeric as external_meat_cost
    from public.marketing_external_meat_purchases m
    group by m.contract_assignment_id
  )
  select
    b.contract_assignment_id,
    b.barn_id,
    b.barn_code,
    b.barn_name,
    b.contract_number,
    b.active,
    b.chick_in_birds,
    b.total_harvest_birds,
    b.total_harvest_kg,
    b.avg_bw_kg,
    b.weighted_age,
    b.implied_depletion_birds,
    b.recorded_depletion_birds,
    b.depletion_variance_birds,
    b.mortality_pct,
    b.net_feed_kg,
    b.fcr_actual,
    b.fcr_standard,
    b.diff_fcr,
    b.ip,
    b.harvest_value,
    b.sapronak_cost,
    coalesce(m.external_meat_cost,0)::numeric as external_meat_cost,
    (b.sapronak_cost + coalesce(m.external_meat_cost,0))::numeric as total_rhpp_cost,
    (b.harvest_value - b.sapronak_cost - coalesce(m.external_meat_cost,0))::numeric as base_profit,
    b.bonus_ip_rate,
    b.bonus_ip,
    b.bonus_fc_rate,
    b.bonus_fc,
    b.bonus_mortality,
    (b.harvest_value - b.sapronak_cost - coalesce(m.external_meat_cost,0)
      + b.bonus_ip + b.bonus_fc + b.bonus_mortality)::numeric as farmer_profit,
    case when b.chick_in_birds>0 then
      (b.harvest_value - b.sapronak_cost - coalesce(m.external_meat_cost,0)
       + b.bonus_ip + b.bonus_fc + b.bonus_mortality)/b.chick_in_birds
      else 0 end::numeric as profit_per_chick_in,
    case when b.total_harvest_birds>0 then
      (b.harvest_value - b.sapronak_cost - coalesce(m.external_meat_cost,0)
       + b.bonus_ip + b.bonus_fc + b.bonus_mortality)/b.total_harvest_birds
      else 0 end::numeric as profit_per_harvested_bird,
    b.ready_financial
  from base b
  left join meat m on m.contract_assignment_id=b.contract_assignment_id
  order by b.active desc,b.barn_code;
$function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v3()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with harvest as (
    select h.contract_assignment_id,
           sum(h.birds)::numeric birds,
           sum(h.net_weight_kg)::numeric kg,
           sum(h.total_amount)::numeric value,
           sum(h.birds*((h.harvested_on-ci.arrived_on)+1))::numeric/nullif(sum(h.birds),0) weighted_age
    from public.marketing_contract_harvests h
    join public.chick_ins ci on ci.contract_assignment_id=h.contract_assignment_id
    group by h.contract_assignment_id
  ),
  main_ship as (
    select s.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then si.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(case when i.category='DOC' then si.quantity*si.unit_price else 0 end),0)::numeric doc_cost,
           coalesce(sum(case when i.category='PAKAN' then si.quantity*si.unit_price else 0 end),0)::numeric feed_cost,
           coalesce(sum(case when i.category='OVK' then si.quantity*si.unit_price else 0 end),0)::numeric ovk_cost,
           coalesce(sum(case when i.category not in ('DOC','PAKAN','OVK') then si.quantity*si.unit_price else 0 end),0)::numeric other_cost,
           coalesce(sum(si.quantity*si.unit_price),0)::numeric total_cost
    from public.logistics_shipments s
    join public.logistics_shipment_items si on si.shipment_id=s.id
    join public.items i on i.id=si.item_id
    group by s.contract_assignment_id
  ),
  main_ret as (
    select r.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ri.quantity*ri.unit_price),0)::numeric total_cost
    from public.logistics_returns r
    join public.logistics_return_items ri on ri.return_id=r.id
    join public.items i on i.id=ri.item_id
    group by r.contract_assignment_id
  ),
  retained_feed as (
    select l.source_assignment_id contract_assignment_id,
           sum(l.quantity*coalesce(i.kg_per_unit,0))::numeric feed_kg
    from public.logistics_mitra_retained_feed l
    join public.items i on i.id=l.item_id
    group by l.source_assignment_id
  ),
  ext_ship as (
    select e.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ei.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ei.quantity*ei.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_shipments e
    join public.logistics_external_shipment_items ei on ei.external_shipment_id=e.id
    join public.items i on i.id=ei.item_id
    group by e.contract_assignment_id
  ),
  ext_ret as (
    select er.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then eri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(eri.quantity*eri.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_returns er
    join public.logistics_external_return_items eri on eri.external_return_id=er.id
    join public.items i on i.id=eri.item_id
    group by er.contract_assignment_id
  ),
  transfer_in as (
    select t.target_contract_assignment_id contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then t.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(t.quantity*t.unit_price),0)::numeric total_cost
    from public.logistics_external_return_transfers t
    join public.items i on i.id=t.item_id
    group by t.target_contract_assignment_id
  ),
  company_in as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='IN'
    group by m.contract_assignment_id
  ),
  company_out as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='OUT'
    group by m.contract_assignment_id
  ),
  meat as (
    select m.contract_assignment_id,
           coalesce(sum(m.weight_kg*m.purchase_price_per_kg),0)::numeric total_cost
    from public.marketing_external_meat_purchases m
    group by m.contract_assignment_id
  ),
  raw as (
    select
      a.id assignment_id,a.barn_id,b.code barn_code,b.name barn_name,c.number contract_number,a.active,
      (ci.received-ci.doa)::numeric chick_in_birds,
      coalesce(h.birds,0)::numeric total_harvest_birds,
      coalesce(h.kg,0)::numeric total_harvest_kg,
      case when coalesce(h.birds,0)>0 then h.kg/h.birds else 0 end::numeric avg_bw_kg,
      coalesce(h.weighted_age,0)::numeric weighted_age,
      ((ci.received-ci.doa)-coalesce(h.birds,0))::numeric implied_depletion_birds,
      ((ci.received-ci.doa)-coalesce(h.birds,0))::numeric recorded_depletion_birds,
      0::numeric depletion_variance_birds,
      case when (ci.received-ci.doa)>0 then (((ci.received-ci.doa)-coalesce(h.birds,0))/(ci.received-ci.doa))*100 else 0 end::numeric mortality_pct,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0))::numeric main_feed_kg,
      greatest(0,coalesce(es.feed_kg,0)-coalesce(er.feed_kg,0)+coalesce(ti.feed_kg,0)+coalesce(cin.feed_kg,0)-coalesce(cout.feed_kg,0))::numeric external_feed_kg,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0)+coalesce(es.feed_kg,0)-coalesce(er.feed_kg,0)+coalesce(ti.feed_kg,0)+coalesce(cin.feed_kg,0)-coalesce(cout.feed_kg,0))::numeric net_feed_kg,
      coalesce(h.value,0)::numeric harvest_value,
      greatest(0,coalesce(ms.doc_cost,0))::numeric main_doc_cost,
      greatest(0,coalesce(ms.feed_cost,0))::numeric main_feed_cost,
      greatest(0,coalesce(ms.ovk_cost,0))::numeric main_ovk_cost,
      greatest(0,coalesce(ms.other_cost,0))::numeric main_other_cost,
      greatest(0,coalesce(mr.total_cost,0))::numeric main_return_cost,
      greatest(0,coalesce(es.total_cost,0)-coalesce(er.total_cost,0)+coalesce(ti.total_cost,0)+coalesce(cin.total_cost,0)-coalesce(cout.total_cost,0))::numeric external_sapronak_cost,
      greatest(0,coalesce(ms.total_cost,0)-coalesce(mr.total_cost,0)+coalesce(es.total_cost,0)-coalesce(er.total_cost,0)+coalesce(ti.total_cost,0)+coalesce(cin.total_cost,0)-coalesce(cout.total_cost,0))::numeric sapronak_cost,
      greatest(0,coalesce(me.total_cost,0))::numeric external_meat_cost,
      a.master_contract_id,a.performance_template_name
    from public.logistics_contract_assignments a
    join public.barns b on b.id=a.barn_id
    join public.contracts c on c.id=a.master_contract_id
    join public.chick_ins ci on ci.contract_assignment_id=a.id
    left join harvest h on h.contract_assignment_id=a.id
    left join main_ship ms on ms.contract_assignment_id=a.id
    left join main_ret mr on mr.contract_assignment_id=a.id
    left join retained_feed rf on rf.contract_assignment_id=a.id
    left join ext_ship es on es.contract_assignment_id=a.id
    left join ext_ret er on er.contract_assignment_id=a.id
    left join transfer_in ti on ti.contract_assignment_id=a.id
    left join company_in cin on cin.contract_assignment_id=a.id
    left join company_out cout on cout.contract_assignment_id=a.id
    left join meat me on me.contract_assignment_id=a.id
  ),
  metrics as (
    select r.*,
      case when r.total_harvest_kg>0 then r.net_feed_kg/r.total_harvest_kg else 0 end::numeric fcr_actual,
      lo.age_days lo_age,lo.std_fcr lo_fcr,hi.age_days hi_age,hi.std_fcr hi_fcr
    from raw r
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days<=r.weighted_age
      order by ps.age_days desc limit 1
    ) lo on true
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days>=r.weighted_age
      order by ps.age_days asc limit 1
    ) hi on true
  ),
  scored as (
    select m.*,
      case
        when m.lo_fcr is null then m.hi_fcr when m.hi_fcr is null then m.lo_fcr
        when m.hi_age=m.lo_age then m.lo_fcr
        else m.lo_fcr+((m.weighted_age-m.lo_age)/(m.hi_age-m.lo_age))*(m.hi_fcr-m.lo_fcr)
      end::numeric fcr_standard,
      case when m.weighted_age>0 and m.fcr_actual>0 then ((100-m.mortality_pct)*m.avg_bw_kg*100)/(m.weighted_age*m.fcr_actual) else 0 end::numeric ip
    from metrics m
  ),
  bonus_rates as (
    select s.*,
      coalesce(ipb.rupiah_per_kg,0)::numeric bonus_ip_rate,
      coalesce(fcb.rupiah_per_kg,0)::numeric bonus_fc_rate,
      coalesce(db.rupiah_per_kg,0)::numeric bonus_mortality_rate
    from scored s
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='IP'
        and (cb.min_value is null or s.ip>=cb.min_value)
        and (cb.max_value is null or s.ip<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) ipb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='FCR_DIFFERENCE'
        and (cb.min_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)>=cb.min_value)
        and (cb.max_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) fcb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='DEPLETION'
        and (cb.min_value is null or s.mortality_pct>=cb.min_value)
        and (cb.max_value is null or s.mortality_pct<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) db on true
  )
  select
    br.assignment_id,br.barn_id,br.barn_code,br.barn_name,br.contract_number,br.active,
    br.chick_in_birds,br.total_harvest_birds,br.total_harvest_kg,br.avg_bw_kg,br.weighted_age,
    br.implied_depletion_birds,br.recorded_depletion_birds,br.depletion_variance_birds,br.mortality_pct,
    br.main_feed_kg,br.external_feed_kg,br.net_feed_kg,
    br.fcr_actual,br.fcr_standard,(coalesce(br.fcr_standard,0)-br.fcr_actual)::numeric diff_fcr,br.ip,
    br.harvest_value,br.main_doc_cost,br.main_feed_cost,br.main_ovk_cost,br.main_other_cost,br.main_return_cost,
    br.external_sapronak_cost,br.sapronak_cost,br.external_meat_cost,
    (br.sapronak_cost+br.external_meat_cost)::numeric total_rhpp_cost,
    (br.harvest_value-br.sapronak_cost-br.external_meat_cost)::numeric base_profit,
    br.bonus_ip_rate,(br.total_harvest_kg*br.bonus_ip_rate)::numeric bonus_ip,
    br.bonus_fc_rate,(br.total_harvest_kg*br.bonus_fc_rate)::numeric bonus_fc,
    br.bonus_mortality_rate,(br.total_harvest_kg*br.bonus_mortality_rate)::numeric bonus_mortality,
    (br.harvest_value-br.sapronak_cost-br.external_meat_cost
      +br.total_harvest_kg*br.bonus_ip_rate
      +br.total_harvest_kg*br.bonus_fc_rate
      +br.total_harvest_kg*br.bonus_mortality_rate)::numeric farmer_profit,
    case when br.chick_in_birds>0 then
      (br.harvest_value-br.sapronak_cost-br.external_meat_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.chick_in_birds else 0 end::numeric profit_per_chick_in,
    case when br.total_harvest_birds>0 then
      (br.harvest_value-br.sapronak_cost-br.external_meat_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.total_harvest_birds else 0 end::numeric profit_per_harvested_bird,
    (abs(br.depletion_variance_birds)<0.5)::boolean population_balanced,
    (not br.active and abs(br.depletion_variance_birds)<0.5 and br.chick_in_birds>0 and br.total_harvest_birds>0 and br.total_harvest_kg>0 and br.net_feed_kg>0 and br.sapronak_cost>0)::boolean ready_financial
  from bonus_rates br
  order by br.active desc,br.barn_code;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_rhpp_final_atomic(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v record;
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  select * into v
  from public.finance_rhpp_summary_v4()
  where contract_assignment_id=p_contract_assignment_id;

  if v.contract_assignment_id is null then
    raise exception 'Data RHPP tidak ditemukan.';
  end if;

  if not v.ready_financial then
    raise exception 'RHPP belum siap Final. Pastikan kontrak sudah Close serta data panen, pakan, dan biaya lengkap.';
  end if;

  if exists(
    select 1 from public.rhpp_real r
    where r.contract_assignment_id=p_contract_assignment_id
  ) then
    raise exception 'RHPP Final untuk kontrak ini sudah tersimpan.';
  end if;

  insert into public.rhpp_real(
    contract_assignment_id,barn_id,amount,received_on,reference,notes
  ) values (
    v.contract_assignment_id,
    v.barn_id,
    v.farmer_profit,
    (now() at time zone 'Asia/Jakarta')::date,
    'AUTO-RHPP',
    'RHPP otomatis tervalidasi dari Logistik dan Marketing. Nilai panen '||round(v.harvest_value,0)||
    '; Sapronak '||round(v.sapronak_cost,0)||
    '; Tambah Daging '||round(v.external_meat_cost,0)||
    '; Total Biaya RHPP '||round(v.total_rhpp_cost,0)||
    '; Bonus IP '||round(v.bonus_ip,0)||
    '; Bonus FC '||round(v.bonus_fc,0)||
    '; Bonus Deplesi '||round(v.bonus_mortality,0)||
    '; Deplesi Real Chick-In - Panen '||round(v.implied_depletion_birds,0)||'.'
  ) returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v4()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  select
    x.contract_assignment_id,x.barn_id,x.barn_code,x.barn_name,x.contract_number,x.active,
    x.chick_in_birds,x.total_harvest_birds,x.total_harvest_kg,x.avg_bw_kg,x.weighted_age,
    x.implied_depletion_birds,x.recorded_depletion_birds,x.depletion_variance_birds,x.mortality_pct,
    x.main_feed_kg,x.external_feed_kg,x.net_feed_kg,x.fcr_actual,x.fcr_standard,x.diff_fcr,x.ip,
    x.harvest_value,x.main_doc_cost,x.main_feed_cost,x.main_ovk_cost,x.main_other_cost,
    x.main_return_cost,x.external_sapronak_cost,x.sapronak_cost,x.external_meat_cost,
    x.total_rhpp_cost,x.base_profit,x.bonus_ip_rate,x.bonus_ip,x.bonus_fc_rate,x.bonus_fc,
    x.bonus_mortality_rate,x.bonus_mortality,x.farmer_profit,x.profit_per_chick_in,
    x.profit_per_harvested_bird,x.population_balanced,
    (
      not x.active
      and x.chick_in_birds>0
      and x.total_harvest_birds>0
      and x.total_harvest_kg>0
      and x.net_feed_kg>0
      and x.sapronak_cost>0
    )::boolean
  from public.finance_rhpp_summary_v3() x
  order by x.active desc,x.barn_code;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_close_production_atomic(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v record;
  v_id uuid;
  v_active boolean;
  v_std_bw numeric;
  v_chick_in_date date;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat Close Produksi.';
  end if;

  select a.active into v_active
  from public.logistics_contract_assignments a
  where a.id=p_contract_assignment_id
  for update;

  if v_active is null then raise exception 'Kontrak kandang tidak ditemukan.'; end if;
  if not v_active then raise exception 'Periode ini sudah Close.'; end if;

  perform set_config('bms.allow_production_close','1',true);
  update public.logistics_contract_assignments
  set active=false
  where id=p_contract_assignment_id and active=true;

  select * into v
  from public.finance_rhpp_summary_v5()
  where contract_assignment_id=p_contract_assignment_id;

  if v.contract_assignment_id is null then raise exception 'RHPP Sistem tidak ditemukan.'; end if;

  if not (
    v.chick_in_birds > 0
    and v.total_harvest_birds > 0
    and v.total_harvest_kg > 0
    and v.net_feed_kg > 0
    and v.sapronak_cost > 0
  ) then
    raise exception 'RHPP Sistem belum lengkap. Periksa Chick-In, Panen, Pakan, dan biaya Sapronak.';
  end if;

  select ci.arrived_on into v_chick_in_date
  from public.chick_ins ci
  where ci.contract_assignment_id=p_contract_assignment_id
  order by ci.arrived_on
  limit 1;

  select ps.std_body_weight_g/1000.0 into v_std_bw
  from public.logistics_contract_assignments a
  join public.performance_standards ps
    on ps.contract_id=a.master_contract_id
   and ps.template_name=a.performance_template_name
  where a.id=p_contract_assignment_id
    and ps.std_body_weight_g is not null
  order by abs(ps.age_days-v.weighted_age)
  limit 1;

  insert into public.rhpp_system_final(
    contract_assignment_id,barn_id,system_amount,
    harvest_value,sapronak_cost,external_meat_cost,
    bonus_ip,bonus_fc,bonus_depletion,
    fcr_actual,fcr_standard,ip,mortality_pct,population_variance_birds,
    chick_in_date,chick_in_birds,total_harvest_birds,total_harvest_kg,avg_bw_kg,weighted_age,
    depletion_birds,net_feed_kg,std_bw_kg,
    main_doc_cost,main_feed_cost,main_ovk_cost,main_other_cost,main_return_cost,
    external_sapronak_cost,total_rhpp_cost,base_profit,
    bonus_ip_rate,bonus_fc_rate,bonus_depletion_rate,
    profit_per_chick_in,profit_per_harvested_bird
  ) values (
    v.contract_assignment_id,v.barn_id,v.farmer_profit,
    v.harvest_value,v.sapronak_cost,v.external_meat_cost,
    v.bonus_ip,v.bonus_fc,v.bonus_mortality,
    v.fcr_actual,v.fcr_standard,v.ip,v.mortality_pct,v.depletion_variance_birds,
    v_chick_in_date,v.chick_in_birds,v.total_harvest_birds,v.total_harvest_kg,v.avg_bw_kg,v.weighted_age,
    greatest(v.chick_in_birds-v.total_harvest_birds,0),v.net_feed_kg,v_std_bw,
    v.main_doc_cost,v.main_feed_cost,v.main_ovk_cost,v.main_other_cost,v.main_return_cost,
    v.external_sapronak_cost,v.total_rhpp_cost,v.base_profit,
    v.bonus_ip_rate,v.bonus_fc_rate,v.bonus_mortality_rate,
    v.profit_per_chick_in,v.profit_per_harvested_bird
  )
  returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION private.reject_closed_assignment_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old uuid;
  v_new uuid;
  v_allow_population_correction boolean :=
    coalesce(current_setting('bms.allow_closed_abk_population_correction', true),'')='1';
begin
  if tg_op in ('UPDATE','DELETE') then
    v_old := nullif(to_jsonb(old)->>'contract_assignment_id','')::uuid;
  end if;
  if tg_op in ('UPDATE','INSERT') then
    v_new := nullif(to_jsonb(new)->>'contract_assignment_id','')::uuid;
  end if;

  if exists(
    select 1 from public.logistics_contract_assignments a
    where a.id in (v_old,v_new) and a.active=false
  ) then
    if tg_op='UPDATE'
       and v_allow_population_correction
       and exists(
         select 1 from public.profiles p
         where p.user_id=auth.uid() and p.active and p.role='ADMIN'
       )
       and new.initial_birds is distinct from old.initial_birds
       and new.id is not distinct from old.id
       and new.contract_assignment_id is not distinct from old.contract_assignment_id
       and new.abk_id is not distinct from old.abk_id
       and new.created_at is not distinct from old.created_at
       and new.feed_pre_bags is not distinct from old.feed_pre_bags
       and new.feed_starter_bags is not distinct from old.feed_starter_bags
       and new.feed_finisher_bags is not distinct from old.feed_finisher_bags
       and new.basics_locked_at is not distinct from old.basics_locked_at
    then
      return new;
    end if;
    raise exception 'Periode sudah Close. Buka kembali siklus melalui Administrator sebelum mengubah data.';
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end
$function$;

CREATE OR REPLACE FUNCTION private.reject_closed_logistics_child_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_aid uuid;
  v_new_aid uuid;
begin
  if tg_table_name='logistics_shipment_items' then
    if tg_op in ('UPDATE','DELETE') then
      select s.contract_assignment_id into v_old_aid from public.logistics_shipments s where s.id=old.shipment_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select s.contract_assignment_id into v_new_aid from public.logistics_shipments s where s.id=new.shipment_id;
    end if;
  elsif tg_table_name='logistics_return_items' then
    if tg_op in ('UPDATE','DELETE') then
      select r.contract_assignment_id into v_old_aid from public.logistics_returns r where r.id=old.return_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select r.contract_assignment_id into v_new_aid from public.logistics_returns r where r.id=new.return_id;
    end if;
  elsif tg_table_name='logistics_external_shipment_items' then
    if tg_op in ('UPDATE','DELETE') then
      select s.contract_assignment_id into v_old_aid from public.logistics_external_shipments s where s.id=old.external_shipment_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select s.contract_assignment_id into v_new_aid from public.logistics_external_shipments s where s.id=new.external_shipment_id;
    end if;
  elsif tg_table_name='logistics_external_return_items' then
    if tg_op in ('UPDATE','DELETE') then
      select r.contract_assignment_id into v_old_aid from public.logistics_external_returns r where r.id=old.external_return_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select r.contract_assignment_id into v_new_aid from public.logistics_external_returns r where r.id=new.external_return_id;
    end if;
  end if;

  if exists(
    select 1 from public.logistics_contract_assignments a
    where a.id in (v_old_aid,v_new_aid) and a.active=false
  ) then
    raise exception 'Periode sudah Close. Buka kembali siklus melalui Administrator sebelum mengubah detail transaksi.';
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end
$function$;

CREATE OR REPLACE FUNCTION private.reject_closed_production_child_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_aid uuid;
  v_new_aid uuid;
begin
  if tg_table_name='production_estimate_sizes' then
    if tg_op in ('UPDATE','DELETE') then
      select p.contract_assignment_id into v_old_aid from public.production_estimates p where p.id=old.estimate_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select p.contract_assignment_id into v_new_aid from public.production_estimates p where p.id=new.estimate_id;
    end if;
  elsif tg_table_name='production_abk_result_sizes' then
    if tg_op in ('UPDATE','DELETE') then
      select p.contract_assignment_id into v_old_aid from public.production_abk_results p where p.id=old.result_id;
    end if;
    if tg_op in ('UPDATE','INSERT') then
      select p.contract_assignment_id into v_new_aid from public.production_abk_results p where p.id=new.result_id;
    end if;
  end if;

  if exists(
    select 1 from public.logistics_contract_assignments a
    where a.id in (v_old_aid,v_new_aid) and a.active=false
  ) then
    raise exception 'Periode sudah Close. Buka kembali siklus melalui Administrator sebelum mengubah detail produksi.';
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end
$function$;

CREATE OR REPLACE FUNCTION private.reject_closed_transfer_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  os uuid; ot uuid; ns uuid; nt uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    os:=old.source_contract_assignment_id;
    ot:=old.target_contract_assignment_id;
  end if;
  if tg_op in ('UPDATE','INSERT') then
    ns:=new.source_contract_assignment_id;
    nt:=new.target_contract_assignment_id;
  end if;

  if exists(
    select 1 from public.logistics_contract_assignments a
    where a.id in (os,ot,ns,nt) and a.active=false
  ) then
    raise exception 'Periode sumber/tujuan sudah Close. Buka kembali siklus melalui Administrator sebelum mengubah alih Sapronak.';
  end if;

  if tg_op='DELETE' then return old; else return new; end if;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_rhpp_real_atomic(p_contract_assignment_id uuid, p_amount numeric, p_received_on date, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_barn_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak. Hanya Administrator atau Keuangan yang dapat input RHPP Real.';
  end if;

  if p_amount is null or p_amount < 0 then raise exception 'Nominal RHPP Real tidak valid.'; end if;
  if p_received_on is null then raise exception 'Tanggal diterima wajib diisi.'; end if;

  select s.barn_id into v_barn_id
  from public.rhpp_system_final s
  where s.contract_assignment_id=p_contract_assignment_id;

  if v_barn_id is null then raise exception 'RHPP Sistem belum di-Close Administrator.'; end if;

  if exists (
    select 1 from public.rhpp_real r
    where r.contract_assignment_id=p_contract_assignment_id
  ) then
    raise exception 'RHPP Real untuk periode ini sudah tersimpan.';
  end if;

  insert into public.rhpp_real(
    contract_assignment_id,barn_id,amount,received_on,reference,notes,created_by
  ) values (
    p_contract_assignment_id,v_barn_id,p_amount,p_received_on,
    nullif(trim(p_reference),''),nullif(trim(p_notes),''),auth.uid()
  )
  returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_contract_assignment_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.active=false then
    if new.active=true
       and coalesce(current_setting('bms.allow_production_reopen',true),'')='1'
       and exists(
         select 1 from public.profiles p
         where p.user_id=auth.uid() and p.active and p.role='ADMIN'
       )
    then
      return new;
    end if;

    if new.active is distinct from old.active
       or new.barn_id is distinct from old.barn_id
       or new.master_contract_id is distinct from old.master_contract_id
       or new.performance_template_name is distinct from old.performance_template_name
       or new.cycle_type is distinct from old.cycle_type
       or new.start_date is distinct from old.start_date
       or new.abk_id is distinct from old.abk_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Periode sudah Close. Gunakan Buka Kembali Siklus sebelum koreksi.';
    end if;
  end if;

  if old.active=true and new.active=false then
    if coalesce(current_setting('bms.allow_production_close',true),'') <> '1' then
      raise exception 'Close Produksi hanya dapat dilakukan dari proses Administrator.';
    end if;
  end if;

  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.validate_assignment_ppl()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.ppl_id is not null and not exists (
    select 1
    from public.profiles p
    where p.user_id=new.ppl_id
      and p.active=true
      and p.role='PPL'::public.bms_role
  ) then
    raise exception 'PPL penanggung jawab harus akun PPL aktif.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.sync_bop_assignment_barn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_barn uuid;
begin
  if new.contract_assignment_id is null then
    raise exception 'Kandang / periode wajib dipilih.';
  end if;

  select a.barn_id into v_barn
  from public.logistics_contract_assignments a
  where a.id=new.contract_assignment_id;

  if v_barn is null then
    raise exception 'Kandang / periode tidak ditemukan.';
  end if;

  new.barn_id := v_barn;
  new.cycle_id := null;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_reopen_production_atomic(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_active boolean;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat membuka kembali siklus.';
  end if;

  select a.active into v_active
  from public.logistics_contract_assignments a
  where a.id=p_contract_assignment_id
  for update;

  if v_active is null then
    raise exception 'Siklus tidak ditemukan.';
  end if;

  if v_active then
    raise exception 'Siklus ini sudah aktif.';
  end if;

  perform set_config('bms.allow_production_reopen','1',true);

  update public.logistics_contract_assignments
  set active=true
  where id=p_contract_assignment_id;

  delete from public.rhpp_system_final
  where contract_assignment_id=p_contract_assignment_id;

  return p_contract_assignment_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v5()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with base as (
    select x.*,a.master_contract_id,
      greatest(coalesce(x.implied_depletion_birds,0),0)::numeric as effective_depletion_birds
    from public.finance_rhpp_summary_v4() x
    join public.logistics_contract_assignments a on a.id=x.contract_assignment_id
  ),
  scored as (
    select b.*,
      case when b.chick_in_birds>0
        then (b.effective_depletion_birds/b.chick_in_birds)*100
        else 0 end::numeric as effective_mortality_pct,
      case when b.weighted_age>0 and b.fcr_actual>0
        then (
          (100-(case when b.chick_in_birds>0 then (b.effective_depletion_birds/b.chick_in_birds)*100 else 0 end))
          *b.avg_bw_kg*100
        )/(b.weighted_age*b.fcr_actual)
        else 0 end::numeric as effective_ip
    from base b
  ),
  rates as (
    select s.*,
      coalesce(ipb.rupiah_per_kg,0)::numeric as effective_bonus_ip_rate,
      coalesce(db.rupiah_per_kg,0)::numeric as effective_bonus_mortality_rate
    from scored s
    left join lateral (
      select cb.rupiah_per_kg
      from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id
        and cb.metric='IP'
        and (cb.min_value is null or s.effective_ip>=cb.min_value)
        and (cb.max_value is null or s.effective_ip<cb.max_value)
      order by cb.min_value desc nulls last
      limit 1
    ) ipb on true
    left join lateral (
      select cb.rupiah_per_kg
      from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id
        and cb.metric='DEPLETION'
        and (cb.min_value is null or s.effective_mortality_pct>=cb.min_value)
        and (cb.max_value is null or s.effective_mortality_pct<cb.max_value)
      order by cb.min_value desc nulls last
      limit 1
    ) db on true
  )
  select
    r.contract_assignment_id,r.barn_id,r.barn_code,r.barn_name,r.contract_number,r.active,
    r.chick_in_birds,r.total_harvest_birds,r.total_harvest_kg,r.avg_bw_kg,r.weighted_age,
    r.implied_depletion_birds,
    r.recorded_depletion_birds::numeric as recorded_depletion_birds,
    (r.implied_depletion_birds-r.recorded_depletion_birds)::numeric as depletion_variance_birds,
    r.effective_mortality_pct::numeric as mortality_pct,
    r.main_feed_kg,r.external_feed_kg,r.net_feed_kg,r.fcr_actual,r.fcr_standard,r.diff_fcr,
    r.effective_ip::numeric as ip,
    r.harvest_value,r.main_doc_cost,r.main_feed_cost,r.main_ovk_cost,r.main_other_cost,r.main_return_cost,
    r.external_sapronak_cost,r.sapronak_cost,r.external_meat_cost,r.total_rhpp_cost,r.base_profit,
    r.effective_bonus_ip_rate::numeric as bonus_ip_rate,
    (r.total_harvest_kg*r.effective_bonus_ip_rate)::numeric as bonus_ip,
    r.bonus_fc_rate,
    (r.total_harvest_kg*r.bonus_fc_rate)::numeric as bonus_fc,
    r.effective_bonus_mortality_rate::numeric as bonus_mortality_rate,
    (r.total_harvest_kg*r.effective_bonus_mortality_rate)::numeric as bonus_mortality,
    (
      r.base_profit
      + r.total_harvest_kg*r.effective_bonus_ip_rate
      + r.total_harvest_kg*r.bonus_fc_rate
      + r.total_harvest_kg*r.effective_bonus_mortality_rate
    )::numeric as farmer_profit,
    case when r.chick_in_birds>0 then (
      r.base_profit
      + r.total_harvest_kg*r.effective_bonus_ip_rate
      + r.total_harvest_kg*r.bonus_fc_rate
      + r.total_harvest_kg*r.effective_bonus_mortality_rate
    )/r.chick_in_birds else 0 end::numeric as profit_per_chick_in,
    case when r.total_harvest_birds>0 then (
      r.base_profit
      + r.total_harvest_kg*r.effective_bonus_ip_rate
      + r.total_harvest_kg*r.bonus_fc_rate
      + r.total_harvest_kg*r.effective_bonus_mortality_rate
    )/r.total_harvest_birds else 0 end::numeric as profit_per_harvested_bird,
    (abs(r.implied_depletion_birds-r.effective_depletion_birds)<0.5)::boolean as population_balanced,
    (
      not r.active
      and r.chick_in_birds>0
      and r.total_harvest_birds>0
      and r.total_harvest_kg>0
      and r.net_feed_kg>0
      and r.sapronak_cost>0
    )::boolean as ready_financial
  from rates r
  where (
    (select p.role from public.profiles p
     where p.user_id=auth.uid() and p.active
     limit 1) <> 'PPL'::public.bms_role
    or exists (
      select 1
      from public.logistics_contract_assignments a
      where a.id=r.contract_assignment_id
        and a.ppl_id=auth.uid()
    )
  )
  order by r.active desc,r.barn_code;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_abk_advance_atomic(p_contract_assignment_id uuid, p_abk_id uuid, p_advanced_on date, p_amount numeric, p_description text DEFAULT NULL::text, p_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_barn_id uuid;
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_amount is null or p_amount<=0 then raise exception 'Nominal kasbon harus lebih dari 0.'; end if;
  if p_advanced_on is null then raise exception 'Tanggal kasbon wajib diisi.'; end if;

  select a.barn_id into v_barn_id
  from public.logistics_contract_assignments a
  where a.id=p_contract_assignment_id;

  if v_barn_id is null then raise exception 'Siklus tidak ditemukan.'; end if;

  if not exists (
    select 1 from public.logistics_contract_assignment_abks l
    join public.employees e on e.id=l.abk_id
    where l.contract_assignment_id=p_contract_assignment_id
      and l.abk_id=p_abk_id
      and e.kind='ABK'
  ) then
    raise exception 'ABK tidak terdaftar pada siklus ini.';
  end if;

  insert into public.advances(
    employee_id,advanced_on,amount,description,reference,
    contract_assignment_id,barn_id
  ) values (
    p_abk_id,p_advanced_on,p_amount,
    nullif(trim(p_description),''),
    nullif(trim(p_reference),''),
    p_contract_assignment_id,v_barn_id
  )
  returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_abk_salary_atomic(p_contract_assignment_id uuid, p_abk_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_barn_id uuid;
  v_salary_id uuid;
  v_remaining numeric;
  v_balance numeric;
  v_take numeric;
  v_adv record;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_gross_salary is null or p_gross_salary<0 then raise exception 'Gaji bruto tidak valid.'; end if;
  if p_advance_deduction is null or p_advance_deduction<0 then raise exception 'Potongan kasbon tidak valid.'; end if;
  if p_advance_deduction>p_gross_salary then raise exception 'Potongan kasbon tidak boleh melebihi gaji bruto.'; end if;
  if p_paid_on is null then raise exception 'Tanggal bayar wajib diisi.'; end if;

  select a.barn_id into v_barn_id
  from public.logistics_contract_assignments a
  where a.id=p_contract_assignment_id;

  if v_barn_id is null then raise exception 'Siklus tidak ditemukan.'; end if;

  if not exists (
    select 1 from public.logistics_contract_assignment_abks l
    join public.employees e on e.id=l.abk_id
    where l.contract_assignment_id=p_contract_assignment_id
      and l.abk_id=p_abk_id
      and e.kind='ABK'
  ) then
    raise exception 'ABK tidak terdaftar pada siklus ini.';
  end if;

  if exists (
    select 1 from public.abk_cycle_salaries s
    where s.contract_assignment_id=p_contract_assignment_id
      and s.abk_id=p_abk_id
  ) then
    raise exception 'Gaji ABK untuk siklus ini sudah tersimpan.';
  end if;

  select coalesce(sum(a.amount-coalesce(p.paid,0)),0)
  into v_balance
  from public.advances a
  left join (
    select advance_id,sum(amount) paid
    from public.advance_payments
    group by advance_id
  ) p on p.advance_id=a.id
  where a.employee_id=p_abk_id
    and a.contract_assignment_id=p_contract_assignment_id;

  if p_advance_deduction>v_balance then
    raise exception 'Potongan kasbon melebihi saldo kasbon siklus. Saldo: %',v_balance;
  end if;

  insert into public.abk_cycle_salaries(
    contract_assignment_id,barn_id,abk_id,
    gross_salary,advance_deduction,net_paid,paid_on,reference,notes
  ) values (
    p_contract_assignment_id,v_barn_id,p_abk_id,
    p_gross_salary,p_advance_deduction,p_gross_salary-p_advance_deduction,
    p_paid_on,null,nullif(trim(p_notes),'')
  )
  returning id into v_salary_id;

  insert into public.bop(
    contract_assignment_id,barn_id,incurred_on,category,amount,reference,notes,
    source_type,source_id
  ) values (
    p_contract_assignment_id,v_barn_id,p_paid_on,'TENAGA_KERJA',p_gross_salary,
    null,'Gaji bruto ABK per siklus','ABK_SALARY',v_salary_id
  );

  v_remaining:=p_advance_deduction;
  for v_adv in
    select a.id,a.amount-coalesce(p.paid,0) as balance
    from public.advances a
    left join (
      select advance_id,sum(amount) paid
      from public.advance_payments
      group by advance_id
    ) p on p.advance_id=a.id
    where a.employee_id=p_abk_id
      and a.contract_assignment_id=p_contract_assignment_id
      and a.amount-coalesce(p.paid,0)>0
    order by a.advanced_on,a.created_at,a.id
  loop
    exit when v_remaining<=0;
    v_take:=least(v_remaining,v_adv.balance);
    insert into public.advance_payments(
      advance_id,paid_on,amount,method,reference,notes
    ) values (
      v_adv.id,p_paid_on,v_take,'POTONG_GAJI',
      null,'Potongan otomatis dari gaji siklus'
    );
    v_remaining:=v_remaining-v_take;
  end loop;

  return v_salary_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cycle_profit_loss_v1()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, start_date date, active boolean, rhpp_system numeric, rhpp_real numeric, bop_kandang numeric, gaji_abk numeric, sapronak_luar numeric, tambah_daging numeric, kasbon_abk numeric, saldo_kasbon numeric, laba_rugi_real numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with bopx as (
    select b.contract_assignment_id,
      coalesce(sum(b.amount),0)::numeric bop,
      coalesce(sum(case when b.source_type='ABK_SALARY' then b.amount else 0 end),0)::numeric salary
    from public.bop b
    group by b.contract_assignment_id
  ),
  ext_ship as (
    select h.contract_assignment_id,
      coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric amount
    from public.logistics_external_shipments h
    join public.logistics_external_shipment_items i on i.external_shipment_id=h.id
    group by h.contract_assignment_id
  ),
  ext_out as (
    select t.source_contract_assignment_id contract_assignment_id,
      coalesce(sum(t.quantity*t.unit_price),0)::numeric amount
    from public.logistics_external_return_transfers t
    group by t.source_contract_assignment_id
  ),
  ext_in as (
    select t.target_contract_assignment_id contract_assignment_id,
      coalesce(sum(t.quantity*t.unit_price),0)::numeric amount
    from public.logistics_external_return_transfers t
    group by t.target_contract_assignment_id
  ),
  meat as (
    select m.contract_assignment_id,
      coalesce(sum(m.weight_kg*m.purchase_price_per_kg),0)::numeric amount
    from public.marketing_external_meat_purchases m
    group by m.contract_assignment_id
  ),
  adv as (
    select a.contract_assignment_id,
      coalesce(sum(a.amount),0)::numeric amount,
      coalesce(sum(a.amount-coalesce(p.paid,0)),0)::numeric balance
    from public.advances a
    left join (
      select advance_id,sum(amount) paid
      from public.advance_payments
      group by advance_id
    ) p on p.advance_id=a.id
    where a.contract_assignment_id is not null
    group by a.contract_assignment_id
  )
  select
    a.id,a.barn_id,b.code,b.name,a.start_date,a.active,
    coalesce(sf.system_amount,0)::numeric,
    coalesce(rr.amount,0)::numeric,
    coalesce(bx.bop,0)::numeric,
    coalesce(bx.salary,0)::numeric,
    greatest(0,coalesce(es.amount,0)-coalesce(eo.amount,0)+coalesce(ei.amount,0))::numeric,
    coalesce(m.amount,0)::numeric,
    coalesce(ad.amount,0)::numeric,
    coalesce(ad.balance,0)::numeric,
    (
      coalesce(rr.amount,0)
      - coalesce(bx.bop,0)
      - greatest(0,coalesce(es.amount,0)-coalesce(eo.amount,0)+coalesce(ei.amount,0))
      - coalesce(m.amount,0)
    )::numeric
  from public.logistics_contract_assignments a
  join public.barns b on b.id=a.barn_id
  left join public.rhpp_system_final sf on sf.contract_assignment_id=a.id
  left join public.rhpp_real rr on rr.contract_assignment_id=a.id
  left join bopx bx on bx.contract_assignment_id=a.id
  left join ext_ship es on es.contract_assignment_id=a.id
  left join ext_out eo on eo.contract_assignment_id=a.id
  left join ext_in ei on ei.contract_assignment_id=a.id
  left join meat m on m.contract_assignment_id=a.id
  left join adv ad on ad.contract_assignment_id=a.id
  order by a.start_date desc,b.code;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v1()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select r.received_on,'MASUK'::text,'RHPP REAL'::text,r.amount,r.barn_id,r.contract_assignment_id,
         ('RHPP Real dari perusahaan inti'||
          case when nullif(trim(coalesce(r.notes,'')),'') is not null then ' · '||trim(r.notes) else '' end)::text,
         coalesce(r.reference,'')
  from public.rhpp_real r

  union all
  select b.incurred_on,'KELUAR','BOP KANDANG',b.amount,b.barn_id,b.contract_assignment_id,
         (replace(b.category,'_',' ')||
          case when nullif(trim(coalesce(b.notes,'')),'') is not null then ' · '||trim(b.notes) else '' end)::text,
         coalesce(b.reference,'')
  from public.bop b
  where coalesce(b.source_type,'')<>'ABK_SALARY' and b.paid_by='COMPANY'

  union all
  select b.incurred_on,'KELUAR','BOP UMUM',b.amount,null::uuid,null::uuid,
         (replace(b.category,'_',' ')||
          case when nullif(trim(coalesce(b.notes,'')),'') is not null then ' · '||trim(b.notes) else '' end)::text,
         coalesce(b.reference,'')
  from public.bop_outside b
  where b.paid_by='COMPANY'

  union all
  select a.advanced_on,'KELUAR','KASBON',a.amount,a.barn_id,a.contract_assignment_id,
         (coalesce(e.code||' · ','')||e.name||
          case when nullif(trim(coalesce(a.description,'')),'') is not null then ' · '||trim(a.description) else '' end)::text,
         coalesce(a.reference,'')
  from public.advances a
  join public.employees e on e.id=a.employee_id
  where not a.is_historical_balance

  union all
  select p.paid_on,'MASUK','CICILAN KASBON',p.amount,a.barn_id,a.contract_assignment_id,
         (coalesce(e.code||' · ','')||e.name||' · '||p.method||
          case when nullif(trim(coalesce(p.notes,'')),'') is not null then ' · '||trim(p.notes) else '' end)::text,
         coalesce(p.reference,'')
  from public.advance_payments p
  join public.advances a on a.id=p.advance_id
  join public.employees e on e.id=a.employee_id
  where p.method<>'POTONG_GAJI'

  union all
  select s.paid_on,'KELUAR','GAJI ABK',s.net_paid,s.barn_id,s.contract_assignment_id,
         (coalesce(e.code||' · ','')||e.name||' · Gaji bersih'||
          case when nullif(trim(coalesce(s.notes,'')),'') is not null then ' · '||trim(s.notes) else '' end)::text,
         coalesce(s.reference,'')
  from public.abk_cycle_salaries s
  join public.employees e on e.id=s.abk_id
  where s.net_paid>0

  union all
  select p.paid_on,'KELUAR',
         case when p.source_type='SAPRONAK_LUAR' then 'SAPRONAK LUAR' else 'TAMBAH DAGING' end::text,
         p.amount,p.barn_id,p.contract_assignment_id,
         (coalesce(s.code||' · ','')||s.name||' · '||p.method||
          case when nullif(trim(coalesce(p.notes,'')),'') is not null then ' · '||trim(p.notes) else '' end)::text,
         coalesce(p.reference,'')
  from public.supplier_payments p
  join public.suppliers s on s.id=p.supplier_id
  where p.source_type in ('SAPRONAK_LUAR','TAMBAH_DAGING')

  union all
  select p.paid_on,'MASUK','PENDAPATAN EXPEDISI',p.amount,null::uuid,null::uuid,
         (i.invoice_number||' · '||i.customer_name||
          case when nullif(trim(coalesce(p.notes,'')),'') is not null then ' · '||trim(p.notes) else '' end)::text,
         coalesce(p.reference,'')
  from public.finance_expedition_payments p
  join public.finance_expedition_invoices i on i.id=p.invoice_id

  union all
  select b.incurred_on,'KELUAR','BOP EXPEDISI',b.amount,null::uuid,null::uuid,
         (replace(b.category,'_',' ')||
          case when nullif(b.vehicle,'') is not null then ' · '||b.vehicle else '' end||
          case when nullif(trim(coalesce(b.notes,'')),'') is not null then ' · '||trim(b.notes) else '' end)::text,
         coalesce(b.reference,'')
  from public.finance_expedition_bop b;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_employee_advance_atomic(p_employee_id uuid, p_advanced_on date, p_amount numeric, p_contract_assignment_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_kind text;
  v_id uuid;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_amount is null or p_amount<=0 then
    raise exception 'Nominal kasbon harus lebih dari 0.';
  end if;

  if p_advanced_on is null then
    raise exception 'Tanggal kasbon wajib diisi.';
  end if;

  select e.kind into v_kind
  from public.employees e
  where e.id=p_employee_id
    and e.active=true;

  if v_kind is null then
    raise exception 'Karyawan tidak ditemukan atau tidak aktif.';
  end if;

  insert into public.advances(
    employee_id,
    advanced_on,
    amount,
    description,
    reference,
    contract_assignment_id,
    barn_id
  ) values (
    p_employee_id,
    p_advanced_on,
    p_amount,
    nullif(trim(p_description),''),
    nullif(trim(p_reference),''),
    null,
    null
  )
  returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_create_expedition_invoice_atomic(p_invoice_number text, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_trip uuid;
  v_no integer;
  v_year integer;
  v_invoice_number text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','LOGISTIK')
  ) then raise exception 'Akses ditolak.'; end if;

  if p_invoice_date is null then raise exception 'Tanggal invoice wajib diisi.'; end if;
  if nullif(trim(p_customer_name),'') is null then raise exception 'Pelanggan wajib diisi.'; end if;
  if p_trip_ids is null or cardinality(p_trip_ids)=0 then raise exception 'Pilih minimal satu trip.'; end if;

  if exists (
    select 1
    from unnest(p_trip_ids) x(id)
    left join public.finance_expedition_trips t on t.id=x.id
    where t.id is null
  ) then raise exception 'Ada trip yang tidak ditemukan.'; end if;

  if exists (
    select 1
    from public.finance_expedition_invoice_items ii
    where ii.trip_id=any(p_trip_ids)
  ) then raise exception 'Ada trip yang sudah masuk invoice lain.'; end if;

  v_year:=extract(year from p_invoice_date)::integer;

  insert into public.finance_expedition_invoice_counters(invoice_year,last_no)
  values(v_year,1)
  on conflict(invoice_year)
  do update set last_no=public.finance_expedition_invoice_counters.last_no+1,
                updated_at=now()
  returning last_no into v_no;

  v_invoice_number:=lpad(v_no::text,3,'0')||'/BMS-BSI/FMC/'||v_year::text;

  insert into public.finance_expedition_invoices(
    invoice_number,invoice_date,due_date,customer_name,customer_address,status,notes
  ) values (
    v_invoice_number,p_invoice_date,p_due_date,trim(p_customer_name),
    nullif(trim(p_customer_address),''),'ISSUED',nullif(trim(p_notes),'')
  )
  returning id into v_id;

  foreach v_trip in array p_trip_ids loop
    insert into public.finance_expedition_invoice_items(invoice_id,trip_id)
    values(v_id,v_trip);
  end loop;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_expedition_summary_v1()
 RETURNS TABLE(invoice_id uuid, invoice_number text, invoice_date date, due_date date, customer_name text, status text, invoice_total numeric, paid_total numeric, receivable numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.customer_name,
    i.status,
    coalesce(sum(t.trip_price+t.additional-t.deduction),0)::numeric as invoice_total,
    coalesce(p.paid_total,0)::numeric as paid_total,
    (coalesce(sum(t.trip_price+t.additional-t.deduction),0)-coalesce(p.paid_total,0))::numeric as receivable
  from public.finance_expedition_invoices i
  left join public.finance_expedition_invoice_items ii on ii.invoice_id=i.id
  left join public.finance_expedition_trips t on t.id=ii.trip_id
  left join (
    select invoice_id,sum(amount) paid_total
    from public.finance_expedition_payments
    group by invoice_id
  ) p on p.invoice_id=i.id
  where private.my_bms_role() in (
    'ADMIN'::public.bms_role,
    'LOGISTIK'::public.bms_role,
    'KEUANGAN'::public.bms_role,
    'OWNER'::public.bms_role
  )
  group by i.id,i.invoice_number,i.invoice_date,i.due_date,i.customer_name,i.status,p.paid_total
  order by i.invoice_date desc,i.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.finance_expedition_profit_loss_v1()
 RETURNS TABLE(expedition_revenue numeric, expedition_bop numeric, expedition_profit_loss numeric, expedition_cash_received numeric, expedition_receivable numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with revenue as (
    select coalesce(sum(t.trip_price+t.additional-t.deduction),0)::numeric amount
    from public.finance_expedition_invoices i
    join public.finance_expedition_invoice_items ii on ii.invoice_id=i.id
    join public.finance_expedition_trips t on t.id=ii.trip_id
    where i.status in ('ISSUED','PAID')
  ),
  bop as (
    select coalesce(sum(amount),0)::numeric amount
    from public.finance_expedition_bop
  ),
  paid as (
    select coalesce(sum(amount),0)::numeric amount
    from public.finance_expedition_payments
  )
  select
    revenue.amount,
    bop.amount,
    revenue.amount-bop.amount,
    paid.amount,
    greatest(revenue.amount-paid.amount,0::numeric)
  from revenue,bop,paid
  where private.my_bms_role() in ('ADMIN'::public.bms_role,'KEUANGAN'::public.bms_role,'OWNER'::public.bms_role);
$function$;

CREATE OR REPLACE FUNCTION public.finance_company_profit_loss_v1()
 RETURNS TABLE(kandang_profit_loss numeric, expedition_revenue numeric, expedition_bop numeric, expedition_profit_loss numeric, bop_umum numeric, company_profit_loss numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with k as (
    select coalesce(sum(laba_rugi_real),0)::numeric amount
    from public.finance_cycle_profit_loss_v1()
  ),
  e as (
    select * from public.finance_expedition_profit_loss_v1()
  ),
  u as (
    select coalesce(sum(amount),0)::numeric amount from public.bop_outside
  )
  select
    k.amount,
    e.expedition_revenue,
    e.expedition_bop,
    e.expedition_profit_loss,
    u.amount,
    k.amount+e.expedition_profit_loss-u.amount
  from k,e,u
  where private.my_bms_role() in (
    'ADMIN'::public.bms_role,
    'KEUANGAN'::public.bms_role,
    'OWNER'::public.bms_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.finance_next_reference(p_prefix text, p_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_no integer;
  v_date date:=coalesce(p_date,current_date);
begin
  insert into public.finance_reference_counters(prefix,ref_date,last_no)
  values(upper(trim(p_prefix)),v_date,1)
  on conflict(prefix,ref_date)
  do update set last_no=public.finance_reference_counters.last_no+1
  returning last_no into v_no;

  return upper(trim(p_prefix))||'-'||to_char(v_date,'YYYYMMDD')||'-'||lpad(v_no::text,4,'0');
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_auto_reference_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_date date;
  v_ref text;
begin
  if coalesce(nullif(trim(to_jsonb(NEW)->>'reference'),''),'')<>'' then
    return NEW;
  end if;

  v_date:=coalesce((to_jsonb(NEW)->>TG_ARGV[1])::date,current_date);
  v_ref:=public.finance_next_reference(TG_ARGV[0],v_date);
  NEW:=jsonb_populate_record(NEW,jsonb_build_object('reference',v_ref));
  return NEW;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_rhpp_real_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  a public.logistics_contract_assignments%rowtype;
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active;

  if tg_op='DELETE' then
    if coalesce(current_setting('bms.allow_rhpp_real_delete',true),'')='1'
       and v_role='ADMIN'::public.bms_role
    then
      return old;
    end if;
    raise exception 'RHPP Real yang sudah tersimpan tidak dapat dihapus langsung.';
  end if;

  if tg_op='UPDATE' then
    if coalesce(current_setting('bms.allow_rhpp_real_correction',true),'')='1'
       and v_role in ('ADMIN'::public.bms_role,'KEUANGAN'::public.bms_role)
    then
      if new.contract_assignment_id is distinct from old.contract_assignment_id then
        raise exception 'Siklus RHPP Real tidak dapat dipindahkan saat koreksi.';
      end if;
      new.barn_id:=old.barn_id;
      new.cycle_id:=old.cycle_id;
      return new;
    end if;
    raise exception 'RHPP Real hanya dapat dikoreksi melalui menu Koreksi resmi.';
  end if;

  if new.contract_assignment_id is null then
    raise exception 'Kandang / Siklus wajib dipilih.';
  end if;

  select * into a
  from public.logistics_contract_assignments
  where id=new.contract_assignment_id;

  if a.id is null then
    raise exception 'Siklus tidak ditemukan.';
  end if;

  if a.active then
    raise exception 'RHPP Real hanya dapat diinput setelah Administrator Close.';
  end if;

  if not exists (
    select 1 from public.rhpp_system_final s
    where s.contract_assignment_id=new.contract_assignment_id
  ) then
    raise exception 'RHPP Sistem Final belum tersedia.';
  end if;

  new.barn_id:=a.barn_id;
  new.cycle_id:=null;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION bms_backup.create_daily_snapshot()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_document jsonb; v_id uuid; v_date date:=(now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
 v_document:=private.bms_archive_document();
 INSERT INTO bms_backup.daily_snapshots(backup_date,table_count,row_counts,payload,checksum)
 VALUES(v_date,(v_document->>'table_count')::integer,v_document->'row_counts',v_document->'tables',v_document->>'checksum')
 ON CONFLICT(backup_date) DO UPDATE SET created_at=now(),table_count=excluded.table_count,row_counts=excluded.row_counts,payload=excluded.payload,checksum=excluded.checksum
 RETURNING id INTO v_id;
 RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION bms_backup.create_download_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'bms_backup', 'extensions'
AS $function$
declare
  v_date date := (now() at time zone 'Asia/Jakarta')::date;
  v_token text := encode(gen_random_bytes(32),'hex');
begin
  delete from bms_backup.download_tokens
  where backup_date=v_date or expires_at < now();

  insert into bms_backup.download_tokens(backup_date, token, expires_at)
  values(v_date, v_token, now() + interval '24 hours');

  return v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bms_backup_download_payload(p_token text)
 RETURNS TABLE(backup_date date, payload jsonb, checksum text, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'bms_backup'
AS $function$
  select s.backup_date, s.payload, s.checksum, t.expires_at
  from bms_backup.download_tokens t
  join bms_backup.daily_snapshots s on s.backup_date=t.backup_date
  where t.token=p_token
    and t.expires_at > now()
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.finance_cycle_profit_loss_v2()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, start_date date, active boolean, rhpp_system numeric, rhpp_real numeric, bop_produksi numeric, gaji_abk numeric, sapronak_luar numeric, tambah_daging numeric, kasbon_abk numeric, saldo_kasbon numeric, perawatan_jangka_panjang numeric, laba_operasional_produksi numeric, laba_bersih_akhir numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists(
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  with bopx as (
    select b.contract_assignment_id,coalesce(sum(b.amount),0)::numeric bop,
      coalesce(sum(case when b.source_type='ABK_SALARY' then b.amount else 0 end),0)::numeric salary
    from public.bop b group by b.contract_assignment_id
  ), maint as (
    select m.contract_assignment_id,coalesce(sum(m.amount),0)::numeric amount
    from public.barn_maintenance_costs m group by m.contract_assignment_id
  ), ext_ship as (
    select h.contract_assignment_id,coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric amount
    from public.logistics_external_shipments h
    join public.logistics_external_shipment_items i on i.external_shipment_id=h.id
    group by h.contract_assignment_id
  ), ext_return as (
    select r.contract_assignment_id,
      coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric amount
    from public.logistics_external_returns r
    join public.logistics_external_return_items i on i.external_return_id=r.id
    group by r.contract_assignment_id
  ), ext_in as (
    select t.target_contract_assignment_id contract_assignment_id,
      coalesce(sum(t.quantity*t.unit_price),0)::numeric amount
    from public.logistics_external_return_transfers t
    group by t.target_contract_assignment_id
  ), mandiri_buy as (
    select a.contract_assignment_id,coalesce(sum(a.quantity*p.purchase_unit_price),0)::numeric amount
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_mandiri_purchases p on p.id=a.purchase_id
    group by a.contract_assignment_id
  ), retained_value as (
    select l.source_assignment_id contract_assignment_id,sum(l.quantity*l.unit_price)::numeric amount
    from public.logistics_mitra_retained_feed l
    group by l.source_assignment_id
  ), company_moves as (
    select m.contract_assignment_id,
      sum((case when m.direction='IN' then m.quantity else -m.quantity end)*l.unit_price)::numeric amount
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    group by m.contract_assignment_id
  ), mandiri_sales as (
    select h.contract_assignment_id,coalesce(sum(h.total_amount),0)::numeric amount
    from public.marketing_contract_harvests h group by h.contract_assignment_id
  ), meat as (
    select m.contract_assignment_id,coalesce(sum(m.weight_kg*m.purchase_price_per_kg),0)::numeric amount
    from public.marketing_external_meat_purchases m group by m.contract_assignment_id
  ), adv as (
    select a.contract_assignment_id,coalesce(sum(a.amount),0)::numeric amount,
      coalesce(sum(a.amount-coalesce(p.paid,0)),0)::numeric balance
    from public.advances a
    left join (
      select advance_id,sum(amount) paid
      from public.advance_payments
      group by advance_id
    ) p on p.advance_id=a.id
    where a.contract_assignment_id is not null
    group by a.contract_assignment_id
  ), base as (
    select a.id contract_assignment_id,a.barn_id,b.code,b.name,a.start_date,a.active,a.cycle_type,
      case when a.cycle_type='MANDIRI' then 0 else coalesce(sf.system_amount,0) end::numeric rhpp_system,
      case
        when a.cycle_type='MANDIRI' and a.active=false and mf.harvest_value is not null
          then mf.harvest_value
        when a.cycle_type='MANDIRI'
          then coalesce(ms.amount,0)
        else coalesce(rr.amount,0)
      end::numeric rhpp_real,
      coalesce(bx.bop,0)::numeric bop_produksi,coalesce(bx.salary,0)::numeric gaji_abk,
      case
        when a.cycle_type='MANDIRI' and a.active=false and mf.sapronak_cost is not null
          then mf.sapronak_cost
        when a.cycle_type='MANDIRI'
          then coalesce(mb.amount,0)+coalesce(cm.amount,0)
        else greatest(0,coalesce(es.amount,0)-coalesce(er.amount,0))
             +coalesce(ei.amount,0)+coalesce(cm.amount,0)-coalesce(rv.amount,0)
      end::numeric sapronak_luar,
      coalesce(mt.amount,0)::numeric tambah_daging,
      coalesce(ad.amount,0)::numeric kasbon_abk,
      coalesce(ad.balance,0)::numeric saldo_kasbon,
      coalesce(mc.amount,0)::numeric perawatan_jangka_panjang
    from public.logistics_contract_assignments a
    join public.barns b on b.id=a.barn_id
    left join public.rhpp_system_final sf on sf.contract_assignment_id=a.id
    left join public.production_mandiri_final mf on mf.contract_assignment_id=a.id
    left join public.rhpp_real rr on rr.contract_assignment_id=a.id
    left join bopx bx on bx.contract_assignment_id=a.id
    left join maint mc on mc.contract_assignment_id=a.id
    left join ext_ship es on es.contract_assignment_id=a.id
    left join ext_return er on er.contract_assignment_id=a.id
    left join ext_in ei on ei.contract_assignment_id=a.id
    left join mandiri_buy mb on mb.contract_assignment_id=a.id
    left join retained_value rv on rv.contract_assignment_id=a.id
    left join company_moves cm on cm.contract_assignment_id=a.id
    left join mandiri_sales ms on ms.contract_assignment_id=a.id
    left join meat mt on mt.contract_assignment_id=a.id
    left join adv ad on ad.contract_assignment_id=a.id
  )
  select x.contract_assignment_id,x.barn_id,x.code,x.name,x.start_date,x.active,
    x.rhpp_system,x.rhpp_real,x.bop_produksi,x.gaji_abk,x.sapronak_luar,
    x.tambah_daging,x.kasbon_abk,x.saldo_kasbon,x.perawatan_jangka_panjang,
    (x.rhpp_real-x.bop_produksi-x.sapronak_luar-x.tambah_daging)::numeric,
    (x.rhpp_real-x.bop_produksi-x.sapronak_luar-x.tambah_daging-x.perawatan_jangka_panjang)::numeric
  from base x
  order by x.start_date desc,x.code;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_company_profit_loss_v2()
 RETURNS TABLE(kandang_operational_profit numeric, maintenance_long_term numeric, kandang_net_profit numeric, expedition_revenue numeric, expedition_bop numeric, expedition_profit_loss numeric, bop_umum numeric, company_profit_loss numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with eligible as (
    select c.*
    from public.finance_cycle_profit_loss_v2() c
    join public.logistics_contract_assignments a
      on a.id=c.contract_assignment_id
    where not c.active
      and (
        (
          a.cycle_type='MANDIRI'
          and exists (
            select 1
            from public.production_mandiri_final mf
            where mf.contract_assignment_id=c.contract_assignment_id
              and mf.harvest_value is not null
              and mf.sapronak_cost is not null
          )
        )
        or
        (
          a.cycle_type<>'MANDIRI'
          and exists (
            select 1
            from public.rhpp_real rr
            where rr.contract_assignment_id=c.contract_assignment_id
          )
        )
      )
  ),
  k as (
    select
      coalesce(sum(laba_operasional_produksi),0)::numeric operational,
      coalesce(sum(perawatan_jangka_panjang),0)::numeric maintenance,
      coalesce(sum(laba_bersih_akhir),0)::numeric net
    from eligible
  ),
  e as (
    select * from public.finance_expedition_profit_loss_v1()
  ),
  u as (
    select coalesce(sum(amount),0)::numeric amount
    from public.bop_outside
  )
  select
    k.operational,k.maintenance,k.net,
    e.expedition_revenue,e.expedition_bop,e.expedition_profit_loss,
    u.amount,
    k.net+e.expedition_profit_loss-u.amount
  from k,e,u;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v2()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select v.txn_date,v.txn_type,
         case when v.source='BOP KANDANG' then 'BOP PRODUKSI' else v.source end,
         v.amount,v.barn_id,v.contract_assignment_id,v.detail,v.reference
  from public.finance_cashflow_entries_v1() v
  where v.source not in ('SAPRONAK LUAR','TAMBAH DAGING')

  union all
  select m.incurred_on,'KELUAR','PERAWATAN KANDANG',
         m.amount,m.barn_id,m.contract_assignment_id,
         (replace(m.category,'_',' ')||
          case when nullif(trim(coalesce(m.notes,'')),'') is not null then ' · '||trim(m.notes) else '' end)::text,
         coalesce(m.reference,'')
  from public.barn_maintenance_costs m
  where m.paid_by='COMPANY'

  union all
  select p.paid_on,'KELUAR','BAYAR HUTANG SUPPLIER',
         p.amount,p.barn_id,p.contract_assignment_id,
         ((case
           when p.source_type='SAPRONAK_LUAR' then 'Sapronak Tambahan'
           when p.source_type='BELI_PERALATAN' then 'Beli Peralatan'
           else 'Tambah Daging'
         end)||
         case when nullif(trim(coalesce(p.notes,'')),'') is not null then ' · '||trim(p.notes) else '' end)::text,
         coalesce(p.reference,'')
  from public.supplier_payments p

  union all
  select r.received_on,'MASUK','PENJUALAN MANDIRI',
         r.amount,h.barn_id,h.contract_assignment_id,
         (coalesce(h.buyer_name,'Pelanggan')||
          case when nullif(h.transaction_number,'') is not null then ' · '||h.transaction_number else '' end||
          case when nullif(trim(coalesce(r.notes,'')),'') is not null then ' · '||trim(r.notes) else '' end)::text,
         coalesce(r.reference,'')
  from public.finance_mandiri_sales_receipts r
  join public.marketing_contract_harvests h on h.id=r.harvest_id
  join public.logistics_contract_assignments a on a.id=h.contract_assignment_id
  where a.cycle_type='MANDIRI'

  union all
  select p.paid_on,'KELUAR','BAYAR SUPPLIER MANDIRI',
         p.amount,
         case when alloc.cnt=1 then alloc.barn_id else null::uuid end,
         case when alloc.cnt=1 then alloc.contract_assignment_id else null::uuid end,
         (coalesce(s.name,'Supplier')||
          case when nullif(mp.reference_number,'') is not null then ' · '||mp.reference_number else '' end||
          case when nullif(trim(coalesce(p.notes,'')),'') is not null then ' · '||trim(p.notes) else '' end)::text,
         coalesce(p.reference,'')
  from public.finance_mandiri_supplier_payments p
  join public.logistics_mandiri_purchases mp on mp.id=p.purchase_id
  join public.suppliers s on s.id=mp.supplier_id
  left join lateral (
    select count(*) cnt,
           max(a.contract_assignment_id::text)::uuid contract_assignment_id,
           max(ca.barn_id::text)::uuid barn_id
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id
    where a.purchase_id=mp.id
  ) alloc on true

  union all
  select b.incurred_on,'KELUAR','GAJI ABK',
         b.amount,b.barn_id,b.contract_assignment_id,
         ('Gaji / upah ABK historis'||
          case when nullif(trim(coalesce(b.notes,'')),'') is not null then ' · '||trim(b.notes) else '' end)::text,
         coalesce(b.reference,'')
  from public.bop b
  where b.source_type='ABK_SALARY'
    and b.source_id is null and b.paid_by='COMPANY'

  union all
  select m.incurred_on,'KELUAR','PERAWATAN EXPEDISI',
         m.amount,null::uuid,null::uuid,
         (replace(m.category,'_',' ')||
          case when nullif(m.vehicle,'') is not null then ' · '||m.vehicle else '' end||
          case when nullif(trim(coalesce(m.notes,'')),'') is not null then ' · '||trim(m.notes) else '' end)::text,
         coalesce(m.reference,'')
  from public.finance_expedition_maintenance m;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_supplier_payables_v1()
 RETURNS TABLE(source_type text, source_id uuid, supplier_id uuid, supplier_code text, supplier_name text, supplier_bank_name text, supplier_bank_account_number text, supplier_bank_account_name text, contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, transaction_date date, reference text, total_amount numeric, paid_amount numeric, balance numeric, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  with sap as (
    select 'SAPRONAK_LUAR'::text source_type,h.id source_id,h.supplier_id,h.contract_assignment_id,h.barn_id,
           h.shipment_date transaction_date,h.reference_number reference,
           coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric total_amount
    from public.logistics_external_shipments h
    join public.logistics_external_shipment_items i on i.external_shipment_id=h.id
    group by h.id,h.supplier_id,h.contract_assignment_id,h.barn_id,h.shipment_date,h.reference_number
  ),
  meat as (
    select 'TAMBAH_DAGING'::text,m.id,m.supplier_id,m.contract_assignment_id,m.barn_id,m.purchase_date,
           m.reference_number,(m.weight_kg*m.purchase_price_per_kg)::numeric
    from public.marketing_external_meat_purchases m
  ),
  equip as (
    select 'BELI_PERALATAN'::text,e.id,e.supplier_id,null::uuid,e.barn_id,e.purchase_date,
           e.reference_number,(e.quantity*e.purchase_unit_price)::numeric
    from public.logistics_equipment_purchases e
  ),
  src as (
    select * from sap union all select * from meat union all select * from equip
  ),
  pay as (
    select p.source_type,p.source_id,coalesce(sum(p.amount),0)::numeric paid_amount
    from public.supplier_payments p group by p.source_type,p.source_id
  )
  select s.source_type,s.source_id,s.supplier_id,sp.code,sp.name,sp.bank_name,sp.bank_account_number,sp.bank_account_name,
         s.contract_assignment_id,s.barn_id,b.code,b.name,s.transaction_date,s.reference,s.total_amount,
         coalesce(p.paid_amount,0)::numeric,
         greatest(0,s.total_amount-coalesce(p.paid_amount,0))::numeric,
         case when coalesce(p.paid_amount,0)<=0 then 'BELUM_LUNAS'
              when coalesce(p.paid_amount,0)+0.0001<s.total_amount then 'SEBAGIAN'
              else 'LUNAS' end::text
  from src s
  join public.suppliers sp on sp.id=s.supplier_id
  join public.barns b on b.id=s.barn_id
  left join pay p on p.source_type=s.source_type and p.source_id=s.source_id
  order by s.transaction_date desc,sp.code,s.source_type;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_save_supplier_payment_atomic(p_source_type text, p_source_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row record; v_paid numeric; v_balance numeric; v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_source_type not in ('SAPRONAK_LUAR','TAMBAH_DAGING','BELI_PERALATAN') then raise exception 'Sumber hutang supplier tidak valid.'; end if;
  if p_paid_on is null then raise exception 'Tanggal pembayaran wajib.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal pembayaran harus lebih dari 0.'; end if;
  if p_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_source_type||':'||p_source_id::text,0));
  if p_source_type='SAPRONAK_LUAR' then
    select h.supplier_id,h.contract_assignment_id,h.barn_id,coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric total_amount
    into v_row from public.logistics_external_shipments h
    join public.logistics_external_shipment_items i on i.external_shipment_id=h.id
    where h.id=p_source_id group by h.supplier_id,h.contract_assignment_id,h.barn_id;
  elsif p_source_type='TAMBAH_DAGING' then
    select m.supplier_id,m.contract_assignment_id,m.barn_id,(m.weight_kg*m.purchase_price_per_kg)::numeric total_amount
    into v_row from public.marketing_external_meat_purchases m where m.id=p_source_id;
  else
    select e.supplier_id,null::uuid contract_assignment_id,e.barn_id,(e.quantity*e.purchase_unit_price)::numeric total_amount
    into v_row from public.logistics_equipment_purchases e where e.id=p_source_id;
  end if;

  if v_row.supplier_id is null then raise exception 'Transaksi sumber tidak ditemukan.'; end if;
  select coalesce(sum(p.amount),0)::numeric into v_paid from public.supplier_payments p
  where p.source_type=p_source_type and p.source_id=p_source_id;
  v_balance:=greatest(0,v_row.total_amount-v_paid);
  if p_amount>v_balance+0.0001 then raise exception 'Pembayaran melebihi sisa hutang. Sisa Rp %.',v_balance; end if;

  insert into public.supplier_payments(
    source_type,source_id,supplier_id,contract_assignment_id,barn_id,paid_on,amount,method,reference,notes,created_by
  ) values (
    p_source_type,p_source_id,v_row.supplier_id,v_row.contract_assignment_id,v_row.barn_id,
    p_paid_on,p_amount,p_method,nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_save_expedition_payment_atomic(p_invoice_id uuid, p_paid_on date, p_amount numeric, p_method text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_total numeric;
  v_paid numeric;
  v_balance numeric;
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_paid_on is null then raise exception 'Tanggal pembayaran wajib.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal pembayaran harus lebih dari 0.'; end if;

  perform pg_advisory_xact_lock(hashtextextended('EXPEDISI-INVOICE:'||p_invoice_id::text,0));

  select coalesce(sum(t.trip_price+t.additional-t.deduction),0)::numeric
    into v_total
  from public.finance_expedition_invoices i
  left join public.finance_expedition_invoice_items ii on ii.invoice_id=i.id
  left join public.finance_expedition_trips t on t.id=ii.trip_id
  where i.id=p_invoice_id and i.status<>'VOID'
  group by i.id;

  if v_total is null then raise exception 'Invoice tidak ditemukan atau sudah VOID.'; end if;

  select coalesce(sum(p.amount),0)::numeric into v_paid
  from public.finance_expedition_payments p
  where p.invoice_id=p_invoice_id;

  v_balance:=greatest(0,v_total-v_paid);
  if p_amount>v_balance+0.0001 then
    raise exception 'Pembayaran melebihi sisa piutang. Sisa Rp %.',v_balance;
  end if;

  insert into public.finance_expedition_payments(
    invoice_id,paid_on,amount,method,reference,notes,created_by
  ) values(
    p_invoice_id,p_paid_on,p_amount,
    nullif(trim(coalesce(p_method,'')),''),
    nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),
    auth.uid()
  )
  returning id into v_id;

  if abs((v_paid+p_amount)-v_total)<0.001 then
    update public.finance_expedition_invoices
    set status='PAID'
    where id=p_invoice_id;
  end if;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_expedition_trip_atomic(p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric DEFAULT 0, p_deduction numeric DEFAULT 0, p_notes text DEFAULT NULL::text, p_destinations jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_trip_id uuid;
  v_line jsonb;
  v_no integer := 0;
  v_destination_id uuid;
  v_destination_name text;
  v_cargo text;
  v_qty numeric;
  v_unit text;
  v_total_qty numeric := 0;
  v_first_destination text;
  v_legacy_cargo text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_trip_date is null then raise exception 'Tanggal trip wajib diisi.'; end if;
  if nullif(trim(p_driver),'') is null then raise exception 'Sopir wajib diisi.'; end if;
  if nullif(trim(p_vehicle),'') is null then raise exception 'Kendaraan wajib diisi.'; end if;
  if nullif(trim(p_zone),'') is null then raise exception 'Zona / rute wajib diisi.'; end if;
  if p_trip_price is null or p_trip_price < 0 then raise exception 'Harga trip tidak valid.'; end if;
  if coalesce(p_additional,0) < 0 or coalesce(p_deduction,0) < 0 then
    raise exception 'Tambahan / potongan tidak valid.';
  end if;
  if p_destinations is null or jsonb_typeof(p_destinations) <> 'array' or jsonb_array_length(p_destinations)=0 then
    raise exception 'Minimal satu tujuan wajib diisi.';
  end if;

  for v_line in select value from jsonb_array_elements(p_destinations)
  loop
    v_no := v_no + 1;
    v_destination_id := nullif(v_line->>'destination_id','')::uuid;
    v_destination_name := nullif(trim(v_line->>'destination_name'),'');
    v_cargo := nullif(trim(v_line->>'cargo'),'');
    v_qty := nullif(v_line->>'qty','')::numeric;
    v_unit := nullif(trim(v_line->>'unit'),'');

    if v_destination_name is null then
      raise exception 'Tujuan pada baris % wajib diisi.', v_no;
    end if;
    if v_qty is not null and v_qty < 0 then
      raise exception 'Qty pada baris % tidak valid.', v_no;
    end if;

    if v_no=1 then v_first_destination:=v_destination_name; end if;
    v_total_qty:=v_total_qty+coalesce(v_qty,0);
    v_legacy_cargo:=concat_ws(' • ',v_legacy_cargo,
      trim(concat(coalesce(v_destination_name,''),' - ',coalesce(v_cargo,''),
        case when v_qty is not null then ' '||trim(to_char(v_qty,'FM999999990.##')) else '' end,
        case when v_unit is not null then ' '||v_unit else '' end
      ))
    );
  end loop;

  insert into public.finance_expedition_trips(
    trip_date,mts_sj,rr,driver,vehicle,zone,destination,cargo,total_qty,
    trip_price,additional,deduction,reference,notes,created_by
  )
  values(
    p_trip_date,nullif(trim(p_mts_sj),''),nullif(trim(p_rr),''),trim(p_driver),
    trim(p_vehicle),trim(p_zone),v_first_destination,v_legacy_cargo,v_total_qty,
    p_trip_price,coalesce(p_additional,0),coalesce(p_deduction,0),null,
    nullif(trim(p_notes),''),auth.uid()
  )
  returning id into v_trip_id;

  v_no:=0;
  for v_line in select value from jsonb_array_elements(p_destinations)
  loop
    v_no:=v_no+1;
    insert into public.finance_expedition_trip_destinations(
      trip_id,line_no,destination_id,destination_name,cargo,qty,unit,notes,created_by
    )
    values(
      v_trip_id,v_no,
      nullif(v_line->>'destination_id','')::uuid,
      trim(v_line->>'destination_name'),
      nullif(trim(v_line->>'cargo'),''),
      nullif(v_line->>'qty','')::numeric,
      nullif(trim(v_line->>'unit'),''),
      nullif(trim(v_line->>'notes'),''),
      auth.uid()
    );
  end loop;

  return v_trip_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_post_expedition_bop_for_trip(p_trip_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_trip public.finance_expedition_trips%rowtype;
  v_route public.expedition_routes%rowtype;
  v_total numeric := 0;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  select * into v_trip from public.finance_expedition_trips where id=p_trip_id;
  if not found then raise exception 'Trip tidak ditemukan.'; end if;
  perform pg_advisory_xact_lock(hashtext('EXP_BOP:'||p_trip_id::text));
  if exists (select 1 from public.finance_expedition_bop where trip_id=p_trip_id and reference='AUTO_TRIP') then
    select coalesce(sum(amount),0) into v_total from public.finance_expedition_bop
    where trip_id=p_trip_id and reference='AUTO_TRIP';
    return v_total;
  end if;
  select * into v_route from public.expedition_routes where route_name=v_trip.zone and active limit 1;
  if not found then raise exception 'Master Rute untuk trip ini tidak ditemukan.'; end if;
  v_total:=coalesce(v_route.bop_operasional,0)+coalesce(v_route.bop_bbm,0)+
    coalesce(v_route.bop_tol,0)+coalesce(v_route.bop_uang_jalan,0)+
    coalesce(v_route.bop_makan_sopir,0)+coalesce(v_route.bop_bongkar_muat,0);
  if v_total<=0 then raise exception 'Biaya standar BOP untuk rute % belum diisi di Master Rute.',v_trip.zone; end if;
  if coalesce(v_route.bop_operasional,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'OPERASIONAL',v_route.bop_operasional,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Total OP dari Master Rute',auth.uid());
  end if;
  if coalesce(v_route.bop_bbm,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'BBM',v_route.bop_bbm,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Otomatis dari Master Rute',auth.uid());
  end if;
  if coalesce(v_route.bop_tol,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'TOL',v_route.bop_tol,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Otomatis dari Master Rute',auth.uid());
  end if;
  if coalesce(v_route.bop_uang_jalan,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'UANG_JALAN',v_route.bop_uang_jalan,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Otomatis dari Master Rute',auth.uid());
  end if;
  if coalesce(v_route.bop_makan_sopir,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'MAKAN_SOPIR',v_route.bop_makan_sopir,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Otomatis dari Master Rute',auth.uid());
  end if;
  if coalesce(v_route.bop_bongkar_muat,0)>0 then
    insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
    values(v_trip.trip_date,'BONGKAR_MUAT',v_route.bop_bongkar_muat,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,'AUTO_TRIP','Otomatis dari Master Rute',auth.uid());
  end if;
  return v_total;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_expedition_profit_loss_v2()
 RETURNS TABLE(expedition_revenue numeric, operational_bop numeric, operational_profit numeric, maintenance_bop numeric, net_profit numeric, cash_received numeric, receivable numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with revenue as (
    select coalesce(sum(t.trip_price+t.additional-t.deduction),0)::numeric amount
    from public.finance_expedition_invoices i
    join public.finance_expedition_invoice_items ii on ii.invoice_id=i.id
    join public.finance_expedition_trips t on t.id=ii.trip_id
    where i.status in ('ISSUED','PAID')
  ),
  operational as (
    select coalesce(sum(amount),0)::numeric amount
    from public.finance_expedition_bop
    where category not in ('SERVIS','BAN','PAJAK_KENDARAAN','PERBAIKAN')
  ),
  maintenance as (
    select coalesce(sum(amount),0)::numeric amount
    from public.finance_expedition_maintenance
  ),
  paid as (
    select coalesce(sum(amount),0)::numeric amount
    from public.finance_expedition_payments
  )
  select
    revenue.amount,
    operational.amount,
    revenue.amount-operational.amount,
    maintenance.amount,
    revenue.amount-operational.amount-maintenance.amount,
    paid.amount,
    greatest(revenue.amount-paid.amount,0::numeric)
  from revenue,operational,maintenance,paid
  where private.my_bms_role() in ('ADMIN'::public.bms_role,'KEUANGAN'::public.bms_role,'OWNER'::public.bms_role);
$function$;

CREATE OR REPLACE FUNCTION public.finance_post_expedition_bop_for_trip(p_trip_id uuid, p_operational_override numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_trip public.finance_expedition_trips%rowtype;
  v_total numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_operational_override is null then
    return public.finance_post_expedition_bop_for_trip(p_trip_id);
  end if;
  if p_operational_override<=0 then raise exception 'Total OP khusus harus lebih dari nol.'; end if;
  select * into v_trip from public.finance_expedition_trips where id=p_trip_id;
  if not found then raise exception 'Trip tidak ditemukan.'; end if;
  perform pg_advisory_xact_lock(hashtext('EXP_BOP:'||p_trip_id::text));
  if exists (select 1 from public.finance_expedition_bop where trip_id=p_trip_id and reference='AUTO_TRIP') then
    select coalesce(sum(amount),0) into v_total from public.finance_expedition_bop
    where trip_id=p_trip_id and reference='AUTO_TRIP';
    return v_total;
  end if;
  insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
  values(v_trip.trip_date,'OPERASIONAL',p_operational_override,v_trip.id,v_trip.driver,v_trip.vehicle,v_trip.zone,
    'AUTO_TRIP','Total OP khusus sesuai buku besar',auth.uid());
  return p_operational_override;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_correct_expedition_trip_op(p_trip_id uuid, p_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.finance_expedition_bop%rowtype;
  v_count integer;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_amount is null or p_amount<=0 then
    raise exception 'Nominal OP harus lebih dari nol.';
  end if;
  perform pg_advisory_xact_lock(hashtext('EXP_BOP:'||p_trip_id::text));
  select count(*) into v_count from public.finance_expedition_bop
  where trip_id=p_trip_id and reference='AUTO_TRIP';
  if v_count<>1 then
    raise exception 'Koreksi otomatis hanya tersedia untuk satu catatan OP pada trip ini.';
  end if;
  select * into v_row from public.finance_expedition_bop
  where trip_id=p_trip_id and reference='AUTO_TRIP' and category='OPERASIONAL'
  for update;
  if not found then
    raise exception 'Catatan OP trip tidak ditemukan.';
  end if;
  if v_row.amount=p_amount then return p_amount; end if;
  update public.finance_expedition_bop set amount=p_amount where id=v_row.id;
  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'UPDATE','finance_expedition_bop',v_row.id::text,
    jsonb_build_object('trip_id',p_trip_id,'amount',v_row.amount,'category',v_row.category),
    jsonb_build_object('trip_id',p_trip_id,'amount',p_amount,'category',v_row.category));
  return p_amount;
end
$function$;

CREATE OR REPLACE FUNCTION public.production_ppl_directory()
 RETURNS TABLE(user_id uuid, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active;

  if (v_role IS NULL OR v_role not in (
    'ADMIN'::public.bms_role,
    'OWNER'::public.bms_role,
    'PPL'::public.bms_role
  )) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  select p.user_id,p.full_name
  from public.profiles p
  where p.active
    and p.role='PPL'::public.bms_role
    and (v_role <> 'PPL'::public.bms_role or p.user_id=auth.uid())
  order by p.full_name;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_mandiri_purchase_atomic(p_purchase_id uuid, p_supplier_id uuid, p_item_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text, p_notes text, p_allocations jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_sum numeric:=0;
  v jsonb;
  v_assignment uuid;
  v_qty numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah pembelian harus lebih dari 0.'; end if;
  if p_purchase_unit_price is null or p_purchase_unit_price<0 then raise exception 'Harga beli tidak valid.'; end if;
  if p_purchase_date is null then raise exception 'Tanggal pembelian wajib diisi.'; end if;
  if not exists(select 1 from public.suppliers s where s.id=p_supplier_id and s.active and s.supplier_type='SAPRONAK') then raise exception 'Supplier Sapronak tidak valid.'; end if;
  if not exists(select 1 from public.items i where i.id=p_item_id and i.active and (i.supplier_id=p_supplier_id or i.supplier_id is null)) then raise exception 'Barang tidak sesuai Supplier.'; end if;
  if p_purchase_id is not null and exists(
    select 1 from public.logistics_mandiri_purchase_allocations a
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id
    where a.purchase_id=p_purchase_id and not ca.active
  ) then raise exception 'Pembelian sudah terkait siklus CLOSED dan tidak dapat diedit.'; end if;
  if p_allocations is null or jsonb_typeof(p_allocations)<>'array' then raise exception 'Distribusi kandang tidak valid.'; end if;

  for v in select value from jsonb_array_elements(p_allocations)
  loop
    v_assignment:=(v->>'assignment_id')::uuid;
    v_qty:=coalesce((v->>'quantity')::numeric,0);
    if v_qty<=0 then raise exception 'Jumlah distribusi harus lebih dari 0.'; end if;
    if not exists(select 1 from public.logistics_contract_assignments a where a.id=v_assignment and a.active and a.cycle_type='MANDIRI') then raise exception 'Distribusi hanya boleh ke siklus Mandiri aktif.'; end if;
    v_sum:=v_sum+v_qty;
  end loop;
  if v_sum>p_quantity then raise exception 'Total distribusi (%) melebihi jumlah pembelian (%).',v_sum,p_quantity; end if;

  if p_purchase_id is null then
    insert into public.logistics_mandiri_purchases(supplier_id,item_id,purchase_date,quantity,purchase_unit_price,reference_number,notes,created_by)
    values(p_supplier_id,p_item_id,p_purchase_date,p_quantity,p_purchase_unit_price,p_reference_number,p_notes,auth.uid())
    returning id into v_id;
  else
    update public.logistics_mandiri_purchases
    set supplier_id=p_supplier_id,item_id=p_item_id,purchase_date=p_purchase_date,quantity=p_quantity,
        purchase_unit_price=p_purchase_unit_price,reference_number=p_reference_number,notes=p_notes,updated_at=now()
    where id=p_purchase_id returning id into v_id;
    if v_id is null then raise exception 'Pembelian Mandiri tidak ditemukan.'; end if;
    delete from public.logistics_mandiri_purchase_allocations where purchase_id=v_id;
  end if;

  for v in select value from jsonb_array_elements(p_allocations)
  loop
    insert into public.logistics_mandiri_purchase_allocations(purchase_id,contract_assignment_id,quantity)
    values(v_id,(v->>'assignment_id')::uuid,(v->>'quantity')::numeric);
  end loop;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.delete_mandiri_purchase_atomic(p_purchase_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','LOGISTIK')
  ) then raise exception 'Akses ditolak.'; end if;

  if exists (
    select 1
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id
    where a.purchase_id=p_purchase_id and not ca.active
  ) then raise exception 'Pembelian sudah terkait siklus CLOSED dan tidak dapat dihapus.'; end if;

  delete from public.logistics_mandiri_purchases where id=p_purchase_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_close_mandiri_cycle_atomic(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.logistics_contract_assignments%rowtype;
  s record;
  v_depletion numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat Close Produksi.';
  end if;

  select * into v
  from public.logistics_contract_assignments
  where id=p_contract_assignment_id
  for update;

  if v.id is null then raise exception 'Siklus tidak ditemukan.'; end if;
  if not v.active then raise exception 'Siklus sudah Close.'; end if;
  if v.cycle_type<>'MANDIRI' then raise exception 'Siklus ini bukan Mandiri.'; end if;
  if nullif(trim(coalesce(v.performance_template_name,'')),'') is null then
    raise exception 'Performance Mandiri belum dipilih.';
  end if;

  if not exists (
    select 1 from public.chick_ins c
    where c.contract_assignment_id=v.id and c.received>0
  ) then raise exception 'Chick-In Mandiri belum diinput.'; end if;

  if not exists (
    select 1 from public.marketing_contract_harvests h
    where h.contract_assignment_id=v.id
  ) then raise exception 'Panen Mandiri belum diinput.'; end if;

  select * into s
  from public.production_mandiri_rhpp_summary(v.id);

  if s.chick_in_birds is null
     or coalesce(s.chick_in_birds,0)<=0
     or coalesce(s.total_harvest_birds,0)<=0
     or coalesce(s.total_harvest_kg,0)<=0 then
    raise exception 'Data produksi Mandiri belum lengkap untuk Close.';
  end if;

  v_depletion := greatest(coalesce(s.chick_in_birds,0)-coalesce(s.total_harvest_birds,0),0);

  insert into public.production_mandiri_final(
    contract_assignment_id,barn_id,
    chick_in_birds,depletion_birds,total_harvest_birds,total_harvest_kg,
    avg_bw_kg,weighted_age,net_feed_kg,fcr_actual,ip,
    harvest_value,sapronak_cost,source_reference,
    closed_on,created_by
  ) values (
    v.id,v.barn_id,
    coalesce(s.chick_in_birds,0),v_depletion,
    coalesce(s.total_harvest_birds,0),coalesce(s.total_harvest_kg,0),
    coalesce(s.avg_bw_kg,0),coalesce(s.weighted_age,0),
    coalesce(s.net_feed_kg,0),coalesce(s.fcr_actual,0),coalesce(s.ip,0),
    coalesce(s.harvest_value,0),coalesce(s.sapronak_cost,0),'LIVE_TRANSACTION',
    (now() at time zone 'Asia/Jakarta')::date,auth.uid()
  );

  perform set_config('bms.allow_production_close','1',true);
  update public.logistics_contract_assignments
  set active=false
  where id=v.id;

  return v.id;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_mitra_split_return_atomic(p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_item record;
  v_sent numeric;
  v_prev_physical numeric;
  v_used numeric;
  v_accepted jsonb:='[]'::jsonb;
  v_return_item public.logistics_return_items%rowtype;
  v_price numeric;
begin
  if (private.my_bms_role() IS NULL OR private.my_bms_role() not in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  if p_return_date is null then raise exception 'Tanggal retur wajib diisi.'; end if;
  if not exists(select 1 from public.logistics_contract_assignments a
                where a.id=p_assignment_id and a.barn_id=p_barn_id and a.active
                  and a.cycle_type='MITRA' and a.start_date<=p_return_date)
  then raise exception 'Siklus Mitra asal harus aktif.'; end if;
  -- Serialize two return requests for the same cycle before checking stock.
  perform 1 from public.logistics_contract_assignments a where a.id=p_assignment_id for update;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0
  then raise exception 'Minimal satu pakan retur wajib diisi.'; end if;
  for v_item in
    select (x->>'item_id')::uuid item_id,
           sum((x->>'physical_quantity')::numeric) physical_qty,
           sum((x->>'accepted_quantity')::numeric) accepted_qty
    from jsonb_array_elements(p_items) x group by (x->>'item_id')::uuid
  loop
    if v_item.physical_qty is null or v_item.accepted_qty is null
      or v_item.physical_qty='NaN'::numeric or v_item.accepted_qty='NaN'::numeric
      or v_item.physical_qty<=0 or v_item.accepted_qty<0 or v_item.accepted_qty>v_item.physical_qty
    then raise exception 'Jumlah fisik dan jumlah diakui inti tidak valid.'; end if;
    if not exists(select 1 from public.items i where i.id=v_item.item_id and i.category='PAKAN')
    then raise exception 'Retur terpisah saat ini khusus Pakan.'; end if;
    select coalesce(sum(si.quantity),0) into v_sent
    from public.logistics_shipments s
    join public.logistics_shipment_items si on si.shipment_id=s.id
    where s.contract_assignment_id=p_assignment_id and si.item_id=v_item.item_id;
    select coalesce(sum(ri.quantity),0) into v_prev_physical
    from public.logistics_returns r
    join public.logistics_return_items ri on ri.return_id=r.id
    where r.contract_assignment_id=p_assignment_id and ri.item_id=v_item.item_id;
    v_prev_physical:=v_prev_physical+coalesce((select sum(rs.quantity)
      from public.logistics_mitra_retained_feed rs
      where rs.source_assignment_id=p_assignment_id and rs.item_id=v_item.item_id),0);
    select coalesce(sum(rec.feed_quantity_units),0) into v_used
    from public.recordings rec
    where rec.contract_assignment_id=p_assignment_id and rec.feed_item_id=v_item.item_id;
    if v_item.physical_qty>v_sent-v_prev_physical-v_used
    then raise exception 'Sisa fisik pakan tersedia %.',greatest(0,v_sent-v_prev_physical-v_used); end if;
    if v_item.accepted_qty>0 then
      v_accepted:=v_accepted||jsonb_build_array(
        jsonb_build_object('item_id',v_item.item_id,'quantity',v_item.accepted_qty));
    end if;
  end loop;
  if jsonb_array_length(v_accepted)>0 then
    v_id:=public.save_logistics_return_atomic(null,p_barn_id,p_assignment_id,p_return_date,p_reference,p_notes,v_accepted);
  else
    insert into public.logistics_returns(barn_id,contract_assignment_id,return_date,reference,notes)
    values(p_barn_id,p_assignment_id,p_return_date,p_reference,p_notes) returning id into v_id;
  end if;
  for v_item in
    select (x->>'item_id')::uuid item_id,
           sum((x->>'physical_quantity')::numeric-(x->>'accepted_quantity')::numeric) retained_qty
    from jsonb_array_elements(p_items) x group by (x->>'item_id')::uuid
  loop
    if v_item.retained_qty<=0 then continue; end if;
    select ri.* into v_return_item from public.logistics_return_items ri
      where ri.return_id=v_id and ri.item_id=v_item.item_id;
    v_price:=v_return_item.unit_price;
    if v_price is null then
      select si.unit_price into v_price from public.logistics_shipment_items si
      join public.logistics_shipments s on s.id=si.shipment_id
      where s.contract_assignment_id=p_assignment_id and si.item_id=v_item.item_id
      order by s.shipment_date desc,si.created_at desc limit 1;
    end if;
    if v_price is null then raise exception 'Harga kontrak pakan asal tidak ditemukan.'; end if;
    insert into public.logistics_mitra_retained_feed(
      return_id,return_item_id,source_assignment_id,item_id,quantity,unit_price)
    values(v_id,v_return_item.id,p_assignment_id,v_item.item_id,v_item.retained_qty,v_price);
  end loop;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.move_company_feed_atomic(p_retained_feed_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lot public.logistics_mitra_retained_feed%rowtype;
  v_cycle public.logistics_contract_assignments%rowtype;
  v_warehouse numeric;
  v_at_cycle numeric;
  v_feed_available numeric;
  v_id uuid;
begin
  if (private.my_bms_role() IS NULL OR private.my_bms_role() not in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  if p_direction not in ('IN','OUT') or p_quantity is null or p_quantity='NaN'::numeric
     or p_quantity<=0 or p_transferred_on is null
  then raise exception 'Arah, tanggal, dan jumlah perpindahan wajib valid.'; end if;
  select * into v_lot from public.logistics_mitra_retained_feed where id=p_retained_feed_id for update;
  if not found then raise exception 'Stok BMS asal tidak ditemukan.'; end if;
  select * into v_cycle from public.logistics_contract_assignments where id=p_contract_assignment_id for update;
  if not found or not v_cycle.active then raise exception 'Siklus tujuan harus aktif.'; end if;
  if p_transferred_on<v_cycle.start_date then raise exception 'Tanggal sebelum awal siklus.'; end if;
  if p_direction='IN' and v_cycle.id=v_lot.source_assignment_id
  then raise exception 'Stok tidak dapat dikirim kembali ke siklus asal melalui pemindahan.'; end if;
  select v_lot.quantity+coalesce(sum(case when m.direction='OUT' then m.quantity else -m.quantity end),0)
    into v_warehouse from public.logistics_company_feed_movements m
    where m.retained_feed_id=v_lot.id;
  if p_direction='IN' and p_quantity>v_warehouse then
    raise exception 'Stok gudang BMS hanya %.',v_warehouse; end if;
  if p_direction='OUT' then
    select coalesce(sum(case when m.direction='IN' then m.quantity else -m.quantity end),0)
      into v_at_cycle from public.logistics_company_feed_movements m
      where m.retained_feed_id=v_lot.id and m.contract_assignment_id=v_cycle.id;
    select
      coalesce((select sum(si.quantity) from public.logistics_shipments s
        join public.logistics_shipment_items si on si.shipment_id=s.id
        where s.contract_assignment_id=v_cycle.id and si.item_id=v_lot.item_id),0)
      +coalesce((select sum(ei.quantity) from public.logistics_external_shipments e
        join public.logistics_external_shipment_items ei on ei.external_shipment_id=e.id
        where e.contract_assignment_id=v_cycle.id and ei.item_id=v_lot.item_id),0)
      +coalesce((select sum(ma.quantity) from public.logistics_mandiri_purchase_allocations ma
        join public.logistics_mandiri_purchases mp on mp.id=ma.purchase_id
        where ma.contract_assignment_id=v_cycle.id and mp.item_id=v_lot.item_id),0)
      +coalesce((select sum(case when m.direction='IN' then m.quantity else -m.quantity end)
        from public.logistics_company_feed_movements m
        join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
        where m.contract_assignment_id=v_cycle.id and l.item_id=v_lot.item_id),0)
      -coalesce((select sum(ri.quantity) from public.logistics_returns r
        join public.logistics_return_items ri on ri.return_id=r.id
        where r.contract_assignment_id=v_cycle.id and ri.item_id=v_lot.item_id),0)
      -coalesce((select sum(l.quantity) from public.logistics_mitra_retained_feed l
        where l.source_assignment_id=v_cycle.id and l.item_id=v_lot.item_id),0)
      -coalesce((select sum(rec.feed_quantity_units) from public.recordings rec
        where rec.contract_assignment_id=v_cycle.id and rec.feed_item_id=v_lot.item_id),0)
      into v_feed_available;
    if p_quantity>least(v_at_cycle,v_feed_available) then
      raise exception 'Sisa pakan di kandang tidak cukup untuk retur ke stok BMS.'; end if;
  end if;
  insert into public.logistics_company_feed_movements(
    retained_feed_id,contract_assignment_id,direction,quantity,transferred_on,reference)
  values(p_retained_feed_id,p_contract_assignment_id,p_direction,p_quantity,p_transferred_on,p_reference)
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_split_return()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_table_name='logistics_returns' then
    if exists(select 1 from public.logistics_mitra_retained_feed l where l.return_id=old.id) then
      raise exception 'Retur dengan stok BMS terkunci. Buat koreksi tercatat terpisah.';
    end if;
  elsif exists(select 1 from public.logistics_mitra_retained_feed l where l.return_item_id=old.id) then
    raise exception 'Retur dengan stok BMS terkunci. Buat koreksi tercatat terpisah.';
  end if;
  return old;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_receive_mandiri_sale_atomic(p_harvest_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_h public.marketing_contract_harvests%rowtype; v_id uuid; v_paid numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')) then raise exception 'Akses ditolak.'; end if;
  select h.* into v_h from public.marketing_contract_harvests h where h.id=p_harvest_id for update;
  if v_h.id is null or not exists(select 1 from public.logistics_contract_assignments a where a.id=v_h.contract_assignment_id and a.cycle_type='MANDIRI') then raise exception 'Penjualan Mandiri tidak ditemukan.'; end if;
  if p_received_on is null or p_received_on<v_h.harvested_on then raise exception 'Tanggal penerimaan harus pada atau sesudah tanggal panen.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Nominal penerimaan harus lebih dari nol.'; end if;
  if p_method not in ('TRANSFER','TUNAI','LAINNYA') then raise exception 'Metode penerimaan tidak valid.'; end if;
  select coalesce(sum(r.amount),0) into v_paid from public.finance_mandiri_sales_receipts r where r.harvest_id=p_harvest_id;
  if v_paid+p_amount>v_h.total_amount then raise exception 'Penerimaan melebihi sisa piutang.'; end if;
  insert into public.finance_mandiri_sales_receipts(harvest_id,received_on,amount,method,reference,notes)
  values(p_harvest_id,p_received_on,p_amount,p_method,nullif(trim(p_reference),''),nullif(trim(p_notes),'')) returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.production_mandiri_rhpp_summary(p_contract_assignment_id uuid)
 RETURNS TABLE(chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, weighted_age numeric, avg_bw_kg numeric, mortality_pct numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, std_bw_kg numeric, ip numeric, harvest_value numeric, sapronak_cost numeric, bop_produksi numeric, laba_operasional numeric, received_total numeric, receivable numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_a public.logistics_contract_assignments%rowtype; v_role public.bms_role;
begin
  select p.role into v_role from public.profiles p where p.user_id=auth.uid() and p.active;
  select * into v_a from public.logistics_contract_assignments a where a.id=p_contract_assignment_id and a.cycle_type='MANDIRI';
  if v_a.id is null or (v_role IS NULL OR v_role not in ('ADMIN','OWNER','PPL','KEUANGAN')) or (v_role='PPL' and v_a.ppl_id<>auth.uid()) then raise exception 'Siklus Mandiri tidak ditemukan atau akses ditolak.'; end if;
  return query
  with ci as (select greatest(0,coalesce(sum(c.received-c.doa),0))::numeric n,min(c.arrived_on) dt from public.chick_ins c where c.contract_assignment_id=v_a.id),
  h as (select coalesce(sum(x.birds),0) birds,coalesce(sum(x.net_weight_kg),0) kg,coalesce(sum(x.total_amount),0) revenue,
    coalesce(sum(x.birds*greatest(1,x.harvested_on-ci.dt+1))/nullif(sum(x.birds),0),0) age
    from public.marketing_contract_harvests x cross join ci where x.contract_assignment_id=v_a.id),
  feed as (select coalesce(sum(z.qty*coalesce(i.kg_per_unit,0)),0) kg from (
    select p.item_id,sum(a.quantity) qty from public.logistics_mandiri_purchase_allocations a
    join public.logistics_mandiri_purchases p on p.id=a.purchase_id where a.contract_assignment_id=v_a.id group by p.item_id
    union all
    select l.item_id,sum(case when m.direction='IN' then m.quantity else -m.quantity end) qty
    from public.logistics_company_feed_movements m join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    where m.contract_assignment_id=v_a.id group by l.item_id
  ) z join public.items i on i.id=z.item_id and i.category='PAKAN'),
  mortality as (select greatest(coalesce(ci.n,0)-coalesce(h.birds,0),0)::numeric birds from ci cross join h),
  standard as (select s.std_fcr,s.std_body_weight_g from public.performance_standards s
    where s.template_name=v_a.performance_template_name and s.age_days<=greatest(1,round((select age from h))::integer)
    order by s.age_days desc,s.id limit 1),
  cost as (select
    (select coalesce(sum(a.quantity*p.purchase_unit_price),0) from public.logistics_mandiri_purchase_allocations a
      join public.logistics_mandiri_purchases p on p.id=a.purchase_id where a.contract_assignment_id=v_a.id)
    +(select coalesce(sum((case when m.direction='IN' then m.quantity else -m.quantity end)*l.unit_price),0)
      from public.logistics_company_feed_movements m join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
      where m.contract_assignment_id=v_a.id) sapronak_luar,
    (select coalesce(sum(b.amount),0) from public.bop b where b.contract_assignment_id=v_a.id) bop_produksi),
  paid as (select coalesce(sum(r.amount),0) amount from public.finance_mandiri_sales_receipts r
    join public.marketing_contract_harvests x on x.id=r.harvest_id where x.contract_assignment_id=v_a.id)
  select ci.n,h.birds,h.kg,round(h.age,2),round(h.kg/nullif(h.birds,0),3),
    round(100*mortality.birds/nullif(ci.n,0),2),feed.kg,round(feed.kg/nullif(h.kg,0),3),
    standard.std_fcr,round(standard.std_body_weight_g/1000,3),
    round((100-100*mortality.birds/nullif(ci.n,0))*(h.kg/nullif(h.birds,0))*100/nullif(h.age*feed.kg/nullif(h.kg,0),0),2),
    h.revenue,cost.sapronak_luar,cost.bop_produksi,h.revenue-cost.sapronak_luar-cost.bop_produksi,
    paid.amount,h.revenue-paid.amount
  from ci cross join h cross join feed cross join mortality left join standard on true cross join cost cross join paid;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_paid_mandiri_harvest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if exists(select 1 from public.finance_mandiri_sales_receipts r where r.harvest_id=old.id) then
    raise exception 'Penjualan sudah memiliki penerimaan. Koreksi melalui Keuangan terlebih dahulu.';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $function$;

CREATE OR REPLACE FUNCTION private.reject_meat_purchase_in_bop()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if coalesce(new.amount,0)>0
     and lower(coalesce(new.notes,'')||' '||coalesce(new.reference,''))
         ~ '(tambah|nempel)[[:space:]]+daging'
     and lower(coalesce(new.notes,'')) not like '%dipindahkan ke tagihan%'
  then
    raise exception 'Tambah Daging tidak boleh masuk BOP. Gunakan menu Marketing - Tambah Daging.';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_pay_mandiri_supplier_atomic(p_purchase_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_purchase public.logistics_mandiri_purchases%rowtype;
  v_total numeric;
  v_paid numeric;
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  select p.* into v_purchase
  from public.logistics_mandiri_purchases p
  where p.id=p_purchase_id
  for update;

  if v_purchase.id is null then
    raise exception 'Pembelian Mandiri tidak ditemukan.';
  end if;

  if p_paid_on is null or p_paid_on < v_purchase.purchase_date then
    raise exception 'Tanggal pembayaran harus pada atau sesudah tanggal pembelian.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal pembayaran harus lebih dari nol.';
  end if;

  if p_method not in ('TRANSFER','TUNAI','LAINNYA') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  v_total := coalesce(v_purchase.quantity,0) * coalesce(v_purchase.purchase_unit_price,0);

  select coalesce(sum(x.amount),0)
  into v_paid
  from public.finance_mandiri_supplier_payments x
  where x.purchase_id=p_purchase_id;

  if v_paid + p_amount > v_total + 0.005 then
    raise exception 'Pembayaran melebihi sisa hutang supplier.';
  end if;

  insert into public.finance_mandiri_supplier_payments(
    purchase_id,paid_on,amount,method,reference,notes,created_by
  ) values (
    p_purchase_id,p_paid_on,p_amount,p_method,
    nullif(trim(p_reference),''),
    nullif(trim(p_notes),''),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_transaction_v1(p_table text, p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_allowed boolean := false;
  v_deleted integer := 0;
  v_old jsonb;
begin
  if auth.uid() is null then raise exception 'Sesi login tidak ditemukan.'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active=true and p.role='ADMIN'
  ) then raise exception 'Hanya ADMIN yang boleh menghapus transaksi.'; end if;

  v_allowed := p_table = any(array[
    'logistics_shipments','logistics_external_shipments','logistics_returns',
    'logistics_external_returns','logistics_mandiri_purchases',
    'marketing_contract_harvests','marketing_external_meat_purchases',
    'chick_ins','recordings','visits','production_estimates',
    'bop','barn_maintenance_costs','bop_outside',
    'finance_expedition_trips','finance_expedition_invoices','finance_expedition_payments',
    'finance_expedition_bop','finance_expedition_maintenance',
    'advances','advance_payments','supplier_payments',
    'finance_mandiri_sales_receipts','finance_mandiri_supplier_payments',
    'rhpp_real','abk_cycle_salaries'
  ]);
  if not v_allowed then raise exception 'Tabel % tidak diizinkan untuk hapus transaksi.',p_table; end if;

  execute format('select to_jsonb(t) from public.%I t where id::text=$1',p_table)
    into v_old using p_id;
  if v_old is null then raise exception 'Transaksi tidak ditemukan atau sudah terhapus.'; end if;

  if p_table='rhpp_real' then
    perform set_config('bms.allow_rhpp_real_delete','1',true);
  end if;

  begin
    execute format('delete from public.%I where id::text=$1',p_table) using p_id;
    get diagnostics v_deleted = row_count;
  exception
    when foreign_key_violation then
      raise exception 'Transaksi tidak dapat dihapus karena masih dipakai data lain. Koreksi atau hapus transaksi turunannya terlebih dahulu.';
  end;

  if v_deleted=0 then raise exception 'Transaksi tidak ditemukan atau sudah terhapus.'; end if;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN',p_table,p_id,v_old,null);

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_correct_employee_advance_v1(p_id uuid, p_employee_id uuid, p_advanced_on date, p_amount numeric, p_description text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_paid numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  if coalesce(p_amount,0)<=0 then raise exception 'Nominal kasbon harus lebih dari 0.'; end if;
  if p_advanced_on is null then raise exception 'Tanggal kasbon wajib.'; end if;
  if not exists(select 1 from public.employees e where e.id=p_employee_id and e.active) then
    raise exception 'Karyawan / ABK tidak valid.';
  end if;

  select coalesce(sum(ap.amount),0) into v_paid
  from public.advance_payments ap where ap.advance_id=p_id;

  if p_amount < v_paid then
    raise exception 'Nominal kasbon tidak boleh lebih kecil dari total yang sudah dibayar Rp %.', v_paid;
  end if;

  update public.advances
  set employee_id=p_employee_id,
      advanced_on=p_advanced_on,
      amount=p_amount,
      description=nullif(trim(coalesce(p_description,'')),''),
      contract_assignment_id=null,
      barn_id=null
  where id=p_id;

  if not found then raise exception 'Kasbon tidak ditemukan.'; end if;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_advance_payment_v1(p_id uuid, p_advance_id uuid, p_paid_on date, p_amount numeric, p_method text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_advance numeric;
  v_other numeric;
  v_old_method text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  select method into v_old_method from public.advance_payments where id=p_id;
  if v_old_method is null then raise exception 'Pembayaran kasbon tidak ditemukan.'; end if;
  if v_old_method='POTONG_GAJI' then
    raise exception 'Pembayaran dari potongan gaji harus dikoreksi dari transaksi Gaji ABK.';
  end if;
  if p_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal pembayaran harus lebih dari 0.'; end if;

  perform 1 from public.advances where id in (p_advance_id,(select advance_id from public.advance_payments where id=p_id)) order by id for update;
  select a.amount into v_advance from public.advances a where a.id=p_advance_id;
  if v_advance is null then raise exception 'Kasbon tujuan tidak ditemukan.'; end if;

  select coalesce(sum(ap.amount),0) into v_other
  from public.advance_payments ap
  where ap.advance_id=p_advance_id and ap.id<>p_id;

  if p_amount > greatest(0,v_advance-v_other)+0.0001 then
    raise exception 'Nominal melebihi sisa kasbon Rp %.', greatest(0,v_advance-v_other);
  end if;

  update public.advance_payments
  set advance_id=p_advance_id,paid_on=p_paid_on,amount=p_amount,method=p_method,
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_mandiri_receipt_v1(p_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_harvest uuid;
  v_total numeric;
  v_other numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_method not in ('TRANSFER','TUNAI','LAINNYA') then raise exception 'Metode tidak valid.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal harus lebih dari 0.'; end if;

  select r.harvest_id into v_harvest from public.finance_mandiri_sales_receipts r where r.id=p_id;
  if v_harvest is null then raise exception 'Penerimaan Mandiri tidak ditemukan.'; end if;

  select h.total_amount into v_total from public.marketing_contract_harvests h where h.id=v_harvest for update;
  select coalesce(sum(r.amount),0) into v_other
  from public.finance_mandiri_sales_receipts r
  where r.harvest_id=v_harvest and r.id<>p_id;

  if p_amount > greatest(0,v_total-v_other)+0.0001 then
    raise exception 'Nominal melebihi sisa piutang Rp %.', greatest(0,v_total-v_other);
  end if;

  update public.finance_mandiri_sales_receipts
  set received_on=p_received_on,amount=p_amount,method=p_method,
      reference=nullif(trim(coalesce(p_reference,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_mandiri_supplier_payment_v1(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_purchase uuid;
  v_total numeric;
  v_other numeric;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_method not in ('TRANSFER','TUNAI','LAINNYA') then raise exception 'Metode tidak valid.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal harus lebih dari 0.'; end if;

  select p.purchase_id into v_purchase from public.finance_mandiri_supplier_payments p where p.id=p_id;
  if v_purchase is null then raise exception 'Pembayaran supplier Mandiri tidak ditemukan.'; end if;

  select m.quantity*m.purchase_unit_price into v_total
  from public.logistics_mandiri_purchases m where m.id=v_purchase for update;

  select coalesce(sum(p.amount),0) into v_other
  from public.finance_mandiri_supplier_payments p
  where p.purchase_id=v_purchase and p.id<>p_id;

  if p_amount > greatest(0,v_total-v_other)+0.0001 then
    raise exception 'Nominal melebihi sisa hutang Rp %.', greatest(0,v_total-v_other);
  end if;

  update public.finance_mandiri_supplier_payments
  set paid_on=p_paid_on,amount=p_amount,method=p_method,
      reference=nullif(trim(coalesce(p_reference,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_supplier_payment_v1(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_source_type text; v_source_id uuid; v_total numeric; v_other numeric;
begin
  if not exists (
    select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if p_method not in ('TRANSFER','TUNAI') then raise exception 'Metode tidak valid.'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'Nominal harus lebih dari 0.'; end if;

  select p.source_type,p.source_id into v_source_type,v_source_id from public.supplier_payments p where p.id=p_id;
  if v_source_id is null then raise exception 'Pembayaran supplier tidak ditemukan.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_source_type||':'||v_source_id::text,0));
  if v_source_type='SAPRONAK_LUAR' then
    select coalesce(sum(i.quantity*i.purchase_unit_price),0)::numeric into v_total
    from public.logistics_external_shipment_items i where i.external_shipment_id=v_source_id;
  elsif v_source_type='TAMBAH_DAGING' then
    select (m.weight_kg*m.purchase_price_per_kg)::numeric into v_total
    from public.marketing_external_meat_purchases m where m.id=v_source_id;
  elsif v_source_type='BELI_PERALATAN' then
    select (e.quantity*e.purchase_unit_price)::numeric into v_total
    from public.logistics_equipment_purchases e where e.id=v_source_id;
  else raise exception 'Sumber pembayaran tidak valid.'; end if;

  select coalesce(sum(p.amount),0) into v_other from public.supplier_payments p
  where p.source_type=v_source_type and p.source_id=v_source_id and p.id<>p_id;
  if p_amount>greatest(0,v_total-v_other)+0.0001 then raise exception 'Nominal melebihi sisa hutang Rp %.',greatest(0,v_total-v_other); end if;

  update public.supplier_payments
  set paid_on=p_paid_on,amount=p_amount,method=p_method,
      reference=nullif(trim(coalesce(p_reference,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_rhpp_real_v1(p_id uuid, p_received_on date, p_amount numeric, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;
  if coalesce(p_amount,0)<0 then raise exception 'Nominal RHPP Real tidak valid.'; end if;
  if p_received_on is null then raise exception 'Tanggal RHPP Real wajib.'; end if;

  perform set_config('bms.allow_rhpp_real_correction','1',true);

  update public.rhpp_real
  set received_on=p_received_on,
      amount=p_amount,
      reference=nullif(trim(coalesce(p_reference,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;

  if not found then raise exception 'RHPP Real tidak ditemukan.'; end if;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_correct_abk_salary_v1(p_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_salary public.abk_cycle_salaries%rowtype;
  v_remaining numeric;
  v_balance numeric;
  v_take numeric;
  v_adv record;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  select * into v_salary from public.abk_cycle_salaries where id=p_id for update;
  if v_salary.id is null then raise exception 'Transaksi gaji tidak ditemukan.'; end if;
  if p_gross_salary is null or p_gross_salary<0 then raise exception 'Gaji bruto tidak valid.'; end if;
  if p_advance_deduction is null or p_advance_deduction<0 or p_advance_deduction>p_gross_salary then
    raise exception 'Potongan kasbon tidak valid.';
  end if;
  if p_paid_on is null then raise exception 'Tanggal bayar wajib.'; end if;

  -- Remove only the automatic deductions generated by this unique ABK/cycle salary.
  delete from public.advance_payments ap
  where ap.method='POTONG_GAJI'
    and ap.paid_on=v_salary.paid_on
    and ap.notes='Potongan otomatis dari gaji siklus'
    and ap.advance_id in (
      select a.id from public.advances a
      where a.employee_id=v_salary.abk_id
        and a.contract_assignment_id=v_salary.contract_assignment_id
    );

  select coalesce(sum(a.amount-coalesce(p.paid,0)),0)
  into v_balance
  from public.advances a
  left join (
    select advance_id,sum(amount) paid
    from public.advance_payments
    group by advance_id
  ) p on p.advance_id=a.id
  where a.employee_id=v_salary.abk_id
    and a.contract_assignment_id=v_salary.contract_assignment_id;

  if p_advance_deduction>v_balance then
    raise exception 'Potongan kasbon melebihi saldo kasbon. Saldo Rp %.',v_balance;
  end if;

  update public.abk_cycle_salaries
  set gross_salary=p_gross_salary,
      advance_deduction=p_advance_deduction,
      net_paid=p_gross_salary-p_advance_deduction,
      paid_on=p_paid_on,
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_id;

  update public.bop
  set incurred_on=p_paid_on,
      amount=p_gross_salary,
      notes='Gaji bruto ABK per siklus'
  where source_type='ABK_SALARY' and source_id=p_id;

  v_remaining:=p_advance_deduction;
  for v_adv in
    select a.id,a.amount-coalesce(p.paid,0) as balance
    from public.advances a
    left join (
      select advance_id,sum(amount) paid
      from public.advance_payments
      group by advance_id
    ) p on p.advance_id=a.id
    where a.employee_id=v_salary.abk_id
      and a.contract_assignment_id=v_salary.contract_assignment_id
      and a.amount-coalesce(p.paid,0)>0
    order by a.advanced_on,a.created_at,a.id
  loop
    exit when v_remaining<=0;
    v_take:=least(v_remaining,v_adv.balance);
    insert into public.advance_payments(advance_id,paid_on,amount,method,reference,notes)
    values(v_adv.id,p_paid_on,v_take,'POTONG_GAJI',null,'Potongan otomatis dari gaji siklus');
    v_remaining:=v_remaining-v_take;
  end loop;

  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_abk_salary_v1(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_salary public.abk_cycle_salaries%rowtype;
  v_old jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then raise exception 'Hanya ADMIN yang boleh menghapus transaksi gaji.'; end if;

  select * into v_salary from public.abk_cycle_salaries where id=p_id for update;
  if v_salary.id is null then raise exception 'Transaksi gaji tidak ditemukan.'; end if;
  v_old:=to_jsonb(v_salary);

  delete from public.advance_payments ap
  where ap.method='POTONG_GAJI'
    and ap.paid_on=v_salary.paid_on
    and ap.notes='Potongan otomatis dari gaji siklus'
    and ap.advance_id in (
      select a.id from public.advances a
      where a.employee_id=v_salary.abk_id
        and a.contract_assignment_id=v_salary.contract_assignment_id
    );

  delete from public.bop
  where source_type='ABK_SALARY' and source_id=p_id;

  delete from public.abk_cycle_salaries where id=p_id;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','abk_cycle_salaries',p_id::text,v_old,null);

  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_expedition_trip_bop_v1(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old jsonb;
  v_count int;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then raise exception 'Hanya ADMIN yang boleh menghapus BOP Expedisi.'; end if;

  select jsonb_agg(to_jsonb(b)) into v_old
  from public.finance_expedition_bop b
  where b.trip_id=p_trip_id and b.reference='AUTO_TRIP';

  if v_old is null then raise exception 'BOP trip tidak ditemukan.'; end if;

  delete from public.finance_expedition_bop
  where trip_id=p_trip_id and reference='AUTO_TRIP';
  get diagnostics v_count=row_count;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','finance_expedition_bop',p_trip_id::text,v_old,null);

  return v_count>0;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_expedition_trip_v1(p_trip_id uuid, p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric DEFAULT 0, p_deduction numeric DEFAULT 0, p_notes text DEFAULT NULL::text, p_destinations jsonb DEFAULT '[]'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_line jsonb;
  v_no integer:=0;
  v_destination_id uuid;
  v_destination_name text;
  v_cargo text;
  v_qty numeric;
  v_unit text;
  v_total_qty numeric:=0;
  v_first_destination text;
  v_legacy_cargo text;
  v_invoice_id uuid;
  v_other_total numeric;
  v_paid numeric;
  v_new_total numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK'))
  then raise exception 'Akses ditolak.'; end if;
  if not exists(select 1 from public.finance_expedition_trips t where t.id=p_trip_id) then raise exception 'Trip tidak ditemukan.'; end if;
  if p_trip_date is null then raise exception 'Tanggal trip wajib.'; end if;
  if nullif(trim(p_driver),'') is null or nullif(trim(p_vehicle),'') is null or nullif(trim(p_zone),'') is null then raise exception 'Sopir, kendaraan, dan rute wajib.'; end if;
  if p_trip_price is null or p_trip_price<0 or coalesce(p_additional,0)<0 or coalesce(p_deduction,0)<0 then raise exception 'Nilai trip tidak valid.'; end if;
  if p_destinations is null or jsonb_typeof(p_destinations)<>'array' or jsonb_array_length(p_destinations)=0 then raise exception 'Minimal satu tujuan wajib.'; end if;

  for v_line in select value from jsonb_array_elements(p_destinations) loop
    v_no:=v_no+1;
    v_destination_id:=nullif(v_line->>'destination_id','')::uuid;
    v_destination_name:=nullif(trim(v_line->>'destination_name'),'');
    v_cargo:=nullif(trim(v_line->>'cargo'),'');
    v_qty:=nullif(v_line->>'qty','')::numeric;
    v_unit:=nullif(trim(v_line->>'unit'),'');
    if v_destination_name is null then raise exception 'Tujuan baris % wajib.',v_no; end if;
    if v_qty is not null and v_qty<0 then raise exception 'Qty baris % tidak valid.',v_no; end if;
    if v_no=1 then v_first_destination:=v_destination_name; end if;
    v_total_qty:=v_total_qty+coalesce(v_qty,0);
    v_legacy_cargo:=concat_ws(' • ',v_legacy_cargo,
      trim(concat(coalesce(v_destination_name,''),' - ',coalesce(v_cargo,''),
        case when v_qty is not null then ' '||trim(to_char(v_qty,'FM999999990.##')) else '' end,
        case when v_unit is not null then ' '||v_unit else '' end)));
  end loop;

  v_new_total:=p_trip_price+coalesce(p_additional,0)-coalesce(p_deduction,0);
  select ii.invoice_id into v_invoice_id from public.finance_expedition_invoice_items ii where ii.trip_id=p_trip_id limit 1;
  if v_invoice_id is not null then
    select coalesce(sum(t.trip_price+t.additional-t.deduction),0)
      into v_other_total
    from public.finance_expedition_invoice_items ii
    join public.finance_expedition_trips t on t.id=ii.trip_id
    where ii.invoice_id=v_invoice_id and ii.trip_id<>p_trip_id;
    select coalesce(sum(p.amount),0) into v_paid from public.finance_expedition_payments p where p.invoice_id=v_invoice_id;
    if v_other_total+v_new_total < v_paid-0.0001 then
      raise exception 'Koreksi trip membuat total invoice lebih kecil dari pembayaran yang sudah diterima Rp %.',v_paid;
    end if;
  end if;

  update public.finance_expedition_trips
  set trip_date=p_trip_date,mts_sj=nullif(trim(p_mts_sj),''),rr=nullif(trim(p_rr),''),
      driver=trim(p_driver),vehicle=trim(p_vehicle),zone=trim(p_zone),
      destination=v_first_destination,cargo=v_legacy_cargo,total_qty=v_total_qty,
      trip_price=p_trip_price,additional=coalesce(p_additional,0),deduction=coalesce(p_deduction,0),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_trip_id;

  delete from public.finance_expedition_trip_destinations where trip_id=p_trip_id;
  v_no:=0;
  for v_line in select value from jsonb_array_elements(p_destinations) loop
    v_no:=v_no+1;
    insert into public.finance_expedition_trip_destinations(
      trip_id,line_no,destination_id,destination_name,cargo,qty,unit,notes,created_by
    ) values(
      p_trip_id,v_no,nullif(v_line->>'destination_id','')::uuid,trim(v_line->>'destination_name'),
      nullif(trim(v_line->>'cargo'),''),nullif(v_line->>'qty','')::numeric,
      nullif(trim(v_line->>'unit'),''),nullif(trim(v_line->>'notes'),''),auth.uid()
    );
  end loop;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_expedition_trip_v1(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old jsonb;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN')
  then raise exception 'Hanya ADMIN yang boleh menghapus trip.'; end if;
  if exists(select 1 from public.finance_expedition_invoice_items ii where ii.trip_id=p_trip_id)
  then raise exception 'Trip sudah masuk invoice. Hapus/koreksi invoice terlebih dahulu.'; end if;
  select to_jsonb(t) into v_old from public.finance_expedition_trips t where t.id=p_trip_id;
  if v_old is null then raise exception 'Trip tidak ditemukan.'; end if;

  delete from public.finance_expedition_bop where trip_id=p_trip_id;
  delete from public.finance_expedition_trip_destinations where trip_id=p_trip_id;
  delete from public.finance_expedition_trips where id=p_trip_id;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','finance_expedition_trips',p_trip_id::text,v_old,null);
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_correct_expedition_invoice_v1(p_invoice_id uuid, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_paid numeric; v_total numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK'))
  then raise exception 'Akses ditolak.'; end if;
  if not exists(select 1 from public.finance_expedition_invoices i where i.id=p_invoice_id)
  then raise exception 'Invoice tidak ditemukan.'; end if;
  if p_invoice_date is null then raise exception 'Tanggal invoice wajib.'; end if;
  if nullif(trim(p_customer_name),'') is null then raise exception 'Pelanggan wajib.'; end if;
  if p_trip_ids is null or cardinality(p_trip_ids)=0 then raise exception 'Minimal satu trip wajib.'; end if;

  if exists(
    select 1 from unnest(p_trip_ids) x(id)
    left join public.finance_expedition_trips t on t.id=x.id
    where t.id is null
  ) then raise exception 'Ada trip yang tidak ditemukan.'; end if;

  if exists(
    select 1 from public.finance_expedition_invoice_items ii
    where ii.trip_id=any(p_trip_ids) and ii.invoice_id<>p_invoice_id
  ) then raise exception 'Ada trip yang sudah masuk invoice lain.'; end if;

  select coalesce(sum(t.trip_price+t.additional-t.deduction),0) into v_total
  from public.finance_expedition_trips t where t.id=any(p_trip_ids);
  select coalesce(sum(p.amount),0) into v_paid from public.finance_expedition_payments p where p.invoice_id=p_invoice_id;
  if v_total < v_paid-0.0001 then raise exception 'Total invoice baru lebih kecil dari pembayaran yang sudah diterima Rp %.',v_paid; end if;

  update public.finance_expedition_invoices
  set invoice_date=p_invoice_date,due_date=p_due_date,customer_name=trim(p_customer_name),
      customer_address=nullif(trim(coalesce(p_customer_address,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),'')
  where id=p_invoice_id;

  delete from public.finance_expedition_invoice_items where invoice_id=p_invoice_id;
  insert into public.finance_expedition_invoice_items(invoice_id,trip_id)
  select p_invoice_id,x from unnest(p_trip_ids) x;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_expedition_invoice_v1(p_invoice_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old jsonb;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN')
  then raise exception 'Hanya ADMIN yang boleh menghapus invoice.'; end if;
  if exists(select 1 from public.finance_expedition_payments p where p.invoice_id=p_invoice_id)
  then raise exception 'Invoice sudah memiliki pembayaran. Hapus pembayaran terlebih dahulu.'; end if;
  select to_jsonb(i) into v_old from public.finance_expedition_invoices i where i.id=p_invoice_id;
  if v_old is null then raise exception 'Invoice tidak ditemukan.'; end if;
  delete from public.finance_expedition_invoice_items where invoice_id=p_invoice_id;
  delete from public.finance_expedition_invoices where id=p_invoice_id;
  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','finance_expedition_invoices',p_invoice_id::text,v_old,null);
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.logistics_correct_mitra_split_return_v1(p_retained_feed_id uuid, p_return_date date, p_physical_quantity numeric, p_accepted_quantity numeric, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lot public.logistics_mitra_retained_feed%rowtype;
  v_return_item public.logistics_return_items%rowtype;
  v_retained numeric;
  v_balance numeric;
  v_kg numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK'))
  then raise exception 'Akses ditolak.'; end if;

  select * into v_lot from public.logistics_mitra_retained_feed where id=p_retained_feed_id for update;
  if v_lot.id is null then raise exception 'Transaksi retur sebagian tidak ditemukan.'; end if;
  select * into v_return_item from public.logistics_return_items where id=v_lot.return_item_id for update;
  if v_return_item.id is null then raise exception 'Detail retur tidak ditemukan.'; end if;

  if p_return_date is null then raise exception 'Tanggal retur wajib.'; end if;
  if coalesce(p_physical_quantity,0)<=0 or coalesce(p_accepted_quantity,0)<0 or p_accepted_quantity>=p_physical_quantity
  then raise exception 'Jumlah fisik harus lebih besar dari jumlah diterima inti.'; end if;

  v_retained:=p_physical_quantity-p_accepted_quantity;
  select i.kg_per_unit into v_kg from public.items i where i.id=v_lot.item_id;

  select v_retained + coalesce(sum(case when m.direction='OUT' then m.quantity else -m.quantity end),0)
  into v_balance
  from public.logistics_company_feed_movements m
  where m.retained_feed_id=v_lot.id;

  if v_balance < -0.0001 then
    raise exception 'Sisa stok baru tidak cukup untuk pemindahan yang sudah tercatat. Saldo akan menjadi %.',v_balance;
  end if;

  update public.logistics_returns
  set return_date=p_return_date,
      reference=nullif(trim(coalesce(p_reference,'')),''),
      notes=nullif(trim(coalesce(p_notes,'')),''),
      updated_at=now()
  where id=v_lot.return_id;

  update public.logistics_return_items
  set quantity=p_accepted_quantity,
      quantity_kg=case when v_kg is null then null else p_accepted_quantity*v_kg end
  where id=v_lot.return_item_id;

  update public.logistics_mitra_retained_feed
  set quantity=v_retained
  where id=v_lot.id;

  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.logistics_correct_company_feed_movement_v1(p_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_move public.logistics_company_feed_movements%rowtype;
  v_lot public.logistics_mitra_retained_feed%rowtype;
  v_balance numeric;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK'))
  then raise exception 'Akses ditolak.'; end if;
  select * into v_move from public.logistics_company_feed_movements where id=p_id for update;
  if v_move.id is null then raise exception 'Pemindahan stok tidak ditemukan.'; end if;
  select * into v_lot from public.logistics_mitra_retained_feed where id=v_move.retained_feed_id for update;
  if v_lot.id is null then raise exception 'Stok asal tidak ditemukan.'; end if;

  if p_direction not in ('IN','OUT') then raise exception 'Arah pemindahan tidak valid.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah harus lebih dari nol.'; end if;
  if p_transferred_on is null then raise exception 'Tanggal wajib.'; end if;
  if not exists(select 1 from public.logistics_contract_assignments a where a.id=p_contract_assignment_id and a.active)
  then raise exception 'Kandang/siklus tujuan tidak aktif.'; end if;

  select v_lot.quantity + coalesce(sum(case when m.direction='OUT' then m.quantity else -m.quantity end),0)
  into v_balance
  from public.logistics_company_feed_movements m
  where m.retained_feed_id=v_lot.id and m.id<>p_id;

  v_balance:=v_balance + case when p_direction='OUT' then p_quantity else -p_quantity end;
  if v_balance < -0.0001 then raise exception 'Koreksi membuat saldo stok BMS negatif.'; end if;

  update public.logistics_company_feed_movements
  set contract_assignment_id=p_contract_assignment_id,
      direction=p_direction,
      quantity=p_quantity,
      transferred_on=p_transferred_on,
      reference=nullif(trim(coalesce(p_reference,'')),'')
  where id=p_id;

  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_company_feed_movement_v1(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_move public.logistics_company_feed_movements%rowtype;
  v_lot public.logistics_mitra_retained_feed%rowtype;
  v_balance numeric;
  v_old jsonb;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN')
  then raise exception 'Hanya ADMIN yang boleh menghapus pemindahan stok.'; end if;
  select * into v_move from public.logistics_company_feed_movements where id=p_id for update;
  if v_move.id is null then raise exception 'Pemindahan stok tidak ditemukan.'; end if;
  select * into v_lot from public.logistics_mitra_retained_feed where id=v_move.retained_feed_id for update;
  v_old:=to_jsonb(v_move);

  select v_lot.quantity + coalesce(sum(case when m.direction='OUT' then m.quantity else -m.quantity end),0)
  into v_balance
  from public.logistics_company_feed_movements m
  where m.retained_feed_id=v_lot.id and m.id<>p_id;

  if v_balance < -0.0001 then
    raise exception 'Pemindahan ini tidak dapat dihapus karena stok berikutnya bergantung pada transaksi ini.';
  end if;

  delete from public.logistics_company_feed_movements where id=p_id;
  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','logistics_company_feed_movements',p_id::text,v_old,null);
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_mitra_split_return_v1(p_retained_feed_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lot public.logistics_mitra_retained_feed%rowtype;
  v_return jsonb;
  v_item jsonb;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN')
  then raise exception 'Hanya ADMIN yang boleh menghapus retur sebagian.'; end if;

  select * into v_lot from public.logistics_mitra_retained_feed where id=p_retained_feed_id for update;
  if v_lot.id is null then raise exception 'Retur sebagian tidak ditemukan.'; end if;

  if exists(select 1 from public.logistics_company_feed_movements m where m.retained_feed_id=v_lot.id)
  then raise exception 'Retur tidak dapat dihapus karena stok BMS sudah memiliki riwayat pemindahan. Hapus pemindahan terkait terlebih dahulu.'; end if;

  select to_jsonb(r) into v_return from public.logistics_returns r where r.id=v_lot.return_id;
  select to_jsonb(i) into v_item from public.logistics_return_items i where i.id=v_lot.return_item_id;

  delete from public.logistics_mitra_retained_feed where id=v_lot.id;
  delete from public.logistics_return_items where id=v_lot.return_item_id;
  if not exists(select 1 from public.logistics_return_items i where i.return_id=v_lot.return_id) then
    delete from public.logistics_returns where id=v_lot.return_id;
  end if;

  insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),'DELETE_ADMIN','logistics_mitra_retained_feed',p_retained_feed_id::text,
    jsonb_build_object('retained_feed',to_jsonb(v_lot),'return',v_return,'return_item',v_item),null);
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_event_type text, p_tab_key text DEFAULT NULL::text, p_device_type text DEFAULT NULL::text, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.user_activity_logs(actor,event_type,tab_key,device_type,detail)
  values (
    auth.uid(),
    upper(left(coalesce(nullif(trim(p_event_type),''),'ACTIVITY'),50)),
    nullif(left(trim(coalesce(p_tab_key,'')),100),''),
    nullif(left(trim(coalesce(p_device_type,'')),30),''),
    coalesce(p_detail,'{}'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.production_feed_stock_as_of(p_contract_assignment_id uuid, p_as_of_date date)
 RETURNS TABLE(item_id uuid, code text, name text, unit text, kg_per_unit numeric, sent_units numeric, external_units numeric, returned_units numeric, used_units numeric, remaining_units numeric, remaining_kg numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active;

  if (v_role IS NULL OR v_role not in ('ADMIN'::public.bms_role,'OWNER'::public.bms_role,'PPL'::public.bms_role)) then
    raise exception 'Akses ditolak.';
  end if;

  if not exists (
    select 1
    from public.logistics_contract_assignments a
    where a.id=p_contract_assignment_id
      and (
        v_role in ('ADMIN'::public.bms_role,'OWNER'::public.bms_role)
        or (v_role='PPL'::public.bms_role and a.ppl_id=auth.uid())
      )
  ) then
    raise exception 'Kontrak tidak ditemukan atau tidak dapat diakses.';
  end if;

  return query
  with feed as (
    select i.id item_id,i.code,i.name,i.unit,coalesce(i.kg_per_unit,0) kg_per_unit
    from public.items i
    where i.active=true and i.category='PAKAN'
  ),
  sent as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_shipments s
    join public.logistics_shipment_items li on li.shipment_id=s.id
    where s.contract_assignment_id=p_contract_assignment_id
      and s.shipment_date<=p_as_of_date
    group by li.item_id
  ),
  ext as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_external_shipments s
    join public.logistics_external_shipment_items li on li.external_shipment_id=s.id
    where s.contract_assignment_id=p_contract_assignment_id
      and s.shipment_date<=p_as_of_date
    group by li.item_id
  ),
  ret as (
    select li.item_id,coalesce(sum(li.quantity),0) qty
    from public.logistics_returns r
    join public.logistics_return_items li on li.return_id=r.id
    where r.contract_assignment_id=p_contract_assignment_id
      and r.return_date<=p_as_of_date
    group by li.item_id
  ),
  retained as (
    select l.item_id,coalesce(sum(l.quantity),0) qty
    from public.logistics_mitra_retained_feed l
    join public.logistics_returns r on r.id=l.return_id
    where l.source_assignment_id=p_contract_assignment_id
      and r.return_date<=p_as_of_date
    group by l.item_id
  ),
  company_move as (
    select l.item_id,
           coalesce(sum(case when m.direction='IN' then m.quantity else -m.quantity end),0) qty
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    where m.contract_assignment_id=p_contract_assignment_id
      and m.transferred_on<=p_as_of_date
    group by l.item_id
  ),
  mandiri as (
    select p.item_id,coalesce(sum(a.quantity),0) qty
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_mandiri_purchases p on p.id=a.purchase_id
    join public.logistics_contract_assignments ca
      on ca.id=a.contract_assignment_id and ca.cycle_type='MANDIRI'
    where a.contract_assignment_id=p_contract_assignment_id
      and p.purchase_date<=p_as_of_date
    group by p.item_id
  ),
  used as (
    select r.feed_item_id item_id,coalesce(sum(r.feed_quantity_units),0) qty
    from public.recordings r
    where r.contract_assignment_id=p_contract_assignment_id
      and r.recorded_on<=p_as_of_date
    group by r.feed_item_id
  ),
  adj as (
    select a.item_id,coalesce(sum(a.adjustment_units),0) qty
    from public.production_feed_stock_adjustments a
    where a.contract_assignment_id=p_contract_assignment_id
      and a.adjustment_date<=p_as_of_date
    group by a.item_id
  )
  select
    f.item_id,f.code,f.name,f.unit,f.kg_per_unit,
    coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0),
    coalesce(e.qty,0),
    coalesce(rt.qty,0)+coalesce(rs.qty,0),
    coalesce(u.qty,0),
    greatest(0,
      coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)
      -coalesce(rt.qty,0)-coalesce(rs.qty,0)-coalesce(u.qty,0)+coalesce(a.qty,0)
    ),
    greatest(0,
      coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)
      -coalesce(rt.qty,0)-coalesce(rs.qty,0)-coalesce(u.qty,0)+coalesce(a.qty,0)
    )*f.kg_per_unit
  from feed f
  left join sent s on s.item_id=f.item_id
  left join mandiri m on m.item_id=f.item_id
  left join company_move cm on cm.item_id=f.item_id
  left join retained rs on rs.item_id=f.item_id
  left join ext e on e.item_id=f.item_id
  left join ret rt on rt.item_id=f.item_id
  left join used u on u.item_id=f.item_id
  left join adj a on a.item_id=f.item_id
  where coalesce(s.qty,0)+coalesce(m.qty,0)+coalesce(cm.qty,0)+coalesce(e.qty,0)
        -coalesce(rt.qty,0)-coalesce(rs.qty,0)<>0
  order by f.code;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_finance_bop_period_access(p_assignment_id uuid, p_is_open boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare previous_data jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN') then raise exception 'Hanya ADMIN yang dapat membuka atau mengunci pencatatan BOP.'; end if;
 if p_is_open is null then raise exception 'Status akses BOP wajib dipilih.'; end if;
 perform 1 from public.logistics_contract_assignments a where a.id=p_assignment_id and not a.active for update;
 if not found then raise exception 'Pilih siklus CLOSED. Siklus produksi aktif tidak memerlukan pembukaan BOP.'; end if;
 select to_jsonb(x) into previous_data from public.finance_bop_period_access x where x.contract_assignment_id=p_assignment_id;
 insert into public.finance_bop_period_access(contract_assignment_id,is_open,changed_by)
 values(p_assignment_id,p_is_open,auth.uid())
 on conflict(contract_assignment_id) do update set is_open=excluded.is_open,changed_by=excluded.changed_by,changed_at=now();
 insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data)
 values(auth.uid(),case when p_is_open then 'OPEN_BOP_RECORDING' else 'LOCK_BOP_RECORDING' end,'finance_bop_period_access',p_assignment_id::text,previous_data,jsonb_build_object('is_open',p_is_open,'production_status','CLOSED'));
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_barn_asset_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := 'AST-' || lpad(nextval('public.barn_assets_reference_seq')::text, 4, '0');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_logistics_equipment_purchase_atomic(p_id uuid, p_supplier_id uuid, p_item_id uuid, p_barn_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
         declare
           v_item record;
           v_purchase public.logistics_equipment_purchases%rowtype;
           v_id uuid;
           v_asset_id uuid;
           v_asset_notes text;
         begin
           if not exists (
             select 1 from public.profiles p
             where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')
           ) then raise exception 'Akses ditolak.'; end if;
           if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
           if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah harus lebih dari 0.'; end if;
           if coalesce(p_purchase_unit_price,-1)<0 then raise exception 'Harga beli tidak valid.'; end if;

           select i.id,i.code,i.name,i.category,i.ovk_type,i.unit,i.active
           into v_item from public.items i where i.id=p_item_id;

           if v_item.id is null or not v_item.active then raise exception 'Barang Master Data tidak ditemukan/aktif.'; end if;
           if v_item.category<>'OVK' or coalesce(v_item.ovk_type,'')<>'OVK2' then
             raise exception 'Beli Peralatan hanya menerima barang OVK2 dari Master Data.';
           end if;
           if not exists(select 1 from public.suppliers s where s.id=p_supplier_id and s.active) then
             raise exception 'Supplier tidak ditemukan/aktif.';
           end if;
           if not exists(select 1 from public.barns b where b.id=p_barn_id) then
             raise exception 'Kandang tidak ditemukan.';
           end if;

           if p_id is not null then
             select * into v_purchase from public.logistics_equipment_purchases where id=p_id;
             if v_purchase.id is null then raise exception 'Pembelian peralatan tidak ditemukan.'; end if;
             if exists(select 1 from public.supplier_payments sp where sp.source_type='BELI_PERALATAN' and sp.source_id=p_id) then
               raise exception 'Pembelian sudah memiliki pembayaran dan tidak boleh diubah.';
             end if;
             v_id:=p_id; v_asset_id:=v_purchase.asset_id;
             update public.logistics_equipment_purchases
             set supplier_id=p_supplier_id,item_id=p_item_id,barn_id=p_barn_id,purchase_date=p_purchase_date,
                 quantity=p_quantity,purchase_unit_price=p_purchase_unit_price,
                 reference_number=nullif(trim(coalesce(p_reference_number,'')),''),
                 notes=nullif(trim(coalesce(p_notes,'')),''),
                 updated_at=now()
             where id=v_id;
           else
             insert into public.logistics_equipment_purchases(
               supplier_id,item_id,barn_id,purchase_date,quantity,purchase_unit_price,reference_number,notes,created_by
             ) values (
               p_supplier_id,p_item_id,p_barn_id,p_purchase_date,p_quantity,p_purchase_unit_price,
               nullif(trim(coalesce(p_reference_number,'')),''),
               nullif(trim(coalesce(p_notes,'')),''),
               auth.uid()
             ) returning id into v_id;
           end if;

           v_asset_notes :=
             'Sumber: Beli Peralatan Logistik '||v_id::text||
             ' · Item: '||coalesce(v_item.code,'-')||
             ' · Jumlah: '||p_quantity::text||' '||coalesce(v_item.unit,'')||
             case when nullif(trim(coalesce(p_reference_number,'')),'') is not null then ' · Nota: '||trim(p_reference_number) else '' end||
             case when nullif(trim(coalesce(p_notes,'')),'') is not null then ' · '||trim(p_notes) else '' end;

           if v_asset_id is null then
             insert into public.barn_assets(
               barn_id,name,category,quantity,unit,acquired_on,acquisition_value,condition,status,notes,created_by
             ) values (
               p_barn_id,v_item.name,'PERALATAN',p_quantity,v_item.unit,p_purchase_date,p_quantity*p_purchase_unit_price,
               'BAIK','AKTIF',v_asset_notes,auth.uid()
             ) returning id into v_asset_id;
             update public.logistics_equipment_purchases set asset_id=v_asset_id where id=v_id;
           else
             update public.barn_assets
             set barn_id=p_barn_id,name=v_item.name,category='PERALATAN',
                 quantity=p_quantity,unit=v_item.unit,
                 acquired_on=p_purchase_date,acquisition_value=p_quantity*p_purchase_unit_price,
                 notes=v_asset_notes,updated_at=now()
             where id=v_asset_id;
           end if;

           return v_id;
         end $function$;

CREATE OR REPLACE FUNCTION public.finance_save_direct_purchase_atomic(p_purchase_date date, p_purchase_type text, p_standard_name text, p_description text, p_supplier_id uuid, p_supplier_name text, p_barn_id uuid, p_contract_assignment_id uuid, p_quantity numeric, p_unit text, p_unit_price numeric, p_payment_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_link_id uuid;
  v_total numeric;
  v_name text;
  v_supplier_name text;
  v_assignment record;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
  if p_purchase_type not in ('ASSET','OVK1','OVK2','BOP_UMUM','PERAWATAN','LAINNYA') then
    raise exception 'Jenis pembelian tidak valid.';
  end if;

  v_name:=nullif(trim(coalesce(p_standard_name,'')),'');
  if v_name is null then raise exception 'Nama standar wajib.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah harus lebih dari 0.'; end if;
  if nullif(trim(coalesce(p_unit,'')),'') is null then raise exception 'Satuan wajib.'; end if;
  if coalesce(p_unit_price,-1)<0 then raise exception 'Harga per satuan tidak valid.'; end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;

  if p_purchase_type in ('ASSET','OVK2','PERAWATAN') and p_barn_id is null then
    raise exception 'Kandang wajib untuk jenis ini.';
  end if;

  v_total:=p_quantity*p_unit_price;

  if p_supplier_id is not null then
    select s.name into v_supplier_name
    from public.suppliers s
    where s.id=p_supplier_id and s.active;
    if v_supplier_name is null then raise exception 'Supplier tidak ditemukan/aktif.'; end if;
  else
    v_supplier_name:=nullif(trim(coalesce(p_supplier_name,'')),'');
  end if;

  if p_purchase_type='OVK1' then
    if p_contract_assignment_id is null then raise exception 'Siklus MITRA wajib untuk OVK1.'; end if;
    select a.id,a.barn_id,a.cycle_type into v_assignment
    from public.logistics_contract_assignments a
    where a.id=p_contract_assignment_id;
    if v_assignment.id is null or v_assignment.cycle_type<>'MITRA' then
      raise exception 'Siklus OVK1 harus siklus MITRA.';
    end if;
    if p_barn_id is not null and p_barn_id<>v_assignment.barn_id then
      raise exception 'Kandang dan siklus tidak cocok.';
    end if;
    p_barn_id:=v_assignment.barn_id;
  end if;

  insert into public.finance_direct_purchases(
    purchase_date,purchase_type,standard_name,description,supplier_id,supplier_name,
    barn_id,contract_assignment_id,quantity,unit,unit_price,total_amount,payment_method,
    reference,notes,created_by
  ) values (
    p_purchase_date,p_purchase_type,v_name,nullif(trim(coalesce(p_description,'')),''),
    p_supplier_id,v_supplier_name,p_barn_id,p_contract_assignment_id,p_quantity,upper(trim(p_unit)),
    p_unit_price,v_total,p_payment_method,nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_id;

  if p_purchase_type in ('ASSET','OVK2') then
    insert into public.barn_assets(
      barn_id,name,category,quantity,unit,acquired_on,acquisition_value,
      condition,status,notes,created_by
    ) values (
      p_barn_id,v_name,'PERALATAN',p_quantity,upper(trim(p_unit)),p_purchase_date,v_total,
      'BAIK','AKTIF',
      'Sumber: Beli Aset Keuangan '||v_id::text||
      case when nullif(trim(coalesce(p_description,'')),'') is not null then ' · '||trim(p_description) else '' end||
      case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end,
      auth.uid()
    ) returning id into v_link_id;

    update public.finance_direct_purchases
    set linked_table='barn_assets',linked_id=v_link_id
    where id=v_id;

  elsif p_purchase_type='PERAWATAN' then
    insert into public.barn_maintenance_costs(
      contract_assignment_id,barn_id,incurred_on,category,amount,reference,notes,created_by,paid_by
    ) values (
      null,p_barn_id,p_purchase_date,'LAINNYA',v_total,
      nullif(trim(coalesce(p_reference,'')),''),
      v_name||
      case when nullif(trim(coalesce(p_description,'')),'') is not null then ' · '||trim(p_description) else '' end||
      ' · '||p_quantity::text||' '||upper(trim(p_unit)),
      auth.uid(),'COMPANY'
    ) returning id into v_link_id;

    update public.finance_direct_purchases
    set linked_table='barn_maintenance_costs',linked_id=v_link_id
    where id=v_id;

  elsif p_purchase_type in ('BOP_UMUM','LAINNYA') then
    insert into public.bop_outside(
      incurred_on,category,amount,reference,notes,created_by,paid_by,expense_scope
    ) values (
      p_purchase_date,
      case when p_purchase_type='BOP_UMUM' then 'PEMBELIAN_LANGSUNG' else 'LAINNYA' end,
      v_total,nullif(trim(coalesce(p_reference,'')),''),
      v_name||
      case when nullif(trim(coalesce(p_description,'')),'') is not null then ' · '||trim(p_description) else '' end||
      ' · '||p_quantity::text||' '||upper(trim(p_unit)),
      auth.uid(),'COMPANY','KANTOR'
    ) returning id into v_link_id;

    update public.finance_direct_purchases
    set linked_table='bop_outside',linked_id=v_link_id
    where id=v_id;

  else
    update public.finance_direct_purchases
    set linked_table='RHPP_OVK1_DIRECT'
    where id=v_id;
  end if;

  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v6()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  with direct_ovk as (
    select d.contract_assignment_id,sum(d.total_amount)::numeric amount
    from public.finance_direct_purchases d
    where d.purchase_type='OVK1' and d.contract_assignment_id is not null
    group by d.contract_assignment_id
  ),
  x as (
    select v.*,coalesce(d.amount,0)::numeric direct_ovk_amount
    from public.finance_rhpp_summary_v5() v
    left join direct_ovk d on d.contract_assignment_id=v.contract_assignment_id
  )
  select
    x.contract_assignment_id,x.barn_id,x.barn_code,x.barn_name,x.contract_number,x.active,
    x.chick_in_birds,x.total_harvest_birds,x.total_harvest_kg,x.avg_bw_kg,x.weighted_age,
    x.implied_depletion_birds,x.recorded_depletion_birds,x.depletion_variance_birds,x.mortality_pct,
    x.main_feed_kg,x.external_feed_kg,x.net_feed_kg,x.fcr_actual,x.fcr_standard,x.diff_fcr,x.ip,
    x.harvest_value,x.main_doc_cost,x.main_feed_cost,x.main_ovk_cost,x.main_other_cost,x.main_return_cost,
    (x.external_sapronak_cost+x.direct_ovk_amount)::numeric,
    (x.sapronak_cost+x.direct_ovk_amount)::numeric,
    x.external_meat_cost,
    (x.total_rhpp_cost+x.direct_ovk_amount)::numeric,
    (x.base_profit-x.direct_ovk_amount)::numeric,
    x.bonus_ip_rate,x.bonus_ip,x.bonus_fc_rate,x.bonus_fc,x.bonus_mortality_rate,x.bonus_mortality,
    (x.farmer_profit-x.direct_ovk_amount)::numeric,
    case when x.chick_in_birds>0 then (x.farmer_profit-x.direct_ovk_amount)/x.chick_in_birds else 0 end::numeric,
    case when x.total_harvest_birds>0 then (x.farmer_profit-x.direct_ovk_amount)/x.total_harvest_birds else 0 end::numeric,
    x.population_balanced,
    (
      not x.active and x.chick_in_birds>0 and x.total_harvest_birds>0 and x.total_harvest_kg>0
      and x.net_feed_kg>0 and (x.sapronak_cost+x.direct_ovk_amount)>0
    )::boolean
  from x
  order by x.active desc,x.barn_code;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v3()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select v.txn_date,v.txn_type,v.source,v.amount,v.barn_id,
         v.contract_assignment_id,v.detail,v.reference
  from public.finance_cashflow_entries_v2() v

  union all

  select h.purchase_date,'KELUAR'::text,'BELI ASET'::text,
         h.total_amount,h.barn_id,null::uuid,
         (coalesce(h.supplier_name,'Pembelian Aset')||
           case when h.asset_location_type='KANTOR' then ' · Kantor' else ' · Kandang' end||
           case when nullif(trim(coalesce(h.notes,'')),'') is not null then ' · '||trim(h.notes) else '' end)::text,
         coalesce(h.reference,'')
  from public.finance_asset_purchase_invoices h

  union all

  select d.purchase_date,'KELUAR'::text,'BELI ASET'::text,
         d.total_amount,d.barn_id,null::uuid,
         (d.standard_name||' · '||d.quantity::text||' '||d.unit||' · '||d.payment_method||
          case when nullif(trim(coalesce(d.description,'')),'') is not null then ' · '||trim(d.description) else '' end||
          case when nullif(trim(coalesce(d.notes,'')),'') is not null then ' · '||trim(d.notes) else '' end)::text,
         coalesce(d.reference,'')
  from public.finance_direct_purchases d
  where d.purchase_type='ASSET' and d.invoice_id is null;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_save_direct_purchase_atomic(p_purchase_date date, p_purchase_type text, p_standard_name text, p_description text, p_supplier_id uuid, p_supplier_name text, p_barn_id uuid, p_contract_assignment_id uuid, p_quantity numeric, p_unit text, p_unit_price numeric, p_payment_method text, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_asset_location_type text DEFAULT 'KANDANG'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_link_id uuid;
  v_total numeric;
  v_name text;
  v_supplier_name text;
  v_location text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
  if p_purchase_type <> 'ASSET' then
    raise exception 'Menu Beli Aset hanya untuk aset non-Logistik.';
  end if;

  v_name:=nullif(trim(coalesce(p_standard_name,'')),'');
  if v_name is null then raise exception 'Nama standar wajib.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah harus lebih dari 0.'; end if;
  if nullif(trim(coalesce(p_unit,'')),'') is null then raise exception 'Satuan wajib.'; end if;
  if coalesce(p_unit_price,-1)<0 then raise exception 'Harga per satuan tidak valid.'; end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;

  v_location:=upper(trim(coalesce(p_asset_location_type,'KANDANG')));
  if v_location not in ('KANDANG','KANTOR') then raise exception 'Lokasi aset tidak valid.'; end if;
  if v_location='KANDANG' and p_barn_id is null then raise exception 'Pilih kandang tujuan aset.'; end if;
  if v_location='KANTOR' then p_barn_id:=null; end if;

  v_total:=p_quantity*p_unit_price;
  v_supplier_name:=nullif(trim(coalesce(p_supplier_name,'')),'');

  insert into public.finance_direct_purchases(
    purchase_date,purchase_type,standard_name,description,supplier_id,supplier_name,
    barn_id,contract_assignment_id,quantity,unit,unit_price,total_amount,payment_method,
    reference,notes,asset_location_type,created_by
  ) values (
    p_purchase_date,'ASSET',v_name,nullif(trim(coalesce(p_description,'')),''),
    null,v_supplier_name,p_barn_id,null,p_quantity,upper(trim(p_unit)),
    p_unit_price,v_total,p_payment_method,nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),v_location,auth.uid()
  ) returning id into v_id;

  insert into public.barn_assets(
    barn_id,location_type,name,category,quantity,unit,acquired_on,acquisition_value,
    condition,status,notes,created_by
  ) values (
    p_barn_id,v_location,v_name,'PERALATAN',p_quantity,upper(trim(p_unit)),p_purchase_date,v_total,
    'BAIK','AKTIF',
    'Sumber: Beli Aset Keuangan '||v_id::text||
    case when v_location='KANTOR' then ' · Lokasi: KANTOR' else ' · Lokasi: KANDANG' end||
    case when nullif(trim(coalesce(p_description,'')),'') is not null then ' · '||trim(p_description) else '' end||
    case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end,
    auth.uid()
  ) returning id into v_link_id;

  update public.finance_direct_purchases
  set linked_table='barn_assets',linked_id=v_link_id
  where id=v_id;

  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_save_asset_invoice_atomic(p_purchase_date date, p_supplier_name text, p_asset_location_type text, p_barn_id uuid, p_payment_method text, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invoice_id uuid;
  v_item jsonb;
  v_name text;
  v_unit text;
  v_qty numeric;
  v_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_location text;
  v_detail_id uuid;
  v_asset_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;

  v_location:=upper(trim(coalesce(p_asset_location_type,'')));
  if v_location not in ('KANDANG','KANTOR') then raise exception 'Lokasi aset tidak valid.'; end if;
  if v_location='KANDANG' and p_barn_id is null then raise exception 'Pilih kandang tujuan aset.'; end if;
  if v_location='KANTOR' then p_barn_id:=null; end if;

  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Minimal satu barang wajib diisi.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_name:=nullif(trim(coalesce(v_item->>'standard_name','')),'');
    v_unit:=upper(nullif(trim(coalesce(v_item->>'unit','')),''));
    begin
      v_qty:=(v_item->>'quantity')::numeric;
      v_price:=(v_item->>'unit_price')::numeric;
    exception when others then
      raise exception 'Jumlah atau harga barang tidak valid.';
    end;

    if v_name is null then raise exception 'Nama standar barang wajib.'; end if;
    if v_unit is null then raise exception 'Satuan barang wajib.'; end if;
    if coalesce(v_qty,0)<=0 then raise exception 'Jumlah barang harus lebih dari 0.'; end if;
    if coalesce(v_price,-1)<0 then raise exception 'Harga barang tidak valid.'; end if;

    v_total:=v_total+(v_qty*v_price);
  end loop;

  insert into public.finance_asset_purchase_invoices(
    purchase_date,supplier_name,asset_location_type,barn_id,payment_method,
    reference,notes,total_amount,created_by
  ) values (
    p_purchase_date,nullif(trim(coalesce(p_supplier_name,'')),''),
    v_location,p_barn_id,p_payment_method,
    nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),
    v_total,auth.uid()
  ) returning id into v_invoice_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_name:=trim(v_item->>'standard_name');
    v_unit:=upper(trim(v_item->>'unit'));
    v_qty:=(v_item->>'quantity')::numeric;
    v_price:=(v_item->>'unit_price')::numeric;
    v_line_total:=v_qty*v_price;

    insert into public.finance_direct_purchases(
      invoice_id,purchase_date,purchase_type,standard_name,description,
      supplier_id,supplier_name,barn_id,contract_assignment_id,
      quantity,unit,unit_price,total_amount,payment_method,
      reference,notes,asset_location_type,created_by
    ) values (
      v_invoice_id,p_purchase_date,'ASSET',v_name,
      nullif(trim(coalesce(v_item->>'description','')),''),
      null,nullif(trim(coalesce(p_supplier_name,'')),''),
      p_barn_id,null,
      v_qty,v_unit,v_price,v_line_total,p_payment_method,
      nullif(trim(coalesce(p_reference,'')),''),
      nullif(trim(coalesce(p_notes,'')),''),
      v_location,auth.uid()
    ) returning id into v_detail_id;

    insert into public.barn_assets(
      barn_id,location_type,name,category,quantity,unit,
      acquired_on,acquisition_value,condition,status,notes,created_by
    ) values (
      p_barn_id,v_location,v_name,'PERALATAN',v_qty,v_unit,
      p_purchase_date,v_line_total,'BAIK','AKTIF',
      'Sumber: Beli Aset Keuangan Nota '||v_invoice_id::text||
      ' · Detail '||v_detail_id::text||
      case when v_location='KANTOR' then ' · Lokasi: KANTOR' else ' · Lokasi: KANDANG' end||
      case when nullif(trim(coalesce(v_item->>'description','')),'') is not null
        then ' · '||trim(v_item->>'description') else '' end||
      case when nullif(trim(coalesce(p_reference,'')),'') is not null
        then ' · Ref: '||trim(p_reference) else '' end,
      auth.uid()
    ) returning id into v_asset_id;

    update public.finance_direct_purchases
    set linked_table='barn_assets',linked_id=v_asset_id
    where id=v_detail_id;
  end loop;

  return v_invoice_id;
end $function$;

CREATE OR REPLACE FUNCTION public.finance_save_stock_invoice_atomic(p_purchase_date date, p_supplier_name text, p_payment_method text, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invoice_id uuid;
  v_item jsonb;
  v_name text;
  v_unit text;
  v_kind text;
  v_qty numeric;
  v_price numeric;
  v_total numeric := 0;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')
  ) then raise exception 'Akses ditolak.'; end if;

  if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Minimal satu barang stok wajib diisi.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_name:=nullif(trim(coalesce(v_item->>'standard_name','')),'');
    v_unit:=upper(nullif(trim(coalesce(v_item->>'unit','')),''));
    v_kind:=upper(trim(coalesce(v_item->>'stock_kind','ASET')));
    begin
      v_qty:=(v_item->>'quantity')::numeric;
      v_price:=(v_item->>'unit_price')::numeric;
    exception when others then
      raise exception 'Jumlah atau harga barang stok tidak valid.';
    end;
    if v_name is null then raise exception 'Nama barang stok wajib.'; end if;
    if v_unit is null then raise exception 'Satuan barang stok wajib.'; end if;
    if v_kind not in ('ASET','HABIS_PAKAI') then raise exception 'Jenis stok tidak valid.'; end if;
    if coalesce(v_qty,0)<=0 then raise exception 'Jumlah stok harus lebih dari 0.'; end if;
    if coalesce(v_price,-1)<0 then raise exception 'Harga barang stok tidak valid.'; end if;
    v_total:=v_total+(v_qty*v_price);
  end loop;

  insert into public.finance_stock_purchase_invoices(
    purchase_date,supplier_name,payment_method,reference,notes,total_amount,created_by
  ) values (
    p_purchase_date,nullif(trim(coalesce(p_supplier_name,'')),''),
    p_payment_method,nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),v_total,auth.uid()
  ) returning id into v_invoice_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_name:=trim(v_item->>'standard_name');
    v_unit:=upper(trim(v_item->>'unit'));
    v_kind:=upper(trim(coalesce(v_item->>'stock_kind','ASET')));
    v_qty:=(v_item->>'quantity')::numeric;
    v_price:=(v_item->>'unit_price')::numeric;

    insert into public.warehouse_stock_items(
      invoice_id,standard_name,description,stock_kind,quantity,unit,unit_price,total_amount,created_by
    ) values (
      v_invoice_id,v_name,
      nullif(trim(coalesce(v_item->>'description','')),''),
      v_kind,v_qty,v_unit,v_price,v_qty*v_price,auth.uid()
    );
  end loop;

  return v_invoice_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.logistics_send_warehouse_stock_atomic(p_stock_item_id uuid, p_shipment_date date, p_destination_type text, p_barn_id uuid, p_quantity numeric, p_make_asset boolean DEFAULT false, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item public.warehouse_stock_items%rowtype;
  v_sent numeric;
  v_remaining numeric;
  v_destination text;
  v_shipment_id uuid;
  v_asset_id uuid;
  v_make_asset boolean;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')
  ) then raise exception 'Akses ditolak.'; end if;

  if p_shipment_date is null then raise exception 'Tanggal kirim wajib.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah kirim harus lebih dari 0.'; end if;

  v_destination:=upper(trim(coalesce(p_destination_type,'')));
  if v_destination not in ('KANDANG','KANTOR') then raise exception 'Tujuan tidak valid.'; end if;
  if v_destination='KANDANG' then
    if p_barn_id is null or not exists(select 1 from public.barns b where b.id=p_barn_id) then
      raise exception 'Pilih kandang tujuan.';
    end if;
  else
    p_barn_id:=null;
  end if;

  select * into v_item
  from public.warehouse_stock_items
  where id=p_stock_item_id
  for update;

  if v_item.id is null then raise exception 'Barang stok tidak ditemukan.'; end if;

  select coalesce(sum(s.quantity),0) into v_sent
  from public.warehouse_stock_shipments s
  where s.stock_item_id=v_item.id;

  v_remaining:=v_item.quantity-v_sent;
  if p_quantity>v_remaining then
    raise exception 'Stok tidak cukup. Sisa % %.',v_remaining,v_item.unit;
  end if;

  v_make_asset := (v_item.stock_kind='ASET');

  if v_make_asset then
    insert into public.barn_assets(
      barn_id,location_type,name,category,quantity,unit,
      acquired_on,acquisition_value,condition,status,notes,created_by
    ) values (
      p_barn_id,v_destination,v_item.standard_name,'PERALATAN',p_quantity,v_item.unit,
      p_shipment_date,p_quantity*v_item.unit_price,'BAIK','AKTIF',
      'Sumber: Kirim Stok Gudang · Nota '||v_item.invoice_id::text||
      ' · Item '||v_item.id::text||
      case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end||
      case when nullif(trim(coalesce(p_notes,'')),'') is not null then ' · '||trim(p_notes) else '' end,
      auth.uid()
    ) returning id into v_asset_id;
  end if;

  insert into public.warehouse_stock_shipments(
    stock_item_id,shipment_date,destination_type,barn_id,quantity,
    make_asset,asset_id,reference,notes,created_by
  ) values (
    v_item.id,p_shipment_date,v_destination,p_barn_id,p_quantity,
    v_make_asset,v_asset_id,
    nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  ) returning id into v_shipment_id;

  return v_shipment_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v4()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select v.txn_date,v.txn_type,v.source,v.amount,v.barn_id,
         v.contract_assignment_id,v.detail,v.reference
  from public.finance_cashflow_entries_v3() v

  union all

  select h.purchase_date,'KELUAR'::text,'BELI UNTUK STOK'::text,
         h.total_amount,null::uuid,null::uuid,
         (coalesce(h.supplier_name,'Pembelian Stok Gudang')||
          case when nullif(trim(coalesce(h.notes,'')),'') is not null then ' · '||trim(h.notes) else '' end)::text,
         coalesce(h.reference,'')
  from public.finance_stock_purchase_invoices h;
end
$function$;

CREATE OR REPLACE FUNCTION private.admin_only_transaction_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Hanya ADMIN yang boleh menghapus transaksi.';
  end if;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_correct_closed_abk_population_v1(p_link_id uuid, p_initial_birds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_assignment_id uuid;
begin
  if not exists(
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator.';
  end if;

  if p_initial_birds is null or p_initial_birds <= 0 then
    raise exception 'Populasi awal harus lebih dari 0.';
  end if;

  select l.contract_assignment_id into v_assignment_id
  from public.logistics_contract_assignment_abks l
  where l.id=p_link_id;

  if v_assignment_id is null then
    raise exception 'Data ABK tidak ditemukan.';
  end if;

  if not exists(
    select 1 from public.logistics_contract_assignments a
    where a.id=v_assignment_id and a.active=false
  ) then
    raise exception 'Koreksi khusus ini hanya untuk siklus CLOSED.';
  end if;

  perform set_config('bms.allow_closed_abk_population_correction','1',true);

  update public.logistics_contract_assignment_abks
  set initial_birds=p_initial_birds
  where id=p_link_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_reopen_cycle_v1(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.logistics_contract_assignments%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat membuka siklus.';
  end if;

  select * into v
  from public.logistics_contract_assignments
  where id=p_contract_assignment_id
  for update;

  if v.id is null then raise exception 'Siklus tidak ditemukan.'; end if;
  if v.active then raise exception 'Siklus sudah terbuka/aktif.'; end if;

  if exists (
    select 1
    from public.logistics_contract_assignments a
    where a.barn_id=v.barn_id
      and a.active=true
      and a.id<>v.id
  ) then
    raise exception 'Kandang ini masih memiliki siklus aktif lain. Tutup siklus aktif tersebut terlebih dahulu.';
  end if;

  if coalesce(v.cycle_type,'MITRA')='MANDIRI' then
    delete from public.production_mandiri_final
    where contract_assignment_id=v.id;
  else
    delete from public.rhpp_system_final
    where contract_assignment_id=v.id;
  end if;

  perform set_config('bms.allow_production_reopen','1',true);

  update public.logistics_contract_assignments
  set active=true
  where id=v.id;

  return v.id;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_reclose_cycle_v1(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_type text;
  v_active boolean;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat menutup siklus.';
  end if;

  select coalesce(cycle_type,'MITRA'),active
  into v_type,v_active
  from public.logistics_contract_assignments
  where id=p_contract_assignment_id;

  if v_type is null then raise exception 'Siklus tidak ditemukan.'; end if;
  if not v_active then raise exception 'Siklus sudah CLOSED.'; end if;

  if v_type='MANDIRI' then
    perform public.admin_close_mandiri_cycle_atomic(p_contract_assignment_id);
  else
    perform public.admin_close_production_atomic(p_contract_assignment_id);
  end if;

  return p_contract_assignment_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.save_chick_in_with_abks_v1(p_chick_id uuid, p_assignment_id uuid, p_arrived_on date, p_received integer, p_doa integer, p_avg_weight numeric, p_delivery_number text, p_abks jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role public.bms_role;
  v_assignment public.logistics_contract_assignments%rowtype;
  v_chick_id uuid;
  v_net integer;
  v_sum integer;
  v_count integer;
  v_unique_count integer;
  v_abk jsonb;
  v_abk_id uuid;
  v_initial integer;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=auth.uid() and p.active=true;

  if (v_role IS NULL OR v_role not in ('ADMIN','PPL')) then
    raise exception 'Akses ditolak. Hanya ADMIN/PPL.';
  end if;

  select * into v_assignment
  from public.logistics_contract_assignments a
  where a.id=p_assignment_id
  for update;

  if v_assignment.id is null then
    raise exception 'Siklus tidak ditemukan.';
  end if;

  if not v_assignment.active then
    raise exception 'Siklus CLOSED. Buka kembali melalui Administrator sebelum koreksi.';
  end if;

  if v_role='PPL' and v_assignment.ppl_id is distinct from auth.uid() then
    raise exception 'PPL hanya dapat mengisi kandang yang menjadi tanggung jawabnya.';
  end if;

  if p_received is null or p_received<=0 then
    raise exception 'DOC In harus lebih dari 0.';
  end if;
  if p_doa is null or p_doa<0 or p_doa>=p_received then
    raise exception 'DOC Mati Box tidak valid.';
  end if;
  if p_avg_weight is not null and p_avg_weight<=0 then
    raise exception 'Bobot rata-rata DOC harus lebih dari 0.';
  end if;
  if p_arrived_on<v_assignment.start_date then
    raise exception 'Tanggal Chick-In tidak boleh sebelum tanggal mulai siklus.';
  end if;

  if p_abks is null or jsonb_typeof(p_abks)<>'array' or jsonb_array_length(p_abks)=0 then
    raise exception 'Pilih minimal 1 ABK dan isi Populasi Awal.';
  end if;

  v_net:=p_received-p_doa;

  select count(*),
         count(distinct nullif(x->>'abk_id','')),
         coalesce(sum((x->>'initial_birds')::integer),0)
  into v_count,v_unique_count,v_sum
  from jsonb_array_elements(p_abks) x;

  if v_count<>v_unique_count then
    raise exception 'ABK tidak boleh dipilih dua kali.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_abks) x
    where nullif(x->>'abk_id','') is null
       or coalesce((x->>'initial_birds')::integer,0)<=0
  ) then
    raise exception 'Semua ABK dan Populasi Awal wajib diisi.';
  end if;

  if v_sum<>v_net then
    raise exception 'Total Populasi Awal ABK (%) harus sama dengan Populasi Awal Bersih (%)',v_sum,v_net;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_abks) x
    left join public.employees e on e.id=(x->>'abk_id')::uuid
    where e.id is null or e.kind<>'ABK' or e.active<>true
  ) then
    raise exception 'ABK tidak ditemukan atau sudah tidak aktif.';
  end if;

  if p_chick_id is not null then
    select c.id into v_chick_id
    from public.chick_ins c
    where c.id=p_chick_id
      and c.contract_assignment_id=p_assignment_id
    for update;
    if v_chick_id is null then
      raise exception 'Data Chick-In tidak ditemukan pada siklus ini.';
    end if;
  else
    if exists (
      select 1 from public.chick_ins c
      where c.contract_assignment_id=p_assignment_id
    ) then
      raise exception 'Siklus ini sudah memiliki Chick-In. Gunakan Edit.';
    end if;
  end if;

  -- Jangan izinkan melepas ABK yang sudah punya data Liga/Pakan.
  if exists (
    select 1
    from public.logistics_contract_assignment_abks l
    where l.contract_assignment_id=p_assignment_id
      and not exists (
        select 1 from jsonb_array_elements(p_abks) x
        where (x->>'abk_id')::uuid=l.abk_id
      )
      and (
        l.basics_locked_at is not null
        or exists (
          select 1 from public.production_abk_results r
          where r.contract_assignment_id=p_assignment_id and r.abk_id=l.abk_id
        )
      )
  ) then
    raise exception 'ABK yang sudah memiliki data Liga/Pakan tidak dapat dilepas. Koreksi ABK tersebut, jangan hapus.';
  end if;

  if v_chick_id is null then
    insert into public.chick_ins(
      contract_assignment_id,barn_id,arrived_on,
      received,shipped,doa,strain,avg_weight,delivery_number
    ) values (
      p_assignment_id,v_assignment.barn_id,p_arrived_on,
      p_received,p_received,p_doa,null,p_avg_weight,nullif(trim(coalesce(p_delivery_number,'')),'')
    )
    returning id into v_chick_id;
  else
    update public.chick_ins
    set arrived_on=p_arrived_on,
        barn_id=v_assignment.barn_id,
        received=p_received,
        shipped=p_received,
        doa=p_doa,
        strain=null,
        avg_weight=p_avg_weight,
        delivery_number=nullif(trim(coalesce(p_delivery_number,'')),'')
    where id=v_chick_id;
  end if;

  -- Hapus hanya link ABK yang belum dipakai downstream dan tidak lagi dipilih.
  delete from public.logistics_contract_assignment_abks l
  where l.contract_assignment_id=p_assignment_id
    and l.basics_locked_at is null
    and not exists (
      select 1 from public.production_abk_results r
      where r.contract_assignment_id=p_assignment_id and r.abk_id=l.abk_id
    )
    and not exists (
      select 1 from jsonb_array_elements(p_abks) x
      where (x->>'abk_id')::uuid=l.abk_id
    );

  for v_abk in select * from jsonb_array_elements(p_abks)
  loop
    v_abk_id:=(v_abk->>'abk_id')::uuid;
    v_initial:=(v_abk->>'initial_birds')::integer;

    insert into public.logistics_contract_assignment_abks(
      contract_assignment_id,abk_id,initial_birds
    ) values (
      p_assignment_id,v_abk_id,v_initial
    )
    on conflict (contract_assignment_id,abk_id)
    do update set initial_birds=excluded.initial_birds;
  end loop;

  return v_chick_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.guard_frozen_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if old.frozen_at is not null then
      raise exception 'Kontrak sudah dikunci dan tidak dapat diubah. Buat kontrak baru untuk revisi.';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.frozen_at is not null then
      raise exception 'Kontrak sudah dikunci dan tidak dapat dihapus.';
    end if;
    return old;
  end if;
  return coalesce(new,old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_frozen_contract_child()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_contract uuid;
  new_contract uuid;
begin
  if tg_op in ('UPDATE','DELETE') then
    old_contract := old.contract_id;
    if exists(select 1 from public.contracts c where c.id=old_contract and c.frozen_at is not null) then
      raise exception 'Kontrak sudah dikunci. Data harga/bonus/performa tidak dapat diubah.';
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    new_contract := new.contract_id;
    if exists(select 1 from public.contracts c where c.id=new_contract and c.frozen_at is not null) then
      raise exception 'Kontrak sudah dikunci. Data harga/bonus/performa tidak dapat ditambah atau diubah.';
    end if;
    return new;
  end if;

  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_original_note_v1(p_note text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  s text := btrim(coalesce(p_note,''));
begin
  if s='' then return null; end if;

  if lower(s) like 'reklasifikasi%' and lower(s) like '%sumber sebelumnya:%' then
    s := regexp_replace(s,'(?is)^.*Sumber\s+sebelumnya\s*:\s*','');
    s := btrim(s, ' .;|-');
    return nullif(s,'');
  end if;

  if lower(s) like 'sumber excel lama kategori%' then
    return null;
  end if;

  s := regexp_replace(s,
    '(?is)^\s*(?:Sumber\s+DATA\s+PETERNAKAN[^:]*:|Import\s+Excel\s+Operasional[^:]*:|Import\s+Excel[^:]*:|Import\s+Buku\s+Besar\s+BMS\s+Express\s*:|Buku\s+Besar\s+PT\s+BMS\s+baris[^:]*:|Upah\s+kerja\s+selama\s+periode\s*;\s*rincian\s+DATA\s+PETERNAKAN\s*:)[[:space:]]*',
    '');

  s := regexp_replace(s,
    '(?is)^\s*Alokasi\s+sumber\s+BB-[^ ]+\s+total\s+Rp[0-9.]+\.\s*',
    '');

  s := regexp_replace(s,'(?is)^\s*Migrasi\s+data\s+lama\.\s*','');
  s := regexp_replace(s,'(?is)\s*\|\s*(?:Sesuai\s+arahan|Koreksi|Reklasifikasi)\s*:?.*$','');
  s := regexp_replace(s,'(?is)\s*[·|]\s*sumber\s+Excel\s+lama.*$','');

  s := regexp_replace(s,
    '(?is)\.\s*(?:BMS\s+(?:GROUP|[1-4])(?:\s|\.|$)|Tujuan(?:\s+ditetapkan)?\s*:|Source\s|Qty\s|Nota\s+real\s|Aset\s|Barang\s|Seluruh\s+BB-|Alat/peralatan\s|Kode\s+sumber\s).*$',
    '');

  s := regexp_replace(s,
    '(?is)\s*(?:[.;]\s*)?(?:Sumber\s+(?:Excel\s+)?Data\s+Lama|Sumber\s+Data\s+Lama|Alokasi\s+upah|Ongkos\s+angkut\s+GROUP|GROUP\s+dibagi\s+rata|Nama\s+kandang\s+pada\s+uraian|Tujuan\s+[A-Za-z]|Perawatan\s+kandang\s+tanpa\s+siklus|Tanpa\s+siklus(?:\s+produksi)?|Keterangan\s+asli\s+BMS|tanggal\s+asli|Kode\s+sumber|sesuai\s+(?:arahan|instruksi|konfirmasi)|Reklasifikasi).*$',
    '');

  s := btrim(s, ' .;|-');
  return nullif(s,'');
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v5()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select r.received_on,'MASUK'::text,'RHPP REAL'::text,r.amount,r.barn_id,r.contract_assignment_id,
         public.finance_original_note_v1(r.notes),coalesce(r.reference,'')
  from public.rhpp_real r

  union all
  select b.incurred_on,'KELUAR','BOP PRODUKSI',b.amount,b.barn_id,b.contract_assignment_id,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop b
  where coalesce(b.source_type,'')<>'ABK_SALARY' and b.paid_by='COMPANY'

  union all
  select b.incurred_on,'KELUAR','BOP UMUM',b.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop_outside b
  where b.paid_by='COMPANY'

  union all
  select a.advanced_on,'KELUAR','KASBON',a.amount,a.barn_id,a.contract_assignment_id,
         public.finance_original_note_v1(a.description),coalesce(a.reference,'')
  from public.advances a
  where not a.is_historical_balance

  union all
  select p.paid_on,'MASUK','CICILAN KASBON',p.amount,a.barn_id,a.contract_assignment_id,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.advance_payments p
  join public.advances a on a.id=p.advance_id
  where p.method<>'POTONG_GAJI'

  union all
  select s.paid_on,'KELUAR','GAJI ABK',s.net_paid,s.barn_id,s.contract_assignment_id,
         public.finance_original_note_v1(s.notes),coalesce(s.reference,'')
  from public.abk_cycle_salaries s
  where s.net_paid>0

  union all
  select p.paid_on,'KELUAR','BAYAR HUTANG SUPPLIER',
         p.amount,p.barn_id,p.contract_assignment_id,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.supplier_payments p

  union all
  select r.received_on,'MASUK','PENJUALAN MANDIRI',
         r.amount,h.barn_id,h.contract_assignment_id,
         public.finance_original_note_v1(r.notes),coalesce(r.reference,'')
  from public.finance_mandiri_sales_receipts r
  join public.marketing_contract_harvests h on h.id=r.harvest_id
  join public.logistics_contract_assignments a on a.id=h.contract_assignment_id
  where a.cycle_type='MANDIRI'

  union all
  select p.paid_on,'KELUAR','BAYAR SUPPLIER MANDIRI',
         p.amount,
         case when alloc.cnt=1 then alloc.barn_id else null::uuid end,
         case when alloc.cnt=1 then alloc.contract_assignment_id else null::uuid end,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.finance_mandiri_supplier_payments p
  join public.logistics_mandiri_purchases mp on mp.id=p.purchase_id
  left join lateral (
    select count(*) cnt,
           max(a.contract_assignment_id::text)::uuid contract_assignment_id,
           max(ca.barn_id::text)::uuid barn_id
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id
    where a.purchase_id=mp.id
  ) alloc on true

  union all
  select p.paid_on,'MASUK','PENDAPATAN EXPEDISI',p.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.finance_expedition_payments p

  union all
  select b.incurred_on,'KELUAR','BOP EXPEDISI',b.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.finance_expedition_bop b

  union all
  select m.incurred_on,'KELUAR','PERAWATAN KANDANG',
         m.amount,m.barn_id,m.contract_assignment_id,
         public.finance_original_note_v1(m.notes),coalesce(m.reference,'')
  from public.barn_maintenance_costs m
  where m.paid_by='COMPANY'

  union all
  select m.incurred_on,'KELUAR','PERAWATAN EXPEDISI',
         m.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(m.notes),coalesce(m.reference,'')
  from public.finance_expedition_maintenance m

  union all
  select b.incurred_on,'KELUAR','GAJI ABK',
         b.amount,b.barn_id,b.contract_assignment_id,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop b
  where b.source_type='ABK_SALARY'
    and b.source_id is null and b.paid_by='COMPANY'

  union all
  select h.purchase_date,'KELUAR','BELI ASET',
         h.total_amount,h.barn_id,null::uuid,
         public.finance_original_note_v1(h.notes),coalesce(h.reference,'')
  from public.finance_asset_purchase_invoices h

  union all
  select d.purchase_date,'KELUAR','BELI ASET',
         d.total_amount,d.barn_id,null::uuid,
         public.finance_original_note_v1(coalesce(nullif(d.notes,''),d.description)),
         coalesce(d.reference,'')
  from public.finance_direct_purchases d
  where d.purchase_type='ASSET' and d.invoice_id is null

  union all
  select h.purchase_date,'KELUAR','BELI UNTUK STOK',
         h.total_amount,null::uuid,null::uuid,
         public.finance_original_note_v1(h.notes),coalesce(h.reference,'')
  from public.finance_stock_purchase_invoices h;
end
$function$;

CREATE OR REPLACE FUNCTION public.finance_cashflow_entries_v6()
 RETURNS TABLE(txn_date date, txn_type text, source text, amount numeric, barn_id uuid, contract_assignment_id uuid, detail text, reference text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active
      and p.role in ('ADMIN','KEUANGAN','OWNER')
  ) then raise exception 'Akses ditolak.'; end if;

  return query
  select r.received_on,'MASUK'::text,'RHPP REAL'::text,r.amount,r.barn_id,r.contract_assignment_id,
         public.finance_original_note_v1(r.notes),coalesce(r.reference,'')
  from public.rhpp_real r

  union all
  select b.incurred_on,'KELUAR','BOP PRODUKSI',b.amount,b.barn_id,b.contract_assignment_id,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop b
  where coalesce(b.source_type,'')<>'ABK_SALARY'

  union all
  select b.incurred_on,'KELUAR','BOP UMUM',b.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop_outside b

  union all
  select a.advanced_on,'KELUAR','KASBON',a.amount,a.barn_id,a.contract_assignment_id,
         public.finance_original_note_v1(a.description),coalesce(a.reference,'')
  from public.advances a
  where not a.is_historical_balance

  union all
  select p.paid_on,'MASUK','CICILAN KASBON',p.amount,a.barn_id,a.contract_assignment_id,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.advance_payments p
  join public.advances a on a.id=p.advance_id
  where p.method<>'POTONG_GAJI'

  union all
  select s.paid_on,'KELUAR','GAJI ABK',s.net_paid,s.barn_id,s.contract_assignment_id,
         public.finance_original_note_v1(s.notes),coalesce(s.reference,'')
  from public.abk_cycle_salaries s
  where s.net_paid>0

  union all
  select p.paid_on,'KELUAR','BAYAR HUTANG SUPPLIER',
         p.amount,p.barn_id,p.contract_assignment_id,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.supplier_payments p

  union all
  select r.received_on,'MASUK','PENJUALAN MANDIRI',
         r.amount,h.barn_id,h.contract_assignment_id,
         public.finance_original_note_v1(r.notes),coalesce(r.reference,'')
  from public.finance_mandiri_sales_receipts r
  join public.marketing_contract_harvests h on h.id=r.harvest_id
  join public.logistics_contract_assignments a on a.id=h.contract_assignment_id
  where a.cycle_type='MANDIRI'

  union all
  select p.paid_on,'KELUAR','BAYAR SUPPLIER MANDIRI',
         p.amount,
         case when alloc.cnt=1 then alloc.barn_id else null::uuid end,
         case when alloc.cnt=1 then alloc.contract_assignment_id else null::uuid end,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.finance_mandiri_supplier_payments p
  join public.logistics_mandiri_purchases mp on mp.id=p.purchase_id
  left join lateral (
    select count(*) cnt,
           max(a.contract_assignment_id::text)::uuid contract_assignment_id,
           max(ca.barn_id::text)::uuid barn_id
    from public.logistics_mandiri_purchase_allocations a
    join public.logistics_contract_assignments ca on ca.id=a.contract_assignment_id
    where a.purchase_id=mp.id
  ) alloc on true

  union all
  select p.paid_on,'MASUK','PENDAPATAN EXPEDISI',p.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(p.notes),coalesce(p.reference,'')
  from public.finance_expedition_payments p

  union all
  select b.incurred_on,'KELUAR','BOP EXPEDISI',b.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.finance_expedition_bop b

  union all
  select m.incurred_on,'KELUAR','PERAWATAN KANDANG',
         m.amount,m.barn_id,m.contract_assignment_id,
         public.finance_original_note_v1(m.notes),coalesce(m.reference,'')
  from public.barn_maintenance_costs m

  union all
  select m.incurred_on,'KELUAR','PERAWATAN EXPEDISI',
         m.amount,null::uuid,null::uuid,
         public.finance_original_note_v1(m.notes),coalesce(m.reference,'')
  from public.finance_expedition_maintenance m

  union all
  select b.incurred_on,'KELUAR','GAJI ABK',
         b.amount,b.barn_id,b.contract_assignment_id,
         public.finance_original_note_v1(b.notes),coalesce(b.reference,'')
  from public.bop b
  where b.source_type='ABK_SALARY'
    and b.source_id is null

  union all
  select h.purchase_date,'KELUAR','BELI ASET',
         h.total_amount,h.barn_id,null::uuid,
         public.finance_original_note_v1(h.notes),coalesce(h.reference,'')
  from public.finance_asset_purchase_invoices h

  union all
  select d.purchase_date,'KELUAR','BELI ASET',
         d.total_amount,d.barn_id,null::uuid,
         coalesce(public.finance_original_note_v1(d.notes), nullif(btrim(d.description),''), nullif(btrim(d.standard_name),'')),
         coalesce(d.reference,'')
  from public.finance_direct_purchases d
  where d.purchase_type='ASSET' and d.invoice_id is null

  union all
  select h.purchase_date,'KELUAR','BELI UNTUK STOK',
         h.total_amount,null::uuid,null::uuid,
         public.finance_original_note_v1(h.notes),coalesce(h.reference,'')
  from public.finance_stock_purchase_invoices h;
end
$function$;

CREATE OR REPLACE FUNCTION public.admin_cleanup_closed_bop_legacy_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_notes integer:=0;
  v_migration integer:=0;
  v_zero integer:=0;
begin
  if auth.uid() is null or not exists(
    select 1 from public.profiles p
    where p.user_id=auth.uid() and p.active and p.role='ADMIN'
  ) then
    raise exception 'Hanya ADMIN yang dapat membersihkan BOP lama.';
  end if;

  update public.bop b
  set notes=public.finance_original_note_v1(b.notes)
  from public.logistics_contract_assignments a
  join public.finance_bop_period_access f on f.contract_assignment_id=a.id and f.is_open
  where b.contract_assignment_id=a.id
    and not a.active
    and b.notes is distinct from public.finance_original_note_v1(b.notes);
  get diagnostics v_notes = row_count;

  update public.bop b
  set source_type=null
  from public.logistics_contract_assignments a
  join public.finance_bop_period_access f on f.contract_assignment_id=a.id and f.is_open
  where b.contract_assignment_id=a.id
    and not a.active
    and b.reference='BB-197'
    and b.source_type='MIGRATION';
  get diagnostics v_migration = row_count;

  delete from public.bop b
  using public.logistics_contract_assignments a, public.finance_bop_period_access f
  where b.contract_assignment_id=a.id
    and f.contract_assignment_id=a.id
    and f.is_open
    and not a.active
    and b.reference in ('IMP-BOP-RANDEGAN-S2-044','IMP-BOP-CICURUG-S2-033')
    and b.amount=0;
  get diagnostics v_zero = row_count;

  insert into public.audit_events(actor,action,table_name,record_id,new_data)
  values(
    auth.uid(),
    'CLEANUP_CLOSED_BOP_LEGACY',
    'bop',
    'BULK',
    jsonb_build_object('notes_cleaned',v_notes,'migration_cleared',v_migration,'zero_rows_deleted',v_zero)
  );

  return jsonb_build_object(
    'notes_cleaned',v_notes,
    'migration_cleared',v_migration,
    'zero_rows_deleted',v_zero
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.get_abk_leaderboard_data_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role public.bms_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.user_id=(select auth.uid()) and p.active=true;

  if v_role is null then
    raise exception 'Akses ditolak.';
  end if;

  return jsonb_build_object(
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'barn_id',a.barn_id,'master_contract_id',a.master_contract_id,
        'start_date',a.start_date,'active',a.active,'created_at',a.created_at,'cycle_type',a.cycle_type
      ) order by a.created_at)
      from public.logistics_contract_assignments a
    ),'[]'::jsonb),
    'barns', coalesce((
      select jsonb_agg(jsonb_build_object('id',b.id,'code',b.code,'name',b.name,'active',b.active) order by b.code)
      from public.barns b
    ),'[]'::jsonb),
    'chicks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'contract_assignment_id',c.contract_assignment_id,'arrived_on',c.arrived_on,
        'received',c.received,'doa',c.doa
      ))
      from public.chick_ins c
    ),'[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'contract_assignment_id',l.contract_assignment_id,'abk_id',l.abk_id,
        'initial_birds',l.initial_birds,'feed_pre_bags',l.feed_pre_bags,
        'feed_starter_bags',l.feed_starter_bags,'feed_finisher_bags',l.feed_finisher_bags,
        'basics_locked_at',l.basics_locked_at
      ))
      from public.logistics_contract_assignment_abks l
    ),'[]'::jsonb),
    'abks', coalesce((
      select jsonb_agg(jsonb_build_object('id',e.id,'code',e.code,'name',e.name,'active',e.active) order by e.code)
      from public.employees e
      where e.kind='ABK'
    ),'[]'::jsonb),
    'results', coalesce((
      select jsonb_agg(to_jsonb(r))
      from public.production_abk_results r
    ),'[]'::jsonb),
    'sizes', coalesce((
      select jsonb_agg(to_jsonb(s))
      from public.production_abk_result_sizes s
    ),'[]'::jsonb),
    'contracts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'doc_price',c.doc_price,'pre_starter_price',c.pre_starter_price,
        'starter_price',c.starter_price,'finisher_price',c.finisher_price
      ))
      from public.contracts c
    ),'[]'::jsonb),
    'bonuses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'contract_id',b.contract_id,'metric',b.metric,'min_value',b.min_value,
        'max_value',b.max_value,'rupiah_per_kg',b.rupiah_per_kg
      ))
      from public.contract_bonuses b
    ),'[]'::jsonb),
    'live_prices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'contract_id',p.contract_id,'min_weight_kg',p.min_weight_kg,
        'max_weight_kg',p.max_weight_kg,'price_per_kg',p.price_per_kg
      ))
      from public.contract_live_prices p
    ),'[]'::jsonb),
    'finals', coalesce((
      select jsonb_agg(jsonb_build_object('contract_assignment_id',f.contract_assignment_id))
      from public.production_cycle_final_unified f
    ),'[]'::jsonb),
    'league_setting', coalesce((
      select to_jsonb(s) from public.abk_league_settings s where s.id=true
    ),'{}'::jsonb)
  );
end
$function$;

CREATE OR REPLACE FUNCTION public.get_abk_leaderboard_data_v1()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.get_abk_leaderboard_data_v1();
$function$;

CREATE OR REPLACE FUNCTION private.guard_audit_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN RAISE EXCEPTION 'Audit transaksi tidak dapat diubah atau dihapus.' USING ERRCODE='42501'; END $function$;

CREATE OR REPLACE FUNCTION private.guard_payment_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_total numeric; v_other numeric; v_date date; v_source uuid;
  v_supplier uuid; v_assignment uuid; v_barn uuid; v_type text;
BEGIN
  IF TG_TABLE_NAME='supplier_payments' THEN
    IF TG_OP='UPDATE' AND (new.source_type,new.source_id) IS DISTINCT FROM (old.source_type,old.source_id) THEN
      RAISE EXCEPTION 'Sumber pembayaran tidak dapat dipindahkan.';
    END IF;
    v_source:=CASE WHEN TG_OP='DELETE' THEN old.source_id ELSE new.source_id END;
    v_type:=CASE WHEN TG_OP='DELETE' THEN old.source_type ELSE new.source_type END;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_type||':'||v_source::text,0));
    IF v_type='SAPRONAK_LUAR' THEN
      SELECT supplier_id,contract_assignment_id,barn_id,shipment_date INTO v_supplier,v_assignment,v_barn,v_date
      FROM public.logistics_external_shipments WHERE id=v_source FOR UPDATE;
      SELECT coalesce(sum(quantity*purchase_unit_price),0) INTO v_total FROM public.logistics_external_shipment_items WHERE external_shipment_id=v_source;
    ELSIF v_type='TAMBAH_DAGING' THEN
      SELECT supplier_id,contract_assignment_id,barn_id,purchase_date,weight_kg*purchase_price_per_kg
      INTO v_supplier,v_assignment,v_barn,v_date,v_total FROM public.marketing_external_meat_purchases WHERE id=v_source FOR UPDATE;
    ELSIF v_type='BELI_PERALATAN' THEN
      SELECT supplier_id,barn_id,purchase_date,quantity*purchase_unit_price INTO v_supplier,v_barn,v_date,v_total
      FROM public.logistics_equipment_purchases WHERE id=v_source FOR UPDATE;
    ELSE RAISE EXCEPTION 'Sumber pembayaran tidak valid.'; END IF;
    IF TG_OP='DELETE' THEN RETURN old; END IF;
    IF v_supplier IS NULL OR (new.supplier_id,new.contract_assignment_id,new.barn_id) IS DISTINCT FROM (v_supplier,v_assignment,v_barn) THEN
      RAISE EXCEPTION 'Supplier dan tujuan harus sesuai dokumen sumber.';
    END IF;
    SELECT coalesce(sum(amount),0) INTO v_other FROM public.supplier_payments
    WHERE source_type=v_type AND source_id=v_source AND id IS DISTINCT FROM new.id;
    IF new.paid_on IS NULL OR new.paid_on<v_date THEN RAISE EXCEPTION 'Tanggal pembayaran sebelum dokumen sumber.'; END IF;
  ELSIF TG_TABLE_NAME='finance_mandiri_sales_receipts' THEN
    IF TG_OP='UPDATE' AND new.harvest_id IS DISTINCT FROM old.harvest_id THEN RAISE EXCEPTION 'Sumber penerimaan tidak dapat dipindahkan.'; END IF;
    v_source:=CASE WHEN TG_OP='DELETE' THEN old.harvest_id ELSE new.harvest_id END;
    SELECT total_amount,harvested_on INTO v_total,v_date FROM public.marketing_contract_harvests WHERE id=v_source FOR UPDATE;
    IF TG_OP='DELETE' THEN RETURN old; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.marketing_contract_harvests h JOIN public.logistics_contract_assignments a ON a.id=h.contract_assignment_id WHERE h.id=v_source AND a.cycle_type='MANDIRI') THEN
      RAISE EXCEPTION 'Penjualan Mandiri tidak ditemukan.';
    END IF;
    SELECT coalesce(sum(amount),0) INTO v_other FROM public.finance_mandiri_sales_receipts WHERE harvest_id=v_source AND id IS DISTINCT FROM new.id;
    IF new.received_on IS NULL OR new.received_on<v_date THEN RAISE EXCEPTION 'Tanggal penerimaan sebelum panen.'; END IF;
  ELSIF TG_TABLE_NAME='finance_mandiri_supplier_payments' THEN
    IF TG_OP='UPDATE' AND new.purchase_id IS DISTINCT FROM old.purchase_id THEN RAISE EXCEPTION 'Sumber pembayaran tidak dapat dipindahkan.'; END IF;
    v_source:=CASE WHEN TG_OP='DELETE' THEN old.purchase_id ELSE new.purchase_id END;
    SELECT quantity*purchase_unit_price,purchase_date INTO v_total,v_date FROM public.logistics_mandiri_purchases WHERE id=v_source FOR UPDATE;
    IF TG_OP='DELETE' THEN RETURN old; END IF;
    SELECT coalesce(sum(amount),0) INTO v_other FROM public.finance_mandiri_supplier_payments WHERE purchase_id=v_source AND id IS DISTINCT FROM new.id;
    IF new.paid_on IS NULL OR new.paid_on<v_date THEN RAISE EXCEPTION 'Tanggal pembayaran sebelum pembelian.'; END IF;
  ELSIF TG_TABLE_NAME='advance_payments' THEN
    v_source:=CASE WHEN TG_OP='DELETE' THEN old.advance_id ELSE new.advance_id END;
    IF TG_OP='UPDATE' THEN
      PERFORM 1 FROM public.advances WHERE id IN (old.advance_id,new.advance_id) ORDER BY id FOR UPDATE;
    END IF;
    SELECT amount,advanced_on INTO v_total,v_date FROM public.advances WHERE id=v_source FOR UPDATE;
    IF TG_OP='DELETE' THEN RETURN old; END IF;
    SELECT coalesce(sum(amount),0) INTO v_other FROM public.advance_payments WHERE advance_id=v_source AND id IS DISTINCT FROM new.id;
    IF new.paid_on IS NULL OR new.paid_on<v_date THEN RAISE EXCEPTION 'Tanggal pembayaran sebelum kasbon.'; END IF;
  ELSIF TG_TABLE_NAME='finance_expedition_payments' THEN
    IF TG_OP='UPDATE' AND new.invoice_id IS DISTINCT FROM old.invoice_id THEN RAISE EXCEPTION 'Invoice pembayaran tidak dapat dipindahkan.'; END IF;
    v_source:=CASE WHEN TG_OP='DELETE' THEN old.invoice_id ELSE new.invoice_id END;
    PERFORM pg_advisory_xact_lock(hashtextextended('EXPEDISI-INVOICE:'||v_source::text,0));
    SELECT invoice_date INTO v_date FROM public.finance_expedition_invoices WHERE id=v_source AND status<>'VOID' FOR UPDATE;
    IF TG_OP='DELETE' THEN RETURN old; END IF;
    IF v_date IS NULL THEN RAISE EXCEPTION 'Invoice tidak ditemukan atau VOID.'; END IF;
    SELECT coalesce(sum(t.trip_price+t.additional-t.deduction),0) INTO v_total
    FROM public.finance_expedition_invoice_items i JOIN public.finance_expedition_trips t ON t.id=i.trip_id WHERE i.invoice_id=v_source;
    SELECT coalesce(sum(amount),0) INTO v_other FROM public.finance_expedition_payments WHERE invoice_id=v_source AND id IS DISTINCT FROM new.id;
    IF new.paid_on IS NULL OR new.paid_on<v_date THEN RAISE EXCEPTION 'Tanggal pembayaran sebelum invoice.'; END IF;
  ELSE RAISE EXCEPTION 'Tabel pembayaran tidak didukung.'; END IF;
  IF new.amount IS NULL OR new.amount<=0 OR new.amount IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) THEN
    RAISE EXCEPTION 'Nominal pembayaran harus positif dan valid.';
  END IF;
  IF v_total IS NULL OR v_total<0 OR v_total IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) THEN
    RAISE EXCEPTION 'Nilai dokumen sumber tidak valid.';
  END IF;
  IF v_other+new.amount>v_total+0.0001 THEN RAISE EXCEPTION 'Pembayaran melebihi sisa saldo Rp %.',greatest(0,v_total-v_other); END IF;
  RETURN new;
END $function$;

CREATE OR REPLACE FUNCTION private.audit_transaction_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_old jsonb; v_new jsonb; v_key text; v_operation text:=nullif(current_setting('bms.operation_id',true),'');
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN v_old:=to_jsonb(old); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN v_new:=to_jsonb(new); END IF;
  IF TG_OP='UPDATE' AND v_old=v_new THEN RETURN new; END IF;
  v_key:=coalesce(v_new->>'id',v_old->>'id',v_new->>'user_id',v_old->>'user_id');
  IF v_operation IS NOT NULL THEN
    IF v_new IS NOT NULL THEN v_new:=v_new||jsonb_build_object('_bms_operation_id',v_operation); END IF;
    IF v_old IS NOT NULL THEN v_old:=v_old||jsonb_build_object('_bms_operation_id',v_operation); END IF;
  END IF;
  INSERT INTO public.audit_events(actor,action,table_name,record_id,old_data,new_data)
  VALUES(auth.uid(),'DB_'||TG_OP,TG_TABLE_NAME,v_key,v_old,v_new);
  IF TG_OP='DELETE' THEN RETURN old; END IF;
  RETURN new;
END $function$;

CREATE OR REPLACE FUNCTION public.bms_execute_operation(p_operation_id uuid, p_action text, p_params jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid:=auth.uid(); v_hash text; v_saved private.bms_operation_receipts%rowtype;
  v_function record; v_args text:=''; v_result jsonb; v_name text; v_type text; i integer; v_expr text;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=v_actor AND active) THEN
    RAISE EXCEPTION 'Akses ditolak. Profil aktif diperlukan.' USING ERRCODE='42501';
  END IF;
  IF p_operation_id IS NULL OR p_action IS NULL OR jsonb_typeof(p_params) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Identitas operasi dan parameter tidak valid.' USING ERRCODE='22023';
  END IF;
  v_hash:=encode(extensions.digest(p_action||':'||p_params::text,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('BMS-OP:'||v_actor::text||':'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM private.bms_operation_receipts WHERE actor=v_actor AND operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.request_hash<>v_hash THEN RAISE EXCEPTION 'Identitas operasi sudah digunakan dengan data berbeda.' USING ERRCODE='22023'; END IF;
    RETURN v_saved.result;
  END IF;

  SELECT p.oid,p.proname,p.proargnames,p.proargtypes,p.pronargs,n.nspname
  INTO v_function FROM private.bms_rpc_allowlist a JOIN pg_proc p ON p.oid=a.function_oid::oid JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE a.action=p_action AND n.nspname='public' AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(p_params) k WHERE NOT k=ANY(p.proargnames[1:p.pronargs]))
    AND NOT EXISTS(SELECT 1 FROM generate_series(1,p.pronargs-p.pronargdefaults) ix WHERE NOT p_params ? p.proargnames[ix])
  ORDER BY p.pronargs LIMIT 1;
  IF v_function.oid IS NULL THEN RAISE EXCEPTION 'Operasi tidak diizinkan atau parameter tidak lengkap.' USING ERRCODE='42501'; END IF;

  FOR i IN 1..v_function.pronargs LOOP
    v_name:=v_function.proargnames[i];
    IF NOT p_params ? v_name THEN CONTINUE; END IF;
    v_type:=format_type(v_function.proargtypes[i-1],NULL);
    IF v_type IN ('json','jsonb') THEN
      v_expr:=format('(NULLIF($1->%L,''null''::jsonb))::%s',v_name,v_type);
    ELSIF (SELECT typelem<>0 FROM pg_type WHERE oid=v_function.proargtypes[i-1]) THEN
      v_expr:=format('(CASE WHEN $1->%L=''null''::jsonb THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text($1->%L))::%s END)',v_name,v_name,v_type);
    ELSE v_expr:=format('($1->>%L)::%s',v_name,v_type); END IF;
    v_args:=v_args||CASE WHEN v_args='' THEN '' ELSE ',' END||format('%I => %s',v_name,v_expr);
  END LOOP;
  PERFORM set_config('bms.operation_id',p_operation_id::text,true);
  EXECUTE format('SELECT to_jsonb(f) FROM %I.%I(%s) f',v_function.nspname,v_function.proname,v_args) INTO v_result USING p_params;
  INSERT INTO private.bms_operation_receipts(actor,operation_id,request_hash,action,result)
  VALUES(v_actor,p_operation_id,v_hash,p_action,coalesce(v_result,'null'::jsonb));
  RETURN v_result;
END $function$;

CREATE OR REPLACE FUNCTION private.bms_archive_document()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r record; v_sql text:=''; v_tables jsonb; v_counts jsonb; v_schema text;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname
  LOOP
    v_sql:=v_sql||CASE WHEN v_sql='' THEN '' ELSE ' UNION ALL ' END||format(
      'SELECT %L::text name,coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)),''[]''::jsonb) rows,count(*) n FROM public.%I x',r.relname,r.relname);
  END LOOP;
  EXECUTE 'SELECT jsonb_object_agg(name,rows),jsonb_object_agg(name,n) FROM ('||v_sql||') all_tables' INTO v_tables,v_counts;
  SELECT encode(extensions.digest(coalesce(string_agg(table_name||':'||column_name||':'||udt_name||':'||is_nullable,'|' ORDER BY table_name,ordinal_position),''),'sha256'),'hex') INTO v_schema
  FROM information_schema.columns WHERE table_schema='public';
  RETURN jsonb_build_object('format','BMS_DATA_ARCHIVE','format_version',1,'generated_at',now(),
    'table_count',(SELECT count(*) FROM jsonb_object_keys(v_tables)),'row_counts',v_counts,'schema_fingerprint',v_schema,
    'checksum',encode(extensions.digest(v_tables::text,'sha256'),'hex'),'tables',v_tables);
END $function$;

CREATE OR REPLACE FUNCTION public.bms_export_archive()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND active AND role='ADMIN') THEN
  RAISE EXCEPTION 'Hanya Administrator aktif yang dapat mengekspor seluruh data.' USING ERRCODE='42501';
 END IF;
 RETURN private.bms_archive_document();
END $function$;

CREATE OR REPLACE FUNCTION public.bms_export_recovery_document()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_document jsonb; v_auth jsonb:='{}'::jsonb; v_rows jsonb; v_table text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND active AND role='ADMIN') THEN
    RAISE EXCEPTION 'Hanya Administrator aktif yang dapat membuat backup pemulihan.' USING ERRCODE='42501';
  END IF;
  v_document:=private.bms_archive_document();
  FOREACH v_table IN ARRAY ARRAY['users','identities','mfa_factors'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)),''[]''::jsonb) FROM auth.%I x',v_table) INTO v_rows;
    v_auth:=v_auth||jsonb_build_object(v_table,v_rows);
  END LOOP;
  RETURN v_document||jsonb_build_object('format','BMS_FULL_RECOVERY','recovery_version',1,
    'auth',v_auth,'operation_receipts',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)),'[]'::jsonb) FROM private.bms_operation_receipts x),
    'application_build','2326','auth_checksum',encode(extensions.digest(v_auth::text,'sha256'),'hex'));
END $function$;

CREATE OR REPLACE FUNCTION private.bms_verify_recovery(p_document jsonb, p_target_schema text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r record; v_rows jsonb; v_cols text; v_select text; v_expected bigint; v_actual bigint;
  v_restored bigint:=0; v_auth_count bigint:=0; v_fk text; v_source regclass; v_name text;
BEGIN
  IF p_target_schema !~ '^bms_restore_verify_[a-z0-9_]+$' OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=p_target_schema) THEN
    RAISE EXCEPTION 'Pemulihan uji harus memakai skema baru bms_restore_verify_*.';
  END IF;
  IF p_document->>'format'<>'BMS_FULL_RECOVERY' OR p_document->>'recovery_version'<>'1'
    OR p_document->>'checksum' IS DISTINCT FROM encode(extensions.digest((p_document->'tables')::text,'sha256'),'hex')
    OR p_document->>'auth_checksum' IS DISTINCT FROM encode(extensions.digest((p_document->'auth')::text,'sha256'),'hex') THEN
    RAISE EXCEPTION 'Format atau checksum backup tidak valid.';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_document->'tables'))<>(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r') THEN
    RAISE EXCEPTION 'Cakupan tabel backup berbeda dari schema aplikasi.';
  END IF;
  EXECUTE format('CREATE SCHEMA %I',p_target_schema);
  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC,anon,authenticated',p_target_schema);
  FOR r IN
    SELECT 'public'::text source_schema,key source_name,key target_name,value rows FROM jsonb_each(p_document->'tables')
    UNION ALL SELECT 'auth',key,'auth_'||key,value FROM jsonb_each(p_document->'auth')
    UNION ALL SELECT 'private','bms_operation_receipts','bms_operation_receipts',p_document->'operation_receipts'
  LOOP
    IF r.source_schema='auth' AND r.source_name NOT IN ('users','identities','mfa_factors') THEN RAISE EXCEPTION 'Tabel Auth tidak didukung.'; END IF;
    v_source:=format('%I.%I',r.source_schema,r.source_name)::regclass;
    EXECUTE format('CREATE TABLE %I.%I (LIKE %s INCLUDING ALL)',p_target_schema,r.target_name,v_source);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',p_target_schema,r.target_name);
    EXECUTE format('REVOKE ALL ON %I.%I FROM PUBLIC,anon,authenticated',p_target_schema,r.target_name);
    SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO v_cols FROM pg_attribute WHERE attrelid=v_source AND attnum>0 AND NOT attisdropped AND attgenerated='';
    EXECUTE format('INSERT INTO %I.%I (%s) OVERRIDING SYSTEM VALUE SELECT %s FROM jsonb_populate_recordset(NULL::%I.%I,$1)',p_target_schema,r.target_name,v_cols,v_cols,p_target_schema,r.target_name) USING r.rows;
    v_expected:=jsonb_array_length(r.rows);
    EXECUTE format('SELECT count(*) FROM %I.%I',p_target_schema,r.target_name) INTO v_actual;
    IF v_actual<>v_expected THEN RAISE EXCEPTION 'Jumlah baris tidak sesuai: %',r.target_name; END IF;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)),''[]''::jsonb) FROM %I.%I x',p_target_schema,r.target_name) INTO v_rows;
    IF v_rows<>r.rows THEN RAISE EXCEPTION 'Nilai data tidak sesuai: %',r.target_name; END IF;
    IF r.source_schema='public' THEN v_restored:=v_restored+1; END IF;
    IF r.source_schema='auth' THEN v_auth_count:=v_auth_count+v_actual; END IF;
  END LOOP;
  -- Restore and validate every FK between restored business/account tables.
  FOR r IN SELECT k.conname,c.relname,n.nspname,pg_get_constraintdef(k.oid) definition FROM pg_constraint k
    JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE k.contype='f' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','identities','mfa_factors')))
  LOOP
    v_fk:=replace(replace(replace(r.definition,'auth.users',quote_ident(p_target_schema)||'.auth_users'),'auth.identities',quote_ident(p_target_schema)||'.auth_identities'),'auth.mfa_factors',quote_ident(p_target_schema)||'.auth_mfa_factors');
    v_fk:=replace(v_fk,'REFERENCES public.','REFERENCES '||quote_ident(p_target_schema)||'.');
    v_name:=CASE WHEN r.nspname='auth' THEN 'auth_' ELSE '' END||r.relname;
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',p_target_schema,v_name,r.conname,v_fk);
  END LOOP;
  RETURN jsonb_build_object('passed',true,'public_tables',v_restored,'auth_rows',v_auth_count,'account_values_verified',true,'foreign_keys_verified',true);
END $function$;

CREATE VIEW "public"."cycle_financials" WITH (security_invoker = true) AS  SELECT c.id AS cycle_id,
    c.code,
    c.state,
    r.amount AS rhpp_amount,
    COALESCE(b.total, 0::numeric) AS bop_total,
    r.amount - COALESCE(b.total, 0::numeric) AS profit
   FROM public.cycles c
     LEFT JOIN public.rhpp_real r ON r.cycle_id = c.id
     LEFT JOIN ( SELECT bop.cycle_id,
            sum(bop.amount) AS total
           FROM public.bop
          GROUP BY bop.cycle_id) b ON b.cycle_id = c.id;

CREATE VIEW "public"."advance_balances" WITH (security_invoker = true) AS  SELECT a.id,
    a.employee_id,
    a.advanced_on,
    a.amount,
    COALESCE(p.paid, 0::numeric) AS paid,
    a.amount - COALESCE(p.paid, 0::numeric) AS balance
   FROM public.advances a
     LEFT JOIN ( SELECT advance_payments.advance_id,
            sum(advance_payments.amount) AS paid
           FROM public.advance_payments
          GROUP BY advance_payments.advance_id) p ON p.advance_id = a.id;

CREATE VIEW "public"."contract_readiness" WITH (security_invoker = true) AS  SELECT id AS contract_id,
    cycle_id,
    number,
    doc_price > 0::numeric AND pre_starter_price > 0::numeric AND starter_price > 0::numeric AND finisher_price > 0::numeric AND NULLIF(TRIM(BOTH FROM COALESCE(signed_reference, ''::text)), ''::text) IS NOT NULL AND (ovk_price_basis = 'FIXED'::text AND ovk_price > 0::numeric OR ovk_price_basis = 'DISTRIBUTOR_PLUS_VAT'::text AND ovk_vat_percent IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.contract_live_prices lp
          WHERE lp.contract_id = k.id)) AND (EXISTS ( SELECT 1
           FROM public.performance_standards ps
          WHERE ps.contract_id = k.id)) AS is_complete,
    array_remove(ARRAY[
        CASE
            WHEN doc_price <= 0::numeric THEN 'Harga DOC'::text
            ELSE NULL::text
        END,
        CASE
            WHEN pre_starter_price <= 0::numeric THEN 'Harga Pre Starter'::text
            ELSE NULL::text
        END,
        CASE
            WHEN starter_price <= 0::numeric THEN 'Harga Starter'::text
            ELSE NULL::text
        END,
        CASE
            WHEN finisher_price <= 0::numeric THEN 'Harga Finisher'::text
            ELSE NULL::text
        END,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(signed_reference, ''::text)), ''::text) IS NULL THEN 'Referensi kontrak ditandatangani'::text
            ELSE NULL::text
        END,
        CASE
            WHEN ovk_price_basis = 'FIXED'::text AND ovk_price <= 0::numeric THEN 'Harga OVK'::text
            ELSE NULL::text
        END,
        CASE
            WHEN ovk_price_basis = 'DISTRIBUTOR_PLUS_VAT'::text AND ovk_vat_percent IS NULL THEN 'PPN OVK'::text
            ELSE NULL::text
        END,
        CASE
            WHEN NOT (EXISTS ( SELECT 1
               FROM public.contract_live_prices lp
              WHERE lp.contract_id = k.id)) THEN 'Harga ayam hidup'::text
            ELSE NULL::text
        END,
        CASE
            WHEN NOT (EXISTS ( SELECT 1
               FROM public.performance_standards ps
              WHERE ps.contract_id = k.id)) THEN 'Standar performa'::text
            ELSE NULL::text
        END], NULL::text) AS missing_components
   FROM public.contracts k;

CREATE VIEW "public"."cycle_performance" WITH (security_invoker = true) AS  SELECT c.id AS cycle_id,
    c.code,
    c.initial_population,
    COALESCE(r.dead, 0::bigint) AS mortality,
    COALESCE(r.culled, 0::bigint) AS culling,
    round(COALESCE(r.feed, 0::numeric), 2) AS feed_kg,
    r.last_age,
    round(r.last_weight_kg, 2) AS last_weight_kg,
    COALESCE(h.birds, 0::bigint) AS harvested_birds,
    round(COALESCE(h.weight, 0::numeric), 2) AS harvested_weight_kg,
    c.initial_population - COALESCE(r.dead, 0::bigint) - COALESCE(r.culled, 0::bigint) - COALESCE(h.birds, 0::bigint) AS live_birds,
    round(COALESCE(r.feed, 0::numeric) / NULLIF(h.weight, 0::numeric), 2) AS fcr
   FROM public.cycles c
     LEFT JOIN ( SELECT recordings.cycle_id,
            sum(recordings.mortality) AS dead,
            sum(recordings.culling) AS culled,
            sum(recordings.feed_kg) AS feed,
            max(recordings.age_days) AS last_age,
            (array_agg(recordings.avg_weight_kg ORDER BY recordings.recorded_on DESC) FILTER (WHERE recordings.avg_weight_kg IS NOT NULL))[1] AS last_weight_kg
           FROM public.recordings
          GROUP BY recordings.cycle_id) r ON r.cycle_id = c.id
     LEFT JOIN ( SELECT harvests.cycle_id,
            sum(harvests.birds) AS birds,
            sum(harvests.net_weight_kg) AS weight
           FROM public.harvests
          GROUP BY harvests.cycle_id) h ON h.cycle_id = c.id;

CREATE VIEW "public"."daily_performance" WITH (security_invoker = true) AS  SELECT r.id,
    r.cycle_id,
    r.recorded_on,
    r.age_days,
    r.mortality,
    r.culling,
    round(r.feed_kg, 2) AS feed_kg,
    round(r.avg_weight_kg, 2) AS avg_weight_kg,
    r.sample_count,
    round(r.sample_weight_total_kg, 2) AS sample_weight_total_kg,
    round(r.actual_fcr, 2) AS actual_fcr,
    round(r.ip, 2) AS ip,
    round(r.feed_bags_in, 2) AS feed_bags_in,
    round(r.feed_bags_out, 2) AS feed_bags_out,
    round(r.feed_bags_balance, 2) AS feed_bags_balance,
    round(s.std_body_weight_g, 2) AS std_body_weight_g,
    round(s.std_fcr, 2) AS std_fcr,
    round(s.std_feed_g_per_bird, 2) AS std_feed_g_per_bird,
    round(r.avg_weight_kg * 1000::numeric - s.std_body_weight_g, 2) AS body_weight_gap_g,
    round(r.actual_fcr - s.std_fcr, 2) AS fcr_gap
   FROM public.recordings r
     LEFT JOIN public.contracts k ON k.cycle_id = r.cycle_id
     LEFT JOIN public.performance_standards s ON s.contract_id = k.id AND s.age_days = r.age_days;

CREATE VIEW "public"."harvest_contract_preview" WITH (security_invoker = true) AS  SELECT h.id AS harvest_id,
    h.cycle_id,
    h.harvested_on,
    h.birds,
    round(h.net_weight_kg, 2) AS net_weight_kg,
    round(h.net_weight_kg / NULLIF(h.birds, 0)::numeric, 2) AS avg_weight_kg,
    p.price_per_kg AS contract_price_per_kg,
    round(h.net_weight_kg * p.price_per_kg, 2) AS contract_gross,
    h.price_per_kg AS sale_price_per_kg,
    round(h.net_weight_kg * h.price_per_kg, 2) AS sale_gross
   FROM public.harvests h
     LEFT JOIN public.contracts k ON k.cycle_id = h.cycle_id
     LEFT JOIN public.contract_live_prices p ON p.contract_id = k.id AND (h.net_weight_kg / NULLIF(h.birds, 0)::numeric) >= p.min_weight_kg AND (p.max_weight_kg IS NULL OR (h.net_weight_kg / NULLIF(h.birds, 0)::numeric) < p.max_weight_kg);

CREATE VIEW "public"."ppl_league" WITH (security_invoker = true) AS  SELECT c.ppl_id,
    count(*) AS cycles,
    COALESCE(sum(c.initial_population), 0::bigint) AS population,
    COALESCE(sum(p.mortality + p.culling), 0::numeric) AS depletion,
    round(avg(p.fcr), 2) AS avg_fcr,
    COALESCE(sum(p.harvested_birds), 0::numeric) AS harvested_birds
   FROM public.cycles c
     JOIN public.cycle_performance p ON p.cycle_id = c.id
  WHERE c.ppl_id IS NOT NULL
  GROUP BY c.ppl_id;

CREATE VIEW "public"."abk_league" WITH (security_invoker = true) AS  SELECT c.abk_id,
    count(*) AS cycles,
    COALESCE(sum(c.initial_population), 0::bigint) AS population,
    COALESCE(sum(p.mortality + p.culling), 0::numeric) AS depletion,
    round(avg(p.fcr), 2) AS avg_fcr,
    COALESCE(sum(p.harvested_birds), 0::numeric) AS harvested_birds
   FROM public.cycles c
     JOIN public.cycle_performance p ON p.cycle_id = c.id
  WHERE c.abk_id IS NOT NULL
  GROUP BY c.abk_id;

CREATE VIEW "public"."logistics_rhpp_cost_summary" WITH (security_invoker = true) AS  WITH ship AS (
         SELECT s.contract_assignment_id,
            sum(si.quantity * si.unit_price) AS shipment_total,
            sum(
                CASE
                    WHEN i.category = 'DOC'::text THEN si.quantity * si.unit_price
                    ELSE 0::numeric
                END) AS doc_cost,
            sum(
                CASE
                    WHEN i.category = 'PAKAN'::text THEN si.quantity * si.unit_price
                    ELSE 0::numeric
                END) AS feed_cost,
            sum(
                CASE
                    WHEN i.category = 'OVK'::text THEN si.quantity * si.unit_price
                    ELSE 0::numeric
                END) AS ovk_cost
           FROM public.logistics_shipments s
             JOIN public.logistics_shipment_items si ON si.shipment_id = s.id
             JOIN public.items i ON i.id = si.item_id
          GROUP BY s.contract_assignment_id
        ), ret AS (
         SELECT r.contract_assignment_id,
            sum(ri.quantity * ri.unit_price) AS return_total
           FROM public.logistics_returns r
             JOIN public.logistics_return_items ri ON ri.return_id = r.id
          GROUP BY r.contract_assignment_id
        )
 SELECT a.id AS contract_assignment_id,
    a.barn_id,
    a.master_contract_id,
    a.performance_template_name,
    a.start_date,
    a.active,
    COALESCE(ship.doc_cost, 0::numeric)::numeric(16,2) AS doc_cost,
    COALESCE(ship.feed_cost, 0::numeric)::numeric(16,2) AS feed_cost,
    COALESCE(ship.ovk_cost, 0::numeric)::numeric(16,2) AS ovk_cost,
    COALESCE(ship.shipment_total, 0::numeric)::numeric(16,2) AS shipment_total,
    COALESCE(ret.return_total, 0::numeric)::numeric(16,2) AS return_total,
    (COALESCE(ship.shipment_total, 0::numeric) - COALESCE(ret.return_total, 0::numeric))::numeric(16,2) AS net_sapronak_cost
   FROM public.logistics_contract_assignments a
     LEFT JOIN ship ON ship.contract_assignment_id = a.id
     LEFT JOIN ret ON ret.contract_assignment_id = a.id;

CREATE VIEW "public"."logistics_company_adjustment_summary" WITH (security_invoker = true) AS  WITH external_lines AS (
         SELECT eh.contract_assignment_id,
            i.category,
            i.feed_phase,
            i.kg_per_unit,
            ei.quantity,
            ei.purchase_unit_price,
            c.doc_price,
            c.pre_starter_price,
            c.starter_price,
            c.finisher_price,
            c.ovk_price_basis,
            c.ovk_price,
                CASE
                    WHEN i.category = 'DOC'::text THEN c.doc_price
                    WHEN i.category = 'PAKAN'::text AND i.kg_per_unit IS NOT NULL AND lower(COALESCE(i.feed_phase, ''::text)) ~~ '%pre%'::text THEN c.pre_starter_price * i.kg_per_unit
                    WHEN i.category = 'PAKAN'::text AND i.kg_per_unit IS NOT NULL AND lower(COALESCE(i.feed_phase, ''::text)) ~~ '%starter%'::text THEN c.starter_price * i.kg_per_unit
                    WHEN i.category = 'PAKAN'::text AND i.kg_per_unit IS NOT NULL AND lower(COALESCE(i.feed_phase, ''::text)) ~~ '%fin%'::text THEN c.finisher_price * i.kg_per_unit
                    WHEN i.category = 'OVK'::text AND c.ovk_price_basis = 'FIXED'::text THEN c.ovk_price
                    ELSE NULL::numeric
                END AS contract_unit_price
           FROM public.logistics_external_shipments eh
             JOIN public.logistics_external_shipment_items ei ON ei.external_shipment_id = eh.id
             JOIN public.items i ON i.id = ei.item_id
             JOIN public.logistics_contract_assignments a_1 ON a_1.id = eh.contract_assignment_id
             JOIN public.contracts c ON c.id = a_1.master_contract_id
        ), external_by_assignment AS (
         SELECT external_lines.contract_assignment_id,
            sum(external_lines.quantity * external_lines.purchase_unit_price)::numeric(16,2) AS actual_purchase_total,
            sum(
                CASE
                    WHEN external_lines.contract_unit_price IS NOT NULL THEN external_lines.quantity * external_lines.contract_unit_price
                    ELSE 0::numeric
                END)::numeric(16,2) AS contract_equivalent_total,
            sum(
                CASE
                    WHEN external_lines.contract_unit_price IS NOT NULL THEN external_lines.quantity * (external_lines.purchase_unit_price - external_lines.contract_unit_price)
                    ELSE 0::numeric
                END)::numeric(16,2) AS sapronak_price_adjustment,
            sum(
                CASE
                    WHEN external_lines.contract_unit_price IS NULL THEN external_lines.quantity * external_lines.purchase_unit_price
                    ELSE 0::numeric
                END)::numeric(16,2) AS sapronak_unpriced_contract_total
           FROM external_lines
          GROUP BY external_lines.contract_assignment_id
        ), bl_by_assignment AS (
         SELECT marketing_external_meat_purchases.contract_assignment_id,
            sum(marketing_external_meat_purchases.weight_kg * marketing_external_meat_purchases.purchase_price_per_kg)::numeric(16,2) AS trading_bl_total
           FROM public.marketing_external_meat_purchases
          WHERE marketing_external_meat_purchases.contract_assignment_id IS NOT NULL
          GROUP BY marketing_external_meat_purchases.contract_assignment_id
        )
 SELECT a.id AS contract_assignment_id,
    a.barn_id,
    a.master_contract_id,
    a.performance_template_name,
    a.start_date,
    a.active,
    COALESCE(e.actual_purchase_total, 0::numeric)::numeric(16,2) AS external_sapronak_actual_total,
    COALESCE(e.contract_equivalent_total, 0::numeric)::numeric(16,2) AS external_sapronak_contract_total,
    COALESCE(e.sapronak_price_adjustment, 0::numeric)::numeric(16,2) AS sapronak_price_adjustment,
    COALESCE(e.sapronak_unpriced_contract_total, 0::numeric)::numeric(16,2) AS sapronak_unpriced_contract_total,
    COALESCE(b.trading_bl_total, 0::numeric)::numeric(16,2) AS trading_bl_total,
    (COALESCE(e.sapronak_price_adjustment, 0::numeric) + COALESCE(b.trading_bl_total, 0::numeric))::numeric(16,2) AS total_company_adjustment
   FROM public.logistics_contract_assignments a
     LEFT JOIN external_by_assignment e ON e.contract_assignment_id = a.id
     LEFT JOIN bl_by_assignment b ON b.contract_assignment_id = a.id;

CREATE VIEW "public"."production_cycle_final_unified" WITH (security_invoker = true) AS  SELECT sf.contract_assignment_id,
    sf.barn_id,
    'MITRA'::text AS cycle_type,
    a.performance_template_name,
    sf.id AS final_id,
    sf.system_amount,
    sf.harvest_value,
    sf.sapronak_cost,
    sf.external_meat_cost,
    sf.bonus_ip,
    sf.bonus_fc,
    sf.bonus_depletion,
    sf.fcr_actual,
    sf.fcr_standard,
    sf.ip,
    sf.mortality_pct,
    sf.population_variance_birds,
    sf.closed_on,
    sf.created_at,
    sf.chick_in_birds,
    sf.total_harvest_birds,
    sf.total_harvest_kg,
    sf.avg_bw_kg,
    sf.weighted_age,
    sf.depletion_birds,
    sf.net_feed_kg,
    sf.main_doc_cost,
    sf.main_feed_cost,
    sf.main_ovk_cost,
    sf.main_other_cost,
    sf.main_return_cost,
    sf.external_sapronak_cost,
    sf.total_rhpp_cost,
    sf.base_profit,
    sf.bonus_ip_rate,
    sf.bonus_fc_rate,
    sf.bonus_depletion_rate,
    sf.profit_per_chick_in,
    sf.profit_per_harvested_bird,
    sf.std_bw_kg,
    sf.chick_in_date,
    NULL::text AS source_reference
   FROM public.rhpp_system_final sf
     JOIN public.logistics_contract_assignments a ON a.id = sf.contract_assignment_id
  WHERE a.cycle_type = 'MITRA'::text
UNION ALL
 SELECT mf.contract_assignment_id,
    mf.barn_id,
    'MANDIRI'::text AS cycle_type,
    a.performance_template_name,
    mf.contract_assignment_id AS final_id,
    COALESCE(mf.harvest_value, 0::numeric) - COALESCE(mf.sapronak_cost, 0::numeric) AS system_amount,
    mf.harvest_value,
    mf.sapronak_cost,
    0::numeric AS external_meat_cost,
    0::numeric AS bonus_ip,
    0::numeric AS bonus_fc,
    0::numeric AS bonus_depletion,
    mf.fcr_actual,
    NULL::numeric AS fcr_standard,
    mf.ip,
        CASE
            WHEN COALESCE(mf.chick_in_birds, 0::numeric) > 0::numeric THEN COALESCE(mf.depletion_birds, 0::numeric) / mf.chick_in_birds * 100::numeric
            ELSE 0::numeric
        END AS mortality_pct,
    0::numeric AS population_variance_birds,
    mf.closed_on,
    mf.created_at,
    mf.chick_in_birds,
    mf.total_harvest_birds,
    mf.total_harvest_kg,
    mf.avg_bw_kg,
    mf.weighted_age,
    mf.depletion_birds,
    mf.net_feed_kg,
    NULL::numeric AS main_doc_cost,
    NULL::numeric AS main_feed_cost,
    NULL::numeric AS main_ovk_cost,
    NULL::numeric AS main_other_cost,
    0::numeric AS main_return_cost,
    mf.sapronak_cost AS external_sapronak_cost,
    mf.sapronak_cost AS total_rhpp_cost,
    COALESCE(mf.harvest_value, 0::numeric) - COALESCE(mf.sapronak_cost, 0::numeric) AS base_profit,
    0::numeric AS bonus_ip_rate,
    0::numeric AS bonus_fc_rate,
    0::numeric AS bonus_depletion_rate,
        CASE
            WHEN COALESCE(mf.chick_in_birds, 0::numeric) > 0::numeric THEN (COALESCE(mf.harvest_value, 0::numeric) - COALESCE(mf.sapronak_cost, 0::numeric)) / mf.chick_in_birds
            ELSE 0::numeric
        END AS profit_per_chick_in,
        CASE
            WHEN COALESCE(mf.total_harvest_birds, 0::numeric) > 0::numeric THEN (COALESCE(mf.harvest_value, 0::numeric) - COALESCE(mf.sapronak_cost, 0::numeric)) / mf.total_harvest_birds
            ELSE 0::numeric
        END AS profit_per_harvested_bird,
    NULL::numeric AS std_bw_kg,
    ci.arrived_on AS chick_in_date,
    mf.source_reference
   FROM public.production_mandiri_final mf
     JOIN public.logistics_contract_assignments a ON a.id = mf.contract_assignment_id
     LEFT JOIN public.chick_ins ci ON ci.contract_assignment_id = mf.contract_assignment_id
  WHERE a.cycle_type = 'MANDIRI'::text;

ALTER TABLE "private"."bms_rpc_allowlist" ADD CONSTRAINT "bms_rpc_allowlist_pkey" PRIMARY KEY (function_oid);

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_returns" ADD CONSTRAINT "logistics_returns_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."barns" ADD CONSTRAINT "barns_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."items" ADD CONSTRAINT "items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_mandiri_sales_receipts" ADD CONSTRAINT "finance_mandiri_sales_receipts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."audit_events" ADD CONSTRAINT "audit_events_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."company_profile" ADD CONSTRAINT "company_profile_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."advances" ADD CONSTRAINT "advances_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."expeditions" ADD CONSTRAINT "expeditions_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_mandiri_final" ADD CONSTRAINT "production_mandiri_final_pkey" PRIMARY KEY (contract_assignment_id);

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."contract_bonuses" ADD CONSTRAINT "contract_bonuses_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_return_items" ADD CONSTRAINT "logistics_return_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_external_shipments" ADD CONSTRAINT "logistics_external_shipments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_external_shipment_items" ADD CONSTRAINT "logistics_external_shipment_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recording_weight_samples" ADD CONSTRAINT "recording_weight_samples_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_estimate_sizes" ADD CONSTRAINT "production_estimate_sizes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_abk_result_sizes" ADD CONSTRAINT "production_abk_result_sizes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."rhpp_real" ADD CONSTRAINT "rhpp_real_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."rhpp_system_final" ADD CONSTRAINT "rhpp_system_final_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_bop_period_access" ADD CONSTRAINT "finance_bop_period_access_pkey" PRIMARY KEY (contract_assignment_id);

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_external_return_items" ADD CONSTRAINT "logistics_external_return_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."bop_outside" ADD CONSTRAINT "bop_outside_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."abk_league_settings" ADD CONSTRAINT "abk_league_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_trips" ADD CONSTRAINT "finance_expedition_trips_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_invoices" ADD CONSTRAINT "finance_expedition_invoices_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_invoice_items" ADD CONSTRAINT "finance_expedition_invoice_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_payments" ADD CONSTRAINT "finance_expedition_payments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_bop" ADD CONSTRAINT "finance_expedition_bop_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_reference_counters" ADD CONSTRAINT "finance_reference_counters_pkey" PRIMARY KEY (prefix, ref_date);

ALTER TABLE "bms_backup"."daily_snapshots" ADD CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY (id);

ALTER TABLE "bms_backup"."download_tokens" ADD CONSTRAINT "download_tokens_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."expedition_drivers" ADD CONSTRAINT "expedition_drivers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."expedition_vehicles" ADD CONSTRAINT "expedition_vehicles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."expedition_customers" ADD CONSTRAINT "expedition_customers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_invoice_counters" ADD CONSTRAINT "finance_expedition_invoice_counters_pkey" PRIMARY KEY (invoice_year);

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."expedition_destinations" ADD CONSTRAINT "expedition_destinations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."marketing_customers" ADD CONSTRAINT "marketing_customers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_expedition_maintenance" ADD CONSTRAINT "finance_expedition_maintenance_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ADD CONSTRAINT "logistics_mandiri_purchase_allocations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_mandiri_supplier_payments" ADD CONSTRAINT "finance_mandiri_supplier_payments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."production_feed_stock_adjustments" ADD CONSTRAINT "production_feed_stock_adjustments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoices_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."user_activity_logs" ADD CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_stock_purchase_invoices" ADD CONSTRAINT "finance_stock_purchase_invoices_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_pkey" PRIMARY KEY (id);

ALTER TABLE "private"."bms_operation_receipts" ADD CONSTRAINT "bms_operation_receipts_pkey" PRIMARY KEY (actor, operation_id);

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_cycle_id_key" UNIQUE (cycle_id);

ALTER TABLE "public"."barns" ADD CONSTRAINT "barns_code_key" UNIQUE (code);

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_code_key" UNIQUE (code);

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_cycle_id_key" UNIQUE (cycle_id);

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_number_key" UNIQUE (number);

ALTER TABLE "public"."items" ADD CONSTRAINT "items_code_key" UNIQUE (code);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_cycle_id_recorded_on_key" UNIQUE (cycle_id, recorded_on);

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_transaction_number_key" UNIQUE (transaction_number);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_code_key" UNIQUE (code);

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_contract_id_min_weight_kg_key" UNIQUE (contract_id, min_weight_kg);

ALTER TABLE "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_shipment_id_item_id_key" UNIQUE (shipment_id, item_id);

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_contract_template_age_key" UNIQUE (contract_id, template_name, age_days);

ALTER TABLE "public"."logistics_return_items" ADD CONSTRAINT "logistics_return_items_return_id_item_id_key" UNIQUE (return_id, item_id);

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_code_key" UNIQUE (code);

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_name_key" UNIQUE (name);

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_contract_assignment_id_abk_id_key" UNIQUE (contract_assignment_id, abk_id);

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_contract_assignment_id_abk_id_key" UNIQUE (contract_assignment_id, abk_id);

ALTER TABLE "public"."rhpp_system_final" ADD CONSTRAINT "rhpp_system_final_contract_assignment_id_key" UNIQUE (contract_assignment_id);

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_contract_assignment_id_abk_id_key" UNIQUE (contract_assignment_id, abk_id);

ALTER TABLE "public"."expedition_customers" ADD CONSTRAINT "expedition_customers_code_key" UNIQUE (code);

ALTER TABLE "public"."finance_expedition_invoices" ADD CONSTRAINT "finance_expedition_invoices_invoice_number_key" UNIQUE (invoice_number);

ALTER TABLE "public"."finance_expedition_invoice_items" ADD CONSTRAINT "finance_expedition_invoice_items_invoice_id_trip_id_key" UNIQUE (invoice_id, trip_id);

ALTER TABLE "public"."finance_expedition_invoice_items" ADD CONSTRAINT "finance_expedition_invoice_items_trip_id_key" UNIQUE (trip_id);

ALTER TABLE "bms_backup"."daily_snapshots" ADD CONSTRAINT "daily_snapshots_backup_date_key" UNIQUE (backup_date);

ALTER TABLE "bms_backup"."download_tokens" ADD CONSTRAINT "download_tokens_token_key" UNIQUE (token);

ALTER TABLE "public"."expedition_drivers" ADD CONSTRAINT "expedition_drivers_code_key" UNIQUE (code);

ALTER TABLE "public"."expedition_vehicles" ADD CONSTRAINT "expedition_vehicles_plate_number_key" UNIQUE (plate_number);

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_code_key" UNIQUE (code);

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_route_name_key" UNIQUE (route_name);

ALTER TABLE "public"."expedition_destinations" ADD CONSTRAINT "expedition_destinations_code_key" UNIQUE (code);

ALTER TABLE "public"."expedition_destinations" ADD CONSTRAINT "expedition_destinations_name_key" UNIQUE (name);

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_trip_id_line_no_key" UNIQUE (trip_id, line_no);

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ADD CONSTRAINT "logistics_mandiri_purchase_al_purchase_id_contract_assignme_key" UNIQUE (purchase_id, contract_assignment_id);

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_asset_id_key" UNIQUE (asset_id);

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_return_item_id_key" UNIQUE (return_item_id);

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_return_id_item_id_key" UNIQUE (return_id, item_id);

ALTER TABLE "public"."finance_mandiri_sales_receipts" ADD CONSTRAINT "finance_mandiri_sales_receipts_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_paid_by_check" CHECK ((paid_by = ANY (ARRAY['COMPANY'::text, 'OWNER'::text])));

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_shipped_check" CHECK ((shipped >= 0));

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_received_check" CHECK ((received >= 0));

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_doa_check" CHECK ((doa >= 0));

ALTER TABLE "public"."barns" ADD CONSTRAINT "barns_capacity_check" CHECK ((capacity > 0));

ALTER TABLE "public"."barns" ADD CONSTRAINT "barns_kind_check" CHECK ((kind = ANY (ARRAY['OPEN_HOUSE'::text, 'SEMI_CLOSE_HOUSE'::text, 'CLOSE_HOUSE'::text])));

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_initial_population_check" CHECK ((initial_population > 0));

ALTER TABLE "public"."cycles" ADD CONSTRAINT "state_dates" CHECK ((((state <> 'READY_RHPP'::public.cycle_state) OR (ready_at IS NOT NULL)) AND ((state <> 'CLOSED'::public.cycle_state) OR (closed_at IS NOT NULL))));

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_age_days_check" CHECK ((age_days >= 0));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_mortality_check" CHECK ((mortality >= 0));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_culling_check" CHECK ((culling >= 0));

ALTER TABLE "public"."finance_mandiri_sales_receipts" ADD CONSTRAINT "finance_mandiri_sales_receipts_method_check" CHECK ((method = ANY (ARRAY['TRANSFER'::text, 'TUNAI'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_sample_count_check" CHECK ((sample_count >= 0));

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_birds_check" CHECK ((birds > 0));

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_price_per_kg_check" CHECK ((price_per_kg >= (0)::numeric));

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_amount_check" CHECK ((amount >= (0)::numeric));

ALTER TABLE "public"."company_profile" ADD CONSTRAINT "company_profile_id_check" CHECK (id);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_kind_check" CHECK ((kind = ANY (ARRAY['KARYAWAN'::text, 'ABK'::text])));

ALTER TABLE "public"."advances" ADD CONSTRAINT "advances_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_age_days_check" CHECK ((age_days >= 0));

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_min_weight_kg_check" CHECK ((min_weight_kg >= (0)::numeric));

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_check" CHECK ((max_weight_kg > min_weight_kg));

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_price_per_kg_check" CHECK ((price_per_kg >= (0)::numeric));

ALTER TABLE "public"."contract_bonuses" ADD CONSTRAINT "contract_bonuses_metric_check" CHECK ((metric = ANY (ARRAY['IP'::text, 'FCR_DIFFERENCE'::text, 'DEPLETION'::text, 'OTHER'::text])));

ALTER TABLE "public"."contract_bonuses" ADD CONSTRAINT "contract_bonuses_check" CHECK (((max_value IS NULL) OR (min_value IS NULL) OR (max_value > min_value)));

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_age_days_check" CHECK ((age_days >= 0));

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_std_body_weight_g_check" CHECK ((std_body_weight_g > (0)::numeric));

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_std_feed_g_per_bird_check" CHECK ((std_feed_g_per_bird >= (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_feed_bags_in_check" CHECK ((feed_bags_in >= (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_feed_bags_out_check" CHECK ((feed_bags_out >= (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_feed_bags_balance_check" CHECK ((feed_bags_balance >= (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_ip_check" CHECK ((ip >= (0)::numeric));

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_ovk_price_basis_check" CHECK ((ovk_price_basis = ANY (ARRAY['FIXED'::text, 'DISTRIBUTOR_PLUS_VAT'::text])));

ALTER TABLE "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_ovk_vat_percent_check" CHECK (((ovk_vat_percent >= (0)::numeric) AND (ovk_vat_percent <= (100)::numeric)));

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_nonnegative_prices" CHECK (((doc_price >= (0)::numeric) AND (pre_starter_price >= (0)::numeric) AND (starter_price >= (0)::numeric) AND (finisher_price >= (0)::numeric) AND (ovk_price >= (0)::numeric) AND (harvest_price >= (0)::numeric)));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_feed_kg_check" CHECK ((feed_kg >= (0)::numeric));

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_actual_fcr_check" CHECK ((actual_fcr > (0)::numeric));

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_std_fcr_check" CHECK ((std_fcr > (0)::numeric));

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_net_weight_kg_check" CHECK ((net_weight_kg > (0)::numeric));

ALTER TABLE "public"."contracts" ADD CONSTRAINT "ovk_basis_valid" CHECK (((ovk_price_basis <> 'DISTRIBUTOR_PLUS_VAT'::text) OR (ovk_vat_percent IS NOT NULL) OR (cycle_id IS NULL)));

ALTER TABLE "public"."logistics_return_items" ADD CONSTRAINT "logistics_return_items_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_external_shipment_items" ADD CONSTRAINT "logistics_external_shipment_items_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_external_shipment_items" ADD CONSTRAINT "logistics_external_shipment_items_purchase_unit_price_check" CHECK ((purchase_unit_price >= (0)::numeric));

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_weight_kg_check" CHECK ((weight_kg > (0)::numeric));

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_purchase_price_per_kg_check" CHECK ((purchase_price_per_kg >= (0)::numeric));

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_birds_check" CHECK ((birds > (0)::numeric));

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_net_weight_kg_check" CHECK ((net_weight_kg > (0)::numeric));

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_supplier_type_check" CHECK ((supplier_type = ANY (ARRAY['SAPRONAK'::text, 'DAGING'::text])));

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_price_positive" CHECK ((price_per_kg > (0)::numeric));

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchase_price_positive" CHECK ((purchase_price_per_kg > (0)::numeric));

ALTER TABLE "public"."recording_weight_samples" ADD CONSTRAINT "recording_weight_samples_weight_g_check" CHECK ((weight_g > (0)::numeric));

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_remaining_birds_check" CHECK ((remaining_birds >= 0));

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_feed_used_kg_check" CHECK ((feed_used_kg >= (0)::numeric));

ALTER TABLE "public"."production_estimate_sizes" ADD CONSTRAINT "production_estimate_sizes_birds_check" CHECK ((birds > 0));

ALTER TABLE "public"."production_estimate_sizes" ADD CONSTRAINT "production_estimate_sizes_bw_kg_check" CHECK ((bw_kg > (0)::numeric));

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_feed_pre_kg_check" CHECK ((feed_pre_kg >= (0)::numeric));

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_feed_starter_kg_check" CHECK ((feed_starter_kg >= (0)::numeric));

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_feed_finisher_kg_check" CHECK ((feed_finisher_kg >= (0)::numeric));

ALTER TABLE "public"."production_abk_result_sizes" ADD CONSTRAINT "production_abk_result_sizes_birds_check" CHECK ((birds > 0));

ALTER TABLE "public"."production_abk_result_sizes" ADD CONSTRAINT "production_abk_result_sizes_weight_kg_check" CHECK ((weight_kg > (0)::numeric));

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_check" CHECK ((doa <= received));

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_initial_birds_check" CHECK (((initial_birds IS NULL) OR (initial_birds > 0)));

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_feed_pre_bags_check" CHECK (((feed_pre_bags IS NULL) OR (feed_pre_bags >= (0)::numeric)));

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_feed_starter_bags_check" CHECK (((feed_starter_bags IS NULL) OR (feed_starter_bags >= (0)::numeric)));

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_feed_finisher_bags_check" CHECK (((feed_finisher_bags IS NULL) OR (feed_finisher_bags >= (0)::numeric)));

ALTER TABLE "public"."finance_mandiri_supplier_payments" ADD CONSTRAINT "finance_mandiri_supplier_payments_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."logistics_external_return_items" ADD CONSTRAINT "logistics_external_return_items_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfers_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."bop_outside" ADD CONSTRAINT "bop_outside_amount_check" CHECK ((amount >= (0)::numeric));

ALTER TABLE "public"."abk_league_settings" ADD CONSTRAINT "abk_league_settings_id_check" CHECK ((id = true));

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PARTIAL'::text, 'SENT'::text])));

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_gross_salary_check" CHECK ((gross_salary >= (0)::numeric));

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_advance_deduction_check" CHECK ((advance_deduction >= (0)::numeric));

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_net_paid_check" CHECK ((net_paid >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_trips" ADD CONSTRAINT "finance_expedition_trips_trip_price_check" CHECK ((trip_price >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_trips" ADD CONSTRAINT "finance_expedition_trips_additional_check" CHECK ((additional >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_trips" ADD CONSTRAINT "finance_expedition_trips_deduction_check" CHECK ((deduction >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_invoices" ADD CONSTRAINT "finance_expedition_invoices_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'PAID'::text, 'VOID'::text])));

ALTER TABLE "public"."finance_expedition_payments" ADD CONSTRAINT "finance_expedition_payments_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."finance_expedition_bop" ADD CONSTRAINT "finance_expedition_bop_amount_check" CHECK ((amount >= (0)::numeric));

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_category_check" CHECK ((category = ANY (ARRAY['PERAWATAN_JANGKA_PANJANG'::text, 'RENOVASI'::text, 'PENGGANTIAN_KOMPONEN'::text, 'PERALATAN'::text, 'TENAGA_KERJA_PERAWATAN'::text, 'PERBAIKAN_BANGUNAN'::text, 'PERBAIKAN_LISTRIK'::text, 'PERBAIKAN_AIR'::text, 'PERBAIKAN_PERALATAN'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_category_production_only_check" CHECK ((category = ANY (ARRAY['OVK'::text, 'TENAGA_KERJA'::text, 'UPAH_ABK'::text, 'KONSUMSI'::text, 'TRANSPORTASI'::text, 'LISTRIK'::text, 'GAS'::text, 'AIR'::text, 'SEKAM'::text, 'SANITASI'::text, 'EKSPEDISI'::text, 'OPERASIONAL'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_method_check" CHECK ((method = ANY (ARRAY['TUNAI'::text, 'TRANSFER'::text])));

ALTER TABLE "public"."finance_expedition_invoice_counters" ADD CONSTRAINT "finance_expedition_invoice_counters_last_no_check" CHECK ((last_no >= 0));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_default_trip_price_check" CHECK ((default_trip_price >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_line_no_check" CHECK ((line_no > 0));

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_qty_check" CHECK (((qty IS NULL) OR (qty >= (0)::numeric)));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_bbm_check" CHECK ((bop_bbm >= (0)::numeric));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_tol_check" CHECK ((bop_tol >= (0)::numeric));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_uang_jalan_check" CHECK ((bop_uang_jalan >= (0)::numeric));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_makan_sopir_check" CHECK ((bop_makan_sopir >= (0)::numeric));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_bongkar_muat_check" CHECK ((bop_bongkar_muat >= (0)::numeric));

ALTER TABLE "public"."finance_expedition_maintenance" ADD CONSTRAINT "finance_expedition_maintenance_category_check" CHECK ((category = ANY (ARRAY['SERVIS'::text, 'BAN'::text, 'PAJAK_KENDARAAN'::text, 'PERBAIKAN'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."finance_expedition_maintenance" ADD CONSTRAINT "finance_expedition_maintenance_amount_check" CHECK ((amount >= (0)::numeric));

ALTER TABLE "public"."expedition_routes" ADD CONSTRAINT "expedition_routes_bop_operasional_check" CHECK ((bop_operasional >= (0)::numeric));

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_cycle_type_check" CHECK ((cycle_type = ANY (ARRAY['MITRA'::text, 'MANDIRI'::text])));

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_purchase_unit_price_check" CHECK ((purchase_unit_price >= (0)::numeric));

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ADD CONSTRAINT "logistics_mandiri_purchase_allocations_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."finance_mandiri_supplier_payments" ADD CONSTRAINT "finance_mandiri_supplier_payments_method_check" CHECK ((method = ANY (ARRAY['TRANSFER'::text, 'TUNAI'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_purchase_type_check" CHECK ((purchase_type = ANY (ARRAY['ASSET'::text, 'OVK1'::text, 'OVK2'::text, 'BOP_UMUM'::text, 'PERAWATAN'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_destination_type_check" CHECK ((destination_type = ANY (ARRAY['KANDANG'::text, 'KANTOR'::text])));

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_destination_ck" CHECK ((((destination_type = 'KANDANG'::text) AND (barn_id IS NOT NULL)) OR ((destination_type = 'KANTOR'::text) AND (barn_id IS NULL))));

ALTER TABLE "public"."bop_outside" ADD CONSTRAINT "bop_outside_expense_scope_check" CHECK ((expense_scope = ANY (ARRAY['KANTOR'::text, 'LUAR_KANTOR'::text])));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_location_type_check" CHECK ((((location_type = 'KANDANG'::text) AND (barn_id IS NOT NULL)) OR ((location_type = 'KANTOR'::text) AND (barn_id IS NULL))));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_asset_location_type_check" CHECK ((asset_location_type = ANY (ARRAY['KANDANG'::text, 'KANTOR'::text])));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_name_check" CHECK ((length(btrim(name)) > 0));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_category_check" CHECK ((category = ANY (ARRAY['PERALATAN'::text, 'MESIN'::text, 'BANGUNAN'::text, 'INSTALASI'::text, 'KENDARAAN'::text, 'LAINNYA'::text])));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_acquisition_value_check" CHECK ((acquisition_value >= (0)::numeric));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_condition_check" CHECK ((condition = ANY (ARRAY['BAIK'::text, 'PERLU_PERBAIKAN'::text, 'RUSAK'::text])));

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoices_asset_location_type_check" CHECK ((asset_location_type = ANY (ARRAY['KANDANG'::text, 'KANTOR'::text])));

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_status_check" CHECK ((status = ANY (ARRAY['AKTIF'::text, 'DIPINDAHKAN'::text, 'DIJUAL'::text, 'DINONAKTIFKAN'::text])));

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoices_payment_method_check" CHECK ((payment_method = ANY (ARRAY['TUNAI'::text, 'TRANSFER'::text])));

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoices_total_amount_check" CHECK ((total_amount >= (0)::numeric));

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoice_location_check" CHECK ((((asset_location_type = 'KANDANG'::text) AND (barn_id IS NOT NULL)) OR ((asset_location_type = 'KANTOR'::text) AND (barn_id IS NULL))));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_stock_kind_check" CHECK ((stock_kind = ANY (ARRAY['ASET'::text, 'HABIS_PAKAI'::text])));

ALTER TABLE "public"."items" ADD CONSTRAINT "items_ovk_type_check" CHECK (((ovk_type IS NULL) OR (ovk_type = ANY (ARRAY['OVK1'::text, 'OVK2'::text]))));

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_purchase_unit_price_check" CHECK ((purchase_unit_price >= (0)::numeric));

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_source_type_check" CHECK ((source_type = ANY (ARRAY['SAPRONAK_LUAR'::text, 'TAMBAH_DAGING'::text, 'BELI_PERALATAN'::text])));

ALTER TABLE "public"."finance_stock_purchase_invoices" ADD CONSTRAINT "finance_stock_purchase_invoices_payment_method_check" CHECK ((payment_method = ANY (ARRAY['TUNAI'::text, 'TRANSFER'::text])));

ALTER TABLE "public"."finance_stock_purchase_invoices" ADD CONSTRAINT "finance_stock_purchase_invoices_total_amount_check" CHECK ((total_amount >= (0)::numeric));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_unit_price_check" CHECK ((unit_price >= (0)::numeric));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_total_amount_check" CHECK ((total_amount >= (0)::numeric));

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_payment_method_check" CHECK ((payment_method = ANY (ARRAY['TUNAI'::text, 'TRANSFER'::text])));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_standard_name_check" CHECK ((length(btrim(standard_name)) > 0));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_unit_check" CHECK ((length(btrim(unit)) > 0));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_unit_price_check" CHECK ((unit_price >= (0)::numeric));

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_total_amount_check" CHECK ((total_amount >= (0)::numeric));

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_paid_by_check" CHECK ((paid_by = ANY (ARRAY['COMPANY'::text, 'OWNER'::text])));

ALTER TABLE "public"."bop_outside" ADD CONSTRAINT "bop_outside_paid_by_check" CHECK ((paid_by = ANY (ARRAY['COMPANY'::text, 'OWNER'::text])));

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_unit_price_check" CHECK ((unit_price >= (0)::numeric));

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_direction_check" CHECK ((direction = ANY (ARRAY['IN'::text, 'OUT'::text])));

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_ppl_id_fkey" FOREIGN KEY (ppl_id) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."finance_mandiri_sales_receipts" ADD CONSTRAINT "finance_mandiri_sales_receipts_harvest_id_fkey" FOREIGN KEY (harvest_id) REFERENCES public.marketing_contract_harvests(id);

ALTER TABLE "public"."rhpp_real" ADD CONSTRAINT "rhpp_real_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."rhpp_real" ADD CONSTRAINT "rhpp_real_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."advances" ADD CONSTRAINT "advances_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_advance_id_fkey" FOREIGN KEY (advance_id) REFERENCES public.advances(id);

ALTER TABLE "public"."expeditions" ADD CONSTRAINT "expeditions_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.cycles(id);

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."cycles" ADD CONSTRAINT "cycles_abk_id_fkey" FOREIGN KEY (abk_id) REFERENCES public.employees(id);

ALTER TABLE "public"."contract_live_prices" ADD CONSTRAINT "contract_live_prices_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

ALTER TABLE "public"."contract_bonuses" ADD CONSTRAINT "contract_bonuses_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

ALTER TABLE "public"."performance_standards" ADD CONSTRAINT "performance_standards_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.contracts(id);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_feed_item_id_fkey" FOREIGN KEY (feed_item_id) REFERENCES public.items(id);

ALTER TABLE "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.logistics_shipments(id) ON DELETE CASCADE;

ALTER TABLE "public"."logistics_shipment_items" ADD CONSTRAINT "logistics_shipment_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."logistics_returns" ADD CONSTRAINT "logistics_returns_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_returns" ADD CONSTRAINT "logistics_returns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."production_mandiri_final" ADD CONSTRAINT "production_mandiri_final_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE CASCADE;

ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_source_master_contract_id_fkey" FOREIGN KEY (source_master_contract_id) REFERENCES public.contracts(id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_master_contract_id_fkey" FOREIGN KEY (master_contract_id) REFERENCES public.contracts(id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_return_items" ADD CONSTRAINT "logistics_return_items_return_id_fkey" FOREIGN KEY (return_id) REFERENCES public.logistics_returns(id) ON DELETE CASCADE;

ALTER TABLE "public"."logistics_return_items" ADD CONSTRAINT "logistics_return_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."production_mandiri_final" ADD CONSTRAINT "production_mandiri_final_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."production_mandiri_final" ADD CONSTRAINT "production_mandiri_final_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."logistics_shipments" ADD CONSTRAINT "logistics_shipments_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_returns" ADD CONSTRAINT "logistics_returns_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."items" ADD CONSTRAINT "items_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."logistics_external_shipments" ADD CONSTRAINT "logistics_external_shipments_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_external_shipments" ADD CONSTRAINT "logistics_external_shipments_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_external_shipments" ADD CONSTRAINT "logistics_external_shipments_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."logistics_external_shipment_items" ADD CONSTRAINT "logistics_external_shipment_items_external_shipment_id_fkey" FOREIGN KEY (external_shipment_id) REFERENCES public.logistics_external_shipments(id) ON DELETE CASCADE;

ALTER TABLE "public"."logistics_external_shipment_items" ADD CONSTRAINT "logistics_external_shipment_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."marketing_external_meat_purchases" ADD CONSTRAINT "marketing_external_meat_purchases_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_abk_id_fkey" FOREIGN KEY (abk_id) REFERENCES public.employees(id);

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE CASCADE;

ALTER TABLE "public"."logistics_contract_assignment_abks" ADD CONSTRAINT "logistics_contract_assignment_abks_abk_id_fkey" FOREIGN KEY (abk_id) REFERENCES public.employees(id);

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."chick_ins" ADD CONSTRAINT "chick_ins_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."recordings" ADD CONSTRAINT "recordings_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."recording_weight_samples" ADD CONSTRAINT "recording_weight_samples_recording_id_fkey" FOREIGN KEY (recording_id) REFERENCES public.recordings(id) ON DELETE CASCADE;

ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."visits" ADD CONSTRAINT "visits_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."production_estimates" ADD CONSTRAINT "production_estimates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."production_estimate_sizes" ADD CONSTRAINT "production_estimate_sizes_estimate_id_fkey" FOREIGN KEY (estimate_id) REFERENCES public.production_estimates(id) ON DELETE CASCADE;

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_abk_id_fkey" FOREIGN KEY (abk_id) REFERENCES public.employees(id);

ALTER TABLE "public"."production_abk_results" ADD CONSTRAINT "production_abk_results_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."production_abk_result_sizes" ADD CONSTRAINT "production_abk_result_sizes_result_id_fkey" FOREIGN KEY (result_id) REFERENCES public.production_abk_results(id) ON DELETE CASCADE;

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."bop" ADD CONSTRAINT "bop_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."expeditions" ADD CONSTRAINT "expeditions_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."expeditions" ADD CONSTRAINT "expeditions_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."harvests" ADD CONSTRAINT "harvests_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."supplies" ADD CONSTRAINT "supplies_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."rhpp_estimates" ADD CONSTRAINT "rhpp_estimates_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."rhpp_real" ADD CONSTRAINT "rhpp_real_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."rhpp_real" ADD CONSTRAINT "rhpp_real_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."rhpp_system_final" ADD CONSTRAINT "rhpp_system_final_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_external_shipment_id_fkey" FOREIGN KEY (external_shipment_id) REFERENCES public.logistics_external_shipments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_returns" ADD CONSTRAINT "logistics_external_returns_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_items" ADD CONSTRAINT "logistics_external_return_items_external_return_id_fkey" FOREIGN KEY (external_return_id) REFERENCES public.logistics_external_returns(id) ON DELETE CASCADE;

ALTER TABLE "public"."logistics_external_return_items" ADD CONSTRAINT "logistics_external_return_items_external_shipment_item_id_fkey" FOREIGN KEY (external_shipment_item_id) REFERENCES public.logistics_external_shipment_items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_items" ADD CONSTRAINT "logistics_external_return_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfer_external_return_item_id_fkey" FOREIGN KEY (external_return_item_id) REFERENCES public.logistics_external_return_items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_tra_source_contract_assignment_i_fkey" FOREIGN KEY (source_contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfers_source_barn_id_fkey" FOREIGN KEY (source_barn_id) REFERENCES public.barns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_tra_target_contract_assignment_i_fkey" FOREIGN KEY (target_contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfers_target_barn_id_fkey" FOREIGN KEY (target_barn_id) REFERENCES public.barns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_external_return_transfers" ADD CONSTRAINT "logistics_external_return_transfers_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."rhpp_system_final" ADD CONSTRAINT "rhpp_system_final_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."abk_league_settings" ADD CONSTRAINT "abk_league_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE "public"."logistics_contract_assignments" ADD CONSTRAINT "logistics_contract_assignments_ppl_id_fkey" FOREIGN KEY (ppl_id) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."advances" ADD CONSTRAINT "advances_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."advances" ADD CONSTRAINT "advances_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."abk_cycle_salaries" ADD CONSTRAINT "abk_cycle_salaries_abk_id_fkey" FOREIGN KEY (abk_id) REFERENCES public.employees(id);

ALTER TABLE "public"."finance_expedition_invoice_items" ADD CONSTRAINT "finance_expedition_invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_expedition_invoices(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_expedition_invoice_items" ADD CONSTRAINT "finance_expedition_invoice_items_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES public.finance_expedition_trips(id);

ALTER TABLE "public"."finance_expedition_payments" ADD CONSTRAINT "finance_expedition_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_expedition_invoices(id);

ALTER TABLE "public"."finance_expedition_bop" ADD CONSTRAINT "finance_expedition_bop_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES public.finance_expedition_trips(id);

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ADD CONSTRAINT "logistics_mandiri_purchase_allocations_purchase_id_fkey" FOREIGN KEY (purchase_id) REFERENCES public.logistics_mandiri_purchases(id) ON DELETE CASCADE;

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."barn_maintenance_costs" ADD CONSTRAINT "barn_maintenance_costs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES public.finance_expedition_trips(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_expedition_trip_destinations" ADD CONSTRAINT "finance_expedition_trip_destinations_destination_id_fkey" FOREIGN KEY (destination_id) REFERENCES public.expedition_destinations(id);

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ADD CONSTRAINT "logistics_mandiri_purchase_allocati_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."logistics_mandiri_purchases" ADD CONSTRAINT "logistics_mandiri_purchases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."marketing_customers" ADD CONSTRAINT "marketing_customers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."marketing_contract_harvests" ADD CONSTRAINT "marketing_contract_harvests_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES public.marketing_customers(id);

ALTER TABLE "public"."finance_mandiri_supplier_payments" ADD CONSTRAINT "finance_mandiri_supplier_payments_purchase_id_fkey" FOREIGN KEY (purchase_id) REFERENCES public.logistics_mandiri_purchases(id) ON DELETE RESTRICT;

ALTER TABLE "public"."finance_bop_period_access" ADD CONSTRAINT "finance_bop_period_access_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE CASCADE;

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_stock_item_id_fkey" FOREIGN KEY (stock_item_id) REFERENCES public.warehouse_stock_items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.barn_assets(id) ON DELETE RESTRICT;

ALTER TABLE "public"."warehouse_stock_shipments" ADD CONSTRAINT "warehouse_stock_shipments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."production_feed_stock_adjustments" ADD CONSTRAINT "production_feed_stock_adjustments_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id) ON DELETE CASCADE;

ALTER TABLE "public"."production_feed_stock_adjustments" ADD CONSTRAINT "production_feed_stock_adjustments_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."barn_assets" ADD CONSTRAINT "barn_assets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_asset_purchase_invoices" ADD CONSTRAINT "finance_asset_purchase_invoices_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_asset_purchase_invoices(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES public.barn_assets(id) ON DELETE SET NULL;

ALTER TABLE "public"."logistics_equipment_purchases" ADD CONSTRAINT "logistics_equipment_purchases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."finance_stock_purchase_invoices" ADD CONSTRAINT "finance_stock_purchase_invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_barn_id_fkey" FOREIGN KEY (barn_id) REFERENCES public.barns(id);

ALTER TABLE "public"."finance_direct_purchases" ADD CONSTRAINT "finance_direct_purchases_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.finance_stock_purchase_invoices(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_return_id_fkey" FOREIGN KEY (return_id) REFERENCES public.logistics_returns(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_return_item_id_fkey" FOREIGN KEY (return_item_id) REFERENCES public.logistics_return_items(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_source_assignment_id_fkey" FOREIGN KEY (source_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id);

ALTER TABLE "public"."logistics_mitra_retained_feed" ADD CONSTRAINT "logistics_mitra_retained_feed_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_retained_feed_id_fkey" FOREIGN KEY (retained_feed_id) REFERENCES public.logistics_mitra_retained_feed(id) ON DELETE RESTRICT;

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_contract_assignment_id_fkey" FOREIGN KEY (contract_assignment_id) REFERENCES public.logistics_contract_assignments(id);

ALTER TABLE "public"."logistics_company_feed_movements" ADD CONSTRAINT "logistics_company_feed_movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

ALTER TABLE "public"."warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX bms_fk_chick_ins_830a9c060bfa ON public.chick_ins USING btree (contract_assignment_id);

CREATE INDEX idx_advance_payments_advance_id ON public.advance_payments USING btree (advance_id);

CREATE INDEX idx_supplies_cycle_id ON public.supplies USING btree (cycle_id);

CREATE INDEX bms_fk_production_feed_stock_adj_2ece50fc6643 ON public.production_feed_stock_adjustments USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_external_return_transfers_item_id ON public.logistics_external_return_transfers USING btree (item_id);

CREATE INDEX idx_supplies_barn_id ON public.supplies USING btree (barn_id);

CREATE INDEX bms_fk_abk_cycle_salaries_244073d5ad15 ON public.abk_cycle_salaries USING btree (abk_id);

CREATE INDEX bms_fk_production_feed_stock_adj_c3ab1b3b3d9c ON public.production_feed_stock_adjustments USING btree (item_id);

CREATE INDEX fx_invoice_date_idx ON public.finance_expedition_invoices USING btree (invoice_date);

CREATE INDEX finance_direct_purchases_invoice_idx ON public.finance_direct_purchases USING btree (invoice_id);

CREATE INDEX idx_external_shipments_assignment ON public.logistics_external_shipments USING btree (contract_assignment_id);

CREATE INDEX idx_recording_weight_samples_recording ON public.recording_weight_samples USING btree (recording_id);

CREATE INDEX finance_stock_purchase_invoices_created_by_idx ON public.finance_stock_purchase_invoices USING btree (created_by);

CREATE INDEX bms_fk_logistics_mandiri_purchas_e0c65f796d9c ON public.logistics_mandiri_purchases USING btree (created_by);

CREATE INDEX idx_harvests_contract_assignment_id ON public.harvests USING btree (contract_assignment_id);

CREATE INDEX bms_fk_abk_cycle_salaries_9aade605f781 ON public.abk_cycle_salaries USING btree (barn_id);

CREATE INDEX idx_production_estimates_created_by ON public.production_estimates USING btree (created_by);

CREATE INDEX idx_mandiri_purchase_alloc_assignment ON public.logistics_mandiri_purchase_allocations USING btree (contract_assignment_id);

CREATE INDEX bms_fk_cycles_efde1e2d9374 ON public.cycles USING btree (barn_id);

CREATE INDEX bms_fk_finance_asset_purchase_in_4bb738288917 ON public.finance_asset_purchase_invoices USING btree (barn_id);

CREATE INDEX idx_supplies_item_id ON public.supplies USING btree (item_id);

CREATE INDEX bms_fk_logistics_company_feed_mo_909b6f4aaeae ON public.logistics_company_feed_movements USING btree (contract_assignment_id);

CREATE INDEX warehouse_stock_shipments_asset_idx ON public.warehouse_stock_shipments USING btree (asset_id);

CREATE INDEX idx_supplier_payments_source ON public.supplier_payments USING btree (source_type, source_id);

CREATE INDEX idx_cycles_abk_id ON public.cycles USING btree (abk_id);

CREATE INDEX idx_rhpp_estimates_barn_id ON public.rhpp_estimates USING btree (barn_id);

CREATE INDEX bms_fk_logistics_equipment_purch_bd1e85ac261e ON public.logistics_equipment_purchases USING btree (created_by);

CREATE INDEX idx_supplier_payments_assignment ON public.supplier_payments USING btree (contract_assignment_id);

CREATE INDEX bms_fk_logistics_mitra_retained__6bebde3cc200 ON public.logistics_mitra_retained_feed USING btree (item_id);

CREATE INDEX advances_assignment_idx ON public.advances USING btree (contract_assignment_id, employee_id);

CREATE INDEX idx_logistics_return_items_return ON public.logistics_return_items USING btree (return_id);

CREATE INDEX idx_logistics_shipment_items_shipment ON public.logistics_shipment_items USING btree (shipment_id);

CREATE INDEX idx_bop_contract_assignment_id ON public.bop USING btree (contract_assignment_id);

CREATE INDEX idx_marketing_external_meat_assignment ON public.marketing_external_meat_purchases USING btree (contract_assignment_id);

CREATE INDEX bms_fk_marketing_contract_harves_2fe760ac3696 ON public.marketing_contract_harvests USING btree (buyer_id);

CREATE INDEX bms_fk_logistics_company_feed_mo_24f1ff38181e ON public.logistics_company_feed_movements USING btree (created_by);

CREATE INDEX idx_prod_est_sizes_header ON public.production_estimate_sizes USING btree (estimate_id);

CREATE INDEX idx_rhpp_estimates_created_by ON public.rhpp_estimates USING btree (created_by);

CREATE INDEX production_mandiri_final_barn_id_idx ON public.production_mandiri_final USING btree (barn_id);

CREATE INDEX bms_fk_barn_maintenance_costs_9a89e935eb54 ON public.barn_maintenance_costs USING btree (created_by);

CREATE INDEX idx_logistics_external_return_transfers_target_barn_id ON public.logistics_external_return_transfers USING btree (target_barn_id);

CREATE INDEX idx_marketing_contract_harvest_assignment ON public.marketing_contract_harvests USING btree (contract_assignment_id);

CREATE UNIQUE INDEX uq_logistics_shipments_shipping_note_number ON public.logistics_shipments USING btree (lower(TRIM(BOTH FROM shipping_note_number))) WHERE (COALESCE(TRIM(BOTH FROM shipping_note_number), ''::text) <> ''::text);

CREATE UNIQUE INDEX rhpp_real_assignment_key ON public.rhpp_real USING btree (contract_assignment_id) WHERE (contract_assignment_id IS NOT NULL);

CREATE INDEX bms_fk_logistics_equipment_purch_bb1df5e17781 ON public.logistics_equipment_purchases USING btree (supplier_id);

CREATE INDEX idx_marketing_contract_harvest_barn ON public.marketing_contract_harvests USING btree (barn_id);

CREATE INDEX idx_external_return_transfer_target ON public.logistics_external_return_transfers USING btree (target_contract_assignment_id);

CREATE INDEX bms_fk_finance_expedition_paymen_32b372f629a1 ON public.finance_expedition_payments USING btree (invoice_id);

CREATE INDEX idx_finance_expedition_trip_destinations_trip ON public.finance_expedition_trip_destinations USING btree (trip_id, line_no);

CREATE INDEX idx_logistics_shipments_barn ON public.logistics_shipments USING btree (barn_id);

CREATE INDEX finance_mandiri_supplier_payments_paid_on_idx ON public.finance_mandiri_supplier_payments USING btree (paid_on);

CREATE INDEX idx_rhpp_estimates_contract_assignment_id ON public.rhpp_estimates USING btree (contract_assignment_id);

CREATE INDEX bms_fk_logistics_equipment_purch_1bdb654933b1 ON public.logistics_equipment_purchases USING btree (barn_id);

CREATE UNIQUE INDEX uq_production_estimate_assignment_date ON public.production_estimates USING btree (contract_assignment_id, estimated_on);

CREATE INDEX warehouse_stock_shipments_barn_idx ON public.warehouse_stock_shipments USING btree (barn_id);

CREATE INDEX idx_logistics_external_returns_barn_id ON public.logistics_external_returns USING btree (barn_id);

CREATE INDEX bms_fk_logistics_contract_assign_ebb624577e37 ON public.logistics_contract_assignments USING btree (barn_id);

CREATE INDEX idx_recordings_assignment ON public.recordings USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_shipment_items_item ON public.logistics_shipment_items USING btree (item_id);

CREATE INDEX idx_prod_abk_result_abk ON public.production_abk_results USING btree (abk_id);

CREATE INDEX idx_logistics_returns_created_by ON public.logistics_returns USING btree (created_by);

CREATE INDEX finance_direct_purchases_date_idx ON public.finance_direct_purchases USING btree (purchase_date DESC);

CREATE INDEX bms_fk_logistics_equipment_purch_44a15923f8a5 ON public.logistics_equipment_purchases USING btree (item_id);

CREATE INDEX idx_recordings_feed_item_id ON public.recordings USING btree (feed_item_id);

CREATE INDEX idx_external_returns_source ON public.logistics_external_returns USING btree (external_shipment_id);

CREATE INDEX fx_trip_date_idx ON public.finance_expedition_trips USING btree (trip_date);

CREATE INDEX idx_visits_barn ON public.visits USING btree (barn_id);

CREATE INDEX idx_supplier_payments_supplier_date ON public.supplier_payments USING btree (supplier_id, paid_on);

CREATE INDEX logistics_company_feed_moveme_retained_feed_id_contract_ass_idx ON public.logistics_company_feed_movements USING btree (retained_feed_id, contract_assignment_id);

CREATE INDEX user_activity_logs_actor_idx ON public.user_activity_logs USING btree (actor, occurred_at DESC);

CREATE INDEX idx_logistics_returns_barn ON public.logistics_returns USING btree (barn_id);

CREATE INDEX idx_logistics_external_return_transfers_source_barn_id ON public.logistics_external_return_transfers USING btree (source_barn_id);

CREATE INDEX idx_prod_abk_result_sizes_header ON public.production_abk_result_sizes USING btree (result_id);

CREATE UNIQUE INDEX ux_logistics_contract_assignments_active_barn ON public.logistics_contract_assignments USING btree (barn_id) WHERE (active = true);

CREATE INDEX idx_lcaa_abk ON public.logistics_contract_assignment_abks USING btree (abk_id);

CREATE INDEX bms_fk_marketing_customers_bbcd2cf98bfc ON public.marketing_customers USING btree (created_by);

CREATE UNIQUE INDEX uq_chick_ins_contract_assignment ON public.chick_ins USING btree (contract_assignment_id) WHERE (contract_assignment_id IS NOT NULL);

CREATE INDEX finance_asset_purchase_invoices_date_idx ON public.finance_asset_purchase_invoices USING btree (purchase_date DESC);

CREATE INDEX idx_rhpp_real_cycle_id ON public.rhpp_real USING btree (cycle_id);

CREATE INDEX idx_bop_cycle_id ON public.bop USING btree (cycle_id);

CREATE INDEX bms_fk_finance_direct_purchases_f12625224c05 ON public.finance_direct_purchases USING btree (supplier_id);

CREATE INDEX warehouse_stock_items_created_by_idx ON public.warehouse_stock_items USING btree (created_by);

CREATE INDEX bms_fk_advances_9927eb2e3739 ON public.advances USING btree (barn_id);

CREATE UNIQUE INDEX barn_assets_reference_uidx ON public.barn_assets USING btree (reference) WHERE (reference IS NOT NULL);

CREATE INDEX idx_visits_cycle_id ON public.visits USING btree (cycle_id);

CREATE INDEX idx_supplies_contract_assignment_id ON public.supplies USING btree (contract_assignment_id);

CREATE INDEX idx_rhpp_system_final_barn_id ON public.rhpp_system_final USING btree (barn_id);

CREATE UNIQUE INDEX uq_recordings_assignment_date ON public.recordings USING btree (contract_assignment_id, recorded_on) WHERE (contract_assignment_id IS NOT NULL);

CREATE INDEX bms_fk_finance_direct_purchases_af07d64ebe3e ON public.finance_direct_purchases USING btree (contract_assignment_id);

CREATE INDEX finance_mandiri_supplier_payments_purchase_idx ON public.finance_mandiri_supplier_payments USING btree (purchase_id);

CREATE INDEX idx_external_return_transfer_source ON public.logistics_external_return_transfers USING btree (external_return_item_id);

CREATE INDEX bms_fk_supplier_payments_797c60019737 ON public.supplier_payments USING btree (barn_id);

CREATE INDEX bop_source_idx ON public.bop USING btree (source_type, source_id);

CREATE INDEX idx_supplies_created_by ON public.supplies USING btree (created_by);

CREATE INDEX warehouse_stock_shipments_item_idx ON public.warehouse_stock_shipments USING btree (stock_item_id);

CREATE INDEX warehouse_stock_items_invoice_idx ON public.warehouse_stock_items USING btree (invoice_id);

CREATE INDEX bms_fk_logistics_mitra_retained__fd86e91c70ce ON public.logistics_mitra_retained_feed USING btree (created_by);

CREATE INDEX user_activity_logs_occurred_at_idx ON public.user_activity_logs USING btree (occurred_at DESC);

CREATE INDEX bms_fk_finance_expedition_trip_d_0b5b7875ba73 ON public.finance_expedition_trip_destinations USING btree (destination_id);

CREATE INDEX idx_marketing_external_meat_date ON public.marketing_external_meat_purchases USING btree (purchase_date);

CREATE INDEX fx_bop_date_idx ON public.finance_expedition_bop USING btree (incurred_on);

CREATE INDEX idx_logistics_external_return_items_item_id ON public.logistics_external_return_items USING btree (item_id);

CREATE INDEX idx_barn_maintenance_assignment ON public.barn_maintenance_costs USING btree (contract_assignment_id);

CREATE INDEX idx_marketing_external_meat_supplier ON public.marketing_external_meat_purchases USING btree (supplier_id);

CREATE INDEX logistics_mitra_retained_feed_source_assignment_id_item_id_idx ON public.logistics_mitra_retained_feed USING btree (source_assignment_id, item_id);

CREATE INDEX bms_fk_logistics_mandiri_purchas_2cbe3978c297 ON public.logistics_mandiri_purchases USING btree (supplier_id);

CREATE INDEX idx_marketing_external_meat_barn ON public.marketing_external_meat_purchases USING btree (barn_id);

CREATE INDEX finance_direct_purchases_standard_name_idx ON public.finance_direct_purchases USING btree (lower(standard_name));

CREATE INDEX idx_abk_league_settings_updated_by ON public.abk_league_settings USING btree (updated_by);

CREATE INDEX finance_direct_purchases_barn_idx ON public.finance_direct_purchases USING btree (barn_id);

CREATE INDEX idx_logistics_shipments_created_by ON public.logistics_shipments USING btree (created_by);

CREATE INDEX bms_fk_barn_assets_ae76c961383b ON public.barn_assets USING btree (created_by);

CREATE INDEX bms_fk_rhpp_real_0a5ee09e0638 ON public.rhpp_real USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_external_return_items_external_return_id ON public.logistics_external_return_items USING btree (external_return_id);

CREATE INDEX barn_assets_barn_id_idx ON public.barn_assets USING btree (barn_id);

CREATE INDEX idx_prod_est_assignment ON public.production_estimates USING btree (contract_assignment_id);

CREATE INDEX idx_contracts_source_master_contract_id ON public.contracts USING btree (source_master_contract_id);

CREATE INDEX idx_bop_barn_id ON public.bop USING btree (barn_id);

CREATE INDEX production_mandiri_final_created_by_idx ON public.production_mandiri_final USING btree (created_by);

CREATE INDEX idx_external_returns_assignment ON public.logistics_external_returns USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_returns_assignment ON public.logistics_returns USING btree (contract_assignment_id);

CREATE INDEX finance_direct_purchases_type_idx ON public.finance_direct_purchases USING btree (purchase_type);

CREATE INDEX idx_rhpp_real_barn_id ON public.rhpp_real USING btree (barn_id);

CREATE INDEX idx_production_estimates_barn_id ON public.production_estimates USING btree (barn_id);

CREATE INDEX idx_external_items_header ON public.logistics_external_shipment_items USING btree (external_shipment_id);

CREATE INDEX idx_items_supplier_id ON public.items USING btree (supplier_id);

CREATE INDEX idx_abk_result_size_date ON public.production_abk_result_sizes USING btree (result_id, harvest_date);

CREATE INDEX idx_external_return_items_source ON public.logistics_external_return_items USING btree (external_shipment_item_id);

CREATE INDEX idx_contract_bonuses_contract_id ON public.contract_bonuses USING btree (contract_id);

CREATE INDEX idx_production_abk_results_created_by ON public.production_abk_results USING btree (created_by);

CREATE INDEX bms_fk_finance_expedition_bop_009a27931586 ON public.finance_expedition_bop USING btree (trip_id);

CREATE INDEX idx_harvests_cycle_id ON public.harvests USING btree (cycle_id);

CREATE INDEX idx_logistics_shipments_assignment ON public.logistics_shipments USING btree (contract_assignment_id);

CREATE INDEX idx_suppliers_supplier_type ON public.suppliers USING btree (supplier_type);

CREATE INDEX idx_rhpp_estimates_cycle_id ON public.rhpp_estimates USING btree (cycle_id);

CREATE INDEX idx_logistics_external_return_transfers_source_contract_assignm ON public.logistics_external_return_transfers USING btree (source_contract_assignment_id);

CREATE INDEX idx_mandiri_purchase_date ON public.logistics_mandiri_purchases USING btree (purchase_date);

CREATE INDEX idx_visits_assignment ON public.visits USING btree (contract_assignment_id);

CREATE UNIQUE INDEX one_open_cycle_per_barn ON public.cycles USING btree (barn_id) WHERE (state <> 'CLOSED'::public.cycle_state);

CREATE INDEX idx_logistics_contract_assignments_contract ON public.logistics_contract_assignments USING btree (master_contract_id);

CREATE INDEX idx_harvests_barn_id ON public.harvests USING btree (barn_id);

CREATE INDEX idx_expeditions_contract_assignment_id ON public.expeditions USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_contract_assignments_created_by ON public.logistics_contract_assignments USING btree (created_by);

CREATE INDEX idx_lcaa_assignment ON public.logistics_contract_assignment_abks USING btree (contract_assignment_id);

CREATE INDEX idx_external_items_item ON public.logistics_external_shipment_items USING btree (item_id);

CREATE INDEX idx_external_shipments_supplier ON public.logistics_external_shipments USING btree (supplier_id);

CREATE INDEX idx_rhpp_real_created_by ON public.rhpp_real USING btree (created_by);

CREATE INDEX idx_production_abk_results_barn_id ON public.production_abk_results USING btree (barn_id);

CREATE INDEX idx_chick_ins_barn_id ON public.chick_ins USING btree (barn_id);

CREATE INDEX idx_advances_employee_id ON public.advances USING btree (employee_id);

CREATE INDEX idx_expeditions_barn_id ON public.expeditions USING btree (barn_id);

CREATE INDEX warehouse_stock_shipments_date_idx ON public.warehouse_stock_shipments USING btree (shipment_date);

CREATE INDEX warehouse_stock_shipments_created_by_idx ON public.warehouse_stock_shipments USING btree (created_by);

CREATE UNIQUE INDEX uq_finance_expedition_bop_auto_trip_category ON public.finance_expedition_bop USING btree (trip_id, category) WHERE ((reference = 'AUTO_TRIP'::text) AND (trip_id IS NOT NULL));

CREATE INDEX idx_recordings_barn ON public.recordings USING btree (barn_id);

CREATE INDEX idx_logistics_return_items_item ON public.logistics_return_items USING btree (item_id);

CREATE INDEX barn_assets_acquired_on_idx ON public.barn_assets USING btree (acquired_on DESC);

CREATE INDEX idx_logistics_contract_assignments_ppl_id ON public.logistics_contract_assignments USING btree (ppl_id);

CREATE INDEX idx_prod_abk_result_assignment ON public.production_abk_results USING btree (contract_assignment_id);

CREATE INDEX idx_logistics_contract_assignments_start_date ON public.logistics_contract_assignments USING btree (start_date);

CREATE INDEX idx_cycles_ppl_id ON public.cycles USING btree (ppl_id);

CREATE INDEX bms_fk_logistics_mandiri_purchas_9c9182dca34e ON public.logistics_mandiri_purchases USING btree (item_id);

CREATE INDEX idx_expeditions_cycle_id ON public.expeditions USING btree (cycle_id);

CREATE INDEX idx_logistics_external_returns_supplier_id ON public.logistics_external_returns USING btree (supplier_id);

CREATE INDEX idx_marketing_contract_harvest_date ON public.marketing_contract_harvests USING btree (harvested_on);

CREATE INDEX idx_barn_maintenance_barn_date ON public.barn_maintenance_costs USING btree (barn_id, incurred_on);

CREATE INDEX salaries_assignment_idx ON public.abk_cycle_salaries USING btree (contract_assignment_id, abk_id);

CREATE INDEX idx_logistics_contract_assignments_abk_id ON public.logistics_contract_assignments USING btree (abk_id);

CREATE INDEX idx_external_shipments_barn ON public.logistics_external_shipments USING btree (barn_id);

CREATE INDEX finance_mandiri_receipt_harvest_idx ON public.finance_mandiri_sales_receipts USING btree (harvest_id);

CREATE TRIGGER guard_contracts BEFORE INSERT OR DELETE OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.audit_and_guard();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.chick_ins FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.recordings FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.visits FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.production_estimates FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.production_abk_results FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.marketing_contract_harvests FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_assignment_bop BEFORE INSERT OR DELETE OR UPDATE ON public.bop FOR EACH ROW EXECUTE FUNCTION private.guard_assignment_operation();

CREATE TRIGGER trg_bop_auto_reference BEFORE INSERT ON public.bop FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('BOP-KDG', 'incurred_on');

CREATE TRIGGER trg_reject_meat_purchase_in_bop BEFORE INSERT OR UPDATE ON public.bop FOR EACH ROW EXECUTE FUNCTION private.reject_meat_purchase_in_bop();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.marketing_external_meat_purchases FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_external_shipments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_external_returns FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER audit_cycles AFTER INSERT OR DELETE OR UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_items AFTER INSERT OR DELETE OR UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_company_profile AFTER INSERT OR DELETE OR UPDATE ON public.company_profile FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_employees AFTER INSERT OR DELETE OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_advances AFTER INSERT OR DELETE OR UPDATE ON public.advances FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER guard_live_prices BEFORE INSERT ON public.contract_live_prices FOR EACH ROW EXECUTE FUNCTION public.guard_contract_detail();

CREATE TRIGGER guard_bonuses BEFORE INSERT ON public.contract_bonuses FOR EACH ROW EXECUTE FUNCTION public.guard_contract_detail();

CREATE TRIGGER guard_standards BEFORE INSERT ON public.performance_standards FOR EACH ROW EXECUTE FUNCTION public.guard_contract_detail();

CREATE TRIGGER guard_barn_update BEFORE UPDATE ON public.barns FOR EACH ROW EXECUTE FUNCTION public.guard_barn_update();

CREATE TRIGGER audit_barns AFTER INSERT OR UPDATE ON public.barns FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER assign_master_auto_code BEFORE INSERT ON public.barns FOR EACH ROW EXECUTE FUNCTION public.assign_master_auto_code();

CREATE TRIGGER assign_master_auto_code BEFORE INSERT ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.assign_master_auto_code();

CREATE TRIGGER assign_master_auto_code BEFORE INSERT ON public.items FOR EACH ROW EXECUTE FUNCTION public.assign_master_auto_code();

CREATE TRIGGER assign_master_auto_code BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.assign_master_auto_code();

CREATE TRIGGER protect_master_auto_code BEFORE UPDATE OF code ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.protect_master_auto_code();

CREATE TRIGGER protect_master_auto_code BEFORE UPDATE OF code ON public.employees FOR EACH ROW EXECUTE FUNCTION public.protect_master_auto_code();

CREATE TRIGGER protect_master_auto_code BEFORE UPDATE OF code ON public.barns FOR EACH ROW EXECUTE FUNCTION public.protect_master_auto_code();

CREATE TRIGGER normalize_item_unit BEFORE INSERT OR UPDATE OF category, unit ON public.items FOR EACH ROW EXECUTE FUNCTION public.normalize_item_unit();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_mandiri_purchases FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER protect_master_auto_code BEFORE UPDATE OF code ON public.items FOR EACH ROW EXECUTE FUNCTION public.protect_master_auto_code();

CREATE TRIGGER protect_frozen_contract BEFORE DELETE OR UPDATE ON public.contracts FOR EACH ROW WHEN (((old.cycle_id IS NOT NULL) AND (old.frozen_at IS NOT NULL))) EXECUTE FUNCTION public.protect_frozen_contract();

CREATE TRIGGER protect_frozen_live_prices BEFORE DELETE OR UPDATE ON public.contract_live_prices FOR EACH ROW EXECUTE FUNCTION public.protect_frozen_contract_detail();

CREATE TRIGGER protect_frozen_bonuses BEFORE DELETE OR UPDATE ON public.contract_bonuses FOR EACH ROW EXECUTE FUNCTION public.protect_frozen_contract_detail();

CREATE TRIGGER protect_frozen_standards BEFORE DELETE OR UPDATE ON public.performance_standards FOR EACH ROW EXECUTE FUNCTION public.protect_frozen_contract_detail();

CREATE TRIGGER reassign_employee_code_on_kind_change BEFORE UPDATE OF kind ON public.employees FOR EACH ROW WHEN ((old.kind IS DISTINCT FROM new.kind)) EXECUTE FUNCTION public.reassign_employee_code_on_kind_change();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_equipment_purchases FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER prepare_logistics_contract_assignment BEFORE INSERT ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION public.prepare_logistics_contract_assignment();

CREATE TRIGGER prevent_employee_delete BEFORE DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.prevent_employee_delete();

CREATE TRIGGER guard_logistics_shipment_item BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_shipment_item();

CREATE TRIGGER guard_logistics_contract_close_prices BEFORE UPDATE OF active ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_contract_close_prices();

CREATE TRIGGER guard_logistics_return_item BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_return_items FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_return_item();

CREATE TRIGGER autofill_logistics_shipment_price BEFORE INSERT OR UPDATE OF shipment_id, item_id, unit_price ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION public.autofill_logistics_shipment_price();

CREATE TRIGGER autofill_logistics_return_price BEFORE INSERT OR UPDATE OF return_id, item_id, unit_price ON public.logistics_return_items FOR EACH ROW EXECUTE FUNCTION public.autofill_logistics_return_price();

CREATE TRIGGER trg_assign_supplier_code BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.assign_supplier_code();

CREATE TRIGGER trg_fill_external_shipment_quantity_kg BEFORE INSERT OR UPDATE OF item_id, quantity ON public.logistics_external_shipment_items FOR EACH ROW EXECUTE FUNCTION public.fill_external_shipment_quantity_kg();

CREATE TRIGGER trg_guard_logistics_external_item BEFORE INSERT OR UPDATE ON public.logistics_external_shipment_items FOR EACH ROW EXECUTE FUNCTION private.guard_logistics_external_item();

CREATE TRIGGER trg_guard_item_supplier_type BEFORE INSERT OR UPDATE OF supplier_id ON public.items FOR EACH ROW EXECUTE FUNCTION private.guard_item_supplier_type();

CREATE TRIGGER trg_barn_assets_reference BEFORE INSERT ON public.barn_assets FOR EACH ROW EXECUTE FUNCTION public.set_barn_asset_reference();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.logistics_contract_assignment_abks FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_prevent_locked_abk_basics_change BEFORE UPDATE ON public.logistics_contract_assignment_abks FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_abk_basics_change();

CREATE TRIGGER trg_guard_logistics_assignment_close BEFORE UPDATE OF active ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION private.guard_logistics_assignment_close();

CREATE TRIGGER bms_guard_contract_assignment_state BEFORE UPDATE ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION private.guard_contract_assignment_state();

CREATE TRIGGER trg_guard_frozen_contract BEFORE DELETE OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_frozen_contract();

CREATE TRIGGER trg_guard_frozen_contract_live_prices BEFORE INSERT OR DELETE OR UPDATE ON public.contract_live_prices FOR EACH ROW EXECUTE FUNCTION public.guard_frozen_contract_child();

CREATE TRIGGER trg_guard_frozen_contract_bonuses BEFORE INSERT OR DELETE OR UPDATE ON public.contract_bonuses FOR EACH ROW EXECUTE FUNCTION public.guard_frozen_contract_child();

CREATE TRIGGER trg_guard_frozen_performance_standards BEFORE INSERT OR DELETE OR UPDATE ON public.performance_standards FOR EACH ROW EXECUTE FUNCTION public.guard_frozen_contract_child();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION private.reject_closed_logistics_child_write();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_return_items FOR EACH ROW EXECUTE FUNCTION private.reject_closed_logistics_child_write();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_shipment_items FOR EACH ROW EXECUTE FUNCTION private.reject_closed_logistics_child_write();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_return_items FOR EACH ROW EXECUTE FUNCTION private.reject_closed_logistics_child_write();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.production_estimate_sizes FOR EACH ROW EXECUTE FUNCTION private.reject_closed_production_child_write();

CREATE TRIGGER bms_lock_closed_assignment_child BEFORE INSERT OR DELETE OR UPDATE ON public.production_abk_result_sizes FOR EACH ROW EXECUTE FUNCTION private.reject_closed_production_child_write();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_contract_assignment_abks FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_validate_assignment_ppl BEFORE INSERT OR UPDATE OF ppl_id ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION private.validate_assignment_ppl();

CREATE TRIGGER trg_sync_bop_assignment_barn BEFORE INSERT OR UPDATE OF contract_assignment_id ON public.bop FOR EACH ROW EXECUTE FUNCTION private.sync_bop_assignment_barn();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.chick_ins FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER compute_chickin_avg_weight BEFORE INSERT OR UPDATE OF sample_count, sample_weight_total_g ON public.chick_ins FOR EACH ROW EXECUTE FUNCTION public.compute_chickin_avg_weight();

CREATE TRIGGER trg_guard_chick_in_contract BEFORE INSERT OR DELETE OR UPDATE ON public.chick_ins FOR EACH ROW EXECUTE FUNCTION private.guard_chick_in_contract();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.expeditions FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_assignment_expeditions BEFORE INSERT OR DELETE OR UPDATE ON public.expeditions FOR EACH ROW EXECUTE FUNCTION private.guard_assignment_operation();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.harvests FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_assignment_harvests BEFORE INSERT OR DELETE OR UPDATE ON public.harvests FOR EACH ROW EXECUTE FUNCTION private.guard_assignment_operation();

CREATE TRIGGER bms_lock_closed_transfer BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_return_transfers FOR EACH ROW EXECUTE FUNCTION private.reject_closed_transfer_write();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_returns FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_shipments FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_logistics_external_header BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_external_shipments FOR EACH ROW EXECUTE FUNCTION private.guard_logistics_external_header();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER guard_logistics_return BEFORE INSERT OR UPDATE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_return();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER guard_logistics_shipment BEFORE INSERT OR UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_shipment();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.production_abk_results FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_production_abk_result BEFORE INSERT OR DELETE OR UPDATE ON public.production_abk_results FOR EACH ROW EXECUTE FUNCTION private.guard_production_abk_result();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.production_estimates FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_marketing_meat BEFORE INSERT OR DELETE OR UPDATE ON public.marketing_external_meat_purchases FOR EACH ROW EXECUTE FUNCTION private.guard_marketing_meat();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.marketing_external_meat_purchases FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_marketing_harvest BEFORE INSERT OR DELETE OR UPDATE ON public.marketing_contract_harvests FOR EACH ROW EXECUTE FUNCTION private.guard_marketing_harvest();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.marketing_contract_harvests FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_production_estimate BEFORE INSERT OR DELETE OR UPDATE ON public.production_estimates FOR EACH ROW EXECUTE FUNCTION private.guard_production_estimate();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER compute_recording_avg_weight BEFORE INSERT OR UPDATE OF sample_count, sample_weight_total_kg ON public.recordings FOR EACH ROW EXECUTE FUNCTION public.compute_recording_avg_weight();

CREATE TRIGGER compute_recording_feed_kg BEFORE INSERT OR UPDATE OF feed_item_id, feed_bags_out ON public.recordings FOR EACH ROW EXECUTE FUNCTION public.compute_recording_feed_kg();

CREATE TRIGGER trg_guard_production_recording BEFORE INSERT OR DELETE OR UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION private.guard_production_recording();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.rhpp_estimates FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_assignment_rhpp_estimates BEFORE INSERT OR DELETE OR UPDATE ON public.rhpp_estimates FOR EACH ROW EXECUTE FUNCTION private.guard_assignment_operation();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER compute_supply_quantity_kg BEFORE INSERT OR UPDATE OF item_id, quantity ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.compute_supply_quantity_kg();

CREATE TRIGGER trg_assignment_supplies BEFORE INSERT OR DELETE OR UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION private.guard_assignment_operation();

CREATE TRIGGER bms_lock_closed_assignment BEFORE INSERT OR DELETE OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION private.reject_closed_assignment_write();

CREATE TRIGGER trg_guard_production_visit BEFORE INSERT OR DELETE OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION private.guard_production_visit();

CREATE TRIGGER trg_bop_outside_auto_reference BEFORE INSERT ON public.bop_outside FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('BOP-UMUM', 'incurred_on');

CREATE TRIGGER trg_advances_auto_reference BEFORE INSERT ON public.advances FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('KASBON', 'advanced_on');

CREATE TRIGGER trg_advance_payments_auto_reference BEFORE INSERT ON public.advance_payments FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('CICILAN', 'paid_on');

CREATE TRIGGER trg_abk_salary_auto_reference BEFORE INSERT ON public.abk_cycle_salaries FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('GAJI-ABK', 'paid_on');

CREATE TRIGGER trg_rhpp_real_auto_reference BEFORE INSERT ON public.rhpp_real FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('RHPP-REAL', 'received_on');

CREATE TRIGGER trg_fx_trip_auto_reference BEFORE INSERT ON public.finance_expedition_trips FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('TRIP-EXP', 'trip_date');

CREATE TRIGGER trg_fx_payment_auto_reference BEFORE INSERT ON public.finance_expedition_payments FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('PAY-EXP', 'paid_on');

CREATE TRIGGER trg_fx_bop_auto_reference BEFORE INSERT ON public.finance_expedition_bop FOR EACH ROW EXECUTE FUNCTION public.finance_auto_reference_trigger('BOP-EXP', 'incurred_on');

CREATE TRIGGER trg_assignment_rhpp_real BEFORE INSERT OR DELETE OR UPDATE ON public.rhpp_real FOR EACH ROW EXECUTE FUNCTION private.guard_rhpp_real_operation();

CREATE TRIGGER audit_logistics_mandiri_purchases AFTER INSERT OR DELETE OR UPDATE ON public.logistics_mandiri_purchases FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_logistics_mandiri_purchase_allocations AFTER INSERT OR DELETE OR UPDATE ON public.logistics_mandiri_purchase_allocations FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER audit_marketing_customers AFTER INSERT OR DELETE OR UPDATE ON public.marketing_customers FOR EACH ROW EXECUTE FUNCTION public.audit_master_change();

CREATE TRIGGER guard_split_return_header BEFORE DELETE OR UPDATE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION public.guard_split_return();

CREATE TRIGGER guard_split_return_line BEFORE DELETE OR UPDATE ON public.logistics_return_items FOR EACH ROW EXECUTE FUNCTION public.guard_split_return();

CREATE TRIGGER guard_paid_mandiri_harvest BEFORE DELETE OR UPDATE ON public.marketing_contract_harvests FOR EACH ROW EXECUTE FUNCTION public.guard_paid_mandiri_harvest();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.bop FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.bop_outside FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.barn_maintenance_costs FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_expedition_trips FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_expedition_invoices FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_expedition_payments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_expedition_bop FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_expedition_maintenance FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.advances FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.advance_payments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_mandiri_sales_receipts FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.finance_mandiri_supplier_payments FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.abk_cycle_salaries FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER trg_admin_only_delete BEFORE DELETE ON public.rhpp_real FOR EACH ROW EXECUTE FUNCTION private.admin_only_transaction_delete();

CREATE TRIGGER guard_audit_immutable BEFORE DELETE OR UPDATE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION private.guard_audit_immutable();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.chick_ins FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.harvests FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER a_guard_payment_integrity BEFORE INSERT OR DELETE OR UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION private.guard_payment_integrity();

CREATE TRIGGER a_guard_payment_integrity BEFORE INSERT OR DELETE OR UPDATE ON public.finance_mandiri_sales_receipts FOR EACH ROW EXECUTE FUNCTION private.guard_payment_integrity();

CREATE TRIGGER a_guard_payment_integrity BEFORE INSERT OR DELETE OR UPDATE ON public.finance_mandiri_supplier_payments FOR EACH ROW EXECUTE FUNCTION private.guard_payment_integrity();

CREATE TRIGGER a_guard_payment_integrity BEFORE INSERT OR DELETE OR UPDATE ON public.advance_payments FOR EACH ROW EXECUTE FUNCTION private.guard_payment_integrity();

CREATE TRIGGER a_guard_payment_integrity BEFORE INSERT OR DELETE OR UPDATE ON public.finance_expedition_payments FOR EACH ROW EXECUTE FUNCTION private.guard_payment_integrity();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.barn_maintenance_costs FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expedition_customers FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expedition_drivers FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expedition_vehicles FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_feed_stock_adjustments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_mitra_retained_feed FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expedition_routes FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_bop_period_access FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.barn_assets FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_asset_purchase_invoices FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_company_feed_movements FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_trip_destinations FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_equipment_purchases FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_direct_purchases FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_stock_purchase_invoices FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.performance_standards FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expeditions FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.contract_live_prices FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.contract_bonuses FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.recording_weight_samples FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.rhpp_estimates FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_return_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.marketing_contract_harvests FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.bop_outside FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.bop FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_invoices FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_invoice_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_payments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_bop FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.expedition_destinations FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_mandiri_sales_receipts FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.rhpp_real FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_mandiri_final FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_contract_assignments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_maintenance FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_shipment_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_returns FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_external_shipments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_external_shipment_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_contract_assignment_abks FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_estimates FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_estimate_sizes FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_abk_results FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.production_abk_result_sizes FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_external_returns FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_external_return_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.logistics_external_return_transfers FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.marketing_external_meat_purchases FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.abk_league_settings FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.advance_payments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.rhpp_system_final FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.abk_cycle_salaries FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_expedition_trips FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.finance_mandiri_supplier_payments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.warehouse_stock_items FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

CREATE TRIGGER z_audit_transaction_change AFTER INSERT OR DELETE OR UPDATE ON public.warehouse_stock_shipments FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

ALTER TABLE "bms_backup"."daily_snapshots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "bms_backup"."download_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "private"."bms_operation_receipts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "private"."bms_rpc_allowlist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."abk_cycle_salaries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."abk_league_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."advance_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."advances" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."barn_assets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."barn_maintenance_costs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."barns" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bop" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bop_outside" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chick_ins" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."company_profile" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."contract_bonuses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."contract_live_prices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cycles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expedition_customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expedition_destinations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expedition_drivers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expedition_routes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expedition_vehicles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."expeditions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_asset_purchase_invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_bop_period_access" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_direct_purchases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_bop" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_invoice_counters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_invoice_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_maintenance" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_trip_destinations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_expedition_trips" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_mandiri_sales_receipts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_mandiri_supplier_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_reference_counters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."finance_stock_purchase_invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."harvests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_company_feed_movements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_contract_assignment_abks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_contract_assignments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_equipment_purchases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_external_return_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_external_return_transfers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_external_returns" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_external_shipment_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_external_shipments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_mandiri_purchase_allocations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_mandiri_purchases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_mitra_retained_feed" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_return_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_returns" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipment_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."logistics_shipments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."marketing_contract_harvests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."marketing_customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."marketing_external_meat_purchases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."performance_standards" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_abk_result_sizes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_abk_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_estimate_sizes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_estimates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_feed_stock_adjustments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."production_mandiri_final" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."recording_weight_samples" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."recordings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rhpp_estimates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rhpp_real" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rhpp_system_final" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."supplies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_activity_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."visits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."warehouse_stock_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."warehouse_stock_shipments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bms_delete" ON "public"."logistics_external_returns" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."marketing_contract_harvests" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."finance_asset_purchase_invoices" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."company_profile" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."company_profile" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."company_profile" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."company_profile" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."logistics_equipment_purchases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_equipment_purchases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."logistics_equipment_purchases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."logistics_equipment_purchases" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."rhpp_real" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'OWNER'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."suppliers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."rhpp_estimates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."suppliers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."suppliers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."finance_mandiri_supplier_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."supplies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."supplies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."supplies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."supplies" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."rhpp_estimates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."rhpp_estimates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."rhpp_estimates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."logistics_returns" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."abk_league_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() IS NOT NULL) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."abk_league_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."abk_league_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role))) WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."abk_league_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."logistics_return_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'PPL'::public.bms_role) AND (EXISTS ( SELECT 1
   FROM public.logistics_returns r
  WHERE ((r.id = logistics_return_items.return_id) AND private.can_read_assignment(r.contract_assignment_id))))) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_return_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_returns r
     JOIN public.logistics_contract_assignments a ON ((a.id = r.contract_assignment_id)))
  WHERE ((r.id = logistics_return_items.return_id) AND (a.active = true)))))));

CREATE POLICY "bms_update" ON "public"."logistics_return_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_returns r
     JOIN public.logistics_contract_assignments a ON ((a.id = r.contract_assignment_id)))
  WHERE ((r.id = logistics_return_items.return_id) AND (a.active = true))))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."logistics_return_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_returns r
     JOIN public.logistics_contract_assignments a ON ((a.id = r.contract_assignment_id)))
  WHERE ((r.id = logistics_return_items.return_id) AND (a.active = true)))))));

CREATE POLICY "bms_select" ON "public"."logistics_contract_assignment_abks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_contract_assignments a
  WHERE ((a.id = logistics_contract_assignment_abks.contract_assignment_id) AND private.can_read_assignment(a.id))))));

CREATE POLICY "bms_insert" ON "public"."logistics_contract_assignment_abks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (p.active = true) AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))) AND (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = logistics_contract_assignment_abks.abk_id) AND (e.kind = 'ABK'::text) AND (e.active = true)))))));

CREATE POLICY "bms_update" ON "public"."logistics_contract_assignment_abks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (p.active = true) AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = logistics_contract_assignment_abks.abk_id) AND (e.kind = 'ABK'::text) AND (e.active = true))))));

CREATE POLICY "bms_delete" ON "public"."logistics_contract_assignment_abks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."expedition_vehicles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."expedition_vehicles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."expedition_vehicles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."expedition_vehicles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."recording_weight_samples" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.recordings r
  WHERE ((r.id = recording_weight_samples.recording_id) AND private.can_read_assignment(r.contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))))));

CREATE POLICY "bms_insert" ON "public"."recording_weight_samples" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.recordings r
  WHERE ((r.id = recording_weight_samples.recording_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_update" ON "public"."recording_weight_samples" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.recordings r
  WHERE ((r.id = recording_weight_samples.recording_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.recordings r
  WHERE ((r.id = recording_weight_samples.recording_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_delete" ON "public"."recording_weight_samples" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.recordings r
  WHERE ((r.id = recording_weight_samples.recording_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."finance_bop_period_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."warehouse_stock_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."advance_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."advance_payments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."advance_payments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."advance_payments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."production_abk_results" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."production_abk_results" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."production_abk_results" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."production_abk_results" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'LOGISTIK'::public.bms_role) AND (active = true) AND (role = 'PPL'::public.bms_role)) OR ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))));

CREATE POLICY "bms_insert" ON "public"."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_insert" ON "public"."logistics_external_shipments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."chick_ins" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."chick_ins" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."chick_ins" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."chick_ins" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."logistics_external_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."logistics_external_shipments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."logistics_external_shipments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."rhpp_system_final" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND ((p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR ((p.role = 'PPL'::public.bms_role) AND (EXISTS ( SELECT 1
           FROM public.logistics_contract_assignments a
          WHERE ((a.id = rhpp_system_final.contract_assignment_id) AND (a.ppl_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))))));

CREATE POLICY "bms_select" ON "public"."marketing_external_meat_purchases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."marketing_external_meat_purchases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."marketing_external_meat_purchases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."marketing_external_meat_purchases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."recordings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."recordings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."recordings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."recordings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."logistics_external_returns" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_external_returns" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

CREATE POLICY "bms_update" ON "public"."logistics_external_returns" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."expedition_drivers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."expedition_drivers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."expedition_drivers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."expedition_drivers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."finance_reference_counters" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."cycles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'OWNER'::public.bms_role, 'KEUANGAN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'MARKETING'::public.bms_role])) OR ((private.my_bms_role() = 'PPL'::public.bms_role) AND (ppl_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));

CREATE POLICY "bms_insert" ON "public"."cycles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."cycles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."cycles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'PPL'::public.bms_role) AND (EXISTS ( SELECT 1
   FROM public.logistics_shipments s
  WHERE ((s.id = logistics_shipment_items.shipment_id) AND private.can_read_assignment(s.contract_assignment_id))))) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_shipments s
     JOIN public.logistics_contract_assignments a ON ((a.id = s.contract_assignment_id)))
  WHERE ((s.id = logistics_shipment_items.shipment_id) AND (a.active = true)))))));

CREATE POLICY "bms_update" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_shipments s
     JOIN public.logistics_contract_assignments a ON ((a.id = s.contract_assignment_id)))
  WHERE ((s.id = logistics_shipment_items.shipment_id) AND (a.active = true))))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."logistics_shipment_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM (public.logistics_shipments s
     JOIN public.logistics_contract_assignments a ON ((a.id = s.contract_assignment_id)))
  WHERE ((s.id = logistics_shipment_items.shipment_id) AND (a.active = true)))))));

CREATE POLICY "bms_select" ON "public"."harvests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])))));

CREATE POLICY "bms_select" ON "public"."production_abk_result_sizes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_abk_results r
  WHERE ((r.id = production_abk_result_sizes.result_id) AND private.can_read_assignment(r.contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))))));

CREATE POLICY "bms_insert" ON "public"."production_abk_result_sizes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_abk_results r
  WHERE ((r.id = production_abk_result_sizes.result_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_update" ON "public"."production_abk_result_sizes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_abk_results r
  WHERE ((r.id = production_abk_result_sizes.result_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_abk_results r
  WHERE ((r.id = production_abk_result_sizes.result_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_delete" ON "public"."production_abk_result_sizes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_abk_results r
  WHERE ((r.id = production_abk_result_sizes.result_id) AND private.can_edit_assignment(r.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_insert" ON "public"."harvests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."finance_direct_purchases" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_insert" ON "public"."finance_direct_purchases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."expedition_destinations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."expedition_destinations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."expedition_destinations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."expedition_destinations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."harvests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."harvests" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."contract_live_prices" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."contract_live_prices" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'ADMIN'::public.bms_role) AND (EXISTS ( SELECT 1
   FROM public.contracts k
  WHERE (k.id = contract_live_prices.contract_id))))));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_invoice_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."contract_live_prices" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."contract_live_prices" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."finance_expedition_invoice_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_invoice_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_invoice_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."production_estimate_sizes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_estimates e
  WHERE ((e.id = production_estimate_sizes.estimate_id) AND private.can_read_assignment(e.contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'MARKETING'::public.bms_role, 'OWNER'::public.bms_role])))))));

CREATE POLICY "bms_insert" ON "public"."production_estimate_sizes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_estimates e
  WHERE ((e.id = production_estimate_sizes.estimate_id) AND private.can_edit_assignment(e.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_update" ON "public"."production_estimate_sizes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_estimates e
  WHERE ((e.id = production_estimate_sizes.estimate_id) AND private.can_edit_assignment(e.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_estimates e
  WHERE ((e.id = production_estimate_sizes.estimate_id) AND private.can_edit_assignment(e.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_delete" ON "public"."production_estimate_sizes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.production_estimates e
  WHERE ((e.id = production_estimate_sizes.estimate_id) AND private.can_edit_assignment(e.contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))))));

CREATE POLICY "bms_update" ON "public"."marketing_contract_harvests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."audit_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."expedition_customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."expedition_customers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."expedition_customers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."expedition_customers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."marketing_contract_harvests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'PPL'::public.bms_role) AND private.can_read_assignment(contract_assignment_id)))));

CREATE POLICY "bms_insert" ON "public"."marketing_contract_harvests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."finance_stock_purchase_invoices" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."user_activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."logistics_external_shipment_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_shipments h
  WHERE ((h.id = logistics_external_shipment_items.external_shipment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])))))));

CREATE POLICY "bms_insert" ON "public"."logistics_external_shipment_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_shipments h
  WHERE ((h.id = logistics_external_shipment_items.external_shipment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_update" ON "public"."logistics_external_shipment_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_shipments h
  WHERE ((h.id = logistics_external_shipment_items.external_shipment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_shipments h
  WHERE ((h.id = logistics_external_shipment_items.external_shipment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_delete" ON "public"."logistics_external_shipment_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_shipments h
  WHERE ((h.id = logistics_external_shipment_items.external_shipment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_select" ON "public"."barn_maintenance_costs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_insert" ON "public"."barn_maintenance_costs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (contract_assignment_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.barns b
  WHERE (b.id = barn_maintenance_costs.barn_id)))));

CREATE POLICY "bms_update" ON "public"."barn_maintenance_costs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (contract_assignment_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.barns b
  WHERE (b.id = barn_maintenance_costs.barn_id)))));

CREATE POLICY "bms_delete" ON "public"."barn_maintenance_costs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."employees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'LOGISTIK'::public.bms_role) AND (active = true) AND (kind = 'ABK'::text)) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."employees" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."employees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."employees" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."logistics_company_feed_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'PPL'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_insert" ON "public"."expeditions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'MARKETING'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."logistics_mandiri_purchases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_mandiri_purchases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."logistics_mandiri_purchases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."logistics_mandiri_purchases" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."finance_mandiri_sales_receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))))));

CREATE POLICY "bms_select" ON "public"."expeditions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'MARKETING'::public.bms_role])))));

CREATE POLICY "bms_update" ON "public"."expeditions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."expeditions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."barns" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."barns" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."barns" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role))) WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."barns" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."contract_bonuses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."contract_bonuses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'ADMIN'::public.bms_role) AND (EXISTS ( SELECT 1
   FROM public.contracts k
  WHERE (k.id = contract_bonuses.contract_id))))));

CREATE POLICY "bms_update" ON "public"."logistics_returns" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."contract_bonuses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."contract_bonuses" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."supplier_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_insert" ON "public"."supplier_payments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."supplier_payments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."logistics_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'PPL'::public.bms_role) AND private.can_read_assignment(contract_assignment_id)) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."contracts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."contracts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_update" ON "public"."contracts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."contracts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."abk_cycle_salaries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."finance_expedition_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_payments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_payments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_payments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."bop" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'OWNER'::public.bms_role, 'KEUANGAN'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."bop" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.logistics_contract_assignments a
  WHERE (a.id = bop.contract_assignment_id))))));

CREATE POLICY "bms_update" ON "public"."bop" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.logistics_contract_assignments a
  WHERE (a.id = bop.contract_assignment_id)))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.logistics_contract_assignments a
  WHERE (a.id = bop.contract_assignment_id))))));

CREATE POLICY "bms_delete" ON "public"."bop" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."finance_expedition_trip_destinations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_trip_destinations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_trip_destinations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_trip_destinations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_insert" ON "public"."logistics_shipments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

CREATE POLICY "bms_update" ON "public"."logistics_shipments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."logistics_shipments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."abk_cycle_salaries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) AND private.can_read_assignment(contract_assignment_id))));

CREATE POLICY "bms_insert" ON "public"."abk_cycle_salaries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((private.my_bms_role() = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.logistics_contract_assignment_abks l
  WHERE ((l.contract_assignment_id = abk_cycle_salaries.contract_assignment_id) AND (l.abk_id = abk_cycle_salaries.abk_id)))))));

CREATE POLICY "bms_update" ON "public"."abk_cycle_salaries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."production_estimates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'MARKETING'::public.bms_role, 'OWNER'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."production_estimates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."production_estimates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."production_estimates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_select" ON "public"."logistics_returns" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'PPL'::public.bms_role) AND private.can_read_assignment(contract_assignment_id)) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_returns" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

CREATE POLICY "bms_select" ON "public"."logistics_contract_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'MARKETING'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'PPL'::public.bms_role) AND (ppl_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))));

CREATE POLICY "bms_insert" ON "public"."logistics_contract_assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

CREATE POLICY "bms_update" ON "public"."logistics_contract_assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'LOGISTIK'::public.bms_role) AND (active = true))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = 'LOGISTIK'::public.bms_role) AND (active = true)))));

CREATE POLICY "bms_delete" ON "public"."logistics_contract_assignments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."finance_expedition_trips" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_trips" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_trips" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_trips" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."advances" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."advances" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."advances" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."advances" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."logistics_external_return_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_returns r
  WHERE ((r.id = logistics_external_return_items.external_return_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])))))));

CREATE POLICY "bms_insert" ON "public"."logistics_external_return_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_returns r
  WHERE ((r.id = logistics_external_return_items.external_return_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_update" ON "public"."logistics_external_return_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_returns r
  WHERE ((r.id = logistics_external_return_items.external_return_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_returns r
  WHERE ((r.id = logistics_external_return_items.external_return_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_delete" ON "public"."logistics_external_return_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (EXISTS ( SELECT 1
   FROM public.logistics_external_returns r
  WHERE ((r.id = logistics_external_return_items.external_return_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])))))));

CREATE POLICY "bms_select" ON "public"."logistics_mitra_retained_feed" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'PPL'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."marketing_customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."marketing_customers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."marketing_customers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."marketing_customers" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'MARKETING'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."finance_expedition_maintenance" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_maintenance" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_maintenance" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_maintenance" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."visits" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.can_read_assignment(contract_assignment_id) AND (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role, 'OWNER'::public.bms_role])))));

CREATE POLICY "bms_insert" ON "public"."visits" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."visits" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR private.can_edit_assignment(contract_assignment_id, ARRAY['ADMIN'::public.bms_role, 'PPL'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."visits" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."expedition_routes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."bop_outside" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."bop_outside" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."bop_outside" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_delete" ON "public"."bop_outside" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."expedition_routes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_insert" ON "public"."expedition_routes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_update" ON "public"."expedition_routes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = 'ADMIN'::public.bms_role)) WITH CHECK ((private.my_bms_role() = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."barn_assets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = 'LOGISTIK'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."barn_assets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.barns b
  WHERE (b.id = barn_assets.barn_id)))));

CREATE POLICY "bms_update" ON "public"."barn_assets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])) AND (EXISTS ( SELECT 1
   FROM public.barns b
  WHERE (b.id = barn_assets.barn_id)))));

CREATE POLICY "bms_delete" ON "public"."barn_assets" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."warehouse_stock_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND (p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'LOGISTIK'::public.bms_role]))))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_invoices" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."logistics_external_return_transfers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_external_return_transfers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])) AND (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

CREATE POLICY "bms_update" ON "public"."logistics_external_return_transfers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role)) WITH CHECK ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_delete" ON "public"."logistics_external_return_transfers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (( SELECT private.my_bms_role() AS my_bms_role) = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_select" ON "public"."finance_expedition_invoices" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_update" ON "public"."finance_expedition_invoices" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_invoices" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."logistics_mandiri_purchase_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM public.logistics_mandiri_purchases p
  WHERE ((p.id = logistics_mandiri_purchase_allocations.purchase_id) AND (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role]))))) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."logistics_mandiri_purchase_allocations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."logistics_mandiri_purchase_allocations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."logistics_mandiri_purchase_allocations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'LOGISTIK'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."finance_expedition_bop" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR (private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))));

CREATE POLICY "bms_insert" ON "public"."finance_expedition_bop" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_update" ON "public"."finance_expedition_bop" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role]))) WITH CHECK ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_delete" ON "public"."finance_expedition_bop" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.my_bms_role() = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role])));

CREATE POLICY "bms_select" ON "public"."performance_standards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() IS NOT NULL)));

CREATE POLICY "bms_insert" ON "public"."performance_standards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR ((private.my_bms_role() = 'ADMIN'::public.bms_role) AND (EXISTS ( SELECT 1
   FROM public.contracts k
  WHERE (k.id = performance_standards.contract_id))))));

CREATE POLICY "bms_update" ON "public"."performance_standards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role))) WITH CHECK (((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role) OR (private.my_bms_role() = 'ADMIN'::public.bms_role)));

CREATE POLICY "bms_delete" ON "public"."performance_standards" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT private.my_bms_role() AS my_bms_role) = 'ADMIN'::public.bms_role));

CREATE POLICY "bms_select" ON "public"."production_mandiri_final" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND p.active AND ((p.role = ANY (ARRAY['ADMIN'::public.bms_role, 'KEUANGAN'::public.bms_role, 'OWNER'::public.bms_role])) OR ((p.role = 'PPL'::public.bms_role) AND (EXISTS ( SELECT 1
           FROM public.logistics_contract_assignments a
          WHERE ((a.id = production_mandiri_final.contract_assignment_id) AND (a.ppl_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))))));

REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA "private" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA "bms_backup" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "bms_backup" FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA "public" TO authenticated, service_role;

GRANT USAGE ON SCHEMA "private" TO authenticated, service_role;

GRANT INSERT ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT SELECT ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT UPDATE ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT DELETE ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT REFERENCES ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT TRIGGER ON "public"."barn_maintenance_costs" TO "authenticated";

GRANT INSERT ON "public"."barn_maintenance_costs" TO "service_role";

GRANT SELECT ON "public"."barn_maintenance_costs" TO "service_role";

GRANT UPDATE ON "public"."barn_maintenance_costs" TO "service_role";

GRANT DELETE ON "public"."barn_maintenance_costs" TO "service_role";

GRANT TRUNCATE ON "public"."barn_maintenance_costs" TO "service_role";

GRANT REFERENCES ON "public"."barn_maintenance_costs" TO "service_role";

GRANT TRIGGER ON "public"."barn_maintenance_costs" TO "service_role";

GRANT INSERT ON "public"."expedition_customers" TO "authenticated";

GRANT SELECT ON "public"."expedition_customers" TO "authenticated";

GRANT UPDATE ON "public"."expedition_customers" TO "authenticated";

GRANT DELETE ON "public"."expedition_customers" TO "authenticated";

GRANT REFERENCES ON "public"."expedition_customers" TO "authenticated";

GRANT TRIGGER ON "public"."expedition_customers" TO "authenticated";

GRANT INSERT ON "public"."expedition_customers" TO "service_role";

GRANT SELECT ON "public"."expedition_customers" TO "service_role";

GRANT UPDATE ON "public"."expedition_customers" TO "service_role";

GRANT DELETE ON "public"."expedition_customers" TO "service_role";

GRANT TRUNCATE ON "public"."expedition_customers" TO "service_role";

GRANT REFERENCES ON "public"."expedition_customers" TO "service_role";

GRANT TRIGGER ON "public"."expedition_customers" TO "service_role";

GRANT INSERT ON "public"."expedition_drivers" TO "authenticated";

GRANT SELECT ON "public"."expedition_drivers" TO "authenticated";

GRANT UPDATE ON "public"."expedition_drivers" TO "authenticated";

GRANT DELETE ON "public"."expedition_drivers" TO "authenticated";

GRANT REFERENCES ON "public"."expedition_drivers" TO "authenticated";

GRANT TRIGGER ON "public"."expedition_drivers" TO "authenticated";

GRANT INSERT ON "public"."expedition_drivers" TO "service_role";

GRANT SELECT ON "public"."expedition_drivers" TO "service_role";

GRANT UPDATE ON "public"."expedition_drivers" TO "service_role";

GRANT DELETE ON "public"."expedition_drivers" TO "service_role";

GRANT TRUNCATE ON "public"."expedition_drivers" TO "service_role";

GRANT REFERENCES ON "public"."expedition_drivers" TO "service_role";

GRANT TRIGGER ON "public"."expedition_drivers" TO "service_role";

GRANT INSERT ON "public"."expedition_vehicles" TO "authenticated";

GRANT SELECT ON "public"."expedition_vehicles" TO "authenticated";

GRANT UPDATE ON "public"."expedition_vehicles" TO "authenticated";

GRANT DELETE ON "public"."expedition_vehicles" TO "authenticated";

GRANT REFERENCES ON "public"."expedition_vehicles" TO "authenticated";

GRANT TRIGGER ON "public"."expedition_vehicles" TO "authenticated";

GRANT INSERT ON "public"."expedition_vehicles" TO "service_role";

GRANT SELECT ON "public"."expedition_vehicles" TO "service_role";

GRANT UPDATE ON "public"."expedition_vehicles" TO "service_role";

GRANT DELETE ON "public"."expedition_vehicles" TO "service_role";

GRANT TRUNCATE ON "public"."expedition_vehicles" TO "service_role";

GRANT REFERENCES ON "public"."expedition_vehicles" TO "service_role";

GRANT TRIGGER ON "public"."expedition_vehicles" TO "service_role";

GRANT INSERT ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT SELECT ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT UPDATE ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT DELETE ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT TRUNCATE ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT REFERENCES ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT TRIGGER ON "public"."production_feed_stock_adjustments" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_invoice_counters" TO "service_role";

GRANT INSERT ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT SELECT ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT UPDATE ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT DELETE ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT REFERENCES ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT TRIGGER ON "public"."logistics_mitra_retained_feed" TO "service_role";

GRANT SELECT ON "public"."logistics_mitra_retained_feed" TO "authenticated";

GRANT INSERT ON "public"."finance_reference_counters" TO "anon";

GRANT SELECT ON "public"."finance_reference_counters" TO "anon";

GRANT UPDATE ON "public"."finance_reference_counters" TO "anon";

GRANT DELETE ON "public"."finance_reference_counters" TO "anon";

GRANT REFERENCES ON "public"."finance_reference_counters" TO "anon";

GRANT TRIGGER ON "public"."finance_reference_counters" TO "anon";

GRANT INSERT ON "public"."finance_reference_counters" TO "authenticated";

GRANT SELECT ON "public"."finance_reference_counters" TO "authenticated";

GRANT UPDATE ON "public"."finance_reference_counters" TO "authenticated";

GRANT DELETE ON "public"."finance_reference_counters" TO "authenticated";

GRANT REFERENCES ON "public"."finance_reference_counters" TO "authenticated";

GRANT TRIGGER ON "public"."finance_reference_counters" TO "authenticated";

GRANT INSERT ON "public"."finance_reference_counters" TO "service_role";

GRANT SELECT ON "public"."finance_reference_counters" TO "service_role";

GRANT UPDATE ON "public"."finance_reference_counters" TO "service_role";

GRANT DELETE ON "public"."finance_reference_counters" TO "service_role";

GRANT TRUNCATE ON "public"."finance_reference_counters" TO "service_role";

GRANT REFERENCES ON "public"."finance_reference_counters" TO "service_role";

GRANT TRIGGER ON "public"."finance_reference_counters" TO "service_role";

GRANT INSERT ON "public"."user_activity_logs" TO "anon";

GRANT SELECT ON "public"."user_activity_logs" TO "anon";

GRANT UPDATE ON "public"."user_activity_logs" TO "anon";

GRANT DELETE ON "public"."user_activity_logs" TO "anon";

GRANT REFERENCES ON "public"."user_activity_logs" TO "anon";

GRANT TRIGGER ON "public"."user_activity_logs" TO "anon";

GRANT INSERT ON "public"."user_activity_logs" TO "authenticated";

GRANT SELECT ON "public"."user_activity_logs" TO "authenticated";

GRANT UPDATE ON "public"."user_activity_logs" TO "authenticated";

GRANT DELETE ON "public"."user_activity_logs" TO "authenticated";

GRANT REFERENCES ON "public"."user_activity_logs" TO "authenticated";

GRANT TRIGGER ON "public"."user_activity_logs" TO "authenticated";

GRANT INSERT ON "public"."user_activity_logs" TO "service_role";

GRANT SELECT ON "public"."user_activity_logs" TO "service_role";

GRANT UPDATE ON "public"."user_activity_logs" TO "service_role";

GRANT DELETE ON "public"."user_activity_logs" TO "service_role";

GRANT TRUNCATE ON "public"."user_activity_logs" TO "service_role";

GRANT REFERENCES ON "public"."user_activity_logs" TO "service_role";

GRANT TRIGGER ON "public"."user_activity_logs" TO "service_role";

GRANT SELECT ON "public"."finance_bop_period_access" TO "authenticated";

GRANT INSERT ON "public"."finance_bop_period_access" TO "service_role";

GRANT SELECT ON "public"."finance_bop_period_access" TO "service_role";

GRANT UPDATE ON "public"."finance_bop_period_access" TO "service_role";

GRANT DELETE ON "public"."finance_bop_period_access" TO "service_role";

GRANT TRUNCATE ON "public"."finance_bop_period_access" TO "service_role";

GRANT REFERENCES ON "public"."finance_bop_period_access" TO "service_role";

GRANT TRIGGER ON "public"."finance_bop_period_access" TO "service_role";

GRANT INSERT ON "public"."barn_assets" TO "service_role";

GRANT SELECT ON "public"."barn_assets" TO "service_role";

GRANT UPDATE ON "public"."barn_assets" TO "service_role";

GRANT DELETE ON "public"."barn_assets" TO "service_role";

GRANT TRUNCATE ON "public"."barn_assets" TO "service_role";

GRANT REFERENCES ON "public"."barn_assets" TO "service_role";

GRANT TRIGGER ON "public"."barn_assets" TO "service_role";

GRANT INSERT ON "public"."barn_assets" TO "authenticated";

GRANT SELECT ON "public"."barn_assets" TO "authenticated";

GRANT UPDATE ON "public"."barn_assets" TO "authenticated";

GRANT DELETE ON "public"."barn_assets" TO "authenticated";

GRANT INSERT ON "public"."expedition_routes" TO "authenticated";

GRANT SELECT ON "public"."expedition_routes" TO "authenticated";

GRANT UPDATE ON "public"."expedition_routes" TO "authenticated";

GRANT DELETE ON "public"."expedition_routes" TO "authenticated";

GRANT REFERENCES ON "public"."expedition_routes" TO "authenticated";

GRANT TRIGGER ON "public"."expedition_routes" TO "authenticated";

GRANT INSERT ON "public"."expedition_routes" TO "service_role";

GRANT SELECT ON "public"."expedition_routes" TO "service_role";

GRANT UPDATE ON "public"."expedition_routes" TO "service_role";

GRANT DELETE ON "public"."expedition_routes" TO "service_role";

GRANT TRUNCATE ON "public"."expedition_routes" TO "service_role";

GRANT REFERENCES ON "public"."expedition_routes" TO "service_role";

GRANT TRIGGER ON "public"."expedition_routes" TO "service_role";

GRANT INSERT ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT SELECT ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT UPDATE ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT DELETE ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT REFERENCES ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT TRIGGER ON "public"."finance_asset_purchase_invoices" TO "anon";

GRANT INSERT ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT SELECT ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT UPDATE ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT DELETE ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT REFERENCES ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT TRIGGER ON "public"."finance_asset_purchase_invoices" TO "authenticated";

GRANT INSERT ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT SELECT ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT UPDATE ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT DELETE ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT TRUNCATE ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT REFERENCES ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT TRIGGER ON "public"."finance_asset_purchase_invoices" TO "service_role";

GRANT INSERT ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT SELECT ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT UPDATE ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT DELETE ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT REFERENCES ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT TRIGGER ON "public"."logistics_company_feed_movements" TO "service_role";

GRANT SELECT ON "public"."logistics_company_feed_movements" TO "authenticated";

GRANT INSERT ON "public"."logistics_equipment_purchases" TO "anon";

GRANT SELECT ON "public"."logistics_equipment_purchases" TO "anon";

GRANT UPDATE ON "public"."logistics_equipment_purchases" TO "anon";

GRANT DELETE ON "public"."logistics_equipment_purchases" TO "anon";

GRANT REFERENCES ON "public"."logistics_equipment_purchases" TO "anon";

GRANT TRIGGER ON "public"."logistics_equipment_purchases" TO "anon";

GRANT INSERT ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT SELECT ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT UPDATE ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT DELETE ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_equipment_purchases" TO "authenticated";

GRANT INSERT ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT SELECT ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT UPDATE ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT DELETE ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT REFERENCES ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT TRIGGER ON "public"."logistics_equipment_purchases" TO "service_role";

GRANT INSERT ON "public"."supplier_payments" TO "authenticated";

GRANT SELECT ON "public"."supplier_payments" TO "authenticated";

GRANT UPDATE ON "public"."supplier_payments" TO "authenticated";

GRANT INSERT ON "public"."supplier_payments" TO "service_role";

GRANT SELECT ON "public"."supplier_payments" TO "service_role";

GRANT UPDATE ON "public"."supplier_payments" TO "service_role";

GRANT DELETE ON "public"."supplier_payments" TO "service_role";

GRANT TRUNCATE ON "public"."supplier_payments" TO "service_role";

GRANT REFERENCES ON "public"."supplier_payments" TO "service_role";

GRANT TRIGGER ON "public"."supplier_payments" TO "service_role";

GRANT INSERT ON "public"."chick_ins" TO "authenticated";

GRANT SELECT ON "public"."chick_ins" TO "authenticated";

GRANT UPDATE ON "public"."chick_ins" TO "authenticated";

GRANT DELETE ON "public"."chick_ins" TO "authenticated";

GRANT INSERT ON "public"."chick_ins" TO "service_role";

GRANT SELECT ON "public"."chick_ins" TO "service_role";

GRANT UPDATE ON "public"."chick_ins" TO "service_role";

GRANT DELETE ON "public"."chick_ins" TO "service_role";

GRANT TRUNCATE ON "public"."chick_ins" TO "service_role";

GRANT REFERENCES ON "public"."chick_ins" TO "service_role";

GRANT TRIGGER ON "public"."chick_ins" TO "service_role";

GRANT INSERT ON "public"."recordings" TO "authenticated";

GRANT SELECT ON "public"."recordings" TO "authenticated";

GRANT UPDATE ON "public"."recordings" TO "authenticated";

GRANT DELETE ON "public"."recordings" TO "authenticated";

GRANT INSERT ON "public"."recordings" TO "service_role";

GRANT SELECT ON "public"."recordings" TO "service_role";

GRANT UPDATE ON "public"."recordings" TO "service_role";

GRANT DELETE ON "public"."recordings" TO "service_role";

GRANT TRUNCATE ON "public"."recordings" TO "service_role";

GRANT REFERENCES ON "public"."recordings" TO "service_role";

GRANT TRIGGER ON "public"."recordings" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_trip_destinations" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_trip_destinations" TO "service_role";

GRANT INSERT ON "public"."visits" TO "authenticated";

GRANT SELECT ON "public"."visits" TO "authenticated";

GRANT UPDATE ON "public"."visits" TO "authenticated";

GRANT DELETE ON "public"."visits" TO "authenticated";

GRANT INSERT ON "public"."visits" TO "service_role";

GRANT SELECT ON "public"."visits" TO "service_role";

GRANT UPDATE ON "public"."visits" TO "service_role";

GRANT DELETE ON "public"."visits" TO "service_role";

GRANT TRUNCATE ON "public"."visits" TO "service_role";

GRANT REFERENCES ON "public"."visits" TO "service_role";

GRANT TRIGGER ON "public"."visits" TO "service_role";

GRANT INSERT ON "public"."profiles" TO "authenticated";

GRANT SELECT ON "public"."profiles" TO "authenticated";

GRANT UPDATE ON "public"."profiles" TO "authenticated";

GRANT DELETE ON "public"."profiles" TO "authenticated";

GRANT INSERT ON "public"."profiles" TO "service_role";

GRANT SELECT ON "public"."profiles" TO "service_role";

GRANT UPDATE ON "public"."profiles" TO "service_role";

GRANT DELETE ON "public"."profiles" TO "service_role";

GRANT TRUNCATE ON "public"."profiles" TO "service_role";

GRANT REFERENCES ON "public"."profiles" TO "service_role";

GRANT TRIGGER ON "public"."profiles" TO "service_role";

GRANT INSERT ON "public"."harvests" TO "authenticated";

GRANT SELECT ON "public"."harvests" TO "authenticated";

GRANT UPDATE ON "public"."harvests" TO "authenticated";

GRANT DELETE ON "public"."harvests" TO "authenticated";

GRANT INSERT ON "public"."harvests" TO "service_role";

GRANT SELECT ON "public"."harvests" TO "service_role";

GRANT UPDATE ON "public"."harvests" TO "service_role";

GRANT DELETE ON "public"."harvests" TO "service_role";

GRANT TRUNCATE ON "public"."harvests" TO "service_role";

GRANT REFERENCES ON "public"."harvests" TO "service_role";

GRANT TRIGGER ON "public"."harvests" TO "service_role";

GRANT INSERT ON "public"."barns" TO "authenticated";

GRANT SELECT ON "public"."barns" TO "authenticated";

GRANT UPDATE ON "public"."barns" TO "authenticated";

GRANT DELETE ON "public"."barns" TO "authenticated";

GRANT INSERT ON "public"."barns" TO "service_role";

GRANT SELECT ON "public"."barns" TO "service_role";

GRANT UPDATE ON "public"."barns" TO "service_role";

GRANT DELETE ON "public"."barns" TO "service_role";

GRANT TRUNCATE ON "public"."barns" TO "service_role";

GRANT REFERENCES ON "public"."barns" TO "service_role";

GRANT TRIGGER ON "public"."barns" TO "service_role";

GRANT INSERT ON "public"."finance_direct_purchases" TO "anon";

GRANT SELECT ON "public"."finance_direct_purchases" TO "anon";

GRANT UPDATE ON "public"."finance_direct_purchases" TO "anon";

GRANT DELETE ON "public"."finance_direct_purchases" TO "anon";

GRANT REFERENCES ON "public"."finance_direct_purchases" TO "anon";

GRANT TRIGGER ON "public"."finance_direct_purchases" TO "anon";

GRANT INSERT ON "public"."finance_direct_purchases" TO "authenticated";

GRANT SELECT ON "public"."finance_direct_purchases" TO "authenticated";

GRANT UPDATE ON "public"."finance_direct_purchases" TO "authenticated";

GRANT DELETE ON "public"."finance_direct_purchases" TO "authenticated";

GRANT REFERENCES ON "public"."finance_direct_purchases" TO "authenticated";

GRANT TRIGGER ON "public"."finance_direct_purchases" TO "authenticated";

GRANT INSERT ON "public"."finance_direct_purchases" TO "service_role";

GRANT SELECT ON "public"."finance_direct_purchases" TO "service_role";

GRANT UPDATE ON "public"."finance_direct_purchases" TO "service_role";

GRANT DELETE ON "public"."finance_direct_purchases" TO "service_role";

GRANT TRUNCATE ON "public"."finance_direct_purchases" TO "service_role";

GRANT REFERENCES ON "public"."finance_direct_purchases" TO "service_role";

GRANT TRIGGER ON "public"."finance_direct_purchases" TO "service_role";

GRANT INSERT ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT SELECT ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT UPDATE ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT DELETE ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT REFERENCES ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT TRIGGER ON "public"."finance_stock_purchase_invoices" TO "authenticated";

GRANT INSERT ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT SELECT ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT UPDATE ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT DELETE ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT TRUNCATE ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT REFERENCES ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT TRIGGER ON "public"."finance_stock_purchase_invoices" TO "service_role";

GRANT INSERT ON "public"."company_profile" TO "authenticated";

GRANT SELECT ON "public"."company_profile" TO "authenticated";

GRANT UPDATE ON "public"."company_profile" TO "authenticated";

GRANT DELETE ON "public"."company_profile" TO "authenticated";

GRANT INSERT ON "public"."company_profile" TO "service_role";

GRANT SELECT ON "public"."company_profile" TO "service_role";

GRANT UPDATE ON "public"."company_profile" TO "service_role";

GRANT DELETE ON "public"."company_profile" TO "service_role";

GRANT TRUNCATE ON "public"."company_profile" TO "service_role";

GRANT REFERENCES ON "public"."company_profile" TO "service_role";

GRANT TRIGGER ON "public"."company_profile" TO "service_role";

GRANT INSERT ON "public"."performance_standards" TO "authenticated";

GRANT SELECT ON "public"."performance_standards" TO "authenticated";

GRANT UPDATE ON "public"."performance_standards" TO "authenticated";

GRANT DELETE ON "public"."performance_standards" TO "authenticated";

GRANT INSERT ON "public"."performance_standards" TO "service_role";

GRANT SELECT ON "public"."performance_standards" TO "service_role";

GRANT UPDATE ON "public"."performance_standards" TO "service_role";

GRANT DELETE ON "public"."performance_standards" TO "service_role";

GRANT TRUNCATE ON "public"."performance_standards" TO "service_role";

GRANT REFERENCES ON "public"."performance_standards" TO "service_role";

GRANT TRIGGER ON "public"."performance_standards" TO "service_role";

GRANT INSERT ON "public"."expeditions" TO "authenticated";

GRANT SELECT ON "public"."expeditions" TO "authenticated";

GRANT UPDATE ON "public"."expeditions" TO "authenticated";

GRANT DELETE ON "public"."expeditions" TO "authenticated";

GRANT INSERT ON "public"."expeditions" TO "service_role";

GRANT SELECT ON "public"."expeditions" TO "service_role";

GRANT UPDATE ON "public"."expeditions" TO "service_role";

GRANT DELETE ON "public"."expeditions" TO "service_role";

GRANT TRUNCATE ON "public"."expeditions" TO "service_role";

GRANT REFERENCES ON "public"."expeditions" TO "service_role";

GRANT TRIGGER ON "public"."expeditions" TO "service_role";

GRANT INSERT ON "public"."employees" TO "authenticated";

GRANT SELECT ON "public"."employees" TO "authenticated";

GRANT UPDATE ON "public"."employees" TO "authenticated";

GRANT DELETE ON "public"."employees" TO "authenticated";

GRANT INSERT ON "public"."employees" TO "service_role";

GRANT SELECT ON "public"."employees" TO "service_role";

GRANT UPDATE ON "public"."employees" TO "service_role";

GRANT DELETE ON "public"."employees" TO "service_role";

GRANT TRUNCATE ON "public"."employees" TO "service_role";

GRANT REFERENCES ON "public"."employees" TO "service_role";

GRANT TRIGGER ON "public"."employees" TO "service_role";

GRANT INSERT ON "public"."contract_live_prices" TO "authenticated";

GRANT SELECT ON "public"."contract_live_prices" TO "authenticated";

GRANT UPDATE ON "public"."contract_live_prices" TO "authenticated";

GRANT DELETE ON "public"."contract_live_prices" TO "authenticated";

GRANT INSERT ON "public"."contract_live_prices" TO "service_role";

GRANT SELECT ON "public"."contract_live_prices" TO "service_role";

GRANT UPDATE ON "public"."contract_live_prices" TO "service_role";

GRANT DELETE ON "public"."contract_live_prices" TO "service_role";

GRANT TRUNCATE ON "public"."contract_live_prices" TO "service_role";

GRANT REFERENCES ON "public"."contract_live_prices" TO "service_role";

GRANT TRIGGER ON "public"."contract_live_prices" TO "service_role";

GRANT INSERT ON "public"."contract_bonuses" TO "authenticated";

GRANT SELECT ON "public"."contract_bonuses" TO "authenticated";

GRANT UPDATE ON "public"."contract_bonuses" TO "authenticated";

GRANT DELETE ON "public"."contract_bonuses" TO "authenticated";

GRANT INSERT ON "public"."contract_bonuses" TO "service_role";

GRANT SELECT ON "public"."contract_bonuses" TO "service_role";

GRANT UPDATE ON "public"."contract_bonuses" TO "service_role";

GRANT DELETE ON "public"."contract_bonuses" TO "service_role";

GRANT TRUNCATE ON "public"."contract_bonuses" TO "service_role";

GRANT REFERENCES ON "public"."contract_bonuses" TO "service_role";

GRANT TRIGGER ON "public"."contract_bonuses" TO "service_role";

GRANT INSERT ON "public"."recording_weight_samples" TO "anon";

GRANT SELECT ON "public"."recording_weight_samples" TO "anon";

GRANT UPDATE ON "public"."recording_weight_samples" TO "anon";

GRANT DELETE ON "public"."recording_weight_samples" TO "anon";

GRANT REFERENCES ON "public"."recording_weight_samples" TO "anon";

GRANT TRIGGER ON "public"."recording_weight_samples" TO "anon";

GRANT INSERT ON "public"."recording_weight_samples" TO "authenticated";

GRANT SELECT ON "public"."recording_weight_samples" TO "authenticated";

GRANT UPDATE ON "public"."recording_weight_samples" TO "authenticated";

GRANT DELETE ON "public"."recording_weight_samples" TO "authenticated";

GRANT REFERENCES ON "public"."recording_weight_samples" TO "authenticated";

GRANT TRIGGER ON "public"."recording_weight_samples" TO "authenticated";

GRANT INSERT ON "public"."recording_weight_samples" TO "service_role";

GRANT SELECT ON "public"."recording_weight_samples" TO "service_role";

GRANT UPDATE ON "public"."recording_weight_samples" TO "service_role";

GRANT DELETE ON "public"."recording_weight_samples" TO "service_role";

GRANT TRUNCATE ON "public"."recording_weight_samples" TO "service_role";

GRANT REFERENCES ON "public"."recording_weight_samples" TO "service_role";

GRANT TRIGGER ON "public"."recording_weight_samples" TO "service_role";

GRANT INSERT ON "public"."rhpp_estimates" TO "authenticated";

GRANT SELECT ON "public"."rhpp_estimates" TO "authenticated";

GRANT UPDATE ON "public"."rhpp_estimates" TO "authenticated";

GRANT DELETE ON "public"."rhpp_estimates" TO "authenticated";

GRANT INSERT ON "public"."rhpp_estimates" TO "service_role";

GRANT SELECT ON "public"."rhpp_estimates" TO "service_role";

GRANT UPDATE ON "public"."rhpp_estimates" TO "service_role";

GRANT DELETE ON "public"."rhpp_estimates" TO "service_role";

GRANT TRUNCATE ON "public"."rhpp_estimates" TO "service_role";

GRANT REFERENCES ON "public"."rhpp_estimates" TO "service_role";

GRANT TRIGGER ON "public"."rhpp_estimates" TO "service_role";

GRANT INSERT ON "public"."cycle_financials" TO "authenticated";

GRANT SELECT ON "public"."cycle_financials" TO "authenticated";

GRANT UPDATE ON "public"."cycle_financials" TO "authenticated";

GRANT DELETE ON "public"."cycle_financials" TO "authenticated";

GRANT INSERT ON "public"."cycle_financials" TO "service_role";

GRANT SELECT ON "public"."cycle_financials" TO "service_role";

GRANT UPDATE ON "public"."cycle_financials" TO "service_role";

GRANT DELETE ON "public"."cycle_financials" TO "service_role";

GRANT TRUNCATE ON "public"."cycle_financials" TO "service_role";

GRANT REFERENCES ON "public"."cycle_financials" TO "service_role";

GRANT TRIGGER ON "public"."cycle_financials" TO "service_role";

GRANT INSERT ON "public"."logistics_return_items" TO "anon";

GRANT SELECT ON "public"."logistics_return_items" TO "anon";

GRANT UPDATE ON "public"."logistics_return_items" TO "anon";

GRANT DELETE ON "public"."logistics_return_items" TO "anon";

GRANT REFERENCES ON "public"."logistics_return_items" TO "anon";

GRANT TRIGGER ON "public"."logistics_return_items" TO "anon";

GRANT INSERT ON "public"."logistics_return_items" TO "authenticated";

GRANT SELECT ON "public"."logistics_return_items" TO "authenticated";

GRANT UPDATE ON "public"."logistics_return_items" TO "authenticated";

GRANT DELETE ON "public"."logistics_return_items" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_return_items" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_return_items" TO "authenticated";

GRANT INSERT ON "public"."logistics_return_items" TO "service_role";

GRANT SELECT ON "public"."logistics_return_items" TO "service_role";

GRANT UPDATE ON "public"."logistics_return_items" TO "service_role";

GRANT DELETE ON "public"."logistics_return_items" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_return_items" TO "service_role";

GRANT REFERENCES ON "public"."logistics_return_items" TO "service_role";

GRANT TRIGGER ON "public"."logistics_return_items" TO "service_role";

GRANT INSERT ON "public"."advance_balances" TO "authenticated";

GRANT SELECT ON "public"."advance_balances" TO "authenticated";

GRANT UPDATE ON "public"."advance_balances" TO "authenticated";

GRANT DELETE ON "public"."advance_balances" TO "authenticated";

GRANT INSERT ON "public"."advance_balances" TO "service_role";

GRANT SELECT ON "public"."advance_balances" TO "service_role";

GRANT UPDATE ON "public"."advance_balances" TO "service_role";

GRANT DELETE ON "public"."advance_balances" TO "service_role";

GRANT TRUNCATE ON "public"."advance_balances" TO "service_role";

GRANT REFERENCES ON "public"."advance_balances" TO "service_role";

GRANT TRIGGER ON "public"."advance_balances" TO "service_role";

GRANT INSERT ON "public"."marketing_contract_harvests" TO "anon";

GRANT SELECT ON "public"."marketing_contract_harvests" TO "anon";

GRANT UPDATE ON "public"."marketing_contract_harvests" TO "anon";

GRANT DELETE ON "public"."marketing_contract_harvests" TO "anon";

GRANT REFERENCES ON "public"."marketing_contract_harvests" TO "anon";

GRANT TRIGGER ON "public"."marketing_contract_harvests" TO "anon";

GRANT INSERT ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT SELECT ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT UPDATE ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT DELETE ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT REFERENCES ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT TRIGGER ON "public"."marketing_contract_harvests" TO "authenticated";

GRANT INSERT ON "public"."marketing_contract_harvests" TO "service_role";

GRANT SELECT ON "public"."marketing_contract_harvests" TO "service_role";

GRANT UPDATE ON "public"."marketing_contract_harvests" TO "service_role";

GRANT DELETE ON "public"."marketing_contract_harvests" TO "service_role";

GRANT TRUNCATE ON "public"."marketing_contract_harvests" TO "service_role";

GRANT REFERENCES ON "public"."marketing_contract_harvests" TO "service_role";

GRANT TRIGGER ON "public"."marketing_contract_harvests" TO "service_role";

GRANT INSERT ON "public"."bop_outside" TO "anon";

GRANT SELECT ON "public"."bop_outside" TO "anon";

GRANT UPDATE ON "public"."bop_outside" TO "anon";

GRANT DELETE ON "public"."bop_outside" TO "anon";

GRANT REFERENCES ON "public"."bop_outside" TO "anon";

GRANT TRIGGER ON "public"."bop_outside" TO "anon";

GRANT INSERT ON "public"."bop_outside" TO "authenticated";

GRANT SELECT ON "public"."bop_outside" TO "authenticated";

GRANT UPDATE ON "public"."bop_outside" TO "authenticated";

GRANT DELETE ON "public"."bop_outside" TO "authenticated";

GRANT REFERENCES ON "public"."bop_outside" TO "authenticated";

GRANT TRIGGER ON "public"."bop_outside" TO "authenticated";

GRANT INSERT ON "public"."bop_outside" TO "service_role";

GRANT SELECT ON "public"."bop_outside" TO "service_role";

GRANT UPDATE ON "public"."bop_outside" TO "service_role";

GRANT DELETE ON "public"."bop_outside" TO "service_role";

GRANT TRUNCATE ON "public"."bop_outside" TO "service_role";

GRANT REFERENCES ON "public"."bop_outside" TO "service_role";

GRANT TRIGGER ON "public"."bop_outside" TO "service_role";

GRANT INSERT ON "public"."items" TO "authenticated";

GRANT SELECT ON "public"."items" TO "authenticated";

GRANT UPDATE ON "public"."items" TO "authenticated";

GRANT DELETE ON "public"."items" TO "authenticated";

GRANT INSERT ON "public"."items" TO "service_role";

GRANT SELECT ON "public"."items" TO "service_role";

GRANT UPDATE ON "public"."items" TO "service_role";

GRANT DELETE ON "public"."items" TO "service_role";

GRANT TRUNCATE ON "public"."items" TO "service_role";

GRANT REFERENCES ON "public"."items" TO "service_role";

GRANT TRIGGER ON "public"."items" TO "service_role";

GRANT INSERT ON "public"."bop" TO "authenticated";

GRANT SELECT ON "public"."bop" TO "authenticated";

GRANT UPDATE ON "public"."bop" TO "authenticated";

GRANT DELETE ON "public"."bop" TO "authenticated";

GRANT INSERT ON "public"."bop" TO "service_role";

GRANT SELECT ON "public"."bop" TO "service_role";

GRANT UPDATE ON "public"."bop" TO "service_role";

GRANT DELETE ON "public"."bop" TO "service_role";

GRANT TRUNCATE ON "public"."bop" TO "service_role";

GRANT REFERENCES ON "public"."bop" TO "service_role";

GRANT TRIGGER ON "public"."bop" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_invoices" TO "anon";

GRANT SELECT ON "public"."finance_expedition_invoices" TO "anon";

GRANT UPDATE ON "public"."finance_expedition_invoices" TO "anon";

GRANT DELETE ON "public"."finance_expedition_invoices" TO "anon";

GRANT REFERENCES ON "public"."finance_expedition_invoices" TO "anon";

GRANT TRIGGER ON "public"."finance_expedition_invoices" TO "anon";

GRANT INSERT ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_invoices" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_invoices" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_invoices" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_invoices" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_invoices" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_invoices" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_invoices" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_invoices" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT SELECT ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT UPDATE ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT DELETE ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT REFERENCES ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT TRIGGER ON "public"."finance_expedition_invoice_items" TO "anon";

GRANT INSERT ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_invoice_items" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_invoice_items" TO "service_role";

GRANT INSERT ON "public"."abk_league" TO "anon";

GRANT SELECT ON "public"."abk_league" TO "anon";

GRANT UPDATE ON "public"."abk_league" TO "anon";

GRANT DELETE ON "public"."abk_league" TO "anon";

GRANT REFERENCES ON "public"."abk_league" TO "anon";

GRANT TRIGGER ON "public"."abk_league" TO "anon";

GRANT INSERT ON "public"."abk_league" TO "authenticated";

GRANT SELECT ON "public"."abk_league" TO "authenticated";

GRANT UPDATE ON "public"."abk_league" TO "authenticated";

GRANT DELETE ON "public"."abk_league" TO "authenticated";

GRANT REFERENCES ON "public"."abk_league" TO "authenticated";

GRANT TRIGGER ON "public"."abk_league" TO "authenticated";

GRANT INSERT ON "public"."abk_league" TO "service_role";

GRANT SELECT ON "public"."abk_league" TO "service_role";

GRANT UPDATE ON "public"."abk_league" TO "service_role";

GRANT DELETE ON "public"."abk_league" TO "service_role";

GRANT TRUNCATE ON "public"."abk_league" TO "service_role";

GRANT REFERENCES ON "public"."abk_league" TO "service_role";

GRANT TRIGGER ON "public"."abk_league" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_payments" TO "anon";

GRANT SELECT ON "public"."finance_expedition_payments" TO "anon";

GRANT UPDATE ON "public"."finance_expedition_payments" TO "anon";

GRANT DELETE ON "public"."finance_expedition_payments" TO "anon";

GRANT REFERENCES ON "public"."finance_expedition_payments" TO "anon";

GRANT TRIGGER ON "public"."finance_expedition_payments" TO "anon";

GRANT INSERT ON "public"."finance_expedition_payments" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_payments" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_payments" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_payments" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_payments" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_payments" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_payments" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_payments" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_payments" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_payments" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_payments" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_payments" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_payments" TO "service_role";

GRANT INSERT ON "public"."contract_readiness" TO "anon";

GRANT SELECT ON "public"."contract_readiness" TO "anon";

GRANT UPDATE ON "public"."contract_readiness" TO "anon";

GRANT DELETE ON "public"."contract_readiness" TO "anon";

GRANT REFERENCES ON "public"."contract_readiness" TO "anon";

GRANT TRIGGER ON "public"."contract_readiness" TO "anon";

GRANT INSERT ON "public"."contract_readiness" TO "authenticated";

GRANT SELECT ON "public"."contract_readiness" TO "authenticated";

GRANT UPDATE ON "public"."contract_readiness" TO "authenticated";

GRANT DELETE ON "public"."contract_readiness" TO "authenticated";

GRANT REFERENCES ON "public"."contract_readiness" TO "authenticated";

GRANT TRIGGER ON "public"."contract_readiness" TO "authenticated";

GRANT INSERT ON "public"."contract_readiness" TO "service_role";

GRANT SELECT ON "public"."contract_readiness" TO "service_role";

GRANT UPDATE ON "public"."contract_readiness" TO "service_role";

GRANT DELETE ON "public"."contract_readiness" TO "service_role";

GRANT TRUNCATE ON "public"."contract_readiness" TO "service_role";

GRANT REFERENCES ON "public"."contract_readiness" TO "service_role";

GRANT TRIGGER ON "public"."contract_readiness" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_bop" TO "anon";

GRANT SELECT ON "public"."finance_expedition_bop" TO "anon";

GRANT UPDATE ON "public"."finance_expedition_bop" TO "anon";

GRANT DELETE ON "public"."finance_expedition_bop" TO "anon";

GRANT REFERENCES ON "public"."finance_expedition_bop" TO "anon";

GRANT TRIGGER ON "public"."finance_expedition_bop" TO "anon";

GRANT INSERT ON "public"."finance_expedition_bop" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_bop" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_bop" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_bop" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_bop" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_bop" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_bop" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_bop" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_bop" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_bop" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_bop" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_bop" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_bop" TO "service_role";

GRANT INSERT ON "public"."expedition_destinations" TO "authenticated";

GRANT SELECT ON "public"."expedition_destinations" TO "authenticated";

GRANT UPDATE ON "public"."expedition_destinations" TO "authenticated";

GRANT DELETE ON "public"."expedition_destinations" TO "authenticated";

GRANT REFERENCES ON "public"."expedition_destinations" TO "authenticated";

GRANT TRIGGER ON "public"."expedition_destinations" TO "authenticated";

GRANT INSERT ON "public"."expedition_destinations" TO "service_role";

GRANT SELECT ON "public"."expedition_destinations" TO "service_role";

GRANT UPDATE ON "public"."expedition_destinations" TO "service_role";

GRANT DELETE ON "public"."expedition_destinations" TO "service_role";

GRANT TRUNCATE ON "public"."expedition_destinations" TO "service_role";

GRANT REFERENCES ON "public"."expedition_destinations" TO "service_role";

GRANT TRIGGER ON "public"."expedition_destinations" TO "service_role";

GRANT INSERT ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT SELECT ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT UPDATE ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT DELETE ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT TRUNCATE ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT REFERENCES ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT TRIGGER ON "public"."finance_mandiri_sales_receipts" TO "service_role";

GRANT SELECT ON "public"."finance_mandiri_sales_receipts" TO "authenticated";

GRANT SELECT ON "public"."rhpp_real" TO "authenticated";

GRANT INSERT ON "public"."rhpp_real" TO "service_role";

GRANT SELECT ON "public"."rhpp_real" TO "service_role";

GRANT UPDATE ON "public"."rhpp_real" TO "service_role";

GRANT DELETE ON "public"."rhpp_real" TO "service_role";

GRANT TRUNCATE ON "public"."rhpp_real" TO "service_role";

GRANT REFERENCES ON "public"."rhpp_real" TO "service_role";

GRANT TRIGGER ON "public"."rhpp_real" TO "service_role";

GRANT INSERT ON "public"."supplies" TO "authenticated";

GRANT SELECT ON "public"."supplies" TO "authenticated";

GRANT UPDATE ON "public"."supplies" TO "authenticated";

GRANT DELETE ON "public"."supplies" TO "authenticated";

GRANT INSERT ON "public"."supplies" TO "service_role";

GRANT SELECT ON "public"."supplies" TO "service_role";

GRANT UPDATE ON "public"."supplies" TO "service_role";

GRANT DELETE ON "public"."supplies" TO "service_role";

GRANT TRUNCATE ON "public"."supplies" TO "service_role";

GRANT REFERENCES ON "public"."supplies" TO "service_role";

GRANT TRIGGER ON "public"."supplies" TO "service_role";

GRANT INSERT ON "public"."production_mandiri_final" TO "anon";

GRANT SELECT ON "public"."production_mandiri_final" TO "anon";

GRANT UPDATE ON "public"."production_mandiri_final" TO "anon";

GRANT DELETE ON "public"."production_mandiri_final" TO "anon";

GRANT REFERENCES ON "public"."production_mandiri_final" TO "anon";

GRANT TRIGGER ON "public"."production_mandiri_final" TO "anon";

GRANT INSERT ON "public"."production_mandiri_final" TO "authenticated";

GRANT SELECT ON "public"."production_mandiri_final" TO "authenticated";

GRANT UPDATE ON "public"."production_mandiri_final" TO "authenticated";

GRANT DELETE ON "public"."production_mandiri_final" TO "authenticated";

GRANT REFERENCES ON "public"."production_mandiri_final" TO "authenticated";

GRANT TRIGGER ON "public"."production_mandiri_final" TO "authenticated";

GRANT INSERT ON "public"."production_mandiri_final" TO "service_role";

GRANT SELECT ON "public"."production_mandiri_final" TO "service_role";

GRANT UPDATE ON "public"."production_mandiri_final" TO "service_role";

GRANT DELETE ON "public"."production_mandiri_final" TO "service_role";

GRANT TRUNCATE ON "public"."production_mandiri_final" TO "service_role";

GRANT REFERENCES ON "public"."production_mandiri_final" TO "service_role";

GRANT TRIGGER ON "public"."production_mandiri_final" TO "service_role";

GRANT INSERT ON "public"."contracts" TO "authenticated";

GRANT SELECT ON "public"."contracts" TO "authenticated";

GRANT UPDATE ON "public"."contracts" TO "authenticated";

GRANT DELETE ON "public"."contracts" TO "authenticated";

GRANT INSERT ON "public"."contracts" TO "service_role";

GRANT SELECT ON "public"."contracts" TO "service_role";

GRANT UPDATE ON "public"."contracts" TO "service_role";

GRANT DELETE ON "public"."contracts" TO "service_role";

GRANT TRUNCATE ON "public"."contracts" TO "service_role";

GRANT REFERENCES ON "public"."contracts" TO "service_role";

GRANT TRIGGER ON "public"."contracts" TO "service_role";

GRANT INSERT ON "public"."cycles" TO "authenticated";

GRANT SELECT ON "public"."cycles" TO "authenticated";

GRANT UPDATE ON "public"."cycles" TO "authenticated";

GRANT DELETE ON "public"."cycles" TO "authenticated";

GRANT INSERT ON "public"."cycles" TO "service_role";

GRANT SELECT ON "public"."cycles" TO "service_role";

GRANT UPDATE ON "public"."cycles" TO "service_role";

GRANT DELETE ON "public"."cycles" TO "service_role";

GRANT TRUNCATE ON "public"."cycles" TO "service_role";

GRANT REFERENCES ON "public"."cycles" TO "service_role";

GRANT TRIGGER ON "public"."cycles" TO "service_role";

GRANT INSERT ON "public"."logistics_contract_assignments" TO "anon";

GRANT SELECT ON "public"."logistics_contract_assignments" TO "anon";

GRANT UPDATE ON "public"."logistics_contract_assignments" TO "anon";

GRANT REFERENCES ON "public"."logistics_contract_assignments" TO "anon";

GRANT TRIGGER ON "public"."logistics_contract_assignments" TO "anon";

GRANT INSERT ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT SELECT ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT UPDATE ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT DELETE ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_contract_assignments" TO "authenticated";

GRANT INSERT ON "public"."logistics_contract_assignments" TO "service_role";

GRANT SELECT ON "public"."logistics_contract_assignments" TO "service_role";

GRANT UPDATE ON "public"."logistics_contract_assignments" TO "service_role";

GRANT DELETE ON "public"."logistics_contract_assignments" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_contract_assignments" TO "service_role";

GRANT REFERENCES ON "public"."logistics_contract_assignments" TO "service_role";

GRANT TRIGGER ON "public"."logistics_contract_assignments" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_maintenance" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_maintenance" TO "service_role";

GRANT INSERT ON "public"."suppliers" TO "anon";

GRANT SELECT ON "public"."suppliers" TO "anon";

GRANT UPDATE ON "public"."suppliers" TO "anon";

GRANT DELETE ON "public"."suppliers" TO "anon";

GRANT REFERENCES ON "public"."suppliers" TO "anon";

GRANT TRIGGER ON "public"."suppliers" TO "anon";

GRANT INSERT ON "public"."suppliers" TO "authenticated";

GRANT SELECT ON "public"."suppliers" TO "authenticated";

GRANT UPDATE ON "public"."suppliers" TO "authenticated";

GRANT DELETE ON "public"."suppliers" TO "authenticated";

GRANT REFERENCES ON "public"."suppliers" TO "authenticated";

GRANT TRIGGER ON "public"."suppliers" TO "authenticated";

GRANT INSERT ON "public"."suppliers" TO "service_role";

GRANT SELECT ON "public"."suppliers" TO "service_role";

GRANT UPDATE ON "public"."suppliers" TO "service_role";

GRANT DELETE ON "public"."suppliers" TO "service_role";

GRANT TRUNCATE ON "public"."suppliers" TO "service_role";

GRANT REFERENCES ON "public"."suppliers" TO "service_role";

GRANT TRIGGER ON "public"."suppliers" TO "service_role";

GRANT INSERT ON "public"."logistics_shipments" TO "anon";

GRANT SELECT ON "public"."logistics_shipments" TO "anon";

GRANT UPDATE ON "public"."logistics_shipments" TO "anon";

GRANT REFERENCES ON "public"."logistics_shipments" TO "anon";

GRANT TRIGGER ON "public"."logistics_shipments" TO "anon";

GRANT INSERT ON "public"."logistics_shipments" TO "authenticated";

GRANT SELECT ON "public"."logistics_shipments" TO "authenticated";

GRANT UPDATE ON "public"."logistics_shipments" TO "authenticated";

GRANT DELETE ON "public"."logistics_shipments" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_shipments" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_shipments" TO "authenticated";

GRANT INSERT ON "public"."logistics_shipments" TO "service_role";

GRANT SELECT ON "public"."logistics_shipments" TO "service_role";

GRANT UPDATE ON "public"."logistics_shipments" TO "service_role";

GRANT DELETE ON "public"."logistics_shipments" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_shipments" TO "service_role";

GRANT REFERENCES ON "public"."logistics_shipments" TO "service_role";

GRANT TRIGGER ON "public"."logistics_shipments" TO "service_role";

GRANT INSERT ON "public"."logistics_shipment_items" TO "anon";

GRANT SELECT ON "public"."logistics_shipment_items" TO "anon";

GRANT UPDATE ON "public"."logistics_shipment_items" TO "anon";

GRANT DELETE ON "public"."logistics_shipment_items" TO "anon";

GRANT REFERENCES ON "public"."logistics_shipment_items" TO "anon";

GRANT TRIGGER ON "public"."logistics_shipment_items" TO "anon";

GRANT INSERT ON "public"."logistics_shipment_items" TO "authenticated";

GRANT SELECT ON "public"."logistics_shipment_items" TO "authenticated";

GRANT UPDATE ON "public"."logistics_shipment_items" TO "authenticated";

GRANT DELETE ON "public"."logistics_shipment_items" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_shipment_items" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_shipment_items" TO "authenticated";

GRANT INSERT ON "public"."logistics_shipment_items" TO "service_role";

GRANT SELECT ON "public"."logistics_shipment_items" TO "service_role";

GRANT UPDATE ON "public"."logistics_shipment_items" TO "service_role";

GRANT DELETE ON "public"."logistics_shipment_items" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_shipment_items" TO "service_role";

GRANT REFERENCES ON "public"."logistics_shipment_items" TO "service_role";

GRANT TRIGGER ON "public"."logistics_shipment_items" TO "service_role";

GRANT INSERT ON "public"."logistics_returns" TO "anon";

GRANT SELECT ON "public"."logistics_returns" TO "anon";

GRANT UPDATE ON "public"."logistics_returns" TO "anon";

GRANT REFERENCES ON "public"."logistics_returns" TO "anon";

GRANT TRIGGER ON "public"."logistics_returns" TO "anon";

GRANT INSERT ON "public"."logistics_returns" TO "authenticated";

GRANT SELECT ON "public"."logistics_returns" TO "authenticated";

GRANT UPDATE ON "public"."logistics_returns" TO "authenticated";

GRANT DELETE ON "public"."logistics_returns" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_returns" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_returns" TO "authenticated";

GRANT INSERT ON "public"."logistics_returns" TO "service_role";

GRANT SELECT ON "public"."logistics_returns" TO "service_role";

GRANT UPDATE ON "public"."logistics_returns" TO "service_role";

GRANT DELETE ON "public"."logistics_returns" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_returns" TO "service_role";

GRANT REFERENCES ON "public"."logistics_returns" TO "service_role";

GRANT TRIGGER ON "public"."logistics_returns" TO "service_role";

GRANT INSERT ON "public"."logistics_external_shipments" TO "anon";

GRANT SELECT ON "public"."logistics_external_shipments" TO "anon";

GRANT UPDATE ON "public"."logistics_external_shipments" TO "anon";

GRANT DELETE ON "public"."logistics_external_shipments" TO "anon";

GRANT REFERENCES ON "public"."logistics_external_shipments" TO "anon";

GRANT TRIGGER ON "public"."logistics_external_shipments" TO "anon";

GRANT INSERT ON "public"."logistics_external_shipments" TO "authenticated";

GRANT SELECT ON "public"."logistics_external_shipments" TO "authenticated";

GRANT UPDATE ON "public"."logistics_external_shipments" TO "authenticated";

GRANT DELETE ON "public"."logistics_external_shipments" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_external_shipments" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_external_shipments" TO "authenticated";

GRANT INSERT ON "public"."logistics_external_shipments" TO "service_role";

GRANT SELECT ON "public"."logistics_external_shipments" TO "service_role";

GRANT UPDATE ON "public"."logistics_external_shipments" TO "service_role";

GRANT DELETE ON "public"."logistics_external_shipments" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_external_shipments" TO "service_role";

GRANT REFERENCES ON "public"."logistics_external_shipments" TO "service_role";

GRANT TRIGGER ON "public"."logistics_external_shipments" TO "service_role";

GRANT INSERT ON "public"."logistics_external_shipment_items" TO "anon";

GRANT SELECT ON "public"."logistics_external_shipment_items" TO "anon";

GRANT UPDATE ON "public"."logistics_external_shipment_items" TO "anon";

GRANT DELETE ON "public"."logistics_external_shipment_items" TO "anon";

GRANT REFERENCES ON "public"."logistics_external_shipment_items" TO "anon";

GRANT TRIGGER ON "public"."logistics_external_shipment_items" TO "anon";

GRANT INSERT ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT SELECT ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT UPDATE ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT DELETE ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_external_shipment_items" TO "authenticated";

GRANT INSERT ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT SELECT ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT UPDATE ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT DELETE ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT REFERENCES ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT TRIGGER ON "public"."logistics_external_shipment_items" TO "service_role";

GRANT INSERT ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT SELECT ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT UPDATE ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT DELETE ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT REFERENCES ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT TRIGGER ON "public"."logistics_contract_assignment_abks" TO "anon";

GRANT INSERT ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT SELECT ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT UPDATE ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT DELETE ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_contract_assignment_abks" TO "authenticated";

GRANT INSERT ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT SELECT ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT UPDATE ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT DELETE ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT REFERENCES ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT TRIGGER ON "public"."logistics_contract_assignment_abks" TO "service_role";

GRANT INSERT ON "public"."abk_league_settings" TO "anon";

GRANT SELECT ON "public"."abk_league_settings" TO "anon";

GRANT UPDATE ON "public"."abk_league_settings" TO "anon";

GRANT DELETE ON "public"."abk_league_settings" TO "anon";

GRANT REFERENCES ON "public"."abk_league_settings" TO "anon";

GRANT TRIGGER ON "public"."abk_league_settings" TO "anon";

GRANT INSERT ON "public"."abk_league_settings" TO "authenticated";

GRANT SELECT ON "public"."abk_league_settings" TO "authenticated";

GRANT UPDATE ON "public"."abk_league_settings" TO "authenticated";

GRANT DELETE ON "public"."abk_league_settings" TO "authenticated";

GRANT REFERENCES ON "public"."abk_league_settings" TO "authenticated";

GRANT TRIGGER ON "public"."abk_league_settings" TO "authenticated";

GRANT INSERT ON "public"."abk_league_settings" TO "service_role";

GRANT SELECT ON "public"."abk_league_settings" TO "service_role";

GRANT UPDATE ON "public"."abk_league_settings" TO "service_role";

GRANT DELETE ON "public"."abk_league_settings" TO "service_role";

GRANT TRUNCATE ON "public"."abk_league_settings" TO "service_role";

GRANT REFERENCES ON "public"."abk_league_settings" TO "service_role";

GRANT TRIGGER ON "public"."abk_league_settings" TO "service_role";

GRANT INSERT ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT SELECT ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT UPDATE ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT DELETE ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_mandiri_purchases" TO "authenticated";

GRANT INSERT ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT SELECT ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT UPDATE ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT DELETE ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT REFERENCES ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT TRIGGER ON "public"."logistics_mandiri_purchases" TO "service_role";

GRANT INSERT ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT SELECT ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT UPDATE ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT DELETE ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_mandiri_purchase_allocations" TO "authenticated";

GRANT INSERT ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT SELECT ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT UPDATE ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT DELETE ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT REFERENCES ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT TRIGGER ON "public"."logistics_mandiri_purchase_allocations" TO "service_role";

GRANT INSERT ON "public"."advances" TO "authenticated";

GRANT SELECT ON "public"."advances" TO "authenticated";

GRANT UPDATE ON "public"."advances" TO "authenticated";

GRANT DELETE ON "public"."advances" TO "authenticated";

GRANT INSERT ON "public"."advances" TO "service_role";

GRANT SELECT ON "public"."advances" TO "service_role";

GRANT UPDATE ON "public"."advances" TO "service_role";

GRANT DELETE ON "public"."advances" TO "service_role";

GRANT TRUNCATE ON "public"."advances" TO "service_role";

GRANT REFERENCES ON "public"."advances" TO "service_role";

GRANT TRIGGER ON "public"."advances" TO "service_role";

GRANT INSERT ON "public"."production_estimates" TO "anon";

GRANT SELECT ON "public"."production_estimates" TO "anon";

GRANT UPDATE ON "public"."production_estimates" TO "anon";

GRANT DELETE ON "public"."production_estimates" TO "anon";

GRANT REFERENCES ON "public"."production_estimates" TO "anon";

GRANT TRIGGER ON "public"."production_estimates" TO "anon";

GRANT INSERT ON "public"."production_estimates" TO "authenticated";

GRANT SELECT ON "public"."production_estimates" TO "authenticated";

GRANT UPDATE ON "public"."production_estimates" TO "authenticated";

GRANT DELETE ON "public"."production_estimates" TO "authenticated";

GRANT REFERENCES ON "public"."production_estimates" TO "authenticated";

GRANT TRIGGER ON "public"."production_estimates" TO "authenticated";

GRANT INSERT ON "public"."production_estimates" TO "service_role";

GRANT SELECT ON "public"."production_estimates" TO "service_role";

GRANT UPDATE ON "public"."production_estimates" TO "service_role";

GRANT DELETE ON "public"."production_estimates" TO "service_role";

GRANT TRUNCATE ON "public"."production_estimates" TO "service_role";

GRANT REFERENCES ON "public"."production_estimates" TO "service_role";

GRANT TRIGGER ON "public"."production_estimates" TO "service_role";

GRANT INSERT ON "public"."production_estimate_sizes" TO "anon";

GRANT SELECT ON "public"."production_estimate_sizes" TO "anon";

GRANT UPDATE ON "public"."production_estimate_sizes" TO "anon";

GRANT DELETE ON "public"."production_estimate_sizes" TO "anon";

GRANT REFERENCES ON "public"."production_estimate_sizes" TO "anon";

GRANT TRIGGER ON "public"."production_estimate_sizes" TO "anon";

GRANT INSERT ON "public"."production_estimate_sizes" TO "authenticated";

GRANT SELECT ON "public"."production_estimate_sizes" TO "authenticated";

GRANT UPDATE ON "public"."production_estimate_sizes" TO "authenticated";

GRANT DELETE ON "public"."production_estimate_sizes" TO "authenticated";

GRANT REFERENCES ON "public"."production_estimate_sizes" TO "authenticated";

GRANT TRIGGER ON "public"."production_estimate_sizes" TO "authenticated";

GRANT INSERT ON "public"."production_estimate_sizes" TO "service_role";

GRANT SELECT ON "public"."production_estimate_sizes" TO "service_role";

GRANT UPDATE ON "public"."production_estimate_sizes" TO "service_role";

GRANT DELETE ON "public"."production_estimate_sizes" TO "service_role";

GRANT TRUNCATE ON "public"."production_estimate_sizes" TO "service_role";

GRANT REFERENCES ON "public"."production_estimate_sizes" TO "service_role";

GRANT TRIGGER ON "public"."production_estimate_sizes" TO "service_role";

GRANT INSERT ON "public"."production_abk_results" TO "anon";

GRANT SELECT ON "public"."production_abk_results" TO "anon";

GRANT UPDATE ON "public"."production_abk_results" TO "anon";

GRANT DELETE ON "public"."production_abk_results" TO "anon";

GRANT REFERENCES ON "public"."production_abk_results" TO "anon";

GRANT TRIGGER ON "public"."production_abk_results" TO "anon";

GRANT INSERT ON "public"."production_abk_results" TO "authenticated";

GRANT SELECT ON "public"."production_abk_results" TO "authenticated";

GRANT UPDATE ON "public"."production_abk_results" TO "authenticated";

GRANT DELETE ON "public"."production_abk_results" TO "authenticated";

GRANT REFERENCES ON "public"."production_abk_results" TO "authenticated";

GRANT TRIGGER ON "public"."production_abk_results" TO "authenticated";

GRANT INSERT ON "public"."production_abk_results" TO "service_role";

GRANT SELECT ON "public"."production_abk_results" TO "service_role";

GRANT UPDATE ON "public"."production_abk_results" TO "service_role";

GRANT DELETE ON "public"."production_abk_results" TO "service_role";

GRANT TRUNCATE ON "public"."production_abk_results" TO "service_role";

GRANT REFERENCES ON "public"."production_abk_results" TO "service_role";

GRANT TRIGGER ON "public"."production_abk_results" TO "service_role";

GRANT INSERT ON "public"."production_abk_result_sizes" TO "anon";

GRANT SELECT ON "public"."production_abk_result_sizes" TO "anon";

GRANT UPDATE ON "public"."production_abk_result_sizes" TO "anon";

GRANT DELETE ON "public"."production_abk_result_sizes" TO "anon";

GRANT REFERENCES ON "public"."production_abk_result_sizes" TO "anon";

GRANT TRIGGER ON "public"."production_abk_result_sizes" TO "anon";

GRANT INSERT ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT SELECT ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT UPDATE ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT DELETE ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT REFERENCES ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT TRIGGER ON "public"."production_abk_result_sizes" TO "authenticated";

GRANT INSERT ON "public"."production_abk_result_sizes" TO "service_role";

GRANT SELECT ON "public"."production_abk_result_sizes" TO "service_role";

GRANT UPDATE ON "public"."production_abk_result_sizes" TO "service_role";

GRANT DELETE ON "public"."production_abk_result_sizes" TO "service_role";

GRANT TRUNCATE ON "public"."production_abk_result_sizes" TO "service_role";

GRANT REFERENCES ON "public"."production_abk_result_sizes" TO "service_role";

GRANT TRIGGER ON "public"."production_abk_result_sizes" TO "service_role";

GRANT INSERT ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT SELECT ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT UPDATE ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT DELETE ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT REFERENCES ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT TRIGGER ON "public"."logistics_company_adjustment_summary" TO "anon";

GRANT INSERT ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT SELECT ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT UPDATE ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT DELETE ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_company_adjustment_summary" TO "authenticated";

GRANT INSERT ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT SELECT ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT UPDATE ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT DELETE ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT REFERENCES ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT TRIGGER ON "public"."logistics_company_adjustment_summary" TO "service_role";

GRANT INSERT ON "public"."logistics_external_return_items" TO "anon";

GRANT SELECT ON "public"."logistics_external_return_items" TO "anon";

GRANT UPDATE ON "public"."logistics_external_return_items" TO "anon";

GRANT DELETE ON "public"."logistics_external_return_items" TO "anon";

GRANT REFERENCES ON "public"."logistics_external_return_items" TO "anon";

GRANT TRIGGER ON "public"."logistics_external_return_items" TO "anon";

GRANT INSERT ON "public"."logistics_external_return_items" TO "authenticated";

GRANT SELECT ON "public"."logistics_external_return_items" TO "authenticated";

GRANT UPDATE ON "public"."logistics_external_return_items" TO "authenticated";

GRANT DELETE ON "public"."logistics_external_return_items" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_external_return_items" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_external_return_items" TO "authenticated";

GRANT INSERT ON "public"."logistics_external_return_items" TO "service_role";

GRANT SELECT ON "public"."logistics_external_return_items" TO "service_role";

GRANT UPDATE ON "public"."logistics_external_return_items" TO "service_role";

GRANT DELETE ON "public"."logistics_external_return_items" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_external_return_items" TO "service_role";

GRANT REFERENCES ON "public"."logistics_external_return_items" TO "service_role";

GRANT TRIGGER ON "public"."logistics_external_return_items" TO "service_role";

GRANT INSERT ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT SELECT ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT UPDATE ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT DELETE ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT REFERENCES ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT TRIGGER ON "public"."logistics_rhpp_cost_summary" TO "anon";

GRANT INSERT ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT SELECT ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT UPDATE ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT DELETE ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_rhpp_cost_summary" TO "authenticated";

GRANT INSERT ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT SELECT ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT UPDATE ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT DELETE ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT REFERENCES ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT TRIGGER ON "public"."logistics_rhpp_cost_summary" TO "service_role";

GRANT INSERT ON "public"."logistics_external_return_transfers" TO "anon";

GRANT SELECT ON "public"."logistics_external_return_transfers" TO "anon";

GRANT UPDATE ON "public"."logistics_external_return_transfers" TO "anon";

GRANT DELETE ON "public"."logistics_external_return_transfers" TO "anon";

GRANT REFERENCES ON "public"."logistics_external_return_transfers" TO "anon";

GRANT TRIGGER ON "public"."logistics_external_return_transfers" TO "anon";

GRANT INSERT ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT SELECT ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT UPDATE ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT DELETE ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_external_return_transfers" TO "authenticated";

GRANT INSERT ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT SELECT ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT UPDATE ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT DELETE ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT REFERENCES ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT TRIGGER ON "public"."logistics_external_return_transfers" TO "service_role";

GRANT INSERT ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT SELECT ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT UPDATE ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT DELETE ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT REFERENCES ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT TRIGGER ON "public"."marketing_external_meat_purchases" TO "anon";

GRANT INSERT ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT SELECT ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT UPDATE ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT DELETE ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT REFERENCES ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT TRIGGER ON "public"."marketing_external_meat_purchases" TO "authenticated";

GRANT INSERT ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT SELECT ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT UPDATE ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT DELETE ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT TRUNCATE ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT REFERENCES ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT TRIGGER ON "public"."marketing_external_meat_purchases" TO "service_role";

GRANT INSERT ON "public"."advance_payments" TO "authenticated";

GRANT SELECT ON "public"."advance_payments" TO "authenticated";

GRANT UPDATE ON "public"."advance_payments" TO "authenticated";

GRANT DELETE ON "public"."advance_payments" TO "authenticated";

GRANT INSERT ON "public"."advance_payments" TO "service_role";

GRANT SELECT ON "public"."advance_payments" TO "service_role";

GRANT UPDATE ON "public"."advance_payments" TO "service_role";

GRANT DELETE ON "public"."advance_payments" TO "service_role";

GRANT TRUNCATE ON "public"."advance_payments" TO "service_role";

GRANT REFERENCES ON "public"."advance_payments" TO "service_role";

GRANT TRIGGER ON "public"."advance_payments" TO "service_role";

GRANT INSERT ON "public"."logistics_external_returns" TO "anon";

GRANT SELECT ON "public"."logistics_external_returns" TO "anon";

GRANT UPDATE ON "public"."logistics_external_returns" TO "anon";

GRANT DELETE ON "public"."logistics_external_returns" TO "anon";

GRANT REFERENCES ON "public"."logistics_external_returns" TO "anon";

GRANT TRIGGER ON "public"."logistics_external_returns" TO "anon";

GRANT INSERT ON "public"."logistics_external_returns" TO "authenticated";

GRANT SELECT ON "public"."logistics_external_returns" TO "authenticated";

GRANT UPDATE ON "public"."logistics_external_returns" TO "authenticated";

GRANT DELETE ON "public"."logistics_external_returns" TO "authenticated";

GRANT REFERENCES ON "public"."logistics_external_returns" TO "authenticated";

GRANT TRIGGER ON "public"."logistics_external_returns" TO "authenticated";

GRANT INSERT ON "public"."logistics_external_returns" TO "service_role";

GRANT SELECT ON "public"."logistics_external_returns" TO "service_role";

GRANT UPDATE ON "public"."logistics_external_returns" TO "service_role";

GRANT DELETE ON "public"."logistics_external_returns" TO "service_role";

GRANT TRUNCATE ON "public"."logistics_external_returns" TO "service_role";

GRANT REFERENCES ON "public"."logistics_external_returns" TO "service_role";

GRANT TRIGGER ON "public"."logistics_external_returns" TO "service_role";

GRANT INSERT ON "public"."marketing_customers" TO "authenticated";

GRANT SELECT ON "public"."marketing_customers" TO "authenticated";

GRANT UPDATE ON "public"."marketing_customers" TO "authenticated";

GRANT DELETE ON "public"."marketing_customers" TO "authenticated";

GRANT REFERENCES ON "public"."marketing_customers" TO "authenticated";

GRANT TRIGGER ON "public"."marketing_customers" TO "authenticated";

GRANT INSERT ON "public"."marketing_customers" TO "service_role";

GRANT SELECT ON "public"."marketing_customers" TO "service_role";

GRANT UPDATE ON "public"."marketing_customers" TO "service_role";

GRANT DELETE ON "public"."marketing_customers" TO "service_role";

GRANT TRUNCATE ON "public"."marketing_customers" TO "service_role";

GRANT REFERENCES ON "public"."marketing_customers" TO "service_role";

GRANT TRIGGER ON "public"."marketing_customers" TO "service_role";

GRANT SELECT ON "public"."rhpp_system_final" TO "authenticated";

GRANT INSERT ON "public"."rhpp_system_final" TO "service_role";

GRANT SELECT ON "public"."rhpp_system_final" TO "service_role";

GRANT UPDATE ON "public"."rhpp_system_final" TO "service_role";

GRANT DELETE ON "public"."rhpp_system_final" TO "service_role";

GRANT TRUNCATE ON "public"."rhpp_system_final" TO "service_role";

GRANT REFERENCES ON "public"."rhpp_system_final" TO "service_role";

GRANT TRIGGER ON "public"."rhpp_system_final" TO "service_role";

GRANT INSERT ON "public"."abk_cycle_salaries" TO "anon";

GRANT SELECT ON "public"."abk_cycle_salaries" TO "anon";

GRANT UPDATE ON "public"."abk_cycle_salaries" TO "anon";

GRANT DELETE ON "public"."abk_cycle_salaries" TO "anon";

GRANT REFERENCES ON "public"."abk_cycle_salaries" TO "anon";

GRANT TRIGGER ON "public"."abk_cycle_salaries" TO "anon";

GRANT INSERT ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT SELECT ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT UPDATE ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT DELETE ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT REFERENCES ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT TRIGGER ON "public"."abk_cycle_salaries" TO "authenticated";

GRANT INSERT ON "public"."abk_cycle_salaries" TO "service_role";

GRANT SELECT ON "public"."abk_cycle_salaries" TO "service_role";

GRANT UPDATE ON "public"."abk_cycle_salaries" TO "service_role";

GRANT DELETE ON "public"."abk_cycle_salaries" TO "service_role";

GRANT TRUNCATE ON "public"."abk_cycle_salaries" TO "service_role";

GRANT REFERENCES ON "public"."abk_cycle_salaries" TO "service_role";

GRANT TRIGGER ON "public"."abk_cycle_salaries" TO "service_role";

GRANT SELECT ON "public"."audit_events" TO "authenticated";

GRANT INSERT ON "public"."audit_events" TO "service_role";

GRANT SELECT ON "public"."audit_events" TO "service_role";

GRANT UPDATE ON "public"."audit_events" TO "service_role";

GRANT DELETE ON "public"."audit_events" TO "service_role";

GRANT TRUNCATE ON "public"."audit_events" TO "service_role";

GRANT REFERENCES ON "public"."audit_events" TO "service_role";

GRANT TRIGGER ON "public"."audit_events" TO "service_role";

GRANT INSERT ON "public"."production_cycle_final_unified" TO "anon";

GRANT SELECT ON "public"."production_cycle_final_unified" TO "anon";

GRANT UPDATE ON "public"."production_cycle_final_unified" TO "anon";

GRANT DELETE ON "public"."production_cycle_final_unified" TO "anon";

GRANT REFERENCES ON "public"."production_cycle_final_unified" TO "anon";

GRANT TRIGGER ON "public"."production_cycle_final_unified" TO "anon";

GRANT INSERT ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT SELECT ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT UPDATE ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT DELETE ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT REFERENCES ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT TRIGGER ON "public"."production_cycle_final_unified" TO "authenticated";

GRANT INSERT ON "public"."production_cycle_final_unified" TO "service_role";

GRANT SELECT ON "public"."production_cycle_final_unified" TO "service_role";

GRANT UPDATE ON "public"."production_cycle_final_unified" TO "service_role";

GRANT DELETE ON "public"."production_cycle_final_unified" TO "service_role";

GRANT TRUNCATE ON "public"."production_cycle_final_unified" TO "service_role";

GRANT REFERENCES ON "public"."production_cycle_final_unified" TO "service_role";

GRANT TRIGGER ON "public"."production_cycle_final_unified" TO "service_role";

GRANT INSERT ON "public"."finance_expedition_trips" TO "anon";

GRANT SELECT ON "public"."finance_expedition_trips" TO "anon";

GRANT UPDATE ON "public"."finance_expedition_trips" TO "anon";

GRANT DELETE ON "public"."finance_expedition_trips" TO "anon";

GRANT REFERENCES ON "public"."finance_expedition_trips" TO "anon";

GRANT TRIGGER ON "public"."finance_expedition_trips" TO "anon";

GRANT INSERT ON "public"."finance_expedition_trips" TO "authenticated";

GRANT SELECT ON "public"."finance_expedition_trips" TO "authenticated";

GRANT UPDATE ON "public"."finance_expedition_trips" TO "authenticated";

GRANT DELETE ON "public"."finance_expedition_trips" TO "authenticated";

GRANT REFERENCES ON "public"."finance_expedition_trips" TO "authenticated";

GRANT TRIGGER ON "public"."finance_expedition_trips" TO "authenticated";

GRANT INSERT ON "public"."finance_expedition_trips" TO "service_role";

GRANT SELECT ON "public"."finance_expedition_trips" TO "service_role";

GRANT UPDATE ON "public"."finance_expedition_trips" TO "service_role";

GRANT DELETE ON "public"."finance_expedition_trips" TO "service_role";

GRANT TRUNCATE ON "public"."finance_expedition_trips" TO "service_role";

GRANT REFERENCES ON "public"."finance_expedition_trips" TO "service_role";

GRANT TRIGGER ON "public"."finance_expedition_trips" TO "service_role";

GRANT INSERT ON "public"."cycle_performance" TO "anon";

GRANT SELECT ON "public"."cycle_performance" TO "anon";

GRANT UPDATE ON "public"."cycle_performance" TO "anon";

GRANT DELETE ON "public"."cycle_performance" TO "anon";

GRANT REFERENCES ON "public"."cycle_performance" TO "anon";

GRANT TRIGGER ON "public"."cycle_performance" TO "anon";

GRANT INSERT ON "public"."cycle_performance" TO "authenticated";

GRANT SELECT ON "public"."cycle_performance" TO "authenticated";

GRANT UPDATE ON "public"."cycle_performance" TO "authenticated";

GRANT DELETE ON "public"."cycle_performance" TO "authenticated";

GRANT REFERENCES ON "public"."cycle_performance" TO "authenticated";

GRANT TRIGGER ON "public"."cycle_performance" TO "authenticated";

GRANT INSERT ON "public"."cycle_performance" TO "service_role";

GRANT SELECT ON "public"."cycle_performance" TO "service_role";

GRANT UPDATE ON "public"."cycle_performance" TO "service_role";

GRANT DELETE ON "public"."cycle_performance" TO "service_role";

GRANT TRUNCATE ON "public"."cycle_performance" TO "service_role";

GRANT REFERENCES ON "public"."cycle_performance" TO "service_role";

GRANT TRIGGER ON "public"."cycle_performance" TO "service_role";

GRANT INSERT ON "public"."daily_performance" TO "anon";

GRANT SELECT ON "public"."daily_performance" TO "anon";

GRANT UPDATE ON "public"."daily_performance" TO "anon";

GRANT DELETE ON "public"."daily_performance" TO "anon";

GRANT REFERENCES ON "public"."daily_performance" TO "anon";

GRANT TRIGGER ON "public"."daily_performance" TO "anon";

GRANT INSERT ON "public"."daily_performance" TO "authenticated";

GRANT SELECT ON "public"."daily_performance" TO "authenticated";

GRANT UPDATE ON "public"."daily_performance" TO "authenticated";

GRANT DELETE ON "public"."daily_performance" TO "authenticated";

GRANT REFERENCES ON "public"."daily_performance" TO "authenticated";

GRANT TRIGGER ON "public"."daily_performance" TO "authenticated";

GRANT INSERT ON "public"."daily_performance" TO "service_role";

GRANT SELECT ON "public"."daily_performance" TO "service_role";

GRANT UPDATE ON "public"."daily_performance" TO "service_role";

GRANT DELETE ON "public"."daily_performance" TO "service_role";

GRANT TRUNCATE ON "public"."daily_performance" TO "service_role";

GRANT REFERENCES ON "public"."daily_performance" TO "service_role";

GRANT TRIGGER ON "public"."daily_performance" TO "service_role";

GRANT INSERT ON "public"."harvest_contract_preview" TO "anon";

GRANT SELECT ON "public"."harvest_contract_preview" TO "anon";

GRANT UPDATE ON "public"."harvest_contract_preview" TO "anon";

GRANT DELETE ON "public"."harvest_contract_preview" TO "anon";

GRANT REFERENCES ON "public"."harvest_contract_preview" TO "anon";

GRANT TRIGGER ON "public"."harvest_contract_preview" TO "anon";

GRANT INSERT ON "public"."harvest_contract_preview" TO "authenticated";

GRANT SELECT ON "public"."harvest_contract_preview" TO "authenticated";

GRANT UPDATE ON "public"."harvest_contract_preview" TO "authenticated";

GRANT DELETE ON "public"."harvest_contract_preview" TO "authenticated";

GRANT REFERENCES ON "public"."harvest_contract_preview" TO "authenticated";

GRANT TRIGGER ON "public"."harvest_contract_preview" TO "authenticated";

GRANT INSERT ON "public"."harvest_contract_preview" TO "service_role";

GRANT SELECT ON "public"."harvest_contract_preview" TO "service_role";

GRANT UPDATE ON "public"."harvest_contract_preview" TO "service_role";

GRANT DELETE ON "public"."harvest_contract_preview" TO "service_role";

GRANT TRUNCATE ON "public"."harvest_contract_preview" TO "service_role";

GRANT REFERENCES ON "public"."harvest_contract_preview" TO "service_role";

GRANT TRIGGER ON "public"."harvest_contract_preview" TO "service_role";

GRANT INSERT ON "public"."ppl_league" TO "anon";

GRANT SELECT ON "public"."ppl_league" TO "anon";

GRANT UPDATE ON "public"."ppl_league" TO "anon";

GRANT DELETE ON "public"."ppl_league" TO "anon";

GRANT REFERENCES ON "public"."ppl_league" TO "anon";

GRANT TRIGGER ON "public"."ppl_league" TO "anon";

GRANT INSERT ON "public"."ppl_league" TO "authenticated";

GRANT SELECT ON "public"."ppl_league" TO "authenticated";

GRANT UPDATE ON "public"."ppl_league" TO "authenticated";

GRANT DELETE ON "public"."ppl_league" TO "authenticated";

GRANT REFERENCES ON "public"."ppl_league" TO "authenticated";

GRANT TRIGGER ON "public"."ppl_league" TO "authenticated";

GRANT INSERT ON "public"."ppl_league" TO "service_role";

GRANT SELECT ON "public"."ppl_league" TO "service_role";

GRANT UPDATE ON "public"."ppl_league" TO "service_role";

GRANT DELETE ON "public"."ppl_league" TO "service_role";

GRANT TRUNCATE ON "public"."ppl_league" TO "service_role";

GRANT REFERENCES ON "public"."ppl_league" TO "service_role";

GRANT TRIGGER ON "public"."ppl_league" TO "service_role";

GRANT INSERT ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT SELECT ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT UPDATE ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT DELETE ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT REFERENCES ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT TRIGGER ON "public"."finance_mandiri_supplier_payments" TO "anon";

GRANT INSERT ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT SELECT ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT UPDATE ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT DELETE ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT REFERENCES ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT TRIGGER ON "public"."finance_mandiri_supplier_payments" TO "authenticated";

GRANT INSERT ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT SELECT ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT UPDATE ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT DELETE ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT TRUNCATE ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT REFERENCES ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT TRIGGER ON "public"."finance_mandiri_supplier_payments" TO "service_role";

GRANT INSERT ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT SELECT ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT UPDATE ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT DELETE ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT REFERENCES ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT TRIGGER ON "public"."warehouse_stock_shipments" TO "authenticated";

GRANT INSERT ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT SELECT ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT UPDATE ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT DELETE ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT TRUNCATE ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT REFERENCES ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT TRIGGER ON "public"."warehouse_stock_shipments" TO "service_role";

GRANT INSERT ON "public"."warehouse_stock_items" TO "authenticated";

GRANT SELECT ON "public"."warehouse_stock_items" TO "authenticated";

GRANT UPDATE ON "public"."warehouse_stock_items" TO "authenticated";

GRANT DELETE ON "public"."warehouse_stock_items" TO "authenticated";

GRANT REFERENCES ON "public"."warehouse_stock_items" TO "authenticated";

GRANT TRIGGER ON "public"."warehouse_stock_items" TO "authenticated";

GRANT INSERT ON "public"."warehouse_stock_items" TO "service_role";

GRANT SELECT ON "public"."warehouse_stock_items" TO "service_role";

GRANT UPDATE ON "public"."warehouse_stock_items" TO "service_role";

GRANT DELETE ON "public"."warehouse_stock_items" TO "service_role";

GRANT TRUNCATE ON "public"."warehouse_stock_items" TO "service_role";

GRANT REFERENCES ON "public"."warehouse_stock_items" TO "service_role";

GRANT TRIGGER ON "public"."warehouse_stock_items" TO "service_role";

GRANT EXECUTE ON FUNCTION "private"."my_bms_role"() TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."my_bms_role"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."can_read_cycle"(cid uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."can_read_cycle"(cid uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "private"."can_edit_cycle"(cid uuid, allowed public.bms_role[]) TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."can_edit_cycle"(cid uuid, allowed public.bms_role[]) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."audit_and_guard"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."set_cycle_state"(p_cycle uuid, p_action text, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."set_cycle_state"(p_cycle uuid, p_action text, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."reset_bop_complete"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."assign_bms_role"(p_email text, p_role public.bms_role, p_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."assign_bms_role"(p_email text, p_role public.bms_role, p_name text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."check_advance_payment"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."validate_chick_in"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."validate_cycle_population"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."audit_master_change"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_contract_detail"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."assign_bms_role_impl"(p_email text, p_role public.bms_role, p_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."set_cycle_state_impl"(p_cycle uuid, p_action text, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."guard_barn_update"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."assign_barn_code"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."assign_master_auto_code"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."protect_master_auto_code"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."compute_recording_avg_weight"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."compute_chickin_avg_weight"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."normalize_item_unit"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."compute_supply_quantity_kg"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."compute_recording_feed_kg"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."bind_master_contract_to_cycle"(p_master_contract_id uuid, p_cycle_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."bind_master_contract_to_cycle"(p_master_contract_id uuid, p_cycle_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."protect_frozen_contract"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."protect_frozen_contract_detail"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."reassign_employee_code_on_kind_change"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."prevent_employee_delete"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."admin_list_bms_users_impl"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_list_bms_users"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_list_bms_users"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."admin_update_bms_user_impl"(p_user_id uuid, p_name text, p_role public.bms_role, p_active boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_update_bms_user"(p_user_id uuid, p_name text, p_role public.bms_role, p_active boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_update_bms_user"(p_user_id uuid, p_name text, p_role public.bms_role, p_active boolean) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."prepare_logistics_contract_assignment"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_logistics_shipment"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_logistics_shipment_item"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_logistics_return"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_logistics_return_item"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."autofill_logistics_shipment_price"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_logistics_contract_close_prices"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."autofill_logistics_return_price"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."assign_supplier_code"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."fill_external_shipment_quantity_kg"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."bind_master_contract_to_cycle_core"(p_master_contract_id uuid, p_cycle_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."production_feed_stock"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."production_feed_stock"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "private"."can_read_assignment"(aid uuid) TO anon;

GRANT EXECUTE ON FUNCTION "private"."can_read_assignment"(aid uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."can_read_assignment"(aid uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "private"."can_edit_assignment"(aid uuid, allowed public.bms_role[]) TO anon;

GRANT EXECUTE ON FUNCTION "private"."can_edit_assignment"(aid uuid, allowed public.bms_role[]) TO authenticated;

GRANT EXECUTE ON FUNCTION "private"."can_edit_assignment"(aid uuid, allowed public.bms_role[]) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_shipment_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_shipment_date date, p_shipping_note_number text, p_notes text, p_items jsonb) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_shipment_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_shipment_date date, p_shipping_note_number text, p_notes text, p_items jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_shipment_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_shipment_date date, p_shipping_note_number text, p_notes text, p_items jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_return_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_return_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_return_atomic"(p_id uuid, p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_external_sapronak_atomic"(p_header_id uuid, p_detail_id uuid, p_assignment_id uuid, p_barn_id uuid, p_supplier_id uuid, p_shipment_date date, p_reference_number text, p_notes text, p_item_id uuid, p_quantity numeric, p_purchase_unit_price numeric) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_external_sapronak_atomic"(p_header_id uuid, p_detail_id uuid, p_assignment_id uuid, p_barn_id uuid, p_supplier_id uuid, p_shipment_date date, p_reference_number text, p_notes text, p_item_id uuid, p_quantity numeric, p_purchase_unit_price numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_external_sapronak_atomic"(p_header_id uuid, p_detail_id uuid, p_assignment_id uuid, p_barn_id uuid, p_supplier_id uuid, p_shipment_date date, p_reference_number text, p_notes text, p_item_id uuid, p_quantity numeric, p_purchase_unit_price numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_recording_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_recorded_on date, p_age_days integer, p_mortality integer, p_culling integer, p_feed_item_id uuid, p_feed_quantity_units numeric, p_sample_count integer, p_sample_weight_total_kg numeric, p_notes text, p_photo_data text, p_weights jsonb) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_recording_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_recorded_on date, p_age_days integer, p_mortality integer, p_culling integer, p_feed_item_id uuid, p_feed_quantity_units numeric, p_sample_count integer, p_sample_weight_total_kg numeric, p_notes text, p_photo_data text, p_weights jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_recording_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_recorded_on date, p_age_days integer, p_mortality integer, p_culling integer, p_feed_item_id uuid, p_feed_quantity_units numeric, p_sample_count integer, p_sample_weight_total_kg numeric, p_notes text, p_photo_data text, p_weights jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_production_estimate_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_estimated_on date, p_remaining_birds integer, p_feed_used_kg numeric, p_notes text, p_estimated_revenue numeric, p_estimated_cost numeric, p_estimated_profit numeric, p_profit_per_chick_in numeric, p_sizes jsonb) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_production_estimate_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_estimated_on date, p_remaining_birds integer, p_feed_used_kg numeric, p_notes text, p_estimated_revenue numeric, p_estimated_cost numeric, p_estimated_profit numeric, p_profit_per_chick_in numeric, p_sizes jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_production_estimate_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_estimated_on date, p_remaining_birds integer, p_feed_used_kg numeric, p_notes text, p_estimated_revenue numeric, p_estimated_cost numeric, p_estimated_profit numeric, p_profit_per_chick_in numeric, p_sizes jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_result_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric, p_sizes jsonb) TO anon;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_result_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric, p_sizes jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_result_atomic"(p_id uuid, p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric, p_sizes jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_harvest_atomic"(p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_harvest_atomic"(p_assignment_id uuid, p_barn_id uuid, p_abk_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."update_production_abk_harvest_atomic"(p_size_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."update_production_abk_harvest_atomic"(p_size_id uuid, p_harvest_date date, p_birds integer, p_weight_kg numeric, p_feed_pre_kg numeric, p_feed_starter_kg numeric, p_feed_finisher_kg numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."delete_production_abk_harvest_atomic"(p_size_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."delete_production_abk_harvest_atomic"(p_size_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."lock_production_abk_basics_atomic"(p_link_id uuid, p_initial_birds integer, p_feed_pre_bags numeric, p_feed_starter_bags numeric, p_feed_finisher_bags numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."lock_production_abk_basics_atomic"(p_link_id uuid, p_initial_birds integer, p_feed_pre_bags numeric, p_feed_starter_bags numeric, p_feed_finisher_bags numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."prevent_locked_abk_basics_change"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_initial_population_atomic"(p_link_id uuid, p_initial_birds integer) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_production_abk_initial_population_atomic"(p_link_id uuid, p_initial_birds integer) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_external_sapronak_return_atomic"(p_id uuid, p_external_shipment_item_id uuid, p_return_date date, p_reference text, p_notes text, p_quantity numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_external_sapronak_return_atomic"(p_id uuid, p_external_shipment_item_id uuid, p_return_date date, p_reference text, p_notes text, p_quantity numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."transfer_external_sapronak_return_atomic"(p_external_return_item_id uuid, p_target_assignment_id uuid, p_quantity numeric, p_transferred_on date, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."transfer_external_sapronak_return_atomic"(p_external_return_item_id uuid, p_target_assignment_id uuid, p_quantity numeric, p_transferred_on date, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v2"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v2"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v3"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_rhpp_final_atomic"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v4"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v4"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_close_production_atomic"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_close_production_atomic"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_rhpp_real_atomic"(p_contract_assignment_id uuid, p_amount numeric, p_received_on date, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_rhpp_real_atomic"(p_contract_assignment_id uuid, p_amount numeric, p_received_on date, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_reopen_production_atomic"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_reopen_production_atomic"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v5"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v5"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_abk_advance_atomic"(p_contract_assignment_id uuid, p_abk_id uuid, p_advanced_on date, p_amount numeric, p_description text, p_reference text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_abk_advance_atomic"(p_contract_assignment_id uuid, p_abk_id uuid, p_advanced_on date, p_amount numeric, p_description text, p_reference text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_abk_salary_atomic"(p_contract_assignment_id uuid, p_abk_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_abk_salary_atomic"(p_contract_assignment_id uuid, p_abk_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cycle_profit_loss_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cycle_profit_loss_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_employee_advance_atomic"(p_employee_id uuid, p_advanced_on date, p_amount numeric, p_contract_assignment_id uuid, p_description text, p_reference text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_employee_advance_atomic"(p_employee_id uuid, p_advanced_on date, p_amount numeric, p_contract_assignment_id uuid, p_description text, p_reference text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_create_expedition_invoice_atomic"(p_invoice_number text, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_create_expedition_invoice_atomic"(p_invoice_number text, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_summary_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_summary_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_profit_loss_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_profit_loss_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_company_profit_loss_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_company_profit_loss_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_next_reference"(p_prefix text, p_date date) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_auto_reference_trigger"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."bms_backup_download_payload"(p_token text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cycle_profit_loss_v2"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cycle_profit_loss_v2"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_company_profit_loss_v2"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_company_profit_loss_v2"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v2"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v2"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_supplier_payables_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_supplier_payables_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_supplier_payment_atomic"(p_source_type text, p_source_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_supplier_payment_atomic"(p_source_type text, p_source_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_expedition_payment_atomic"(p_invoice_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_expedition_payment_atomic"(p_invoice_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_expedition_trip_atomic"(p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric, p_deduction numeric, p_notes text, p_destinations jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_expedition_trip_atomic"(p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric, p_deduction numeric, p_notes text, p_destinations jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_post_expedition_bop_for_trip"(p_trip_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_post_expedition_bop_for_trip"(p_trip_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_profit_loss_v2"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_expedition_profit_loss_v2"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_post_expedition_bop_for_trip"(p_trip_id uuid, p_operational_override numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_post_expedition_bop_for_trip"(p_trip_id uuid, p_operational_override numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_trip_op"(p_trip_id uuid, p_amount numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_trip_op"(p_trip_id uuid, p_amount numeric) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."production_ppl_directory"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."production_ppl_directory"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_mandiri_purchase_atomic"(p_purchase_id uuid, p_supplier_id uuid, p_item_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text, p_notes text, p_allocations jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_mandiri_purchase_atomic"(p_purchase_id uuid, p_supplier_id uuid, p_item_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text, p_notes text, p_allocations jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."delete_mandiri_purchase_atomic"(p_purchase_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."delete_mandiri_purchase_atomic"(p_purchase_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_close_mandiri_cycle_atomic"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_close_mandiri_cycle_atomic"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_mitra_split_return_atomic"(p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_mitra_split_return_atomic"(p_barn_id uuid, p_assignment_id uuid, p_return_date date, p_reference text, p_notes text, p_items jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."move_company_feed_atomic"(p_retained_feed_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."move_company_feed_atomic"(p_retained_feed_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_split_return"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_receive_mandiri_sale_atomic"(p_harvest_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_receive_mandiri_sale_atomic"(p_harvest_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."production_mandiri_rhpp_summary"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."production_mandiri_rhpp_summary"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_paid_mandiri_harvest"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_pay_mandiri_supplier_atomic"(p_purchase_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_pay_mandiri_supplier_atomic"(p_purchase_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_transaction_v1"(p_table text, p_id text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_transaction_v1"(p_table text, p_id text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_employee_advance_v1"(p_id uuid, p_employee_id uuid, p_advanced_on date, p_amount numeric, p_description text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_employee_advance_v1"(p_id uuid, p_employee_id uuid, p_advanced_on date, p_amount numeric, p_description text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_advance_payment_v1"(p_id uuid, p_advance_id uuid, p_paid_on date, p_amount numeric, p_method text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_advance_payment_v1"(p_id uuid, p_advance_id uuid, p_paid_on date, p_amount numeric, p_method text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_mandiri_receipt_v1"(p_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_mandiri_receipt_v1"(p_id uuid, p_received_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_mandiri_supplier_payment_v1"(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_mandiri_supplier_payment_v1"(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_supplier_payment_v1"(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_supplier_payment_v1"(p_id uuid, p_paid_on date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_rhpp_real_v1"(p_id uuid, p_received_on date, p_amount numeric, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_rhpp_real_v1"(p_id uuid, p_received_on date, p_amount numeric, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_abk_salary_v1"(p_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_abk_salary_v1"(p_id uuid, p_gross_salary numeric, p_advance_deduction numeric, p_paid_on date, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_abk_salary_v1"(p_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_abk_salary_v1"(p_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_trip_bop_v1"(p_trip_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_trip_bop_v1"(p_trip_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_trip_v1"(p_trip_id uuid, p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric, p_deduction numeric, p_notes text, p_destinations jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_trip_v1"(p_trip_id uuid, p_trip_date date, p_mts_sj text, p_rr text, p_driver text, p_vehicle text, p_zone text, p_trip_price numeric, p_additional numeric, p_deduction numeric, p_notes text, p_destinations jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_trip_v1"(p_trip_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_trip_v1"(p_trip_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_invoice_v1"(p_invoice_id uuid, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_correct_expedition_invoice_v1"(p_invoice_id uuid, p_invoice_date date, p_due_date date, p_customer_name text, p_customer_address text, p_trip_ids uuid[], p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_invoice_v1"(p_invoice_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_expedition_invoice_v1"(p_invoice_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."logistics_correct_mitra_split_return_v1"(p_retained_feed_id uuid, p_return_date date, p_physical_quantity numeric, p_accepted_quantity numeric, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."logistics_correct_mitra_split_return_v1"(p_retained_feed_id uuid, p_return_date date, p_physical_quantity numeric, p_accepted_quantity numeric, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."logistics_correct_company_feed_movement_v1"(p_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."logistics_correct_company_feed_movement_v1"(p_id uuid, p_contract_assignment_id uuid, p_direction text, p_quantity numeric, p_transferred_on date, p_reference text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_company_feed_movement_v1"(p_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_company_feed_movement_v1"(p_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_mitra_split_return_v1"(p_retained_feed_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_mitra_split_return_v1"(p_retained_feed_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."log_user_activity"(p_event_type text, p_tab_key text, p_device_type text, p_detail jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."log_user_activity"(p_event_type text, p_tab_key text, p_device_type text, p_detail jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."production_feed_stock_as_of"(p_contract_assignment_id uuid, p_as_of_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."production_feed_stock_as_of"(p_contract_assignment_id uuid, p_as_of_date date) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_set_finance_bop_period_access"(p_assignment_id uuid, p_is_open boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_set_finance_bop_period_access"(p_assignment_id uuid, p_is_open boolean) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."set_barn_asset_reference"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_equipment_purchase_atomic"(p_id uuid, p_supplier_id uuid, p_item_id uuid, p_barn_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_logistics_equipment_purchase_atomic"(p_id uuid, p_supplier_id uuid, p_item_id uuid, p_barn_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_direct_purchase_atomic"(p_purchase_date date, p_purchase_type text, p_standard_name text, p_description text, p_supplier_id uuid, p_supplier_name text, p_barn_id uuid, p_contract_assignment_id uuid, p_quantity numeric, p_unit text, p_unit_price numeric, p_payment_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v6"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_rhpp_summary_v6"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v3"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v3"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_direct_purchase_atomic"(p_purchase_date date, p_purchase_type text, p_standard_name text, p_description text, p_supplier_id uuid, p_supplier_name text, p_barn_id uuid, p_contract_assignment_id uuid, p_quantity numeric, p_unit text, p_unit_price numeric, p_payment_method text, p_reference text, p_notes text, p_asset_location_type text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_asset_invoice_atomic"(p_purchase_date date, p_supplier_name text, p_asset_location_type text, p_barn_id uuid, p_payment_method text, p_reference text, p_notes text, p_items jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_asset_invoice_atomic"(p_purchase_date date, p_supplier_name text, p_asset_location_type text, p_barn_id uuid, p_payment_method text, p_reference text, p_notes text, p_items jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_save_stock_invoice_atomic"(p_purchase_date date, p_supplier_name text, p_payment_method text, p_reference text, p_notes text, p_items jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_save_stock_invoice_atomic"(p_purchase_date date, p_supplier_name text, p_payment_method text, p_reference text, p_notes text, p_items jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."logistics_send_warehouse_stock_atomic"(p_stock_item_id uuid, p_shipment_date date, p_destination_type text, p_barn_id uuid, p_quantity numeric, p_make_asset boolean, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."logistics_send_warehouse_stock_atomic"(p_stock_item_id uuid, p_shipment_date date, p_destination_type text, p_barn_id uuid, p_quantity numeric, p_make_asset boolean, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v4"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v4"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_correct_closed_abk_population_v1"(p_link_id uuid, p_initial_birds integer) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_correct_closed_abk_population_v1"(p_link_id uuid, p_initial_birds integer) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_reopen_cycle_v1"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_reopen_cycle_v1"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_reclose_cycle_v1"(p_contract_assignment_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_reclose_cycle_v1"(p_contract_assignment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."save_chick_in_with_abks_v1"(p_chick_id uuid, p_assignment_id uuid, p_arrived_on date, p_received integer, p_doa integer, p_avg_weight numeric, p_delivery_number text, p_abks jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."save_chick_in_with_abks_v1"(p_chick_id uuid, p_assignment_id uuid, p_arrived_on date, p_received integer, p_doa integer, p_avg_weight numeric, p_delivery_number text, p_abks jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_frozen_contract"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_frozen_contract_child"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_original_note_v1"(p_note text) TO anon;

GRANT EXECUTE ON FUNCTION "public"."finance_original_note_v1"(p_note text) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_original_note_v1"(p_note text) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v5"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v5"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v6"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."finance_cashflow_entries_v6"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."admin_cleanup_closed_bop_legacy_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."admin_cleanup_closed_bop_legacy_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "private"."get_abk_leaderboard_data_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."get_abk_leaderboard_data_v1"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."get_abk_leaderboard_data_v1"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."bms_execute_operation"(p_operation_id uuid, p_action text, p_params jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."bms_execute_operation"(p_operation_id uuid, p_action text, p_params jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION "public"."bms_export_archive"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."bms_export_archive"() TO service_role;

GRANT EXECUTE ON FUNCTION "public"."bms_export_recovery_document"() TO authenticated;

GRANT EXECUTE ON FUNCTION "public"."bms_export_recovery_document"() TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO authenticated, service_role;

INSERT INTO "private"."bms_rpc_allowlist"(function_oid,action) SELECT p.oid::regprocedure,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY['admin_cleanup_closed_bop_legacy_v1', 'admin_close_mandiri_cycle_atomic', 'admin_close_production_atomic', 'admin_correct_closed_abk_population_v1', 'admin_delete_abk_salary_v1', 'admin_delete_company_feed_movement_v1', 'admin_delete_expedition_invoice_v1', 'admin_delete_expedition_trip_bop_v1', 'admin_delete_expedition_trip_v1', 'admin_delete_mitra_split_return_v1', 'admin_delete_transaction_v1', 'admin_reclose_cycle_v1', 'admin_reopen_cycle_v1', 'admin_set_finance_bop_period_access', 'admin_update_bms_user', 'delete_mandiri_purchase_atomic', 'delete_production_abk_harvest_atomic', 'finance_correct_abk_salary_v1', 'finance_correct_advance_payment_v1', 'finance_correct_employee_advance_v1', 'finance_correct_expedition_invoice_v1', 'finance_correct_expedition_trip_op', 'finance_correct_expedition_trip_v1', 'finance_correct_mandiri_receipt_v1', 'finance_correct_mandiri_supplier_payment_v1', 'finance_correct_rhpp_real_v1', 'finance_correct_supplier_payment_v1', 'finance_create_expedition_invoice_atomic', 'finance_pay_mandiri_supplier_atomic', 'finance_post_expedition_bop_for_trip', 'finance_receive_mandiri_sale_atomic', 'finance_save_abk_salary_atomic', 'finance_save_asset_invoice_atomic', 'finance_save_employee_advance_atomic', 'finance_save_expedition_payment_atomic', 'finance_save_expedition_trip_atomic', 'finance_save_rhpp_real_atomic', 'finance_save_stock_invoice_atomic', 'finance_save_supplier_payment_atomic', 'lock_production_abk_basics_atomic', 'logistics_correct_company_feed_movement_v1', 'logistics_correct_mitra_split_return_v1', 'move_company_feed_atomic', 'save_chick_in_with_abks_v1', 'save_external_sapronak_atomic', 'save_external_sapronak_return_atomic', 'save_logistics_equipment_purchase_atomic', 'save_logistics_return_atomic', 'save_logistics_shipment_atomic', 'save_mandiri_purchase_atomic', 'save_mitra_split_return_atomic', 'save_production_abk_initial_population_atomic', 'save_production_estimate_atomic', 'save_recording_atomic', 'transfer_external_sapronak_return_atomic']) ON CONFLICT DO NOTHING;


-- Post-snapshot business definitions synchronized from live production.
-- 2026-10-01
-- Tambah Daging: birds are required for new/edited transactions.
-- Contract price is derived from BW = weight_kg / birds and cannot be overridden by the client.
-- Existing legacy rows remain untouched; birds may stay NULL until explicitly corrected with real source data.

alter table public.marketing_external_meat_purchases
  add column if not exists birds integer;

alter table public.marketing_external_meat_purchases
  drop constraint if exists marketing_external_meat_purchases_birds_positive;

alter table public.marketing_external_meat_purchases
  add constraint marketing_external_meat_purchases_birds_positive
  check (birds is null or birds > 0);

create or replace function private.guard_external_meat_contract_price()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_contract_id uuid;
  v_assignment_barn uuid;
  v_active boolean;
  v_avg numeric;
  v_price numeric;
begin
  if new.birds is null or new.birds <= 0 then
    raise exception 'Ekor Tambah Daging wajib lebih dari 0.';
  end if;
  if new.weight_kg is null or new.weight_kg <= 0 then
    raise exception 'Berat Tambah Daging wajib lebih dari 0 Kg.';
  end if;

  select a.master_contract_id,a.barn_id,a.active
    into v_contract_id,v_assignment_barn,v_active
  from public.logistics_contract_assignments a
  where a.id=new.contract_assignment_id;

  if v_contract_id is null then
    raise exception 'Kontrak siklus Tambah Daging tidak ditemukan.';
  end if;
  if not coalesce(v_active,false) then
    raise exception 'Siklus sudah CLOSED. Tambah Daging terkunci.';
  end if;
  if new.barn_id is distinct from v_assignment_barn then
    raise exception 'Kandang Tambah Daging tidak sesuai dengan kontrak siklus.';
  end if;

  v_avg := new.weight_kg / new.birds;

  select p.price_per_kg
    into v_price
  from public.contract_live_prices p
  where p.contract_id=v_contract_id
    and v_avg >= p.min_weight_kg
    and (p.max_weight_kg is null or v_avg < p.max_weight_kg)
  order by p.min_weight_kg desc
  limit 1;

  if v_price is null or v_price <= 0 then
    raise exception 'Harga kontrak untuk BW % Kg belum tersedia.', round(v_avg,3);
  end if;
  if new.purchase_price_per_kg is null or new.purchase_price_per_kg <= 0 then
    raise exception 'Harga beli aktual per Kg wajib lebih dari 0.';
  end if;

  return new;
end
$$;

revoke all on function private.guard_external_meat_contract_price() from public, anon, authenticated;

drop trigger if exists a_guard_external_meat_contract_price
  on public.marketing_external_meat_purchases;

create trigger a_guard_external_meat_contract_price
before insert or update on public.marketing_external_meat_purchases
for each row execute function private.guard_external_meat_contract_price();

-- 2026-10-01
-- Final concept:
-- 1. Tambah Daging contributes to RHPP performance and production value.
-- 2. Tambah Sapronak/Pakan perusahaan does not enter RHPP/FCR/IP or contract sapronak cost.
-- 3. RHPP contract is calculated first from production value + contract bonuses - contract sapronak.
-- 4. At the end, company costs are deducted: Tambah Daging + Tambah Sapronak/Pakan.
-- 5. Close Produksi stores the final amount after both company additions are deducted.

CREATE OR REPLACE FUNCTION public.finance_rhpp_summary_v3()
 RETURNS TABLE(contract_assignment_id uuid, barn_id uuid, barn_code text, barn_name text, contract_number text, active boolean, chick_in_birds numeric, total_harvest_birds numeric, total_harvest_kg numeric, avg_bw_kg numeric, weighted_age numeric, implied_depletion_birds numeric, recorded_depletion_birds numeric, depletion_variance_birds numeric, mortality_pct numeric, main_feed_kg numeric, external_feed_kg numeric, net_feed_kg numeric, fcr_actual numeric, fcr_standard numeric, diff_fcr numeric, ip numeric, harvest_value numeric, main_doc_cost numeric, main_feed_cost numeric, main_ovk_cost numeric, main_other_cost numeric, main_return_cost numeric, external_sapronak_cost numeric, sapronak_cost numeric, external_meat_cost numeric, total_rhpp_cost numeric, base_profit numeric, bonus_ip_rate numeric, bonus_ip numeric, bonus_fc_rate numeric, bonus_fc numeric, bonus_mortality_rate numeric, bonus_mortality numeric, farmer_profit numeric, profit_per_chick_in numeric, profit_per_harvested_bird numeric, population_balanced boolean, ready_financial boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role in ('ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER')
  ) then
    raise exception 'Akses ditolak.';
  end if;

  return query
  with harvest_source as (
    select h.contract_assignment_id,
           h.birds::numeric birds,
           h.net_weight_kg::numeric kg,
           h.total_amount::numeric value,
           (h.birds*((h.harvested_on-ci.arrived_on)+1))::numeric age_weight
    from public.marketing_contract_harvests h
    join public.chick_ins ci on ci.contract_assignment_id=h.contract_assignment_id
    union all
    select m.contract_assignment_id,
           coalesce(m.birds,0)::numeric birds,
           m.weight_kg::numeric kg,
           (m.weight_kg*cp.price_per_kg)::numeric value,
           (coalesce(m.birds,0)*((m.purchase_date-ci.arrived_on)+1))::numeric age_weight
    from public.marketing_external_meat_purchases m
    join public.chick_ins ci on ci.contract_assignment_id=m.contract_assignment_id
    join public.logistics_contract_assignments a on a.id=m.contract_assignment_id
    join lateral (
      select p.price_per_kg
      from public.contract_live_prices p
      where p.contract_id=a.master_contract_id
        and (m.weight_kg/nullif(m.birds,0)) >= p.min_weight_kg
        and (p.max_weight_kg is null or (m.weight_kg/nullif(m.birds,0)) < p.max_weight_kg)
      order by p.min_weight_kg desc
      limit 1
    ) cp on true
  ),
  harvest as (
    select h.contract_assignment_id,
           sum(h.birds)::numeric birds,
           sum(h.kg)::numeric kg,
           sum(h.value)::numeric value,
           sum(h.age_weight)::numeric/nullif(sum(h.birds),0) weighted_age
    from harvest_source h
    group by h.contract_assignment_id
  ),
  main_ship as (
    select s.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then si.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(case when i.category='DOC' then si.quantity*si.unit_price else 0 end),0)::numeric doc_cost,
           coalesce(sum(case when i.category='PAKAN' then si.quantity*si.unit_price else 0 end),0)::numeric feed_cost,
           coalesce(sum(case when i.category='OVK' then si.quantity*si.unit_price else 0 end),0)::numeric ovk_cost,
           coalesce(sum(case when i.category not in ('DOC','PAKAN','OVK') then si.quantity*si.unit_price else 0 end),0)::numeric other_cost,
           coalesce(sum(si.quantity*si.unit_price),0)::numeric total_cost
    from public.logistics_shipments s
    join public.logistics_shipment_items si on si.shipment_id=s.id
    join public.items i on i.id=si.item_id
    group by s.contract_assignment_id
  ),
  main_ret as (
    select r.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ri.quantity*ri.unit_price),0)::numeric total_cost
    from public.logistics_returns r
    join public.logistics_return_items ri on ri.return_id=r.id
    join public.items i on i.id=ri.item_id
    group by r.contract_assignment_id
  ),
  retained_feed as (
    select l.source_assignment_id contract_assignment_id,
           sum(l.quantity*coalesce(i.kg_per_unit,0))::numeric feed_kg
    from public.logistics_mitra_retained_feed l
    join public.items i on i.id=l.item_id
    group by l.source_assignment_id
  ),
  ext_ship as (
    select e.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then ei.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(ei.quantity*ei.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_shipments e
    join public.logistics_external_shipment_items ei on ei.external_shipment_id=e.id
    join public.items i on i.id=ei.item_id
    group by e.contract_assignment_id
  ),
  ext_ret as (
    select er.contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then eri.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(eri.quantity*eri.purchase_unit_price),0)::numeric total_cost
    from public.logistics_external_returns er
    join public.logistics_external_return_items eri on eri.external_return_id=er.id
    join public.items i on i.id=eri.item_id
    group by er.contract_assignment_id
  ),
  transfer_in as (
    select t.target_contract_assignment_id contract_assignment_id,
           coalesce(sum(case when i.category='PAKAN' then t.quantity_kg else 0 end),0)::numeric feed_kg,
           coalesce(sum(t.quantity*t.unit_price),0)::numeric total_cost
    from public.logistics_external_return_transfers t
    join public.items i on i.id=t.item_id
    group by t.target_contract_assignment_id
  ),
  company_in as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='IN'
    group by m.contract_assignment_id
  ),
  company_out as (
    select m.contract_assignment_id,sum(m.quantity*i.kg_per_unit)::numeric feed_kg,
           sum(m.quantity*l.unit_price)::numeric total_cost
    from public.logistics_company_feed_movements m
    join public.logistics_mitra_retained_feed l on l.id=m.retained_feed_id
    join public.items i on i.id=l.item_id where m.direction='OUT'
    group by m.contract_assignment_id
  ),
  meat as (
    select m.contract_assignment_id,
           coalesce(sum(m.weight_kg*m.purchase_price_per_kg),0)::numeric total_cost
    from public.marketing_external_meat_purchases m
    group by m.contract_assignment_id
  ),
  raw as (
    select
      a.id assignment_id,a.barn_id,b.code barn_code,b.name barn_name,c.number contract_number,a.active,
      basis.birds::numeric chick_in_birds,
      coalesce(h.birds,0)::numeric total_harvest_birds,
      coalesce(h.kg,0)::numeric total_harvest_kg,
      case when coalesce(h.birds,0)>0 then h.kg/h.birds else 0 end::numeric avg_bw_kg,
      coalesce(h.weighted_age,0)::numeric weighted_age,
      (basis.birds-coalesce(h.birds,0))::numeric implied_depletion_birds,
      (basis.birds-coalesce(h.birds,0))::numeric recorded_depletion_birds,
      0::numeric depletion_variance_birds,
      case when basis.birds>0 then ((basis.birds-coalesce(h.birds,0))/basis.birds)*100 else 0 end::numeric mortality_pct,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0))::numeric main_feed_kg,
      greatest(0,coalesce(es.feed_kg,0)-coalesce(er.feed_kg,0)+coalesce(ti.feed_kg,0)+coalesce(cin.feed_kg,0)-coalesce(cout.feed_kg,0))::numeric external_feed_kg,
      greatest(0,coalesce(ms.feed_kg,0)-coalesce(mr.feed_kg,0)-coalesce(rf.feed_kg,0))::numeric net_feed_kg,
      coalesce(h.value,0)::numeric harvest_value,
      greatest(0,coalesce(ms.doc_cost,0))::numeric main_doc_cost,
      greatest(0,coalesce(ms.feed_cost,0))::numeric main_feed_cost,
      greatest(0,coalesce(ms.ovk_cost,0))::numeric main_ovk_cost,
      greatest(0,coalesce(ms.other_cost,0))::numeric main_other_cost,
      greatest(0,coalesce(mr.total_cost,0))::numeric main_return_cost,
      greatest(0,coalesce(es.total_cost,0)-coalesce(er.total_cost,0)+coalesce(ti.total_cost,0)+coalesce(cin.total_cost,0)-coalesce(cout.total_cost,0))::numeric external_sapronak_cost,
      greatest(0,coalesce(ms.total_cost,0)-coalesce(mr.total_cost,0))::numeric sapronak_cost,
      greatest(0,coalesce(me.total_cost,0))::numeric external_meat_cost,
      a.master_contract_id,a.performance_template_name
    from public.logistics_contract_assignments a
    join public.barns b on b.id=a.barn_id
    join public.contracts c on c.id=a.master_contract_id
    join public.chick_ins ci on ci.contract_assignment_id=a.id
    -- DOA is a note for new RHPP. Preserve the population of historical frozen RHPP.
    cross join lateral (
      select case when a.active then ci.received::numeric else coalesce(
        (select f.chick_in_birds from public.rhpp_system_final f
         where f.contract_assignment_id=a.id order by f.created_at desc limit 1),
        ci.received::numeric) end as birds
    ) basis
    left join harvest h on h.contract_assignment_id=a.id
    left join main_ship ms on ms.contract_assignment_id=a.id
    left join main_ret mr on mr.contract_assignment_id=a.id
    left join retained_feed rf on rf.contract_assignment_id=a.id
    left join ext_ship es on es.contract_assignment_id=a.id
    left join ext_ret er on er.contract_assignment_id=a.id
    left join transfer_in ti on ti.contract_assignment_id=a.id
    left join company_in cin on cin.contract_assignment_id=a.id
    left join company_out cout on cout.contract_assignment_id=a.id
    left join meat me on me.contract_assignment_id=a.id
  ),
  metrics as (
    select r.*,
      case when r.total_harvest_kg>0 then r.net_feed_kg/r.total_harvest_kg else 0 end::numeric fcr_actual,
      lo.age_days lo_age,lo.std_fcr lo_fcr,hi.age_days hi_age,hi.std_fcr hi_fcr
    from raw r
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days<=r.weighted_age
      order by ps.age_days desc limit 1
    ) lo on true
    left join lateral (
      select ps.age_days,ps.std_fcr from public.performance_standards ps
      where ps.contract_id=r.master_contract_id and ps.template_name=r.performance_template_name and ps.age_days>=r.weighted_age
      order by ps.age_days asc limit 1
    ) hi on true
  ),
  scored as (
    select m.*,
      case
        when m.lo_fcr is null then m.hi_fcr when m.hi_fcr is null then m.lo_fcr
        when m.hi_age=m.lo_age then m.lo_fcr
        else m.lo_fcr+((m.weighted_age-m.lo_age)/(m.hi_age-m.lo_age))*(m.hi_fcr-m.lo_fcr)
      end::numeric fcr_standard,
      case when m.weighted_age>0 and m.fcr_actual>0 then ((100-m.mortality_pct)*m.avg_bw_kg*100)/(m.weighted_age*m.fcr_actual) else 0 end::numeric ip
    from metrics m
  ),
  bonus_rates as (
    select s.*,
      coalesce(ipb.rupiah_per_kg,0)::numeric bonus_ip_rate,
      coalesce(fcb.rupiah_per_kg,0)::numeric bonus_fc_rate,
      coalesce(db.rupiah_per_kg,0)::numeric bonus_mortality_rate
    from scored s
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='IP'
        and (cb.min_value is null or s.ip>=cb.min_value)
        and (cb.max_value is null or s.ip<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) ipb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='FCR_DIFFERENCE'
        and (cb.min_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)>=cb.min_value)
        and (cb.max_value is null or (coalesce(s.fcr_standard,0)-s.fcr_actual)<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) fcb on true
    left join lateral (
      select cb.rupiah_per_kg from public.contract_bonuses cb
      where cb.contract_id=s.master_contract_id and cb.metric='DEPLETION'
        and (cb.min_value is null or s.mortality_pct>=cb.min_value)
        and (cb.max_value is null or s.mortality_pct<cb.max_value)
      order by cb.min_value desc nulls last limit 1
    ) db on true
  )
  select
    br.assignment_id,br.barn_id,br.barn_code,br.barn_name,br.contract_number,br.active,
    br.chick_in_birds,br.total_harvest_birds,br.total_harvest_kg,br.avg_bw_kg,br.weighted_age,
    br.implied_depletion_birds,br.recorded_depletion_birds,br.depletion_variance_birds,br.mortality_pct,
    br.main_feed_kg,br.external_feed_kg,br.net_feed_kg,
    br.fcr_actual,br.fcr_standard,(coalesce(br.fcr_standard,0)-br.fcr_actual)::numeric diff_fcr,br.ip,
    br.harvest_value,br.main_doc_cost,br.main_feed_cost,br.main_ovk_cost,br.main_other_cost,br.main_return_cost,
    br.external_sapronak_cost,br.sapronak_cost,br.external_meat_cost,
    br.sapronak_cost::numeric total_rhpp_cost,
    (br.harvest_value-br.sapronak_cost)::numeric base_profit,
    br.bonus_ip_rate,(br.total_harvest_kg*br.bonus_ip_rate)::numeric bonus_ip,
    br.bonus_fc_rate,(br.total_harvest_kg*br.bonus_fc_rate)::numeric bonus_fc,
    br.bonus_mortality_rate,(br.total_harvest_kg*br.bonus_mortality_rate)::numeric bonus_mortality,
    (br.harvest_value-br.sapronak_cost
      +br.total_harvest_kg*br.bonus_ip_rate
      +br.total_harvest_kg*br.bonus_fc_rate
      +br.total_harvest_kg*br.bonus_mortality_rate)::numeric farmer_profit,
    case when br.chick_in_birds>0 then
      (br.harvest_value-br.sapronak_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.chick_in_birds else 0 end::numeric profit_per_chick_in,
    case when br.total_harvest_birds>0 then
      (br.harvest_value-br.sapronak_cost
       +br.total_harvest_kg*br.bonus_ip_rate
       +br.total_harvest_kg*br.bonus_fc_rate
       +br.total_harvest_kg*br.bonus_mortality_rate)/br.total_harvest_birds else 0 end::numeric profit_per_harvested_bird,
    (abs(br.depletion_variance_birds)<0.5)::boolean population_balanced,
    (not br.active and abs(br.depletion_variance_birds)<0.5 and br.chick_in_birds>0 and br.total_harvest_birds>0 and br.total_harvest_kg>0 and br.net_feed_kg>0 and br.sapronak_cost>0)::boolean ready_financial
  from bonus_rates br
  order by br.active desc,br.barn_code;
end
$function$

;

CREATE OR REPLACE FUNCTION public.admin_close_production_atomic(p_contract_assignment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v record;
  v_id uuid;
  v_active boolean;
  v_std_bw numeric;
  v_chick_in_date date;
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id=auth.uid()
      and p.active
      and p.role='ADMIN'
  ) then
    raise exception 'Akses ditolak. Hanya Administrator yang dapat Close Produksi.';
  end if;

  select a.active into v_active
  from public.logistics_contract_assignments a
  where a.id=p_contract_assignment_id
  for update;

  if v_active is null then raise exception 'Kontrak kandang tidak ditemukan.'; end if;
  if not v_active then raise exception 'Periode ini sudah Close.'; end if;

  perform set_config('bms.allow_production_close','1',true);
  update public.logistics_contract_assignments
  set active=false
  where id=p_contract_assignment_id and active=true;

  select * into v
  from public.finance_rhpp_summary_v5()
  where contract_assignment_id=p_contract_assignment_id;

  if v.contract_assignment_id is null then raise exception 'RHPP Sistem tidak ditemukan.'; end if;

  if not (
    v.chick_in_birds > 0
    and v.total_harvest_birds > 0
    and v.total_harvest_kg > 0
    and v.net_feed_kg > 0
    and v.sapronak_cost > 0
  ) then
    raise exception 'RHPP Sistem belum lengkap. Periksa Chick-In, Panen, Pakan, dan biaya Sapronak.';
  end if;

  select ci.arrived_on into v_chick_in_date
  from public.chick_ins ci
  where ci.contract_assignment_id=p_contract_assignment_id
  order by ci.arrived_on
  limit 1;

  select ps.std_body_weight_g/1000.0 into v_std_bw
  from public.logistics_contract_assignments a
  join public.performance_standards ps
    on ps.contract_id=a.master_contract_id
   and ps.template_name=a.performance_template_name
  where a.id=p_contract_assignment_id
    and ps.std_body_weight_g is not null
  order by abs(ps.age_days-v.weighted_age)
  limit 1;

  insert into public.rhpp_system_final(
    contract_assignment_id,barn_id,system_amount,
    harvest_value,sapronak_cost,external_meat_cost,
    bonus_ip,bonus_fc,bonus_depletion,
    fcr_actual,fcr_standard,ip,mortality_pct,population_variance_birds,
    chick_in_date,chick_in_birds,total_harvest_birds,total_harvest_kg,avg_bw_kg,weighted_age,
    depletion_birds,net_feed_kg,std_bw_kg,
    main_doc_cost,main_feed_cost,main_ovk_cost,main_other_cost,main_return_cost,
    external_sapronak_cost,total_rhpp_cost,base_profit,
    bonus_ip_rate,bonus_fc_rate,bonus_depletion_rate,
    profit_per_chick_in,profit_per_harvested_bird
  ) values (
    v.contract_assignment_id,v.barn_id,(v.farmer_profit-v.external_meat_cost-v.external_sapronak_cost),
    v.harvest_value,v.sapronak_cost,v.external_meat_cost,
    v.bonus_ip,v.bonus_fc,v.bonus_mortality,
    v.fcr_actual,v.fcr_standard,v.ip,v.mortality_pct,v.depletion_variance_birds,
    v_chick_in_date,v.chick_in_birds,v.total_harvest_birds,v.total_harvest_kg,v.avg_bw_kg,v.weighted_age,
    greatest(v.chick_in_birds-v.total_harvest_birds,0),v.net_feed_kg,v_std_bw,
    v.main_doc_cost,v.main_feed_cost,v.main_ovk_cost,v.main_other_cost,v.main_return_cost,
    v.external_sapronak_cost,v.total_rhpp_cost,v.base_profit,
    v.bonus_ip_rate,v.bonus_fc_rate,v.bonus_mortality_rate,
    v.profit_per_chick_in,v.profit_per_harvested_bird
  )
  returning id into v_id;

  return v_id;
end
$function$
;


CREATE OR REPLACE FUNCTION public.get_dashboard_global_data_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  r public.bms_role;
begin
  r := private.my_bms_role();
  if r is null or r <> all(array[
    'ADMIN'::public.bms_role,'PPL'::public.bms_role,'LOGISTIK'::public.bms_role,
    'MARKETING'::public.bms_role,'KEUANGAN'::public.bms_role,'OWNER'::public.bms_role
  ]) then
    raise exception 'Akses ditolak';
  end if;

  return jsonb_build_object(
    'assignments',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from public.logistics_contract_assignments x),
    'barns',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.barns x),
    'contracts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.contracts x where x.cycle_id is null),
    'chicks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.arrived_on desc),'[]'::jsonb) from public.chick_ins x),
    'links',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_contract_assignment_abks x),
    'abks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.employees x where x.kind='ABK'),
    'items',(select coalesce(jsonb_agg(to_jsonb(x) order by x.code),'[]'::jsonb) from public.items x where x.active=true),
    'standards',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.performance_standards x),
    'harvests',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.marketing_contract_harvests x),
    'live_prices',(select coalesce(jsonb_agg(to_jsonb(x) order by x.min_weight_kg),'[]'::jsonb) from public.contract_live_prices x),
    'rhpp_costs',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_rhpp_cost_summary x),
    'recordings',(select coalesce(jsonb_agg(to_jsonb(x) order by x.recorded_on),'[]'::jsonb) from public.recordings x),
    'weight_samples',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.recording_weight_samples x),
    'estimates',(select coalesce(jsonb_agg(to_jsonb(x) order by x.estimated_on desc),'[]'::jsonb) from public.production_estimates x),
    'estimate_sizes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_estimate_sizes x),
    'abk_results',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_abk_results x),
    'abk_result_sizes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_abk_result_sizes x),
    'bonuses',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.contract_bonuses x),
    'finals',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.production_cycle_final_unified x),
    'shipments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_shipments x),
    'shipment_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_shipment_items x),
    'external_shipments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_external_shipments x),
    'external_shipment_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_external_shipment_items x),
    'returns',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_returns x),
    'return_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.logistics_return_items x),
    'feed_monitoring_version',1,
    'recording_feed_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select recording_id,item_id,quantity_units,kg_per_unit from public.recording_feed_items) x),
    'mandiri_feed_purchases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,item_id from public.logistics_mandiri_purchases) x),
    'mandiri_feed_allocations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select purchase_id,contract_assignment_id,quantity from public.logistics_mandiri_purchase_allocations) x),
    'retained_feed',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,source_assignment_id,item_id,quantity from public.logistics_mitra_retained_feed) x),
    'company_feed_movements',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select retained_feed_id,contract_assignment_id,direction,quantity from public.logistics_company_feed_movements) x),
    'feed_adjustments',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select contract_assignment_id,item_id,adjustment_units from public.production_feed_stock_adjustments) x)
  );
end
$function$
;

REVOKE ALL ON FUNCTION public.get_dashboard_global_data_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_global_data_v1() TO authenticated;


CREATE OR REPLACE FUNCTION public.role_delete_transaction_v1(p_table text, p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
 v_role public.bms_role; v_old jsonb; v_deleted int:=0; v_assignment uuid; v_active boolean;
 v_allowed boolean:=false; v_parent_id uuid;
begin
 if auth.uid() is null then raise exception 'Sesi login tidak ditemukan.'; end if;
 select role into v_role from public.profiles where user_id=auth.uid() and active=true;
 if v_role is null then raise exception 'Akun tidak aktif.'; end if;
 v_allowed := v_role='ADMIN'
 or (v_role='PPL' and p_table=any(array['chick_ins','recordings','visits','production_estimates']))
 or (v_role='MARKETING' and p_table=any(array['marketing_contract_harvests','marketing_external_meat_purchases']))
 or (v_role='LOGISTIK' and p_table=any(array['logistics_shipments','logistics_external_shipments','logistics_returns','logistics_external_returns','logistics_mandiri_purchases']))
 or (v_role='KEUANGAN' and p_table=any(array['bop','barn_maintenance_costs','bop_outside','finance_expedition_trips','finance_expedition_invoices','finance_expedition_payments','finance_expedition_bop','finance_expedition_maintenance','advances','advance_payments','supplier_payments','finance_mandiri_sales_receipts','finance_mandiri_supplier_payments','rhpp_real','abk_cycle_salaries']));
 if not v_allowed then raise exception 'Role % tidak berwenang menghapus transaksi %.',v_role,p_table; end if;
 if not p_table=any(array['logistics_shipments','logistics_external_shipments','logistics_returns','logistics_external_returns','logistics_mandiri_purchases','marketing_contract_harvests','marketing_external_meat_purchases','chick_ins','recordings','visits','production_estimates','bop','barn_maintenance_costs','bop_outside','finance_expedition_trips','finance_expedition_invoices','finance_expedition_payments','finance_expedition_bop','finance_expedition_maintenance','advances','advance_payments','supplier_payments','finance_mandiri_sales_receipts','finance_mandiri_supplier_payments','rhpp_real','abk_cycle_salaries']) then raise exception 'Tabel % tidak diizinkan.',p_table; end if;
 execute format('select to_jsonb(t) from public.%I t where id::text=$1',p_table) into v_old using p_id;
 if v_old is null then raise exception 'Transaksi tidak ditemukan atau sudah terhapus.'; end if;
 if nullif(v_old->>'contract_assignment_id','') is not null then
   v_assignment:=(v_old->>'contract_assignment_id')::uuid;
 elsif p_table='advance_payments' and nullif(v_old->>'advance_id','') is not null then
   v_parent_id:=(v_old->>'advance_id')::uuid;
   select contract_assignment_id into v_assignment from public.advances where id=v_parent_id;
 elsif p_table='finance_mandiri_sales_receipts' and nullif(v_old->>'harvest_id','') is not null then
   v_parent_id:=(v_old->>'harvest_id')::uuid;
   select contract_assignment_id into v_assignment from public.marketing_contract_harvests where id=v_parent_id;
 end if;
 if v_assignment is not null then
   select active into v_active from public.logistics_contract_assignments where id=v_assignment;
   if coalesce(v_active,false)=false then raise exception 'Siklus sudah CLOSED. Transaksi terkunci dan tidak dapat dihapus.'; end if;
 end if;
 if p_table='rhpp_real' then perform set_config('bms.allow_rhpp_real_delete','1',true); end if;
 begin
   execute format('delete from public.%I where id::text=$1',p_table) using p_id;
   get diagnostics v_deleted=row_count;
 exception when foreign_key_violation then
   raise exception 'Transaksi tidak dapat dihapus karena masih dipakai data lain. Hapus/koreksi transaksi turunannya terlebih dahulu.';
 end;
 if v_deleted=0 then raise exception 'Transaksi tidak ditemukan atau sudah terhapus.'; end if;
 insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data) values(auth.uid(),'DELETE_ROLE_ACTIVE',p_table,p_id,v_old,null);
 return true;
end
$function$;
REVOKE ALL ON FUNCTION public.role_delete_transaction_v1(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.role_delete_transaction_v1(text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.role_delete_transaction_v1(text,text) TO authenticated;


-- Finance-first Expedisi workflow: Kas Jalan -> Logistik completes Surat Jalan/MTS.
CREATE OR REPLACE FUNCTION public.finance_create_expedition_kas_jalan_v1(p_trip_date date,p_driver text,p_vehicle text,p_zone text,p_amount numeric,p_notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $function$
declare v_id uuid;
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and active and role in ('ADMIN','KEUANGAN')) then raise exception 'Akses ditolak.'; end if;
 if p_trip_date is null then raise exception 'Tanggal Kas Jalan wajib.'; end if;
 if nullif(trim(p_driver),'') is null or nullif(trim(p_vehicle),'') is null or nullif(trim(p_zone),'') is null then raise exception 'Sopir, kendaraan, dan rute wajib.'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Nominal Kas Jalan harus lebih dari nol.'; end if;
 insert into public.finance_expedition_trips(trip_date,mts_sj,rr,driver,vehicle,zone,destination,cargo,total_qty,trip_price,additional,deduction,reference,notes,created_by)
 values(p_trip_date,null,null,trim(p_driver),trim(p_vehicle),trim(p_zone),'MENUNGGU SURAT JALAN',null,null,0,0,0,'KAS_JALAN_PENDING_SJ',nullif(trim(coalesce(p_notes,'')),''),auth.uid()) returning id into v_id;
 insert into public.finance_expedition_bop(incurred_on,category,amount,trip_id,driver,vehicle,route,reference,notes,created_by)
 values(p_trip_date,'OPERASIONAL',p_amount,v_id,trim(p_driver),trim(p_vehicle),trim(p_zone),'AUTO_TRIP','Kas Jalan diajukan sopir - menunggu Surat Jalan/MTS dari Logistik',auth.uid());
 insert into public.audit_events(actor,action,table_name,record_id,new_data) values(auth.uid(),'CREATE_KAS_JALAN','finance_expedition_trips',v_id::text,jsonb_build_object('status','MENUNGGU_SURAT_JALAN','amount',p_amount,'driver',trim(p_driver),'vehicle',trim(p_vehicle),'route',trim(p_zone)));
 return v_id;
end $function$;
REVOKE ALL ON FUNCTION public.finance_create_expedition_kas_jalan_v1(date,text,text,text,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_create_expedition_kas_jalan_v1(date,text,text,text,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.finance_create_expedition_kas_jalan_v1(date,text,text,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.logistics_complete_expedition_sj_v1(p_trip_id uuid,p_mts_sj text,p_rr text DEFAULT NULL::text,p_trip_price numeric DEFAULT 0,p_additional numeric DEFAULT 0,p_deduction numeric DEFAULT 0,p_notes text DEFAULT NULL::text,p_destinations jsonb DEFAULT '[]'::jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_temp' AS $function$
declare v_trip public.finance_expedition_trips%rowtype; v_line jsonb; v_no int:=0; v_dest text; v_cargo text; v_qty numeric; v_unit text; v_total numeric:=0; v_first text; v_legacy text;
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and active and role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
 select * into v_trip from public.finance_expedition_trips where id=p_trip_id for update;
 if not found then raise exception 'Trip tidak ditemukan.'; end if;
 if v_trip.reference<>'KAS_JALAN_PENDING_SJ' then raise exception 'Trip ini bukan antrean Surat Jalan dari Keuangan.'; end if;
 if nullif(trim(p_mts_sj),'') is null then raise exception 'Nomor Surat Jalan/MTS wajib.'; end if;
 if p_trip_price is null or p_trip_price<0 or coalesce(p_additional,0)<0 or coalesce(p_deduction,0)<0 then raise exception 'Nilai trip tidak valid.'; end if;
 if p_destinations is null or jsonb_typeof(p_destinations)<>'array' or jsonb_array_length(p_destinations)=0 then raise exception 'Minimal satu tujuan wajib.'; end if;
 for v_line in select value from jsonb_array_elements(p_destinations) loop
  v_no:=v_no+1; v_dest:=nullif(trim(v_line->>'destination_name'),''); v_cargo:=nullif(trim(v_line->>'cargo'),''); v_qty:=nullif(v_line->>'qty','')::numeric; v_unit:=nullif(trim(v_line->>'unit'),'');
  if v_dest is null then raise exception 'Tujuan baris % wajib.',v_no; end if; if v_cargo is null then raise exception 'Muatan baris % wajib.',v_no; end if; if v_qty is not null and v_qty<0 then raise exception 'Qty baris % tidak valid.',v_no; end if;
  if v_no=1 then v_first:=v_dest; end if; v_total:=v_total+coalesce(v_qty,0);
  v_legacy:=concat_ws(' • ',v_legacy,trim(concat(v_dest,' - ',v_cargo,case when v_qty is not null then ' '||trim(to_char(v_qty,'FM999999990.##')) else '' end,case when v_unit is not null then ' '||v_unit else '' end)));
 end loop;
 update public.finance_expedition_trips set mts_sj=trim(p_mts_sj),rr=nullif(trim(coalesce(p_rr,'')),''),destination=v_first,cargo=v_legacy,total_qty=v_total,trip_price=p_trip_price,additional=coalesce(p_additional,0),deduction=coalesce(p_deduction,0),reference='KAS_JALAN_SJ_COMPLETE',notes=nullif(trim(coalesce(p_notes,v_trip.notes,'')),'') where id=p_trip_id;
 delete from public.finance_expedition_trip_destinations where trip_id=p_trip_id;
 v_no:=0;
 for v_line in select value from jsonb_array_elements(p_destinations) loop
  v_no:=v_no+1;
  insert into public.finance_expedition_trip_destinations(trip_id,line_no,destination_id,destination_name,cargo,qty,unit,notes,created_by)
  values(p_trip_id,v_no,nullif(v_line->>'destination_id','')::uuid,trim(v_line->>'destination_name'),nullif(trim(v_line->>'cargo'),''),nullif(v_line->>'qty','')::numeric,nullif(trim(v_line->>'unit'),''),nullif(trim(v_line->>'notes'),''),auth.uid());
 end loop;
 insert into public.audit_events(actor,action,table_name,record_id,old_data,new_data) values(auth.uid(),'COMPLETE_SURAT_JALAN','finance_expedition_trips',p_trip_id::text,jsonb_build_object('reference',v_trip.reference,'mts_sj',v_trip.mts_sj),jsonb_build_object('reference','KAS_JALAN_SJ_COMPLETE','mts_sj',trim(p_mts_sj)));
 return true;
end $function$;
REVOKE ALL ON FUNCTION public.logistics_complete_expedition_sj_v1(uuid,text,text,numeric,numeric,numeric,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.logistics_complete_expedition_sj_v1(uuid,text,text,numeric,numeric,numeric,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.logistics_complete_expedition_sj_v1(uuid,text,text,numeric,numeric,numeric,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_expedition_finance_first_v1() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
declare v_role public.bms_role;
begin
 select role into v_role from public.profiles where user_id=auth.uid() and active=true;
 if v_role='LOGISTIK' then raise exception 'Trip baru harus dimulai dari Kas Jalan Keuangan. Logistik hanya melengkapi Surat Jalan/MTS.'; end if;
 return new;
end $function$;
DROP TRIGGER IF EXISTS trg_expedition_finance_first ON public.finance_expedition_trips;
CREATE TRIGGER trg_expedition_finance_first BEFORE INSERT ON public.finance_expedition_trips FOR EACH ROW EXECUTE FUNCTION public.enforce_expedition_finance_first_v1();


-- OWNER read-only parity for operational pages.
CREATE POLICY "owner_read_all" ON "public"."audit_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."user_activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."barn_assets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."expeditions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."harvests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."rhpp_estimates" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."supplies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."finance_stock_purchase_invoices" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."warehouse_stock_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."warehouse_stock_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."finance_cash_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));
CREATE POLICY "owner_read_all" ON "public"."finance_cash_request_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.my_bms_role() = 'OWNER'::public.bms_role));

COMMIT;

-- Standalone Finance Cash Request Form (administrative only; no BOP/cashflow posting)
CREATE TABLE IF NOT EXISTS public.finance_cash_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_number text NOT NULL UNIQUE,
 request_date date NOT NULL,
 subject text NOT NULL DEFAULT 'PENGAJUAN KAS',
 status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','DIAJUKAN','BATAL')),
 notes text,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.finance_cash_request_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.finance_cash_requests(id) ON DELETE CASCADE,
 group_name text NOT NULL,
 description text NOT NULL,
 amount numeric(18,2) NOT NULL CHECK (amount>=0),
 remarks text,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_cash_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cash_request_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_cash_requests_role ON public.finance_cash_requests;
CREATE POLICY finance_cash_requests_role ON public.finance_cash_requests FOR ALL TO authenticated USING (private.my_bms_role() IN ('ADMIN','KEUANGAN')) WITH CHECK (private.my_bms_role() IN ('ADMIN','KEUANGAN'));
DROP POLICY IF EXISTS finance_cash_request_items_role ON public.finance_cash_request_items;
CREATE POLICY finance_cash_request_items_role ON public.finance_cash_request_items FOR ALL TO authenticated USING (private.my_bms_role() IN ('ADMIN','KEUANGAN')) WITH CHECK (private.my_bms_role() IN ('ADMIN','KEUANGAN'));
REVOKE ALL ON public.finance_cash_requests, public.finance_cash_request_items FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.finance_cash_requests, public.finance_cash_request_items TO authenticated;

-- 2026-10-07 safe transaction correction RPCs

-- Safe transaction correction RPCs, synchronized from live database on 2026-10-07.

CREATE OR REPLACE FUNCTION public.correct_warehouse_stock_shipment_atomic(p_id uuid, p_shipment_date date, p_destination_type text, p_barn_id uuid, p_quantity numeric, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_s public.warehouse_stock_shipments%rowtype;
  v_i public.warehouse_stock_items%rowtype;
  v_used numeric;
  v_dest text;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  select * into v_s from public.warehouse_stock_shipments where id=p_id for update;
  if v_s.id is null then raise exception 'Pengiriman gudang tidak ditemukan.'; end if;
  select * into v_i from public.warehouse_stock_items where id=v_s.stock_item_id for update;
  if v_i.id is null then raise exception 'Barang stok tidak ditemukan.'; end if;
  if p_shipment_date is null then raise exception 'Tanggal kirim wajib.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah kirim harus lebih dari 0.'; end if;
  v_dest:=upper(trim(coalesce(p_destination_type,'')));
  if v_dest not in ('KANDANG','KANTOR') then raise exception 'Tujuan tidak valid.'; end if;
  if v_dest='KANDANG' and (p_barn_id is null or not exists(select 1 from public.barns b where b.id=p_barn_id)) then raise exception 'Pilih kandang tujuan.'; end if;
  if v_dest='KANTOR' then p_barn_id:=null; end if;
  select coalesce(sum(s.quantity),0) into v_used from public.warehouse_stock_shipments s where s.stock_item_id=v_i.id and s.id<>p_id;
  if p_quantity>v_i.quantity-v_used then raise exception 'Jumlah kirim melebihi stok tersedia.'; end if;

  if v_i.stock_kind='ASET' then
    if v_s.asset_id is null then raise exception 'Aset terkait pengiriman tidak ditemukan.'; end if;
    update public.barn_assets
      set barn_id=p_barn_id,location_type=v_dest,name=v_i.standard_name,quantity=p_quantity,unit=v_i.unit,
          acquired_on=p_shipment_date,acquisition_value=p_quantity*v_i.unit_price,
          notes='Sumber: Kirim Stok Gudang · Nota '||v_i.invoice_id::text||' · Item '||v_i.id::text||
                case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end||
                case when nullif(trim(coalesce(p_notes,'')),'') is not null then ' · '||trim(p_notes) else '' end,
          updated_at=now()
      where id=v_s.asset_id;
    if not found then raise exception 'Aset terkait pengiriman tidak ditemukan.'; end if;
  elsif v_s.asset_id is not null then
    raise exception 'Data pengiriman tidak konsisten dengan jenis stok.';
  end if;

  update public.warehouse_stock_shipments
     set shipment_date=p_shipment_date,destination_type=v_dest,barn_id=p_barn_id,quantity=p_quantity,
         reference=nullif(trim(coalesce(p_reference,'')),''),notes=nullif(trim(coalesce(p_notes,'')),'')
   where id=p_id;
  return p_id;
end $function$


CREATE OR REPLACE FUNCTION public.delete_logistics_equipment_purchase_atomic(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_asset uuid;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then
    raise exception 'Akses ditolak.';
  end if;
  select asset_id into v_asset from public.logistics_equipment_purchases where id=p_id for update;
  if not found then raise exception 'Pembelian peralatan tidak ditemukan.'; end if;
  if exists(select 1 from public.supplier_payments sp where sp.source_type='BELI_PERALATAN' and sp.source_id=p_id) then
    raise exception 'Pembelian sudah memiliki pembayaran dan tidak boleh dihapus.';
  end if;
  delete from public.logistics_equipment_purchases where id=p_id;
  if v_asset is not null then delete from public.barn_assets where id=v_asset; end if;
end $function$


CREATE OR REPLACE FUNCTION public.delete_warehouse_stock_shipment_atomic(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_asset uuid;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  select asset_id into v_asset from public.warehouse_stock_shipments where id=p_id for update;
  if not found then raise exception 'Pengiriman gudang tidak ditemukan.'; end if;
  delete from public.warehouse_stock_shipments where id=p_id;
  if v_asset is not null then delete from public.barn_assets where id=v_asset; end if;
end $function$


CREATE OR REPLACE FUNCTION public.finance_correct_asset_invoice_atomic(p_invoice_id uuid, p_purchase_date date, p_supplier_name text, p_asset_location_type text, p_barn_id uuid, p_payment_method text, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ids uuid[]; v_assets uuid[]; v_count int; v_i int; v_item jsonb; v_name text; v_unit text; v_qty numeric; v_price numeric; v_total numeric:=0; v_loc text;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')) then raise exception 'Akses ditolak.'; end if;
  perform 1 from public.finance_asset_purchase_invoices h where h.id=p_invoice_id for update;
  if not found then raise exception 'Nota aset tidak ditemukan.'; end if;
  v_loc:=upper(trim(coalesce(p_asset_location_type,'')));
  if v_loc not in ('KANDANG','KANTOR') then raise exception 'Lokasi aset tidak valid.'; end if;
  if v_loc='KANDANG' and p_barn_id is null then raise exception 'Pilih kandang tujuan aset.'; end if;
  if v_loc='KANTOR' then p_barn_id:=null; end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Minimal satu barang wajib diisi.'; end if;

  select array_agg(d.id order by d.created_at,d.id),array_agg(d.linked_id order by d.created_at,d.id),count(*)
    into v_ids,v_assets,v_count from public.finance_direct_purchases d where d.invoice_id=p_invoice_id and d.purchase_type='ASSET';
  if v_count<>jsonb_array_length(p_items) then raise exception 'Jumlah jenis barang tidak boleh diubah saat koreksi. Koreksi setiap baris yang sudah ada.'; end if;
  if exists(select 1 from public.barn_assets a where a.id=any(v_assets) and a.status<>'AKTIF') then raise exception 'Ada aset yang statusnya sudah berubah sehingga nota tidak boleh dikoreksi.'; end if;
  for v_i in 1..v_count loop
    v_item:=p_items->(v_i-1); v_name:=nullif(trim(coalesce(v_item->>'standard_name','')),''); v_unit:=upper(nullif(trim(coalesce(v_item->>'unit','')),''));
    begin v_qty:=(v_item->>'quantity')::numeric;v_price:=(v_item->>'unit_price')::numeric; exception when others then raise exception 'Jumlah atau harga aset tidak valid.'; end;
    if v_name is null or v_unit is null or coalesce(v_qty,0)<=0 or coalesce(v_price,-1)<0 then raise exception 'Data aset tidak valid.'; end if;
    v_total:=v_total+v_qty*v_price;
    update public.finance_direct_purchases set purchase_date=p_purchase_date,standard_name=v_name,description=nullif(trim(coalesce(v_item->>'description','')),''),
      supplier_name=nullif(trim(coalesce(p_supplier_name,'')),''),barn_id=p_barn_id,quantity=v_qty,unit=v_unit,unit_price=v_price,total_amount=v_qty*v_price,
      payment_method=p_payment_method,reference=nullif(trim(coalesce(p_reference,'')),''),notes=nullif(trim(coalesce(p_notes,'')),''),asset_location_type=v_loc where id=v_ids[v_i];
    update public.barn_assets set barn_id=p_barn_id,location_type=v_loc,name=v_name,quantity=v_qty,unit=v_unit,acquired_on=p_purchase_date,
      acquisition_value=v_qty*v_price,notes='Sumber: Beli Aset Keuangan Nota '||p_invoice_id::text||' · Detail '||v_ids[v_i]::text||
      case when nullif(trim(coalesce(v_item->>'description','')),'') is not null then ' · '||trim(v_item->>'description') else '' end||
      case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end,updated_at=now() where id=v_assets[v_i];
    if not found then raise exception 'Aset terkait nota tidak ditemukan.'; end if;
  end loop;
  update public.finance_asset_purchase_invoices set purchase_date=p_purchase_date,supplier_name=nullif(trim(coalesce(p_supplier_name,'')),''),
    asset_location_type=v_loc,barn_id=p_barn_id,payment_method=p_payment_method,reference=nullif(trim(coalesce(p_reference,'')),''),
    notes=nullif(trim(coalesce(p_notes,'')),''),total_amount=v_total where id=p_invoice_id;
  return p_invoice_id;
end $function$


CREATE OR REPLACE FUNCTION public.finance_correct_stock_invoice_atomic(p_invoice_id uuid, p_purchase_date date, p_supplier_name text, p_payment_method text, p_reference text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb; v_name text; v_unit text; v_kind text; v_qty numeric; v_price numeric; v_total numeric:=0;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','KEUANGAN')) then raise exception 'Akses ditolak.'; end if;
  perform 1 from public.finance_stock_purchase_invoices h where h.id=p_invoice_id for update;
  if not found then raise exception 'Nota pembelian stok tidak ditemukan.'; end if;
  if exists(select 1 from public.warehouse_stock_shipments s join public.warehouse_stock_items i on i.id=s.stock_item_id where i.invoice_id=p_invoice_id) then
    raise exception 'Nota sudah memiliki pengiriman gudang dan tidak boleh dikoreksi. Koreksi pengiriman terlebih dahulu bila diperlukan.';
  end if;
  if p_payment_method not in ('TUNAI','TRANSFER') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Minimal satu barang stok wajib diisi.'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_name:=nullif(trim(coalesce(v_item->>'standard_name','')),''); v_unit:=upper(nullif(trim(coalesce(v_item->>'unit','')),'')); v_kind:=upper(trim(coalesce(v_item->>'stock_kind','ASET')));
    begin v_qty:=(v_item->>'quantity')::numeric; v_price:=(v_item->>'unit_price')::numeric; exception when others then raise exception 'Jumlah atau harga barang stok tidak valid.'; end;
    if v_name is null or v_unit is null or v_kind not in ('ASET','HABIS_PAKAI') or coalesce(v_qty,0)<=0 or coalesce(v_price,-1)<0 then raise exception 'Data barang stok tidak valid.'; end if;
    v_total:=v_total+v_qty*v_price;
  end loop;
  delete from public.warehouse_stock_items where invoice_id=p_invoice_id;
  update public.finance_stock_purchase_invoices set purchase_date=p_purchase_date,supplier_name=nullif(trim(coalesce(p_supplier_name,'')),''),
    payment_method=p_payment_method,reference=nullif(trim(coalesce(p_reference,'')),''),notes=nullif(trim(coalesce(p_notes,'')),''),total_amount=v_total where id=p_invoice_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.warehouse_stock_items(invoice_id,standard_name,description,stock_kind,quantity,unit,unit_price,total_amount,created_by)
    values(p_invoice_id,trim(v_item->>'standard_name'),nullif(trim(coalesce(v_item->>'description','')),''),
      upper(trim(coalesce(v_item->>'stock_kind','ASET'))),(v_item->>'quantity')::numeric,upper(trim(v_item->>'unit')),(v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::numeric*(v_item->>'unit_price')::numeric,auth.uid());
  end loop;
  return p_invoice_id;
end $function$


CREATE OR REPLACE FUNCTION public.finance_delete_asset_invoice_atomic(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_assets uuid[];
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN') then raise exception 'Hanya Administrator yang dapat menghapus nota.'; end if;
  perform 1 from public.finance_asset_purchase_invoices h where h.id=p_invoice_id for update;
  if not found then raise exception 'Nota aset tidak ditemukan.'; end if;
  select array_agg(d.linked_id) into v_assets from public.finance_direct_purchases d where d.invoice_id=p_invoice_id and d.purchase_type='ASSET';
  if exists(select 1 from public.barn_assets a where a.id=any(v_assets) and a.status<>'AKTIF') then raise exception 'Ada aset yang statusnya sudah berubah sehingga nota tidak boleh dihapus.'; end if;
  delete from public.finance_direct_purchases where invoice_id=p_invoice_id;
  if v_assets is not null then delete from public.barn_assets where id=any(v_assets); end if;
  delete from public.finance_asset_purchase_invoices where id=p_invoice_id;
end $function$


CREATE OR REPLACE FUNCTION public.finance_delete_stock_invoice_atomic(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role='ADMIN') then raise exception 'Hanya Administrator yang dapat menghapus nota.'; end if;
  perform 1 from public.finance_stock_purchase_invoices h where h.id=p_invoice_id for update;
  if not found then raise exception 'Nota pembelian stok tidak ditemukan.'; end if;
  if exists(select 1 from public.warehouse_stock_shipments s join public.warehouse_stock_items i on i.id=s.stock_item_id where i.invoice_id=p_invoice_id) then raise exception 'Nota sudah memiliki pengiriman gudang dan tidak boleh dihapus.'; end if;
  delete from public.warehouse_stock_items where invoice_id=p_invoice_id;
  delete from public.finance_stock_purchase_invoices where id=p_invoice_id;
end $function$


GRANT EXECUTE ON FUNCTION public.delete_logistics_equipment_purchase_atomic(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.correct_warehouse_stock_shipment_atomic(uuid,date,text,uuid,numeric,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.delete_warehouse_stock_shipment_atomic(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.finance_correct_stock_invoice_atomic(uuid,date,text,text,text,text,jsonb) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.finance_delete_stock_invoice_atomic(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.finance_correct_asset_invoice_atomic(uuid,date,text,text,uuid,text,text,text,jsonb) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.finance_delete_asset_invoice_atomic(uuid) TO authenticated,service_role;

-- 2026-10-07 active asset correction guards

-- Guards correction/deletion after linked assets stop being ACTIVE.

CREATE OR REPLACE FUNCTION public.correct_warehouse_stock_shipment_atomic(p_id uuid, p_shipment_date date, p_destination_type text, p_barn_id uuid, p_quantity numeric, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_s public.warehouse_stock_shipments%rowtype;
  v_i public.warehouse_stock_items%rowtype;
  v_used numeric;
  v_dest text;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  select * into v_s from public.warehouse_stock_shipments where id=p_id for update;
  if v_s.id is null then raise exception 'Pengiriman gudang tidak ditemukan.'; end if;
  select * into v_i from public.warehouse_stock_items where id=v_s.stock_item_id for update;
  if v_i.id is null then raise exception 'Barang stok tidak ditemukan.'; end if;
  if p_shipment_date is null then raise exception 'Tanggal kirim wajib.'; end if;
  if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah kirim harus lebih dari 0.'; end if;
  v_dest:=upper(trim(coalesce(p_destination_type,'')));
  if v_dest not in ('KANDANG','KANTOR') then raise exception 'Tujuan tidak valid.'; end if;
  if v_dest='KANDANG' and (p_barn_id is null or not exists(select 1 from public.barns b where b.id=p_barn_id)) then raise exception 'Pilih kandang tujuan.'; end if;
  if v_dest='KANTOR' then p_barn_id:=null; end if;
  select coalesce(sum(s.quantity),0) into v_used from public.warehouse_stock_shipments s where s.stock_item_id=v_i.id and s.id<>p_id;
  if p_quantity>v_i.quantity-v_used then raise exception 'Jumlah kirim melebihi stok tersedia.'; end if;

  if v_i.stock_kind='ASET' then
    if v_s.asset_id is null then raise exception 'Aset terkait pengiriman tidak ditemukan.'; end if;
    if exists(select 1 from public.barn_assets ba where ba.id=v_s.asset_id and ba.status<>'AKTIF') then
      raise exception 'Aset terkait sudah tidak AKTIF sehingga pengiriman tidak boleh dikoreksi.';
    end if;
    update public.barn_assets
      set barn_id=p_barn_id,location_type=v_dest,name=v_i.standard_name,quantity=p_quantity,unit=v_i.unit,
          acquired_on=p_shipment_date,acquisition_value=p_quantity*v_i.unit_price,
          notes='Sumber: Kirim Stok Gudang · Nota '||v_i.invoice_id::text||' · Item '||v_i.id::text||
                case when nullif(trim(coalesce(p_reference,'')),'') is not null then ' · Ref: '||trim(p_reference) else '' end||
                case when nullif(trim(coalesce(p_notes,'')),'') is not null then ' · '||trim(p_notes) else '' end,
          updated_at=now()
      where id=v_s.asset_id;
    if not found then raise exception 'Aset terkait pengiriman tidak ditemukan.'; end if;
  elsif v_s.asset_id is not null then
    raise exception 'Data pengiriman tidak konsisten dengan jenis stok.';
  end if;

  update public.warehouse_stock_shipments
     set shipment_date=p_shipment_date,destination_type=v_dest,barn_id=p_barn_id,quantity=p_quantity,
         reference=nullif(trim(coalesce(p_reference,'')),''),notes=nullif(trim(coalesce(p_notes,'')),'')
   where id=p_id;
  return p_id;
end $function$


CREATE OR REPLACE FUNCTION public.delete_logistics_equipment_purchase_atomic(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_asset uuid;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then
    raise exception 'Akses ditolak.';
  end if;
  select asset_id into v_asset from public.logistics_equipment_purchases where id=p_id for update;
  if not found then raise exception 'Pembelian peralatan tidak ditemukan.'; end if;
  if exists(select 1 from public.supplier_payments sp where sp.source_type='BELI_PERALATAN' and sp.source_id=p_id) then
    raise exception 'Pembelian sudah memiliki pembayaran dan tidak boleh dihapus.';
  end if;
  if v_asset is not null and exists(select 1 from public.barn_assets ba where ba.id=v_asset and ba.status<>'AKTIF') then
    raise exception 'Aset terkait sudah tidak AKTIF sehingga pembelian tidak boleh dihapus.';
  end if;
  delete from public.logistics_equipment_purchases where id=p_id;
  if v_asset is not null then delete from public.barn_assets where id=v_asset; end if;
end $function$


CREATE OR REPLACE FUNCTION public.delete_warehouse_stock_shipment_atomic(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_asset uuid;
begin
  if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')) then raise exception 'Akses ditolak.'; end if;
  select asset_id into v_asset from public.warehouse_stock_shipments where id=p_id for update;
  if not found then raise exception 'Pengiriman gudang tidak ditemukan.'; end if;
  if v_asset is not null and exists(select 1 from public.barn_assets ba where ba.id=v_asset and ba.status<>'AKTIF') then
    raise exception 'Aset terkait sudah tidak AKTIF sehingga pengiriman tidak boleh dihapus.';
  end if;
  delete from public.warehouse_stock_shipments where id=p_id;
  if v_asset is not null then delete from public.barn_assets where id=v_asset; end if;
end $function$


CREATE OR REPLACE FUNCTION public.save_logistics_equipment_purchase_atomic(p_id uuid, p_supplier_id uuid, p_item_id uuid, p_barn_id uuid, p_purchase_date date, p_quantity numeric, p_purchase_unit_price numeric, p_reference_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
         declare
           v_item record;
           v_purchase public.logistics_equipment_purchases%rowtype;
           v_id uuid;
           v_asset_id uuid;
           v_asset_notes text;
         begin
           if not exists (
             select 1 from public.profiles p
             where p.user_id=auth.uid() and p.active and p.role in ('ADMIN','LOGISTIK')
           ) then raise exception 'Akses ditolak.'; end if;
           if p_purchase_date is null then raise exception 'Tanggal pembelian wajib.'; end if;
           if coalesce(p_quantity,0)<=0 then raise exception 'Jumlah harus lebih dari 0.'; end if;
           if coalesce(p_purchase_unit_price,-1)<0 then raise exception 'Harga beli tidak valid.'; end if;

           select i.id,i.code,i.name,i.category,i.ovk_type,i.unit,i.active
           into v_item from public.items i where i.id=p_item_id;

           if v_item.id is null or not v_item.active then raise exception 'Barang Master Data tidak ditemukan/aktif.'; end if;
           if v_item.category<>'OVK' or coalesce(v_item.ovk_type,'')<>'OVK2' then
             raise exception 'Beli Peralatan hanya menerima barang OVK2 dari Master Data.';
           end if;
           if not exists(select 1 from public.suppliers s where s.id=p_supplier_id and s.active) then
             raise exception 'Supplier tidak ditemukan/aktif.';
           end if;
           if not exists(select 1 from public.barns b where b.id=p_barn_id) then
             raise exception 'Kandang tidak ditemukan.';
           end if;

           if p_id is not null then
             select * into v_purchase from public.logistics_equipment_purchases where id=p_id;
             if v_purchase.id is null then raise exception 'Pembelian peralatan tidak ditemukan.'; end if;
             if exists(select 1 from public.supplier_payments sp where sp.source_type='BELI_PERALATAN' and sp.source_id=p_id) then
               raise exception 'Pembelian sudah memiliki pembayaran dan tidak boleh diubah.';
             end if;
             v_id:=p_id; v_asset_id:=v_purchase.asset_id;
             if v_asset_id is not null and exists(select 1 from public.barn_assets ba where ba.id=v_asset_id and ba.status<>'AKTIF') then
               raise exception 'Aset terkait sudah tidak AKTIF sehingga pembelian tidak boleh dikoreksi.';
             end if;
             update public.logistics_equipment_purchases
             set supplier_id=p_supplier_id,item_id=p_item_id,barn_id=p_barn_id,purchase_date=p_purchase_date,
                 quantity=p_quantity,purchase_unit_price=p_purchase_unit_price,
                 reference_number=nullif(trim(coalesce(p_reference_number,'')),''),
                 notes=nullif(trim(coalesce(p_notes,'')),''),
                 updated_at=now()
             where id=v_id;
           else
             insert into public.logistics_equipment_purchases(
               supplier_id,item_id,barn_id,purchase_date,quantity,purchase_unit_price,reference_number,notes,created_by
             ) values (
               p_supplier_id,p_item_id,p_barn_id,p_purchase_date,p_quantity,p_purchase_unit_price,
               nullif(trim(coalesce(p_reference_number,'')),''),
               nullif(trim(coalesce(p_notes,'')),''),
               auth.uid()
             ) returning id into v_id;
           end if;

           v_asset_notes :=
             'Sumber: Beli Peralatan Logistik '||v_id::text||
             ' · Item: '||coalesce(v_item.code,'-')||
             ' · Jumlah: '||p_quantity::text||' '||coalesce(v_item.unit,'')||
             case when nullif(trim(coalesce(p_reference_number,'')),'') is not null then ' · Nota: '||trim(p_reference_number) else '' end||
             case when nullif(trim(coalesce(p_notes,'')),'') is not null then ' · '||trim(p_notes) else '' end;

           if v_asset_id is null then
             insert into public.barn_assets(
               barn_id,name,category,quantity,unit,acquired_on,acquisition_value,condition,status,notes,created_by
             ) values (
               p_barn_id,v_item.name,'PERALATAN',p_quantity,v_item.unit,p_purchase_date,p_quantity*p_purchase_unit_price,
               'BAIK','AKTIF',v_asset_notes,auth.uid()
             ) returning id into v_asset_id;
             update public.logistics_equipment_purchases set asset_id=v_asset_id where id=v_id;
           else
             update public.barn_assets
             set barn_id=p_barn_id,name=v_item.name,category='PERALATAN',
                 quantity=p_quantity,unit=v_item.unit,
                 acquired_on=p_purchase_date,acquisition_value=p_quantity*p_purchase_unit_price,
                 notes=v_asset_notes,updated_at=now()
             where id=v_asset_id;
           end if;

           return v_id;
         end $function$

-- Read-only Administrator performance aggregates. No payroll, RHPP or transaction writes.
CREATE OR REPLACE FUNCTION public.admin_work_performance_v1(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if not exists(select 1 from public.profiles where user_id=auth.uid() and active and role='ADMIN') then
    raise exception 'Akses ditolak. Penilaian kinerja khusus Administrator.' using errcode='42501';
  end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>365 then
    raise exception 'Pilih periode valid, maksimal 366 hari.' using errcode='22023';
  end if;
  with mapping(table_name,category,date_key) as (values
    ('chick_ins','PPL','arrived_on'),('recordings','PPL','recorded_on'),
    ('visits','PPL','visited_on'),('production_estimates','PPL','estimated_on'),
    ('logistics_shipments','LOGISTIK','shipment_date'),('logistics_returns','LOGISTIK','return_date'),
    ('logistics_external_shipments','LOGISTIK','shipment_date'),('logistics_external_returns','LOGISTIK','return_date'),
    ('logistics_mandiri_purchases','LOGISTIK','purchase_date'),('logistics_equipment_purchases','LOGISTIK','purchase_date'),
    ('warehouse_stock_shipments','LOGISTIK','shipment_date'),('finance_expedition_trips','LOGISTIK','trip_date'),
    ('marketing_contract_harvests','MARKETING','harvested_on'),('marketing_external_meat_purchases','MARKETING','purchase_date'),
    ('rhpp_real','KEUANGAN','received_on'),('bop','KEUANGAN','incurred_on'),('bop_outside','KEUANGAN','incurred_on'),
    ('barn_maintenance_costs','KEUANGAN','incurred_on'),('supplier_payments','KEUANGAN','paid_on'),
    ('advances','KEUANGAN','advanced_on'),('advance_payments','KEUANGAN','paid_on'),('abk_cycle_salaries','KEUANGAN','paid_on'),
    ('finance_expedition_invoices','KEUANGAN','invoice_date'),('finance_expedition_payments','KEUANGAN','paid_on'),
    ('finance_expedition_bop','KEUANGAN','incurred_on'),('finance_expedition_maintenance','KEUANGAN','incurred_on'),
    ('finance_mandiri_sales_receipts','KEUANGAN','received_on'),('finance_mandiri_supplier_payments','KEUANGAN','paid_on'),
    ('finance_asset_purchase_invoices','KEUANGAN','purchase_date'),('finance_stock_purchase_invoices','KEUANGAN','purchase_date'),
    ('finance_cash_requests','KEUANGAN','request_date')
  ), raw as (
    select a.id,a.actor,a.table_name,a.record_id,a.occurred_at,m.category,
      replace(a.action,'DB_','') as operation,
      (a.occurred_at at time zone 'Asia/Jakarta')::date as input_date,
      case when (a.new_data->>m.date_key) ~ '^\d{4}-\d{2}-\d{2}$' and pg_catalog.pg_input_is_valid(a.new_data->>m.date_key,'date') then (a.new_data->>m.date_key)::date end as business_date,
      a.old_data,a.new_data
    from public.audit_events a join mapping m on m.table_name=a.table_name
    where a.action in ('DB_INSERT','DB_UPDATE','DB_DELETE','INSERT','UPDATE','DELETE')
      and a.occurred_at >= (p_from::timestamp at time zone 'Asia/Jakarta')
      and a.occurred_at < ((p_to+1)::timestamp at time zone 'Asia/Jakarta')
  ), meaningful as (
    select * from raw r where r.operation<>'UPDATE' or (
      r.old_data is distinct from r.new_data and not exists (
        select 1 from public.audit_events i where i.table_name=r.table_name
          and i.record_id=r.record_id and i.actor is not distinct from r.actor
          and i.occurred_at=r.occurred_at and i.action in ('DB_INSERT','INSERT')
      )
    )
  ), dedup as (
    -- One new record; one changed/deleted record per actor/day. Ignore parallel audit wrappers.
    select distinct on (table_name,coalesce(record_id,id::text),actor,operation,
      case when operation='INSERT' then null::date else input_date end)
      actor,category,operation,input_date,business_date,table_name
    from meaningful
    order by table_name,coalesce(record_id,id::text),actor,operation,
      case when operation='INSERT' then null::date else input_date end,occurred_at,id
  ), stats as (
    select d.actor,d.category,d.input_date,
      count(*) filter(where operation='INSERT') as new_count,
      count(*) filter(where operation='UPDATE') as changed_count,
      count(*) filter(where operation='DELETE') as deleted_count,
      count(*) filter(where operation='INSERT' and business_date=input_date) as on_time,
      count(*) filter(where operation='INSERT' and business_date<input_date) as late,
      count(*) filter(where operation='INSERT' and (business_date is null or business_date>input_date)) as unassessed,
      coalesce(sum(input_date-business_date) filter(where operation='INSERT' and business_date<=input_date),0) as delay_days
    from dedup d join public.profiles p on p.user_id=d.actor
    group by d.actor,d.category,d.input_date
  )
  select jsonb_build_object(
    'from',p_from,'to',p_to,'timezone','Asia/Jakarta','generated_at',now(),
    'users',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',full_name,'role',role,'active',active) order by full_name),'[]'::jsonb) from public.profiles),
    'stats',(select coalesce(jsonb_agg(to_jsonb(s) order by input_date,actor,category),'[]'::jsonb) from stats s),
    'unattributed',(select count(*) from dedup d where not exists(select 1 from public.profiles p where p.user_id=d.actor)),
    'recording_coverage',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
      select a.id as assignment_id,a.ppl_id as actor,b.name as barn,
        count(day.d) as expected_days,
        count(day.d) filter(where exists(select 1 from public.recordings r where r.contract_assignment_id=a.id and r.recorded_on=day.d::date)) as recorded_days
      from public.logistics_contract_assignments a join public.barns b on b.id=a.barn_id
      join lateral (select min(c.arrived_on) as arrived_on from public.chick_ins c where c.contract_assignment_id=a.id) ci on ci.arrived_on is not null
      left join lateral generate_series(greatest(p_from,ci.arrived_on+1)::timestamp,least(p_to,(now() at time zone 'Asia/Jakarta')::date-1)::timestamp,interval '1 day') day(d) on true
      where a.active
      group by a.id,a.ppl_id,b.name
    ) x),
    'coverage',(select jsonb_agg(jsonb_build_object('category',m.category,'table',m.table_name,
      'first_audit',(select min(occurred_at) from public.audit_events a where a.table_name=m.table_name and a.action in ('DB_INSERT','INSERT')),
      'audited',exists(select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace join pg_catalog.pg_proc f on f.oid=t.tgfoid where n.nspname='public' and c.relname=m.table_name and not t.tgisinternal and t.tgenabled<>'D' and f.proname ilike '%audit%')
    ) order by m.category,m.table_name) from mapping m)
  ) into v_result;
  return v_result;
end
$function$;
REVOKE ALL ON FUNCTION public.admin_work_performance_v1(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_work_performance_v1(date,date) TO authenticated;
-- Start future audit for standalone administrative cash requests; no historical backfill.
CREATE OR REPLACE TRIGGER z_audit_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON public.finance_cash_requests
FOR EACH ROW EXECUTE FUNCTION private.audit_transaction_change();

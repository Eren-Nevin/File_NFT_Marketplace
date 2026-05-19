CREATE TYPE "public"."admin_role" AS ENUM('SUPER_ADMIN', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'sold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'audio', 'video', 'pdf', 'doc', 'markdown', 'text');--> statement-breakpoint
CREATE TYPE "public"."sale_kind" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TYPE "public"."session_role" AS ENUM('USER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('active', 'exhausted', 'revoked');--> statement-breakpoint
CREATE TABLE "admins" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"role" "admin_role" NOT NULL,
	"added_by" varchar(42),
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(42) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_table" varchar(64),
	"target_id" varchar(80),
	"before" jsonb,
	"after" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"name" varchar(64) NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"royalty_bps" smallint NOT NULL,
	"royalty_receiver" varchar(42) NOT NULL,
	"platform_fee_bps" smallint NOT NULL,
	"deployer" varchar(42) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"block_number" bigint,
	"salt" varchar(66),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_cursors" (
	"chain_id" integer NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"last_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indexer_cursors_chain_id_contract_address_pk" PRIMARY KEY("chain_id","contract_address")
);
--> statement-breakpoint
CREATE TABLE "lazy_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"collection_address" varchar(42) NOT NULL,
	"token_id" varchar(80) NOT NULL,
	"price_per_unit" bigint NOT NULL,
	"max_amount" bigint NOT NULL,
	"sold_amount" bigint DEFAULT 0 NOT NULL,
	"token_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"nonce" bigint NOT NULL,
	"voucher_hash" varchar(66) NOT NULL,
	"signature" text NOT NULL,
	"signer" varchar(42) NOT NULL,
	"status" "voucher_status" DEFAULT 'active' NOT NULL,
	"created_by" varchar(42) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" varchar(66) PRIMARY KEY NOT NULL,
	"seller" varchar(42) NOT NULL,
	"collection_id" uuid,
	"collection_address" varchar(42) NOT NULL,
	"token_id" varchar(80) NOT NULL,
	"amount_initial" bigint NOT NULL,
	"amount_remaining" bigint NOT NULL,
	"price_per_unit" bigint NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"tx_hash_created" varchar(66) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_filename" text NOT NULL,
	"mime" varchar(128) NOT NULL,
	"size" bigint NOT NULL,
	"media_type" "media_type" NOT NULL,
	"file_cid" varchar(128) NOT NULL,
	"preview_cid" varchar(128) NOT NULL,
	"uploaded_by" varchar(42) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nft_view_stats" (
	"nft_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "nft_view_stats_nft_id_day_pk" PRIMARY KEY("nft_id","day")
);
--> statement-breakpoint
CREATE TABLE "nft_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"viewer_address" varchar(42),
	"viewer_ip_hash" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"token_id" varchar(80),
	"name" varchar(128) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"attributes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"metadata_cid" varchar(128) NOT NULL,
	"max_supply" integer NOT NULL,
	"minted_supply" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"log_index" integer NOT NULL,
	"block_number" bigint NOT NULL,
	"kind" "sale_kind" NOT NULL,
	"voucher_id" uuid,
	"listing_id" varchar(66),
	"buyer" varchar(42) NOT NULL,
	"seller" varchar(42),
	"collection_id" uuid,
	"collection_address" varchar(42) NOT NULL,
	"token_id" varchar(80) NOT NULL,
	"amount" bigint NOT NULL,
	"price_paid" bigint NOT NULL,
	"royalty_amount" bigint DEFAULT 0 NOT NULL,
	"platform_fee_amount" bigint DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(42) NOT NULL,
	"role" "session_role" NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "siwe_nonces" (
	"nonce" varchar(64) PRIMARY KEY NOT NULL,
	"address" varchar(42) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"display_name" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_address_users_address_fk" FOREIGN KEY ("address") REFERENCES "public"."users"("address") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lazy_vouchers" ADD CONSTRAINT "lazy_vouchers_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_view_stats" ADD CONSTRAINT "nft_view_stats_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_views" ADD CONSTRAINT "nft_views_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."nfts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_voucher_id_lazy_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."lazy_vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_contract_unique" ON "collections" USING btree ("chain_id","contract_address");--> statement-breakpoint
CREATE UNIQUE INDEX "lazy_vouchers_hash_unique" ON "lazy_vouchers" USING btree ("voucher_hash");--> statement-breakpoint
CREATE INDEX "lazy_vouchers_nft_idx" ON "lazy_vouchers" USING btree ("nft_id");--> statement-breakpoint
CREATE INDEX "lazy_vouchers_status_idx" ON "lazy_vouchers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller");--> statement-breakpoint
CREATE INDEX "listings_collection_idx" ON "listings" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nft_views_nft_idx" ON "nft_views" USING btree ("nft_id");--> statement-breakpoint
CREATE INDEX "nfts_collection_idx" ON "nfts" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "nfts_token_idx" ON "nfts" USING btree ("collection_id","token_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_tx_log_unique" ON "sales" USING btree ("chain_id","tx_hash","log_index");--> statement-breakpoint
CREATE INDEX "sales_buyer_idx" ON "sales" USING btree ("buyer");--> statement-breakpoint
CREATE INDEX "sales_collection_idx" ON "sales" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "sessions_address_idx" ON "sessions" USING btree ("address");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "siwe_nonces_address_idx" ON "siwe_nonces" USING btree ("address");--> statement-breakpoint
CREATE INDEX "siwe_nonces_expires_idx" ON "siwe_nonces" USING btree ("expires_at");
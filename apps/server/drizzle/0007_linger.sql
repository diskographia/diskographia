ALTER TABLE "entity_events" ADD COLUMN "linger_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entity_events"
  ADD CONSTRAINT entity_events_linger_check
  CHECK (linger_days >= 0 AND linger_days <= 365);
--> statement-breakpoint
ALTER TABLE "entity_products" DROP CONSTRAINT entity_products_currency_check;
--> statement-breakpoint
UPDATE "entity_products" SET price_label = 'договорная' WHERE price_amount IS NULL AND price_label IS NULL;
--> statement-breakpoint
ALTER TABLE "entity_products"
  ADD CONSTRAINT entity_products_price_check_one_of
  CHECK ((price_amount IS NULL) <> (price_label IS NULL) AND (price_amount IS NULL) = (price_currency IS NULL));

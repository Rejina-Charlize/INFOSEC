CREATE INDEX IF NOT EXISTS idx_medicines_active_name ON medicines (archived, name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines (category_id);
CREATE INDEX IF NOT EXISTS idx_batches_medicine_expiry ON medicine_batches (medicine_id, expiration_date);
CREATE INDEX IF NOT EXISTS idx_batches_available ON medicine_batches (status, expiration_date) WHERE current_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine_date ON stock_movements (medicine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_date ON audit_logs (entity_type, entity_id, created_at DESC);

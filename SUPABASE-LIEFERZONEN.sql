ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS delivery_fee_2km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_minimum_2km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_7km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_minimum_7km numeric DEFAULT 0;

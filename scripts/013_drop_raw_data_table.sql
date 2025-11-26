-- Drop the raw_data table as it's no longer needed
-- All data is now stored directly in the sensor_readings table with raw_payload field

drop table if exists public.raw_data cascade;

-- Confirm the cleanup
comment on table public.sensor_readings is 'Main table for all sensor readings. The raw_payload field stores the complete webhook payload for reference.';

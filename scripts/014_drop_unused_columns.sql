-- Drop unused columns from sensor_readings table
-- These columns are not used in the application:
-- - temperature: sensor doesn't measure temp (using ambient_temperature from weather API instead)
-- - humidity: sensor doesn't measure humidity (using ambient_humidity from weather API instead)  
-- - water_level: using distance_mm instead

alter table public.sensor_readings 
drop column if exists temperature,
drop column if exists humidity,
drop column if exists water_level;

-- Add distance_mm column to sensor_readings table
-- This column stores the distance measurement in millimeters from the ultrasonic sensor
-- Lower values typically indicate higher water levels (sensor measures distance to water surface)

alter table public.sensor_readings 
add column if not exists distance_mm decimal(10, 2);

-- Add index for better query performance on distance_mm
create index if not exists idx_sensor_readings_distance_mm on public.sensor_readings(distance_mm);

-- Add comment to explain the column
comment on column public.sensor_readings.distance_mm is 'Distance in millimeters measured by ultrasonic sensor (lower = higher water level)';

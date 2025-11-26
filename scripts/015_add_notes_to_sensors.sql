-- Add notes column to sensors table
-- This column will store additional notes/comments about the sensor
-- Positioned after location_description for logical grouping

alter table public.sensors 
add column if not exists notes text;

-- Add comment to explain the column
comment on column public.sensors.notes is 'Additional notes or comments about the sensor';

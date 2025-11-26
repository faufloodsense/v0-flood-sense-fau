-- Complete database setup for FloodSenseFAU
-- This combines all migrations into one script

-- 1. Create sensors table to store sensor metadata
create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_description text,
  status text default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Create sensor_readings table with all fields
create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid references public.sensors(id) on delete cascade,
  device_id text not null,
  water_level decimal(10, 2),
  temperature decimal(5, 2),
  humidity decimal(5, 2),
  battery_level decimal(5, 2),
  signal_strength integer,
  raw_payload jsonb,
  -- Location fields (from script 002)
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_description text,
  -- Weather fields (from script 008)
  ambient_temperature decimal(5, 2),
  ambient_humidity decimal(5, 2),
  cloud_cover integer,
  weather_condition text,
  received_at timestamp with time zone default now()
);

-- 3. Create indexes for better query performance
create index if not exists idx_sensor_readings_sensor_id on public.sensor_readings(sensor_id);
create index if not exists idx_sensor_readings_device_id on public.sensor_readings(device_id);
create index if not exists idx_sensor_readings_received_at on public.sensor_readings(received_at desc);
create index if not exists idx_sensors_device_id on public.sensors(device_id);
create index if not exists idx_sensor_readings_location on public.sensor_readings(latitude, longitude);

-- 4. Enable Row Level Security
alter table public.sensors enable row level security;
alter table public.sensor_readings enable row level security;

-- 5. Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Allow public read access to sensors" on public.sensors;
drop policy if exists "Allow public read access to sensor_readings" on public.sensor_readings;
drop policy if exists "Allow service role to insert sensors" on public.sensors;
drop policy if exists "Allow service role to update sensors" on public.sensors;
drop policy if exists "Allow service role to insert sensor_readings" on public.sensor_readings;
drop policy if exists "Allow service role to update sensor_readings" on public.sensor_readings;

-- 6. Create policies for sensors table
create policy "Allow public read access to sensors"
  on public.sensors for select
  using (true);

create policy "Allow service role to insert sensors"
  on public.sensors for insert
  with check (true);

create policy "Allow service role to update sensors"
  on public.sensors for update
  using (true);

-- 7. Create policies for sensor_readings table
create policy "Allow public read access to sensor_readings"
  on public.sensor_readings for select
  using (true);

create policy "Allow service role to insert sensor_readings"
  on public.sensor_readings for insert
  with check (true);

create policy "Allow service role to update sensor_readings"
  on public.sensor_readings for update
  using (true);

-- 8. Add helpful comments
comment on column public.sensor_readings.temperature is 'Temperature from sensor (if available)';
comment on column public.sensor_readings.humidity is 'Humidity from sensor (if available)';
comment on column public.sensor_readings.latitude is 'Latitude where reading was taken (allows for sensor relocation)';
comment on column public.sensor_readings.longitude is 'Longitude where reading was taken (allows for sensor relocation)';
comment on column public.sensor_readings.location_description is 'Address/description where reading was taken';
comment on column public.sensor_readings.ambient_temperature is 'Ambient temperature from weather API (South Delray, FL)';
comment on column public.sensor_readings.ambient_humidity is 'Ambient humidity from weather API (South Delray, FL)';
comment on column public.sensor_readings.cloud_cover is 'Cloud cover percentage (0-100) from weather API';
comment on column public.sensor_readings.weather_condition is 'Weather condition description (e.g., clear, cloudy, rainy)';

-- 9. Insert sample sensors for testing
insert into public.sensors (device_id, name, latitude, longitude, location_description, status)
values 
  ('FAU_SENSOR_001', 'Boca Raton Campus Sensor', 26.3683, -80.1056, 'FAU Boca Raton Campus', 'active'),
  ('FAU_SENSOR_002', 'Delray Beach Sensor', 26.4615, -80.0728, 'Delray Beach Area', 'active'),
  ('FAU_SENSOR_003', 'Deerfield Beach Sensor', 26.3184, -80.0998, 'Deerfield Beach Area', 'active')
on conflict (device_id) do nothing;

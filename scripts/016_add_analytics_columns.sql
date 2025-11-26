-- Add analytics-related columns to sensor_readings_clean table
-- and enable RLS policies

-- Add additional columns for analytics metadata
ALTER TABLE public.sensor_readings_clean
ADD COLUMN IF NOT EXISTS baseline_mm numeric,
ADD COLUMN IF NOT EXISTS depth_mm numeric,
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS noise_floor_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS filtered_gradient boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS filtered_blip boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS filtered_box boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS z_score numeric,
ADD COLUMN IF NOT EXISTS z_anomaly boolean DEFAULT false;

-- Enable RLS on sensor_readings_clean
ALTER TABLE public.sensor_readings_clean ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for sensor_readings_clean
CREATE POLICY IF NOT EXISTS "Allow public read access to sensor_readings_clean"
  ON public.sensor_readings_clean
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role to insert sensor_readings_clean"
  ON public.sensor_readings_clean
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role to update sensor_readings_clean"
  ON public.sensor_readings_clean
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role to delete sensor_readings_clean"
  ON public.sensor_readings_clean
  FOR DELETE
  TO service_role
  USING (true);

-- Add comment to table
COMMENT ON TABLE public.sensor_readings_clean IS 'Processed/cleaned sensor readings after applying NYC flood filters and z-score anomaly detection';

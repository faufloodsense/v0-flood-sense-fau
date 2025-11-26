// lib/flood-filters.ts
// NYC-style flood data filters for cleaning sensor readings

export interface RawReading {
  sensorId: string
  t_ms: number // epoch ms
  distance_mm: number // raw ultrasonic distance
  had_precip_last_hour?: boolean
}

export interface ProcessedReading extends RawReading {
  // Derived fields
  timestamp_iso: string
  baseline_mm: number
  depth_mm: number | null // null if invalid per NYC rule filters
  nycValid: boolean

  // NYC filter flags
  noiseFloorApplied: boolean
  filteredGradient: boolean
  filteredBlip: boolean
  filteredBox: boolean
  gradientRate_mm_per_min: number | null

  // Z-score
  zScore: number | null
  zAnomaly: boolean
}

// ---- utils ----

function median(nums: number[]): number {
  if (nums.length === 0) return Number.NaN
  const arr = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  if (arr.length % 2 === 1) return arr[mid]
  return (arr[mid - 1] + arr[mid]) / 2
}

function toDateUTC(t_ms: number): Date {
  return new Date(t_ms)
}

// Simple "nighttime" predicate (22:00–05:00 UTC)
function isNight(d: Date): boolean {
  const h = d.getUTCHours()
  return h >= 22 || h < 5
}

// ---- main pipeline ----

export function applyFloodFilters(raw: RawReading[]): ProcessedReading[] {
  if (!raw || raw.length === 0) return []

  // 1) Sort by time (per sensor later too)
  const sorted = [...raw].sort((a, b) => a.t_ms - b.t_ms)

  // 2) Compute per-sensor baseline (simplified dynamic baseline):
  //    - Median of all nighttime distances for that sensor
  //    - If none, median of all distances for that sensor
  const baselineBySensor = new Map<string, number>()

  {
    const bySensor = new Map<string, RawReading[]>()
    for (const r of sorted) {
      if (!bySensor.has(r.sensorId)) bySensor.set(r.sensorId, [])
      bySensor.get(r.sensorId)!.push(r)
    }

    for (const [sensorId, readings] of bySensor.entries()) {
      const nightDistances: number[] = []
      const allDistances: number[] = []
      for (const r of readings) {
        allDistances.push(r.distance_mm)
        const d = toDateUTC(r.t_ms)
        if (isNight(d)) {
          nightDistances.push(r.distance_mm)
        }
      }
      let base: number
      if (nightDistances.length > 0) {
        base = median(nightDistances)
      } else if (allDistances.length > 0) {
        base = median(allDistances)
      } else {
        base = 0
      }
      baselineBySensor.set(sensorId, base)
    }
  }

  // 3) Initialize processed array with baseline + raw depth
  const processed: ProcessedReading[] = sorted.map((r) => {
    const baseline = baselineBySensor.get(r.sensorId) ?? r.distance_mm
    const rawDepth = baseline - r.distance_mm

    return {
      ...r,
      timestamp_iso: new Date(r.t_ms).toISOString(),
      baseline_mm: baseline,
      depth_mm: rawDepth,
      nycValid: true,
      noiseFloorApplied: false,
      filteredGradient: false,
      filteredBlip: false,
      filteredBox: false,
      gradientRate_mm_per_min: null,
      zScore: null,
      zAnomaly: false,
    }
  })

  // 4) NYC Filter 1: Noise floor (< 10 mm => clamp to 0, but keep as valid)
  const NOISE_FLOOR_MM = 10
  for (const p of processed) {
    if (p.depth_mm !== null && p.depth_mm < NOISE_FLOOR_MM) {
      p.depth_mm = 0
      p.noiseFloorApplied = true
    }
  }

  // 5) NYC Filter 2: Gradient spike (|Δdepth/Δtime| > 254 mm/min => invalid)
  const GRADIENT_THRESH = 254 // mm/min

  {
    const bySensorIdx = new Map<string, number[]>()
    processed.forEach((p, idx) => {
      if (!bySensorIdx.has(p.sensorId)) bySensorIdx.set(p.sensorId, [])
      bySensorIdx.get(p.sensorId)!.push(idx)
    })

    for (const idxs of bySensorIdx.values()) {
      // ensure chronological
      idxs.sort((a, b) => processed[a].t_ms - processed[b].t_ms)
      let prevIdx: number | null = null
      for (const i of idxs) {
        const current = processed[i]
        if (prevIdx !== null && current.depth_mm !== null && processed[prevIdx].depth_mm !== null) {
          const prev = processed[prevIdx]
          const dtMin = (current.t_ms - prev.t_ms) / 60000 // ms -> minutes
          if (dtMin > 0) {
            const dDepth = current.depth_mm - prev.depth_mm
            const rate = Math.abs(dDepth / dtMin)
            current.gradientRate_mm_per_min = rate
            if (rate > GRADIENT_THRESH) {
              current.filteredGradient = true
              current.nycValid = false
              current.depth_mm = null
            }
          }
        }
        // Only update prevIdx if this point is still valid
        if (processed[i].depth_mm !== null && processed[i].nycValid) {
          prevIdx = i
        }
      }
    }
  }

  // 6) NYC Filter 3: Blips (3-point patterns D1,D2,D3)
  const MIN_BLIP_DELTA = 2 // mm
  const BLIP_METRIC_THRESH = 0.1

  {
    const bySensorIdx = new Map<string, number[]>()
    processed.forEach((p, idx) => {
      if (!bySensorIdx.has(p.sensorId)) bySensorIdx.set(p.sensorId, [])
      bySensorIdx.get(p.sensorId)!.push(idx)
    })

    for (const idxs of bySensorIdx.values()) {
      idxs.sort((a, b) => processed[a].t_ms - processed[b].t_ms)

      for (let k = 2; k < idxs.length; k++) {
        const i1 = idxs[k - 2]
        const i2 = idxs[k - 1]
        const i3 = idxs[k]

        const D1 = processed[i1].depth_mm
        const D2 = processed[i2].depth_mm
        const D3 = processed[i3].depth_mm

        if (
          D1 === null ||
          D2 === null ||
          D3 === null ||
          !processed[i1].nycValid ||
          !processed[i2].nycValid ||
          !processed[i3].nycValid
        ) {
          continue
        }

        const delta = D2 - D1
        if (delta <= MIN_BLIP_DELTA) continue

        const metric = Math.abs((D3 - D1) / delta)
        if (metric < BLIP_METRIC_THRESH) {
          // mark middle point as blip
          processed[i2].filteredBlip = true
          processed[i2].nycValid = false
          processed[i2].depth_mm = null
        }
      }
    }
  }

  // 7) NYC Filter 4: Box patterns (parked object plateau)
  const BOX_METRIC_THRESH = 0.1

  {
    const bySensorIdx = new Map<string, number[]>()
    processed.forEach((p, idx) => {
      if (!bySensorIdx.has(p.sensorId)) bySensorIdx.set(p.sensorId, [])
      bySensorIdx.get(p.sensorId)!.push(idx)
    })

    for (const idxs of bySensorIdx.values()) {
      idxs.sort((a, b) => processed[a].t_ms - processed[b].t_ms)

      let k = 0
      while (k < idxs.length - 2) {
        const i1 = idxs[k]
        const D1 = processed[i1].depth_mm

        if (D1 !== 0 || !processed[i1].nycValid) {
          k++
          continue
        }

        const i2 = idxs[k + 1]
        const D2 = processed[i2].depth_mm

        if (D2 === null || D2 <= 0 || !processed[i2].nycValid) {
          k++
          continue
        }

        // Candidate box; extend plateau
        const indicesInBox: number[] = [i2]
        let j = k + 2
        while (j < idxs.length) {
          const ij = idxs[j]
          const Dj = processed[ij].depth_mm
          if (Dj === null || !processed[ij].nycValid) break

          const metric = Math.abs((Dj - D2) / D2)
          if (metric < BOX_METRIC_THRESH) {
            indicesInBox.push(ij)
            j++
          } else {
            break
          }
        }

        if (indicesInBox.length > 1) {
          // Mark D2..Dn as box
          for (const idxBox of indicesInBox) {
            processed[idxBox].filteredBox = true
            processed[idxBox].nycValid = false
            processed[idxBox].depth_mm = null
          }
          k = indicesInBox[indicesInBox.length - 1] + 1
        } else {
          k++
        }
      }
    }
  }

  // 8) Z-score (global per sensor on valid NYC depths)
  const Z_THRESH = 2.0

  {
    const bySensorIdx = new Map<string, number[]>()
    processed.forEach((p, idx) => {
      if (!bySensorIdx.has(p.sensorId)) bySensorIdx.set(p.sensorId, [])
      bySensorIdx.get(p.sensorId)!.push(idx)
    })

    for (const idxs of bySensorIdx.values()) {
      const depths: number[] = []
      const depthIdxs: number[] = []
      for (const i of idxs) {
        const d = processed[i].depth_mm
        if (d !== null && processed[i].nycValid) {
          depths.push(d)
          depthIdxs.push(i)
        }
      }
      if (depths.length < 2) continue

      const mean = depths.reduce((acc, v) => acc + v, 0) / depths.length
      const var_ = depths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (depths.length - 1)
      const std = Math.sqrt(var_)
      if (!isFinite(std) || std === 0) continue

      for (const i of depthIdxs) {
        const d = processed[i].depth_mm!
        const z = (d - mean) / std
        processed[i].zScore = z
        processed[i].zAnomaly = Math.abs(z) > Z_THRESH
      }
    }
  }

  return processed
}

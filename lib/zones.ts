// Zone threshold management.
// Single source of truth for HR zone thresholds.
// All other files import from here — never hardcode thresholds.

import { getUserZones, type ZoneThresholds } from './storage';

export type { ZoneThresholds };

export function getZoneThresholds(): ZoneThresholds {
  return getUserZones().activeZones;
}

export function getZoneForHR(hr: number, zones?: ZoneThresholds): 1 | 2 | 3 | 4 | 5 {
  const t = zones ?? getZoneThresholds();
  if (hr <= t.z1.high) return 1;
  if (hr <= t.z2.high) return 2;
  if (hr <= t.z3.high) return 3;
  if (hr <= t.z4.high) return 4;
  return 5;
}

export function computeZonesFromAge(age: number): ZoneThresholds {
  const maxHR = 220 - age;
  return {
    z1: { low: Math.round(maxHR * 0.5), high: Math.round(maxHR * 0.6) },
    z2: { low: Math.round(maxHR * 0.6), high: Math.round(maxHR * 0.7) },
    z3: { low: Math.round(maxHR * 0.7), high: Math.round(maxHR * 0.8) },
    z4: { low: Math.round(maxHR * 0.8), high: Math.round(maxHR * 0.9) },
    z5: { low: Math.round(maxHR * 0.9), high: maxHR },
  };
}

export function computeZonesFromMAF(age: number): ZoneThresholds {
  const maf = 180 - age;
  return {
    z1: { low: 0, high: maf - 20 },
    z2: { low: maf - 20, high: maf },
    z3: { low: maf, high: maf + 10 },
    z4: { low: maf + 10, high: maf + 20 },
    z5: { low: maf + 20, high: 220 },
  };
}

// Cardio zone distribution helpers used across the app
export interface WeeklyZoneTotals {
  z1Hours: number;
  z2Hours: number;
  z3Hours: number;
  z4Hours: number;
  z5Hours: number;
  totalHours: number;
  aerobicPct: number;  // % of total that is Z1+Z2
  anaerobicPct: number; // % of total that is Z4+Z5
}

export function computeZoneTotals(
  cardioSessions: Array<{ zoneDistribution: import('./storage').ZoneDistribution | null }>
): WeeklyZoneTotals {
  let z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;
  for (const s of cardioSessions) {
    if (!s.zoneDistribution) continue;
    z1 += s.zoneDistribution.z1;
    z2 += s.zoneDistribution.z2;
    z3 += s.zoneDistribution.z3;
    z4 += s.zoneDistribution.z4;
    z5 += s.zoneDistribution.z5;
  }
  const total = z1 + z2 + z3 + z4 + z5;
  return {
    z1Hours: Math.round(z1 * 10) / 10,
    z2Hours: Math.round(z2 * 10) / 10,
    z3Hours: Math.round(z3 * 10) / 10,
    z4Hours: Math.round(z4 * 10) / 10,
    z5Hours: Math.round(z5 * 10) / 10,
    totalHours: Math.round(total * 10) / 10,
    aerobicPct: total > 0 ? Math.round(((z1 + z2) / total) * 100) : 0,
    anaerobicPct: total > 0 ? Math.round(((z4 + z5) / total) * 100) : 0,
  };
}

export function aerobicBalanceLabel(aerobicPct: number): string {
  if (aerobicPct >= 75) return 'Aerobic base building';
  if (aerobicPct >= 50) return 'Mixed';
  return 'Intensity-heavy';
}

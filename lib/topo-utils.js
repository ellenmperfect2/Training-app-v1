import topoLibrary from '@/data/topo-library.json';
import topoPageConfig from '@/data/topo-page-config.json';
import { TOPO } from '@/lib/theme';

/**
 * Returns the full topo object for a given page id, or null if none assigned.
 * @param {string} pageId - e.g. "dashboard", "cardio"
 * @returns {object|null}
 */
export function getTopoForPage(pageId) {
  const assignment = topoPageConfig.assignments[pageId];
  if (!assignment) return null;
  const topo = topoLibrary.topos.find((t) => t.id === assignment);
  return topo ?? null;
}

/**
 * Projects geographic contour coordinates (lon/lat) into SVG x/y space.
 *
 * @param {Array<{elevationM: number, coordinates: [number, number][]}>} contours
 * @param {number} width  - SVG viewBox width
 * @param {number} height - SVG viewBox height
 * @param {number} [padding=0.05] - fractional padding on all sides
 * @returns {Array<{elevationM: number, points: {x: number, y: number}[]}>}
 */
export function projectContours(contours, width, height, padding = 0.05) {
  if (!contours || contours.length === 0) return [];

  // Compute bounding box across all contours
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const contour of contours) {
    for (const [lon, lat] of contour.coordinates) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  const padX = width * padding;
  const padY = height * padding;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  return contours.map((contour) => ({
    elevationM: contour.elevationM,
    points: contour.coordinates.map(([lon, lat]) => ({
      x: padX + ((lon - minLon) / lonRange) * innerW,
      // Y-axis flipped: higher lat → lower y value
      y: padY + ((maxLat - lat) / latRange) * innerH,
    })),
  }));
}

/**
 * Returns stroke opacity for a contour at a given elevation, linearly
 * interpolated between TOPO.opacityMin and TOPO.opacityMax.
 *
 * @param {number} elevM
 * @param {number} minElev
 * @param {number} maxElev
 * @returns {number}
 */
export function elevationOpacity(elevM, minElev, maxElev) {
  const t = (elevM - minElev) / (maxElev - minElev || 1);
  return TOPO.opacityMin + t * (TOPO.opacityMax - TOPO.opacityMin);
}

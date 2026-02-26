'use client';
import { useTheme } from '@/lib/theme-context';
import { TOPO } from '@/lib/theme';
import { projectContours, elevationOpacity } from '@/lib/topo-utils';

const FADE_GRADIENTS = {
  bottom: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
  top:    { x1: '0%', y1: '100%', x2: '0%', y2: '0%' },
  right:  { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
  left:   { x1: '100%', y1: '0%', x2: '0%', y2: '0%' },
};

/**
 * Renders topo contour lines as an absolutely-positioned SVG overlay.
 *
 * Props:
 *   topoData      — topo object from topo-library.json (or null)
 *   width         — SVG viewBox width (number)
 *   height        — SVG viewBox height (number)
 *   fadeDirection — "bottom" | "top" | "right" | "left"
 *   flip          — boolean, default false; rotates content 180° when true
 */
export default function TopoLayer({
  topoData,
  width = 400,
  height = 200,
  fadeDirection = 'bottom',
  flip = false,
}) {
  const { theme: T } = useTheme();

  if (!topoData || !topoData.contours || topoData.contours.length === 0) {
    return null;
  }

  const contours = topoData.contours;
  const minElev = topoData.elevationRangeM[0];
  const maxElev = topoData.elevationRangeM[1];
  const projected = projectContours(contours, width, height);

  const gradId = `topo-fade-${fadeDirection}-${flip ? 'flip' : 'norm'}`;
  const grad = FADE_GRADIENTS[fadeDirection] ?? FADE_GRADIENTS.bottom;

  const contentTransform = flip
    ? `rotate(180, ${width / 2}, ${height / 2})`
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={TOPO.preserveAspect}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1={grad.x1} y1={grad.y1} x2={grad.x2} y2={grad.y2}>
          <stop offset="0%" stopColor={T.bg} stopOpacity="0" />
          <stop offset="100%" stopColor={T.bg} stopOpacity="1" />
        </linearGradient>
      </defs>

      <g transform={contentTransform}>
        {projected.map((contour, i) => {
          if (contour.points.length < 2) return null;
          const d = contour.points
            .map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(' ');
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={T.moss}
              strokeWidth={TOPO.strokeWidth}
              strokeOpacity={elevationOpacity(contour.elevationM, minElev, maxElev)}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Fade gradient overlay */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

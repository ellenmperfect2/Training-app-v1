'use client';
import { useTheme } from '@/lib/theme-context';
import { GRID } from '@/lib/theme';

/**
 * Renders a dashed survey grid with intersection dots as an absolutely-positioned
 * SVG overlay.
 *
 * Props:
 *   width   — number
 *   height  — number
 *   opacity — number (caller controls; component renders at full opacity internally)
 */
export default function SurveyGrid({ width = 400, height = 200, opacity = GRID.heroOpacity }) {
  const { theme: T } = useTheme();

  const cols = Math.ceil(width / GRID.spacing);
  const rows = Math.ceil(height / GRID.spacing);

  const verticals = [];
  for (let c = 0; c <= cols; c++) {
    const x = c * GRID.spacing;
    verticals.push(
      <line
        key={`v${c}`}
        x1={x} y1={0} x2={x} y2={height}
        stroke={T.grid}
        strokeWidth={GRID.strokeWidth}
        strokeDasharray={GRID.dashArray}
      />
    );
  }

  const horizontals = [];
  for (let r = 0; r <= rows; r++) {
    const y = r * GRID.spacing;
    horizontals.push(
      <line
        key={`h${r}`}
        x1={0} y1={y} x2={width} y2={y}
        stroke={T.grid}
        strokeWidth={GRID.strokeWidth}
        strokeDasharray={GRID.dashArray}
      />
    );
  }

  const dots = [];
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) {
      dots.push(
        <circle
          key={`d${c}-${r}`}
          cx={c * GRID.spacing}
          cy={r * GRID.spacing}
          r={GRID.dotRadius}
          fill={T.grid}
        />
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
      }}
      aria-hidden="true"
    >
      {verticals}
      {horizontals}
      {dots}
    </svg>
  );
}

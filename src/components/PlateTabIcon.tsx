import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

export default function PlateTabIcon({ color, size }: { color: string; size: number }) {
  const c = size / 2;
  const r = size / 2 - 1.5;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={1.8} />
      <Line x1={c} y1={c - r} x2={c} y2={c + r} stroke={color} strokeWidth={1.5} />
      <Line x1={c - r} y1={c} x2={c + r} y2={c} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

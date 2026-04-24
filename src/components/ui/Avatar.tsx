import * as React from 'react';
import styles from './Avatar.module.css';

const AVA_COLORS: Array<[string, string]> = [
  ['#E8EEF7', '#2B5FA4'],
  ['#FBF3DC', '#8A6A12'],
  ['#E4F2E6', '#2E7D3E'],
  ['#F3E8F0', '#7B3F6B'],
  ['#FFE8DC', '#B2572A'],
  ['#E1EFF1', '#2A6B73'],
  ['#EEE8F7', '#5A42A0'],
  ['#F0ECE4', '#70604A'],
];

export const initialsOf = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
};

const hashCode = (s: string): number => {
  let h = 0;
  for (const c of s || '') h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

export const avaColor = (name: string): [string, string] =>
  AVA_COLORS[hashCode(name) % AVA_COLORS.length];

type AvatarProps = {
  name?: string;
  size?: number;
  ring?: string | boolean;
  title?: string;
  style?: React.CSSProperties;
};

export const Avatar: React.FC<AvatarProps> = ({ name = '', size = 28, ring, title, style }) => {
  const [bg, fg] = avaColor(name);
  const ringColor = ring === true ? 'var(--accent)' : (typeof ring === 'string' ? ring : null);
  return (
    <div
      title={title || name}
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.4),
        boxShadow: ringColor ? `0 0 0 2px #fff, 0 0 0 4px ${ringColor}` : 'none',
        ...style,
      }}
    >
      {initialsOf(name)}
    </div>
  );
};

export default Avatar;

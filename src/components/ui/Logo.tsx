import * as React from 'react';
import styles from './Logo.module.css';

type LogoProps = { size?: number; showText?: boolean; color?: string };

export const Logo: React.FC<LogoProps> = ({ size = 20, showText = true, color = '#2B5FA4' }) => (
  <div className={styles.wrap}>
    <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill={color} />
      <circle cx="16.5" cy="16.5" r="2.6" fill="#fff" />
    </svg>
    {showText && (
      <span className={styles.text} style={{ fontSize: Math.round(size * 0.95) }}>
        TaskFlow
      </span>
    )}
  </div>
);

export default Logo;

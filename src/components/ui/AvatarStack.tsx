import * as React from 'react';
import { Avatar } from './Avatar';
import styles from './AvatarStack.module.css';

type AvatarStackProps = {
  names?: string[];
  size?: number;
  max?: number;
  extra?: number;
};

export const AvatarStack: React.FC<AvatarStackProps> = ({ names = [], size = 24, max = 4, extra }) => {
  const shown = names.slice(0, max);
  const rest = Math.max(0, (extra ?? names.length) - shown.length);
  const overlap = -Math.round(size * 0.3);

  return (
    <div className={styles.stack}>
      {shown.map((n, i) => (
        <div key={`${n}-${i}`} style={{ marginLeft: i === 0 ? 0 : overlap }}>
          <Avatar name={n} size={size} ring="#fff" />
        </div>
      ))}
      {rest > 0 && (
        <div
          className={styles.rest}
          style={{
            marginLeft: overlap,
            width: size,
            height: size,
            fontSize: Math.round(size * 0.4),
          }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
};

export default AvatarStack;

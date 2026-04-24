import * as React from 'react';
import styles from './Input.module.css';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  hint?: string;
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
};

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  leading,
  trailing,
  wrapperStyle,
  className,
  ...rest
}) => {
  return (
    <label className={styles.wrap} style={wrapperStyle}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={`${styles.field} ${error ? styles.error : ''}`}>
        {leading && <span className={styles.ad}>{leading}</span>}
        <input {...rest} className={`${styles.input} ${className ?? ''}`} />
        {trailing && <span className={styles.ad}>{trailing}</span>}
      </span>
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.errorText}>{error}</span>}
    </label>
  );
};

export default Input;

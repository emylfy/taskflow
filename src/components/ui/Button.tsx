import * as React from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  block?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  block,
  children,
  className,
  ...rest
}) => {
  const cls = [
    styles.btn,
    styles[variant],
    styles[`size-${size}`],
    block ? styles.block : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <button {...rest} className={cls}>
      {leading}
      {children}
      {trailing}
    </button>
  );
};

export default Button;

'use client';

import * as React from 'react';
import styles from './Dropdown.module.css';

type DropdownItem = {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
};

type DropdownProps = {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
};

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={styles.wrap}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={`${styles.menu} ${align === 'left' ? styles.left : styles.right}`}>
          {items.map((it, i) => (
            <button
              key={i}
              className={`${styles.item} ${it.danger ? styles.danger : ''}`}
              onClick={() => {
                it.onClick?.();
                setOpen(false);
              }}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

import * as React from 'react';

type IconProps = {
  size?: number;
  stroke?: string;
  fill?: string;
  sw?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
};

const Icon: React.FC<IconProps> = ({ size = 16, stroke = 'currentColor', fill = 'none', sw = 1.5, style, className, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', flexShrink: 0, ...style }}
    className={className}
  >
    {children}
  </svg>
);

type P = Omit<IconProps, 'children'>;

export const I = {
  Home: (p: P) => (<Icon {...p}><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></Icon>),
  Folder: (p: P) => (<Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>),
  Check: (p: P) => (<Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>),
  CheckCircle: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Icon>),
  Circle: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /></Icon>),
  Bell: (p: P) => (<Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>),
  Search: (p: P) => (<Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>),
  Plus: (p: P) => (<Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>),
  User: (p: P) => (<Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>),
  Users: (p: P) => (<Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M16 4a4 4 0 0 1 0 8" /><path d="M22 21a7 7 0 0 0-5-6.7" /></Icon>),
  Settings: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>),
  Message: (p: P) => (<Icon {...p}><path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6.3A8 8 0 1 1 21 12z" /></Icon>),
  ChevronDown: (p: P) => (<Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>),
  ChevronRight: (p: P) => (<Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>),
  ChevronLeft: (p: P) => (<Icon {...p}><path d="M15 6l-6 6 6 6" /></Icon>),
  ArrowLeft: (p: P) => (<Icon {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>),
  ArrowRight: (p: P) => (<Icon {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Icon>),
  X: (p: P) => (<Icon {...p}><path d="M18 6L6 18M6 6l12 12" /></Icon>),
  Menu: (p: P) => (<Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>),
  Filter: (p: P) => (<Icon {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z" /></Icon>),
  Calendar: (p: P) => (<Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>),
  Clock: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>),
  Tag: (p: P) => (<Icon {...p}><path d="M20.6 13.4L13 21a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7.4a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8z" /><circle cx="8" cy="8" r="1.2" /></Icon>),
  Paperclip: (p: P) => (<Icon {...p}><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" /></Icon>),
  Flag: (p: P) => (<Icon {...p}><path d="M4 21V4M4 4h12l-2 4 2 4H4" /></Icon>),
  Paint: (p: P) => (<Icon {...p}><rect x="3" y="3" width="18" height="6" rx="1" /><path d="M19 9v3a2 2 0 0 1-2 2h-5v4" /><rect x="10" y="18" width="4" height="4" rx="1" /></Icon>),
  More: (p: P) => (<Icon {...p}><circle cx="12" cy="6" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="18" r="1.2" fill="currentColor" /></Icon>),
  MoreH: (p: P) => (<Icon {...p}><circle cx="6" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18" cy="12" r="1.2" fill="currentColor" /></Icon>),
  Link: (p: P) => (<Icon {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>),
  Lock: (p: P) => (<Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>),
  Globe: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>),
  Trash: (p: P) => (<Icon {...p}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></Icon>),
  Archive: (p: P) => (<Icon {...p}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" /></Icon>),
  Eye: (p: P) => (<Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>),
  Image: (p: P) => (<Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5-8 8" /></Icon>),
  File: (p: P) => (<Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></Icon>),
  Kanban: (p: P) => (<Icon {...p}><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></Icon>),
  List: (p: P) => (<Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>),
  Smile: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></Icon>),
  Send: (p: P) => (<Icon {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></Icon>),
  Mail: (p: P) => (<Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>),
  Shield: (p: P) => (<Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Icon>),
  Plug: (p: P) => (<Icon {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" /></Icon>),
  Zap: (p: P) => (<Icon {...p}><path d="M13 2L3 14h8l-1 8 10-12h-8z" /></Icon>),
  Grid: (p: P) => (<Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>),
  Activity: (p: P) => (<Icon {...p}><path d="M22 12h-4l-3 9-6-18-3 9H2" /></Icon>),
  TrendUp: (p: P) => (<Icon {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Icon>),
  CreditCard: (p: P) => (<Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></Icon>),
  Star: (p: P) => (<Icon {...p}><path d="M12 2l3 7 7 .6-5.3 4.6 1.7 6.8L12 17.3 5.6 21l1.7-6.8L2 9.6 9 9z" /></Icon>),
  Rocket: (p: P) => (<Icon {...p}><path d="M14 3l7 7-9 9-4 2 2-4-5-5z" /><path d="M9 15l-3 3" /></Icon>),
  Briefcase: (p: P) => (<Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></Icon>),
  Target: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></Icon>),
  Reply: (p: P) => (<Icon {...p}><path d="M9 17l-5-5 5-5" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></Icon>),
  Hash: (p: P) => (<Icon {...p}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" /></Icon>),
  Upload: (p: P) => (<Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13M7 8l5-5 5 5" /></Icon>),
  History: (p: P) => (<Icon {...p}><path d="M3 3v6h6" /><path d="M3 9a9 9 0 1 1 2 9" /><path d="M12 7v5l3 2" /></Icon>),
  Restore: (p: P) => (<Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Icon>),
  Copy: (p: P) => (<Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>),
  Cursor: (p: P) => (<Icon {...p}><path d="M5 3l14 7-6 2-2 6z" /></Icon>),
  Bold: (p: P) => (<Icon {...p}><path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" /></Icon>),
  Italic: (p: P) => (<Icon {...p}><path d="M19 4h-9M14 20H5M15 4L9 20" /></Icon>),
  ListOl: (p: P) => (<Icon {...p}><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Icon>),
  Compare: (p: P) => (<Icon {...p}><path d="M12 3v18M8 7l-4 5 4 5M16 7l4 5-4 5" /></Icon>),
  Heart: (p: P) => (<Icon {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.7z" /></Icon>),
  Log: (p: P) => (<Icon {...p}><path d="M3 6h18M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M9 10h6M9 14h6M9 18h4" /></Icon>),
  MobileH: (p: P) => (<Icon {...p}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></Icon>),
  Dot: (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor" /></Icon>),
};

export default I;

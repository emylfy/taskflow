import * as React from 'react';

const PROJECT_PALETTE: Record<string, { bg: string; fg: string; glyph: string }> = {
  'Редизайн сайта': { bg: '#E8EEF7', fg: '#2B5FA4', glyph: 'Р' },
  'Запуск мобильного приложения': { bg: '#E4F2E6', fg: '#2E7D3E', glyph: 'З' },
  'Маркетинговая кампания Q2 2026': { bg: '#FBF3DC', fg: '#8A6A12', glyph: 'М' },
  'Документация и обучение': { bg: '#F3E8F0', fg: '#7B3F6B', glyph: 'Д' },
  'Внутренняя платформа': { bg: '#E1EFF1', fg: '#2A6B73', glyph: 'В' },
};

type ProjectIconProps = { name: string; size?: number };

export const ProjectIcon: React.FC<ProjectIconProps> = ({ name, size = 32 }) => {
  const m = PROJECT_PALETTE[name] || { bg: '#EEF0F3', fg: '#5B6670', glyph: (name || '?')[0]?.toUpperCase() ?? '?' };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: m.bg,
        color: m.fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.45),
        flexShrink: 0,
      }}
    >
      {m.glyph}
    </div>
  );
};

export default ProjectIcon;

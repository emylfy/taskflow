// Заглушка загрузки для раздела администрирования (внутри оболочки).
export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 10,
        color: '#8B939C',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="#E2E5E9" strokeWidth="3" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="#2B5FA4" strokeWidth="3" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <span style={{ fontSize: 14 }}>Загрузка…</span>
    </div>
  );
}

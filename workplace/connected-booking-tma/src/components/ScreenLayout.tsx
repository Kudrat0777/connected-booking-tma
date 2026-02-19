import React from 'react';

type Props = {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
};

export const ScreenLayout: React.FC<Props> = ({
  title,
  onBack,
  children,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tgui--hint_color, #8a8a8a)',
              cursor: 'pointer',
              padding: 0,
              fontSize: 20,
            }}
          >
            ←
          </button>
        )}
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
};
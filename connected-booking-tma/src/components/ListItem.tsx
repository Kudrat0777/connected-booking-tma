import React from 'react';

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  after?: React.ReactNode;
  onClick?: () => void;
};

export const ListItem: React.FC<Props> = ({
  title,
  subtitle,
  after,
  onClick,
}) => {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 10,
        margin: 0,
        borderRadius: 12,
        border: 'none',
        background: 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 13, opacity: 0.75 }}>{subtitle}</div>
        )}
      </div>

      {after && (
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          {after}
        </div>
      )}
    </button>
  );
};
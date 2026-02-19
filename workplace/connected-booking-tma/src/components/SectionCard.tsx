import React from 'react';

type Props = {
  header?: string;
  footer?: string;
  children: React.ReactNode;
};

export const SectionCard: React.FC<Props> = ({
  header,
  footer,
  children,
}) => {
  return (
    <div
      style={{
        borderRadius: 16,
        background: 'var(--tgui--bg_color, #101318)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 12,
      }}
    >
      {header && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            opacity: 0.8,
            marginBottom: 8,
          }}
        >
          {header}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.6,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
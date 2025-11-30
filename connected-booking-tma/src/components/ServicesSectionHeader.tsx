import React from 'react';

type Props = {
  sectionHeader: string;
  selectedBehavior?: 'hide' | 'show';
  status?: 'default' | 'disabled' | 'error';
};

export const ServicesSectionHeader: React.FC<Props> = ({
  sectionHeader,
  selectedBehavior = 'hide',
  status = 'default',
}) => {
  // Пока selectedBehavior и status практически не используем,
  // но оставляем их на будущее, чтобы компонент был похож
  // на StoryBookComponent по API.

  const isDisabled = status === 'disabled';

  if (selectedBehavior === 'hide' && !sectionHeader) {
    return null;
  }

  return (
    <div
      style={{
        padding: '8px 12px 4px',
        fontSize: 13,
        fontWeight: 500,
        color:
          status === 'error'
            ? '#ff4b4b'
            : 'rgba(255,255,255,0.72)',
        opacity: isDisabled ? 0.6 : 1,
      }}
    >
      {sectionHeader}
    </div>
  );
};
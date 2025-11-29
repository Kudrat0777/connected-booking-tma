import React from 'react';
import { colors, fontSize, radius, spacing } from '../style/tokens';
import type { Booking } from '../helpers/api';

type Props = {
  status: Booking['status'];
};

export const StatusBadge: React.FC<Props> = ({ status }) => {
  let label = '';
  let bg = '';
  let fg = colors.textPrimary;

  if (status === 'pending') {
    label = 'Ожидает';
    bg = 'rgba(255, 183, 77, 0.18)'; // жёлтый
    fg = colors.warning;
  } else if (status === 'confirmed') {
    label = 'Подтверждена';
    bg = 'rgba(73, 210, 122, 0.18)'; // зелёный
    fg = colors.success;
  } else if (status === 'rejected') {
    label = 'Отклонена';
    bg = 'rgba(255, 75, 75, 0.18)'; // красный
    fg = colors.danger;
  } else {
    label = status;
    bg = 'rgba(255,255,255,0.08)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${spacing.sm}px`,
        minHeight: 20,
        borderRadius: radius.lg,
        background: bg,
        color: fg,
        fontSize: fontSize.caption,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
};
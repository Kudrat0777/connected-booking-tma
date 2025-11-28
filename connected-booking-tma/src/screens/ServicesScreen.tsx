import React from 'react';

type Service = {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
};

type Props = {
  onBack: () => void;
};

const MOCK_SERVICES: Service[] = [
  { id: 1, name: 'Маникюр классический', durationMinutes: 60, price: 800 },
  { id: 2, name: 'Маникюр + покрытие гель‑лак', durationMinutes: 90, price: 1200 },
  { id: 3, name: 'Коррекция бровей', durationMinutes: 30, price: 500 },
];

export const ServicesScreen: React.FC<Props> = ({ onBack }) => {
  return (
    <div style={{ padding: 20 }}>
      <h1>Услуги</h1>

      <ul>
        {MOCK_SERVICES.map((s) => (
          <li key={s.id}>
            <strong>{s.name}</strong> — {s.durationMinutes} мин, {s.price} ₽
          </li>
        ))}
      </ul>

      <button
        onClick={onBack}
        style={{
          marginTop: 12,
          padding: '8px 16px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Назад
      </button>
    </div>
  );
};
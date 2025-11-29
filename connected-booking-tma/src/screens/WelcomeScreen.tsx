import React, { useState } from 'react';
import {
  Placeholder,
  Button,
  Text,
} from '@telegram-apps/telegram-ui';
import '../css/WelcomeScreen.css';

type Props = {
  onContinue: () => void;
  onOpenMyBookings?: () => void;
};

type Slide = {
  emoji: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    emoji: '📅',
    title: 'Лучшая система бронирования',
    description:
      'Привет! Это удобный сервис записи к мастерам. Выбирай услугу и время — всё остальное мы сделаем сами.',
  },
  {
    emoji: '💬',
    title: 'Все уведомления в Telegram',
    description:
      'Подтверждение записи, напоминания и изменения — сразу в твоём любимом мессенджере.',
  },
  {
    emoji: '⭐️',
    title: 'Любимые мастера под рукой',
    description:
      'Сохраняй мастеров, оставляй отзывы и возвращайся к тем, кто тебе понравился.',
  },
];

export const WelcomeScreen: React.FC<Props> = ({
  onContinue,
  onOpenMyBookings,
}) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const nextSlide = () => setIndex((prev) => (prev + 1) % SLIDES.length);
  const goTo = (i: number) => setIndex(i);

  return (
    <div className="welcome-root">
      <div className="HIJtihMA8FHczS02iWF5 welcome-container">
        <Placeholder
          header=""      // текст рисуем сами
          description=""
          action={
            <div className="welcome-actions">
              <Button
                size="l"
                mode="filled"
                stretched
                onClick={onContinue}
              >
                Записаться
              </Button>

              {onOpenMyBookings && (
                <Button
                  size="l"
                  mode="plain"
                  stretched
                  onClick={onOpenMyBookings}
                  className="welcome-secondary-button"
                >
                  Мои записи
                </Button>
              )}
            </div>
          }
        >
          <div
            className="welcome-sticker-wrapper"
            onClick={nextSlide}
            style={{ cursor: 'pointer' }}
          >
            {slide.emoji}
          </div>

          <div className="welcome-text-block">
            <Text weight="1">{slide.title}</Text>
          </div>
          <div className="welcome-text-block">
            <Text weight="3">{slide.description}</Text>
          </div>

          <div className="welcome-pagination">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={
                  'welcome-pagination-dot' +
                  (i === index ? ' welcome-pagination-dot_active' : '')
                }
                onClick={() => goTo(i)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </Placeholder>
      </div>
    </div>
  );
};
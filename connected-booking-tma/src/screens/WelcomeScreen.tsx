import React, { useEffect, useRef, useState } from 'react';
import {
  Placeholder,
  Button,
  Text,
} from '@telegram-apps/telegram-ui';
import lottie, { AnimationItem } from 'lottie-web';
import '../css/WelcomeScreen.css';

type Props = {
  onContinue: () => void;
  onOpenMyBookings?: () => void;
};

type Slide = {
  title: string;
  description: string;
  lottieSrc: string;    // путь к Lottie JSON (распакованный .tgs)
};

const SLIDES: Slide[] = [
  {
    lottieSrc: '/stickers/booking.json',
    title: 'Лучшая система бронирования',
    description:
      'Привет! Это удобный сервис записи к мастерам. Выбирай услугу и время — всё остальное мы сделаем сами.',
  },
  {
    lottieSrc: '/stickers/notifications.json',
    title: 'Все уведомления в Telegram',
    description:
      'Подтверждение записи, напоминания и изменения — сразу в твоём любимом мессенджере.',
  },
  {
    lottieSrc: '/stickers/favorites.json',
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

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);

  // Поднимаем / обновляем Lottie-анимацию при смене слайда
  useEffect(() => {
    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.destroy();
      lottieInstanceRef.current = null;
    }

    if (!slide.lottieSrc || !lottieContainerRef.current) {
      return;
    }

    const anim = lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: slide.lottieSrc,
    });

    lottieInstanceRef.current = anim;

    return () => {
      anim.destroy();
    };
  }, [slide.lottieSrc]);

  const nextSlide = () => setIndex((prev) => (prev + 1) % SLIDES.length);
  const goTo = (i: number) => setIndex(i);

  return (
    <div className="welcome-root">
      <div className="HIJtihMA8FHczS02iWF5 welcome-container">
        <Placeholder
          header=""
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
          {/* Lottie-стикер. Клик по нему листает слайды */}
          <div
            className="welcome-sticker-wrapper"
            onClick={nextSlide}
            style={{ cursor: 'pointer' }}
          >
            <div
              ref={lottieContainerRef}
              style={{ width: 150, height: 150 }}
            />
          </div>

          {/* Заголовок и описание */}
          <div className="welcome-text-block">
            <Text weight="1">{slide.title}</Text>
          </div>
          <div className="welcome-text-block">
            <Text weight="3">{slide.description}</Text>
          </div>

          {/* Пейджер-точки */}
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
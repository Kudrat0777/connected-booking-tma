import React, {
  useEffect,
  useRef,
  useState,
  PointerEvent,
  TouchEvent,
  CSSProperties,
} from 'react';
import {
  Placeholder,
  Button,
  Title,
  Text,
} from '@telegram-apps/telegram-ui';
import lottie, { AnimationItem } from 'lottie-web';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import '../css/WelcomeScreen.css';

type Props = {
  onContinue: () => void;
  onOpenMyBookings?: () => void;
};

type Slide = {
  title: string;
  description: string;
  lottieSrc: string;
};

const SLIDES: Slide[] = [
  {
    lottieSrc: '/stickers/booking.json',
    title: 'Лучшая система бронирования',
    description:
      'Выбирай услугу и время — всё остальное мы сделаем сами.',
  },
  {
    lottieSrc: '/stickers/notifications.json',
    title: 'Все уведомления в Telegram',
    description:
      'Подтверждение записи, напоминания и изменения — сразу в мессенджере.',
  },
  {
    lottieSrc: '/stickers/favorites.json',
    title: 'Любимые мастера под рукой',
    description:
      'Сохраняй мастеров, оставляй отзывы и возвращайся к лучшим.',
  },
  {
    lottieSrc: '/stickers/duck_wallet.json',
    title: 'Современная оплата',
    description:
      'Оплачивайте услуги картами, TON или Stars. Быстро и безопасно.',
  },
];

const SWIPE_THRESHOLD = 40;
const AUTO_SLIDE_INTERVAL = 5000;

export const WelcomeScreen: React.FC<Props> = ({
  onContinue,
  onOpenMyBookings,
}) => {
  const webApp = useTelegramWebApp();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);

  const swipeStartXRef = useRef<number | null>(null);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const autoSlideTimerRef = useRef<number | null>(null);

  // Функция для тактильного отклика
  const triggerHaptic = () => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.selectionChanged();
    }
  };

  // Lottie
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

  const changeSlide = (newIndex: number) => {
    setIndex(newIndex);
    triggerHaptic();
  };

  const nextSlide = () => changeSlide((index + 1) % SLIDES.length);

  const prevSlide = () =>
    changeSlide(index === 0 ? SLIDES.length - 1 : index - 1);

  const goTo = (i: number) => {
    if (i !== index) changeSlide(i);
  };

  // --- Авто-слайдер ---
  const resetAutoSlideTimer = () => {
    if (autoSlideTimerRef.current != null) {
      window.clearInterval(autoSlideTimerRef.current);
    }
    autoSlideTimerRef.current = window.setInterval(() => {
      // Не вызываем тактильный отклик на авто-переключении, чтобы не раздражать
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_SLIDE_INTERVAL);
  };

  useEffect(() => {
    resetAutoSlideTimer();
    return () => {
      if (autoSlideTimerRef.current != null) {
        window.clearInterval(autoSlideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    resetAutoSlideTimer();
  }, [index]);

  // --- SWIPE Logic ---
  const handleStart = (x: number) => {
    if (isAnimating) return;
    swipeStartXRef.current = x;
    setSwipeDeltaX(0);
  };

  const handleMove = (x: number) => {
    if (swipeStartXRef.current == null || isAnimating) return;
    const dx = x - swipeStartXRef.current;
    setSwipeDeltaX(dx);
  };

  const handleEnd = () => {
    if (swipeStartXRef.current == null) return;
    const dx = swipeDeltaX;
    swipeStartXRef.current = null;

    if (isAnimating) return;

    if (dx > SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(100); // Визуальный отлет вправо
      setTimeout(() => {
        setSwipeDeltaX(0);
        prevSlide();
        setIsAnimating(false);
      }, 200);
    } else if (dx < -SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(-100); // Визуальный отлет влево
      setTimeout(() => {
        setSwipeDeltaX(0);
        nextSlide();
        setIsAnimating(false);
      }, 200);
    } else {
      // Возврат
      setIsAnimating(true);
      setSwipeDeltaX(0);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  // Pointer events
  const onPointerDown = (e: PointerEvent) => handleStart(e.clientX);
  const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
  const onPointerUp = () => handleEnd();
  const onPointerCancel = () => handleEnd();

  // Touch events (fallback)
  const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  const slideAreaStyle: CSSProperties = {
    transform: `translateX(${swipeDeltaX}px)`,
    opacity: isAnimating ? 0.5 : 1, // Добавляем небольшую прозрачность при смене
    transition: isAnimating ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s' : 'none',
  };

  return (
    <div className="welcome-root">
      <Placeholder
        className="welcome-placeholder"
        header="" // Используем кастомный рендер внутри для анимации
        description=""
      >
        {/* Контейнер свайпа */}
        <div
          className="welcome-slide-area"
          style={slideAreaStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="welcome-sticker-wrapper">
            <div ref={lottieContainerRef} className="welcome-lottie" />
          </div>

          <div className="welcome-text-content">
            <Title level="1" weight="1" className="welcome-title">
              {slide.title}
            </Title>
            <Text className="welcome-description">
              {slide.description}
            </Text>
          </div>
        </div>

        {/* Пагинация */}
        <div className="welcome-pagination">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`welcome-pagination-dot ${i === index ? 'welcome-pagination-dot_active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* Кнопки действий внизу */}
        <div className="welcome-actions">
          <Button
            size="l"
            mode="filled"
            stretched
            onClick={() => {
              triggerHaptic();
              onContinue();
            }}
          >
            Записаться
          </Button>

          {onOpenMyBookings && (
            <Button
              size="l"
              mode="bezeled" // 'bezeled' или 'plain' выглядят нативнее как второстепенные
              stretched
              onClick={() => {
                triggerHaptic();
                onOpenMyBookings();
              }}
              className="welcome-secondary-button"
            >
              Мои записи
            </Button>
          )}
        </div>
      </Placeholder>
    </div>
  );
};
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
  lottieSrc: string;
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

const SWIPE_THRESHOLD = 40;
const AUTO_SLIDE_INTERVAL = 4000;

export const WelcomeScreen: React.FC<Props> = ({
  onContinue,
  onOpenMyBookings,
}) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);

  const swipeStartXRef = useRef<number | null>(null);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const autoSlideTimerRef = useRef<number | null>(null);

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

  const nextSlide = () =>
    setIndex((prev) => (prev + 1) % SLIDES.length);

  const prevSlide = () =>
    setIndex((prev) =>
      prev === 0 ? SLIDES.length - 1 : prev - 1,
    );

  const goTo = (i: number) => setIndex(i);

  // --- Авто-слайдер ---
  const resetAutoSlideTimer = () => {
    if (autoSlideTimerRef.current != null) {
      window.clearInterval(autoSlideTimerRef.current);
      autoSlideTimerRef.current = null;
    }
    autoSlideTimerRef.current = window.setInterval(
      () => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
      },
      AUTO_SLIDE_INTERVAL,
    );
  };

  useEffect(() => {
    resetAutoSlideTimer();

    return () => {
      if (autoSlideTimerRef.current != null) {
        window.clearInterval(autoSlideTimerRef.current);
        autoSlideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    resetAutoSlideTimer();
  }, [index]);

  // --- SWIPE: pointer ---
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    swipeStartXRef.current = e.clientX;
    setSwipeDeltaX(0);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current == null || isAnimating) return;
    const dx = e.clientX - swipeStartXRef.current;
    setSwipeDeltaX(dx);
  };

  const finishSwipe = (dx: number) => {
    if (isAnimating) return;

    if (dx > SWIPE_THRESHOLD) {
      // вправо → предыдущий
      setIsAnimating(true);
      setSwipeDeltaX(80); // небольшой финальный сдвиг
      setTimeout(() => {
        setSwipeDeltaX(0);
        prevSlide();
        setIsAnimating(false);
      }, 150);
    } else if (dx < -SWIPE_THRESHOLD) {
      // влево → следующий
      setIsAnimating(true);
      setSwipeDeltaX(-80);
      setTimeout(() => {
        setSwipeDeltaX(0);
        nextSlide();
        setIsAnimating(false);
      }, 150);
    } else {
      // возвращаемся в центр
      setIsAnimating(true);
      setSwipeDeltaX(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePointerUp = () => {
    if (swipeStartXRef.current == null) return;
    const dx = swipeDeltaX;
    swipeStartXRef.current = null;
    finishSwipe(dx);
  };

  const handlePointerCancel = () => {
    if (swipeStartXRef.current == null) return;
    swipeStartXRef.current = null;
    finishSwipe(swipeDeltaX);
  };

  // --- SWIPE: touch ---
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    const touch = e.touches[0];
    swipeStartXRef.current = touch.clientX;
    setSwipeDeltaX(0);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current == null || isAnimating) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartXRef.current;
    setSwipeDeltaX(dx);
  };

  const handleTouchEnd = () => {
    if (swipeStartXRef.current == null) return;
    const dx = swipeDeltaX;
    swipeStartXRef.current = null;
    finishSwipe(dx);
  };

  // стиль для плавного движения слайда
  const slideAreaStyle: CSSProperties = {
    transform: `translateX(${swipeDeltaX}px)`,
    transition: isAnimating ? 'transform 0.15s ease-out' : 'none',
  };

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
          <div
            className="welcome-slide-area"
            style={slideAreaStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="welcome-sticker-wrapper"
              style={{ cursor: 'pointer' }}
              onClick={nextSlide}
            >
              <div
                ref={lottieContainerRef}
                style={{ width: 180, height: 180 }}
              />
            </div>

            <div className="welcome-text-block">
              <Text weight="1">{slide.title}</Text>
            </div>
            <div className="welcome-text-block">
              <Text weight="3">{slide.description}</Text>
            </div>
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
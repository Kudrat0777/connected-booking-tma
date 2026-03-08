import React, {
  useEffect,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { Button, Title, Text } from '@telegram-apps/telegram-ui';
import lottie, { AnimationItem } from 'lottie-web';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import '../css/WelcomeScreen.css';

type Props = {
  onContinue: () => void;
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
    description: 'Выбирай услугу и время — всё остальное мы сделаем сами.',
  },
  {
    lottieSrc: '/stickers/notifications.json',
    title: 'Все уведомления в Telegram',
    description: 'Подтверждение записи, напоминания и изменения — сразу в мессенджере.',
  },
  {
    lottieSrc: '/stickers/favorites.json',
    title: 'Любимые мастера под рукой',
    description: 'Сохраняй мастеров, оставляй отзывы и возвращайся к лучшим.',
  },
  {
    lottieSrc: '/stickers/duck_wallet.json',
    title: 'Современная оплата',
    description: 'Оплачивайте услуги картами, TON или Stars. Быстро и безопасно.',
  },
];

const SWIPE_THRESHOLD = 40;
const AUTO_SLIDE_INTERVAL = 4000;

export const WelcomeScreen: React.FC<Props> = ({ onContinue }) => {
  const webApp = useTelegramWebApp();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);

  const swipeStartXRef = useRef<number | null>(null);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const autoSlideTimerRef = useRef<number | null>(null);

  const triggerHaptic = () => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.selectionChanged();
    }
  };

  useEffect(() => {
    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.destroy();
      lottieInstanceRef.current = null;
    }

    if (!slide.lottieSrc || !lottieContainerRef.current) return;

    const anim = lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: slide.lottieSrc,
    });

    lottieInstanceRef.current = anim;
    return () => anim.destroy();
  }, [slide.lottieSrc]);

  const changeSlide = (newIndex: number) => {
    setIndex(newIndex);
    triggerHaptic();
  };

  const nextSlide = () => changeSlide((index + 1) % SLIDES.length);
  const prevSlide = () => changeSlide(index === 0 ? SLIDES.length - 1 : index - 1);

  const resetAutoSlideTimer = () => {
    if (autoSlideTimerRef.current != null) clearInterval(autoSlideTimerRef.current);
    autoSlideTimerRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_SLIDE_INTERVAL);
  };

  useEffect(() => {
    resetAutoSlideTimer();
    return () => {
      if (autoSlideTimerRef.current != null) clearInterval(autoSlideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    resetAutoSlideTimer();
  }, [index]);

  const handleStart = (x: number) => {
    if (isAnimating) return;
    swipeStartXRef.current = x;
    setSwipeDeltaX(0);
  };

  const handleMove = (x: number) => {
    if (swipeStartXRef.current == null || isAnimating) return;
    setSwipeDeltaX(x - swipeStartXRef.current);
  };

  const handleEnd = () => {
    if (swipeStartXRef.current == null || isAnimating) return;
    const dx = swipeDeltaX;
    swipeStartXRef.current = null;

    if (dx > SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(window.innerWidth);
      setTimeout(() => {
        setSwipeDeltaX(0);
        prevSlide();
        setIsAnimating(false);
      }, 250);
    } else if (dx < -SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(-window.innerWidth);
      setTimeout(() => {
        setSwipeDeltaX(0);
        nextSlide();
        setIsAnimating(false);
      }, 250);
    } else {
      setIsAnimating(true);
      setSwipeDeltaX(0);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  return (
    <div className="welcome-root">
      {/* Главная контентная область (свайпается) */}
      <div
        className={`welcome-slide-area ${isAnimating ? 'animating' : ''}`}
        style={{ transform: `translateX(${swipeDeltaX}px)` }}
        onPointerDown={(e: ReactPointerEvent) => handleStart(e.clientX)}
        onPointerMove={(e: ReactPointerEvent) => handleMove(e.clientX)}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        onTouchStart={(e: ReactTouchEvent) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e: ReactTouchEvent) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div className="welcome-lottie-container" ref={lottieContainerRef} />

        <Title weight="1" className="welcome-title">
          {slide.title}
        </Title>

        <Text className="welcome-description">
          {slide.description}
        </Text>
      </div>

      {/* Пагинация (точки) */}
      <div className="welcome-pagination">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`welcome-dot ${i === index ? 'active' : ''}`}
            onClick={() => { if (i !== index) changeSlide(i); }}
          />
        ))}
      </div>

      {/* Кнопка действия (зафиксирована внизу) */}
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
          Войти как клиент
        </Button>
      </div>
    </div>
  );
};
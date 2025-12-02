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
  onStart: () => void;
  onLogin?: () => void;
};

type Slide = {
  title: string;
  description: string;
  lottieSrc: string;
};

const SLIDES: Slide[] = [
  {
    lottieSrc: '/stickers/hairdresser.json', // Нужно будет добавить этот файл или использовать booking.json
    title: 'Управление записями',
    description:
      'Забудьте о бумажных блокнотах. Все ваши записи теперь в удобном календаре.',
  },
  {
    lottieSrc: '/stickers/notifications.json',
    title: 'Связь с клиентами',
    description:
      'Мы напомним клиентам о визите и соберем отзывы после услуги.',
  },
  {
    lottieSrc: '/stickers/duck_wallet.json',
    title: 'Гибкий график',
    description:
      'Настраивайте рабочие часы, перерывы и выходные в пару касаний.',
  },
];

const SWIPE_THRESHOLD = 40;
const AUTO_SLIDE_INTERVAL = 5000;

export const MasterWelcomeScreen: React.FC<Props> = ({
  onStart,
  onLogin,
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

  const triggerHaptic = () => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.selectionChanged();
    }
  };

  // --- LOTTIE SETUP ---
  useEffect(() => {
    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.destroy();
      lottieInstanceRef.current = null;
    }
    if (!slide.lottieSrc || !lottieContainerRef.current) return;

    const path = slide.lottieSrc;

    try {
        const anim = lottie.loadAnimation({
          container: lottieContainerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: path,
        });
        lottieInstanceRef.current = anim;
    } catch(e) { console.error(e) }

    return () => anim?.destroy();
  }, [slide.lottieSrc]);

  const changeSlide = (newIndex: number) => {
    setIndex(newIndex);
    triggerHaptic();
  };
  const nextSlide = () => changeSlide((index + 1) % SLIDES.length);
  const prevSlide = () => changeSlide(index === 0 ? SLIDES.length - 1 : index - 1);
  const goTo = (i: number) => { if (i !== index) changeSlide(i); };

  useEffect(() => {
    const resetTimer = () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current);
      autoSlideTimerRef.current = window.setInterval(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
      }, AUTO_SLIDE_INTERVAL);
    };
    resetTimer();
    return () => { if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current); };
  }, [index]);

  // --- SWIPE HANDLERS ---
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
    if (swipeStartXRef.current == null) return;
    const dx = swipeDeltaX;
    swipeStartXRef.current = null;
    if (isAnimating) return;

    if (dx > SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(100);
      setTimeout(() => { setSwipeDeltaX(0); prevSlide(); setIsAnimating(false); }, 200);
    } else if (dx < -SWIPE_THRESHOLD) {
      setIsAnimating(true);
      setSwipeDeltaX(-100);
      setTimeout(() => { setSwipeDeltaX(0); nextSlide(); setIsAnimating(false); }, 200);
    } else {
      setIsAnimating(true);
      setSwipeDeltaX(0);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  const slideAreaStyle: CSSProperties = {
    transform: `translateX(${swipeDeltaX}px)`,
    opacity: isAnimating ? 0.5 : 1,
    transition: isAnimating ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s' : 'none',
  };

  return (
    <div className="welcome-root">
      <Placeholder className="welcome-placeholder">
        {/* SLIDE AREA */}
        <div
          className="welcome-slide-area"
          style={slideAreaStyle}
          onPointerDown={(e) => handleStart(e.clientX)}
          onPointerMove={(e) => handleMove(e.clientX)}
          onPointerUp={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
        >
          <div className="welcome-sticker-wrapper">
            <div ref={lottieContainerRef} className="welcome-lottie" />
          </div>
          <div className="welcome-text-content">
            <Title level="1" weight="1" className="welcome-title">{slide.title}</Title>
            <Text className="welcome-description">{slide.description}</Text>
          </div>
        </div>

        {/* DOTS */}
        <div className="welcome-pagination">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`welcome-pagination-dot ${i === index ? 'welcome-pagination-dot_active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* ACTIONS */}
        <div className="welcome-actions">
          <Button size="l" mode="filled" stretched onClick={onStart}>
            Стать мастером
          </Button>
          <Button size="l" mode="bezeled" stretched onClick={onLogin}>
            У меня есть аккаунт
          </Button>
        </div>
      </Placeholder>
    </div>
  );
};
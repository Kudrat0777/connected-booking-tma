import React, {
  useEffect,
  useRef,
  useState,
  CSSProperties,
} from 'react';
import {
  Button,
  Title,
  Text,
} from '@telegram-apps/telegram-ui';
import lottie, { AnimationItem } from 'lottie-web';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

type Props = {
  onStart: () => void;
  onLogin?: () => void;
  onRegister: () => void;
};

type Slide = {
  title: string;
  description: string;
  lottieSrc: string;
};

const SWIPE_THRESHOLD = 40;
const AUTO_SLIDE_INTERVAL = 5000;

export const MasterWelcomeScreen: React.FC<Props> = ({
  onStart,
  onLogin,
}) => {
  const { t } = useLanguage();

  const SLIDES: Slide[] = [
    {
      lottieSrc: '/stickers/duck_social_out.json',
      title: t('m_slide1_title'),
      description: t('m_slide1_desc'),
    },
    {
      lottieSrc: '/stickers/duck_wallet.json',
      title: t('m_slide2_title'),
      description: t('m_slide2_desc'),
    },
    {
      lottieSrc: '/stickers/duck_analitic.json',
      title: t('m_slide3_title'),
      description: t('m_slide3_desc'),
    },
    {
      lottieSrc: '/stickers/duck_meteor_out.json',
      title: t('m_slide4_title'),
      description: t('m_slide4_desc'),
    },
  ];

  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoSlideTimerRef = useRef<number | null>(null);

  const tg = (window as any).Telegram?.WebApp;

  const triggerHaptic = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  useEffect(() => {
    if (tg) {
        tg.BackButton.hide();
        tg.expand();
    }
  }, [tg]);

  // --- LOTTIE SETUP ---
  useEffect(() => {
    const cleanup = () => {
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
    };

    cleanup();

    if (!slide.lottieSrc || !lottieContainerRef.current) return;

    try {
        const anim = lottie.loadAnimation({
          container: lottieContainerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: slide.lottieSrc,
        });
        lottieInstanceRef.current = anim;
    } catch(e) {
      console.error("Lottie load error:", e);
    }

    return cleanup;
  }, [slide.lottieSrc]);

  // --- SLIDER LOGIC ---
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
  }, [index, SLIDES.length]);

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
    opacity: isAnimating ? 0 : 1,
    transition: isAnimating ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease' : 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    userSelect: 'none',
    WebkitUserSelect: 'none'
  };

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--tg-theme-bg-color)',
        color: 'var(--tg-theme-text-color)',
        overflow: 'hidden'
    }}>
      {/* СВАЙП-ЗОНА С АНИМАЦИЕЙ И ТЕКСТОМ */}
      <div
        style={slideAreaStyle}
        onPointerDown={(e) => handleStart(e.clientX)}
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerUp={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
            ref={lottieContainerRef}
            style={{ width: 260, height: 260, marginBottom: 24 }}
        />

        <Title level="1" weight="1" style={{ textAlign: 'center', marginBottom: 12, fontSize: 28 }}>
            {slide.title}
        </Title>

        <Text style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', fontSize: 16, lineHeight: '1.5', padding: '0 24px' }}>
            {slide.description}
        </Text>
      </div>

      {/* ПАГИНАЦИЯ (Точки) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {SLIDES.map((_, i) => {
            const isActive = i === index;
            return (
              <div
                key={i}
                onClick={() => goTo(i)}
                style={{
                    width: isActive ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isActive ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
                    opacity: isActive ? 1 : 0.3,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
              />
            );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, marginTop: 32 }}>
       <Button size="l" stretched mode="filled" onClick={onLogin}>
          Войти
       </Button>
       <Button size="l" stretched mode="bezeled" onClick={onRegister}>
          Стать партнёром (Регистрация)
       </Button>
    </div>
    </div>
  );
};
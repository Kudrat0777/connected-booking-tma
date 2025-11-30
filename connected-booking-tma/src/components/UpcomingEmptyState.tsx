import React, { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { Button } from '@telegram-apps/telegram-ui';

type Props = {
  title?: string;
  subtitle?: string;
  stickerPath?: string;
  onGoToServices?: () => void;
};

export const UpcomingEmptyState: React.FC<Props> = ({
  title = 'Нет предстоящих записей',
  subtitle = 'Как только вы запишетесь к мастеру, запись появится здесь.',
  stickerPath = '/stickers/skeleton.json',
  onGoToServices,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: stickerPath,
    });

    instanceRef.current = anim;

    return () => {
      anim.destroy();
    };
  }, [stickerPath]);

  return (
    <div
      style={{
        padding: '32px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: 160, height: 160 }}
        aria-hidden="true"
      />

      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          marginTop: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 260,
        }}
      >
        {subtitle}
      </div>

      {onGoToServices && (
        <div style={{ marginTop: 8, width: '100%', maxWidth: 260 }}>
          <Button
            mode="filled"
            size="m"
            stretched
            onClick={onGoToServices}
          >
            Записаться
          </Button>
        </div>
      )}
    </div>
  );
};
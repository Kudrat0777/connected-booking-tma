import React, { useState, useEffect, useRef } from 'react';
import { List, Section, Input, Text, Title } from '@telegram-apps/telegram-ui';
import lottie from 'lottie-web';
import { loginMasterWithPhone } from '../helpers/api';

// Компонент для анимированного стикера
const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      return () => anim.destroy();
    } catch (e) { console.error(e); }
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Переход в личный кабинет мастера
};

export const MasterLoginScreen: React.FC<Props> = ({ telegramId, onBack, onComplete }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Используем Ref для актуальных значений в замыкании нативной кнопки
  const phoneRef = useRef(phone);
  const passwordRef = useRef(password);

  useEffect(() => {
      phoneRef.current = phone;
      passwordRef.current = password;
  }, [phone, password]);

  // Настраиваем нативные кнопки Telegram
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.onClick(onBack);
    tg.BackButton.show();

    const handleMainClick = async () => {
        if (loading) return;

        const currentPhone = phoneRef.current;
        const currentPassword = passwordRef.current;

        if (!currentPhone.trim() || !currentPassword.trim()) {
            setError('Введите телефон и пароль');
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            return;
        }

        setLoading(true);
        setError(null);
        tg.MainButton.showProgress();
        tg.MainButton.disable();

        try {
            await loginMasterWithPhone(currentPhone, currentPassword, telegramId);
            localStorage.setItem('is_master_logged_in', 'true');

            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            tg.MainButton.hideProgress();

            onComplete();
        } catch (e: any) {
            setError(e.message || 'Ошибка входа. Проверьте данные.');
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');

            tg.MainButton.hideProgress();
            tg.MainButton.enable();
            setLoading(false);
        }
    };

    tg.MainButton.setParams({
        text: 'ВОЙТИ',
        color: tg.themeParams?.button_color || '#3390ec',
        text_color: tg.themeParams?.button_text_color || '#ffffff',
        is_active: true,
        is_visible: true
    });
    tg.MainButton.onClick(handleMainClick);

    return () => {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
        tg.MainButton.offClick(handleMainClick);
        tg.MainButton.hide();
    };
  }, [onBack, onComplete, telegramId, loading]);

  const triggerHaptic = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  return (
    <div style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh',
        paddingBottom: 40
    }}>

      {/* ШАПКА ЭКРАНА С АНИМАЦИЕЙ */}
      <div style={{ padding: '40px 20px 24px', textAlign: 'center' }}>

         <LottieIcon src="/stickers/duck_SECURITY.json" size={140} />

         <Title level="1" weight="1" style={{ marginBottom: 8, color: 'var(--tg-theme-text-color)' }}>
             Вход для мастера
         </Title>
         <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, lineHeight: '1.4' }}>
             Введите номер телефона и пароль, выданные вам администратором сервиса.
         </Text>
      </div>

      {/* ФОРМА ВВОДА */}
      <List style={{ padding: '0 16px' }}>
        <Section>
          <Input
            header="Номер телефона"
            placeholder="+998 90 000 00 00"
            value={phone}
            onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
            }}
            onFocus={triggerHaptic}
            type="tel"
          />
          <Input
            header="Пароль"
            placeholder="Ваш пароль"
            type="password"
            value={password}
            onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
            }}
            onFocus={triggerHaptic}
          />
        </Section>
      </List>

      {/* ВЫВОД ОШИБКИ */}
      {error && (
        <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text style={{ color: 'var(--tg-theme-destructive-text-color)', fontWeight: 500, fontSize: 14 }}>
              {error}
            </Text>
        </div>
      )}
    </div>
  );
};
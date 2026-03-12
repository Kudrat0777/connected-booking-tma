import React, { useEffect, useState, useRef } from 'react';
import {
  List,
  Section,
  Cell,
  Spinner,
  Title,
  Text,
  LargeTitle,
  Placeholder
} from '@telegram-apps/telegram-ui';
import { Icon28StatisticsOutline, Icon28UserOutline } from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasterAnalytics, AnalyticsData } from '../helpers/api';

// --- Компонент для Lottie анимации ---
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
};

export const MasterAnalyticsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Настройка нативной кнопки "Назад"
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.BackButton.onClick(onBack);
      tg.BackButton.show();
    }
    return () => {
      if (tg) {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
      }
    };
  }, [onBack]);

  useEffect(() => {
    fetchMasterAnalytics(telegramId)
      .then((res) => {
          setData(res);
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      })
      .catch((e) => {
          console.error(e);
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      })
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Определяем, пустая ли статистика (нет записей вообще)
  const isEmpty = !loading && data && data.total_bookings === 0;

  // Компонент для карточки с деньгами (Apple Wallet style)
  const StatCard = ({ title, value, isGreen }: { title: string, value: string, isGreen?: boolean }) => (
    <div style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        borderRadius: 16,
        padding: '16px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden'
    }}>
      <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 13, marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
      </Text>
      <Title level="2" weight="1" style={{ color: isGreen ? '#34C759' : 'var(--tg-theme-text-color)', fontSize: 22 }}>
          {value}
      </Title>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40 }}>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
           <Spinner size="l"/>
        </div>
      )}

      {/* Если данных нет (пустой аккаунт) */}
      {isEmpty && (
        <div style={{ paddingTop: 40 }}>
            <Placeholder
               header="Статистика пуста"
               description="Здесь будут отображаться ваши доходы и активность, как только появятся первые записи."
            >
               <LottieIcon src="/stickers/duck_analitic.json" size={140} />
            </Placeholder>
        </div>
      )}

      {/* Если данные есть */}
      {!loading && !isEmpty && data && (
        <>
          {/* ГЛАВНЫЙ БАЛАНС (МЕСЯЦ) */}
          <div style={{ padding: '40px 20px 24px', textAlign: 'center' }}>
             <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, marginBottom: 8, display: 'block' }}>
                 Доход за этот месяц
             </Text>
             <LargeTitle weight="1" style={{ fontSize: 40, color: 'var(--tg-theme-text-color)' }}>
                 {data.revenue_month.toLocaleString('ru-RU')} UZS
             </LargeTitle>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* КАРТОЧКИ ДЕНЬ / НЕДЕЛЯ */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
               <StatCard
                  title="Сегодня"
                  value={data.revenue_today > 0 ? `+${data.revenue_today.toLocaleString('ru-RU')} UZS` : '0 UZS'}
                  isGreen={data.revenue_today > 0}
               />
               <StatCard
                  title="Эта неделя"
                  value={data.revenue_week > 0 ? `+${data.revenue_week.toLocaleString('ru-RU')} UZS` : '0 UZS'}
                  isGreen={data.revenue_week > 0}
               />
            </div>

            <List>
               {/* АКТИВНОСТЬ */}
               <Section header="Активность">
                  <Cell
                     before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28StatisticsOutline width={24} height={24} style={{ color: '#007AFF'}} /></div>}
                     after={<span style={{ fontWeight: 600, fontSize: 16 }}>{data.total_bookings}</span>}
                  >
                     Выполнено записей
                  </Cell>
                  <Cell
                     before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28UserOutline width={24} height={24} style={{ color: '#FF9500'}} /></div>}
                     after={<span style={{ fontWeight: 600, fontSize: 16 }}>{data.unique_clients}</span>}
                  >
                     Постоянных клиентов
                  </Cell>
               </Section>

               {/* ТОП УСЛУГ */}
               {data.top_services.length > 0 && (
                 <Section header="Топ услуг">
                   {data.top_services.map((s, i) => (
                     <Cell
                       key={i}
                       after={<span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>{s.revenue.toLocaleString('ru-RU')} UZS</span>}
                       description={`${s.count} записей`}
                     >
                       <span style={{ fontWeight: 500 }}>{i + 1}. {s.slot__service__name}</span>
                     </Cell>
                   ))}
                 </Section>
               )}
            </List>
          </div>
        </>
      )}
    </div>
  );
};
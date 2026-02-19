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
import { Icon28StatisticsOutline, Icon24UserOutline } from '@vkontakte/icons';
import lottie from 'lottie-web';

import { ScreenLayout } from '../components/ScreenLayout';
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

  useEffect(() => {
    fetchMasterAnalytics(telegramId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Определяем, пустая ли статистика (нет записей вообще)
  const isEmpty = !loading && data && data.total_bookings === 0;

  // Компонент для карточки с деньгами
  const StatCard = ({ title, value, subtitle }: { title: string, value: string, subtitle?: string }) => (
    <div style={{
        background: 'var(--tgui--secondary_bg_color)',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <Text style={{ color: 'var(--tgui--hint_color)', fontSize: 13, marginBottom: 4 }}>{title}</Text>
      <Title level="2" weight="2" style={{ color: 'var(--tgui--text_color)' }}>{value}</Title>
      {subtitle && <Text style={{ fontSize: 11, color: 'green' }}>{subtitle}</Text>}
    </div>
  );

  return (
    <ScreenLayout title="Статистика" onBack={onBack}>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
           <Spinner size="l"/>
        </div>
      )}

      {/* Если данных нет (пустой аккаунт) */}
      {isEmpty && (
        <Placeholder
           header="Статистика пуста"
           description="Здесь будут отображаться ваши доходы и активность, как только появятся первые записи."
        >
           <LottieIcon src="/stickers/duck_out.json" size={140} />
        </Placeholder>
      )}

      {/* Если данные есть */}
      {!loading && !isEmpty && data && (
        <div style={{ paddingBottom: 40 }}>
          <div style={{ padding: 16 }}>

            {/* Общий баланс (месяц) */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
               <Text style={{ color: 'var(--tgui--hint_color)' }}>Доход за месяц</Text>
               <LargeTitle weight="1">{data.revenue_month.toLocaleString()} ₽</LargeTitle>
            </div>

            {/* Карточки День/Неделя */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
               <StatCard title="Сегодня" value={`+${data.revenue_today} ₽`} />
               <StatCard title="Эта неделя" value={`+${data.revenue_week} ₽`} />
            </div>
          </div>

          {/* Список метрик */}
          <List style={{ background: 'var(--tgui--bg_color)' }}>
             <Section header="Активность">
                <Cell before={<Icon28StatisticsOutline />} after={String(data.total_bookings)}>
                   Выполнено записей
                </Cell>
                <Cell before={<Icon24UserOutline />} after={String(data.unique_clients)}>
                   Постоянных клиентов
                </Cell>
             </Section>

             {/* Топ услуг */}
             {data.top_services.length > 0 && (
               <Section header="Топ услуг">
                 {data.top_services.map((s, i) => (
                   <Cell
                     key={i}
                     after={`${s.revenue} ₽`}
                     description={`${s.count} записей`}
                   >
                     {i + 1}. {s.slot__service__name}
                   </Cell>
                 ))}
               </Section>
             )}
          </List>
        </div>
      )}
    </ScreenLayout>
  );
};
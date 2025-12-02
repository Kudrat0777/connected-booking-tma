import React, { useEffect, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Spinner,
  Title,
  Text,
  LargeTitle
} from '@telegram-apps/telegram-ui';
import { Icon28StatisticsOutline, Icon24UserOutline } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchMasterAnalytics, AnalyticsData } from '../helpers/api';

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
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
           <Spinner size="l"/>
        </div>
      ) : data ? (
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

          {/* Список метрик */}
          <List style={{ background: 'var(--tgui--bg_color)' }}> {/* Убираем фон списка, чтобы сливался */}
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
      ) : (
         <div style={{ padding: 20, textAlign: 'center' }}>Нет данных</div>
      )}
    </ScreenLayout>
  );
};
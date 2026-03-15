import React, { useEffect, useState, useRef } from 'react';
import {
  Cell,
  Spinner,
  Placeholder,
  Text,
} from '@telegram-apps/telegram-ui';
import {
  Icon28StatisticsOutline,
  Icon28UserOutline,
  Icon28MoneyCircleOutline,
  Icon28CancelOutline
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasterAnalytics, AnalyticsData } from '../helpers/api';

import { useLanguage } from '../helpers/LanguageContext';

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
  const { t } = useLanguage();

  const PERIODS = [
    { id: 'day', label: t('m_period_day') },
    { id: 'week', label: t('m_period_week') },
    { id: 'month', label: t('m_period_month') },
    { id: 'half_year', label: t('m_period_half_year') },
    { id: 'year', label: t('m_period_year') },
  ];

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<string>('month');
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    fetchMasterAnalytics(telegramId, activePeriod)
      .then((res) => {
          console.log('Analytics data received:', res);
          setData(res);
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
      })
      .catch((e) => {
          console.error('Analytics error:', e);
          setError(t('m_analytics_error'));
      })
      .finally(() => setLoading(false));
  }, [telegramId, activePeriod, t]);

  const earned = data?.earned || data?.revenue_period || data?.revenue_month || 0;
  const expected = data?.expected || data?.revenue_forecast || 0;
  const completed = data?.total_completed || data?.completed_bookings || data?.total_bookings || 0;
  const canceled = data?.rejected_count || data?.canceled_bookings || 0;
  const cancelRate = data?.cancel_rate || 0;
  const uniqueClients = data?.unique_clients || 0;
  const averageCheck = data?.average_check || (completed > 0 ? Math.floor(earned / completed) : 0);
  const topServices = data?.top_services || [];

  const isEmpty = !loading && !error && completed === 0 && expected === 0 && canceled === 0;

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ГОРИЗОНТАЛЬНЫЙ ФИЛЬТР ПЕРИОДА */}
      <div style={{ padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--tg-theme-bg-color)' }}>
        <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: 8 }}>
          {PERIODS.map(p => {
            const isActive = activePeriod === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setActivePeriod(p.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  backgroundColor: isActive ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                  color: isActive ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {p.label}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
           <Spinner size="l"/>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tg-theme-destructive-text-color)' }}>
            {error}
        </div>
      )}

      {isEmpty && (
        <div style={{ paddingTop: 40 }}>
            <Placeholder
               header={t('m_analytics_no_data')}
               description={t('m_analytics_no_data_desc')}
            >
               <LottieIcon src="/stickers/duck_analitic.json" size={140} />
            </Placeholder>
        </div>
      )}

      {!loading && !isEmpty && !error && data && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>

          {/* ГЛАВНЫЙ БЛОК: ЗАРАБОТАНО / ОЖИДАЕТСЯ */}
          <div style={{ padding: '40px 20px 24px', textAlign: 'center' }}>
             <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>
                 {t('m_earned')}
             </Text>
             <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--tg-theme-text-color)', lineHeight: 1.1, marginBottom: 12 }}>
                 {earned.toLocaleString('ru-RU')} <span style={{ fontSize: 24, fontWeight: 600 }}>UZS</span>
             </div>

             {expected > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '6px 12px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
                    ↗ {t('m_expected')} {expected.toLocaleString('ru-RU')} UZS
                </div>
             )}
          </div>

          <div style={{ padding: '0 16px' }}>
            {/* ВОРОНКА И ПОКАЗАТЕЛИ */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 8px' }}>
                {t('m_funnel_metrics')}
            </div>
            <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: 16, padding: '8px 0' }}>
              <Cell
                style={{ backgroundColor: 'transparent' }}
                before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28StatisticsOutline width={20} height={20} style={{ color: '#007AFF' }} /></div>}
                after={<span style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>{completed}</span>}
              >
                {t('m_completed_bookings')}
              </Cell>
              <Cell
                style={{ backgroundColor: 'transparent' }}
                before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28MoneyCircleOutline width={20} height={20} style={{ color: '#FF9500' }} /></div>}
                after={<span style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>{averageCheck.toLocaleString('ru-RU')} UZS</span>}
              >
                {t('m_average_check')}
              </Cell>
              <Cell
                style={{ backgroundColor: 'transparent' }}
                before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28UserOutline width={20} height={20} style={{ color: '#34C759' }} /></div>}
                after={<span style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>{uniqueClients}</span>}
              >
                {t('m_unique_clients')}
              </Cell>
            </div>

            {/* АНАЛИЗ ОТМЕН */}
            {canceled > 0 && (
                <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 8px' }}>
                        {t('m_cancellation_analysis')}
                    </div>
                    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: 16, padding: '8px 0' }}>
                    <Cell
                        style={{ backgroundColor: 'transparent' }}
                        before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28CancelOutline width={20} height={20} style={{ color: '#FF3B30' }} /></div>}
                        after={<span style={{ fontWeight: 700, fontSize: 16, color: '#FF3B30' }}>{cancelRate}%</span>}
                        description={<span style={{ color: 'var(--tg-theme-hint-color)' }}>{canceled} {t('m_bookings_canceled')}</span>}
                    >
                        {t('m_cancellation_rate')}
                    </Cell>
                    </div>
                </>
            )}

            {/* ПОПУЛЯРНЫЕ УСЛУГИ */}
            {topServices.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 8px' }}>
                    {t('m_popular_services')}
                </div>
                <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: 16, padding: '8px 0' }}>
                  {topServices.map((s, i) => (
                    <Cell
                      key={i}
                      style={{ backgroundColor: 'transparent' }}
                      after={<span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>{s.revenue.toLocaleString('ru-RU')} UZS</span>}
                      description={<span style={{ color: 'var(--tg-theme-hint-color)' }}>{s.count} {t('m_bookings_count')}</span>}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--tg-theme-text-color)' }}>{i + 1}. {s.slot__service__name}</span>
                    </Cell>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
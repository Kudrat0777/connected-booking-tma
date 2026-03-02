import React, { useState, useEffect } from 'react';
import {
  Button,
  Spinner,
  Avatar,
  Title,
  Text,
} from '@telegram-apps/telegram-ui';
import {
  Icon28FavoriteOutline,
  Icon28UsersOutline,
  Icon28WorkOutline
} from '@vkontakte/icons';

import { ScreenLayout } from '../components/ScreenLayout';
import { fetchMasterById, fetchPortfolio, getFullImageUrl, MasterPublicProfile, PortfolioItem } from '../helpers/api';

type Props = {
  masterId: number;
  onBack: () => void;
  onBook: (masterName: string) => void;
};

export const MasterPublicProfileScreen: React.FC<Props> = ({ masterId, onBack, onBook }) => {
  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [masterData, portfolioData] = await Promise.all([
          fetchMasterById(masterId),
          fetchPortfolio(masterId)
        ]);
        setMaster(masterData);
        setPortfolio(portfolioData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [masterId]);

  if (loading || !master) {
    return (
      <ScreenLayout title="Профиль мастера" onBack={onBack}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}><Spinner size="l" /></div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title={master.name} onBack={onBack}>
      <div style={{ paddingBottom: 100, background: 'var(--tgui--secondary_bg_color)', minHeight: '100vh' }}>

        {/* --- ШАПКА ПРОФИЛЯ --- */}
        <div style={{ background: 'var(--tgui--bg_color)', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Avatar
            size={96}
            src={getFullImageUrl(master.avatar_url)}
            style={{ marginBottom: 16, border: '3px solid var(--tgui--button_color)' }}
          />
          <Title level="1" weight="2" style={{ marginBottom: 4 }}>{master.name}</Title>
          <Text style={{ color: 'var(--tgui--hint_color)', fontSize: 15 }}>{master.city || 'Специалист'}</Text>

          {/* СТАТИСТИКА */}
          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: 24, padding: '16px 0', background: 'var(--tgui--secondary_bg_color)', borderRadius: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Icon28FavoriteOutline style={{ color: '#FFB703', marginBottom: 4 }} width={24} height={24} />
                <span style={{ fontWeight: 'bold', fontSize: 16 }}>{master.rating || '5.0'}</span>
                <span style={{ fontSize: 12, color: 'var(--tgui--hint_color)' }}>{master.reviews_count} отзывов</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Icon28WorkOutline style={{ color: 'var(--tgui--button_color)', marginBottom: 4 }} width={24} height={24} />
                <span style={{ fontWeight: 'bold', fontSize: 16 }}>{master.experience_years || 0} лет</span>
                <span style={{ fontSize: 12, color: 'var(--tgui--hint_color)' }}>опыта</span>
            </div>
          </div>
        </div>

        {/* --- ОПИСАНИЕ --- */}
        {master.bio && (
            <div style={{ margin: '16px 0', padding: 16, background: 'var(--tgui--bg_color)' }}>
                <Title level="3" style={{ marginBottom: 8 }}>Обо мне</Title>
                <Text style={{ lineHeight: '1.5', color: 'var(--tgui--text_color)' }}>
                    {master.bio}
                </Text>
            </div>
        )}

        {/* --- ПОРТФОЛИО --- */}
        {portfolio.length > 0 && (
            <div style={{ margin: '16px 0', padding: 16, background: 'var(--tgui--bg_color)' }}>
                <Title level="3" style={{ marginBottom: 12 }}>Мои работы</Title>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {portfolio.slice(0, 6).map(item => (
                        <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', backgroundColor: '#e0e0e0' }}>
                            <img
                                src={getFullImageUrl(item.image_url)}
                                alt="work"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>

      {/* --- КНОПКА ЗАПИСИ (ФИКСИРОВАННАЯ ВНИЗУ) --- */}
      <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px', background: 'var(--tgui--bg_color)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', zIndex: 100
      }}>
          <Button
            size="l"
            mode="filled"
            stretched
            onClick={() => onBook(master.name)}
            style={{ fontSize: 17, fontWeight: 'bold', height: 50 }}
          >
            Онлайн-запись
          </Button>
      </div>
    </ScreenLayout>
  );
};
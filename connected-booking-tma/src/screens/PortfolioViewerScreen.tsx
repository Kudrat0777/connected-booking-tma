import React, { useEffect, useState } from 'react';
import {
  Placeholder,
  Spinner
} from '@telegram-apps/telegram-ui';
import { Icon28PictureStackOutline } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchPortfolio, PortfolioItem } from '../helpers/api';

type Props = {
  masterId: number;
  masterName: string;
  onBack: () => void;
};

export const PortfolioViewerScreen: React.FC<Props> = ({ masterId, masterName, onBack }) => {
  const [photos, setPhotos] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio(masterId)
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [masterId]);

  return (
    <ScreenLayout title={`Работы ${masterName}`} onBack={onBack}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <Spinner size="l" />
        </div>
      ) : photos.length === 0 ? (
        <Placeholder
          header="Нет фото"
          description="Мастер пока не загрузил примеры работ."
        >
          <Icon28PictureStackOutline style={{ width: 64, height: 64, color: 'var(--tgui--hint_color)' }} />
        </Placeholder>
      ) : (
        <div style={{ padding: 4, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
           {photos.map((p) => (
             <div
               key={p.id}
               style={{
                 aspectRatio: '1/1',
                 overflow: 'hidden',
                 borderRadius: 4,
                 background: '#eee',
                 cursor: 'pointer'
               }}
               onClick={() => {
                  // Можно добавить логику открытия на весь экран
               }}
             >
               <img
                 src={p.image_url}
                 alt="Portfolio"
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
               />
             </div>
           ))}
        </div>
      )}
    </ScreenLayout>
  );
};
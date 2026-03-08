import React, { useEffect, useState } from 'react';
import {
  Placeholder,
  Spinner,
  AppRoot,
} from '@telegram-apps/telegram-ui';
import { Icon28PictureStackOutline } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchPortfolio, PortfolioItem, getFullImageUrl } from '../helpers/api';
import '../css/PortfolioViewer.css';

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
    <ScreenLayout title={masterName} onBack={onBack}>
      <div className="portfolio-container">
        {loading ? (
          <div className="portfolio-loader">
            <Spinner size="l" />
          </div>
        ) : photos.length === 0 ? (
          <div className="portfolio-empty">
            <Placeholder
              header="Примеры работ"
              description="Мастер пока не загрузил фотографии своих работ в портфолио."
            >
              <Icon28PictureStackOutline className="empty-icon" />
            </Placeholder>
          </div>
        ) : (
          <div className="portfolio-grid">
            {photos.map((p) => (
              <div
                key={p.id}
                className="portfolio-item"
                onClick={() => {
                  // Здесь в будущем можно вызвать tg.showPhoto() или внутренний модал
                }}
              >
                <img
                  src={getFullImageUrl(p.image_url)}
                  alt={`Work by ${masterName}`}
                  className="portfolio-img"
                  loading="lazy"
                />
                <div className="portfolio-item-overlay" />
              </div>
            ))}
          </div>
        )}
      </div>
    </ScreenLayout>
  );
};
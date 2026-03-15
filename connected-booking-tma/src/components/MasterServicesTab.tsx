import React, { useRef, useEffect } from 'react';
import { Title, Spinner, Placeholder, List, Section, Cell } from '@telegram-apps/telegram-ui';
import { Icon28DeleteOutline } from '@vkontakte/icons';
import lottie from 'lottie-web';
import type { Service } from '../helpers/api';

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
  services: Service[];
  loading: boolean;
  onAddService: () => void;
  onDeleteService: (id: number) => void;
  triggerHaptic: () => void;
};

export const MasterServicesTab: React.FC<Props> = ({
  services,
  loading,
  onAddService,
  onDeleteService,
  triggerHaptic
}) => {
  const { t } = useLanguage();

  return (
    <div style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100%',
        paddingBottom: 100
    }}>

      {/* Шапка Услуг */}
      <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          zIndex: 10,
      }}>
        <Title level="1" weight="2" style={{ margin: 0, color: 'var(--tg-theme-text-color)' }}>
            {t('m_my_services')}
        </Title>

        <div
           onClick={() => { triggerHaptic(); onAddService(); }}
           style={{
               backgroundColor: 'rgba(0, 122, 255, 0.1)',
               color: 'var(--tg-theme-button-color)',
               padding: '6px 14px',
               borderRadius: '14px',
               fontWeight: 600,
               fontSize: 14,
               cursor: 'pointer'
           }}
        >
           {t('m_btn_add')}
        </div>
      </div>

      {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size="m"/>
          </div>
      )}

      {!loading && services.length === 0 && (
         <div style={{ marginTop: 20 }}>
             <Placeholder header={t('m_no_services')} description={t('m_no_services_desc')}>
                <LottieIcon src="/stickers/duck_out.json" size={140} />
             </Placeholder>
         </div>
      )}

      {/* Список услуг в нативном стиле */}
      {!loading && services.length > 0 && (
        <List style={{ padding: '0 16px' }}>
          <Section>
            {services.map((s) => (
               <Cell
                  key={s.id}
                  subtitle={s.description ? `${s.duration} ${t('min')} • ${s.description}` : `${s.duration} ${t('min')}`}
                  after={
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                         {s.price ? `${s.price.toLocaleString('ru-RU')} UZS` : '0 UZS'}
                       </span>
                       <div
                         onClick={(e) => { e.stopPropagation(); onDeleteService(s.id); }}
                         style={{
                            width: 32,
                            height: 32,
                            backgroundColor: 'rgba(255, 59, 48, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                         }}
                       >
                          <Icon28DeleteOutline width={20} height={20} style={{ color: '#FF3B30' }} />
                       </div>
                     </div>
                  }
                  multiline
               >
                  <span style={{ fontWeight: 500, fontSize: 16 }}>{s.name}</span>
               </Cell>
            ))}
          </Section>
        </List>
      )}
    </div>
  );
};
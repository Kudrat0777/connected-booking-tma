import React, { useState, useEffect } from 'react';
import {
  Button,
  Select,
  Input,
  Section,
  Cell,
  List,
  SegmentedControl,
  Spinner,
  Placeholder,
  Modal
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { Icon28CalendarOutline, Icon28AddCircleOutline, Icon28DeleteOutline, Icon28UserAddOutline } from '@vkontakte/icons';
import {
  fetchMyServices,
  bulkGenerateSlots,
  fetchSlotsForService,
  createManualBooking,
  deleteSlot,
  Service,
  Slot
} from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
};

export const MasterScheduleScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [mode, setMode] = useState<'manage' | 'generate'>('manage');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // --- STATES FOR GENERATE ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [stepMinutes, setStepMinutes] = useState('60');

  // --- STATES FOR MANAGE ---
  const [manageDate, setManageDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<number | null>(null);

  useEffect(() => {
    fetchMyServices(telegramId).then(data => {
      setServices(data);
      if (data.length > 0) setSelectedServiceId(String(data[0].id));
    });
  }, [telegramId]);

  useEffect(() => {
    if (mode === 'manage' && selectedServiceId) {
      loadSlots();
    }
  }, [mode, selectedServiceId, manageDate]);

  const loadSlots = async () => {
      setLoadingSlots(true);
      try {
          // Получаем ВСЕ слоты услуги, а потом фильтруем по дате на клиенте
          // (Не идеально для продакшена, но просто для реализации сейчас)
          const allSlots = await fetchSlotsForService(Number(selectedServiceId));
          const filtered = allSlots.filter(s => s.time.startsWith(manageDate));
          // Сортируем по времени
          filtered.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          setSlots(filtered);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingSlots(false);
      }
  };

  // --- HANDLERS GENERATE ---
  const handleGenerate = async () => {
    if (!startDate || !endDate || !selectedServiceId) return alert('Заполните все поля');
    setLoading(true);
    try {
      // Генерируем массив времен с шагом
      const times: string[] = [];
      let current = parseInt(startHour.split(':')[0]) * 60 + parseInt(startHour.split(':')[1]);
      const end = parseInt(endHour.split(':')[0]) * 60 + parseInt(endHour.split(':')[1]);
      const step = parseInt(stepMinutes);

      while (current < end) {
        const h = Math.floor(current / 60).toString().padStart(2, '0');
        const m = (current % 60).toString().padStart(2, '0');
        times.push(`${h}:${m}`);
        current += step;
      }

      await bulkGenerateSlots(
         Number(selectedServiceId),
         startDate,
         endDate,
         times,
         [0,1,2,3,4,5,6]
      );
      alert('Слоты созданы!');
      setMode('manage'); // Переходим к управлению
    } catch (e) {
      alert('Ошибка генерации');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS MANAGE ---
  const handleManualBook = async () => {
      if (!selectedSlotForBooking || !manualClientName) return;
      try {
          await createManualBooking(selectedSlotForBooking, manualClientName);
          setManualClientName('');
          setSelectedSlotForBooking(null);
          loadSlots(); // Обновляем список
      } catch (e) {
          alert('Ошибка записи');
      }
  };

  const handleDeleteSlot = async (id: number) => {
      if(!window.confirm('Удалить этот слот?')) return;
      try {
          await deleteSlot(id);
          loadSlots();
      } catch (e) {
          alert('Ошибка удаления');
      }
  };

  const renderGenerate = () => (
    <div style={{ padding: 16 }}>
      <Section header="Настройки генерации">
         <Select header="Услуга" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
         </Select>
         <Input type="date" header="С даты" value={startDate} onChange={e => setStartDate(e.target.value)} />
         <Input type="date" header="По дату" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </Section>

      <Section header="Время работы">
         <Input type="time" header="Начало дня" value={startHour} onChange={e => setStartHour(e.target.value)} />
         <Input type="time" header="Конец дня" value={endHour} onChange={e => setEndHour(e.target.value)} />
         <Select header="Длительность слота" value={stepMinutes} onChange={e => setStepMinutes(e.target.value)}>
             <option value="30">30 мин</option>
             <option value="60">1 час</option>
             <option value="90">1.5 часа</option>
             <option value="120">2 часа</option>
         </Select>
      </Section>

      <Button size="l" mode="filled" stretched loading={loading} onClick={handleGenerate} style={{ marginTop: 16 }}>
        Сгенерировать слоты
      </Button>
    </div>
  );

  const renderManage = () => (
    <div>
       <div style={{ padding: 16, background: 'var(--tgui--bg_color)' }}>
          <Select header="Услуга" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} style={{ marginBottom: 12 }}>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input type="date" header="Дата" value={manageDate} onChange={e => setManageDate(e.target.value)} />
       </div>

       {loadingSlots ? <Spinner size="m" style={{ margin: 20 }} /> : (
         <List>
            {slots.length === 0 ? (
                <Placeholder header="Нет слотов" description="На этот день слотов нет. Перейдите в 'Создать', чтобы добавить их." />
            ) : (
                slots.map(slot => {
                    const timeStr = new Date(slot.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                    return (
                        <Section key={slot.id}>
                            <Cell
                                description={slot.is_booked ? "Занято" : "Свободно"}
                                after={
                                    slot.is_booked ? (
                                        <span style={{ color: 'red', fontSize: 12 }}>ЗАБРОНИРОВАНО</span>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button
                                                size="s"
                                                mode="bezeled"
                                                onClick={() => setSelectedSlotForBooking(slot.id)}
                                            >
                                                + Записать
                                            </Button>
                                            <Button
                                                size="s"
                                                mode="plain"
                                                style={{ color: 'var(--tgui--destructive_text_color)' }}
                                                onClick={() => handleDeleteSlot(slot.id)}
                                            >
                                                <Icon28DeleteOutline />
                                            </Button>
                                        </div>
                                    )
                                }
                            >
                                {timeStr}
                            </Cell>
                        </Section>
                    );
                })
            )}
         </List>
       )}

       {/* Простая модалка для ввода имени (эмуляция) */}
       {selectedSlotForBooking && (
           <div style={{
               position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
               background: 'rgba(0,0,0,0.5)', zIndex: 100,
               display: 'flex', alignItems: 'center', justifyContent: 'center'
           }}>
               <div style={{
                   background: 'var(--tgui--bg_color)',
                   padding: 24, borderRadius: 16, width: '80%', maxWidth: 300
               }}>
                   <h3 style={{ marginTop: 0, color: 'var(--tgui--text_color)' }}>Ручная запись</h3>
                   <Input
                      placeholder="Имя клиента / Телефон"
                      value={manualClientName}
                      onChange={e => setManualClientName(e.target.value)}
                   />
                   <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                       <Button stretched mode="plain" onClick={() => setSelectedSlotForBooking(null)}>Отмена</Button>
                       <Button stretched mode="filled" onClick={handleManualBook}>Записать</Button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );

  return (
    <ScreenLayout title="Расписание" onBack={onBack}>
      <div style={{ padding: '10px 16px' }}>
        <SegmentedControl size="m">
           <SegmentedControl.Item selected={mode === 'manage'} onClick={() => setMode('manage')}>
              Управление
           </SegmentedControl.Item>
           <SegmentedControl.Item selected={mode === 'generate'} onClick={() => setMode('generate')}>
              Создать
           </SegmentedControl.Item>
        </SegmentedControl>
      </div>

      {mode === 'generate' ? renderGenerate() : renderManage()}
    </ScreenLayout>
  );
};
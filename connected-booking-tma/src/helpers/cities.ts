// Города для профиля мастера. В базе хранится русское название (по нему фильтр каталога),
// на экране — на языке пользователя. Своего города нет — сохраняется как ввели.
import type { LangCode } from './translations';

export const CITIES: Record<LangCode, string>[] = [
  { ru: 'Ташкент', uz: 'Toshkent', en: 'Tashkent' },
  { ru: 'Самарканд', uz: 'Samarqand', en: 'Samarkand' },
  { ru: 'Бухара', uz: 'Buxoro', en: 'Bukhara' },
  { ru: 'Ургенч', uz: 'Urganch', en: 'Urgench' },
  { ru: 'Хива', uz: 'Xiva', en: 'Khiva' },
  { ru: 'Нукус', uz: 'Nukus', en: 'Nukus' },
  { ru: 'Андижан', uz: 'Andijon', en: 'Andijan' },
  { ru: 'Наманган', uz: 'Namangan', en: 'Namangan' },
  { ru: 'Фергана', uz: "Farg'ona", en: 'Fergana' },
  { ru: 'Коканд', uz: 'Qoʻqon', en: 'Kokand' },
  { ru: 'Карши', uz: 'Qarshi', en: 'Karshi' },
  { ru: 'Термез', uz: 'Termiz', en: 'Termez' },
  { ru: 'Джизак', uz: 'Jizzax', en: 'Jizzakh' },
  { ru: 'Навои', uz: 'Navoiy', en: 'Navoi' },
  { ru: 'Гулистан', uz: 'Guliston', en: 'Gulistan' },
];

export function cityLabel(value: string, lang: LangCode): string {
  const c = CITIES.find((x) => x.ru === value);
  return c ? c[lang] : value;
}

/** Ссылки «Как добраться» по точке на карте */
export const mapLinks = (lat: number, lon: number) => ({
  yandex: `https://yandex.uz/maps/?pt=${lon},${lat}&z=17&l=map`,
  google: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
});

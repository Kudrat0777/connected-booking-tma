// Профессии мастеров: ключи совпадают с booking/professions.py на сервере.
// От профессии зависят подписи (клиенты / ученики / пациенты), второй шаг регистрации
// и главный раздел кабинета. Тексты — здесь же, на трёх языках.
import type { LangCode } from './translations';

export const PROFESSIONS = [
  'barber', 'hair', 'nails', 'brows', 'massage', 'yoga', 'fitness',
  'dance', 'tutor', 'doctor', 'psych', 'auto', 'photo', 'other',
] as const;
export type Profession = typeof PROFESSIONS[number];

export const isProfession = (v: unknown): v is Profession => PROFESSIONS.includes(v as Profession);

/** Где на первом месте групповые занятия, а не личные записи */
export const CLASS_FIRST: ReadonlySet<Profession> = new Set(['yoga', 'fitness', 'dance', 'tutor']);

/** Как звучит шаг «сам или команда» */
type SoloKind = 'master' | 'classes' | 'practice';
const SOLO_KIND: Partial<Record<Profession, SoloKind>> = {
  yoga: 'classes', fitness: 'classes', dance: 'classes', tutor: 'classes', doctor: 'practice', psych: 'practice',
};
export const soloKind = (p: Profession): SoloKind => SOLO_KIND[p] ?? 'master';

/** Чьи слова подставлять вместо «клиентов» */
type Words = 'students' | 'patients' | 'fitness' | 'psych';
const WORDS: Partial<Record<Profession, Words>> = {
  yoga: 'students', dance: 'students', tutor: 'students', doctor: 'patients', fitness: 'fitness', psych: 'psych',
};

/** Старые категории (до профессий) → ключ: для данных, сохранённых раньше */
const LEGACY: Record<string, Profession> = {
  'Барбершоп': 'barber', 'Барбер': 'barber', 'Салон красоты': 'hair', 'Массаж': 'massage',
  'Маникюр / Педикюр': 'nails', 'Брови и Ресницы': 'brows', 'Медицина': 'doctor',
  'Спорт / Фитнес': 'fitness', 'Автосервис': 'auto',
};

/** Профессия мастера или заведения; у старых записей — по категории */
export function professionOf(x?: { profession?: string; category?: string } | null): Profession {
  if (isProfession(x?.profession)) return x!.profession as Profession;
  return LEGACY[x?.category || ''] ?? 'other';
}

type Dict = Record<string, string>;

// Подписи профессий, места для варианта «команда» и тексты регистрации
export const professionTranslations: Record<LangCode, Dict> = {
  ru: {
    pf_barber: 'Барбер', pf_hair: 'Парикмахер', pf_nails: 'Маникюр', pf_brows: 'Брови и ресницы',
    pf_massage: 'Массаж', pf_yoga: 'Йога / пилатес', pf_fitness: 'Фитнес-тренер', pf_dance: 'Танцы',
    pf_tutor: 'Репетитор / курсы', pf_doctor: 'Врач / клиника', pf_psych: 'Психолог', pf_auto: 'Автосервис',
    pf_photo: 'Фотограф', pf_other: 'Другое',
    pt_barber: 'барбершоп', pt_hair: 'салон', pt_nails: 'студия', pt_brows: 'студия', pt_massage: 'массажный салон',
    pt_yoga: 'студия', pt_fitness: 'фитнес-клуб', pt_dance: 'школа танцев', pt_tutor: 'учебный центр',
    pt_doctor: 'клиника', pt_psych: 'центр', pt_auto: 'автосервис', pt_photo: 'студия', pt_other: 'команда',

    pf_step: 'Шаг {n} из 3',
    pf_title: 'Чем вы занимаетесь?',
    pf_sub: 'Подстроим кабинет под вашу работу: слова, разделы и напоминания.',
    pf_chosen: 'Выбрано: {name}',
    pf_change: 'изменить',
    pf_how_classes: 'Как вы ведёте занятия?',
    pf_solo_master: 'Я работаю сам', pf_solo_master_desc: 'Своё расписание, услуги и ссылка для записи.',
    pf_solo_classes: 'Веду занятия сам', pf_solo_classes_desc: 'Свои группы, расписание и личные записи.',
    pf_solo_practice: 'Частная практика', pf_solo_practice_desc: 'Своё расписание приёмов и ссылка для записи.',
    pf_team: 'У меня {place}',
    pf_team_desc: 'Несколько специалистов: общая страница, приглашение команды и все записи в одном месте.',
    pf_invite_hint: 'Работаете в команде, которая уже есть в CTime? Попросите у владельца ссылку-приглашение.',
    pf_exp: 'Опыт', pf_exp_0: 'до года', pf_exp_1: '1–3 года', pf_exp_3: '3–5 лет', pf_exp_5: '5+ лет',
    pf_feat_title: 'Что будет в вашем кабинете',
    pf_f_groups: 'Группы и расписание занятий',
    pf_f_signups: 'Кто записан на каждое занятие',
    pf_f_booking: 'Онлайн-запись в свободные окна',
    pf_f_clients: 'Клиенты и история визитов',
    pf_f_reminders: 'Напоминания перед каждым визитом',
    pf_f_reminders_classes: 'Напоминания перед каждым занятием',
    pf_groups_card: 'Группы и расписание',
    pf_groups_card_sub: 'Программы, группы и кто записан',
    pf_profession: 'Профессия',
    ca_src_push: 'Сообщение о программе дня',
    ca_title: 'Аналитика', ca_week: 'Неделя', ca_month: 'Месяц', ca_half: 'Полгода',
    ca_signups: 'Записей на занятия',
    ca_delta_up: '+{n} к прошлому периоду', ca_delta_down: '−{n} к прошлому периоду', ca_delta_same: 'как в прошлом периоде',
    ca_students: 'Учеников', ca_new: 'новых: {n}',
    ca_fill: 'Заполненность', ca_fill_hint: 'в среднем по группам', ca_fill_none: 'укажите места в группах',
    ca_held: 'Занятий прошло', ca_canceled: 'отменено: {n}',
    ca_dropped: 'Отказались', ca_dropped_hint: 'отменили запись',
    ca_chart: 'Записи', ca_by_day: 'по дням', ca_by_week: 'по неделям', ca_by_month: 'по месяцам',
    ca_groups: 'По группам', ca_avg: '{n} на занятии', ca_group_fill: 'заполнена на {n}% · {cap} мест', ca_group_nocap: 'без ограничения мест · занятий: {n}',
    ca_programs: 'Какие программы собирают больше', ca_prog_avg: '{n} в среднем',
    ca_lost: 'Давно не записывались', ca_lost_hint: 'Ходили раньше, но больше двух недель без записи', ca_write: 'Написать',
    ca_last: 'последний раз {date}',
    ca_sources: 'Откуда приходят ученики', ca_subscribers: 'Подписаны на программу дня',
    ca_note: 'Считаем записи. Сколько пришло на самом деле — после отметок «был» на занятии.',
    ca_empty: 'Пока нет прошедших занятий с записями', ca_empty_hint: 'Цифры появятся после первых занятий.',
    ca_error: 'Не удалось загрузить аналитику', ca_retry: 'Повторить',
    pf_stat_classes: 'Занятий сегодня',
    pf_stat_signed: 'Записалось сегодня',
    pf_today_classes: 'Занятия сегодня',
    pf_next_classes: 'Ближайшие занятия',
    pf_of: '{n} из {max}',
    pf_program: 'Программа: {name}',
    pf_minutes: '{n} мин',
    pf_no_groups: 'Пока нет групп',
    pf_no_groups_hint: 'Создайте группу и расписание — записываться смогут прямо по ссылке.',
    pf_create_group: 'Создать группу',
    pf_no_classes_soon: 'В ближайший месяц занятий нет',
    pf_qa_groups: 'Группы', pf_qa_programs: 'Программы', pf_qa_link: 'Ссылка', pf_qa_services: 'Услуги',
    pf_personal: 'Личные записи',
    pf_tab_analytics: 'Аналитика',
  },
  uz: {
    pf_barber: 'Barber', pf_hair: 'Sartarosh', pf_nails: 'Manikyur', pf_brows: 'Qosh va kipriklar',
    pf_massage: 'Massaj', pf_yoga: 'Yoga / pilates', pf_fitness: 'Fitnes-murabbiy', pf_dance: 'Raqs',
    pf_tutor: 'Repetitor / kurslar', pf_doctor: 'Shifokor / klinika', pf_psych: 'Psixolog', pf_auto: 'Avtoservis',
    pf_photo: 'Fotograf', pf_other: 'Boshqa',
    pt_barber: 'barbershop', pt_hair: 'salon', pt_nails: 'studiya', pt_brows: 'studiya', pt_massage: 'massaj saloni',
    pt_yoga: 'studiya', pt_fitness: 'fitnes-klub', pt_dance: 'raqs maktabi', pt_tutor: "o'quv markazi",
    pt_doctor: 'klinika', pt_psych: 'markaz', pt_auto: 'avtoservis', pt_photo: 'studiya', pt_other: 'jamoa',

    pf_step: '{n}-qadam, jami 3',
    pf_title: "Nima bilan shug'ullanasiz?",
    pf_sub: "Kabinetni ishingizga moslaymiz: so'zlar, bo'limlar va eslatmalar.",
    pf_chosen: 'Tanlandi: {name}',
    pf_change: "o'zgartirish",
    pf_how_classes: "Mashg'ulotlarni qanday o'tkazasiz?",
    pf_solo_master: "O'zim ishlayman", pf_solo_master_desc: "O'z jadvalingiz, xizmatlar va yozilish havolasi.",
    pf_solo_classes: "Mashg'ulotlarni o'zim o'tkazaman", pf_solo_classes_desc: "O'z guruhlaringiz, jadval va shaxsiy yozuvlar.",
    pf_solo_practice: 'Xususiy amaliyot', pf_solo_practice_desc: 'Qabul jadvali va yozilish havolasi.',
    pf_team: 'Menda {place} bor',
    pf_team_desc: "Bir nechta mutaxassis: umumiy sahifa, jamoani taklif qilish va barcha yozuvlar bir joyda.",
    pf_invite_hint: "CTime'da allaqachon bor jamoada ishlaysizmi? Egasidan taklif havolasini so'rang.",
    pf_exp: 'Tajriba', pf_exp_0: '1 yilgacha', pf_exp_1: '1–3 yil', pf_exp_3: '3–5 yil', pf_exp_5: '5+ yil',
    pf_feat_title: "Kabinetingizda nima bo'ladi",
    pf_f_groups: "Guruhlar va mashg'ulotlar jadvali",
    pf_f_signups: "Har bir mashg'ulotga kim yozilgani",
    pf_f_booking: "Bo'sh vaqtlarga onlayn yozilish",
    pf_f_clients: 'Mijozlar va tashriflar tarixi',
    pf_f_reminders: 'Har bir tashrifdan oldin eslatma',
    pf_f_reminders_classes: "Har bir mashg'ulotdan oldin eslatma",
    pf_groups_card: 'Guruhlar va jadval',
    pf_groups_card_sub: 'Dasturlar, guruhlar va kim yozilgan',
    pf_profession: 'Kasb',
    ca_src_push: 'Kun dasturi haqidagi xabar',
    ca_title: 'Statistika', ca_week: 'Hafta', ca_month: 'Oy', ca_half: 'Yarim yil',
    ca_signups: "Mashg'ulotlarga yozilganlar",
    ca_delta_up: "o'tgan davrga nisbatan +{n}", ca_delta_down: "o'tgan davrga nisbatan −{n}", ca_delta_same: "o'tgan davrdagidek",
    ca_students: "O'quvchilar", ca_new: 'yangi: {n}',
    ca_fill: "To'ldirilganlik", ca_fill_hint: "guruhlar bo'yicha o'rtacha", ca_fill_none: "guruhlarda joylar sonini kiriting",
    ca_held: "O'tgan mashg'ulotlar", ca_canceled: 'bekor qilingan: {n}',
    ca_dropped: 'Voz kechganlar', ca_dropped_hint: 'yozuvni bekor qilgan',
    ca_chart: 'Yozuvlar', ca_by_day: "kunlar bo'yicha", ca_by_week: "haftalar bo'yicha", ca_by_month: "oylar bo'yicha",
    ca_groups: "Guruhlar bo'yicha", ca_avg: "mashg'ulotda {n}", ca_group_fill: "{n}% to'lgan · {cap} joy", ca_group_nocap: "joy cheklanmagan · mashg'ulotlar: {n}",
    ca_programs: "Qaysi dasturlar ko'proq yig'adi", ca_prog_avg: "o'rtacha {n}",
    ca_lost: "Ancha vaqt yozilmaganlar", ca_lost_hint: "Avval kelgan, lekin ikki haftadan beri yozilmagan", ca_write: 'Yozish',
    ca_last: 'oxirgi marta {date}',
    ca_sources: "O'quvchilar qayerdan keladi", ca_subscribers: "Kun dasturiga obuna bo'lganlar",
    ca_note: "Yozuvlarni hisoblaymiz. Aslida nechta kelgani — mashg'ulotda «keldi» belgilari paydo bo'lgach.",
    ca_empty: "Hozircha yozuvli o'tgan mashg'ulotlar yo'q", ca_empty_hint: "Raqamlar birinchi mashg'ulotlardan keyin paydo bo'ladi.",
    ca_error: "Statistikani yuklab bo'lmadi", ca_retry: 'Qayta urinish',
    pf_stat_classes: "Bugungi mashg'ulotlar",
    pf_stat_signed: 'Bugun yozilganlar',
    pf_today_classes: "Bugungi mashg'ulotlar",
    pf_next_classes: "Yaqin mashg'ulotlar",
    pf_of: '{n} / {max}',
    pf_program: 'Dastur: {name}',
    pf_minutes: '{n} daq',
    pf_no_groups: "Hozircha guruhlar yo'q",
    pf_no_groups_hint: "Guruh va jadval yarating — havola orqali yozilish mumkin bo'ladi.",
    pf_create_group: 'Guruh yaratish',
    pf_no_classes_soon: "Yaqin bir oyda mashg'ulot yo'q",
    pf_qa_groups: 'Guruhlar', pf_qa_programs: 'Dasturlar', pf_qa_link: 'Havola', pf_qa_services: 'Xizmatlar',
    pf_personal: 'Shaxsiy yozuvlar',
    pf_tab_analytics: 'Statistika',
  },
  en: {
    pf_barber: 'Barber', pf_hair: 'Hairdresser', pf_nails: 'Nails', pf_brows: 'Brows & lashes',
    pf_massage: 'Massage', pf_yoga: 'Yoga / Pilates', pf_fitness: 'Fitness coach', pf_dance: 'Dance',
    pf_tutor: 'Tutor / courses', pf_doctor: 'Doctor / clinic', pf_psych: 'Psychologist', pf_auto: 'Car service',
    pf_photo: 'Photographer', pf_other: 'Other',
    pt_barber: 'barbershop', pt_hair: 'salon', pt_nails: 'studio', pt_brows: 'studio', pt_massage: 'massage salon',
    pt_yoga: 'studio', pt_fitness: 'fitness club', pt_dance: 'dance school', pt_tutor: 'learning center',
    pt_doctor: 'clinic', pt_psych: 'practice', pt_auto: 'car service', pt_photo: 'studio', pt_other: 'team',

    pf_step: 'Step {n} of 3',
    pf_title: 'What do you do?',
    pf_sub: "We'll tailor your workspace: wording, sections and reminders.",
    pf_chosen: 'Selected: {name}',
    pf_change: 'change',
    pf_how_classes: 'How do you teach?',
    pf_solo_master: 'I work on my own', pf_solo_master_desc: 'Your own schedule, services and booking link.',
    pf_solo_classes: 'I teach on my own', pf_solo_classes_desc: 'Your own groups, schedule and personal bookings.',
    pf_solo_practice: 'Private practice', pf_solo_practice_desc: 'Your appointment schedule and booking link.',
    pf_team: 'I run a {place}',
    pf_team_desc: 'Several specialists: one shared page, team invites and all bookings in one place.',
    pf_invite_hint: 'Joining a team that is already on CTime? Ask the owner for an invite link.',
    pf_exp: 'Experience', pf_exp_0: 'under 1 year', pf_exp_1: '1–3 years', pf_exp_3: '3–5 years', pf_exp_5: '5+ years',
    pf_feat_title: 'What your workspace will have',
    pf_f_groups: 'Groups and class schedule',
    pf_f_signups: 'Who signed up for each class',
    pf_f_booking: 'Online booking into free slots',
    pf_f_clients: 'Clients and visit history',
    pf_f_reminders: 'Reminders before every visit',
    pf_f_reminders_classes: 'Reminders before every class',
    pf_groups_card: 'Groups and schedule',
    pf_groups_card_sub: 'Programs, groups and who signed up',
    pf_profession: 'Profession',
    ca_src_push: 'Daily program message',
    ca_title: 'Analytics', ca_week: 'Week', ca_month: 'Month', ca_half: '6 months',
    ca_signups: 'Class sign-ups',
    ca_delta_up: '+{n} vs previous period', ca_delta_down: '−{n} vs previous period', ca_delta_same: 'same as previous period',
    ca_students: 'Students', ca_new: 'new: {n}',
    ca_fill: 'Fill rate', ca_fill_hint: 'average across groups', ca_fill_none: 'set group capacity',
    ca_held: 'Classes held', ca_canceled: 'canceled: {n}',
    ca_dropped: 'Dropped out', ca_dropped_hint: 'canceled their sign-up',
    ca_chart: 'Sign-ups', ca_by_day: 'by day', ca_by_week: 'by week', ca_by_month: 'by month',
    ca_groups: 'By group', ca_avg: '{n} per class', ca_group_fill: '{n}% full · {cap} spots', ca_group_nocap: 'no spot limit · classes: {n}',
    ca_programs: 'Programs that draw the most', ca_prog_avg: '{n} on average',
    ca_lost: "Haven't signed up lately", ca_lost_hint: 'Came before, but no sign-up for over two weeks', ca_write: 'Message',
    ca_last: 'last time {date}',
    ca_sources: 'Where students come from', ca_subscribers: 'Subscribed to the daily program',
    ca_note: 'These are sign-ups. Actual attendance comes once "attended" marks are added.',
    ca_empty: 'No past classes with sign-ups yet', ca_empty_hint: 'Numbers will appear after the first classes.',
    ca_error: 'Could not load analytics', ca_retry: 'Retry',
    pf_stat_classes: 'Classes today',
    pf_stat_signed: 'Signed up today',
    pf_today_classes: 'Classes today',
    pf_next_classes: 'Upcoming classes',
    pf_of: '{n} of {max}',
    pf_program: 'Program: {name}',
    pf_minutes: '{n} min',
    pf_no_groups: 'No groups yet',
    pf_no_groups_hint: 'Create a group and schedule — people can then sign up via your link.',
    pf_create_group: 'Create a group',
    pf_no_classes_soon: 'No classes in the next month',
    pf_qa_groups: 'Groups', pf_qa_programs: 'Programs', pf_qa_link: 'Link', pf_qa_services: 'Services',
    pf_personal: 'Personal bookings',
    pf_tab_analytics: 'Analytics',
  },
};

// Слова профессии поверх общих текстов: «ученики» вместо «клиентов» и т. п.
const STUDENTS: Record<LangCode, Dict> = {
  ru: {
    md_tab_bookings: 'Занятия', cl_title: 'Ученики', prof_clients: 'Ученики', an_clients: 'Ученики', md_client: 'Ученик',
    p_clients: 'ученик|ученика|учеников', cl_new_client: 'Новый ученик', cl_empty: 'Ученики появятся после первых записей.',
    links_title: 'Ссылки для учеников', md_send_link: 'Отправить ссылку ученику',
    md_empty_hint: 'Поделитесь ссылкой в Instagram или Telegram — ученики начнут записываться сами.',
    reg_solo_sub: 'Эти данные увидят ученики. Вход — через ваш Telegram, пароль не нужен.',
    pf_f_clients: 'Ученики и история посещений',
    pf_stat_signed: 'Учеников записано',
    mp_no_services_warn: 'Нет ни одной услуги — на личные занятия записаться нельзя. Групповые занятия работают и без услуг.',
  },
  uz: {
    md_tab_bookings: "Mashg'ulotlar", cl_title: "O'quvchilar", prof_clients: "O'quvchilar", an_clients: "O'quvchilar",
    md_client: "O'quvchi", p_clients: "o'quvchi", cl_new_client: "Yangi o'quvchi",
    cl_empty: "O'quvchilar birinchi yozuvlardan keyin paydo bo'ladi.", links_title: "O'quvchilar uchun havolalar",
    md_send_link: "O'quvchiga havola yuborish",
    md_empty_hint: "Havolani Instagram yoki Telegramda ulashing — o'quvchilar o'zlari yoziladi.",
    reg_solo_sub: "Bu ma'lumotlarni o'quvchilar ko'radi. Kirish — Telegram orqali, parol kerak emas.",
    pf_f_clients: "O'quvchilar va qatnashuv tarixi",
    pf_stat_signed: "Yozilgan o'quvchilar",
    mp_no_services_warn: "Birorta xizmat yo'q — shaxsiy mashg'ulotlarga yozilib bo'lmaydi. Guruh mashg'ulotlari xizmatlarsiz ham ishlaydi.",
  },
  en: {
    md_tab_bookings: 'Classes', cl_title: 'Students', prof_clients: 'Students', an_clients: 'Students', md_client: 'Student',
    p_clients: 'student|students', cl_new_client: 'New student', cl_empty: 'Students will appear after the first bookings.',
    links_title: 'Links for students', md_send_link: 'Send link to student',
    md_empty_hint: 'Share your link on Instagram or Telegram — students will start booking themselves.',
    reg_solo_sub: 'Students will see this. You sign in with Telegram, no password needed.',
    pf_f_clients: 'Students and attendance history',
    pf_stat_signed: 'Students signed up',
    mp_no_services_warn: 'No services yet — students can’t book private sessions. Group classes work without services.',
  },
};

const PATIENTS: Record<LangCode, Dict> = {
  ru: {
    md_tab_bookings: 'Приёмы', cl_title: 'Пациенты', prof_clients: 'Пациенты', an_clients: 'Пациенты', md_client: 'Пациент',
    p_clients: 'пациент|пациента|пациентов', cl_new_client: 'Новый пациент', cl_empty: 'Пациенты появятся после первых записей.',
    links_title: 'Ссылки для пациентов', md_send_link: 'Отправить ссылку пациенту',
    md_empty_hint: 'Поделитесь ссылкой в Instagram или Telegram — пациенты начнут записываться сами.',
    reg_solo_sub: 'Эти данные увидят пациенты. Вход — через ваш Telegram, пароль не нужен.',
    pf_f_clients: 'Пациенты и история приёмов',
  },
  uz: {
    md_tab_bookings: 'Qabullar', cl_title: 'Bemorlar', prof_clients: 'Bemorlar', an_clients: 'Bemorlar', md_client: 'Bemor',
    p_clients: 'bemor', cl_new_client: 'Yangi bemor', cl_empty: "Bemorlar birinchi yozuvlardan keyin paydo bo'ladi.",
    links_title: 'Bemorlar uchun havolalar', md_send_link: 'Bemorga havola yuborish',
    md_empty_hint: "Havolani Instagram yoki Telegramda ulashing — bemorlar o'zlari yoziladi.",
    reg_solo_sub: "Bu ma'lumotlarni bemorlar ko'radi. Kirish — Telegram orqali, parol kerak emas.",
    pf_f_clients: 'Bemorlar va qabullar tarixi',
  },
  en: {
    md_tab_bookings: 'Appointments', cl_title: 'Patients', prof_clients: 'Patients', an_clients: 'Patients', md_client: 'Patient',
    p_clients: 'patient|patients', cl_new_client: 'New patient', cl_empty: 'Patients will appear after the first bookings.',
    links_title: 'Links for patients', md_send_link: 'Send link to patient',
    md_empty_hint: 'Share your link on Instagram or Telegram — patients will start booking themselves.',
    reg_solo_sub: 'Patients will see this. You sign in with Telegram, no password needed.',
    pf_f_clients: 'Patients and appointment history',
  },
};

const FITNESS: Record<LangCode, Dict> = {
  ru: { md_tab_bookings: 'Тренировки' }, uz: { md_tab_bookings: "Mashg'ulotlar" }, en: { md_tab_bookings: 'Workouts' },
};
const PSYCH: Record<LangCode, Dict> = {
  ru: { md_tab_bookings: 'Сессии' }, uz: { md_tab_bookings: 'Seanslar' }, en: { md_tab_bookings: 'Sessions' },
};

const WORD_SETS: Record<Words, Record<LangCode, Dict>> = { students: STUDENTS, patients: PATIENTS, fitness: FITNESS, psych: PSYCH };

/** Слова профессии для языка; пусто — общие тексты */
export function professionWords(p: Profession | null, lang: LangCode): Dict {
  const w = p ? WORDS[p] : undefined;
  return w ? WORD_SETS[w][lang] : {};
}

/** Подпись профессии на языке пользователя; своё старое значение категории — как есть */
export function professionLabel(t: (k: string) => string, x?: { profession?: string; category?: string } | null): string {
  const p = professionOf(x);
  if (p === 'other' && x?.category && x.category !== 'Другое' && !isProfession(x.profession)) return x.category;
  return t(`pf_${p}`);
}

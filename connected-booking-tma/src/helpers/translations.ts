export type LangCode = 'ru' | 'uz' | 'en';

type TranslationsDictionary = {
  [key in LangCode]: Record<string, string>;
};

export const translations: TranslationsDictionary = {
  en: {
    // Welcome Screen (Client)
    slide1_title: "Best booking system",
    slide1_desc: "Choose a service and time — we'll do the rest.",
    slide2_title: "All notifications in Telegram",
    slide2_desc: "Booking confirmations, reminders, and updates — right in the messenger.",
    slide3_title: "Favorite masters at hand",
    slide3_desc: "Save masters, leave reviews, and return to the best ones.",
    slide4_title: "Modern payments",
    slide4_desc: "Pay for services with cards, TON, or Stars. Fast and secure.",
    btn_start: "Get Started",

    // Settings Screen
    settings_title: "Settings",
    web3_title: "Web3 (TON)",
    web3_desc: "Link your wallet for future bonuses and discounts.",
    ton_wallet: "TON Wallet",
    soon: "Soon",
    connect: "Connect",
    personal_data: "Personal Data",
    first_name: "First Name",
    last_name: "Last Name",
    contacts: "Contacts",
    phone: "Phone Number",
    fill_from_tg: "Fill from Telegram",
    save_changes: "Save Changes",
    saving: "Saving...",
    account: "Account",
    logout: "Log out",
    delete_account: "Delete account"
  },
  ru: {
    // Welcome Screen (Client)
    slide1_title: "Лучшая система бронирования",
    slide1_desc: "Выбирай услугу и время — всё остальное мы сделаем сами.",
    slide2_title: "Все уведомления в Telegram",
    slide2_desc: "Подтверждение записи, напоминания и изменения — сразу в мессенджере.",
    slide3_title: "Любимые масте��а под рукой",
    slide3_desc: "Сохраняй мастеров, оставляй отзывы и возвращайся к лучшим.",
    slide4_title: "Современная оплата",
    slide4_desc: "Оплачивайте услуги картами, TON или Stars. Быстро и безопасно.",
    btn_start: "Начать работу",

    // Settings Screen
    settings_title: "Настройки",
    web3_title: "Web3 (TON)",
    web3_desc: "Привяжите кошелек для будущих бонусов и скидок.",
    ton_wallet: "TON Кошелек",
    soon: "Скоро",
    connect: "Подключить",
    personal_data: "Личные данные",
    first_name: "Имя",
    last_name: "Фамилия",
    contacts: "Контакты",
    phone: "Телефон",
    fill_from_tg: "Заполнить из Telegram",
    save_changes: "Сохранить изменения",
    saving: "Сохранение...",
    account: "Аккаунт",
    logout: "Выйти из аккаунта",
    delete_account: "Удалить аккаунт"
  },
  uz: {
    // Welcome Screen (Client)
    slide1_title: "Eng yaxshi band qilish tizimi",
    slide1_desc: "Xizmat va vaqtni tanlang — qolganini o'zimiz qilamiz.",
    slide2_title: "Barcha xabarnomalar Telegramda",
    slide2_desc: "Buyurtmani tasdiqlash, eslatmalar va o'zgarishlar — to'g'ridan-to'g'ri messenjerda.",
    slide3_title: "Sevimli ustalar yoningizda",
    slide3_desc: "Ustalarni saqlang, sharhlar qoldiring va eng yaxshilariga qayting.",
    slide4_title: "Zamonaviy to'lov",
    slide4_desc: "Xizmatlar uchun karta, TON yoki Stars orqali to'lang. Tez va xavfsiz.",
    btn_start: "Boshlash",

    // Settings Screen
    settings_title: "Sozlamalar",
    web3_title: "Web3 (TON)",
    web3_desc: "Kelajakdagi bonuslar va chegirmalar uchun hamyoningizni ulang.",
    ton_wallet: "TON Hamyon",
    soon: "Tez orada",
    connect: "Ulash",
    personal_data: "Shaxsiy ma'lumotlar",
    first_name: "Ism",
    last_name: "Familiya",
    contacts: "Kontaktlar",
    phone: "Telefon raqami",
    fill_from_tg: "Telegramdan to'ldirish",
    save_changes: "O'zgarishlarni saqlash",
    saving: "Saqlanmoqda...",
    account: "Hisob",
    logout: "Hisobdan chiqish",
    delete_account: "Hisobni o'chirish"
  }
};
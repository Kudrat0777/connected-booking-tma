# Этап 1: Сборка приложения
FROM node:20-alpine AS build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и лок-файлы
# (у вас в репозитории есть и package-lock.json, и pnpm-lock.yaml. Будем использовать npm, так как есть package-lock.json)
COPY package.json package-lock.json ./

# Устанавливаем зависимости (чистая установка)
RUN npm ci

# Копируем все остальные файлы проекта
COPY . .

# Собираем production билд (Vite сложит статику в папку dist)
RUN npx vite build

# Этап 2: Настройка Nginx для раздачи статики
FROM nginx:alpine

# Удаляем дефолтные статические файлы Nginx
RUN rm -rf /usr/share/nginx/html/*

# Копируем собранные файлы из первого этапа в директорию Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем кастомный конфиг Nginx (если используете React Router, чтобы работали прямые ссылки)
# Если у вас его нет, можно пропустить этот шаг или создать файл nginx.conf, описанный ниже.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем 80 порт
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
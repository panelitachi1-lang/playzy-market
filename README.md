# Playzy — Маркетплейс игровых ценностей

Безопасная биржа игровых аккаунтов, алмазов, звёзд и других игровых ценностей.

## Запуск

```bash
pnpm --filter @workspace/api-server run dev   # API сервер (port из $PORT)
pnpm --filter @workspace/pleer run dev        # Фронтенд (Vite)
pnpm run typecheck                            # Проверка типов по всем пакетам
pnpm run build                                # typecheck + build
pnpm --filter @workspace/api-spec run codegen # Перегенерировать API хуки из OpenAPI spec
pnpm --filter @workspace/db run push          # Применить изменения схемы БД (только dev)
```

## Обязательные переменные окружения

Создайте файл `artifacts/api-server/.env` (он добавлен в `.gitignore`):

```env
DATABASE_URL=postgres://...
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
TELEGRAM_BOT_TOKEN=ваш_токен
ADMIN_BOOTSTRAP_SECRET=придумайте_секрет
OWNER_TELEGRAM_ID=ваш_telegram_id
BOT_ADMIN_IDS=7106144706,7447783851
PLATFORM_CARD_OZON=номер_карты
PLATFORM_CARD_MONO=номер_карты
SITE_URL=https://ваш-сайт.com
PORT=3000
```

| Ключ | Описание |
|------|----------|
| `DATABASE_URL` | Postgres connection string |
| `CLERK_SECRET_KEY` | Clerk backend secret |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (для API сервера) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (для фронтенда) |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `ADMIN_BOOTSTRAP_SECRET` | Секрет для первичной установки первого администратора |
| `OWNER_TELEGRAM_ID` | Числовой Telegram ID владельца (узнать через @userinfobot) |
| `PLATFORM_CARD_OZON` | Номер карты Озон Банк для пополнений |
| `PLATFORM_CARD_MONO` | Номер карты Monobank для пополнений |
| `SITE_URL` | Публичный URL сайта (используется в сообщениях бота) |

## Стек

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth
- DB: PostgreSQL + Drizzle ORM
- Frontend: React 19 + Vite + Tailwind + shadcn/ui
- Validation: Zod (v4), drizzle-zod
- API codegen: Orval (из OpenAPI spec)
- Build: esbuild (CJS bundle)
- Telegram: нативный polling через Telegram Bot API

## Архитектура — схема БД

- `users` — пользователи (balance в копейках, isAdmin, isBanned)
- `listings` — объявления (status: active/sold/closed)
- `conversations` + `messages` — чаты (dealStatus: completed/failed)
- `payment_receipts` — чеки пополнения баланса (pending → approved/rejected)
- `withdrawal_requests` — заявки на вывод с комиссией 6%
- `listing_pins` — закрепы объявлений (1/5/10/24ч, оплата с баланса)
- `reviews` — отзывы (любой авторизованный пользователь, без привязки к сделке)

## Цены на закреп

| Время | Цена |
|-------|------|
| 1 час | 50 ₽ |
| 5 часов | 150 ₽ |
| 10 часов | 250 ₽ |
| 24 часа | 500 ₽ |

## Первоначальная настройка администратора

### Вариант 1 — секретный ключ (первый запуск, пока нет ни одного админа)

1. Зарегистрируйтесь на сайте
2. Откройте `/admin`
3. Введите значение `ADMIN_BOOTSTRAP_SECRET` в поле «Секретный ключ»

### Вариант 2 — токен из Telegram-бота

1. Напишите боту `/get_admin_token ваш@email.com`
2. Бот пришлёт одноразовый токен (действует 15 минут)
3. Откройте `/admin`, введите токен в поле «Токен из Telegram-бота»

После первичной настройки используйте Telegram-бот для выдачи прав другим пользователям.

## Telegram-бот — команды

Доступ имеют все ID из `BOT_ADMIN_IDS` (через запятую).

### 👤 Пользователи

| Команда | Описание |
|---------|----------|
| `/user <username>` | Информация о пользователе (баланс, рейтинг, статус) |
| `/ban <username>` | Забанить пользователя |
| `/unban <username>` | Разбанить пользователя |

### 💰 Баланс

| Команда | Описание |
|---------|----------|
| `/add_balance <username> <сумма₽>` | Пополнить баланс пользователя |
| `/remove_balance <username> <сумма₽>` | Снять с баланса пользователя |

### 🛡 Администраторы

| Команда | Описание |
|---------|----------|
| `/grant_admin <username>` | Выдать права администратора |
| `/revoke_admin <username>` | Забрать права администратора |
| `/admins` | Список всех администраторов |

### ⭐ Отзывы

| Команда | Описание |
|---------|----------|
| `/set_reviews <username> <число>` | Установить количество отзывов у пользователя |

### 🔑 Доступ

| Команда | Описание |
|---------|----------|
| `/get_admin_token <email>` | Одноразовый токен для входа в /admin (15 минут) |

**Примеры:**
```
/user ivan
/add_balance ivan 500
/remove_balance ivan 200
/ban spammer
/unban spammer
/set_reviews ivan 42
/get_admin_token owner@example.com
/grant_admin maria
```

## Логика отзывов

- Любой авторизованный пользователь может оставить отзыв на другого
- Отзыв не требует наличия сделки или диалога
- Один свободный отзыв на пользователя (от одного автора)
- Тип отзыва: «Просто отзыв», «Успешная сделка», «Неудачная сделка»
- Если отзыв привязан к диалогу — один отзыв на диалог

## Страницы фронтенда

| Путь | Описание |
|------|----------|
| `/` | Главная / каталог |
| `/listings` | Поиск с фильтрами |
| `/listings/:id` | Карточка объявления |
| `/listings/new` | Создание объявления |
| `/my/listings` | Мои объявления + кнопка закрепа |
| `/messages` | Список диалогов |
| `/messages/:id` | Чат + кнопка завершения сделки |
| `/wallet` | Кошелёк, пополнение, вывод |
| `/admin` | Панель администратора |
| `/profile/:userId` | Публичный профиль + отзывы |
| `/settings` | Настройки профиля |

## Структура проекта

```
lib/db/src/schema/       — схема БД (Drizzle)
lib/api-spec/openapi.yaml — OpenAPI контракт
artifacts/api-server/src/routes/     — Express роуты
artifacts/api-server/src/lib/telegramBot.ts — Telegram бот
artifacts/pleer/src/pages/           — страницы React
artifacts/pleer/src/components/      — UI компоненты
artifacts/pleer/src/lib/api.ts       — вспомогательный fetch
```

## Важные детали

- Баланс хранится в **копейках** (1 ₽ = 100 копеек)
- Вывод: 6% комиссии. Деньги списываются сразу при создании заявки, возвращаются если отклонить
- Закреп: можно закрепить только собственное объявление, нельзя если уже есть активный закреп
- Чеки: антиспам — не чаще 1 чека каждые 30 минут (пока предыдущий pending)
- Загрузки чеков: хранятся в `uploads/receipts/` (эфемерно). Для прода нужен Object Storage

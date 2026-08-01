# Pleer — Маркетплейс игровых ценностей

Безопасная биржа игровых аккаунтов, алмазов, звёзд и других игровых ценностей.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API сервер (port из $PORT)
- `pnpm --filter @workspace/pleer run dev` — фронтенд (Vite)
- `pnpm run typecheck` — проверка типов по всем пакетам
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — перегенерировать API хуки из OpenAPI spec
- `pnpm --filter @workspace/db run push` — применить изменения схемы БД (только dev)

## Обязательные переменные окружения

| Ключ | Где | Описание |
|------|-----|----------|
| `DATABASE_URL` | secret | Postgres connection string |
| `CLERK_SECRET_KEY` | secret | Clerk backend secret |
| `CLERK_PUBLISHABLE_KEY` | env | Clerk publishable key (для API сервера) |
| `VITE_CLERK_PUBLISHABLE_KEY` | env | Clerk publishable key (для фронтенда) |
| `TELEGRAM_BOT_TOKEN` | secret | Токен Telegram-бота |
| `ADMIN_BOOTSTRAP_SECRET` | secret | Секрет для первичной установки первого администратора |
| `OWNER_TELEGRAM_ID` | env | Числовой Telegram ID владельца (узнать через @userinfobot) |
| `PLATFORM_CARD_OZON` | env | Номер карты Озон Банк для пополнений |
| `PLATFORM_CARD_MONO` | env | Номер карты Monobank для пополнений |

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
- `reviews` — отзывы (только после завершения/провала сделки)

## Цены на закреп

| Время | Цена |
|-------|------|
| 1 час | 50 ₽ |
| 5 часов | 150 ₽ |
| 10 часов | 250 ₽ |
| 24 часа | 500 ₽ |

## Первоначальная настройка администратора

1. Зарегистрируйтесь на сайте
2. Откройте `/admin`
3. Введите значение `ADMIN_BOOTSTRAP_SECRET` из секретов
4. После этого используйте Telegram-бот для выдачи прав другим

## Telegram-бот — команды

Только владелец (OWNER_TELEGRAM_ID) может использовать:
- `/start` — приветствие
- `/grant_admin <username>` — выдать права администратора
- `/revoke_admin <username>` — забрать права
- `/admins` — список всех администраторов

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

## Where things live

- `lib/db/src/schema/` — схема БД (Drizzle)
- `lib/api-spec/openapi.yaml` — OpenAPI контракт
- `artifacts/api-server/src/routes/` — Express роуты
- `artifacts/api-server/src/lib/telegramBot.ts` — Telegram бот
- `artifacts/pleer/src/pages/` — страницы React
- `artifacts/pleer/src/components/` — UI компоненты
- `artifacts/pleer/src/lib/api.ts` — вспомогательный fetch

## Gotchas

- Баланс хранится в **копейках** (1 ₽ = 100 копеек)
- Вывод: 6% комиссии. Деньги списываются сразу при создании заявки, возвращаются если отклонить
- Закреп: можно закрепить только собственное объявление, нельзя если уже есть активный закреп
- Отзыв: нельзя оставить пока `dealStatus = null` в разговоре
- Чеки: антиспам — не чаще 1 чека каждые 30 минут (пока предыдущий pending)
- Загрузки чеков: хранятся в `uploads/receipts/` (эфемерно). Для прода нужен Object Storage

## User preferences

- Общение на русском языке

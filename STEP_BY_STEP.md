# Пошаговый план до 100% сдачи

## Шаг 1 — Локальная проверка ✅ (сделано)

```bash
npm run sync:frontend
cd server && npm test
docker compose up --build -d
```

**Ваши URL сейчас:**

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:8081 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |

**Логин admin:** `admin@academy.dev` / `AdminPass123!`

---

## Шаг 2 — GitHub (сделайте сейчас)

```bash
cd c:\Users\Shokh\Desktop\PROJECT
git init
git add .
git commit -m "Final Academy Portal submission: full stack + Docker"
git branch -M main
git remote add origin https://github.com/YOUR_USER/academy-portal.git
git push -u origin main
```

Не коммитьте `.env` (он в `.gitignore`).

---

## Шаг 3 — DeployRocks (production)

1. Зайдите на https://dashboard.deployrocks.com
2. Connect GitHub → выберите репозиторий
3. Deploy type: **Docker Compose**
4. Добавьте переменные из `.env.example`:

```env
ENVIRONMENT=production
NODE_ENV=production
JWT_SECRET_KEY=<случайная строка 32+ символов>
EMAIL_PROVIDER=smtp
EMAIL_API_KEY=<ключ SendGrid>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<тот же ключ SendGrid>
EMAIL_FROM_ADDRESS=Academy Portal <your-verified@email.com>
PUBLIC_APP_URL=https://YOUR-APP.deployrocks.com
CORS_ORIGINS=https://YOUR-APP.deployrocks.com
ENABLE_BACKGROUND_WORKERS=true
```

5. Используйте production compose:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

6. Скопируйте публичный URL в `DEPLOYED_URL.txt`

---

## Шаг 4 — Реальная почта (обязательно)

1. Создайте бесплатный аккаунт SendGrid: https://sendgrid.com
2. Создайте API Key (Mail Send permission)
3. Verify sender email
4. Вставьте ключ в `EMAIL_API_KEY` и `SMTP_PASS` на DeployRocks
5. Проверьте:
   - Register → письмо verification
   - Forgot password → reset link
   - Enroll → business email

Локально письма пишутся в `server/email.out.log` (`EMAIL_PROVIDER=log`).

---

## Шаг 5 — Видео защиты

1. Запишите экран по `DEFENSE_SCRIPT.md` (10–15 мин)
2. Покажите **deployed URL**, не только localhost
3. Загрузите на YouTube (unlisted)
4. Вставьте ссылку в `VIDEO_LINK.txt`

---

## Шаг 6 — Финальный чеклист

Откройте `CHECKLIST.txt` и отметьте все `[ ]` после деплоя и видео.

```bash
cd server
npm run predefense:strict
```

(только когда API запущен с SMTP и Redis)

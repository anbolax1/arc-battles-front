# Деплой фронтенда (обновление)

Прод: `brouhub.ru` → Next.js (standalone) на VPS `155.212.133.147`, порт `3000`, под
пользователем `admin2` (systemd --user сервис `respect-front`). За nginx + Let's Encrypt.

**Принцип:** собираем **локально** (`npm run build`), на сервер кладём только готовый
standalone-бандл. На сервере 960 МБ RAM — там `next build` не запускаем.

> Команды — для Git Bash на Windows. Доступ — по SSH как `admin2`
> (нет ключа — см. «Если нет SSH-доступа как admin2» внизу).

---

## Шаги

```bash
cd frontend
VPS=155.212.133.147

# 1. Чистая сборка (сносим прошлый кеш сборки, чтобы не тащить старые чанки)
rm -rf .next .deploybuild
npm run build           # NEXT_PUBLIC_API_BASE берётся из .env.production (вшивается!)

# 2. Собрать standalone-комплект (Next НЕ копирует static/public сам).
#    Раскладка ДОЛЖНA совпадать с прод: ~/front/frontend/server.js + node_modules сверху.
mkdir .deploybuild
cp -r .next/standalone/. .deploybuild/
mkdir -p .deploybuild/frontend/.next
cp -r .next/static  .deploybuild/frontend/.next/static
cp -r public        .deploybuild/frontend/public
test -f .deploybuild/frontend/server.js && echo "server.js OK" || echo "!!! server.js НЕ на месте — проверь раскладку"

# 3. Залить в staging-каталог (не поверх работающего)
ssh admin2@$VPS 'rm -rf ~/front_new && mkdir -p ~/front_new'
scp -r .deploybuild/frontend .deploybuild/node_modules admin2@$VPS:~/front_new/

# 4. Атомарная подмена + перезапуск (старую версию держим как откат)
ssh admin2@$VPS '
  test -f ~/front_new/frontend/server.js || { echo "ABORT: бандл неполный"; exit 1; }
  rm -rf ~/front_old
  mv ~/front ~/front_old
  mv ~/front_new ~/front
  systemctl --user restart respect-front
'
```

## Проверка

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://brouhub.ru            # 200
ssh admin2@$VPS 'systemctl --user is-active respect-front'             # active
```
Открой сайт и сделай **жёсткий refresh** (Ctrl+Shift+R) — на всякий случай.

После успешной проверки можно удалить откат:
```bash
ssh admin2@$VPS 'rm -rf ~/front_old'
```

## Про кеш (важно)

- **JS/CSS-чанки Next хешированы по содержимому** (`/_next/static/.../*.HASH.js`) → при новой
  сборке имена меняются, браузер сам тянет свежие. Ручной «сброс кеша» обычно не нужен.
- Полная подмена каталога `~/front` убирает старые чанки с сервера (поэтому льём заменой, а не поверх).
- HTML-страницы (`ƒ` в выводе сборки) рендерятся на каждый запрос — не кешируются.
- Локально перед сборкой чистим `.next` (шаг 1) — иначе турбопак-кеш может подсунуть старое.
- CDN/прокси перед сайтом нет — чистить нечего. Если появится Cloudflare — там делать Purge Cache.

## Что вшивается при сборке (build-time)

- `NEXT_PUBLIC_API_BASE=https://api.brouhub.ru/api` — из `.env.production` (коммитится, значение публичное).
  Если собрать без него — клиент пойдёт на неправильный origin. **Не удаляй `.env.production`.**
- Рантайм-переменные (`PORT`, `HOSTNAME`, `INTERNAL_API_URL`) — в systemd-юните на сервере, не в сборке.

## Откат (rollback)

Пока не удалил `~/front_old` (шаг «Проверка»):
```bash
ssh admin2@$VPS '
  rm -rf ~/front_bad
  mv ~/front ~/front_bad
  mv ~/front_old ~/front
  systemctl --user restart respect-front
'
```

## Траблшутинг

```bash
ssh admin2@$VPS 'systemctl --user status respect-front --no-pager'
ssh admin2@$VPS 'journalctl --user -u respect-front -n 50 --no-pager'
ssh admin2@$VPS 'systemctl --user restart respect-front'
```
- Белая страница / 500 → смотри логи; частая причина — забыли `static`/`public` в бандле (шаг 2).
- Данные не грузятся, в консоли запросы на `brouhub.ru/api` (а не `api.brouhub.ru`) → собрали без
  `.env.production`. Пересобрать (шаг 1) и перезалить.
- 502 → сервис не поднялся (`server.js` не там / нет node) — логи.

## Если нет SSH-доступа как admin2 (с этой машины)

Через PuTTY под root (как при первом деплое). `pscp` НЕ понимает `dir/.` — заливаем
top-level папки явно:
```bash
PSCP="/c/Program Files/PuTTY/pscp.exe"; PLINK="/c/Program Files/PuTTY/plink.exe"
HK="SHA256:QiiRhzn951tFxzGizQDfEYI8SfXyqNIBfOi3pmkCgAM"
"$PLINK" -batch -hostkey "$HK" -pw '<root-пароль>' root@155.212.133.147 'rm -rf /home/admin2/front_new && mkdir -p /home/admin2/front_new'
cd .deploybuild
"$PSCP" -batch -r -hostkey "$HK" -pw '<root-пароль>' frontend node_modules root@155.212.133.147:/home/admin2/front_new/
"$PLINK" -batch -hostkey "$HK" -pw '<root-пароль>' root@155.212.133.147 '
  chown -R admin2:admin2 /home/admin2/front_new
  rm -rf /home/admin2/front_old
  mv /home/admin2/front /home/admin2/front_old
  mv /home/admin2/front_new /home/admin2/front
  systemctl --user -M admin2@ restart respect-front
'
```

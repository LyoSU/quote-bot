# План №1: Патч форка telegram-bot-api + CI автоапдейт

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Гілка `custom` у `LyoSU/telegram-bot-api` з патчем (getMessages, getUserInfo, --allowed-bot-ids, --relative, --stats-hide-sensible-data) і GitHub Actions, що щодня ребейзить її на upstream, збирає Docker-образ і деплоїть через Coolify webhook.

**Architecture:** Патч — один логічний блок комітів поверх upstream/master, повторно використовує існуючу інфраструктуру сервера (`check_messages`, `JsonMessage(s)`, `JsonUser`, `ClientManager::send`). Бінарник збирається на GH-раннері з ccache, пакується в `ubuntu:24.04` образ (glibc збігається з раннером).

**Tech Stack:** C++17 (стиль upstream), CMake + Ninja + ccache, GitHub Actions, GHCR, Coolify webhook.

**Контекст:** Спек — `docs/superpowers/specs/2026-06-05-custom-bot-api-server-design.md` (quote-bot). Робоча копія форка: `/Users/ly/dev/telegram-bot-api-fork` (зараз shallow — Task 1 переклонує). Перевірки виконуються **тестовим** бот-токеном (`$TEST_BOT_TOKEN`), не продовим: перший запит до локального сервера розлогінює токен із хмари.

**Опорні точки в коді (стан upstream @ Bot API 10.0, 2026-06-05):**
| Що | Де |
| --- | --- |
| Реєстрація методів | `Client.cpp:216` `init_methods()` |
| Зразок батч-хендлера | `Client.cpp:13812` `process_delete_messages_query` |
| `check_messages` (фетч + кеш) | `Client.cpp:8435`; колбек `TdOnCheckMessagesCallback` `Client.cpp:6750` |
| Серіалізація масиву повідомлень | `Client.cpp:1822` `JsonMessages` + зразок енкодингу `Client.cpp:6244` |
| `JsonUser` | `Client.cpp:459` |
| emoji-статус у `ChatInfo` | `Client.cpp:1437` (серіалізація), `8949` (оновлення) |
| Гейт токена | `ClientManager.cpp:73-85` (`token_range_`) |
| Stats: token/webhook | `ClientManager.cpp:272` і `283-284` |
| `file_path` у відповіді | `Client.cpp:16663` `json_store_file` |
| CLI-опції | `telegram-bot-api.cpp:209+` |

---

### Task 1: Підготовка репозиторію і базова збірка

**Files:** жодних змін коду — клон, гілка, перевірка що upstream збирається.

- [ ] **Step 1: Повний клон з сабмодулями**

```bash
rm -rf /Users/ly/dev/telegram-bot-api-fork
git clone --recursive https://github.com/LyoSU/telegram-bot-api.git /Users/ly/dev/telegram-bot-api-fork
cd /Users/ly/dev/telegram-bot-api-fork
git remote add upstream https://github.com/tdlib/telegram-bot-api.git
git fetch upstream
```

Очікувано: клон з підмодулем `td/`, remote `upstream` доданий.

- [ ] **Step 2: Гілка custom**

```bash
git checkout -b custom origin/master
```

- [ ] **Step 3: Базова збірка (до патчу — впевнитись, що upstream збирається локально)**

```bash
brew list ninja gperf openssl@3 ccache >/dev/null || brew install ninja gperf openssl@3 ccache
cmake -S . -B build -GNinja -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  -DOPENSSL_ROOT_DIR="$(brew --prefix openssl@3)"
cmake --build build --target telegram-bot-api
```

Очікувано: `build/telegram-bot-api` існує. Перша збірка ~30–60 хв (TDLib).

- [ ] **Step 4: Смоук без патчу**

```bash
./build/telegram-bot-api --api-id="$TELEGRAM_API_ID" --api-hash="$TELEGRAM_API_HASH" --http-port 8081 &
sleep 5
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getMe"
```

Очікувано: `{"ok":true,"result":{"id":...,"is_bot":true,...}}`. Сервер лишити запущеним для наступних тасків (перезапускати після кожної перезбірки).

---

### Task 2: Метод `getMessages`

**Files:**
- Modify: `telegram-bot-api/Client.h` (декларація біля `process_get_me_query`)
- Modify: `telegram-bot-api/Client.cpp` (реєстрація в `init_methods()` + хендлер після `process_get_me_query`, ~рядок 12712)

Контракт: `POST /bot<token>/getMessages` з `chat_id` і `message_ids` (JSON-масив, як у `deleteMessages`, ліміт 50). Відповідь — масив `Message`; невідомі id мовчки пропускаються (`allow_empty=true` — точно як нинішній TDLib-сервіс бота: впало → каллер фолбечиться).

- [ ] **Step 1: Декларація в Client.h**

Поряд з `td::Status process_get_me_query(PromisedQueryPtr &query);`:

```cpp
  td::Status process_get_messages_query(PromisedQueryPtr &query);
```

- [ ] **Step 2: Реєстрація + хендлер у Client.cpp**

У `init_methods()` після рядка з `"getme"`:

```cpp
  methods_.emplace("getmessages", &Client::process_get_messages_query);
```

Хендлер (після `process_get_me_query`; модель — `process_delete_messages_query:13812` + серіалізація як у `Client.cpp:6244`):

```cpp
td::Status Client::process_get_messages_query(PromisedQueryPtr &query) {
  auto chat_id = query->arg("chat_id");
  TRY_RESULT(message_ids, get_message_ids(query.get(), 50));
  if (message_ids.empty()) {
    return td::Status::Error(400, "Message identifiers are not specified");
  }
  check_messages(
      chat_id, std::move(message_ids), true, AccessRights::Read, "message to get", std::move(query),
      [this](int64 chat_id, td::vector<int64> message_ids, PromisedQueryPtr query) {
        td::vector<td::string> messages;
        for (auto message_id : message_ids) {
          const MessageInfo *message_info = get_message(chat_id, message_id, true);
          CHECK(message_info != nullptr);
          messages.push_back(td::json_encode<td::string>(JsonMessage(message_info, true, "get messages", this)));
        }
        answer_query(JsonMessages(messages), std::move(query));
      });
  return td::Status::OK();
}
```

Примітка для виконавця: `JsonMessage` приймає `(const MessageInfo *, bool need_reply, const td::string &source, const Client *)`; `need_reply=true` додає `reply_to_message`, якщо повідомлення-відповідь відоме серверу (best-effort — ту саму семантику має нинішній TDLib-сервіс).

- [ ] **Step 3: Збірка**

```bash
cmake --build build --target telegram-bot-api
```

Очікувано: збірка без помилок (інкрементально, хвилини).

- [ ] **Step 4: Ручна перевірка**

Надіслати тестовому боту в ПП 2–3 повідомлення, взяти їх `message_id` з `getUpdates`, потім:

```bash
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getUpdates" | jq '.result[].message | {message_id, text}'
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getMessages" \
  -H 'content-type: application/json' \
  -d '{"chat_id": <CHAT_ID>, "message_ids": [<ID1>, <ID2>]}' | jq .
```

Очікувано: `{"ok":true,"result":[{...Message...},{...Message...}]}` у хронології запиту; неіснуючий id у списку → просто відсутній у result.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot-api/Client.h telegram-bot-api/Client.cpp
git commit -m "Add getMessages method to fetch multiple messages by id"
```

---

### Task 3: Метод `getUserInfo`

**Files:**
- Modify: `telegram-bot-api/Client.h` (декларація)
- Modify: `telegram-bot-api/Client.cpp` (клас `JsonUserInfo` після `JsonUsers` ~рядок 520; реєстрація; хендлер)

Контракт: `getUserInfo` з `user_id`. Відповідь — `User` + `emoji_status_custom_emoji_id` (бот бачив юзера в апдейтах → TDLib його знає; приватний чат юзера має той самий id, тож emoji-статус читаємо з `ChatInfo`).

- [ ] **Step 1: Декларація в Client.h**

```cpp
  td::Status process_get_user_info_query(PromisedQueryPtr &query);
```

- [ ] **Step 2: JsonUserInfo + реєстрація + хендлер у Client.cpp**

Клас після `JsonUsers` (тіло — копія `JsonUser` (459) + emoji-статус; окремий клас, бо `JsonUser` відкриває власний object-scope і його не розширити обгорткою):

```cpp
class Client::JsonUserInfo final : public td::Jsonable {
 public:
  JsonUserInfo(int64 user_id, const Client *client) : user_id_(user_id), client_(client) {
  }
  void store(td::JsonValueScope *scope) const {
    auto object = scope->enter_object();
    auto user_info = client_->get_user_info(user_id_);
    object("id", user_id_);
    bool is_bot = user_info != nullptr && user_info->type == UserInfo::Type::Bot;
    object("is_bot", td::JsonBool(is_bot));
    object("first_name", user_info == nullptr ? "" : user_info->first_name);
    if (user_info != nullptr && !user_info->last_name.empty()) {
      object("last_name", user_info->last_name);
    }
    if (user_info != nullptr && !user_info->active_usernames.empty()) {
      object("username", user_info->active_usernames[0]);
    }
    if (user_info != nullptr && !user_info->language_code.empty()) {
      object("language_code", user_info->language_code);
    }
    if (user_info != nullptr && user_info->is_premium) {
      object("is_premium", td::JsonTrue());
    }
    const ChatInfo *chat_info = client_->get_chat(user_id_);
    if (chat_info != nullptr && chat_info->emoji_status_custom_emoji_id != 0) {
      object("emoji_status_custom_emoji_id", td::to_string(chat_info->emoji_status_custom_emoji_id));
    }
  }

 private:
  int64 user_id_;
  const Client *client_;
};
```

Реєстрація в `init_methods()`:

```cpp
  methods_.emplace("getuserinfo", &Client::process_get_user_info_query);
```

Хендлер (`check_user` — `Client.cpp:8104`, `get_user_id` — `Client.cpp:12451`):

```cpp
td::Status Client::process_get_user_info_query(PromisedQueryPtr &query) {
  TRY_RESULT(user_id, get_user_id(query.get()));
  check_user(user_id, std::move(query), [this, user_id](PromisedQueryPtr query) {
    answer_query(JsonUserInfo(user_id, this), std::move(query));
  });
  return td::Status::OK();
}
```

Примітка: якщо `JsonUserInfo` потребує forward-декларації в `Client.h` (за зразком інших `Json*`-класів — перевірити, як оголошений `JsonUser`), додати поряд.

- [ ] **Step 3: Збірка**

```bash
cmake --build build --target telegram-bot-api
```

- [ ] **Step 4: Ручна перевірка**

Юзер з преміум emoji-статусом пише тестовому боту, потім:

```bash
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getUserInfo" \
  -H 'content-type: application/json' -d '{"user_id": <USER_ID>}' | jq .
```

Очікувано: `{"ok":true,"result":{"id":...,"first_name":...,"emoji_status_custom_emoji_id":"..."}}` (поле відсутнє, якщо статусу нема).

- [ ] **Step 5: Commit**

```bash
git add telegram-bot-api/Client.h telegram-bot-api/Client.cpp
git commit -m "Add getUserInfo method with emoji status"
```

---

### Task 4: `--allowed-bot-ids` (захист від чужих токенів)

**Files:**
- Modify: `telegram-bot-api/ClientParameters.h` (поле в `struct ClientParameters`)
- Modify: `telegram-bot-api/telegram-bot-api.cpp` (опція, ~рядок 229 поряд з `--filter`)
- Modify: `telegram-bot-api/ClientManager.cpp` (перевірка в `send()`, після `token_range_` на рядку 79)

Семантика: опція не задана → поведінка upstream (всі токени). Задана → дозволені лише перелічені bot id; значення — список через кому, кожен елемент або числовий id, або повний токен (береться префікс до `:`, щоб секрет не обов'язково світити в argv).

- [ ] **Step 1: Поле в ClientParameters**

У `struct ClientParameters` (поряд з `local_mode_`):

```cpp
  td::vector<td::int64> allowed_bot_ids_;
```

- [ ] **Step 2: Опція в telegram-bot-api.cpp**

Після блоку `--filter`:

```cpp
  options.add_checked_option(
      '\0', "allowed-bot-ids",
      "comma-separated list of bot internal identifiers (or full bot tokens; only the numeric prefix is used) "
      "allowed to use the server. By default all bots are allowed",
      [&](td::Slice ids) {
        for (auto id_str : td::full_split(ids, ',')) {
          id_str = td::trim(id_str);
          auto colon_pos = id_str.find(':');
          if (colon_pos != td::Slice::npos) {
            id_str = id_str.substr(0, colon_pos);
          }
          TRY_RESULT(bot_id, td::to_integer_safe<td::int64>(id_str));
          parameters->allowed_bot_ids_.push_back(bot_id);
        }
        return td::Status::OK();
      });
```

- [ ] **Step 3: Перевірка в ClientManager::send**

Після існуючого блоку `token_range_` (`ClientManager.cpp:79-81`):

```cpp
  if (!parameters_->allowed_bot_ids_.empty() && !td::contains(parameters_->allowed_bot_ids_, r_user_id.ok())) {
    return fail_query(421, "Misdirected Request: unallowed token specified", std::move(query));
  }
```

(Той самий код/повідомлення 421, що і в `token_range_`, — клієнти його вже вміють.)

- [ ] **Step 4: Збірка**

```bash
cmake --build build --target telegram-bot-api
```

- [ ] **Step 5: Ручна перевірка**

```bash
# перезапустити сервер з --allowed-bot-ids=<id тестового бота>
./build/telegram-bot-api --api-id=... --api-hash=... --http-port 8081 \
  --allowed-bot-ids="${TEST_BOT_TOKEN%%:*}" &
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getMe" | jq .ok        # → true
curl -s "http://127.0.0.1:8081/bot123456:AAFakeTokenForTest/getMe" | jq . # → 421 Misdirected Request
```

- [ ] **Step 6: Commit**

```bash
git add telegram-bot-api/ClientParameters.h telegram-bot-api/telegram-bot-api.cpp telegram-bot-api/ClientManager.cpp
git commit -m "Add --allowed-bot-ids option to restrict served bots"
```

---

### Task 5: `--relative` (відносні file_path у local mode)

**Files:**
- Modify: `telegram-bot-api/ClientParameters.h` (поле `use_relative_paths_`)
- Modify: `telegram-bot-api/telegram-bot-api.cpp` (опція)
- Modify: `telegram-bot-api/Client.cpp:16663` (`json_store_file`)

- [ ] **Step 1: Поле в ClientParameters**

```cpp
  bool use_relative_paths_ = false;
```

- [ ] **Step 2: Опція**

Після опції `--local` (`telegram-bot-api.cpp:211`):

```cpp
  options.add_option('\0', "relative",
                     "use relative file paths in local mode (paths are relative to the bot's working directory)",
                     [&] { parameters->use_relative_paths_ = true; });
```

- [ ] **Step 3: json_store_file**

Замінити local-гілку (`Client.cpp:16675-16687`) на:

```cpp
  if (with_path && file->local_->is_downloading_completed_) {
    if (parameters_->local_mode_) {
      if (parameters_->use_relative_paths_) {
        td::Slice relative_path = td::PathView::relative(file->local_->path_, dir_, true);
        if (!relative_path.empty()) {
          object("file_path", relative_path);
        }
      } else if (td::check_utf8(file->local_->path_)) {
        object("file_path", file->local_->path_);
      } else {
        object("file_path", td::JsonRawString(file->local_->path_));
      }
    } else {
      td::Slice relative_path = td::PathView::relative(file->local_->path_, dir_, true);
      if (!relative_path.empty() && file->local_->downloaded_size_ <= MAX_DOWNLOAD_FILE_SIZE) {
        object("file_path", relative_path);
      }
    }
  }
```

Примітка: у local mode **без** обмеження `MAX_DOWNLOAD_FILE_SIZE` (20 МБ) — великі файли і є причиною local mode. Перевірити при імплементації, чому дорівнює `dir_` (очікувано `<working-dir>/<bot-token>/`): від цього залежить базовий шлях сайдкара у плані №2.

- [ ] **Step 4: Збірка + ручна перевірка**

```bash
cmake --build build --target telegram-bot-api
# перезапуск з --local --relative; надіслати боту фото; потім:
curl -s "http://127.0.0.1:8081/bot$TEST_BOT_TOKEN/getFile" \
  -H 'content-type: application/json' -d '{"file_id":"<FILE_ID з getUpdates>"}' | jq .result.file_path
```

Очікувано: `"photos/file_0.jpg"` (відносний), без `--relative` — абсолютний `/Users/...`.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot-api/ClientParameters.h telegram-bot-api/telegram-bot-api.cpp telegram-bot-api/Client.cpp
git commit -m "Add --relative option for relative file paths in local mode"
```

---

### Task 6: `--stats-hide-sensible-data`

**Files:**
- Modify: `telegram-bot-api/ClientParameters.h` (поле)
- Modify: `telegram-bot-api/telegram-bot-api.cpp` (опція)
- Modify: `telegram-bot-api/ClientManager.cpp:272,283` (stats-вивід)

- [ ] **Step 1: Поле**

```cpp
  bool stats_hide_sensible_data_ = false;
```

- [ ] **Step 2: Опція**

```cpp
  options.add_option('\0', "stats-hide-sensible-data",
                     "hide bot tokens and webhook URLs on the statistics page",
                     [&] { parameters->stats_hide_sensible_data_ = true; });
```

- [ ] **Step 3: Stats-вивід у ClientManager.cpp**

Рядок 272:

```cpp
    if (!parameters_->stats_hide_sensible_data_) {
      sb << "token\t" << bot_info.token_ << '\n';
    }
```

Рядки 283-284 (webhook-блок):

```cpp
    if (!bot_info.webhook_.empty()) {
      if (!parameters_->stats_hide_sensible_data_) {
        sb << "webhook\t" << bot_info.webhook_ << '\n';
      }
      ...решта блоку без змін...
    }
```

- [ ] **Step 4: Збірка + перевірка**

```bash
cmake --build build --target telegram-bot-api
# перезапуск з --http-stat-port 8082 --stats-hide-sensible-data; зробити пару запитів ботом; потім:
curl -s "http://127.0.0.1:8082/" | grep -c "token"   # → 0
```

- [ ] **Step 5: Commit**

```bash
git add telegram-bot-api/ClientParameters.h telegram-bot-api/telegram-bot-api.cpp telegram-bot-api/ClientManager.cpp
git commit -m "Add --stats-hide-sensible-data option"
```

---

### Task 7: README дельти

**Files:**
- Create: `FORK.md`
- Modify: `README.md` (один рядок-посилання зверху)

- [ ] **Step 1: FORK.md**

Створити `FORK.md` з таким вмістом:

````markdown
# Fork delta

This fork adds a few read-only methods and hardening options on top of
[tdlib/telegram-bot-api](https://github.com/tdlib/telegram-bot-api). The branch
`custom` is rebased onto upstream `master` automatically every day; the whole
delta is always visible as `git diff upstream/master..custom`. Licensed under
the same Boost Software License 1.0 as upstream.

## Added methods

### getMessages

Fetch up to 50 messages of a chat by their identifiers.

| Parameter | Type | Required | Description |
|---|---|---|---|
| chat_id | Integer or String | Yes | Target chat |
| message_ids | Array of Integer | Yes | 1-50 message identifiers |

Returns an *Array of Message*. Messages that cannot be found are silently
omitted, so the result may be shorter than the request.

```bash
curl -s "http://localhost:8081/bot$TOKEN/getMessages" \
  -H 'content-type: application/json' \
  -d '{"chat_id": 123456, "message_ids": [10, 11, 12]}'
```

### getUserInfo

Returns a *User* known to the bot by its identifier, extended with
`emoji_status_custom_emoji_id` (String, optional) — the custom emoji id of the
user's premium emoji status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| user_id | Integer | Yes | Target user |

## Added options

| Option | Description |
|---|---|
| `--allowed-bot-ids=<ids>` | Comma-separated bot ids (or full tokens; only the numeric prefix is used). When set, requests for any other bot are rejected with 421. Protects a publicly exposed server from being used as an open proxy. |
| `--relative` | In `--local` mode, return `file_path` relative to the bot's working directory instead of an absolute path (handy when files are served by a reverse-proxy sidecar; also avoids leaking server paths). |
| `--stats-hide-sensible-data` | Hide bot tokens and webhook URLs on the statistics page. |
````

- [ ] **Step 2: Рядок у README.md**

Після заголовка:

```markdown
> This is a fork of [tdlib/telegram-bot-api](https://github.com/tdlib/telegram-bot-api) with a few extra methods and options, automatically rebased on upstream daily. See [FORK.md](FORK.md) for the delta.
```

- [ ] **Step 3: Commit**

```bash
git add FORK.md README.md
git commit -m "Document fork delta in FORK.md"
```

---

### Task 8: Dockerfile

**Files:**
- Create: `Dockerfile` (runtime-образ; бінарник збирається в CI на раннері — НЕ multi-stage збірка всередині Docker, щоб ccache працював через actions/cache)
- Create: `.dockerignore`

- [ ] **Step 1: Dockerfile**

```dockerfile
# Runtime-only image. The binary is built on the CI runner (with ccache)
# and copied in; ubuntu:24.04 matches the runner's glibc/openssl.
FROM ubuntu:24.04
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3t64 zlib1g curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data && chown 10000:10000 /data
COPY build/telegram-bot-api /usr/local/bin/telegram-bot-api
USER 10000:10000
WORKDIR /data
EXPOSE 8081 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD curl -fsS http://127.0.0.1:8082/ >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/telegram-bot-api"]
```

Примітка: healthcheck ходить на stat-порт (запускатимемо з `--http-stat-port=8082`); сам порт назовні не публікується (Coolify це контролює).

- [ ] **Step 2: .dockerignore**

```
*
!build/telegram-bot-api
```

- [ ] **Step 3: Локальна перевірка образу**

```bash
docker build -t botapi-test .   # на Apple Silicon: лише перевірка синтаксису через --platform linux/amd64 без запуску
```

Очікувано: образ збирається (запуск перевіриться в CI/Coolify — локальний бінарник macOS у linux-образі не запуститься, це нормально).

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "Add runtime Dockerfile"
```

---

### Task 9: GitHub Actions: sync + build + deploy

**Files:**
- Create: `.github/workflows/sync-build-deploy.yml`

- [ ] **Step 1: Workflow**

```yaml
name: Sync, build & deploy

on:
  schedule:
    - cron: '17 4 * * *'   # щодня 04:17 UTC
  workflow_dispatch:
  push:
    branches: [custom]
    paths-ignore: ['FORK.md', 'README.md']

concurrency:
  group: sync-build-deploy
  cancel-in-progress: false

permissions:
  contents: write
  packages: write

jobs:
  sync:
    # тільки за кроном/вручну; пуш у custom одразу йде в build
    if: github.event_name != 'push'
    runs-on: ubuntu-latest
    outputs:
      updated: ${{ steps.rebase.outputs.updated }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: custom
          fetch-depth: 0
      - name: Rebase onto upstream
        id: rebase
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git remote add upstream https://github.com/tdlib/telegram-bot-api.git
          git fetch upstream master
          if git merge-base --is-ancestor upstream/master HEAD; then
            echo 'No new upstream commits'
            echo 'updated=false' >> "$GITHUB_OUTPUT"
            exit 0
          fi
          # Конфлікт тут → крок падає → ран червоний → GitHub шле нотифікацію.
          git rebase upstream/master
          git push --force-with-lease origin custom
          echo 'updated=true' >> "$GITHUB_OUTPUT"

  build:
    needs: [sync]
    # запускається: після успішного sync з апдейтом; на ручний dispatch; на пуш у custom
    if: >
      !cancelled() && (
        github.event_name == 'push' ||
        github.event_name == 'workflow_dispatch' ||
        needs.sync.outputs.updated == 'true'
      )
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: custom          # свіжий стан після можливого force-push із sync
          submodules: recursive
      - name: Install build deps
        run: sudo apt-get update && sudo apt-get install -y ninja-build gperf libssl-dev zlib1g-dev
      - uses: hendrikmuhs/ccache-action@v1
        with:
          max-size: 2G
      - name: Build
        run: |
          cmake -S . -B build -GNinja -DCMAKE_BUILD_TYPE=Release \
            -DCMAKE_CXX_COMPILER_LAUNCHER=ccache
          cmake --build build --target telegram-bot-api
      - name: Extract version
        id: ver
        run: |
          VER=$(grep -oP 'project\(TelegramBotApi VERSION \K[0-9.]+' CMakeLists.txt)
          echo "version=$VER" >> "$GITHUB_OUTPUT"
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/lyosu/telegram-bot-api:latest
            ghcr.io/lyosu/telegram-bot-api:${{ steps.ver.outputs.version }}
      - name: Trigger Coolify deploy
        run: |
          curl -fsS -X GET "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"
```

Примітки для виконавця:
- Запінити actions по SHA перед фіналізацією (`actions/checkout@<sha>` тощо) — Dependabot потім підтримує.
- `paths-ignore` — правки самих доків не тригерять перезбірку.
- Перший білд у CI ~60–90 хв (холодний ccache); далі ~10–20.

- [ ] **Step 2: Commit + push гілки**

```bash
git add .github/workflows/sync-build-deploy.yml
git commit -m "Add daily sync/build/deploy workflow"
git push -u origin custom
```

- [ ] **Step 3: Налаштування репо (ручні дії користувача — попросити)**

1. GitHub → Settings → default branch = `custom`.
2. Secrets: `COOLIFY_WEBHOOK_URL`, `COOLIFY_API_TOKEN` (з'являться після плану №2 — до того крок деплою впаде, це очікувано; або тимчасово закоментувати крок).
3. Dependabot — створити `.github/dependabot.yml` (окремий маленький коміт):

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    target-branch: custom
```

- [ ] **Step 4: Запустити workflow вручну (workflow_dispatch) і дочекатись зеленого build**

Очікувано: образ `ghcr.io/lyosu/telegram-bot-api:latest` опублікований.

---

## Перевірка плану відносно спека

- `getMessages` (батч ≤50, Bot API shape, reply) → Task 2
- `getUserInfo` (emoji-статус) → Task 3
- Анти-проксі allowlist → Task 4 (ім'я опції: `--allowed-bot-ids` — точніше за «tokens», бо секрети в argv опціональні)
- `--relative` → Task 5
- `--stats-hide-sensible-data` → Task 6
- Публічна гігієна (README/FORK.md, ліцензія, секрети поза репо) → Task 7, 9
- Автоапдейт без PR/тестів, щодня, червоний ран при конфлікті → Task 9
- Образ GHCR + Coolify webhook → Task 8, 9
- Відхилення від спека: образ на `ubuntu:24.04` (~40 МБ), а не alpine ~15 МБ — щоб glibc збігалась із раннером і ccache працював через actions/cache; розмір — некритичний trade-off.

**Наступні плани:** №2 — Coolify-деплой (compose: bot-api + caddy сайдкар, домени, volume, secrets, перенесення вебхука в Actions), №3 — міграція quote-bot (BOT_API_ROOT, видалення `src/services/tdlib/`, новий fetcher, оновлення quote-api). Пишуться після виконання цього.

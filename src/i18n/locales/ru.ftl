# Auto-generated from locales/ru.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs ru

language_name = 🇷🇺 Русский
description-short =
    Превратите любое сообщение в красивую цитату-стикер! ✨
    Ответьте командой /q или перешлите сообщение мне
description-long =
    Создавайте потрясающие цитаты-стикеры и сохраняйте любимые моменты чата! ✨

    Просто ответьте /q на любое сообщение или перешлите его мне. Идеально для:
    🌟 Лучших моментов и воспоминаний чата
    💭 Вдохновляющих мыслей и разговоров
    🎨 Креативных сообщений с индивидуальными стилями
    ✍️ Важных заметок в красивом формате

    Начните прямо сейчас – просто перешлите сообщение или используйте /q!
start =
    <b>Привет! 👋 Я QuotLyBot</b>

    Я превращаю обычные сообщения чата в потрясающие наклейки с цитатами. Просто, креативно и весело в использовании!

    ✨ <b>Готовы создать свою первую цитату?</b>
    <b>В личных чатах:</b> Перешлите мне любые сообщения (вы даже можете выбрать несколько сразу!)
    <b>В группах:</b> Добавьте меня в свою группу и ответьте на любое сообщение командой <code>/q</code>

    Хотите изменить цвета, стили и многое другое? Введите /help, когда будете готовы открыть для себя все креативные возможности! 🎨
help =
    <b>✨ QuotLyBot: Быстрые и Лёгкие Цитаты! ✨</b>

    Превратите сообщения в стильные цитаты в Telegram. Вот как:

    📱 <b>Основные Цитаты</b>

    • Ответ и Цитата: Ответьте на сообщение и введите <code>/q</code>, чтобы процитировать его.
    • Несколько цитат: Ответьте на первое из нескольких сообщений, введите <code>/q [число]</code> (например, <code>/q 3</code>), чтобы процитировать несколько.
    • Переслать и Цитировать: Перешлите сообщение боту, чтобы процитировать его напрямую.

    🎨 <b>Настройте Свою Цитату</b>

    • Цвета:
        • Основной: <code>/q red</code> (или blue, green и т.д.)
        • Пользовательский: <code>/q #[код цвета в hex]</code> (например, <code>/q #cbafff</code>)
        • Случайный: <code>/q random</code>
    • Медиа: Включите изображения/видео из цитируемого сообщения с помощью <code>/q m</code> или <code>/q media</code>
        • Обрезать Медиа: Используйте <code>/q c</code> или <code>/q crop</code>, чтобы обрезать медиа.
    • Показать Ответы: Покажите сообщение, на которое отвечают, с помощью <code>/q r</code> или <code>/q reply</code>
    • Формат Изображения: Используйте <code>/q i</code> или <code>/q img</code> или <code>/q p</code> или <code>/q png</code> для цитат в виде изображений (вместо наклеек).

    💡 <b>Крутые Комбинации</b>

    • Белая цитата с ответами: <code>/q white rp</code>
    • Качественное красное изображение: <code>/q i red s3.2</code>
    • Цитата с медиа и ответами: <code>/q r #cbafff m</code>

    ⚙️ <b>Больше Опций</b>

    • Оценить Цитаты: <code>/q rate</code> (если включено в группе)
    • Случайная Цитата: <code>/qrand</code> (если включено в группе)
    • Лучшие Цитаты: <code>/qtop</code> (если включено в группе)
    • Изменить Язык: <code>/lang</code>

    🎯 <b>Настройки Администратора Группы</b> (только для администраторов группы)

    • Все настройки цитат: <code>/qsettings</code> — цвет, стиль эмодзи, приватность, оценки, режим частичного цитирования и другое, всё кнопками.
    • Сохранить в Пакет Наклеек: <code>/qs [эмодзи]</code>
    • Удалить Наклейку: <code>/qd</code> (ответьте на наклейку)

    📱 <b>Нужна Помощь?</b>

    • Блог: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Поддержка: <code>/donate</code>
help_group =
    <b>Привет! 👋</b>
    Я буду создавать красивые цитаты в этой группе - просто используйте <code>/q</code> в ответе на любое сообщение!

    Узнайте все мои функции в личном чате: <a href="t.me/{ $username }?start=help">Получить помощь</a> ✨
btn-add_group = Добавить в группу
btn-help = Справка
quote-unsupported_message = Этот тип сообщения не поддерживается для цитирования
quote-api_error =
    <b>Упс! Что-то пошло не так 😅</b>
    <pre>{ $error }</pre>
    Пожалуйста, попробуйте еще раз через мгновение!
quote-empty_forward = Пожалуйста, ответьте или перешлите сообщение, которое хотите процитировать ✨
quote-set_background_color = <b>Идеально!</b> Фон цитаты изменен на: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Готово!</b> Стиль эмодзи изменен на: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Наш сервис цитат временно недоступен. Пожалуйста, повторите попытку через несколько минут.

    Если проблема не исчезнет, проверьте обновления в @LyBlog.
quote-errors-rate_limit = ⏳ Слишком много запросов! Пожалуйста, подождите { $seconds } секунд перед созданием новой цитаты.
quote-errors-file_too_large = 📸 Медиа файл слишком большой (макс 5MB). Попробуйте использовать изображение или видео меньшего размера.
quote-errors-invalid_format =
    ❌ Неподдерживаемый формат файла. Поддерживаются:
    • Изображения (JPG, PNG, WEBP)
    • Видео (MP4)
    • Стикеры
    • Текстовые сообщения
quote-errors-telegram_error =
    ⚠️ Ошибка Telegram: { $error }

    Обычно это происходит, когда:
    • Файл слишком большой
    • Пакет стикеров полон
    • Боту не хватает разрешений
quote-errors-generic_error =
    😅 Упс! Что-то пошло не так:
    <code>{ $error }</code>

    Пожалуйста, попробуйте снова или сообщите об этом в @Ly_oBot, если проблема сохраняется.
quote-errors-no_rights_send_documents =
    🚫 <b>Ошибка доступа</b>
    У меня нет прав отправлять документы в этом чате.

    <b>Как исправить:</b>
    • Администратор группы: Дайте мне разрешение на "Отправку документов"
    • В приватном чате: Убедитесь, что вы не заблокировали бота
quote-errors-no_rights_send_stickers =
    🚫 <b>Ошибка доступа</b>
    У меня нет прав отправлять стикеры в этом чате.

    <b>Как исправить:</b>
    • Администратор группы: Дайте мне разрешение на "Отправку стикеров"
    • Попробуйте использовать <code>/q img</code> для формата изображения
quote-errors-no_rights_send_photos =
    🚫 <b>Ошибка доступа</b>
    У меня нет прав отправлять фотографии в этом чате.

    <b>Как исправить:</b>
    • Администратор группы: Дайте мне разрешение на "Отправку фотографий"
    • Попробуйте использовать <code>/q</code> для формата стикера
quote-errors-chat_write_forbidden =
    🚫 <b>Чат ограничен</b>
    Я не могу отправлять сообщения в этот чат.

    <b>Возможные причины:</b>
    • Вы заблокировали бота
    • В группе наложены ограничения на ботов
    • Меня удалили из группы
quote-errors-sticker_set_invalid =
    🔄 <b>Проблема с пакетом стикеров</b>
    Возникла проблема с пакетом стикеров. Создаю новую цитату...
quote-errors-sticker_set_full =
    📦 <b>Пакет стикеров заполнен</b>
    Пакет стикеров достиг предела. Ваша цитата будет отправлена как обычный стикер.
quote-errors-bot_blocked =
    🚫 <b>Бот заблокирован</b>
    Вы заблокировали этого бота. Пожалуйста, разблокируйте его, чтобы получать цитаты.
quote-errors-user_deactivated =
    👤 <b>Проблема с аккаунтом</b>
    Целевой пользовательский аккаунт деактивирован или удалён.
quote-errors-message_too_long =
    📝 <b>Сообщение слишком длинное</b>
    Цитата слишком длинная. Попробуйте процитировать меньше сообщений или использовать более короткий текст.
quote-errors-network_error =
    🌐 <b>Ошибка сети</b>
    Произошла ошибка соединения. Пожалуйста, попробуйте ещё раз через мгновение.
quote-errors-timeout_error =
    ⏱️ <b>Ошибка таймаута</b>
    Запрос занял слишком много времени. Пожалуйста, попробуйте ещё раз с более простой цитатой.
quote-image_to_quote-processing = 🔍 Анализ изображения и извлечение текста...
quote-image_to_quote-success =
    ✅ Цитата создана из { $count } сообщений!

    💡 <b>Совет:</b> Отправьте скриншот с подписью <code>/qi</code> или <code>/quote_image</code>, чтобы создать цитаты
quote-image_to_quote-errors-no_image = ❌ Пожалуйста, отправьте файл изображения (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Изображение слишком большое. Максимальный размер: МБ
quote-image_to_quote-errors-unsupported_format = ❌ Неподдерживаемый формат изображения. Поддерживаются: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Не удалось найти читаемые сообщения в изображении. Убедитесь, что это четкий скриншот разговора.
quote-image_to_quote-errors-parse_error = ❌ Ошибка распознавания. Изображение может не содержать четкий текст разговора.
quote-image_to_quote-errors-api_error = ❌ Ошибка распознавания текста. Пожалуйста, попробуйте ещё раз.
quote-image_to_quote-errors-rate_limit = ⏳ Слишком много запросов! Пожалуйста, подождите { $seconds } секунд перед повторной попыткой.
sticker-save-suc = Успешно добавлено в ваш <a href="{ $link }">стикерпак группы</a> ✨
sticker-save-error-animated = Извините, я пока не могу сохранять анимированные стикеры 😅
sticker-save-error-too_large = Изображение слишком большое (макс 2048×2048). Попробуй поменьше 📐
sticker-save-error-need_creator = <b>Почти готово!</b> { $creator } должен сначала отправить мне сообщение, чтобы сохранить стикеры
sticker-save-error-telegram = <b>Упс!</b> Что-то пошло не так:\n<pre>{ $error }</pre>
sticker-delete-suc = Удалено из вашего <a href="{ $link }">стикерпака группы</a> 🗑
sticker-delete-empty_reply = Пожалуйста, ответьте на стикер, который хотите удалить 🗑
sticker-delete-error-telegram =
    <b>Не удалось удалить стикер 😕</b>
    { $reason }
sticker-delete-error-not_found = Стикер больше не существует в пакете 🤔
sticker-delete-error-rights = У меня нет разрешения на удаление этого стикера 🔒
sticker-delete-error-generic =
    Что-то пошло не так. Пожалуйста, попробуйте позже ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Удалено из случайной коллекции 🗑
sticker-delete_random-error =
    <b>Не удалось удалить цитату 😕</b>
    { $error }
sticker-delete_random-not_found = Этой цитаты нет в базе данных 🤔
sticker-empty_forward = Пожалуйста, ответьте на стикер, фото или изображение, которое хотите сохранить ✨
sticker-fstik = Для сохранения в ваш личный стикерпак, перешлите @fStikBot 🎨
rate-vote-rated = Вы { $rateName } эту цитату
rate-vote-back = Ваш голос удалён
rate-settings-enable = Оценка для цитат включена
rate-settings-disable = Оценка для цитат отключена
random-empty = В этой группе пока нет цитат с высоким рейтингом! Начните оценивать цитаты
random-gab = Частота случайных цитат установлена на { $gab } ✨
hidden-settings-enable = Поиск отправителя включен 🔍
hidden-settings-disable = Поиск отправителя отключен 🔄
privacy-settings-enable = Режим приватности активирован 🔒 Ваша информация будет скрыта в цитатах
privacy-settings-disable = Режим приватности отключен 🔓
top-info = <b>✨ Самые цитируемые сообщения</b>
top-open = Просмотреть лучшие цитаты
donate-info =
    <b>Поддержите развитие QuotLyBot! ☕</b>

    Ваша поддержка помогает нам:
    • Держать серверы в рабочем состоянии 24/7
    • Добавлять новые функции и стили
    • Улучшать качество цитат
    • Сделать бота быстрее

    <b>💳 Простой выбор оплаты</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Оплата картой</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Криптовалюта (для знатоков технологий)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Каждый вклад помогает сделать QuotLyBot лучше для всех! 💜
donate-title = Поддержать { $botUsername }
donate-description = Помогите сохранять волшебство ✨
donate-successful =
    <b>Спасибо за вашу поддержку! 💜</b>
    Вы помогаете сделать QuotLyBot еще лучше!
donate-pay = 💜 Оплатить через Telegram
donate-other = Другие способы
emoji-info =
    <b>Выберите эмодзи для своей цитаты!</b>

    • Установить индивидуальное эмодзи: <code>/qemoji</code>💜
    • Использовать случайное эмодзи: <code>/qemoji random</code>
    • Очистить эмодзи: <code>/qemoji clear</code>

    Ваше эмодзи будет добавлено ко всем новым цитатам ✨
emoji-done = Стиль эмодзи обновлен! ✨
only_admin =
    <b>⚠️ Необходимы права администратора</b>
    Эту команду могут использовать только администраторы группы.
only_group =
    <b>⚠️ Команда для группы</b>
    Эта функция работает только в групповом чате.
rate_limit =
    <i>Делаю короткий перерыв...</i> Вы сможете использовать эту команду снова через { $seconds } секунд ⏳

    <i>Совет: пока ждете, попробуйте настроить свою последнюю цитату с помощью </i><code>/q color</code> <i>или</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>

    Превращаю сообщения в стильные стикеры-цитаты!
menu-btn-features = ✨ Возможности
menu-btn-settings = ⚙️ Настройки
menu-btn-help = 📚 Команды
menu-btn-language = 🌍 Язык
menu-btn-back = ← Назад
menu-btn-add_group = ➕ Добавить в группу
menu-settings-title =
    <b>⚙️ Настройки</b>

    Настройте свои цитаты:
menu-settings-btn-color = 🎨 Цвет
menu-settings-btn-emoji_style = 😊 Стиль эмодзи
menu-settings-btn-privacy = 🔒 Приватность
menu-settings-btn-back = ← Назад
qs-title =
    <b>⚙️ Настройки цитат</b>

    Нажми, чтобы изменить. Изменения действуют на каждую новую цитату здесь.
qs-row-partial = ✂️ Частичная цитата
qs-partial-framed = Рамка
qs-partial-plain = Без рамки
qs-partial-off = Всё сообщение
qs-row-color = 🎨 Цвет
qs-row-brand = 😀 Бренд эмодзи
qs-row-gab = 🔁 Авто-цитата
qs-gab-off = Выключено
qs-gab-often = Часто
qs-gab-sometimes = Иногда
qs-gab-rarely = Редко
qs-row-suffix = 💟 Эмодзи стикера
qs-row-privacy = 🔒 Приватность
qs-row-hidden = 🕵 Поиск отправителя
qs-row-rate = ⭐ Оценки
qs-row-archive = 🗂 Архив текста
qs-suffix-title =
    <b>💟 Эмодзи стикера</b>

    Выбери ниже или задай свой командой <code>/qemoji 🔥</code>.
qs-suffix-random = 🎲 Случайный
menu-features-title =
    <b>✨ Что я умею?</b>

    Нажмите, чтобы узнать больше:
menu-features-btn-basics = 📱 Основы
menu-features-btn-colors = 🎨 Цвета
menu-features-btn-media = 🖼 Медиа
menu-features-btn-group = 👥 Для групп
menu-features-basics-title =
    <b>📱 Основы цитирования</b>

    <b>Личный чат:</b>
    Перешлите сообщение → получите стикер!

    <b>Группы:</b>
    Ответьте <code>/q</code> на сообщение

    <b>Несколько сообщений:</b>
    <code>/q 3</code> — сообщение + ниже
    <code>/q -3</code> — сообщение + выше

    <b>Формат картинки:</b>
    <code>/q img</code> — PNG вместо стикера
menu-features-colors-title =
    <b>🎨 Цвета и стили</b>

    <b>Названия цветов:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Свой цвет (hex):</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Специальные:</b>
    <code>/q random</code> — случайный градиент
    <code>/q transparent</code> — без фона

    <b>Стили эмодзи:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Задать: <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Медиа в цитатах</b>

    <b>Добавить медиа:</b>
    <code>/q m</code> — включает картинки/видео

    <b>Обрезать медиа:</b>
    <code>/q c</code> — обрезает под размер

    <b>Показать ответ:</b>
    <code>/q r</code> — включает сообщение-ответ

    <b>HD качество:</b>
    <code>/q s3.2</code> — выше разрешение

    <b>Комбинируйте:</b>
    <code>/q m r red</code> — медиа + ответ + цвет
menu-features-group-title =
    <b>👥 Функции для групп</b>

    <b>Оценка цитат:</b>
    👍👎 кнопки на цитатах
    Включить: <code>/qrate</code>

    <b>Топ цитат:</b>
    <code>/qtop</code> — лучшие цитаты

    <b>Случайная цитата:</b>
    <code>/qrand</code> — случайная из топа

    <b>Стикерпак группы:</b>
    <code>/qs 💜</code> — сохранить в пак
    <code>/qd</code> — удалить из пака
onboarding-welcome-title =
    <b>Привет! 👋</b>

    Я превращаю сообщения чата в красивые стикеры-цитаты.
    Давай покажу как это работает!
onboarding-welcome-btn-start = Начнём! →
onboarding-welcome-btn-skip = Пропустить
onboarding-step1-title =
    <b>Шаг из 2</b> 📨

    Перешлите мне любое сообщение из чата.
    Я превращу его в стикер-цитату!
onboarding-step1-waiting =
    Жду сообщение...
    Просто перешлите что-нибудь из любого чата!
onboarding-step2-title =
    <b>Отлично! 🎉</b>

    Вы только что создали свою первую цитату!

    <b>В группах</b> используйте <code>/q</code> в ответ на сообщение.

    Готовы попробовать больше?
onboarding-step2-btn-menu = Открыть меню
onboarding-step2-btn-add_group = Добавить в группу
onboarding-complete-title =
    <b>Всё готово! ✨</b>

    Теперь вы знаете основы. Добавьте меня в группу или исследуйте все функции в меню.
guest-hint =
    <b>Quotly — гостевой режим 💬</b>

    Я могу сделать цитату-стикер из любого сообщения <i>даже если меня нет в чате</i>.

    <b>Как пользоваться:</b>
    1. Сделай <i>reply</i> на сообщение, которое хочешь процитировать
    2. В ответе напиши <code>@{ $username }</code>
    3. Готово — я пришлю стикер прямо в чат

    <b>Необязательные аргументы (как после /q):</b>
    • <code>@{ $username } r</code> — добавить сообщение, на которое отвечаешь
    • <code>@{ $username } red</code> — задать цвет фона
    • <code>@{ $username } rate</code> — добавить 👍 / 👎
    • <code>@{ $username } p</code> — сгенерировать PNG

    Для полного функционала — открой меня в личке.
guest-hint_short = Как работает Quotly в гостевом режиме
guest-need_reply =
    <b>Почти готово! 🪄</b>

    Чтобы сделать цитату — мне нужно сообщение-источник. Сделай <i>reply</i> на него и упомяни <code>@{ $username }</code>.

    Пример: тапни «Ответить» → напиши <code>@{ $username }</code> → отправь.
guest-need_reply_short = Реплай на сообщение и упомяни бота
guest-empty_query =
    <b>Привет, я Quotly 💜</b>

    Отвечай на любое сообщение в этом чате с упоминанием <code>@{ $username }</code> — и я превращу его в стикер-цитату.

    Нажми кнопку ниже, чтобы открыть меня в личке.
guest-open_in_pm = Открыть Quotly →
app-open_quote = ✨ Открыть цитату
app-open_group = 📚 Все цитаты группы
app-open_root = 💫 Мои группы
app-info =
    <b>Всё это есть и в приложении 💬</b>

    Листай цитаты, копайся в архиве, смотри топы — в один тап. Жми кнопку ↓
qarchive-usage =
    Переключить архив текста цитат для этой группы.

    <code>/qarchive on</code> или <code>/qarchive off</code>
qforget-usage = Укажи номер цитаты: <code>/qforget 142</code>
qforget-not_found = Цитата #{ $local } не найдена в этой группе.
qforget-not_author = Забыть цитату может только её автор.
qforget-forgotten = ✅ Цитата #{ $local } забыта. Стикер и голоса остаются, но текст и автор удалены из архива.
qforget-already_forgotten = Цитата #{ $local } уже была забыта.
qforget-not_yet_archived = У цитаты #{ $local } нет текста (создана до архива).

aimode-title = 🤖 <b>Режимы ИИ</b>
aimode-current = Текущий режим: { $mode }
aimode-available = <b>Доступные режимы:</b>
aimode-unknown = ❌ Неизвестный режим: <code>{ $mode }</code>
aimode-available_list = Доступно: { $modes }
aimode-success = ✅ Режим ИИ изменён на: { $mode }
aimode-error = ❌ Ошибка при сохранении настроек
aimode-modes-sarcastic-name = 😏 Саркастичный
aimode-modes-sarcastic-description = Саркастичные и остроумные комментарии с чёрным юмором
aimode-modes-philosopher-name = 🧠 Философ
aimode-modes-philosopher-description = Глубокие мысли и философские размышления
aimode-modes-comedian-name = 😂 Комик
aimode-modes-comedian-description = Смешные шутки и комедийные комментарии
aimode-modes-poet-name = 📝 Поэт
aimode-modes-poet-description = Поэтичные строки и красивые метафоры
aimode-modes-motivator-name = 💪 Мотиватор
aimode-modes-motivator-description = Мотивирующие и вдохновляющие сообщения
aimode-modes-conspiracy-name = 🕵️ Конспиролог
aimode-modes-conspiracy-description = Теории заговора и подозрительные комментарии
aimode-modes-critic-name = 🎭 Критик
aimode-modes-critic-description = Критические обзоры и оценки всего на свете
aimode-modes-boomer-name = 👴 Бумер
aimode-modes-boomer-description = Комментарии в духе старшего поколения
aimode-modes-zoomer-name = 😎 Зумер
aimode-modes-zoomer-description = Молодёжный сленг и модные словечки
aimode-modes-academic-name = 🎓 Академик
aimode-modes-academic-description = Научные факты и академические комментарии
aimode-modes-memer-name = 🐸 Мемер
aimode-modes-memer-description = Мемные фразы и интернет-культура
quick_action-remake = 🔄
quick_action-tooltip-remake = Пересоздать в другом стиле
qarchive-on = ✅ Архив текста цитат <b>включён</b>. Новые цитаты будут сохраняться с текстом и автором.
qarchive-off = ⏸ Архив текста цитат <b>отключён</b>. Новые цитаты будут хранить только стикер и рейтинг.
qarchive-status_on =
    Текущее состояние: <b>включён</b>.

    <code>/qarchive off</code> — отключить
qarchive-status_off =
    Текущее состояние: <b>отключён</b>.

    <code>/qarchive on</code> — включить

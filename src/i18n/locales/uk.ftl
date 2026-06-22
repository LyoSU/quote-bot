# Auto-generated from locales/uk.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs uk

language_name = 🇺🇦 Українська
description-short =
    Перетворіть будь-яке повідомлення на красиву цитату-стікер! ✨
    Відповідайте командою /q або пересилайте повідомлення мені
description-long =
    Створюйте вражаючі цитати-стікери та зберігайте улюблені моменти чату! ✨

    Просто відповідайте /q на будь-яке повідомлення або пересилайте його мені. Ідеально для збереження:
    🌟 Кращих моментів і спогадів чату
    💭 Натхнень і розмов
    🎨 Креативних повідомлень з власними стилями
    ✍️ Важливих нотаток у красивому форматі

    Почніть зараз - просто пересилайте повідомлення або використовуйте /q!
start =
    <b>Привіт! 👋 Я QuotLyBot</b>

    Я перетворюю звичайні повідомлення чату на приголомшливі цитати-стікери. Простий, креативний і веселий у використанні!

    ✨ <b>Готові створити свою першу цитату?</b>
    <b>У приватних чатах:</b> Перешліть мені будь-які повідомлення (ви навіть можете вибрати кілька відразу!)
    <b>У групах:</b> Додайте мене до своєї групи та відповідайте командою <code>/q</code> на будь-яке повідомлення

    Хочете змінити кольори, стилі та більше? Введіть /help, коли будете готові відкрити всі креативні можливості! 🎨
help =
    <b>✨ QuotLyBot: Швидкі та Легкі Цитати! ✨</b>

    Перетворіть повідомлення у стильні цитати в Telegram. Ось як це робити:

    📱 <b>Основне Цитування</b>

    • Відповідь і Цитата:  Відповідайте на повідомлення та вводьте <code>/q</code> для цитування.
    • Кілька цитат: Відповідайте на перше з декількох повідомлень, вводьте <code>/q [число]</code> (наприклад, <code>/q 3</code>) для цитування кількох.
    • Пересилка і Цитата: Перешліть повідомлення боту для безпосереднього цитування.

    🎨 <b>Налаштування Вашої Цитати</b>

    • Кольори:
        • Основний: <code>/q red</code> (або blue, green тощо)
        • Користувацький: <code>/q #[hex колірний код]</code> (наприклад, <code>/q #cbafff</code>)
        • Випадковий: <code>/q random</code>
    • Медіа:  Включайте зображення/відео з цитованого повідомлення командою <code>/q m</code> або <code>/q media</code>
        • Обрізка Медіа: Використовуйте <code>/q c</code> або <code>/q crop</code> для обрізки медіа.
    • Показувати Відповіді: Відображайте повідомлення на яке відповідають за допомогою <code>/q r</code> або <code>/q reply</code>
    • Формат Зображення: Використовуйте <code>/q i</code> або <code>/q img</code> або <code>/q p</code> або <code>/q png</code> для цитат-зображень (замість стікерів).

    💡 <b>Круті Комбінації</b>

    • Біла цитата з відповідями: <code>/q white rp</code>
    • Високоякісне червоне зображення: <code>/q i red s3.2</code>
    • Цитата з медіа і відповідями: <code>/q r #cbafff m</code>

    ⚙️ <b>Більше Опцій</b>

    • Оцінка Цитат: <code>/q rate</code> (якщо увімкнено в групі)
    • Випадкова Цитата: <code>/qrand</code> (якщо увімкнено в групі)
    • Топ Цитати: <code>/qtop</code> (якщо увімкнено в групі)
    • Змінити Мову: <code>/lang</code>

    🎯 <b>Налаштування Адміністратора Групи</b> (тільки для адміністраторів групи)

    • Усі налаштування цитат: <code>/qsettings</code> — колір, стиль емодзі, приватність, оцінки, режим часткового цитування й інше, усе кнопками.
    • Зберегти в Пакет Стікерів: <code>/qs [емодзі]</code>
    • Видалити Стікер: <code>/qd</code> (у відповідь на стікер)

    📱 <b>Потрібна Допомога?</b>

    • Блог: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Підтримка: <code>/donate</code>
help_group =
    <b>Привіт! 👋</b>
    Я створюватиму красиві цитати в цій групі - просто використовуйте <code>/q</code> у відповідь на будь-яке повідомлення!

    Дізнайтеся всі мої можливості в приваті: <a href="t.me/{ $username }?start=help">Отримати допомогу</a> ✨
btn-add_group = Додати до групи
btn-help = Довідка
quote-unsupported_message = Цей тип повідомлень не підтримується для цитування
quote-api_error =
    <b>Ой! Щось пішло не так 😅</b>
    <pre>{ $error }</pre>
    Спробуйте ще раз трохи пізніше!
quote-empty_forward = Будь ласка, відповідайте або пересилайте повідомлення, яке ви хочете процитувати ✨
quote-set_background_color = <b>Чудово!</b> Фон цитати змінено на: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Готово!</b> Стиль емодзі змінено на: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Наш сервіс цитат тимчасово недоступний. Будь ласка, спробуйте ще раз через кілька хвилин.

    Якщо проблема залишається, перевірте оновлення в @LyBlog.
quote-errors-rate_limit = ⏳ Забагато запитів! Будь ласка, зачекайте { $seconds } секунд перед створенням наступної цитати.
quote-errors-file_too_large = 📸 Файл медіа занадто великий (максимум 5МБ). Спробуйте використати менше зображення або відео.
quote-errors-invalid_format =
    ❌ Непідтримуваний формат файлу. Я підтримую:
    • Зображення (JPG, PNG, WEBP)
    • Відео (MP4)
    • Стікери
    • Текстові повідомлення
quote-errors-telegram_error =
    ⚠️ Помилка Telegram: { $error }

    Це зазвичай трапляється, коли:
    • Файл занадто великий
    • Пакет наліпок переповнений
    • Боту не вистачає прав
quote-errors-generic_error =
    😅 Упс! Щось пішло не так:
    <code>{ $error }</code>

    Будь ласка, спробуйте ще раз або повідомте про це @Ly_oBot, якщо проблема не зникає.
quote-errors-no_rights_send_documents =
    🚫 <b>Помилка дозволу</b>
    У мене немає дозволу на відправку документів у цьому чаті.

    <b>Щоб це виправити:</b>
    • Адміністратор групи: Надайте мені дозвіл "Надсилати документи"
    • Приватний чат: Переконайтеся, що ви не заблокували бота
quote-errors-no_rights_send_stickers =
    🚫 <b>Помилка дозволу</b>
    У мене немає дозволу на відправку стікерів у цьому чаті.

    <b>Щоб це виправити:</b>
    • Адміністратор групи: Надайте мені дозвіл "Надсилати стікери"
    • Спробуйте використати <code>/q img</code> для формату зображення замість цього
quote-errors-no_rights_send_photos =
    🚫 <b>Помилка дозволу</b>
    У мене немає дозволу на відправку фотографій у цьому чаті.

    <b>Щоб це виправити:</b>
    • Адміністратор групи: Надайте мені дозвіл "Надсилати фотографії"
    • Спробуйте використати <code>/q</code> для формату стікера замість цього
quote-errors-chat_write_forbidden =
    🚫 <b>Чат обмежено</b>
    Я не можу відправляти повідомлення у цьому чаті.

    <b>Можливі причини:</b>
    • Ви заблокували бота
    • У групі обмежено ботів
    • Мене видалили з групи
quote-errors-sticker_set_invalid =
    🔄 <b>Проблема з пакетом стікерів</b>
    Виникла проблема з набором стікерів. Створюється нова цитата...
quote-errors-sticker_set_full =
    📦 <b>Пакет стікерів переповнено</b>
    Пакет стікерів досяг свого ліміту. Ваша цитата буде надіслана як звичайний стікер.
quote-errors-bot_blocked =
    🚫 <b>Бот заблоковано</b>
    Ви заблокували цього бота. Будь ласка, розблокуйте його, щоб отримувати цитати.
quote-errors-user_deactivated =
    👤 <b>Проблема з обліковим записом</b>
    Цільовий обліковий запис користувача деактивовано або видалено.
quote-errors-message_too_long =
    📝 <b>Повідомлення занадто довге</b>
    Цитоване повідомлення занадто довге. Спробуйте цитувати менше повідомлень або коротший текст.
quote-errors-network_error =
    🌐 <b>Помилка мережі</b>
    Виникла проблема з підключенням. Будь ласка, спробуйте ще раз через хвилину.
quote-errors-timeout_error =
    ⏱️ <b>Помилка тайм-ауту</b>
    Запит займав занадто багато часу. Будь ласка, спробуйте ще раз з простішою цитатою.
quote-image_to_quote-processing = 🔍 Аналізую зображення та витягую текст...
quote-image_to_quote-success =
    ✅ Цитату створено з { $count } повідомлень!

    💡 <b>Підказка:</b> Надішліть скріншот з підписом <code>/qi</code> або <code>/quote_image</code> щоб створити цитату
quote-image_to_quote-errors-no_image = ❌ Будь ласка, надішліть файл зображення (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Зображення занадто велике. Максимальний розмір: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Непідтримуваний формат зображення. Підтримуються: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Не вдалося знайти читабельні повідомлення чату в зображенні. Переконайтеся, що це чіткий скріншот розмови.
quote-image_to_quote-errors-parse_error = ❌ Помилка розпізнавання. Можливо, зображення не містить чіткого тексту розмови.
quote-image_to_quote-errors-api_error = ❌ Помилка розпізнавання тексту. Спробуйте ще раз.
quote-image_to_quote-errors-rate_limit = ⏳ Занадто багато запитів! Зачекайте { $seconds } секунд перед наступною спробою.
sticker-save-suc = Успішно додано у <a href="{ $link }">пак наліпок вашої групи</a> ✨
sticker-save-error-animated = Вибачте, я поки що не можу зберігати анімовані стікери 😅
sticker-save-error-need_creator = <b>Майже готово!</b> { $creator } спочатку повинен надіслати мені повідомлення, щоб зберегти наліпки
sticker-save-error-telegram = <b>Ой!</b> Щось пішло не так:\n<pre>{ $error }</pre>
sticker-delete-suc = Видалено з вашого <a href="{ $link }">паку наліпок групи</a> 🗑
sticker-delete-empty_reply = Будь ласка, відповідайте на наліпку, яку хочете видалити 🗑
sticker-delete-error-telegram =
    <b>Не вдалося видалити наліпку 😕</b>
    { $reason }
sticker-delete-error-not_found = Наліпка більше не існує в пакеті 🤔
sticker-delete-error-rights = У мене немає дозволу на видалення цієї наліпки 🔒
sticker-delete-error-generic =
    Щось пішло не так. Будь ласка, спробуйте пізніше ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Видалено з випадкової колекції 🗑
sticker-delete_random-error =
    <b>Не вдалося видалити цитату 😕</b>
    { $error }
sticker-delete_random-not_found = Цієї цитати немає в базі даних 🤔
sticker-empty_forward = Будь ласка, відповідайте на наліпку, фото або зображення, яке ви хочете зберегти ✨
sticker-fstik = Щоб зберегти у свій особистий стікерпак, перешліть до @fStikBot 🎨
rate-vote-rated = Ви { $rateName } цю цитату
rate-vote-back = Ваш голос було видалено
rate-settings-enable = Оцінка для цитат увімкнена
rate-settings-disable = Оцінка для цитат вимкнена
random-empty = У цій групі ще немає цитат з високою оцінкою! Почніть оцінювати цитати
random-gab = Частота випадкових цитат встановлена на { $gab } ✨
hidden-settings-enable = Пошук відправника увімкнено 🔍
hidden-settings-disable = Пошук відправника вимкнено 🔄
privacy-settings-enable = Режим приватності активовано 🔒 Ваша інформація буде прихована в цитатах
privacy-settings-disable = Режим приватності вимкнено 🔓
top-info = <b>✨ Найбільш цитовані повідомлення</b>
top-open = Переглянути найкращі цитати
app-open_quote = ✨ Відкрити цитату
app-open_group = 📚 Усі цитати групи
app-open_root = 💫 Мої групи
app-info =
    <b>Це все живе й у додатку 💬</b>

    Гортай цитати, копайся в архіві, шукай топи — усе під рукою. Тицяй нижче ↓
donate-info =
    <b>Підтримайте розвиток QuotLyBot! ☕</b>

    Ваша підтримка допомагає нам:
    • Підтримувати сервери працюючими 24/7
    • Додавати нові функції та стилі
    • Покращувати якість цитат
    • Робити бота швидшим

    <b>💳 Легкі способи оплати</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Оплата карткою</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Криптовалюта (для технічно підкованих користувачів)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Кожний внесок допомагає зробити QuotLyBot кращим для всіх! 💜
donate-title = Підтримати { $botUsername }
donate-description = Допоможіть зберегти магію ✨
donate-successful =
    <b>Дякуємо за вашу підтримку! 💜</b>
    Ви допомагаєте зробити QuotLyBot ще кращим!
donate-pay = 💜 Оплатити через Telegram
donate-other = Інші способи
emoji-info =
    <b>Обирайте свої емодзі для цитати!</b>

    • Встановити власний емодзі: <code>/qemoji</code>💜
    • Використовувати випадковий емодзі: <code>/qemoji random</code>
    • Очистити емодзі: <code>/qemoji clear</code>

    Ваш емодзі буде додано до всіх нових цитат ✨
emoji-done = Стиль емодзі оновлено! ✨
only_admin =
    <b>⚠️ Потрібен доступ адміністратора</b>
    Цю команду можуть використовувати лише адміністратори групи.
only_group =
    <b>⚠️ Це команда групи</b>
    Ця функція працює лише у групових чатах.
rate_limit =
    <i>Невелика перерва...</i> Ви зможете використати цю команду знову через { $seconds } секунд ⏳

    <i>Порада: Поки ви чекаєте, спробуйте налаштувати вашу останню цитату за допомогою </i><code>/q color</code> <i>або</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>

    Перетворюю повідомлення на стильні цитати-стікери!
menu-btn-features = ✨ Можливості
menu-btn-settings = ⚙️ Налаштування
menu-btn-help = 📚 Команди
menu-btn-language = 🌍 Мова
menu-btn-back = ← Назад
menu-btn-add_group = ➕ Додати в групу
menu-settings-title =
    <b>⚙️ Налаштування</b>

    Налаштуйте свої цитати:
menu-settings-btn-color = 🎨 Колір
menu-settings-btn-emoji_style = 😊 Стиль емодзі
menu-settings-btn-privacy = 🔒 Приватність
menu-settings-btn-back = ← Назад
qs-title =
    <b>⚙️ Налаштування цитат</b>

    Тисни, щоб змінити. Зміни діють на кожну нову цитату тут.
qs-row-partial = ✂️ Часткова цитата
qs-partial-framed = Рамка
qs-partial-plain = Без рамки
qs-partial-off = Повне повідомлення
qs-row-color = 🎨 Колір
qs-color-title =
    <b>🎨 Фон</b>

    Обери колір або задай свій командою <code>/qcolor #ff5733</code>.
qs-row-brand = 😀 Бренд емодзі
qs-row-gab = 🔁 Авто-цитата
qs-gab-off = Вимкнено
qs-gab-often = Часто
qs-gab-sometimes = Інколи
qs-gab-rarely = Рідко
qs-row-suffix = 💟 Емодзі стікера
qs-row-media = 📎 Медіа
qs-row-reply = 💬 Показ reply
qs-row-crop = 🖼 Обрізати медіа
qs-row-privacy = 🔒 Приватність
qs-row-hidden = 🕵 Пошук відправника
qs-row-rate = ⭐ Оцінки
qs-row-archive = 🗂 Архів тексту
qs-suffix-title =
    <b>💟 Емодзі стікера</b>

    Обери нижче або задай свій командою <code>/qemoji 🔥</code>.
qs-suffix-random = 🎲 Випадковий
menu-features-title =
    <b>✨ Що я вмію?</b>

    Натисніть, щоб дізнатися більше:
menu-features-btn-basics = 📱 Основи
menu-features-btn-colors = 🎨 Кольори
menu-features-btn-media = 🖼 Медіа
menu-features-btn-group = 👥 Для груп
menu-features-basics-title =
    <b>📱 Основи цитування</b>

    <b>Приватний чат:</b>
    Перешліть повідомлення → отримайте стікер!

    <b>Групи:</b>
    Відповідайте <code>/q</code> на повідомлення

    <b>Кілька повідомлень:</b>
    <code>/q 3</code> — повідомлення + нижче
    <code>/q -3</code> — повідомлення + вище

    <b>Формат картинки:</b>
    <code>/q img</code> — PNG замість стікера
menu-features-colors-title =
    <b>🎨 Кольори та стилі</b>

    <b>Назви кольорів:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Свій колір (hex):</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Спеціальні:</b>
    <code>/q random</code> — випадковий градієнт
    <code>/q transparent</code> — без фону

    <b>Стилі емодзі:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Задати: <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Медіа в цитатах</b>

    <b>Додати медіа:</b>
    <code>/q m</code> — включає картинки/відео

    <b>Обрізати медіа:</b>
    <code>/q c</code> — обрізає під розмір

    <b>Показати відповідь:</b>
    <code>/q r</code> — включає повідомлення-відповідь

    <b>HD якість:</b>
    <code>/q s3.2</code> — вища роздільність

    <b>Комбінуйте:</b>
    <code>/q m r red</code> — медіа + відповідь + колір
menu-features-group-title =
    <b>👥 Функції для груп</b>

    <b>Оцінка цитат:</b>
    👍👎 кнопки на цитатах
    Увімкнути: <code>/qrate</code>

    <b>Топ цитат:</b>
    <code>/qtop</code> — найкращі цитати

    <b>Випадкова цитата:</b>
    <code>/qrand</code> — випадкова з топу

    <b>Стікерпак групи:</b>
    <code>/qs 💜</code> — зберегти в пак
    <code>/qd</code> — видалити з паку
onboarding-welcome-title =
    <b>Привіт! 👋</b>

    Я перетворюю повідомлення чату на красиві цитати-стікери.
    Давай покажу як це працює!
onboarding-welcome-btn-start = Почнімо! →
onboarding-welcome-btn-skip = Пропустити
onboarding-step1-title =
    <b>Крок з 2</b> 📨

    Перешліть мені будь-яке повідомлення з чату.
    Я перетворю його на стікер-цитату!
onboarding-step1-waiting =
    Чекаю на повідомлення...
    Просто перешліть щось з будь-якого чату!
onboarding-step2-title =
    <b>Чудово! 🎉</b>

    Ви щойно створили свою першу цитату!

    <b>У групах</b> використовуйте <code>/q</code> у відповідь на повідомлення.

    Готові спробувати більше?
onboarding-step2-btn-menu = Відкрити меню
onboarding-step2-btn-add_group = Додати в групу
onboarding-complete-title =
    <b>Все готово! ✨</b>

    Тепер ви знаєте основи. Додайте мене в групу або досліджуйте всі функції в меню.
quick_action-remake = 🔄
quick_action-tooltip-remake = Переробити з іншим стилем
qarchive-on = ✅ Архівування тексту цитат <b>увімкнено</b>. Нові цитати зберігатимуться з текстом і автором.
qarchive-off = ⏸ Архівування тексту цитат <b>вимкнено</b>. Нові цитати зберігатимуть лише стікер і рейтинг.
qarchive-status_on =
    Поточний стан: <b>увімкнено</b>.

    <code>/qarchive off</code> — вимкнути
qarchive-status_off =
    Поточний стан: <b>вимкнено</b>.

    <code>/qarchive on</code> — увімкнути
qarchive-usage =
    Перемикач архіву тексту цитат для цієї групи.

    <code>/qarchive on</code> або <code>/qarchive off</code>
qforget-usage = Вкажіть номер цитати: <code>/qforget 142</code>
qforget-not_found = Цитату #{ $local } не знайдено в цій групі.
qforget-not_author = Лише автор цитати може її видалити.
qforget-forgotten = ✅ Цитату #{ $local } забуто. Стікер і голоси залишаються, але текст і автор прибрано з архіву.
qforget-already_forgotten = Цитату #{ $local } вже було забуто.
qforget-not_yet_archived = Цитата #{ $local } не має тексту (була створена до архіву).
guest-hint =
    <b>Quotly — гостьовий режим 💬</b>

    Я можу зробити цитату-стікер з будь-якого повідомлення <i>навіть якщо я не учасник чату</i>.

    <b>Як користуватися:</b>
    1. Зроби <i>reply</i> на повідомлення, яке хочеш зацитувати
    2. У відповіді напиши <code>@{ $username }</code>
    3. Готово — я надішлю стікер прямо в чат

    <b>Необов'язкові аргументи (як після /q):</b>
    • <code>@{ $username } r</code> — додати повідомлення, на яке відповідаєш
    • <code>@{ $username } red</code> — змінити колір тла
    • <code>@{ $username } rate</code> — додати 👍 / 👎
    • <code>@{ $username } p</code> — згенерувати PNG

    Для повного функціоналу відкрий мене у приваті.
guest-hint_short = Як працює Quotly у гостьовому режимі
guest-need_reply =
    <b>Майже! 🪄</b>

    Щоб зробити цитату — мені потрібне повідомлення-джерело. Зроби <i>reply</i> на нього і згадай <code>@{ $username }</code>.

    Приклад: тапни «Відповісти» на повідомлення → напиши <code>@{ $username }</code> → надішли.
guest-need_reply_short = Реплай на повідомлення і згадай бота
guest-empty_query =
    <b>Привіт, я Quotly 💜</b>

    Відповідай на будь-яке повідомлення в цьому чаті зі згадкою <code>@{ $username }</code> — і я перетворю його на стікер-цитату.

    Натисни кнопку нижче, щоб відкрити мене у приваті.
guest-open_in_pm = Відкрити Quotly →
sticker-save-error-too_large = Зображення завелике (макс. 2048×2048). Спробуйте менше 📐
aimode-title = 🤖 <b>Режими ШІ</b>
aimode-current = Поточний режим: { $mode }
aimode-available = <b>Доступні режими:</b>
aimode-unknown = ❌ Невідомий режим: <code>{ $mode }</code>
aimode-available_list = Доступні: { $modes }
aimode-success = ✅ Режим ШІ змінено на: { $mode }
aimode-error = ❌ Помилка збереження налаштувань
aimode-modes-sarcastic-name = 😏 Саркастичний
aimode-modes-sarcastic-description = Саркастичні та дотепні коментарі з чорним гумором
aimode-modes-philosopher-name = 🧠 Філософ
aimode-modes-philosopher-description = Глибокі думки та філософські роздуми
aimode-modes-comedian-name = 😂 Комік
aimode-modes-comedian-description = Смішні жарти та комедійні коментарі
aimode-modes-poet-name = 📝 Поет
aimode-modes-poet-description = Поетичні рядки та красиві метафори
aimode-modes-motivator-name = 💪 Мотиватор
aimode-modes-motivator-description = Мотивуючі та надихаючі повідомлення
aimode-modes-conspiracy-name = 🕵️ Конспіролог
aimode-modes-conspiracy-description = Теорії змов та підозрілі коментарі
aimode-modes-critic-name = 🎭 Критик
aimode-modes-critic-description = Критичні огляди та оцінки на все
aimode-modes-boomer-name = 👴 Бумер
aimode-modes-boomer-description = Старосвітські коментарі від старшого покоління
aimode-modes-zoomer-name = 😎 Зумер
aimode-modes-zoomer-description = Молодіжний сленг та трендові фрази
aimode-modes-academic-name = 🎓 Академік
aimode-modes-academic-description = Наукові факти та академічні коментарі
aimode-modes-memer-name = 🐸 Мемер
aimode-modes-memer-description = Мемні фрази та інтернет-культура

# Auto-generated from locales/pl.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs pl

language_name = 🇵🇱 Polski
description-short =
    Zamień dowolną wiadomość w piękną naklejkę z cytatem! ✨
    Odpowiedz za pomocą /q lub przekaż wiadomość do mnie
description-long =
    Twórz oszałamiające naklejki z cytatami i zachowuj ulubione chwile z czatu! ✨

    Po prostu odpowiedz /q na dowolną wiadomość lub przekaż ją do mnie. Idealne do zapisywania:
    🌟 Najlepsze momenty i wspomnienia z czatu
    💭 Inspirujące myśli i rozmowy
    🎨 Kreatywne wiadomości z niestandardowymi stylami
    ✍️ Ważne notatki w pięknym formacie

    Zacznij teraz - wystarczy przesłać wiadomość lub użyć /q!
start =
    <b>Cześć! 👋 Jestem QuotLyBot</b>

    Przekształcam zwykłe wiadomości czatu w oszałamiające naklejki z cytatami. Prosty, kreatywny i fajny w użyciu!

    ✨ <b>Gotowy na stworzenie pierwszego cytatu?</b>
    <b>W prywatnych czatach:</b> Przekaż mi dowolne wiadomości (możesz nawet wybrać kilka naraz!)
    <b>W grupach:</b> Dodaj mnie do swojej grupy i odpowiedz z <code>/q</code> na dowolną wiadomość

    Chcesz zmienić kolory, style i inne? Wpisz /help, gdy będziesz gotowy odkryć wszystkie kreatywne możliwości! 🎨
help =
    <b>✨ QuotLyBot: Szybkie i Łatwe Cytaty! ✨</b>

    Zamień wiadomości w stylowe cytaty na Telegramie. Oto jak:

    📱 <b>Podstawowe Cytowanie</b>

    • Odpowiedz & Cytuj: Odpowiedz na wiadomość i wpisz <code>/q</code>, aby ją zacytować.
    • Cytuj Wiele: Odpowiedz na pierwszą z kilku wiadomości, wpisz <code>/q [number]</code> (np. <code>/q 3</code>), aby zacytować wiele.
    • Przekaż & Cytuj: Przekaż wiadomość do bota, aby ją bezpośrednio zacytować.

    🎨 <b>Dostosuj Swoje Cytaty</b>

    • Kolory:
        • Podstawowe: <code>/q red</code> (lub blue, green, itp.)
        • Niestandardowe: <code>/q #[hex color code]</code> (np. <code>/q #cbafff</code>)
        • Losowe: <code>/q random</code>
    • Multimedia: Dołącz obrazy/wideo z cytowanej wiadomości za pomocą <code>/q m</code> lub <code>/q media</code>
        • Przytnij Multimedia: Użyj <code>/q c</code> lub <code>/q crop</code> do przycinania multimediów.
    • Zachowaj Odpowiedzi: Pokaż wiadomość, na którą odpowiadasz, za pomocą <code>/q r</code> lub <code>/q reply</code>
    • Format Obrazu: Użyj <code>/q i</code> lub <code>/q img</code> lub <code>/q p</code> lub <code>/q png</code> dla cytatów obrazowych (zamiast naklejek).

    💡 <b>Fajne Kombinacje</b>

    • Biały cytat z odpowiedziami: <code>/q white rp</code>
    • Wysokiej jakości czerwony obraz: <code>/q i red s3.2</code>
    • Cytat z multimediami i odpowiedziami: <code>/q r #cbafff m</code>

    ⚙️ <b>Więcej Opcji</b>

    • Oceń Cytaty: <code>/q rate</code> (jeśli włączone w grupie)
    • Losowy Cytat: <code>/qrand</code> (jeśli włączone w grupie)
    • Najlepsze Cytaty: <code>/qtop</code> (jeśli włączone w grupie)
    • Zmień Język: <code>/lang</code>

    🎯 <b>Ustawienia Administratora Grupy</b> (tylko dla administratorów grup)

    • Domyślny Kolor: <code>/qcolor [color]</code>
    • Włącz Oceny: <code>/qrate</code>
    • Zapisz do Pakietu Naklejek: <code>/qs [emoji]</code>
    • Usuń Naklejkę: <code>/qd</code> (odpowiedz na naklejkę)
    • Częstotliwość Losowych Cytatów: <code>/qgab [number]</code>
    • Zmień Sufiks Emoji: <code>/qemoji</code> (zmień sufiks emoji naklejki)
    • Styl Emoji:
        • Klasyczny: <code>/qb apple</code>, <code>/qb google</code>
        • Alternatywny: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>Potrzebujesz Pomocy?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Wsparcie: <code>/donate</code>
help_group =
    <b>Cześć! 👋</b>
    Stworzę piękne cytaty w tej grupie - po prostu użyj <code>/q</code> w odpowiedzi na dowolną wiadomość!

    Poznaj wszystkie moje funkcje prywatnie: <a href="t.me/{ $username }?start=help">Uzyskaj pomoc</a> ✨
btn-add_group = Dodaj do Grupy
btn-help = Pomoc
quote-unsupported_message = Ten typ wiadomości nie jest obsługiwany do cytowania
quote-api_error =
    <b>Ups! Coś poszło nie tak 😅</b>
    <pre>{ $error }</pre>
    Spróbuj ponownie za chwilę!
quote-empty_forward = Odpowiedz lub przekaż wiadomość, którą chcesz zacytować ✨
quote-set_background_color = <b>Perfekcyjnie!</b> Tło cytatu zmienione na: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Gotowe!</b> Styl emoji zmieniony na: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Nasza usługa cytatów jest tymczasowo niedostępna. Spróbuj ponownie za kilka minut.

    Jeśli problem się utrzymuje, sprawdź @LyBlog w poszukiwaniu aktualizacji.
quote-errors-rate_limit = ⏳ Zbyt wiele żądań! Proszę czekać { $seconds } sekund przed utworzeniem kolejnego cytatu.
quote-errors-file_too_large = 📸 Plik multimedialny jest zbyt duży (maks. MB). Spróbuj użyć mniejszego obrazu lub wideo.
quote-errors-invalid_format =
    ❌ Nieobsługiwany format pliku. Obsługuję:
    • Obrazy (JPG, PNG, WEBP)
    • Wideo (MP4)
    • Naklejki
    • Wiadomości tekstowe
quote-errors-telegram_error =
    ⚠️ Błąd Telegram: { $error }

    Zwykle dzieje się to, gdy:
    • Plik jest zbyt duży
    • Pakiet naklejek jest pełny
    • Bot nie ma uprawnień
quote-errors-generic_error =
    😅 Ups! Coś poszło nie tak:
    <code>{ $error }</code>

    Proszę spróbować ponownie lub zgłosić to do @Ly_oBot, jeśli problem się utrzymuje.
quote-errors-no_rights_send_documents =
    🚫 <b>Błąd uprawnień</b>
    Nie mam uprawnień do wysyłania dokumentów na tym czacie.

    <b>Aby to naprawić:</b>
    • Administrator grupy: przyznaj mi uprawnienie "Wysyłaj dokumenty"
    • Czat prywatny: upewnij się, że nie zablokowałeś bota
quote-errors-no_rights_send_stickers =
    🚫 <b>Błąd uprawnień</b>
    Nie mam uprawnień do wysyłania naklejek na tym czacie.

    <b>Aby to naprawić:</b>
    • Administrator grupy: przyznaj mi uprawnienie "Wysyłaj naklejki"
    • Spróbuj użyć <code>/q img</code> do formatu obrazu zamiast
quote-errors-no_rights_send_photos =
    🚫 <b>Błąd uprawnień</b>
    Nie mam uprawnień do wysyłania zdjęć na tym czacie.

    <b>Aby to naprawić:</b>
    • Administrator grupy: przyznaj mi uprawnienie "Wysyłaj zdjęcia"
    • Spróbuj użyć <code>/q</code> do formatu naklejki zamiast
quote-errors-chat_write_forbidden =
    🚫 <b>Czat ograniczony</b>
    Nie mogę wysyłać wiadomości na tym czacie.

    <b>Możliwe przyczyny:</b>
    • Zablokowałeś bota
    • Grupa ma ograniczenia dla botów
    • Zostałem usunięty z grupy
quote-errors-sticker_set_invalid =
    🔄 <b>Problem z paczką naklejek</b>
    Jest problem z paczką naklejek. Tworzę nowy cytat...
quote-errors-sticker_set_full =
    📦 <b>Paczka naklejek pełna</b>
    Paczka naklejek osiągnęła swój limit. Twój cytat zostanie wysłany jako zwykła naklejka.
quote-errors-bot_blocked =
    🚫 <b>Bot zablokowany</b>
    Zablokowałeś tego bota. Odblokuj go, aby otrzymać cytaty.
quote-errors-user_deactivated =
    👤 <b>Problem z kontem</b>
    Konto docelowego użytkownika jest zdezaktywowane lub usunięte.
quote-errors-message_too_long =
    📝 <b>Zbyt długa wiadomość</b>
    Cytowana wiadomość jest zbyt długa. Spróbuj cytować mniej wiadomości lub krótszy tekst.
quote-errors-network_error =
    🌐 <b>Błąd sieci</b>
    Wystąpił problem z połączeniem. Spróbuj ponownie za chwilę.
quote-errors-timeout_error =
    ⏱️ <b>Błąd czasu oczekiwania</b>
    Żądanie trwało zbyt długo. Spróbuj ponownie z prostszym cytatem.
quote-image_to_quote-processing = 🔍 Analizowanie obrazu i wyciąganie tekstu...
quote-image_to_quote-success =
    ✅ Cytat stworzony z { $count } wiadomości!

    💡 <b>Wskazówka:</b> Wyślij zrzut ekranu z podpisem <code>/qi</code> lub <code>/quote_image</code>, aby stworzyć cytaty
quote-image_to_quote-errors-no_image = ❌ Proszę wyślij plik graficzny (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Obraz jest za duży. Maksymalny rozmiar: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Niewspierany format obrazu. Obsługiwane: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Nie udało się znaleźć czytelnych wiadomości czatu na obrazie. Upewnij się, że to wyraźny zrzut rozmowy.
quote-image_to_quote-errors-parse_error = ❌ Błąd rozpoznania. Obraz może nie zawierać wyraźnego tekstu rozmowy.
quote-image_to_quote-errors-api_error = ❌ Błąd rozpoznania tekstu. Spróbuj ponownie.
quote-image_to_quote-errors-rate_limit = ⏳ Zbyt wiele żądań! Poczekaj { $seconds } sekund przed ponowną próbą.
sticker-save-suc = Pomyślnie dodano do Twojego <a href="{ $link }">pakietu naklejek grupy</a> ✨
sticker-save-error-animated = Przepraszam, nie mogę zapisać animowanych naklejek jeszcze 😅
sticker-save-error-need_creator = <b>Prawie gotowe!</b> { $creator } musi najpierw wysłać mi wiadomość, aby zapisać naklejki
sticker-save-error-telegram = <b>Ups!</b> Coś poszło nie tak:\n<pre>{ $error }</pre>
sticker-delete-suc = Usunięto z Twojego <a href="{ $link }">pakietu naklejek grupy</a> 🗑
sticker-delete-empty_reply = Proszę odpowiedzieć na naklejkę, którą chcesz usunąć 🗑
sticker-delete-error-telegram =
    <b>Nie udało się usunąć naklejki 😕</b>
    { $reason }
sticker-delete-error-not_found = Naklejka nie znajduje się już w pakiecie 🤔
sticker-delete-error-rights = Nie mam uprawnień do usunięcia tej naklejki 🔒
sticker-delete-error-generic =
    Coś poszło nie tak. Proszę spróbować ponownie później ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Usunięto z losowej kolekcji 🗑
sticker-delete_random-error =
    <b>Nie udało się usunąć cytatu 😕</b>
    { $error }
sticker-delete_random-not_found = Tego cytatu nie ma w bazie danych 🤔
sticker-empty_forward = Odpowiedz na naklejkę, zdjęcie lub obraz, który chcesz zapisać ✨
sticker-fstik = Aby zapisać to do swojego osobistego pakietu naklejek, przekaż do @fStikBot 🎨
rate-vote-rated = Ty { $rateName } ten cytat
rate-vote-back = Twój głos został usunięty
rate-settings-enable = Ocena cytatów jest teraz włączona
rate-settings-disable = Ocena cytatów została wyłączona
random-empty = W tej grupie nie ma jeszcze cytatów o wysokiej ocenie! Zacznij oceniać cytaty
random-gab = Częstotliwość losowych cytatów ustawiona na { $gab } ✨
hidden-settings-enable = Wyszukiwanie nadawcy włączone 🔍
hidden-settings-disable = Wyszukiwanie nadawcy wyłączone 🔄
privacy-settings-enable = Tryb prywatności aktywowany 🔒 Twoje informacje będą ukryte w cytatach
privacy-settings-disable = Tryb prywatności dezaktywowany 🔓
top-info = <b>✨ Najczęściej cytowane wiadomości</b>
top-open = Zobacz najlepsze cytaty
donate-info =
    <b>Wspieraj rozwój QuotLyBot! ☕</b>

    Twoje wsparcie pomaga nam:
    • Utrzymać działanie serwerów 24/7
    • Dodawać nowe funkcje i style
    • Poprawiać jakość cytatów
    • Przyspieszać działanie bota

    <b>💳 Łatwe opcje płatności</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Płatność kartą</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Kryptowaluty (dla zaawansowanych użytkowników)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Każdy wkład pomaga sprawić, że QuotLyBot będzie lepszy dla wszystkich! 💜
donate-title = Wspieraj { $botUsername }
donate-description = Pomóż utrzymać magię ✨
donate-successful =
    <b>Dziękujemy za wsparcie! 💜</b>
    Pomagasz uczynić QuotLyBot jeszcze lepszym!
donate-pay = 💜 Zapłać przez Telegram
donate-other = Inne opcje
emoji-info =
    <b>Wybierz swoje emoji dla cytatów!</b>

    • Ustaw niestandardowe emoji: <code>/qemoji</code>💜
    • Użyj losowego emoji: <code>/qemoji random</code>
    • Wyczyść emoji: <code>/qemoji clear</code>

    Twoje emoji zostanie dodane do wszystkich nowych cytatów ✨
emoji-done = Styl emoji zaktualizowany! ✨
only_admin =
    <b>⚠️ Wymagana dostępność administratora</b>
    Ta komenda może być użyta tylko przez administratorów grupy.
only_group =
    <b>⚠️ Komenda grupowa</b>
    Ta funkcja działa tylko w czatach grupowych.
rate_limit =
    <i>Krótkie przerwa...</i> Możesz ponownie użyć tej komendy za { $seconds } sekund ⏳

    <i>Porada eksperta: Czekając, spróbuj dostosować swój ostatni cytat za pomocą </i><code>/q color</code> <i>lub</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    Zmień wiadomości w oszałamiające naklejki z cytatami!
menu-btn-features = ✨ Funkcje
menu-btn-settings = ⚙️ Ustawienia
menu-btn-help = 📚 Komendy
menu-btn-language = 🌍 Język
menu-btn-back = ← Wstecz
menu-btn-add_group = ➕ Dodaj do Grupy
menu-features-title =
    <b>✨ Co mogę zrobić?</b>
    Dotknij funkcji, aby dowiedzieć się więcej:
menu-features-btn-basics = 📱 Podstawy
menu-features-btn-colors = 🎨 Kolory i Style
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Funkcje Grupy
menu-features-basics-title =
    <b>📱 Podstawowe Cytowanie</b>

    <b>W grupach:</b>
    Odpowiedz na dowolną wiadomość z <code>/q</code>

    <b>Prywatnie:</b>
    Przekaż mi wiadomości

    <b>Wiele wiadomości:</b>
    <code>/q 3</code> — odpowiedziana wiadomość + poniżej
    <code>/q -3</code> — odpowiedziana wiadomość + powyżej
menu-features-colors-title =
    <b>🎨 Kolory i Style</b>

    <b>Podstawowe kolory:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Niestandardowy kolor:</b>
    <code>/q #ff69b4</code>

    <b>Losowy kolor:</b>
    <code>/q random</code>

    <b>Gradient:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 Opcje Mediów</b>

    <b>Dołącz media:</b>
    <code>/q m</code> lub <code>/q media</code>

    <b>Przytnij media:</b>
    <code>/q c</code> lub <code>/q crop</code>

    <b>Pokaż odpowiedzi:</b>
    <code>/q r</code> lub <code>/q reply</code>

    <b>Jako obraz:</b>
    <code>/q img</code> lub <code>/q png</code>
menu-features-group-title =
    <b>👥 Funkcje Grupy</b>

    <b>Dla adminów:</b>
    • <code>/qcolor blue</code> — domyślny kolor
    • <code>/qrate</code> — włącz oceny
    • <code>/qs</code> — zapisz do pakietu naklejek

    <b>Dla wszystkich:</b>
    • <code>/qtop</code> — najlepsze cytaty
    • <code>/qrand</code> — losowy cytat
menu-settings-title =
    <b>⚙️ Ustawienia</b>
    Zarządzaj swoimi preferencjami:
menu-settings-btn-privacy = 🔒 Prywatność
menu-settings-btn-language = 🌍 Język
menu-help-title =
    <b>📚 Komendy</b>

    <b>Podstawowe:</b>
    • <code>/q</code> — utwórz cytat
    • <code>/lang</code> — zmień język
    • <code>/donate</code> — wspieraj rozwój

    <b>Dla adminów:</b>
    • <code>/qcolor</code> — domyślny kolor
    • <code>/qrate</code> — włącz oceny
    • <code>/qb</code> — styl emoji
onboarding-welcome-title =
    <b>Cześć! 👋</b>

    Zamieniam zwykłe wiadomości czatu w oszałamiające naklejki z cytatami.

    ✨ <b>Pozwól mi pokazać, jak to działa!</b>
onboarding-welcome-btn-start = Zaczynamy! →
onboarding-welcome-btn-skip = Pomiń samouczek
onboarding-step1-title =
    <b>Krok 1: Przekaż wiadomość</b>

    Przekaż mi teraz dowolną wiadomość z czatu.

    💡 <i>Wskazówka: Możesz przekazać wiele wiadomości naraz!</i>
onboarding-step2-title =
    <b>Świetnie! Oto twój cytat! ✨</b>

    W grupach po prostu użyj <code>/q</code>, aby odpowiedzieć na dowolną wiadomość.
onboarding-step2-btn-complete = Rozumiem! ✓
onboarding-complete-title =
    <b>Gotowe! 🎉</b>

    Teraz znasz podstawy. Eksploruj menu, aby odkryć więcej funkcji!

aimode-title = 🤖 <b>Tryby SI</b>
aimode-current = Bieżący tryb: { $mode }
aimode-available = <b>Dostępne tryby:</b>
aimode-unknown = ❌ Nieznany tryb: <code>{ $mode }</code>
aimode-available_list = Dostępne: { $modes }
aimode-success = ✅ Tryb SI zmieniony na: { $mode }
aimode-error = ❌ Błąd podczas zapisywania ustawień
aimode-modes-sarcastic-name = 😏 Sarkastyczny
aimode-modes-sarcastic-description = Sarkastyczne i dowcipne komentarze z czarnym humorem
aimode-modes-philosopher-name = 🧠 Filozof
aimode-modes-philosopher-description = Głębokie myśli i refleksje filozoficzne
aimode-modes-comedian-name = 😂 Komik
aimode-modes-comedian-description = Zabawne żarty i komediowe komentarze
aimode-modes-poet-name = 📝 Poeta
aimode-modes-poet-description = Poetyckie wersy i piękne metafory
aimode-modes-motivator-name = 💪 Motywator
aimode-modes-motivator-description = Motywujące i inspirujące wiadomości
aimode-modes-conspiracy-name = 🕵️ Spiskowiec
aimode-modes-conspiracy-description = Teorie spiskowe i podejrzliwe komentarze
aimode-modes-critic-name = 🎭 Krytyk
aimode-modes-critic-description = Krytyczne recenzje i oceny wszystkiego
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Staroszkolne komentarze starszego pokolenia
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Młodzieżowy slang i modne zwroty
aimode-modes-academic-name = 🎓 Naukowiec
aimode-modes-academic-description = Fakty naukowe i akademickie komentarze
aimode-modes-memer-name = 🐸 Memiarz
aimode-modes-memer-description = Memowe frazy i kultura internetowa
app-open_quote = ✨ Otwórz cytat
app-open_group = 📚 Wszystkie cytaty w grupie
app-open_root = 💫 Moje grupy
app-info =
    <b>Wszystko żyje także w aplikacji 💬</b>

    Przeglądaj cytaty, zanurz się w archiwum, poluj na najlepsze — o jedno dotknięcie. Naciśnij przycisk ↓
menu-settings-btn-color = 🎨 Domyślny kolor
menu-settings-btn-emoji_style = 😊 Styl emoji
menu-settings-btn-back = ← Wstecz
onboarding-step1-waiting =
    Czekam na twoją wiadomość...
    Po prostu prześlij mi coś z dowolnego czatu!
onboarding-step2-btn-menu = Otwórz menu
onboarding-step2-btn-add_group = Dodaj do grupy
quick_action-remake = 🔄
quick_action-tooltip-remake = Utwórz ponownie w innym stylu
qarchive-on = ✅ Archiwum tekstu cytatów <b>włączone</b>. Nowe cytaty będą zapisywane z tekstem i autorem.
qarchive-off = ⏸ Archiwum tekstu cytatów <b>wyłączone</b>. Nowe cytaty będą zapisywać tylko naklejkę i ocenę.
qarchive-status_on =
    Aktualny stan: <b>włączone</b>.

    <code>/qarchive off</code> — wyłącz
qarchive-status_off =
    Aktualny stan: <b>wyłączone</b>.

    <code>/qarchive on</code> — włącz
qarchive-usage =
    Przełącz archiwum tekstu cytatów dla tej grupy.

    <code>/qarchive on</code> lub <code>/qarchive off</code>
qforget-usage = Podaj numer cytatu: <code>/qforget 142</code>
qforget-not_found = Cytat #{ $local } nie został znaleziony w tej grupie.
qforget-not_author = Tylko autor cytatu może o nim zapomnieć.
qforget-forgotten = ✅ Cytat #{ $local } zapomniany. Naklejka i głosy pozostają, ale tekst i autor zostają usunięte z archiwum.
qforget-already_forgotten = Cytat #{ $local } został już zapomniany.
qforget-not_yet_archived = Cytat #{ $local } nie ma tekstu (utworzony przed archiwum).
guest-hint =
    <b>Quotly — tryb gościa 💬</b>

    Mogę stworzyć naklejkę z cytatem z dowolnej wiadomości <i>bez</i> bycia członkiem czatu.

    <b>Jak używać:</b>
    1. Odpowiedz na wiadomość, którą chcesz zacytować
    2. W swojej odpowiedzi napisz <code>@{ $username }</code>
    3. Gotowe — wrzucę naklejkę z cytatem prosto na czat

    <b>Opcjonalne argumenty (tak jak /q):</b>
    • <code>@{ $username } r</code> — dołącz wiadomość, na którą odpowiadam
    • <code>@{ $username } red</code> — ustaw kolor tła
    • <code>@{ $username } rate</code> — dodaj przyciski 👍 / 👎
    • <code>@{ $username } p</code> — renderuj jako PNG

    Aby uzyskać pełne możliwości, otwórz mnie w wiadomości prywatnej.
guest-hint_short = Jak działa Quotly w trybie gościa
guest-need_reply =
    <b>Już prawie! 🪄</b>

    Aby stworzyć cytat, potrzebuję wiadomości do zacytowania — odpowiedz na jakąś i wspomnij <code>@{ $username }</code>.

    Przykład: dotknij „Odpowiedz" na wiadomości → wpisz <code>@{ $username }</code> → wyślij.
guest-need_reply_short = Odpowiedz na wiadomość i wspomnij bota
guest-empty_query =
    <b>Quotly tutaj 💜</b>

    Odpowiedz na dowolną wiadomość w tym czacie i wspomnij <code>@{ $username }</code>, aby zamienić ją w naklejkę z cytatem.

    Dotknij poniżej, aby otworzyć mnie w wiadomości prywatnej i uzyskać dostęp do wszystkich funkcji.
guest-open_in_pm = Otwórz w Quotly →

sticker-save-error-too_large = Obraz jest za duży (maks. 2048×2048). Spróbuj mniejszego 📐

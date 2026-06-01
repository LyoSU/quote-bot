# Auto-generated from locales/de.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs de

language_name = 🇩🇪 Deutsch
description-short =
    Verwandle jede Nachricht in einen wunderschönen Zitat-Sticker! ✨
    Antworte mit /q oder leite die Nachricht an mich weiter
description-long =
    Erstelle atemberaubende Zitat-Sticker und bewahre deine Lieblingschatmomente! ✨

    Einfach mit /q auf eine Nachricht antworten oder sie zu mir weiterleiten. Perfekt zum Speichern von:
    🌟 Den besten Chat-Highlights und Erinnerungen
    💭 Inspirierenden Gedanken und Gesprächen
    🎨 Kreativen Nachrichten mit benutzerdefinierten Stilen
    ✍️ Wichtigen Notizen im schönen Format

    Fang jetzt an - leite einfach eine Nachricht weiter oder benutze /q!
start =
    <b>Hallo! 👋 Ich bin QuotLyBot</b>

    Ich verwandle gewöhnliche Chatnachrichten in beeindruckende Zitataufkleber. Einfach, kreativ und macht Spaß!

    ✨ <b>Bereit, dein erstes Zitat zu erstellen?</b>
    <b>In privaten Chats:</b> Leite mir beliebige Nachrichten weiter (du kannst sogar mehrere gleichzeitig auswählen!)
    <b>In Gruppen:</b> Füge mich zu deiner Gruppe hinzu und antworte mit <code>/q</code> auf eine beliebige Nachricht

    Möchtest du Farben, Stile und mehr ändern? Gib /help ein, wenn du bereit bist, alle kreativen Möglichkeiten zu entdecken! 🎨
help =
    <b>✨ QuotLyBot: Schnelle & Einfache Zitate! ✨</b>

    Verwandle Nachrichten in Telegram in stilvolle Zitate. So geht's:

    📱 <b>Grundlegendes Zitieren</b>

    • Antworten & Zitieren: Antworte auf eine Nachricht und gib <code>/q</code> ein, um sie zu zitieren.
    • Mehrere Zitate: Antworte auf die erste von mehreren Nachrichten, gib <code>/q [Anzahl]</code> ein (z.B. <code>/q 3</code>), um mehrere zu zitieren.
    • Weiterleiten & Zitieren: Leite eine Nachricht an den Bot weiter, um sie direkt zu zitieren.

    🎨 <b>Gestalte dein Zitat</b>

    • Farben:
        • Einfach: <code>/q red</code> (oder blue, green, etc.)
        • Benutzerdefiniert: <code>/q #[Hex-Farbcode]</code> (z.B. <code>/q #cbafff</code>)
        • Zufällig: <code>/q random</code>
    • Medien: Füge Bilder/Videos aus der zitierten Nachricht mit <code>/q m</code> oder <code>/q media</code> hinzu
        • Medien zuschneiden: Verwende <code>/q c</code> oder <code>/q crop</code>, um die Medien zuzuschneiden.
    • Antworten beibehalten: Zeige die Nachricht, auf die geantwortet wird, mit <code>/q r</code> oder <code>/q reply</code> an
    • Bildformat: Verwende <code>/q i</code> oder <code>/q img</code> oder <code>/q p</code> oder <code>/q png</code> für Bildzitate (anstatt Aufklebern).

    💡 <b>Coole Kombinationen</b>

    • Weißes Zitat mit Antworten: <code>/q white rp</code>
    • Hochwertiges rotes Bild: <code>/q i red s3.2</code>
    • Zitat mit Medien & Antworten: <code>/q r #cbafff m</code>

    ⚙️ <b>Weitere Optionen</b>

    • Zitate bewerten: <code>/q rate</code> (wenn in der Gruppe aktiviert)
    • Zufallszitat: <code>/qrand</code> (wenn in der Gruppe aktiviert)
    • Top-Zitate: <code>/qtop</code> (wenn in der Gruppe aktiviert)
    • Sprache ändern: <code>/lang</code>

    🎯 <b>Gruppen-Admin-Einstellungen</b> (nur für Gruppen-Admins)

    • Standardfarbe: <code>/qcolor [Farbe]</code>
    • Bewertung aktivieren: <code>/qrate</code>
    • Zum Sticker-Pack speichern: <code>/qs [Emoji]</code>
    • Sticker entfernen: <code>/qd</code> (Auf die Sticker antworten)
    • Häufigkeit von Zufallszitaten: <code>/qgab [Anzahl]</code>
    • Ändern des Emoji-Suffix: <code>/qemoji</code> (Sticker-Emoji-Suffix ändern)
    • Emoji-Stil:
        • Klassisch: <code>/qb apple</code>, <code>/qb google</code>
        • Alternativ: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>Brauchst du Hilfe?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Unterstützung: <code>/donate</code>
help_group =
    <b>Hallo! 👋</b>
    Ich erstelle schöne Zitate in dieser Gruppe - einfach <code>/q</code> als Antwort auf eine Nachricht verwenden!

    Lerne alle meine Funktionen im Privaten kennen: <a href="t.me/{ $username }?start=help">Hilfe bekommen</a> ✨
btn-add_group = Zur Gruppe hinzufügen
btn-help = Hilfe
quote-unsupported_message = Dieser Nachrichtentyp wird nicht für Zitate unterstützt
quote-api_error =
    <b>Ups! Etwas ist schiefgelaufen 😅</b>
    <pre>{ $error }</pre>
    Bitte versuchen Sie es in einem Moment noch einmal!
quote-empty_forward = Bitte antworten Sie auf oder leiten Sie die Nachricht weiter, die Sie zitieren möchten ✨
quote-set_background_color = <b>Perfekt!</b> Zitat-Hintergrund geändert zu: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Fertig!</b> Emoji-Stil geändert zu: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Unser Zitat-Service ist vorübergehend nicht verfügbar. Bitte versuche es in ein paar Minuten erneut.

    Wenn das Problem weiterhin besteht, schau auf @LyBlog für Updates.
quote-errors-rate_limit = ⏳ Zu viele Anfragen! Bitte warte { $seconds } Sekunden, bevor du ein weiteres Zitat erstellst.
quote-errors-file_too_large = 📸 Die Mediendatei ist zu groß (max MB). Versuche, ein kleineres Bild oder Video zu verwenden.
quote-errors-invalid_format =
    ❌ Nicht unterstütztes Dateiformat. Ich unterstütze:
    • Bilder (JPG, PNG, WEBP)
    • Videos (MP4)
    • Sticker
    • Textnachrichten
quote-errors-telegram_error =
    ⚠️ Telegram-Fehler: { $error }

    Dies passiert normalerweise, wenn:
    • Die Datei zu groß ist
    • Das Sticker-Paket voll ist
    • Dem Bot fehlen Berechtigungen
quote-errors-generic_error =
    😅 Ups! Es ist ein Fehler aufgetreten:
    <code>{ $error }</code>

    Bitte versuchen Sie es erneut oder melden Sie das an @Ly_oBot, wenn es weiterhin besteht.
quote-errors-no_rights_send_documents =
    🚫 <b>Berechtigungsfehler</b>
    Ich habe keine Berechtigung, Dokumente in diesem Chat zu senden.

    <b>Um dies zu beheben:</b>
    • Gruppenadministrator: Geben Sie mir die Berechtigung "Dokumente senden"
    • Privater Chat: Stellen Sie sicher, dass Sie den Bot nicht blockiert haben
quote-errors-no_rights_send_stickers =
    🚫 <b>Berechtigungsfehler</b>
    Ich habe keine Berechtigung, Sticker in diesem Chat zu senden.

    <b>Um dies zu beheben:</b>
    • Gruppenadministrator: Geben Sie mir die Berechtigung "Sticker senden"
    • Versuchen Sie, das <code>/q img</code>-Format für Bilder zu verwenden
quote-errors-no_rights_send_photos =
    🚫 <b>Berechtigungsfehler</b>
    Ich habe keine Berechtigung, Fotos in diesem Chat zu senden.

    <b>Um dies zu beheben:</b>
    • Gruppenadministrator: Geben Sie mir die Berechtigung "Fotos senden"
    • Versuchen Sie, das <code>/q</code>-Format für Sticker zu verwenden
quote-errors-chat_write_forbidden =
    🚫 <b>Chat eingeschränkt</b>
    Ich kann keine Nachrichten in diesem Chat senden.

    <b>Mögliche Gründe:</b>
    • Sie haben den Bot blockiert
    • Die Gruppe hat Bots eingeschränkt
    • Ich wurde aus der Gruppe entfernt
quote-errors-sticker_set_invalid =
    🔄 <b>Stickerpack-Problem</b>
    Es gibt ein Problem mit dem Stickerpack. Ein neues Zitat wird erstellt...
quote-errors-sticker_set_full =
    📦 <b>Stickerpack voll</b>
    Das Stickerpack hat sein Limit erreicht. Ihr Zitat wird als normaler Sticker gesendet.
quote-errors-bot_blocked =
    🚫 <b>Bot blockiert</b>
    Sie haben diesen Bot blockiert. Bitte entsperren Sie ihn, um Zitate zu erhalten.
quote-errors-user_deactivated =
    👤 <b>Konto Problem</b>
    Das Zielbenutzerkonto ist deaktiviert oder gelöscht.
quote-errors-message_too_long =
    📝 <b>Nachricht zu lang</b>
    Die zitierte Nachricht ist zu lang. Versuchen Sie, weniger Nachrichten oder kürzere Texte zu zitieren.
quote-errors-network_error =
    🌐 <b>Netzwerkfehler</b>
    Es trat ein Verbindungsproblem auf. Bitte versuchen Sie es in einem Moment erneut.
quote-errors-timeout_error =
    ⏱️ <b>Timeout-Fehler</b>
    Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut mit einem einfacheren Zitat.
quote-image_to_quote-processing = 🔍 Bild wird analysiert und Text wird extrahiert...
quote-image_to_quote-success =
    ✅ Zitat aus { $count } Nachrichten erstellt!

    💡 <b>Tipp:</b> Senden Sie einen Screenshot mit der Beschriftung <code>/qi</code> oder <code>/quote_image</code>, um Zitate zu erstellen
quote-image_to_quote-errors-no_image = ❌ Bitte senden Sie eine Bilddatei (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Bild ist zu groß. Maximale Größe: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Nicht unterstütztes Bildformat. Unterstützt: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Es konnten keine lesbaren Chatnachrichten im Bild gefunden werden. Stellen Sie sicher, dass es sich um einen klaren Screenshot einer Konversation handelt.
quote-image_to_quote-errors-parse_error = ❌ Erkennungsfehler. Das Bild enthält möglicherweise keinen klaren Konversationstext.
quote-image_to_quote-errors-api_error = ❌ Texterkennungsfehler. Bitte versuchen Sie es erneut.
quote-image_to_quote-errors-rate_limit = ⏳ Zu viele Anfragen! Bitte warten Sie { $seconds } Sekunden, bevor Sie es erneut versuchen.
sticker-save-suc = Erfolgreich zu Ihrem <a href="{ $link }">Gruppen-Stickerpack</a> hinzugefügt ✨
sticker-save-error-animated = Entschuldigung, animierte Sticker kann ich noch nicht speichern 😅
sticker-save-error-need_creator = <b>Fast fertig!</b> { $creator } muss mir zuerst eine Nachricht senden, um Sticker zu speichern
sticker-save-error-telegram = <b>Ups!</b> Etwas ist schiefgelaufen:\n<pre>{ $error }</pre>
sticker-delete-suc = Von Ihrem <a href="{ $link }">Gruppen-Stickerpack</a> entfernt 🗑
sticker-delete-empty_reply = Bitte antworten Sie auf einen Sticker, den Sie löschen möchten 🗑
sticker-delete-error-telegram =
    <b>Sticker konnte nicht entfernt werden 😕</b>
    { $reason }
sticker-delete-error-not_found = Der Sticker existiert nicht mehr im Paket 🤔
sticker-delete-error-rights = Ich habe keine Berechtigung, diesen Sticker zu löschen 🔒
sticker-delete-error-generic =
    Etwas ist schief gelaufen. Bitte versuchen Sie es später noch einmal ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Von der zufälligen Sammlung entfernt 🗑
sticker-delete_random-error =
    <b>Konnte das Zitat nicht entfernen 😕</b>
    { $error }
sticker-delete_random-not_found = Dieses Zitat befindet sich nicht in der Datenbank 🤔
sticker-empty_forward = Bitte antworten Sie auf einen Sticker, ein Foto oder ein Bild, das Sie speichern möchten ✨
sticker-fstik = Um dies in Ihrem persönlichen Stickerpack zu speichern, leite zu @fStikBot weiter 🎨
rate-vote-rated = Sie { $rateName } dieses Zitat
rate-vote-back = Ihr Vote wurde entfernt
rate-settings-enable = Zitate-Bewertung ist jetzt aktiviert
rate-settings-disable = Zitate-Bewertung wurde deaktiviert
random-empty = Noch keine hoch bewerteten Zitate in dieser Gruppe! Beginnen Sie damit, einige Nachrichten zu bewerten
random-gab = Zufällige Zitatfrequenz auf { $gab } eingestellt ✨
hidden-settings-enable = Sendersuche aktiviert 🔍
hidden-settings-disable = Sendersuche deaktiviert 🔄
privacy-settings-enable = Datenschutzmodus aktiviert 🔒 Ihre Daten werden in Zitaten verborgen
privacy-settings-disable = Datenschutzmodus deaktiviert 🔓
top-info = <b>✨ Meistzitierte Nachrichten</b>
top-open = Top Zitate anzeigen
donate-info =
    <b>Unterstützen Sie die Entwicklung von QuotLyBot! ☕</b>

    Ihre Unterstützung hilft uns:
    • Die Server rund um die Uhr (<b>24</b>/<b>7</b>) am Laufen zu halten
    • Neue Funktionen und Stile hinzuzufügen
    • Die Zitatqualität zu verbessern
    • Den Bot schneller zu machen

    <b>💳 Einfache Zahlungsmöglichkeiten</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Kartenzahlung</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Kryptowährungen (für technisch Versierte)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Jeder Beitrag hilft, QuotLyBot für alle besser zu machen! 💜
donate-title = Unterstützen Sie { $botUsername }
donate-description = Helfen Sie, die Magie am Laufen zu halten ✨
donate-successful =
    <b>Danke für Ihre Unterstützung! 💜</b>
    Sie helfen mit, QuotLyBot noch besser zu machen!
donate-pay = 💜 Per Telegram zahlen
donate-other = Andere Optionen
emoji-info =
    <b>Wählen Sie Ihr Zitat-Emoji!</b>

    • Benutzerdefinierten Emoji setzen: <code>/qemoji</code>💜
    • Zufälligen Emoji verwenden: <code>/qemoji random</code>
    • Emoji löschen: <code>/qemoji clear</code>

    Ihr Emoji wird zu allen neuen Zitaten hinzugefügt ✨
emoji-done = Emoji-Stil aktualisiert! ✨
only_admin =
    <b>⚠️ Admin-Zugriff erforderlich</b>
    Dieser Befehl kann nur von Gruppenadministratoren verwendet werden.
only_group =
    <b>⚠️ Gruppenbefehl</b>
    Diese Funktion funktioniert nur in Gruppenchats.
rate_limit =
    <i>Mache eine kurze Pause...</i> Sie können diesen Befehl in { $seconds } Sekunden erneut verwenden ⏳

    <i>Profi-Tipp: Während Sie warten, versuchen Sie, Ihr letztes Zitat mit </i><code>/q color</code> <i>oder</i> <code>/q media</code> <i>anzupassen</i>
menu-title =
    <b>🎨 QuotLyBot</b>

    Verwandelt Nachrichten in stilvolle Zitat-Sticker!
menu-btn-features = ✨ Funktionen
menu-btn-settings = ⚙️ Einstellungen
menu-btn-help = 📚 Befehle
menu-btn-language = 🌍 Sprache
menu-btn-back = ← Zurück
menu-btn-add_group = ➕ Zur Gruppe
menu-settings-title =
    <b>⚙️ Einstellungen</b>

    Passen Sie Ihre Zitate an:
menu-settings-btn-color = 🎨 Farbe
menu-settings-btn-emoji_style = 😊 Emoji-Stil
menu-settings-btn-privacy = 🔒 Privatsphäre
menu-settings-btn-back = ← Zurück
menu-features-title =
    <b>✨ Was kann ich?</b>

    Tippen Sie für mehr Info:
menu-features-btn-basics = 📱 Grundlagen
menu-features-btn-colors = 🎨 Farben
menu-features-btn-media = 🖼 Medien
menu-features-btn-group = 👥 Gruppen
menu-features-basics-title =
    <b>📱 Grundlagen</b>

    <b>Privater Chat:</b>
    Nachricht weiterleiten → Sticker erhalten!

    <b>Gruppen:</b>
    Antworten Sie mit <code>/q</code>

    <b>Mehrere Nachrichten:</b>
    <code>/q 3</code> — Nachricht + darunter
    <code>/q -3</code> — Nachricht + darüber

    <b>Bildformat:</b>
    <code>/q img</code> — PNG statt Sticker
menu-features-colors-title =
    <b>🎨 Farben & Stile</b>

    <b>Farbnamen:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Eigene Farbe (hex):</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Spezial:</b>
    <code>/q random</code> — zufälliger Verlauf
    <code>/q transparent</code> — ohne Hintergrund

    <b>Emoji-Stile:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Setzen: <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Medien in Zitaten</b>

    <b>Medien hinzufügen:</b>
    <code>/q m</code> — fügt Bilder/Videos hinzu

    <b>Medien zuschneiden:</b>
    <code>/q c</code> — auf Größe zuschneiden

    <b>Antwort zeigen:</b>
    <code>/q r</code> — beantwortete Nachricht

    <b>HD-Qualität:</b>
    <code>/q s3.2</code> — höhere Auflösung

    <b>Kombinieren:</b>
    <code>/q m r red</code> — Medien + Antwort + Farbe
menu-features-group-title =
    <b>👥 Gruppenfunktionen</b>

    <b>Zitate bewerten:</b>
    👍👎 Tasten bei Zitaten
    Aktivieren: <code>/qrate</code>

    <b>Top-Zitate:</b>
    <code>/qtop</code> — beste Zitate

    <b>Zufälliges Zitat:</b>
    <code>/qrand</code> — zufällig aus Top

    <b>Sticker-Pack:</b>
    <code>/qs 💜</code> — zum Pack hinzufügen
    <code>/qd</code> — aus Pack entfernen
onboarding-welcome-title =
    <b>Hallo! 👋</b>

    Ich verwandle Chat-Nachrichten in schöne Zitat-Sticker.
    Lass mich zeigen, wie es funktioniert!
onboarding-welcome-btn-start = Los geht's! →
onboarding-welcome-btn-skip = Überspringen
onboarding-step1-title =
    <b>Schritt von 2</b> 📨

    Leiten Sie mir eine Nachricht aus einem Chat weiter.
    Ich mache daraus einen Zitat-Sticker!
onboarding-step1-waiting =
    Warte auf Ihre Nachricht...
    Leiten Sie einfach etwas weiter!
onboarding-step2-title =
    <b>Super! 🎉</b>

    Sie haben gerade Ihr erstes Zitat erstellt!

    <b>In Gruppen</b> nutzen Sie <code>/q</code> als Antwort.

    Bereit für mehr?
onboarding-step2-btn-menu = Menü öffnen
onboarding-step2-btn-add_group = Zur Gruppe
onboarding-complete-title =
    <b>Alles bereit! ✨</b>

    Jetzt kennen Sie die Grundlagen. Fügen Sie mich einer Gruppe hinzu oder entdecken Sie alle Funktionen im Menü.

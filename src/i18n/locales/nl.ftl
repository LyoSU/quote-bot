# Auto-generated from locales/nl.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs nl

language_name = 🇳🇱 Nederlands
description-short =
    Maak van elk bericht een prachtige citaatsticker! ✨
    Reageer met /q of stuur het bericht naar mij
description-long =
    Maak verbluffende citaatstickers en bewaar je favoriete chatmomenten! ✨

    Reageer eenvoudig met /q op een bericht of stuur het naar mij door. Perfect om te bewaren:
    🌟 Beste chat hoogtepunten en herinneringen
    💭 Inspirerende gedachten en gesprekken
    🎨 Creatieve berichten met aangepaste stijlen
    ✍️ Belangrijke notities in een mooie vorm

    Begin nu - stuur een bericht door of gebruik /q!
start =
    <b>Hallo! 👋 Ik ben QuotLyBot</b>

    Ik transformeer gewone chatberichten in verbluffende quote stickers. Eenvoudig, creatief en leuk in gebruik!

    ✨ <b>Klaar om je eerste quote te maken?</b>
    <b>In privéchats:</b> Stuur alle berichten door naar mij (je kunt er zelfs meerdere tegelijk kiezen!)
    <b>In groepen:</b> Voeg mij toe aan je groep en antwoord met <code>/q</code> op elk bericht

    Wil je kleuren, stijlen en meer veranderen? Typ /help wanneer je klaar bent om alle creatieve mogelijkheden te ontdekken! 🎨
help =
    <b>✨ QuotLyBot: Snel & Gemakkelijk Citeren! ✨</b>

    Zet berichten om in stijlvolle quotes in Telegram. Zo werkt het:

    📱 <b>Basis Citeren</b>

    • Antwoord & Citeren:  Antwoord op een bericht en typ <code>/q</code> om het te citeren.
    • Meerdere Citeren: Reageer op het eerste van meerdere berichten, typ <code>/q [nummer]</code> (bijv. <code>/q 3</code>) om meerdere te citeren.
    • Doorsturen & Citeren: Stuur een bericht door naar de bot om het direct te citeren.

    🎨 <b>Je Citaat Aanpassen</b>

    • Kleuren:
        • Basis: <code>/q red</code> (of blue, green, enz.)
        • Aangepast: <code>/q #[hex kleurcode]</code> (bijv. <code>/q #cbafff</code>)
        • Willekeurig: <code>/q random</code>
    • Media: Voeg afbeeldingen/video's uit het geciteerde bericht toe met <code>/q m</code> of <code>/q media</code>
        • Media Bijsnijden: Gebruik <code>/q c</code> of <code>/q crop</code> om de media bij te snijden.
    • Antwoorden Behoud: Toon het bericht waarop gereageerd wordt met <code>/q r</code> of <code>/q reply</code>
    • Beeldformaat: Gebruik <code>/q i</code> of <code>/q img</code> of <code>/q p</code> of <code>/q png</code> voor beeldquotes (in plaats van stickers).

    💡 <b>Coole Combinaties</b>

    • Witte quote met antwoorden: <code>/q white rp</code>
    • Hoogwaardige rode afbeelding: <code>/q i red s3.2</code>
    • Quote met media & antwoorden: <code>/q r #cbafff m</code>

    ⚙️ <b>Meer Opties</b>

    • Quotes Beoordelen: <code>/q rate</code> (indien ingeschakeld in groep)
    • Willekeurige Quote: <code>/qrand</code> (indien ingeschakeld in groep)
    • Top Quotes: <code>/qtop</code> (indien ingeschakeld in groep)
    • Taal Wijzigen: <code>/lang</code>

    🎯 <b>Groepsbeheer Instellingen</b> (alleen voor groepsbeheerders)

    • Standaardkleur: <code>/qcolor [kleur]</code>
    • Beoordeling Inschakelen: <code>/qrate</code>
    • Opslaan in Sticker Pakket: <code>/qs [emoji]</code>
    • Sticker Verwijderen: <code>/qd</code> (antwoord op sticker)
    • Frequentie Willekeurige Quote: <code>/qgab [nummer]</code>
    • Emoji Achtervoegsel Wijzigen: <code>/qemoji</code> (verander emoji achtervoegsel van sticker)
    • Emoji Stijl:
        • Klassiek: <code>/qb apple</code>, <code>/qb google</code>
        • Alternatief: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>Hulp Nodig?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Ondersteuning: <code>/donate</code>
help_group =
    <b>Hallo! 👋</b>
    Ik maak prachtige citaten in deze groep - gebruik gewoon <code>/q</code> als antwoord op een bericht!

    Leer al mijn functies in privé: <a href="t.me/{ $username }?start=help">Krijg Hulp</a> ✨
btn-add_group = Voeg toe aan groep
btn-help = Hulp
quote-unsupported_message = Dit berichttype wordt niet ondersteund voor quoten
quote-api_error =
    <b>Oeps! Er ging iets mis 😅</b>
    <pre>{ $error }</pre>
    Probeer het over een moment opnieuw!
quote-empty_forward = Reageer of stuur het bericht dat je wilt citeren ✨
quote-set_background_color = <b>Perfect!</b> Citaat achtergrond veranderd naar: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Klaar!</b> Emoji stijl gewijzigd naar: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Onze citaatservice is tijdelijk niet beschikbaar. Probeer het over een paar minuten opnieuw.

    Als het probleem aanhoudt, controleer @LyBlog voor updates.
quote-errors-rate_limit = ⏳ Te veel aanvragen! Wacht { $seconds } seconden voordat je een nieuw citaat maakt.
quote-errors-file_too_large = 📸 Het mediabestand is te groot (maximaal 5MB). Probeer een kleinere afbeelding of video te gebruiken.
quote-errors-invalid_format =
    ❌ Niet-ondersteund bestandsformaat. Ik ondersteun:
    • Afbeeldingen (JPG, PNG, WEBP)
    • Video's (MP4)
    • Stickers
    • Tekstberichten
quote-errors-telegram_error =
    ⚠️ Telegramfout: { $error }

    Dit gebeurt meestal wanneer:
    • Het bestand te groot is
    • Het stickerpakket vol is
    • De bot geen toestemmingen heeft
quote-errors-generic_error =
    😅 Oeps! Er is iets misgegaan:
    <code>{ $error }</code>

    Probeer het opnieuw of meld dit bij @Ly_oBot als het probleem aanhoudt.
quote-errors-no_rights_send_documents =
    🚫 <b>Machtigingenfout</b>
    Ik heb geen toestemming om documenten te verzenden in deze chat.

    <b>Om dit te verhelpen:</b>
    • Groepsbeheerder: Geef mij "Documenten verzenden"-machtiging
    • Privéchat: Zorg ervoor dat je de bot niet hebt geblokkeerd
quote-errors-no_rights_send_stickers =
    🚫 <b>Machtigingenfout</b>
    Ik heb geen toestemming om stickers te verzenden in deze chat.

    <b>Om dit te verhelpen:</b>
    • Groepsbeheerder: Geef mij "Stickers verzenden"-machtiging
    • Probeer <code>/q img</code> te gebruiken voor het afbeeldingsformaat
quote-errors-no_rights_send_photos =
    🚫 <b>Machtigingenfout</b>
    Ik heb geen toestemming om foto's te verzenden in deze chat.

    <b>Om dit te verhelpen:</b>
    • Groepsbeheerder: Geef mij "Foto's verzenden"-machtiging
    • Probeer <code>/q</code> voor het stickerformaat
quote-errors-chat_write_forbidden =
    🚫 <b>Chat Beperkt</b>
    Ik kan geen berichten versturen in deze chat.

    <b>Mogelijke redenen:</b>
    • Je hebt de bot geblokkeerd
    • De groep heeft bots beperkt
    • Ik ben uit de groep verwijderd
quote-errors-sticker_set_invalid =
    🔄 <b>Stickerpakket Probleem</b>
    Er is een probleem met het stickerpakket. Een nieuwe quote wordt gecreëerd...
quote-errors-sticker_set_full =
    📦 <b>Stickerpakket Vol</b>
    Het stickerpakket heeft zijn limiet bereikt. Je quote wordt als een normale sticker verzonden.
quote-errors-bot_blocked =
    🚫 <b>Bot Geblokkeerd</b>
    Je hebt deze bot geblokkeerd. Deblokkeer de bot om citaten te ontvangen.
quote-errors-user_deactivated =
    👤 <b>Accountprobleem</b>
    Het doelgebruikersaccount is gedeactiveerd of verwijderd.
quote-errors-message_too_long =
    📝 <b>Bericht te Lang</b>
    Het geciteerde bericht is te lang. Probeer kortere berichten of minder berichten te citeren.
quote-errors-network_error =
    🌐 <b>Netwerkfout</b>
    Er is een verbindingsprobleem opgetreden. Probeer het over een moment opnieuw.
quote-errors-timeout_error =
    ⏱️ <b>Timeout Fout</b>
    De aanvraag duurde te lang. Probeer opnieuw met een simpelere quote.
quote-image_to_quote-processing = 🔍 Beeld analyseren en tekst extraheren...
quote-image_to_quote-success =
    ✅ Quote gemaakt van { $count } berichten!

    💡 <b>Tip:</b> Stuur schermafbeelding met <code>/qi</code> of <code>/quote_image</code> onderschrift om quotes te maken
quote-image_to_quote-errors-no_image = ❌ Stuur een afbeeldingsbestand (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Afbeelding is te groot. Maximale grootte: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Niet ondersteund afbeeldingsformaat. Ondersteund: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Kon geen leesbare chatberichten in de afbeelding vinden. Zorg dat het een duidelijke schermafbeelding van een gesprek is.
quote-image_to_quote-errors-parse_error = ❌ Herkenningsfout. De afbeelding bevat mogelijk geen duidelijke gesprekstekst.
quote-image_to_quote-errors-api_error = ❌ Tekstherkenningsfout. Probeer het opnieuw.
quote-image_to_quote-errors-rate_limit = ⏳ Te veel verzoeken! Wacht alstublieft { $seconds } seconden voordat je het opnieuw probeert.
sticker-save-suc = Succesvol toegevoegd aan je <a href="{ $link }">groepssticker pakket</a> ✨
sticker-save-error-animated = Sorry, ik kan nog geen geanimeerde stickers opslaan 😅
sticker-save-error-need_creator = <b>Bijna daar!</b> { $creator } moet mij eerst een bericht sturen om stickers op te slaan
sticker-save-error-telegram = <b>Oeps!</b> Er ging iets mis:\n<pre>{ $error }</pre>
sticker-delete-suc = Verwijderd uit je <a href="{ $link }">groepssticker pakket</a> 🗑
sticker-delete-empty_reply = Antwoord op een sticker die je wilt verwijderen 🗑
sticker-delete-error-telegram =
    <b>Oeps!</b> Sticker kon niet worden verwijderd:
    { $reason }
sticker-delete-error-not_found = De sticker bestaat niet meer in het pakket 🤔
sticker-delete-error-rights = Ik heb geen toestemming om deze sticker te verwijderen 🔒
sticker-delete-error-generic =
    Er is iets misgegaan. Probeer het later opnieuw ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Verwijderd uit willekeurige verzameling 🗑
sticker-delete_random-error =
    <b>Kon het citaat niet verwijderen 😕</b>
    { $error }
sticker-delete_random-not_found = Dit citaat staat niet in de database 🤔
sticker-empty_forward = Reageer op een sticker, foto of afbeelding die je wilt opslaan ✨
sticker-fstik = Om dit op te slaan naar je persoonlijke stickerpakket, stuur door naar @fStikBot 🎨
rate-vote-rated = Jij { $rateName } deze quote
rate-vote-back = Je stem is verwijderd
rate-settings-enable = Citaatbeoordeling staat aan
rate-settings-disable = Citaatbeoordeling is uitgeschakeld
random-empty = Nog geen hoog beoordeelde quotes in deze groep! Begin met het beoordelen van quotes
random-gab = Frequentie voor willekeurige citaat ingesteld op { $gab } ✨
hidden-settings-enable = Zoeken door afzender is ingeschakeld 🔍
hidden-settings-disable = Zoekopdracht afzender is uitgeschakeld 🔄
privacy-settings-enable = Privacy modus geactiveerd 🔒 Uw informatie wordt verborgen in citaten
privacy-settings-disable = Privacy modus is uitgeschakeld 🔓
top-info = <b>✨ Top Geciteerde Berichten</b>
top-open = Bekijk Top Citaten
donate-info =
    <b>Steun de Ontwikkeling van QuotLyBot! ☕</b>

    Je steun helpt ons:
    • De servers 24/7 draaiende houden
    • Nieuwe functies en stijlen toevoegen
    • De kwaliteit van citaten verbeteren
    • De bot sneller maken

    <b>💳 Eenvoudige Betaalmethoden</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Betaal met Kaart</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Cryptocurrency (voor de technische gebruikers)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Elke bijdrage helpt om QuotLyBot beter te maken voor iedereen! 💜
donate-title = Steun { $botUsername }
donate-description = Help de magie voort te zetten ✨
donate-successful =
    <b>Bedankt voor uw steun! 💜</b>
    Je helpt QuotLyBot nog beter te maken!
donate-pay = 💜 Betaal via Telegram
donate-other = Andere opties
emoji-info =
    <b>Kies je Citaat Emoji!</b>

    • Stel aangepaste emoji in: <code>/qemoji</code>💜
    • Gebruik willekeurige emoji: <code>/qemoji random</code>
    • Emoji wissen: <code>/qemoji clear</code>

    Je emoji wordt toegevoegd aan alle nieuwe citaten ✨
emoji-done = Emoji stijl bijgewerkt! ✨
only_admin =
    <b>⚠️ Admin Toegang Nodig</b>
    Dit commando kan alleen worden gebruikt door groepsbeheerders.
only_group =
    <b>⚠️ Groepscommando</b>
    Deze functie werkt alleen in groepschats.
rate_limit =
    <i>Even een korte pauze...</i> Je kunt dit commando weer gebruiken over { $seconds } seconden ⏳

    <i>Tip: Terwijl je wacht, probeer je laatste citaat aan te passen met </i><code>/q color</code> <i>of</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    Verander berichten in prachtige citaatstickers!
menu-btn-features = ✨ Functies
menu-btn-settings = ⚙️ Instellingen
menu-btn-help = 📚 Commando's
menu-btn-language = 🌍 Taal
menu-btn-back = ← Terug
menu-btn-add_group = ➕ Toevoegen aan Groep
menu-features-title =
    <b>✨ Wat kan ik doen?</b>
    Tik op een functie om meer te leren:
menu-features-btn-basics = 📱 Basis
menu-features-btn-colors = 🎨 Kleuren & Stijlen
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Groepsfuncties
menu-features-basics-title =
    <b>📱 Basis Citeren</b>

    <b>In groepen:</b>
    Reageer op een bericht met <code>/q</code>

    <b>In privé:</b>
    Stuur berichten naar mij door

    <b>Meerdere berichten:</b>
    <code>/q 3</code> — beantwoord bericht + eronder
    <code>/q -3</code> — beantwoord bericht + erboven
menu-features-colors-title =
    <b>🎨 Kleuren & Stijlen</b>

    <b>Basiskleuren:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Aangepaste kleur:</b>
    <code>/q #ff69b4</code>

    <b>Willekeurige kleur:</b>
    <code>/q random</code>

    <b>Verloop:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 Media Opties</b>

    <b>Media toevoegen:</b>
    <code>/q m</code> of <code>/q media</code>

    <b>Media bijsnijden:</b>
    <code>/q c</code> of <code>/q crop</code>

    <b>Antwoorden tonen:</b>
    <code>/q r</code> of <code>/q reply</code>

    <b>Als afbeelding:</b>
    <code>/q img</code> of <code>/q png</code>
menu-features-group-title =
    <b>👥 Groepsfuncties</b>

    <b>Voor beheerders:</b>
    • <code>/qcolor blue</code> — standaardkleur
    • <code>/qrate</code> — beoordeling inschakelen
    • <code>/qs</code> — opslaan in stickerpakket

    <b>Voor iedereen:</b>
    • <code>/qtop</code> — topcitaten
    • <code>/qrand</code> — willekeurig citaat
menu-settings-title =
    <b>⚙️ Instellingen</b>
    Beheer je voorkeuren:
menu-settings-btn-privacy = 🔒 Privacy
menu-settings-btn-language = 🌍 Taal
menu-help-title =
    <b>📚 Commando's</b>

    <b>Basis:</b>
    • <code>/q</code> — citaat maken
    • <code>/lang</code> — taal wijzigen
    • <code>/donate</code> — ontwikkeling steunen

    <b>Voor beheerders:</b>
    • <code>/qcolor</code> — standaardkleur
    • <code>/qrate</code> — beoordeling inschakelen
    • <code>/qb</code> — emoji stijl
onboarding-welcome-title =
    <b>Hallo! 👋</b>

    Ik verander gewone chatberichten in prachtige citaatstickers.

    ✨ <b>Laat me je laten zien hoe het werkt!</b>
onboarding-welcome-btn-start = Laten we beginnen! →
onboarding-welcome-btn-skip = Tutorial overslaan
onboarding-step1-title =
    <b>Stap 1: Stuur een bericht door</b>

    Stuur nu een chatbericht naar mij door.

    💡 <i>Tip: Je kunt meerdere berichten tegelijk doorsturen!</i>
onboarding-step2-title =
    <b>Geweldig! Hier is je citaat! ✨</b>

    In groepen gebruik je gewoon <code>/q</code> om op een bericht te reageren.
onboarding-step2-btn-complete = Begrepen! ✓
onboarding-complete-title =
    <b>Je bent klaar! 🎉</b>

    Nu ken je de basis. Verken het menu om meer functies te ontdekken!

aimode-title = 🤖 <b>IA-modi</b>
aimode-current = Huidige modus: { $mode }
aimode-available = <b>Beschikbare modi:</b>
aimode-unknown = ❌ Onbekende modus: <code>{ $mode }</code>
aimode-available_list = Beschikbaar: { $modes }
aimode-success = ✅ IA-modus gewijzigd naar: { $mode }
aimode-error = ❌ Fout bij het opslaan van de instellingen
aimode-modes-sarcastic-name = 😏 Sarcastisch
aimode-modes-sarcastic-description = Sarcastische en gevatte opmerkingen met zwarte humor
aimode-modes-philosopher-name = 🧠 Filosoof
aimode-modes-philosopher-description = Diepe gedachten en filosofische overpeinzingen
aimode-modes-comedian-name = 😂 Komiek
aimode-modes-comedian-description = Grappige grappen en komische opmerkingen
aimode-modes-poet-name = 📝 Dichter
aimode-modes-poet-description = Poëtische regels en mooie metaforen
aimode-modes-motivator-name = 💪 Motivator
aimode-modes-motivator-description = Motiverende en inspirerende berichten
aimode-modes-conspiracy-name = 🕵️ Complotdenker
aimode-modes-conspiracy-description = Complottheorieën en verdachte opmerkingen
aimode-modes-critic-name = 🎭 Criticus
aimode-modes-critic-description = Kritische recensies en beoordelingen van alles
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Ouderwetse opmerkingen van de oudere generatie
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Jongerentaal en trendy uitdrukkingen
aimode-modes-academic-name = 🎓 Academicus
aimode-modes-academic-description = Wetenschappelijke feiten en academisch commentaar
aimode-modes-memer-name = 🐸 Memer
aimode-modes-memer-description = Memezinnen en internetcultuur
app-open_quote = ✨ Citaat openen
app-open_group = 📚 Alle citaten in de groep
app-open_root = 💫 Mijn groepen
app-info =
    <b>Het leeft allemaal ook in de app 💬</b>

    Blader door citaten, duik in het archief, jaag op de toppers — één tik verwijderd. Druk op de knop ↓
menu-settings-btn-color = 🎨 Standaardkleur
menu-settings-btn-emoji_style = 😊 Emoji-stijl
menu-settings-btn-back = ← Terug
onboarding-step1-waiting =
    Wachten op je bericht...
    Stuur me gewoon iets door uit een willekeurige chat!
onboarding-step2-btn-menu = Menu openen
onboarding-step2-btn-add_group = Toevoegen aan groep
quick_action-remake = 🔄
quick_action-tooltip-remake = Opnieuw maken met een andere stijl
qarchive-on = ✅ Citaattekst-archief <b>ingeschakeld</b>. Nieuwe citaten worden opgeslagen met tekst en auteur.
qarchive-off = ⏸ Citaattekst-archief <b>uitgeschakeld</b>. Nieuwe citaten slaan alleen de sticker en beoordeling op.
qarchive-status_on =
    Huidige staat: <b>ingeschakeld</b>.

    <code>/qarchive off</code> — uitschakelen
qarchive-status_off =
    Huidige staat: <b>uitgeschakeld</b>.

    <code>/qarchive on</code> — inschakelen
qarchive-usage =
    Citaattekst-archief voor deze groep in- of uitschakelen.

    <code>/qarchive on</code> of <code>/qarchive off</code>
qforget-usage = Geef het citaatnummer op: <code>/qforget 142</code>
qforget-not_found = Citaat #{ $local } niet gevonden in deze groep.
qforget-not_author = Alleen de auteur van het citaat kan het vergeten.
qforget-forgotten = ✅ Citaat #{ $local } vergeten. De sticker en stemmen blijven, maar tekst en auteur worden uit het archief verwijderd.
qforget-already_forgotten = Citaat #{ $local } was al vergeten.
qforget-not_yet_archived = Citaat #{ $local } heeft geen tekst (aangemaakt vóór het archief).
guest-hint =
    <b>Quotly — gastmodus 💬</b>

    Ik kan een citaatsticker maken van elk bericht <i>zonder</i> lid te zijn van de chat.

    <b>Hoe te gebruiken:</b>
    1. Antwoord op het bericht dat je wilt citeren
    2. Schrijf in je antwoord <code>@{ $username }</code>
    3. Klaar — ik plaats een citaatsticker direct in de chat

    <b>Optionele argumenten (net als /q):</b>
    • <code>@{ $username } r</code> — voeg het bericht toe waarop ik antwoord
    • <code>@{ $username } red</code> — stel de achtergrondkleur in
    • <code>@{ $username } rate</code> — voeg 👍 / 👎 knoppen toe
    • <code>@{ $username } p</code> — render als een PNG

    Voor de volledige ervaring open je me in een privéchat.
guest-hint_short = Hoe Quotly werkt in gastmodus
guest-need_reply =
    <b>Bijna klaar! 🪄</b>

    Om een citaat te maken heb ik een bericht nodig om te citeren — antwoord op er een en vermeld <code>@{ $username }</code>.

    Voorbeeld: tik op "Antwoorden" bij een bericht → typ <code>@{ $username }</code> → verstuur.
guest-need_reply_short = Antwoord op een bericht en vermeld de bot
guest-empty_query =
    <b>Quotly hier 💜</b>

    Antwoord op een bericht in deze chat en vermeld <code>@{ $username }</code> om er een citaatsticker van te maken.

    Tik hieronder om me in een privéchat te openen voor alle functies.
guest-open_in_pm = Openen in Quotly →

sticker-save-error-too_large = De afbeelding is te groot (max 2048×2048). Probeer een kleinere 📐

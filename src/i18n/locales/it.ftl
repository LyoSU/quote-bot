# Auto-generated from locales/it.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs it

language_name = 🇮🇹 Italiano
description-short =
    Trasforma qualsiasi messaggio in uno splendido sticker di citazione! ✨
    Rispondi con /q o inoltra il messaggio a me
description-long =
    Crea splendidi sticker di citazioni e preserva i tuoi momenti preferiti della chat! ✨

    Semplicemente rispondi /q a qualsiasi messaggio o inoltralo a me. Perfetto per salvare:
    🌟 I migliori momenti e ricordi delle chat
    💭 Pensieri e conversazioni ispiratrici
    🎨 Messaggi creativi con stili personalizzati
    ✍️ Note importanti in un formato bellissimo

    Inizia ora - basta inoltrare un messaggio o usare /q!
start =
    <b>Ciao! 👋 Sono QuotLyBot</b>

    Trasformo i messaggi di chat ordinari in fantastici adesivi con citazioni. Semplice, creativo e divertente da usare!

    <b>Pronto a creare la tua prima citazione?</b>
    1️⃣ In privato: Inoltra qualsiasi messaggio a me (puoi selezionarne diversi!)
    2️⃣ Nei gruppi: Aggiungimi al tuo gruppo e rispondi con <code>/q</code> a qualsiasi messaggio

    Digita /help quando sei pronto a scoprire tutte le possibilità creative! 🎨
help =
    <b>✨ Guida Rapida di QuotLyBot</b>

    <b>📱 Comandi di Base</b>
    • <code>/q</code> - Cita il messaggio risposto
    • <code>/q 3</code> - Cita diversi messaggi
    • Inoltra il messaggio - Cita direttamente

    <b>🎨 Stili</b>

    Colori:
    • Base: <code>/q red</code>
    • Personalizzato: <code>/q #ff69b4</code>
    • Gradiente: <code>/q red//#blue</code>
    • Casuale: <code>/q random</code>

    Media:
    • Aggiungi foto: <code>/q media</code>
    • Ritaglia immagine: <code>/q crop</code>
    • Mantieni discussione: <code>/q reply</code>
    • Anteprima vocale: Automatica

    Formato:
    • Sticker: <code>/q</code>
    • Immagine: <code>/q img</code>
    • HD: <code>/q png</code>
    • Storia: <code>/q stories</code>

    Qualità:
    • Normale: <code>/q</code>
    • 2x: <code>/q s2</code>
    • 3x: <code>/q s3</code>

    <b>💫 Combinazioni Popolari</b>
    • <code>/q red media</code> - Citazione rossa con foto
    • <code>/q reply</code> - Citazione con contesto
    • <code>/q img s2</code> - Immagine ad alta qualità
    • <code>/q stories media</code> - Storia con foto

    <b>⚙️ Funzioni Extra</b>
    • Valutazione: <code>/q rate</code>
    • Citazioni casuali: <code>/qrand</code>
    • Citazioni top: <code>/qtop</code>
    • Lingua: <code>/lang</code>

    <b>🎯 Impostazioni del Gruppo</b>
    • Colore predefinito: <code>/qcolor</code>
    • Abilita valutazione: <code>/qrate</code>
    • Salva nel pacchetto: <code>/qs</code>

    <b>🌈 Stili Emoji</b>
    Classico: <code>/qb apple</code>, <code>/qb google</code>
    Alt: <code>/qb twitter</code>, <code>/qb joypixels</code>
    Retro: <code>/qb blob</code>

    <b>📱 Hai Bisogno di Aiuto?</b>
    • Blog: @LyBlog
    • GitHub: github.com/LyoSU/quote-bot
    • Supporto: <code>/donate</code>
help_group =
    <b>Ciao! 👋</b>
    Creerò splendide citazioni in questo gruppo - basta usare <code>/q</code> in risposta a qualsiasi messaggio!

    Scopri tutte le mie funzionalità in privato: <a href="t.me/{ $username }?start=help">Ottieni Aiuto</a> ✨
btn-add_group = Aggiungi al Gruppo
btn-help = Aiuto
quote-unsupported_message = Questo tipo di messaggio non è supportato per la citazione
quote-api_error =
    <b>Oops! Qualcosa è andato storto 😅</b>
    <pre>{ $error }</pre>
    Riprova tra un momento!
quote-empty_forward = Per favore, rispondi o inoltra il messaggio che desideri citare ✨
quote-set_background_color = <b>Perfetto!</b> Sfondo della citazione cambiato in: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Fatto!</b> Stile emoji cambiato in: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Il servizio citazioni è temporaneamente non disponibile. Per favore, riprova tra qualche minuto.

    Se il problema persiste, controlla @LyBlog per aggiornamenti.
quote-errors-rate_limit = ⏳ Troppe richieste! Attendi { $seconds } secondi prima di creare un'altra citazione.
quote-errors-file_too_large = 📸 Il file multimediale è troppo grande (max 5MB). Prova a usare un'immagine o un video più piccolo.
quote-errors-invalid_format =
    ❌ Formato file non supportato. Supporto:
    • Immagini (JPG, PNG, WEBP)
    • Video (MP4)
    • Adesivi
    • Messaggi di testo
quote-errors-telegram_error =
    ⚠️ Errore di Telegram: { $error }

    Questo di solito accade quando:
    • Il file è troppo grande
    • Il pacchetto di adesivi è pieno
    • Il bot non ha permessi
quote-errors-generic_error =
    😅 Ops! Qualcosa è andato storto:
    <code>{ $error }</code>

    Per favore riprova o segnala questo a @Ly_oBot se persiste.
quote-errors-no_rights_send_documents =
    🚫 <b>Errore Di Permesso</b>
    Non ho il permesso di inviare documenti in questa chat.

    <b>Per risolvere questo problema:</b>
    • Amministratore del gruppo: Dammi il permesso "Inviare documenti"
    • Chat privata: Assicurati di non aver bloccato il bot
quote-errors-no_rights_send_stickers =
    🚫 <b>Errore Di Permesso</b>
    Non ho il permesso di inviare sticker in questa chat.

    <b>Per risolvere questo problema:</b>
    • Amministratore del gruppo: Dammi il permesso "Inviare sticker"
    • Prova a usare <code>/q img</code> per il formato immagine invece
quote-errors-no_rights_send_photos =
    🚫 <b>Errore Di Permesso</b>
    Non ho il permesso di inviare foto in questa chat.

    <b>Per risolvere questo problema:</b>
    • Amministratore del gruppo: Dammi il permesso "Inviare foto"
    • Prova a usare <code>/q</code> per il formato sticker invece
quote-errors-chat_write_forbidden =
    🚫 <b>Chat Limitata</b>
    Non posso inviare messaggi in questa chat.

    <b>Possibili motivi:</b>
    • Hai bloccato il bot
    • Il gruppo ha limitato i bot
    • Sono stato rimosso dal gruppo
quote-errors-sticker_set_invalid =
    🔄 <b>Problema Con Il Pacchetto Di Sticker</b>
    C'è un problema con il pacchetto di sticker. Creazione di una nuova citazione...
quote-errors-sticker_set_full =
    📦 <b>Pacchetto Di Sticker Pieno</b>
    Il pacchetto di sticker ha raggiunto il limite. La tua citazione sarà inviata come sticker normale.
quote-errors-bot_blocked =
    🚫 <b>Bot Bloccato</b>
    Hai bloccato questo bot. Sbloccalo per ricevere citazioni.
quote-errors-user_deactivated =
    👤 <b>Problema Con L'Account</b>
    L'account utente di destinazione è disattivato o eliminato.
quote-errors-message_too_long =
    📝 <b>Messaggio Troppo Lungo</b>
    Il messaggio citato è troppo lungo. Prova a citare meno messaggi o un testo più breve.
quote-errors-network_error =
    🌐 <b>Errore Di Rete</b>
    Si è verificato un problema di connessione. Riprova tra un momento.
quote-errors-timeout_error =
    ⏱️ <b>Errore Di Timeout</b>
    La richiesta ha impiegato troppo tempo. Riprova con una citazione più semplice.
quote-image_to_quote-processing = 🔍 Analizzando l'immagine ed estraendo il testo...
quote-image_to_quote-success =
    ✅ Citazione creata da { $count } messaggi!

    💡 <b>Consiglio:</b> Invia uno screenshot con <code>/qi</code> o <code>/quote_image</code> per creare citazioni
quote-image_to_quote-errors-no_image = ❌ Per favore invia un file immagine (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Immagine troppo grande. Dimensione massima: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Formato immagine non supportato. Supportati: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Impossibile trovare messaggi di chat leggibili nell'immagine. Assicurati che sia uno screenshot chiaro di una conversazione.
quote-image_to_quote-errors-parse_error = ❌ Errore di riconoscimento. L'immagine potrebbe non contenere testo di conversazione chiaro.
quote-image_to_quote-errors-api_error = ❌ Errore di riconoscimento del testo. Per favore riprova.
quote-image_to_quote-errors-rate_limit = ⏳ Troppe richieste! Attendi { $seconds } secondi prima di riprovare.
sticker-save-suc = Lo sticker è stato aggiunto con successo al tuo <a href="{ $link }">pacchetto di adesivi del gruppo</a> ✨
sticker-save-error-animated = Mi dispiace, non posso ancora salvare sticker animati 😅
sticker-save-error-need_creator = <b>Quasi fatto!</b> { $creator } deve inviarmi un messaggio prima di salvare gli sticker
sticker-save-error-telegram = <b>Oops!</b> Qualcosa è andato storto:\n<pre>{ $error }</pre>
sticker-delete-suc = Rimosso dal tuo <a href="{ $link }">pacchetto di adesivi del gruppo</a> 🗑
sticker-delete-empty_reply = Per favore rispondi a un adesivo che desideri eliminare 🗑
sticker-delete-error-telegram = <b>Oops!</b> Impossibile rimuovere lo sticker:\n<pre>{ $error }</pre>
sticker-delete-error-not_found = L'adesivo non esiste più nel pacchetto 🤔
sticker-delete-error-rights = Non ho il permesso di eliminare questo adesivo 🔒
sticker-delete-error-generic =
    Qualcosa è andato storto. Per favore riprova più tardi ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Rimosso dalla collezione casuale 🗑
sticker-delete_random-error = <b>Oops!</b> Impossibile rimuovere lo sticker:\n<pre>{ $error }</pre>
sticker-delete_random-not_found = Questa citazione non è nel database 🤔
sticker-empty_forward = Per favore, rispondi a uno sticker, foto o immagine che vuoi salvare ✨
sticker-fstik = Per salvare questo nel tuo pacchetto personale di sticker, inoltra a @fStikBot 🎨
rate-vote-rated = Tu { $rateName } questo.
rate-vote-back = Il tuo voto è stato rimosso
rate-settings-enable = La valutazione delle citazioni è abilitata
rate-settings-disable = La valutazione delle citazioni è stata disabilitata
random-empty = Non ci sono ancora citazioni molto votate in questo gruppo! Inizia a votare alcuni messaggi
random-gab = Frequenza delle citazioni casuali impostata a { $gab } ✨
hidden-settings-enable = La ricerca del mittente è abilitata 🔍
hidden-settings-disable = La ricerca del mittente è disabilitata 🔄
privacy-settings-enable = Modalità privacy attivata 🔒 Le tue informazioni saranno nascoste nelle citazioni
privacy-settings-disable = Modalità privacy disattivata 🔓
top-info = <b>✨ Top Citazioni</b>
top-open = Visualizza le Top Citazioni
donate-info =
    <b>Supporta lo sviluppo di QuotLyBot! ☕</b>

    Il tuo supporto ci aiuta a:
    • Mantenere i server attivi 24/7
    • Aggiungere nuove funzionalità e stili
    • Migliorare la qualità delle citazioni
    • Rendere il bot più veloce

    <b>💳 Opzioni di pagamento facili</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Pagamento con carta</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Criptovalute (per utenti esperti)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Ogni contributo aiuta a migliorare QuotLyBot per tutti! 💜
donate-title = Supporta { $botUsername }
donate-description = Aiuta a mantenere la magia ✨
donate-successful =
    <b>Grazie per il tuo supporto! 💜</b>
    Stai aiutando a rendere QuotLyBot ancora migliore!
donate-pay = 💜 Paga con Telegram
donate-other = Altre opzioni
emoji-info =
    <b>Scegli il tuo Emoji di Citazione!</b>

    • Imposta emoji personalizzato: <code>/qemoji</code>💜
    • Usa emoji casuale: <code>/qemoji random</code>
    • Rimuovi emoji: <code>/qemoji clear</code>

    Il tuo emoji verrà aggiunto a tutte le nuove citazioni ✨
emoji-done = Stile emoji aggiornato! ✨
only_admin =
    <b>⚠️ Accesso Admin Necessario</b>
    Questo comando può essere utilizzato solo dagli amministratori del gruppo.
only_group =
    <b>⚠️ Comando per il Gruppo</b>
    Questa funzionalità funziona solo nelle chat di gruppo.
rate_limit =
    <i>Facendo una breve pausa...</i> Puoi utilizzare nuovamente questo comando tra { $seconds } secondi ⏳

    <i>Consiglio Pro: Mentre aspetti, prova a personalizzare la tua ultima citazione con </i><code>/q color</code> <i>o</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    Trasforma i messaggi in splendidi sticker di citazione!
menu-btn-features = ✨ Funzionalità
menu-btn-settings = ⚙️ Impostazioni
menu-btn-help = 📚 Comandi
menu-btn-language = 🌍 Lingua
menu-btn-back = ← Indietro
menu-btn-add_group = ➕ Aggiungi al Gruppo
menu-features-title =
    <b>✨ Cosa posso fare?</b>
    Tocca una funzionalità per saperne di più:
menu-features-btn-basics = 📱 Base
menu-features-btn-colors = 🎨 Colori e Stili
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Funzioni Gruppo
menu-features-basics-title =
    <b>📱 Citazioni Base</b>

    <b>Nei gruppi:</b>
    Rispondi a qualsiasi messaggio con <code>/q</code>

    <b>In privato:</b>
    Inoltrami i messaggi

    <b>Messaggi multipli:</b>
    <code>/q 3</code> — messaggio risposto + sotto
    <code>/q -3</code> — messaggio risposto + sopra
menu-features-colors-title =
    <b>🎨 Colori e Stili</b>

    <b>Colori base:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Colore personalizzato:</b>
    <code>/q #ff69b4</code>

    <b>Colore casuale:</b>
    <code>/q random</code>

    <b>Sfumatura:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 Opzioni Media</b>

    <b>Includi media:</b>
    <code>/q m</code> o <code>/q media</code>

    <b>Ritaglia media:</b>
    <code>/q c</code> o <code>/q crop</code>

    <b>Mostra risposte:</b>
    <code>/q r</code> o <code>/q reply</code>

    <b>Come immagine:</b>
    <code>/q img</code> o <code>/q png</code>
menu-features-group-title =
    <b>👥 Funzioni Gruppo</b>

    <b>Per admin:</b>
    • <code>/qcolor blue</code> — colore predefinito
    • <code>/qrate</code> — abilita valutazione
    • <code>/qs</code> — salva nel pacchetto sticker

    <b>Per tutti:</b>
    • <code>/qtop</code> — migliori citazioni
    • <code>/qrand</code> — citazione casuale
menu-settings-title =
    <b>⚙️ Impostazioni</b>
    Gestisci le tue preferenze:
menu-settings-btn-privacy = 🔒 Privacy
menu-settings-btn-language = 🌍 Lingua
menu-help-title =
    <b>📚 Comandi</b>

    <b>Base:</b>
    • <code>/q</code> — crea citazione
    • <code>/lang</code> — cambia lingua
    • <code>/donate</code> — supporta lo sviluppo

    <b>Per admin:</b>
    • <code>/qcolor</code> — colore predefinito
    • <code>/qrate</code> — abilita valutazione
    • <code>/qb</code> — stile emoji
onboarding-welcome-title =
    <b>Ciao! 👋</b>

    Trasformo i messaggi di chat ordinari in splendidi sticker di citazione.

    ✨ <b>Lascia che ti mostri come funziona!</b>
onboarding-welcome-btn-start = Iniziamo! →
onboarding-welcome-btn-skip = Salta Tutorial
onboarding-step1-title =
    <b>Passo 1: Inoltra un messaggio</b>

    Inoltrami qualsiasi messaggio di chat adesso.

    💡 <i>Consiglio: Puoi inoltrare più messaggi contemporaneamente!</i>
onboarding-step2-title =
    <b>Ottimo! Ecco la tua citazione! ✨</b>

    Nei gruppi, usa semplicemente <code>/q</code> per rispondere a qualsiasi messaggio.
onboarding-step2-btn-complete = Capito! ✓
onboarding-complete-title =
    <b>Sei pronto! 🎉</b>

    Ora conosci le basi. Esplora il menu per scoprire più funzionalità!

aimode-title = 🤖 <b>Modalità IA</b>
aimode-current = Modalità corrente: { $mode }
aimode-available = <b>Modalità disponibili:</b>
aimode-unknown = ❌ Modalità sconosciuta: <code>{ $mode }</code>
aimode-available_list = Disponibili: { $modes }
aimode-success = ✅ Modalità IA cambiata in: { $mode }
aimode-error = ❌ Errore durante il salvataggio delle impostazioni
aimode-modes-sarcastic-name = 😏 Sarcastico
aimode-modes-sarcastic-description = Commenti sarcastici e arguti con umorismo nero
aimode-modes-philosopher-name = 🧠 Filosofo
aimode-modes-philosopher-description = Pensieri profondi e riflessioni filosofiche
aimode-modes-comedian-name = 😂 Comico
aimode-modes-comedian-description = Battute divertenti e commenti comici
aimode-modes-poet-name = 📝 Poeta
aimode-modes-poet-description = Versi poetici e bellissime metafore
aimode-modes-motivator-name = 💪 Motivatore
aimode-modes-motivator-description = Messaggi motivanti e ispiratori
aimode-modes-conspiracy-name = 🕵️ Teorico del complotto
aimode-modes-conspiracy-description = Teorie del complotto e commenti sospettosi
aimode-modes-critic-name = 🎭 Critico
aimode-modes-critic-description = Recensioni critiche e valutazioni per ogni cosa
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Commenti vecchio stile della vecchia generazione
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Slang giovanile e frasi alla moda
aimode-modes-academic-name = 🎓 Accademico
aimode-modes-academic-description = Fatti scientifici e commenti accademici
aimode-modes-memer-name = 🐸 Memer
aimode-modes-memer-description = Frasi da meme e cultura di internet
app-open_quote = ✨ Apri citazione
app-open_group = 📚 Tutte le citazioni del gruppo
app-open_root = 💫 I miei gruppi
app-info =
    <b>Tutto vive anche nell'app 💬</b>

    Sfoglia le citazioni, esplora l'archivio, scopri le migliori — a un tocco di distanza. Premi il pulsante ↓
menu-settings-btn-color = 🎨 Colore predefinito
menu-settings-btn-emoji_style = 😊 Stile emoji
menu-settings-btn-back = ← Indietro
onboarding-step1-waiting =
    In attesa del tuo messaggio...
    Inoltrami qualcosa da una chat qualsiasi!
onboarding-step2-btn-menu = Apri menu
onboarding-step2-btn-add_group = Aggiungi al gruppo
quick_action-remake = 🔄
quick_action-tooltip-remake = Ricrea con uno stile diverso
qarchive-on = ✅ Archivio testo citazioni <b>attivato</b>. Le nuove citazioni verranno salvate con testo e autore.
qarchive-off = ⏸ Archivio testo citazioni <b>disattivato</b>. Le nuove citazioni salveranno solo lo sticker e la valutazione.
qarchive-status_on =
    Stato attuale: <b>attivato</b>.

    <code>/qarchive off</code> — disattiva
qarchive-status_off =
    Stato attuale: <b>disattivato</b>.

    <code>/qarchive on</code> — attiva
qarchive-usage =
    Attiva/disattiva l'archivio testo citazioni per questo gruppo.

    <code>/qarchive on</code> oppure <code>/qarchive off</code>
qforget-usage = Specifica il numero della citazione: <code>/qforget 142</code>
qforget-not_found = Citazione #{ $local } non trovata in questo gruppo.
qforget-not_author = Solo l'autore della citazione può dimenticarla.
qforget-forgotten = ✅ Citazione #{ $local } dimenticata. Lo sticker e i voti rimangono, ma testo e autore vengono rimossi dall'archivio.
qforget-already_forgotten = La citazione #{ $local } era già stata dimenticata.
qforget-not_yet_archived = La citazione #{ $local } non ha testo (creata prima dell'archivio).
guest-hint =
    <b>Quotly — modalità ospite 💬</b>

    Posso creare uno sticker citazione da qualsiasi messaggio <i>senza</i> essere membro della chat.

    <b>Come si usa:</b>
    1. Rispondi al messaggio che vuoi citare
    2. Nella tua risposta scrivi <code>@{ $username }</code>
    3. Fatto — lascerò uno sticker citazione direttamente nella chat

    <b>Argomenti opzionali (proprio come /q):</b>
    • <code>@{ $username } r</code> — includi il messaggio a cui sto rispondendo
    • <code>@{ $username } red</code> — imposta il colore di sfondo
    • <code>@{ $username } rate</code> — aggiungi pulsanti 👍 / 👎
    • <code>@{ $username } p</code> — renderizza come PNG

    Per l'esperienza completa aprimi in chat privata.
guest-hint_short = Come funziona Quotly in modalità ospite
guest-need_reply =
    <b>Ci siamo quasi! 🪄</b>

    Per creare una citazione mi serve un messaggio da citare — rispondi a uno e menziona <code>@{ $username }</code>.

    Esempio: tocca "Rispondi" su un messaggio → scrivi <code>@{ $username }</code> → invia.
guest-need_reply_short = Rispondi a un messaggio e menziona il bot
guest-empty_query =
    <b>Quotly qui 💜</b>

    Rispondi a qualsiasi messaggio in questa chat e menziona <code>@{ $username }</code> per trasformarlo in uno sticker citazione.

    Tocca qui sotto per aprirmi in chat privata e accedere a tutte le funzionalità.
guest-open_in_pm = Apri in Quotly →

sticker-save-error-too_large = L'immagine è troppo grande (max 2048×2048). Provane una più piccola 📐

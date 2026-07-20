# Auto-generated from locales/fr.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs fr

language_name = 🇫🇷 Français
description-short =
    Transformez n'importe quel message en un magnifique autocollant citation ! ✨
    Répondez avec /q ou transférez le message vers moi
description-long =
    Créez des autocollants de citations époustouflants et préservez vos moments de chat préférés ! ✨

    Il suffit de répondre /q à n'importe quel message ou de me le transférer. Parfait pour sauvegarder:
    🌟 Les meilleurs moments et souvenirs de chat
    💭 Pensées et conversations inspirantes
    🎨 Messages créatifs avec des styles personnalisés
    ✍️ Notes importantes dans un format magnifique

    Commencez maintenant - transférez simplement un message ou utilisez /q !
start =
    <b>Salut! 👋 Je suis QuotLyBot</b>

    Je transforme des messages de chat ordinaires en superbes stickers de citation. Simple, créatif et amusant à utiliser!

    ✨ <b>Prêt à créer votre première citation?</b>
    <b>Dans les chats privés:</b> Transférez-moi n'importe quel message (vous pouvez même en sélectionner plusieurs à la fois!)
    <b>Dans les groupes:</b> Ajoutez-moi à votre groupe et répondez avec <code>/q</code> à n'importe quel message

    Vous voulez changer les couleurs, les styles et plus? Tapez /help lorsque vous êtes prêt à découvrir toutes les possibilités créatives! 🎨
help =
    <b>✨ QuotLyBot: Citations Rapides & Faciles! ✨</b>

    Transformez les messages en citations élégantes dans Telegram. Voici comment:

    📱 <b>Citation de Base</b>

    • Répondre & Citer: Répondez à un message et tapez <code>/q</code> pour le citer.
    • Citer Plusieurs: Répondez au premier de plusieurs messages, tapez <code>/q [number]</code> (par exemple, <code>/q 3</code>) pour en citer plusieurs.
    • Transférer & Citer: Transférez un message vers le bot pour le citer directement.

    🎨 <b>Personnalisez Votre Citation</b>

    • Couleurs:
        • Basique: <code>/q rouge</code> (ou bleu, vert, etc.)
        • Personnalisé: <code>/q #[code couleur hex]</code> (par exemple, <code>/q #cbafff</code>)
        • Aléatoire: <code>/q aléatoire</code>
    • Médias: Incluez des images/vidéos du message cité avec <code>/q m</code> ou <code>/q media</code>
        • Recadrer les Médias: Utilisez <code>/q c</code> ou <code>/q crop</code> pour recadrer le média.
    • Garder les Réponses: Affichez le message auquel il est répondu avec <code>/q r</code> ou <code>/q reply</code>
    • Format d'Image: Utilisez <code>/q i</code> ou <code>/q img</code> ou <code>/q p</code> ou <code>/q png</code> pour des citations d'images (au lieu de stickers).

    💡 <b>Combinaisons Sympas</b>

    • Citation blanche avec réponses: <code>/q blanc rp</code>
    • Image rouge haute qualité: <code>/q i rouge s3.2</code>
    • Citation avec médias & réponses: <code>/q r #cbafff m</code>

    ⚙️ <b>Plus d'Options</b>

    • Évaluer les Citations: <code>/q rate</code> (si activé dans le groupe)
    • Citation Aléatoire: <code>/qrand</code> (si activé dans le groupe)
    • Meilleures Citations: <code>/qtop</code> (si activé dans le groupe)
    • Changer de Langue: <code>/lang</code>

    🎯 <b>Paramètres Admin de Groupe</b> (pour les administrateurs de groupe seulement)

    • Couleur par Défaut: <code>/qcolor [color]</code>
    • Activer l'Évaluation: <code>/qrate</code>
    • Sauvegarder dans un Pack de Stickers: <code>/qs [emoji]</code>
    • Supprimer le Sticker: <code>/qd</code> (répondre au sticker)
    • Fréquence de Citation Aléatoire: <code>/qgab [number]</code>
    • Changement de Suffixe d'Emoji: <code>/qemoji</code> (changer le suffixe emoji du sticker)
    • Style d'Emoji:
        • Classique: <code>/qb apple</code>, <code>/qb google</code>
        • Alt: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Rétro: <code>/qb blob</code>

    📱 <b>Besoin d'Aide?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Support: <code>/donate</code>
help_group =
    <b>Bonjour ! 👋</b>
    Je créerai de belles citations dans ce groupe - utilisez simplement <code>/q</code> en réponse à n'importe quel message !

    Découvrez toutes mes fonctionnalités en privé : <a href="t.me/{ $username }?start=help">Obtenez de l'Aide</a> ✨
btn-add_group = Ajouter au groupe
btn-help = Aide
quote-unsupported_message = Ce type de message n'est pas pris en charge pour les citations
quote-api_error =
    <b>Oups ! Quelque chose s'est mal passé 😅</b>
    <pre>{ $error }</pre>
    Veuillez réessayer dans un instant !
quote-empty_forward = Veuillez répondre ou transférer le message que vous souhaitez citer ✨
quote-set_background_color = <b>Parfait !</b> Le fond de la citation a été changé en : <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Fait !</b> Le style emoji a été changé en : <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Notre service de citations est temporairement indisponible. Veuillez réessayer dans quelques minutes.

    Si le problème persiste, consultez @LyBlog pour les mises à jour.
quote-errors-rate_limit = ⏳ Trop de demandes ! Veuillez attendre { $seconds } secondes avant de créer une autre citation.
quote-errors-file_too_large = 📸 Le fichier multimédia est trop volumineux (max 5&nbsp;Mo). Essayez d'utiliser une image ou une vidéo plus petite.
quote-errors-invalid_format =
    ❌ Format de fichier non pris en charge. Je supporte :
    • Images (JPG, PNG, WEBP)
    • Vidéos (MP4)
    • Autocollants
    • Messages texte
quote-errors-telegram_error =
    ⚠️ Erreur Telegram : { $error }

    Cela se produit généralement lorsque :
    • Le fichier est trop volumineux
    • Le pack d'autocollants est plein
    • Le bot n'a pas les permissions
quote-errors-generic_error =
    😅 Oups ! Quelque chose a mal tourné :
    <code>{ $error }</code>

    Veuillez réessayer ou signaler cela à @Ly_oBot si cela persiste.
quote-errors-no_rights_send_documents =
    🚫 <b>Erreur de permission</b>
    Je n'ai pas la permission d'envoyer des documents dans ce chat.

    <b>Pour corriger cela :</b>
    • Administrateur de groupe : Donnez-moi la permission "Envoyer des documents"
    • Chat privé : Assurez-vous de ne pas avoir bloqué le bot
quote-errors-no_rights_send_stickers =
    🚫 <b>Erreur de permission</b>
    Je n'ai pas la permission d'envoyer des stickers dans ce chat.

    <b>Pour corriger cela :</b>
    • Administrateur de groupe : Donnez-moi la permission "Envoyer des stickers"
    • Essayez d'utiliser <code>/q img</code> pour le format image à la place
quote-errors-no_rights_send_photos =
    🚫 <b>Erreur de permission</b>
    Je n'ai pas la permission d'envoyer des photos dans ce chat.

    <b>Pour corriger cela :</b>
    • Administrateur de groupe : Donnez-moi la permission "Envoyer des photos"
    • Essayez d'utiliser <code>/q</code> à la place pour le format sticker
quote-errors-chat_write_forbidden =
    🚫 <b>Chat restreint</b>
    Je ne peux pas envoyer de messages dans ce chat.

    <b>Raisons possibles :</b>
    • Vous avez bloqué le bot
    • Le groupe a restreint les bots
    • J'ai été retiré du groupe
quote-errors-sticker_set_invalid =
    🔄 <b>Problème de pack de stickers</b>
    Il y a un problème avec le pack de stickers. Création d'une nouvelle citation...
quote-errors-sticker_set_full =
    📦 <b>Pack de stickers plein</b>
    Le pack de stickers a atteint sa limite. Votre citation sera envoyée comme un sticker normal.
quote-errors-bot_blocked =
    🚫 <b>Bot bloqué</b>
    Vous avez bloqué ce bot. Veuillez le débloquer pour recevoir des citations.
quote-errors-user_deactivated =
    👤 <b>Problème de compte</b>
    Le compte utilisateur cible est désactivé ou supprimé.
quote-errors-message_too_long =
    📝 <b>Message trop long</b>
    Le message cité est trop long. Essayez de citer moins de messages ou un texte plus court.
quote-errors-network_error =
    🌐 <b>Erreur réseau</b>
    Un problème de connexion est survenu. Veuillez réessayer dans un moment.
quote-errors-timeout_error =
    ⏱️ <b>Erreur de délai d'attente</b>
    La demande a pris trop de temps. Veuillez réessayer avec une citation plus simple.
quote-image_to_quote-processing = 🔍 Analyse de l'image et extraction du texte...
quote-image_to_quote-success =
    ✅ Citation créée à partir de { $count } messages !

    💡 <b>Astuce :</b> Envoyez une capture d'écran avec la légende <code>/qi</code> ou <code>/quote_image</code> pour créer des citations
quote-image_to_quote-errors-no_image = ❌ Veuillez envoyer un fichier image (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ L'image est trop grande. Taille maximale : Mo
quote-image_to_quote-errors-unsupported_format = ❌ Format d'image non pris en charge. Prise en charge : JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Impossible de trouver des messages de chat lisibles dans l'image. Assurez-vous qu'il s'agit d'une capture d'écran claire d'une conversation.
quote-image_to_quote-errors-parse_error = ❌ Erreur de reconnaissance. L'image pourrait ne pas contenir de texte de conversation clair.
quote-image_to_quote-errors-api_error = ❌ Erreur de reconnaissance de texte. Veuillez réessayer.
quote-image_to_quote-errors-rate_limit = ⏳ Trop de demandes ! Veuillez attendre { $seconds } secondes avant de réessayer.
sticker-save-suc = Ajouté avec succès à votre <a href="{ $link }">pack d'autocollants du groupe</a> ✨
sticker-save-error-animated = Désolé, je ne peux pas encore enregistrer des autocollants animés 😅
sticker-save-error-need_creator = <b>Presque terminé !</b> { $creator } doit m'envoyer un message d'abord pour enregistrer les autocollants
sticker-save-error-telegram = <b>Oups !</b> Quelque chose s'est mal passé:\n<pre>{ $error }</pre>
sticker-delete-suc = Supprimé de votre <a href="{ $link }">pack d'autocollants du groupe</a> 🗑
sticker-delete-empty_reply = Veuillez répondre à un autocollant que vous souhaitez supprimer 🗑
sticker-delete-error-telegram =
    <b>Impossible de supprimer l'autocollant 😕</b>
    { $reason }
sticker-delete-error-not_found = L'autocollant n'existe plus dans le pack 🤔
sticker-delete-error-rights = Je n'ai pas l'autorisation de supprimer cet autocollant 🔒
sticker-delete-error-generic =
    Quelque chose s'est mal passé. Veuillez réessayer plus tard ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Supprimé de la collection aléatoire 🗑
sticker-delete_random-error =
    <b>Impossible de supprimer la citation 😕</b>
    { $error }
sticker-delete_random-not_found = Cette citation n'est pas dans la base de données 🤔
sticker-empty_forward = Veuillez répondre à un autocollant, une photo ou une image que vous souhaitez enregistrer ✨
sticker-fstik = Pour l'enregistrer dans votre pack d'autocollants personnel, transférez à @fStikBot 🎨
rate-vote-rated = Vous { $rateName } cette citation
rate-vote-back = Votre vote a été supprimé
rate-settings-enable = La notation des citations est désormais activée
rate-settings-disable = La notation des citations a été désactivée
random-empty = Aucune citation très appréciée dans ce groupe pour l'instant ! Commencez à noter quelques messages
random-gab = Fréquence de citation aléatoire réglée sur { $gab } ✨
hidden-settings-enable = Recherche d'expéditeur activée 🔍
hidden-settings-disable = Recherche d'expéditeur désactivée 🔄
privacy-settings-enable = Mode confidentialité activé 🔒 Vos informations seront cachées dans les citations
privacy-settings-disable = Mode confidentialité désactivé 🔓
top-info = <b>✨ Messages les Plus Cités</b>
top-open = Voir les Meilleures Citations
donate-info =
    <b>Soutenez le Développement de QuotLyBot ! ☕</b>

    Votre soutien nous aide à:
    • Faire fonctionner les serveurs 24/7
    • Ajouter de nouvelles fonctionnalités et styles
    • Améliorer la qualité des citations
    • Rendre le bot plus rapide

    <b>💳 Options de Paiement Faciles</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Paiement par Carte</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Cryptomonnaie (pour les utilisateurs aguerris)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Chaque contribution aide à améliorer QuotLyBot pour tout le monde ! 💜
donate-title = Soutenir { $botUsername }
donate-description = Aidez à maintenir la magie en vie ✨
donate-successful =
    <b>Merci pour votre soutien ! 💜</b>
    Vous contribuez à rendre QuotLyBot encore meilleur !
donate-pay = 💜 Payer via Telegram
donate-other = Autres Options
emoji-info =
    <b>Choisissez Votre Emoji de Citation !</b>

    • Définir un emoji personnalisé: <code>/qemoji</code>💜
    • Utiliser un emoji aléatoire: <code>/qemoji random</code>
    • Effacer l'emoji: <code>/qemoji clear</code>

    Votre emoji sera ajouté à toutes les nouvelles citations ✨
emoji-done = Style d'emoji mis à jour ! ✨
only_admin =
    <b>⚠️ Accès Administrateur Nécessaire</b>
    Cette commande ne peut être utilisée que par les administrateurs du groupe.
only_group =
    <b>⚠️ Commande de Groupe</b>
    Cette fonctionnalité fonctionne uniquement dans les discussions de groupe.
rate_limit =
    <i>Prendre une petite pause...</i> Vous pouvez utiliser cette commande à nouveau dans { $seconds } secondes ⏳

    <i>Astuce pro: Pendant que vous attendez, essayez de personnaliser votre dernière citation avec </i><code>/q color</code> <i>ou</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>

    Transforme les messages en superbes autocollants de citations!
menu-btn-features = ✨ Fonctionnalités
menu-btn-settings = ⚙️ Paramètres
menu-btn-help = 📚 Commandes
menu-btn-language = 🌍 Langue
menu-btn-back = ← Retour
menu-btn-add_group = ➕ Ajouter au groupe
menu-settings-title =
    <b>⚙️ Paramètres</b>

    Configurez vos citations:
menu-settings-btn-color = 🎨 Couleur
menu-settings-btn-emoji_style = 😊 Style emoji
menu-settings-btn-privacy = 🔒 Confidentialité
menu-settings-btn-back = ← Retour
qs-title =
    <b>⚙️ Réglages des citations</b>

    Choisis une section. Les changements s'appliquent à chaque nouvelle citation ici.
qs-on = Activé
qs-off = Désactivé
qs-cat-appearance = 🎨 Apparence
qs-cat-content = ✂️ Quoi citer
qs-cat-privacy = 🔒 Confidentialité
qs-cat-group = 👥 Groupe
qs-cat-appearance-desc =
    <b>🎨 Apparence</b>

    • <b>Format</b> — sticker, image ou fichier PNG.
    • <b>Couleur</b> — le fond de la citation.
    • <b>Style emoji</b> — comment les emojis sont dessinés (Apple, Google…).
    • <b>Emoji du sticker</b> — l'emoji ajouté aux stickers enregistrés.
qs-cat-content-desc =
    <b>✂️ Quoi citer</b>

    • <b>Citation partielle</b> — quand tu réponds à un fragment sélectionné : <i>Avec cadre</i> l'affiche avec le cadre de citation, <i>Sans cadre</i> seulement le texte, <i>Message entier</i> ignore la sélection.
    • <b>Afficher la réponse</b> — inclure le message auquel on répond.
    • <b>Médias</b> — inclure les photos/vidéos du message.
    • <b>Rogner les médias</b> — rogner les médias hauts pour les ajuster.
    • <b>Rôle de l'auteur</b> — afficher le titre d'administrateur / la signature de l'expéditeur (la petite étiquette en haut à droite).
qs-cat-privacy-desc =
    <b>🔒 Confidentialité</b>

    • <b>Confidentialité</b> — les citations enregistrées ne sont pas liées à leur auteur (elles n'apparaîtront pas sous ton nom dans l'app). Le sticker lui-même ne change pas.
    • <b>Recherche d'expéditeur</b> — essayer d'identifier l'auteur original d'un message transféré dont le compte est caché.
qs-cat-group-desc =
    <b>👥 Groupe</b>

    • <b>Notes</b> — afficher les boutons 👍/👎 sous les citations.
    • <b>Citation auto</b> — faire ressurgir de temps en temps une citation phare lors d'un moment animé.
    • <b>Archive de texte</b> — enregistrer le texte des citations (nécessaire pour la recherche et l'aléatoire).
qs-row-partial = ✂️ Citation partielle
qs-partial-framed = Avec cadre
qs-partial-plain = Sans cadre
qs-partial-off = Message entier
qs-row-color = 🎨 Couleur
qs-color-title =
    <b>🎨 Fond</b>

    Choisis une couleur ou définis-en une personnalisée avec <code>/qcolor #ff5733</code>.
qs-row-brand = 😀 Style emoji
qs-row-format = 🖥 Format
qs-format-sticker = Sticker
qs-format-image = Image
qs-format-png = Fichier PNG
qs-row-gab = 🔁 Citation auto
qs-gab-off = Désactivé
qs-gab-often = Souvent
qs-gab-sometimes = Parfois
qs-gab-rarely = Rarement
qs-row-suffix = 💟 Emoji du sticker
qs-row-media = 📎 Médias
qs-row-reply = 💬 Afficher la réponse
qs-row-crop = 🖼 Rogner les médias
qs-row-sendertag = 🏷 Rôle de l'auteur
qs-row-privacy = 🔒 Confidentialité
qs-row-hidden = 🕵 Recherche d'expéditeur
qs-row-rate = ⭐ Notes
qs-row-archive = 🗂 Archive de texte
qs-suffix-title =
    <b>💟 Emoji du sticker</b>

    Choisis-en un ci-dessous ou définis un emoji personnalisé avec <code>/qemoji 🔥</code>.
qs-btn-reset = ↩️ Tout réinitialiser
qs-reset-done = Réinitialisé aux valeurs par défaut
menu-features-title =
    <b>✨ Que puis-je faire?</b>

    Appuyez pour en savoir plus:
menu-features-btn-basics = 📱 Bases
menu-features-btn-colors = 🎨 Couleurs
menu-features-btn-media = 🖼 Médias
menu-features-btn-group = 👥 Groupes
menu-features-basics-title =
    <b>📱 Citations de base</b>

    <b>Chat privé:</b>
    Transférez un message → obtenez un autocollant!

    <b>Groupes:</b>
    Répondez <code>/q</code> à un message

    <b>Plusieurs messages:</b>
    <code>/q 3</code> — message + en dessous
    <code>/q -3</code> — message + au dessus

    <b>Format image:</b>
    <code>/q img</code> — PNG au lieu d'autocollant
menu-features-colors-title =
    <b>🎨 Couleurs & styles</b>

    <b>Noms de couleurs:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Couleur personnalisée (hex):</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Spéciaux:</b>
    <code>/q random</code> — dégradé aléatoire
    <code>/q transparent</code> — sans fond

    <b>Styles d'emoji:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Définir: <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Médias dans les citations</b>

    <b>Inclure médias:</b>
    <code>/q m</code> — ajoute images/vidéos

    <b>Recadrer médias:</b>
    <code>/q c</code> — recadre à la taille

    <b>Afficher réponse:</b>
    <code>/q r</code> — inclut message répondu

    <b>Qualité HD:</b>
    <code>/q s3.2</code> — résolution plus élevée

    <b>Combinez:</b>
    <code>/q m r red</code> — médias + réponse + couleur
menu-features-group-title =
    <b>👥 Fonctions de groupe</b>

    <b>Noter les citations:</b>
    Boutons 👍👎 sur les citations
    Activer: <code>/qrate</code>

    <b>Top citations:</b>
    <code>/qtop</code> — meilleures citations

    <b>Citation aléatoire:</b>
    <code>/qrand</code> — aléatoire du top

    <b>Pack d'autocollants:</b>
    <code>/qs 💜</code> — sauvegarder dans le pack
    <code>/qd</code> — supprimer du pack
sticker-save-error-too_large = L'image est trop grande (max. 2048×2048). Essaie-en une plus petite 📐
app-open_quote = ✨ Ouvrir la citation
app-open_group = 📚 Toutes les citations du groupe
app-open_root = 💫 Mes groupes
app-info =
    <b>Tout vit aussi dans l'app 💬</b>

    Feuillette les citations, fouille l'archive, traque les tops — à un clic près. Appuie sur le bouton ↓
aimode-title = 🤖 <b>Modes IA</b>
aimode-current = Mode actuel : { $mode }
aimode-available = <b>Modes disponibles :</b>
aimode-unknown = ❌ Mode inconnu : <code>{ $mode }</code>
aimode-available_list = Disponibles : { $modes }
aimode-success = ✅ Mode IA changé en : { $mode }
aimode-error = ❌ Erreur lors de l'enregistrement des paramètres
aimode-modes-sarcastic-name = 😏 Sarcastique
aimode-modes-sarcastic-description = Commentaires sarcastiques et spirituels avec un humour noir
aimode-modes-philosopher-name = 🧠 Philosophe
aimode-modes-philosopher-description = Pensées profondes et réflexions philosophiques
aimode-modes-comedian-name = 😂 Comique
aimode-modes-comedian-description = Blagues drôles et commentaires comiques
aimode-modes-poet-name = 📝 Poète
aimode-modes-poet-description = Vers poétiques et belles métaphores
aimode-modes-motivator-name = 💪 Motivateur
aimode-modes-motivator-description = Messages motivants et inspirants
aimode-modes-conspiracy-name = 🕵️ Conspirationniste
aimode-modes-conspiracy-description = Théories du complot et commentaires suspects
aimode-modes-critic-name = 🎭 Critique
aimode-modes-critic-description = Critiques et notes pour tout
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Commentaires à l'ancienne de la génération plus âgée
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Argot des jeunes et expressions tendance
aimode-modes-academic-name = 🎓 Universitaire
aimode-modes-academic-description = Faits scientifiques et commentaires académiques
aimode-modes-memer-name = 🐸 Memeur
aimode-modes-memer-description = Phrases de mèmes et culture internet
quick_action-remake = 🔄
quick_action-tooltip-remake = Recréer avec un style différent
qarchive-on = ✅ Archive du texte des citations <b>activée</b>. Les nouvelles citations seront enregistrées avec le texte et l'auteur.
qarchive-off = ⏸ Archive du texte des citations <b>désactivée</b>. Les nouvelles citations n'enregistreront que le sticker et la note.
qarchive-status_on =
    État actuel : <b>activé</b>.

    <code>/qarchive off</code> — désactiver
qarchive-status_off =
    État actuel : <b>désactivé</b>.

    <code>/qarchive on</code> — activer
qarchive-usage =
    Active ou désactive l'archive du texte des citations pour ce groupe.

    <code>/qarchive on</code> ou <code>/qarchive off</code>
qforget-usage = Indique le numéro de la citation : <code>/qforget 142</code>
qforget-not_found = La citation #{ $local } est introuvable dans ce groupe.
qforget-not_author = Seul l'auteur de la citation peut l'oublier.
qforget-forgotten = ✅ Citation #{ $local } oubliée. Le sticker et les votes restent, mais le texte et l'auteur sont retirés de l'archive.
qforget-already_forgotten = La citation #{ $local } avait déjà été oubliée.
qforget-not_yet_archived = La citation #{ $local } n'a pas de texte (créée avant l'archive).
guest-hint =
    <b>Quotly — mode invité 💬</b>

    Je peux créer un sticker de citation à partir de n'importe quel message <i>sans</i> être membre du chat.

    <b>Comment l'utiliser :</b>
    1. Réponds au message que tu veux citer
    2. Dans ta réponse, écris <code>@{ $username }</code>
    3. Voilà — je dépose un sticker de citation directement dans le chat

    <b>Arguments optionnels (comme /q) :</b>
    • <code>@{ $username } r</code> — inclure le message auquel je réponds
    • <code>@{ $username } red</code> — définir la couleur de fond
    • <code>@{ $username } rate</code> — ajouter des boutons 👍 / 👎
    • <code>@{ $username } p</code> — rendre en PNG

    Pour l'expérience complète, ouvre-moi en message privé.
guest-hint_short = Comment Quotly fonctionne en mode invité
guest-need_reply =
    <b>Presque ! 🪄</b>

    Pour créer une citation, il me faut un message à citer — réponds à un message et mentionne <code>@{ $username }</code>.

    Exemple : appuie sur « Répondre » sur un message → tape <code>@{ $username }</code> → envoie.
guest-need_reply_short = Réponds à un message et mentionne le bot
guest-empty_query =
    <b>Quotly est là 💜</b>

    Réponds à n'importe quel message de ce chat et mentionne <code>@{ $username }</code> pour le transformer en sticker de citation.

    Appuie ci-dessous pour m'ouvrir en message privé et accéder à toutes les fonctionnalités.
guest-open_in_pm = Ouvrir dans Quotly →

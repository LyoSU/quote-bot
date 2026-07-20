# Auto-generated from locales/es.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs es

language_name = 🇪🇸 Español
description-short =
    ¡Convierte cualquier mensaje en un hermoso sticker de cita! ✨
    Responde con /q o reenvíame el mensaje
description-long =
    ¡Crea impresionantes stickers de citas y preserva tus momentos favoritos del chat! ✨

    Simplemente responde /q a cualquier mensaje o reenvíamelo. Perfecto para guardar:
    🌟 Los mejores momentos y recuerdos del chat
    💭 Pensamientos e inspiraciones
    🎨 Mensajes creativos con estilos personalizados
    ✍️ Notas importantes en un formato hermoso

    ¡Comienza ahora - solo reenvía un mensaje o usa /q!
start =
    <b>¡Hola! 👋 Soy QuotLyBot</b>

    Transformo mensajes de chat ordinarios en impresionantes stickers de citas. ¡Sencillo, creativo y divertido de usar!

    ✨ <b>¿Listo para crear tu primera cita?</b>
    <b>En chats privados:</b> Reenvíame cualquier mensaje (¡puedes incluso seleccionar varios a la vez!)
    <b>En grupos:</b> Agrégame a tu grupo y responde con <code>/q</code> a cualquier mensaje

    ¿Quieres cambiar colores, estilos y más? Escribe /help cuando estés listo para descubrir todas las posibilidades creativas! 🎨
help =
    <b>✨ QuotLyBot: ¡Citas Rápidas y Fáciles! ✨</b>

    Convierte mensajes en elegantes citas en Telegram. Así es cómo:

    📱 <b>Citas Básicas</b>

    • Responder y Citar: Responde a un mensaje y escribe <code>/q</code> para citarlo.
    • Citar Múltiples: Responde al primero de varios mensajes, escribe <code>/q [número]</code> (por ejemplo, <code>/q 3</code>) para citar varios.
    • Reenviar y Citar: Reenvíale un mensaje al bot para citarlo directamente.

    🎨 <b>Personaliza tu Cita</b>

    • Colores:
        • Básico: <code>/q red</code> (o blue, green, etc.)
        • Personalizado: <code>/q #[código de color hex]</code> (por ejemplo, <code>/q #cbafff</code>)
        • Aleatorio: <code>/q random</code>
    • Media: Incluye imágenes/videos del mensaje citado con <code>/q m</code> o <code>/q media</code>
        • Recorta Media: Usa <code>/q c</code> o <code>/q crop</code> para recortar la media.
    • Mantener Respuestas: Muestra el mensaje al que se responde con <code>/q r</code> o <code>/q reply</code>
    • Formato de Imagen: Usa <code>/q i</code> o <code>/q img</code> o <code>/q p</code> o <code>/q png</code> para citas en formato de imagen (en lugar de stickers).

    💡 <b>Combinaciones Geniales</b>

    • Cita blanca con respuestas: <code>/q white rp</code>
    • Imagen roja de alta calidad: <code>/q i red s3.2</code>
    • Cita con media y respuestas: <code>/q r #cbafff m</code>

    ⚙️ <b>Más Opciones</b>

    • Evaluar Citas: <code>/q rate</code> (si está habilitado en el grupo)
    • Cita Aleatoria: <code>/qrand</code> (si está habilitado en el grupo)
    • Las Mejores Citas: <code>/qtop</code> (si está habilitado en el grupo)
    • Cambiar Idioma: <code>/lang</code>

    🎯 <b>Configuraciones para Administradores de Grupo</b> (solo para administradores de grupo)

    • Color Predeterminado: <code>/qcolor [color]</code>
    • Habilitar Evaluación: <code>/qrate</code>
    • Guardar en Paquete de Stickers: <code>/qs [emoji]</code>
    • Eliminar Sticker: <code>/qd</code> (responder al sticker)
    • Frecuencia de Citas Aleatorias: <code>/qgab [número]</code>
    • Cambiar Sufijo de Emoji: <code>/qemoji</code> (cambiar sufijo de emoji del sticker)
    • Estilo de Emoji:
        • Clásico: <code>/qb apple</code>, <code>/qb google</code>
        • Alternativo: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>¿Necesitas Ayuda?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Soporte: <code>/donate</code>
help_group =
    <b>¡Hola! 👋</b>
    Crearé citas hermosas en este grupo - ¡solo usa <code>/q</code> en respuesta a cualquier mensaje!

    Descubre todas mis características en privado: <a href="t.me/{ $username }?start=help">Obtén Ayuda</a> ✨
btn-add_group = Añadir a un grupo
btn-help = Ayuda
quote-unsupported_message = Este tipo de mensajes no es compatible para citar
quote-api_error =
    <b>¡Vaya! Algo salió mal 😅</b>
    <pre>{ $error }</pre>
    ¡Por favor intenta de nuevo en un momento!
quote-empty_forward = Por favor, responde o reenvía el mensaje que te gustaría citar ✨
quote-set_background_color = <b>¡Perfecto!</b> Fondo de cita cambiado a: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>¡Hecho!</b> Estilo de emoji cambiado a: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Nuestro servicio de citas no está disponible temporalmente. Por favor, inténtalo de nuevo en unos minutos.

    Si el problema persiste, consulta @LyBlog para actualizaciones.
quote-errors-rate_limit = ⏳ ¡Demasiadas solicitudes! Por favor, espera { $seconds } segundos antes de crear otra cita.
quote-errors-file_too_large = 📸 El archivo multimedia es demasiado grande (máx 5MB). Intenta usar una imagen o video más pequeño.
quote-errors-invalid_format =
    ❌ Formato de archivo no compatible. Yo soporto:
    • Imágenes (JPG, PNG, WEBP)
    • Videos (MP4)
    • Stickers
    • Mensajes de texto
quote-errors-telegram_error =
    ⚠️ Error de Telegram: { $error }

    Esto generalmente sucede cuando:
    • El archivo es demasiado grande
    • El paquete de stickers está lleno
    • El bot carece de permisos
quote-errors-generic_error =
    😅 ¡Ups! Algo salió mal:
    <code>{ $error }</code>

    Por favor, inténtalo de nuevo o informa a @Ly_oBot si persiste.
quote-errors-no_rights_send_documents =
    🚫 <b>Error de permiso</b>
    No tengo permiso para enviar documentos en este chat.

    <b>Para solucionarlo:</b>
    • Administrador del grupo: Dame permiso para "Enviar documentos"
    • Chat privado: Asegúrate de que no hayas bloqueado el bot
quote-errors-no_rights_send_stickers =
    🚫 <b>Error de permiso</b>
    No tengo permiso para enviar stickers en este chat.

    <b>Para solucionarlo:</b>
    • Administrador del grupo: Dame permiso para "Enviar stickers"
    • Intenta usar <code>/q img</code> para formato de imagen en su lugar
quote-errors-no_rights_send_photos =
    🚫 <b>Error de permiso</b>
    No tengo permiso para enviar fotos en este chat.

    <b>Para solucionarlo:</b>
    • Administrador del grupo: Dame permiso para "Enviar fotos"
    • Intenta usar <code>/q</code> para formato de sticker en su lugar
quote-errors-chat_write_forbidden =
    🚫 <b>Chat restringido</b>
    No puedo enviar mensajes en este chat.

    <b>Posibles razones:</b>
    • Has bloqueado el bot
    • El grupo ha restringido los bots
    • Me eliminaron del grupo
quote-errors-sticker_set_invalid =
    🔄 <b>Problema con el paquete de stickers</b>
    Hay un problema con el paquete de stickers. Creando una nueva cita...
quote-errors-sticker_set_full =
    📦 <b>Paquete de stickers lleno</b>
    El paquete de stickers ha alcanzado su límite. Tu cita se enviará como un sticker normal.
quote-errors-bot_blocked =
    🚫 <b>Bot bloqueado</b>
    Has bloqueado este bot. Desbloquéalo para recibir citas.
quote-errors-user_deactivated =
    👤 <b>Problema de cuenta</b>
    La cuenta del usuario objetivo está desactivada o eliminada.
quote-errors-message_too_long =
    📝 <b>Mensaje demasiado largo</b>
    El mensaje citado es demasiado largo. Intenta citar menos mensajes o texto más corto.
quote-errors-network_error =
    🌐 <b>Error de red</b>
    Ocurrió un problema de conexión. Por favor, inténtalo de nuevo en un momento.
quote-errors-timeout_error =
    ⏱️ <b>Error de tiempo de espera</b>
    La solicitud tardó demasiado. Por favor, inténtalo de nuevo con una cita más simple.
quote-image_to_quote-processing = 🔍 Analizando imagen y extrayendo texto...
quote-image_to_quote-success =
    ✅ ¡Cita creada a partir de { $count } mensajes!

    💡 <b>Consejo:</b> Envía una captura de pantalla con el título <code>/qi</code> o <code>/quote_image</code> para crear citas
quote-image_to_quote-errors-no_image = ❌ Por favor, envía un archivo de imagen (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ La imagen es demasiado grande. Tamaño máximo: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Formato de imagen no compatible. Compatible: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ No se encontraron mensajes legibles en el chat de la imagen. Asegúrate de que es una captura clara de una conversación.
quote-image_to_quote-errors-parse_error = ❌ Error de reconocimiento. La imagen puede no contener texto claro de conversación.
quote-image_to_quote-errors-api_error = ❌ Error de reconocimiento de texto. Por favor, inténtalo de nuevo.
quote-image_to_quote-errors-rate_limit = ⏳ ¡Demasiadas solicitudes! Por favor, espera { $seconds } segundos antes de intentarlo de nuevo.
sticker-save-suc = El sticker se ha guardado con éxito en el <a href="{ $link }">pack de stickers del grupo</a> ✨
sticker-save-error-animated = Lo siento, no puedo guardar stickers animados todavía 😅
sticker-save-error-need_creator = <b>¡Casi!</b> { $creator } necesita enviarme un mensaje primero para guardar stickers
sticker-save-error-telegram = <b>¡Vaya!</b> Algo salió mal:\n<pre>{ $error }</pre>
sticker-delete-suc = Eliminado de tu <a href="{ $link }">pack de stickers del grupo</a> 🗑
sticker-delete-empty_reply = Por favor, responde a un sticker que quieras eliminar 🗑
sticker-delete-error-telegram =
    <b>Falló al eliminar el sticker 😕</b>
    { $reason }
sticker-delete-error-not_found = El sticker ya no existe en el paquete 🤔
sticker-delete-error-rights = No tengo permiso para eliminar este sticker 🔒
sticker-delete-error-generic =
    Algo salió mal. Por favor, inténtalo de nuevo más tarde ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Eliminado de la colección aleatoria 🗑
sticker-delete_random-error =
    <b>No se pudo eliminar la cita 😕</b>
    { $error }
sticker-delete_random-not_found = Esta cita no está en la base de datos 🤔
sticker-empty_forward = Por favor responde a un sticker, foto o imagen que te gustaría guardar ✨
sticker-fstik = Para guardar esto en tu pack de stickers personal, reenvíalo a @fStikBot 🎨
rate-vote-rated = Votaste { $rateName } esta cita
rate-vote-back = Tu voto ha sido eliminado
rate-settings-enable = La votación de citas está ahora habilitada
rate-settings-disable = La votación de citas ha sido deshabilitada
random-empty = ¡No hay citas altamente calificadas en este grupo todavía! Comienza a calificar algunos mensajes
random-gab = Frecuencia de citas aleatorias establecida a { $gab } ✨
hidden-settings-enable = La búsqueda de remitentes está activada 🔍
hidden-settings-disable = La búsqueda de remitentes está desactivada 🔄
privacy-settings-enable = Modo de privacidad activado 🔒 Tu información estará oculta en las citas
privacy-settings-disable = Modo de privacidad desactivado 🔓
top-info = <b>✨ Mensajes más citados</b>
top-open = Ver citas destacadas
donate-info =
    <b>¡Apoya el desarrollo de QuotLyBot! ☕</b>

    Tu apoyo nos ayuda a:
    • Mantener los servidores funcionando 24/7
    • Agregar nuevas características y estilos
    • Mejorar la calidad de las citas
    • Hacer el bot más rápido

    <b>💳 Opciones de Pago Fácil</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Pago con Tarjeta</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Criptomonedas (para usuarios expertos en tecnología)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    ¡Cada contribución ayuda a mejorar QuotLyBot para todos! 💜
donate-title = Donar { $botUsername }
donate-description = Ayuda a mantener la magia ✨
donate-successful =
    <b>¡Gracias por tu apoyo! 💜</b>
    ¡Estás ayudando a mejorar QuotLyBot aún más!
donate-pay = 💜 Pagar vía Telegram
donate-other = Otros
emoji-info =
    <b>¡Elige tu Emoji para la Cita!</b>

    • Establecer emoji personalizado: <code>/qemoji</code>💜
    • Usar emoji aleatorio: <code>/qemoji random</code>
    • Borrar emoji: <code>/qemoji clear</code>

    Tu emoji se añadirá a todas las nuevas citas ✨
emoji-done = ¡Estilo de emoji actualizado! ✨
only_admin =
    <b>⚠️ Se Necesita Acceso de Administrador</b>
    Este comando solo puede ser utilizado por administradores de grupo.
only_group =
    <b>⚠️ Comando de Grupo</b>
    Esta función solo funciona en chats de grupo.
rate_limit =
    <i>Tomando un breve descanso...</i> Puedes usar este comando nuevamente en { $seconds } segundos ⏳

    <i>Consejo profesional: Mientras esperas, intenta personalizar tu última cita con </i><code>/q color</code> <i>o</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>

    ¡Transforma mensajes en impresionantes stickers de citas!
menu-btn-features = ✨ Funciones
menu-btn-settings = ⚙️ Ajustes
menu-btn-help = 📚 Comandos
menu-btn-language = 🌍 Idioma
menu-btn-back = ← Volver
menu-btn-add_group = ➕ Añadir al grupo
menu-settings-title =
    <b>⚙️ Ajustes</b>

    Configura tus citas:
menu-settings-btn-color = 🎨 Color
menu-settings-btn-emoji_style = 😊 Estilo emoji
menu-settings-btn-privacy = 🔒 Privacidad
menu-settings-btn-back = ← Volver
qs-title =
    <b>⚙️ Ajustes de citas</b>

    Elige una sección. Los cambios se aplican a cada nueva cita aquí.
qs-on = Activado
qs-off = Desactivado
qs-cat-appearance = 🎨 Apariencia
qs-cat-content = ✂️ Qué citar
qs-cat-privacy = 🔒 Privacidad
qs-cat-group = 👥 Grupo
qs-cat-appearance-desc =
    <b>🎨 Apariencia</b>

    • <b>Formato</b> — sticker, imagen o archivo PNG.
    • <b>Color</b> — el fondo de la cita.
    • <b>Estilo emoji</b> — cómo se dibujan los emojis (Apple, Google…).
    • <b>Emoji del sticker</b> — el emoji que se añade a los stickers guardados.
qs-cat-content-desc =
    <b>✂️ Qué citar</b>

    • <b>Cita parcial</b> — cuando respondes a un fragmento seleccionado: <i>Con marco</i> lo muestra con el marco de la cita, <i>Sin marco</i> solo el texto, <i>Mensaje completo</i> ignora la selección.
    • <b>Mostrar respuesta</b> — incluir el mensaje al que se responde.
    • <b>Media</b> — incluir fotos/vídeos del mensaje.
    • <b>Recortar media</b> — recortar la media alta para que encaje.
    • <b>Rol del autor</b> — mostrar el cargo de administrador / la firma del remitente (la pequeña etiqueta arriba a la derecha).
qs-cat-privacy-desc =
    <b>🔒 Privacidad</b>

    • <b>Privacidad</b> — las citas guardadas no se vinculan a su autor (no aparecerán con tu nombre en la app). El sticker en sí no cambia.
    • <b>Búsqueda de remitente</b> — intentar identificar al autor original de un mensaje reenviado cuya cuenta está oculta.
qs-cat-group-desc =
    <b>👥 Grupo</b>

    • <b>Valoraciones</b> — mostrar botones 👍/👎 bajo las citas.
    • <b>Cita automática</b> — de vez en cuando recuperar una cita destacada en un momento animado.
    • <b>Archivo de texto</b> — guardar el texto de la cita (necesario para búsqueda y aleatorias).
qs-row-partial = ✂️ Cita parcial
qs-partial-framed = Con marco
qs-partial-plain = Sin marco
qs-partial-off = Mensaje completo
qs-row-color = 🎨 Color
qs-color-title =
    <b>🎨 Fondo</b>

    Elige un color o define uno propio con <code>/qcolor #ff5733</code>.
qs-row-brand = 😀 Estilo emoji
qs-row-format = 🖥 Formato
qs-format-sticker = Sticker
qs-format-image = Imagen
qs-format-png = Archivo PNG
qs-row-gab = 🔁 Cita automática
qs-gab-off = Desactivado
qs-gab-often = A menudo
qs-gab-sometimes = A veces
qs-gab-rarely = Rara vez
qs-row-suffix = 💟 Emoji del sticker
qs-row-media = 📎 Media
qs-row-reply = 💬 Mostrar respuesta
qs-row-crop = 🖼 Recortar media
qs-row-sendertag = 🏷 Rol del autor
qs-row-privacy = 🔒 Privacidad
qs-row-hidden = 🕵 Búsqueda de remitente
qs-row-rate = ⭐ Valoraciones
qs-row-archive = 🗂 Archivo de texto
qs-suffix-title =
    <b>💟 Emoji del sticker</b>

    Elige uno abajo o define un emoji propio con <code>/qemoji 🔥</code>.
qs-btn-reset = ↩️ Restablecer todo
qs-reset-done = Restablecido a los valores predeterminados
menu-features-title =
    <b>✨ ¿Qué puedo hacer?</b>

    Toca para saber más:
menu-features-btn-basics = 📱 Básicos
menu-features-btn-colors = 🎨 Colores
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Grupos
menu-features-basics-title =
    <b>📱 Citas básicas</b>

    <b>Chat privado:</b>
    ¡Reenvíame un mensaje → obtén un sticker!

    <b>Grupos:</b>
    Responde <code>/q</code> a un mensaje

    <b>Múltiples mensajes:</b>
    <code>/q 3</code> — mensaje + debajo
    <code>/q -3</code> — mensaje + arriba

    <b>Formato imagen:</b>
    <code>/q img</code> — PNG en lugar de sticker
menu-features-colors-title =
    <b>🎨 Colores y estilos</b>

    <b>Nombres de colores:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Color personalizado (hex):</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Especiales:</b>
    <code>/q random</code> — gradiente aleatorio
    <code>/q transparent</code> — sin fondo

    <b>Estilos de emoji:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Establecer: <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Media en citas</b>

    <b>Incluir media:</b>
    <code>/q m</code> — añade imágenes/videos

    <b>Recortar media:</b>
    <code>/q c</code> — recorta al tamaño

    <b>Mostrar respuesta:</b>
    <code>/q r</code> — incluye mensaje respondido

    <b>Calidad HD:</b>
    <code>/q s3.2</code> — mayor resolución

    <b>Combínalos:</b>
    <code>/q m r red</code> — media + respuesta + color
menu-features-group-title =
    <b>👥 Funciones de grupo</b>

    <b>Valorar citas:</b>
    Botones 👍👎 en citas
    Activar: <code>/qrate</code>

    <b>Top citas:</b>
    <code>/qtop</code> — mejores citas

    <b>Cita aleatoria:</b>
    <code>/qrand</code> — aleatoria del top

    <b>Pack de stickers:</b>
    <code>/qs 💜</code> — guardar en pack
    <code>/qd</code> — eliminar del pack
sticker-save-error-too_large = La imagen es demasiado grande (máx. 2048×2048). Prueba con una más pequeña 📐
app-open_quote = ✨ Abrir cita
app-open_group = 📚 Todas las citas del grupo
app-open_root = 💫 Mis grupos
app-info =
    <b>Todo vive también en la app 💬</b>

    Hojea las citas, explora el archivo, persigue los tops — a un toque de distancia. Pulsa el botón ↓
aimode-title = 🤖 <b>Modos de IA</b>
aimode-current = Modo actual: { $mode }
aimode-available = <b>Modos disponibles:</b>
aimode-unknown = ❌ Modo desconocido: <code>{ $mode }</code>
aimode-available_list = Disponibles: { $modes }
aimode-success = ✅ Modo de IA cambiado a: { $mode }
aimode-error = ❌ Error al guardar la configuración
aimode-modes-sarcastic-name = 😏 Sarcástico
aimode-modes-sarcastic-description = Comentarios sarcásticos e ingeniosos con humor negro
aimode-modes-philosopher-name = 🧠 Filósofo
aimode-modes-philosopher-description = Pensamientos profundos y reflexiones filosóficas
aimode-modes-comedian-name = 😂 Comediante
aimode-modes-comedian-description = Chistes graciosos y comentarios cómicos
aimode-modes-poet-name = 📝 Poeta
aimode-modes-poet-description = Versos poéticos y bellas metáforas
aimode-modes-motivator-name = 💪 Motivador
aimode-modes-motivator-description = Mensajes motivadores e inspiradores
aimode-modes-conspiracy-name = 🕵️ Conspiranoico
aimode-modes-conspiracy-description = Teorías conspirativas y comentarios sospechosos
aimode-modes-critic-name = 🎭 Crítico
aimode-modes-critic-description = Reseñas críticas y valoraciones de todo
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Comentarios a la antigua de la generación mayor
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Jerga juvenil y frases de moda
aimode-modes-academic-name = 🎓 Académico
aimode-modes-academic-description = Datos científicos y comentarios académicos
aimode-modes-memer-name = 🐸 Memero
aimode-modes-memer-description = Frases de memes y cultura de internet
quick_action-remake = 🔄
quick_action-tooltip-remake = Recrear con un estilo diferente
qarchive-on = ✅ Archivo de texto de citas <b>activado</b>. Las nuevas citas se guardarán con texto y autor.
qarchive-off = ⏸ Archivo de texto de citas <b>desactivado</b>. Las nuevas citas guardarán solo el sticker y la valoración.
qarchive-status_on =
    Estado actual: <b>activado</b>.

    <code>/qarchive off</code> — desactivar
qarchive-status_off =
    Estado actual: <b>desactivado</b>.

    <code>/qarchive on</code> — activar
qarchive-usage =
    Alterna el archivo de texto de citas para este grupo.

    <code>/qarchive on</code> o <code>/qarchive off</code>
qforget-usage = Indica el número de la cita: <code>/qforget 142</code>
qforget-not_found = La cita #{ $local } no se encontró en este grupo.
qforget-not_author = Solo el autor de la cita puede olvidarla.
qforget-forgotten = ✅ Cita #{ $local } olvidada. El sticker y los votos permanecen, pero el texto y el autor se eliminan del archivo.
qforget-already_forgotten = La cita #{ $local } ya había sido olvidada.
qforget-not_yet_archived = La cita #{ $local } no tiene texto (creada antes del archivo).
guest-hint =
    <b>Quotly — modo invitado 💬</b>

    Puedo crear un sticker de cita a partir de cualquier mensaje <i>sin</i> ser miembro del chat.

    <b>Cómo usar:</b>
    1. Responde al mensaje que quieras citar
    2. En tu respuesta escribe <code>@{ $username }</code>
    3. Listo — soltaré un sticker de cita justo en el chat

    <b>Argumentos opcionales (igual que /q):</b>
    • <code>@{ $username } r</code> — incluir el mensaje al que respondo
    • <code>@{ $username } red</code> — establecer el color de fondo
    • <code>@{ $username } rate</code> — añadir botones 👍 / 👎
    • <code>@{ $username } p</code> — renderizar como PNG

    Para la experiencia completa, ábreme en un chat privado.
guest-hint_short = Cómo funciona Quotly en modo invitado
guest-need_reply =
    <b>¡Casi listo! 🪄</b>

    Para crear una cita necesito un mensaje que citar — responde a uno y menciona <code>@{ $username }</code>.

    Ejemplo: pulsa «Responder» en un mensaje → escribe <code>@{ $username }</code> → envía.
guest-need_reply_short = Responde a un mensaje y menciona al bot
guest-empty_query =
    <b>Quotly por aquí 💜</b>

    Responde a cualquier mensaje de este chat y menciona <code>@{ $username }</code> para convertirlo en un sticker de cita.

    Pulsa abajo para abrirme en un chat privado y acceder a todas las funciones.
guest-open_in_pm = Abrir en Quotly →

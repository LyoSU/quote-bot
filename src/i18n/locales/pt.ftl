# Auto-generated from locales/pt.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs pt

language_name = 🇧🇷 Português
description-short =
    Transforme qualquer mensagem em um lindo adesivo de citação! ✨
    Responda com /q ou encaminhe a mensagem para mim
description-long =
    Crie adesivos de citação incríveis e preserve seus momentos favoritos do chat! ✨

    Basta responder /q a qualquer mensagem ou encaminhá-la para mim. Perfeito para salvar:
    🌟 Melhores destaques e memórias do chat
    💭 Pensamentos e conversas inspiradoras
    🎨 Mensagens criativas com estilos personalizados
    ✍️ Notas importantes em formato bonito

    Comece agora - basta encaminhar uma mensagem ou usar /q!
start =
    <b>Olá! 👋 Eu sou o QuotLyBot</b>

    Transformo mensagens de chat comuns em incríveis figurinhas de citações. Simples, criativo e divertido de usar!

    <b>Pronto para criar sua primeira citação?</b>
    1️⃣ No privado: Encaminhe qualquer mensagem para mim (você pode selecionar várias!)
    2️⃣ Em grupos: Adicione-me ao seu grupo e responda com <code>/q</code> a qualquer mensagem

    Digite /help quando estiver pronto para descobrir todas as possibilidades criativas! 🎨
help =
    <b>✨ Guia Rápido do QuotLyBot</b>

    <b>📱 Comandos Básicos</b>
    • <code>/q</code> - Citar mensagem respondida
    • <code>/q 3</code> - Citar várias mensagens
    • Encaminhar mensagem - Citar diretamente

    <b>🎨 Estilos</b>

    Cores:
    • Básico: <code>/q red</code>
    • Personalizado: <code>/q #ff69b4</code>
    • Degradê: <code>/q red//#blue</code>
    • Aleatório: <code>/q random</code>

    Mídia:
    • Adicionar foto: <code>/q media</code>
    • Recortar imagem: <code>/q crop</code>
    • Manter thread: <code>/q reply</code>
    • Prévia de voz: Automático

    Formato:
    • Sticker: <code>/q</code>
    • Imagem: <code>/q img</code>
    • HD: <code>/q png</code>
    • História: <code>/q stories</code>

    Qualidade:
    • Normal: <code>/q</code>
    • 2x: <code>/q s2</code>
    • 3x: <code>/q s3</code>

    <b>💫 Combinações Populares</b>
    • <code>/q red media</code> - Citação vermelha com foto
    • <code>/q reply</code> - Citação com contexto
    • <code>/q img s2</code> - Imagem de alta qualidade
    • <code>/q stories media</code> - História com foto

    <b>⚙️ Recursos Extras</b>
    • Avaliação: <code>/q rate</code>
    • Citações Aleatórias: <code>/qrand</code>
    • Melhores citações: <code>/qtop</code>
    • Idioma: <code>/lang</code>

    <b>🎯 Configurações do Grupo</b>
    • Cor padrão: <code>/qcolor</code>
    • Ativar avaliação: <code>/qrate</code>
    • Salvar no pacote: <code>/qs</code>

    <b>🌈 Estilos de Emoji</b>
    Clássico: <code>/qb apple</code>, <code>/qb google</code>
    Alternativo: <code>/qb twitter</code>, <code>/qb joypixels</code>
    Retrô: <code>/qb blob</code>

    <b>📱 Precisa de Ajuda?</b>
    • Blog: @LyBlog
    • GitHub: github.com/LyoSU/quote-bot
    • Suporte: <code>/donate</code>
help_group =
    <b>Olá! 👋</b>
    Vou criar belas citações neste grupo - basta usar <code>/q</code> em resposta a qualquer mensagem!

    Descubra todos os meus recursos em particular: <a href="t.me/{ $username }?start=help">Obter Ajuda</a> ✨
btn-add_group = Adicionar ao grupo
btn-help = Ajuda
quote-unsupported_message = Este tipo de mensagem não é suportado para citação
quote-api_error =
    <b>Ops! Algo deu errado 😅</b>
    <pre>{ $error }</pre>
    Tente novamente em um momento!
quote-empty_forward = Responda ou encaminhe a mensagem que você gostaria de citar ✨
quote-set_background_color = <b>Perfeito!</b> Cor de fundo da citação mudada para: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Pronto!</b> Estilo de emoji alterado para: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Nosso serviço de citações está temporariamente indisponível. Por favor, tente novamente em alguns minutos.

    Se o problema persistir, verifique @LyBlog para atualizações.
quote-errors-rate_limit = ⏳ Muitas solicitações! Por favor, aguarde { $seconds } segundos antes de criar outra citação.
quote-errors-file_too_large = 📸 O arquivo de mídia é muito grande (máximo de 5MB). Tente usar uma imagem ou vídeo menor.
quote-errors-invalid_format =
    ❌ Formato de arquivo não suportado. Eu suporto:
    • Imagens (JPG, PNG, WEBP)
    • Vídeos (MP4)
    • Figurinhas
    • Mensagens de texto
quote-errors-telegram_error =
    ⚠️ Erro do Telegram: { $error }

    Isso geralmente acontece quando:
    • O arquivo é muito grande
    • O pacote de figurinhas está cheio
    • O bot não tem permissões
quote-errors-generic_error =
    😅 Opa! Algo deu errado:
    <code>{ $error }</code>

    Por favor, tente novamente ou reporte isso para @Ly_oBot se persistir.
quote-errors-no_rights_send_documents =
    🚫 <b>Erro de Permissão</b>
    Eu não tenho permissão para enviar documentos neste chat.

    <b>Para corrigir isso:</b>
    • Administrador do grupo: Dê-me permissão para "enviar documentos"
    • Chat privado: Certifique-se de que você não bloqueou o bot
quote-errors-no_rights_send_stickers =
    🚫 <b>Erro de Permissão</b>
    Eu não tenho permissão para enviar figurinhas neste chat.

    <b>Para corrigir isso:</b>
    • Administrador do grupo: Dê-me permissão para "enviar figurinhas"
    • Tente usar <code>/q img</code> para formato de imagem em vez disso
quote-errors-no_rights_send_photos =
    🚫 <b>Erro de Permissão</b>
    Eu não tenho permissão para enviar fotos neste chat.

    <b>Para corrigir isso:</b>
    • Administrador do grupo: Dê-me permissão para "enviar fotos"
    • Tente usar <code>/q</code> para formato de figurinha em vez disso
quote-errors-chat_write_forbidden =
    🚫 <b>Chat Restrito</b>
    Eu não posso enviar mensagens neste chat.

    <b>Motivos possíveis:</b>
    • Você bloqueou o bot
    • O grupo restringiu bots
    • Eu fui removido do grupo
quote-errors-sticker_set_invalid =
    🔄 <b>Problema com o Pacote de Figurinhas</b>
    Há um problema com o pacote de figurinhas. Criando uma nova citação...
quote-errors-sticker_set_full =
    📦 <b>Pacote de Figurinhas Cheio</b>
    O pacote de figurinhas atingiu seu limite. Sua citação será enviada como uma figurinha comum.
quote-errors-bot_blocked =
    🚫 <b>Bot Bloqueado</b>
    Você bloqueou este bot. Desbloqueie para receber citações.
quote-errors-user_deactivated =
    👤 <b>Problema de Conta</b>
    A conta do usuário alvo está desativada ou excluída.
quote-errors-message_too_long =
    📝 <b>Mensagem Muito Longa</b>
    A mensagem citada é muito longa. Tente citar menos mensagens ou um texto mais curto.
quote-errors-network_error =
    🌐 <b>Erro de Rede</b>
    Ocorreu um problema de conexão. Por favor, tente novamente em um momento.
quote-errors-timeout_error =
    ⏱️ <b>Erro de Tempo Esgotado</b>
    A solicitação demorou muito. Por favor, tente novamente com uma citação mais simples.
quote-image_to_quote-processing = 🔍 Analisando a imagem e extraindo o texto...
quote-image_to_quote-success =
    ✅ Citação criada a partir de { $count } mensagens!

    💡 <b>Dica:</b> Envie uma captura de tela com a legenda <code>/qi</code> ou <code>/quote_image</code> para criar citações
quote-image_to_quote-errors-no_image = ❌ Por favor, envie um arquivo de imagem (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ A imagem é muito grande. Tamanho máximo: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Formato de imagem não suportado. Suportados: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Não foi possível encontrar mensagens de chat legíveis na imagem. Certifique-se de que seja uma captura de tela clara de uma conversa.
quote-image_to_quote-errors-parse_error = ❌ Erro de reconhecimento. A imagem pode não conter texto de conversa claro.
quote-image_to_quote-errors-api_error = ❌ Erro de reconhecimento de texto. Por favor, tente novamente.
quote-image_to_quote-errors-rate_limit = ⏳ Muitos pedidos! Por favor, espere { $seconds } segundos antes de tentar novamente.
sticker-save-suc = Adicionado com sucesso ao seu <a href="{ $link }">pacote de adesivos do grupo</a> ✨
sticker-save-error-animated = Desculpe, ainda não posso salvar adesivos animados 😅
sticker-save-error-need_creator = <b>Quase lá!</b> { $creator } precisa me enviar uma mensagem primeiro para salvar adesivos
sticker-save-error-telegram = <b>Ops!</b> Algo deu errado:\n<pre>{ $error }</pre>
sticker-delete-suc = Removido do seu <a href="{ $link }">pacote de adesivos do grupo</a> 🗑
sticker-delete-empty_reply = Por favor, responda a um adesivo que deseja excluir 🗑
sticker-delete-error-telegram = <b>Ops!</b> Não foi possível remover o adesivo:\n<pre>{ $reason }</pre>
sticker-delete-error-not_found = A figurinha não existe mais no pacote 🤔
sticker-delete-error-rights = Não tenho permissão para deletar esta figurinha 🔒
sticker-delete-error-generic =
    Algo deu errado. Por favor, tente novamente mais tarde ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Removido da coleção aleatória 🗑
sticker-delete_random-error = <b>Ops!</b> Não foi possível remover o adesivo:\n<pre>{ $error }</pre>
sticker-delete_random-not_found = Esta citação não está no banco de dados 🤔
sticker-empty_forward = Por favor, responda a um adesivo, foto ou imagem que você gostaria de salvar ✨
sticker-fstik = Para salvar isso no seu pacote pessoal de adesivos, encaminhe para @fStikBot 🎨
rate-vote-rated = Você { $rateName } essa citação
rate-vote-back = Seu voto foi removido
rate-settings-enable = A avaliação de citação agora está habilitada
rate-settings-disable = A avaliação de citação foi desativada
random-empty = Ainda não há citações altamente avaliadas neste grupo! Comece a avaliar citações
random-gab = Frequência de citação aleatória definida para { $gab } ✨
hidden-settings-enable = Pesquisa de remetente ativada 🔍
hidden-settings-disable = Pesquisa de remetente desativada 🔄
privacy-settings-enable = Modo de privacidade ativado 🔒 Suas informações ficarão ocultas nas citações
privacy-settings-disable = Modo de privacidade desativado 🔓
top-info = <b>✨ Mensagens Mais Citadas</b>
top-open = Ver Citações Principais
donate-info =
    <b>Suporte ao Desenvolvimento do QuotLyBot! ☕</b>

    Seu suporte nos ajuda a:
    • Manter os servidores funcionando 24/7
    • Adicionar novos recursos e estilos
    • Melhorar a qualidade das citações
    • Tornar o bot mais rápido

    <b>💳 Opções de Pagamento Fáceis</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Pagamento com Cartão</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Criptomoedas (para usuários avançados)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Toda contribuição ajuda a tornar o QuotLyBot melhor para todos! 💜
donate-title = Suporte { $botUsername }
donate-description = Ajude a manter a magia acontecendo ✨
donate-successful =
    <b>Obrigado pelo seu apoio! 💜</b>
    Você está ajudando a tornar o QuotLyBot ainda melhor!
donate-pay = 💜 Pagar via Telegram
donate-other = Outros Métodos
emoji-info =
    <b>Escolha Seu Emoji de Citação!</b>

    • Definir emoji personalizado: <code>/qemoji</code>💜
    • Usar emoji aleatório: <code>/qemoji random</code>
    • Limpar emoji: <code>/qemoji clear</code>

    Seu emoji será adicionado a todas as novas citações ✨
emoji-done = Estilo de emoji atualizado! ✨
only_admin =
    <b>⚠️ Acesso de Administrador Necessário</b>
    Este comando só pode ser usado por administradores do grupo.
only_group =
    <b>⚠️ Comando de Grupo</b>
    Este recurso funciona apenas em chats de grupo.
rate_limit =
    <i>Fazendo uma pausa rápida...</i> Você pode usar este comando novamente em { $seconds } segundos ⏳

    <i>Dica de profissional: Enquanto espera, tente personalizar sua última citação com </i><code>/q color</code> <i>ou</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    Transforme mensagens em adesivos de citação incríveis!
menu-btn-features = ✨ Recursos
menu-btn-settings = ⚙️ Configurações
menu-btn-help = 📚 Comandos
menu-btn-language = 🌍 Idioma
menu-btn-back = ← Voltar
menu-btn-add_group = ➕ Adicionar ao Grupo
qs-title =
    <b>⚙️ Configurações de citação</b>

    Escolha uma seção. As alterações aplicam-se a cada nova citação aqui.
qs-on = Ativado
qs-off = Desativado
qs-cat-appearance = 🎨 Aparência
qs-cat-content = ✂️ O que citar
qs-cat-privacy = 🔒 Privacidade
qs-cat-group = 👥 Grupo
qs-cat-appearance-desc =
    <b>🎨 Aparência</b>

    • <b>Formato</b> — adesivo, imagem ou arquivo PNG.
    • <b>Cor</b> — o fundo da citação.
    • <b>Estilo de emoji</b> — como os emojis são desenhados (Apple, Google…).
    • <b>Emoji do adesivo</b> — o emoji adicionado aos adesivos salvos.
qs-cat-content-desc =
    <b>✂️ O que citar</b>

    • <b>Citação parcial</b> — quando você responde a um trecho selecionado: <i>Com moldura</i> mostra-o com a moldura da citação, <i>Sem moldura</i> apenas o texto, <i>Mensagem inteira</i> ignora a seleção.
    • <b>Mostrar resposta</b> — incluir a mensagem a que se responde.
    • <b>Mídia</b> — incluir fotos/vídeos da mensagem.
    • <b>Recortar mídia</b> — recortar mídia alta para caber.
    • <b>Papel do autor</b> — mostrar o cargo de administrador / a assinatura do remetente (a pequena etiqueta no canto superior direito).
qs-cat-privacy-desc =
    <b>🔒 Privacidade</b>

    • <b>Privacidade</b> — as citações salvas não ficam vinculadas ao seu autor (não aparecerão com o seu nome no app). O adesivo em si não muda.
    • <b>Pesquisa de remetente</b> — tentar identificar o autor original de uma mensagem encaminhada cuja conta está oculta.
qs-cat-group-desc =
    <b>👥 Grupo</b>

    • <b>Avaliações</b> — mostrar botões 👍/👎 sob as citações.
    • <b>Citação automática</b> — de vez em quando trazer de volta uma citação de destaque num momento animado.
    • <b>Arquivo de texto</b> — guardar o texto das citações (necessário para pesquisa e aleatórias).
qs-row-partial = ✂️ Citação parcial
qs-partial-framed = Com moldura
qs-partial-plain = Sem moldura
qs-partial-off = Mensagem inteira
qs-row-color = 🎨 Cor
qs-color-title =
    <b>🎨 Fundo</b>

    Escolha uma cor ou defina uma personalizada com <code>/qcolor #ff5733</code>.
qs-row-brand = 😀 Estilo de emoji
qs-row-format = 🖥 Formato
qs-format-sticker = Adesivo
qs-format-image = Imagem
qs-format-png = Arquivo PNG
qs-row-gab = 🔁 Citação automática
qs-gab-off = Desativado
qs-gab-often = Frequentemente
qs-gab-sometimes = Às vezes
qs-gab-rarely = Raramente
qs-row-suffix = 💟 Emoji do adesivo
qs-row-media = 📎 Mídia
qs-row-reply = 💬 Mostrar resposta
qs-row-crop = 🖼 Recortar mídia
qs-row-sendertag = 🏷 Papel do autor
qs-row-privacy = 🔒 Privacidade
qs-row-hidden = 🕵 Pesquisa de remetente
qs-row-rate = ⭐ Avaliações
qs-row-archive = 🗂 Arquivo de texto
qs-suffix-title =
    <b>💟 Emoji do adesivo</b>

    Escolha um abaixo ou defina um emoji personalizado com <code>/qemoji 🔥</code>.
qs-btn-reset = ↩️ Redefinir tudo
qs-reset-done = Redefinido para os padrões
menu-features-title =
    <b>✨ O que posso fazer?</b>
    Toque em um recurso para saber mais:
menu-features-btn-basics = 📱 Básico
menu-features-btn-colors = 🎨 Cores & Estilos
menu-features-btn-media = 🖼 Mídia
menu-features-btn-group = 👥 Recursos do Grupo
menu-features-basics-title =
    <b>📱 Citação Básica</b>

    <b>Em grupos:</b>
    Responda a qualquer mensagem com <code>/q</code>

    <b>No privado:</b>
    Encaminhe mensagens para mim

    <b>Várias mensagens:</b>
    <code>/q 3</code> — mensagem respondida + abaixo
    <code>/q -3</code> — mensagem respondida + acima
menu-features-colors-title =
    <b>🎨 Cores & Estilos</b>

    <b>Cores básicas:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Cor personalizada:</b>
    <code>/q #ff69b4</code>

    <b>Cor aleatória:</b>
    <code>/q random</code>

    <b>Degradê:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 Opções de Mídia</b>

    <b>Incluir mídia:</b>
    <code>/q m</code> ou <code>/q media</code>

    <b>Recortar mídia:</b>
    <code>/q c</code> ou <code>/q crop</code>

    <b>Mostrar respostas:</b>
    <code>/q r</code> ou <code>/q reply</code>

    <b>Como imagem:</b>
    <code>/q img</code> ou <code>/q png</code>
menu-features-group-title =
    <b>👥 Recursos do Grupo</b>

    <b>Para admins:</b>
    • <code>/qcolor blue</code> — cor padrão
    • <code>/qrate</code> — ativar avaliação
    • <code>/qs</code> — salvar no pacote de adesivos

    <b>Para todos:</b>
    • <code>/qtop</code> — melhores citações
    • <code>/qrand</code> — citação aleatória
menu-settings-title =
    <b>⚙️ Configurações</b>
    Gerencie suas preferências:
menu-settings-btn-privacy = 🔒 Privacidade
sticker-save-error-too_large = A imagem é grande demais (máx. 2048×2048). Tente uma menor 📐
app-open_quote = ✨ Abrir citação
app-open_group = 📚 Todas as citações do grupo
app-open_root = 💫 Meus grupos
app-info =
    <b>Tudo isso também vive no app 💬</b>

    Folheie as citações, explore o arquivo, persiga os tops — tudo a um toque. Toque no botão ↓
aimode-title = 🤖 <b>Modos de IA</b>
aimode-current = Modo atual: { $mode }
aimode-available = <b>Modos disponíveis:</b>
aimode-unknown = ❌ Modo desconhecido: <code>{ $mode }</code>
aimode-available_list = Disponíveis: { $modes }
aimode-success = ✅ Modo de IA alterado para: { $mode }
aimode-error = ❌ Erro ao salvar as configurações
aimode-modes-sarcastic-name = 😏 Sarcástico
aimode-modes-sarcastic-description = Comentários sarcásticos e espirituosos com humor ácido
aimode-modes-philosopher-name = 🧠 Filósofo
aimode-modes-philosopher-description = Pensamentos profundos e reflexões filosóficas
aimode-modes-comedian-name = 😂 Comediante
aimode-modes-comedian-description = Piadas engraçadas e comentários cômicos
aimode-modes-poet-name = 📝 Poeta
aimode-modes-poet-description = Versos poéticos e belas metáforas
aimode-modes-motivator-name = 💪 Motivador
aimode-modes-motivator-description = Mensagens motivadoras e inspiradoras
aimode-modes-conspiracy-name = 🕵️ Teórico da Conspiração
aimode-modes-conspiracy-description = Teorias da conspiração e comentários suspeitos
aimode-modes-critic-name = 🎭 Crítico
aimode-modes-critic-description = Críticas e avaliações para tudo
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Comentários à moda antiga da geração mais velha
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Gírias jovens e frases da moda
aimode-modes-academic-name = 🎓 Acadêmico
aimode-modes-academic-description = Fatos científicos e comentários acadêmicos
aimode-modes-memer-name = 🐸 Memeiro
aimode-modes-memer-description = Frases de memes e cultura da internet
menu-settings-btn-color = 🎨 Cor padrão
menu-settings-btn-emoji_style = 😊 Estilo de emoji
menu-settings-btn-back = ← Voltar
quick_action-remake = 🔄
quick_action-tooltip-remake = Recriar com um estilo diferente
qarchive-on = ✅ Arquivo de texto das citações <b>ativado</b>. As novas citações serão guardadas com texto e autor.
qarchive-off = ⏸ Arquivo de texto das citações <b>desativado</b>. As novas citações guardarão apenas o sticker e a avaliação.
qarchive-status_on =
    Estado atual: <b>ativado</b>.

    <code>/qarchive off</code> — desativar
qarchive-status_off =
    Estado atual: <b>desativado</b>.

    <code>/qarchive on</code> — ativar
qarchive-usage =
    Alterne o arquivo de texto das citações para este grupo.

    <code>/qarchive on</code> ou <code>/qarchive off</code>
qforget-usage = Especifique o número da citação: <code>/qforget 142</code>
qforget-not_found = Citação #{ $local } não encontrada neste grupo.
qforget-not_author = Apenas o autor da citação pode esquecê-la.
qforget-forgotten = ✅ Citação #{ $local } esquecida. O sticker e os votos permanecem, mas o texto e o autor foram removidos do arquivo.
qforget-already_forgotten = A citação #{ $local } já tinha sido esquecida.
qforget-not_yet_archived = A citação #{ $local } não tem texto (criada antes do arquivo).
guest-hint =
    <b>Quotly — modo convidado 💬</b>

    Posso criar um sticker de citação a partir de qualquer mensagem <i>sem</i> ser membro do chat.

    <b>Como usar:</b>
    1. Responda à mensagem que deseja citar
    2. Na sua resposta escreva <code>@{ $username }</code>
    3. Pronto — deixarei um sticker de citação direto no chat

    <b>Argumentos opcionais (assim como /q):</b>
    • <code>@{ $username } r</code> — incluir a mensagem à qual estou respondendo
    • <code>@{ $username } red</code> — definir a cor de fundo
    • <code>@{ $username } rate</code> — adicionar botões 👍 / 👎
    • <code>@{ $username } p</code> — renderizar como PNG

    Para a experiência completa, abra-me no PM.
guest-hint_short = Como o Quotly funciona no modo convidado
guest-need_reply =
    <b>Quase lá! 🪄</b>

    Para criar uma citação preciso de uma mensagem para citar — responda a uma e mencione <code>@{ $username }</code>.

    Exemplo: toque em "Responder" numa mensagem → digite <code>@{ $username }</code> → envie.
guest-need_reply_short = Responda a uma mensagem e mencione o bot
guest-empty_query =
    <b>Quotly por aqui 💜</b>

    Responda a qualquer mensagem neste chat e mencione <code>@{ $username }</code> para transformá-la num sticker de citação.

    Toque abaixo para me abrir no PM e ter todos os recursos.
guest-open_in_pm = Abrir no Quotly →

# Auto-generated from locales/en.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs en

language_name = 🇺🇸 English
description-short =
    Turn any message into a beautiful quote sticker! ✨
    Reply with /q or forward the message to me
description-long =
    Create stunning quote stickers and preserve your favorite chat moments! ✨

    Simply reply /q to any message or forward it to me. Perfect for saving:
    🌟 Best chat highlights and memories
    💭 Inspiring thoughts and conversations
    🎨 Creative messages with custom styles
    ✍️ Important notes in beautiful format

    Get started now - just forward a message or use /q!
start =
    <b>Hi! 👋 I'm QuotLyBot</b>

    I transform ordinary chat messages into stunning quote stickers. Simple, creative, and fun to use!

    ✨ <b>Ready to create your first quote?</b>
    <b>In private chats:</b> Forward any messages to me (you can even select several at once!)
    <b>In groups:</b> Add me to your group and reply with <code>/q</code> to any message

    Want to change colors, styles, and more? Type /help when you're ready to discover all the creative possibilities! 🎨
help =
    <b>✨ QuotLyBot: Quick & Easy Quotes! ✨</b>

    Turn messages into stylish quotes in Telegram. Here's how:

    📱 <b>Basic Quoting</b>

    • Reply & Quote: Reply to a message and type <code>/q</code> to quote it.
    • Multiple Messages: Reply to the first of several messages, type <code>/q [number]</code> (e.g., <code>/q 3</code>) to quote multiple.
    • Forward & Quote: Forward a message to the bot to quote it directly.

    🎨 <b>Customize Your Quote</b>

    • Colors:
        • Basic: <code>/q red</code> (or blue, green, etc.)
        • Custom: <code>/q #[hex color code]</code> (e.g., <code>/q #cbafff</code>)
        • Random: <code>/q random</code>
    • Media: Include images/videos from the quoted message with <code>/q m</code> or <code>/q media</code>
        • Crop Media: Use <code>/q c</code> or <code>/q crop</code> to crop the media.
    • Keep Replies: Show the message being replied to with <code>/q r</code> or <code>/q reply</code>
    • Image Format: Use <code>/q i</code> or <code>/q img</code> or <code>/q p</code> or <code>/q png</code> for image quotes (instead of stickers).

    🤖 <b>AI Modes</b>
    • Smart Mode: Add <code>/q ai</code> to generate intelligent responses
    • Change AI Style: Use <code>/qai [style]</code> (admin only)
    • Available styles: sarcastic, philosopher, comedian, poet, motivator, conspiracy, critic, boomer, zoomer, academic, memer

    💡 <b>Cool Combinations</b>

    • White quote with replies: <code>/q white rp</code>
    • High-quality red image: <code>/q i red s3.2</code>
    • Quote with media & replies: <code>/q r #cbafff m</code>

    ⚙️ <b>More Options</b>

    • Rate Quotes: <code>/q rate</code> (if enabled in group)
    • Random Quote: <code>/qrand</code> (if enabled in group)
    • Top Quotes: <code>/qtop</code> (if enabled in group)
    • Change Language: <code>/lang</code>

    🎯 <b>Group Admin Settings</b> (for group admins only)

    • Default Color: <code>/qcolor [color]</code>
    • Enable Rating: <code>/qrate</code>
    • Save to Sticker Pack: <code>/qs [emoji]</code>
    • Remove Sticker: <code>/qd</code> (reply to sticker)
    • Random Quote Frequency: <code>/qgab [number]</code>
    • Emoji Suffix Change: <code>/qemoji</code> (change sticker emoji suffix)
    • Emoji Style:
        • Classic: <code>/qb apple</code>, <code>/qb google</code>
        • Alt: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>Need Help?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Support: <code>/donate</code>
help_group =
    <b>Hello! 👋</b>
    I'll create beautiful quotes in this group - just use <code>/q</code> in reply to any message!

    Learn all my features in private: <a href="t.me/{ $username }?start=help">Get Help</a> ✨
btn-add_group = Add to Group
btn-help = Help
quote-unsupported_message = This message type is not supported for quoting
quote-api_error =
    <b>Oops! Something went wrong 😅</b>
    <pre>{ $error }</pre>
    Please try again in a moment!
quote-empty_forward = Please reply to or forward the message you'd like to quote ✨
quote-set_background_color = <b>Perfect!</b> Quote background changed to: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Done!</b> Emoji style changed to: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Our quote service is temporarily unavailable. Please try again in a few minutes.

    If the issue persists, check @LyBlog for updates.
quote-errors-rate_limit = ⏳ Too many requests! Please wait { $seconds } seconds before creating another quote.
quote-errors-file_too_large = 📸 The media file is too large (max 5MB). Try using a smaller image or video.
quote-errors-invalid_format =
    ❌ Unsupported file format. I support:
    • Images (JPG, PNG, WEBP)
    • Videos (MP4)
    • Stickers
    • Text messages
quote-errors-telegram_error =
    ⚠️ Telegram error: { $error }

    This usually happens when:
    • The file is too large
    • The sticker pack is full
    • The bot lacks permissions
quote-errors-generic_error =
    😅 Oops! Something went wrong:
    <code>{ $error }</code>

    Please try again or report this to @Ly_oBot if it persists.
quote-errors-no_rights_send_documents =
    🚫 <b>Permission Error</b>
    I don't have permission to send documents in this chat.

    <b>To fix this:</b>
    • Group admin: Give me "Send documents" permission
    • Private chat: Make sure you haven't blocked the bot
quote-errors-no_rights_send_stickers =
    🚫 <b>Permission Error</b>
    I don't have permission to send stickers in this chat.

    <b>To fix this:</b>
    • Group admin: Give me "Send stickers" permission
    • Try using <code>/q img</code> for image format instead
quote-errors-no_rights_send_photos =
    🚫 <b>Permission Error</b>
    I don't have permission to send photos in this chat.

    <b>To fix this:</b>
    • Group admin: Give me "Send photos" permission
    • Try using <code>/q</code> for sticker format instead
quote-errors-chat_write_forbidden =
    🚫 <b>Chat Restricted</b>
    I can't send messages in this chat.

    <b>Possible reasons:</b>
    • You've blocked the bot
    • The group has restricted bots
    • I was removed from the group
quote-errors-sticker_set_invalid =
    🔄 <b>Sticker Pack Issue</b>
    There's a problem with the sticker pack. Creating a new quote...
quote-errors-sticker_set_full =
    📦 <b>Sticker Pack Full</b>
    The sticker pack has reached its limit. Your quote will be sent as a regular sticker.
quote-errors-bot_blocked =
    🚫 <b>Bot Blocked</b>
    You've blocked this bot. Please unblock it to receive quotes.
quote-errors-user_deactivated =
    👤 <b>Account Issue</b>
    The target user account is deactivated or deleted.
quote-errors-message_too_long =
    📝 <b>Message Too Long</b>
    The quoted message is too long. Try quoting fewer messages or shorter text.
quote-errors-network_error =
    🌐 <b>Network Error</b>
    Connection problem occurred. Please try again in a moment.
quote-errors-timeout_error =
    ⏱️ <b>Timeout Error</b>
    The request took too long. Please try again with a simpler quote.
quote-image_to_quote-processing = 🔍 Analyzing image and extracting text...
quote-image_to_quote-success =
    ✅ Quote created from { $count } messages!

    💡 <b>Tip:</b> Send screenshot with <code>/qi</code> or <code>/quote_image</code> caption to create quotes
quote-image_to_quote-errors-no_image = ❌ Please send an image file (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Image is too large. Maximum size: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Unsupported image format. Supported: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Couldn't find readable chat messages in the image. Make sure it's a clear screenshot of a conversation.
quote-image_to_quote-errors-parse_error = ❌ Recognition error. The image might not contain clear conversation text.
quote-image_to_quote-errors-api_error = ❌ Text recognition error. Please try again.
quote-image_to_quote-errors-rate_limit = ⏳ Too many requests! Please wait { $seconds } seconds before trying again.
sticker-save-suc = Successfully added to your <a href="{ $link }">group sticker pack</a> ✨
sticker-save-error-animated = Sorry, I can't save animated stickers yet 😅
sticker-save-error-need_creator = <b>Almost there!</b> { $creator } needs to send me a message first to save stickers
sticker-save-error-telegram = <b>Oops!</b> Something went wrong:\n<pre>{ $error }</pre>
sticker-delete-suc = Removed from your <a href="{ $link }">group sticker pack</a> 🗑
sticker-delete-empty_reply = Please reply to a sticker you'd like to delete 🗑
sticker-delete-error-telegram =
    <b>Failed to remove sticker 😕</b>
    { $reason }
sticker-delete-error-not_found = The sticker no longer exists in the pack 🤔
sticker-delete-error-rights = I don't have permission to delete this sticker 🔒
sticker-delete-error-generic =
    Something went wrong. Please try again later ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Removed from random collection 🗑
sticker-delete_random-error =
    <b>Couldn't remove the quote 😕</b>
    { $error }
sticker-delete_random-not_found = This quote is not in the database 🤔
sticker-empty_forward = Please reply to a sticker, photo, or image you'd like to save ✨
sticker-fstik = To save this to your personal sticker pack, forward to @fStikBot 🎨
rate-vote-rated = You { $rateName } this quote
rate-vote-back = Your vote has been removed
rate-settings-enable = Quote rating is now enabled
rate-settings-disable = Quote rating has been disabled
random-empty = No highly-rated quotes in this group yet! Start rating some quotes
random-gab = Random quote frequency set to { $gab } ✨
hidden-settings-enable = Sender search enabled 🔍
hidden-settings-disable = Sender search disabled 🔄
privacy-settings-enable = Privacy mode activated 🔒 Your info will be hidden in quotes
privacy-settings-disable = Privacy mode deactivated 🔓
top-info = <b>✨ Top Quoted Messages</b>
top-open = View Top Quotes
app-open_quote = ✨ Open quote
app-open_group = 📚 All quotes in group
app-open_root = 💫 My groups
app-info =
    <b>It all lives in the app too 💬</b>

    Flip through quotes, dig into the archive, chase the tops — one tap away. Hit the button ↓
donate-info =
    <b>Support QuotLyBot's Development! ☕</b>

    Your support helps us:
    • Keep the servers running 24/7
    • Add new features and styles
    • Improve quote quality
    • Make the bot faster

    <b>💳 Easy Payment Options</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Card Payment</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Cryptocurrency (for tech-savvy users)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Every contribution helps make QuotLyBot better for everyone! 💜
donate-title = Support { $botUsername }
donate-description = Help keep the magic going ✨
donate-successful =
    <b>Thank you for your support! 💜</b>
    You're helping make QuotLyBot even better!
donate-pay = 💜 Pay via Telegram
donate-other = Other Options
emoji-info =
    <b>Choose Your Quote Emoji!</b>

    • Set custom emoji: <code>/qemoji</code>💜
    • Use random emoji: <code>/qemoji random</code>
    • Clear emoji: <code>/qemoji clear</code>

    Your emoji will be added to all new quotes ✨
emoji-done = Emoji style updated! ✨
only_admin =
    <b>⚠️ Admin Access Needed</b>
    This command can only be used by group administrators.
only_group =
    <b>⚠️ Group Command</b>
    This feature works in group chats only.
rate_limit =
    <i>Taking a quick break...</i> You can use this command again in { $seconds } seconds ⏳

    <i>Pro tip: While you wait, try customizing your last quote with </i><code>/q color</code> <i>or</i> <code>/q media</code>
aimode-title = 🤖 <b>AI Modes</b>
aimode-current = Current mode: { $mode }
aimode-available = <b>Available modes:</b>
aimode-unknown = ❌ Unknown mode: <code>{ $mode }</code>
aimode-available_list = Available: { $modes }
aimode-success = ✅ AI mode changed to: { $mode }
aimode-error = ❌ Error saving settings
aimode-modes-sarcastic-name = 😏 Sarcastic
aimode-modes-sarcastic-description = Sarcastic and witty comments with dark humor
aimode-modes-philosopher-name = 🧠 Philosopher
aimode-modes-philosopher-description = Deep thoughts and philosophical reflections
aimode-modes-comedian-name = 😂 Comedian
aimode-modes-comedian-description = Funny jokes and comedic comments
aimode-modes-poet-name = 📝 Poet
aimode-modes-poet-description = Poetic lines and beautiful metaphors
aimode-modes-motivator-name = 💪 Motivator
aimode-modes-motivator-description = Motivating and inspiring messages
aimode-modes-conspiracy-name = 🕵️ Conspiracy Theorist
aimode-modes-conspiracy-description = Conspiracy theories and suspicious comments
aimode-modes-critic-name = 🎭 Critic
aimode-modes-critic-description = Critical reviews and ratings for everything
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Old-school comments from older generation
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Youth slang and trendy phrases
aimode-modes-academic-name = 🎓 Academic
aimode-modes-academic-description = Scientific facts and academic commentary
aimode-modes-memer-name = 🐸 Memer
aimode-modes-memer-description = Meme phrases and internet culture
menu-title =
    <b>🎨 QuotLyBot</b>

    Transform messages into stunning quote stickers!
menu-btn-features = ✨ Features
menu-btn-settings = ⚙️ Settings
menu-btn-help = 📚 Commands
menu-btn-language = 🌍 Language
menu-btn-back = ← Back
menu-btn-add_group = ➕ Add to Group
menu-settings-title =
    <b>⚙️ Settings</b>

    Configure your quote preferences:
menu-settings-btn-color = 🎨 Default Color
menu-settings-btn-emoji_style = 😊 Emoji Style
menu-settings-btn-privacy = 🔒 Privacy
menu-settings-btn-back = ← Back
menu-features-title =
    <b>✨ What can I do?</b>

    Tap any feature to learn more:
menu-features-btn-basics = 📱 Basics
menu-features-btn-colors = 🎨 Colors & Styles
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Group Features
menu-features-basics-title =
    <b>📱 Basic Quoting</b>

    <b>Private chat:</b>
    Forward me any message → get a sticker!

    <b>Groups:</b>
    Reply <code>/q</code> to any message

    <b>Multiple messages:</b>
    <code>/q 3</code> — the replied message + below it
    <code>/q -3</code> — the replied message + above it

    <b>Image format:</b>
    <code>/q img</code> — PNG instead of sticker
menu-features-colors-title =
    <b>🎨 Colors & Styles</b>

    <b>Named colors:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Custom hex:</b>
    <code>/q #ff5733</code>, <code>/q #cbafff</code>

    <b>Special:</b>
    <code>/q random</code> — surprise gradient
    <code>/q transparent</code> — no background

    <b>Emoji styles:</b>
    Apple, Google, Twitter, JoyPixels, Blob
    Set with <code>/qb apple</code>
menu-features-media-title =
    <b>🖼 Media in Quotes</b>

    <b>Include media:</b>
    <code>/q m</code> — adds images/videos

    <b>Crop media:</b>
    <code>/q c</code> — crops to fit

    <b>Show replies:</b>
    <code>/q r</code> — includes replied message

    <b>HD quality:</b>
    <code>/q s3.2</code> — higher resolution

    <b>Combine them:</b>
    <code>/q m r red</code> — media + replies + color
menu-features-group-title =
    <b>👥 Group Features</b>

    <b>Rate quotes:</b>
    👍👎 buttons on quotes
    Enable: <code>/qrate</code>

    <b>Top quotes:</b>
    <code>/qtop</code> — best rated quotes

    <b>Random quote:</b>
    <code>/qrand</code> — random from top

    <b>Group sticker pack:</b>
    <code>/qs 💜</code> — save to pack
    <code>/qd</code> — remove from pack
onboarding-welcome-title =
    <b>Welcome! 👋</b>

    I turn chat messages into beautiful quote stickers.
    Let me show you how it works!
onboarding-welcome-btn-start = Let's Go! →
onboarding-welcome-btn-skip = Skip Tutorial
onboarding-step1-title =
    <b>Step of 2</b> 📨

    Forward me any message from a chat.
    I'll turn it into a quote sticker!
onboarding-step1-waiting =
    Waiting for your message...
    Just forward something from any chat!
onboarding-step2-title =
    <b>Amazing! 🎉</b>

    You just created your first quote!

    <b>In groups</b>, use <code>/q</code> as a reply to any message.

    Ready to try more features?
onboarding-step2-btn-menu = Open Menu
onboarding-step2-btn-add_group = Add to Group
onboarding-complete-title =
    <b>You're all set! ✨</b>

    Now you know the basics. Add me to a group or explore all features in the menu.
quick_action-remake = 🔄
quick_action-tooltip-remake = Recreate with different style
qarchive-on = ✅ Quote text archive <b>enabled</b>. New quotes will be stored with text and author.
qarchive-off = ⏸ Quote text archive <b>disabled</b>. New quotes will store only the sticker and rating.
qarchive-status_on =
    Current state: <b>enabled</b>.

    <code>/qarchive off</code> — disable
qarchive-status_off =
    Current state: <b>disabled</b>.

    <code>/qarchive on</code> — enable
qarchive-usage =
    Toggle quote text archive for this group.

    <code>/qarchive on</code> or <code>/qarchive off</code>
qforget-usage = Specify the quote number: <code>/qforget 142</code>
qforget-not_found = Quote #{ $local } not found in this group.
qforget-not_author = Only the quote author can forget it.
qforget-forgotten = ✅ Quote #{ $local } forgotten. Sticker and votes remain, but text and author are removed from the archive.
qforget-already_forgotten = Quote #{ $local } was already forgotten.
qforget-not_yet_archived = Quote #{ $local } has no text (created before the archive).
guest-hint =
    <b>Quotly — guest mode 💬</b>

    I can make a quote sticker from any message <i>without</i> being a chat member.

    <b>How to use:</b>
    1. Reply to the message you want to quote
    2. In your reply write <code>@{ $username }</code>
    3. Done — I'll drop a quote sticker right in the chat

    <b>Optional args (just like /q):</b>
    • <code>@{ $username } r</code> — include the message I'm replying to
    • <code>@{ $username } red</code> — set background colour
    • <code>@{ $username } rate</code> — add 👍 / 👎 buttons
    • <code>@{ $username } p</code> — render as a PNG

    For the full experience open me in PM.
guest-hint_short = How Quotly works in guest mode
guest-need_reply =
    <b>Almost there! 🪄</b>

    To make a quote I need a message to quote — reply to one and mention <code>@{ $username }</code>.

    Example: tap "Reply" on a message → type <code>@{ $username }</code> → send.
guest-need_reply_short = Reply to a message and mention the bot
guest-empty_query =
    <b>Quotly here 💜</b>

    Reply to any message in this chat and mention <code>@{ $username }</code> to turn it into a quote sticker.

    Tap below to open me in PM for the full feature set.
guest-open_in_pm = Open in Quotly →

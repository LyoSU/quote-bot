# Auto-generated from locales/zh.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs zh

language_name = 🇨🇳 简体中文
description-short =
    将任何消息变成美丽的引用贴纸！✨
    回复/q或将消息转发给我
description-long =
    创建惊艳的引用贴纸，保存你喜爱的聊天瞬间！✨

    只需回复/q给任意消息或转发给我。完美适用于保存：
    🌟 最佳聊天亮点和回忆
    💭 鼓舞人心的想法和对话
    🎨 具有自定义风格的创意消息
    ✍️ 美丽格式的重要笔记

    立即开始——只需转发消息或使用/q！
start =
    <b>嗨！👋 我是 QuotLyBot</b>

    我将普通的聊天信息转换为精美的引言贴纸。简单、创意、乐趣十足！

    ✨ <b>准备好创建您的第一个引言了吗？</b>
    <b>在私人聊天中：</b> 转发任何消息给我（您甚至可以一次选择多个）！
    <b>在群组中：</b> 添加我到您的群组并回复任意消息使用<code>/q</code>

    想要更改颜色、样式等？当您准备好发现所有创意可能性时请输入 /help！ 🎨
help =
    <b>✨ QuotLyBot：快速 & 简单的引言！✨</b>

    在 Telegram 中将消息转换为时尚的引言。操作如下：

    📱 <b>基本引言</b>

    • 回复 & 引言：回复一条消息并键入<code>/q</code>来引用它。
    • 多条引言：回复多条消息中的第一条，键入<code>/q [number]</code>（例如，<code>/q 3</code>）来引用多条。
    • 转发 & 引言：将一条消息转发到机器人来直接引用它。

    🎨 <b>自定义您的引言</b>

    • 颜色：
        • 基本：<code>/q red</code>（或蓝色、绿色等）
        • 自定义：<code>/q #[hex color code]</code>（例如，<code>/q #cbafff</code>）
        • 随机：<code>/q random</code>
    • 媒体： 使用<code>/q m</code>或<code>/q media</code>在引用的消息中包含图片、视频
        • 裁剪媒体：使用<code>/q c</code>或<code>/q crop</code>裁剪媒体。
    • 保留回复：显示正在回复的消息使用<code>/q r</code>或<code>/q reply</code>
    • 图片格式：使用<code>/q i</code>或<code>/q img</code>或<code>/q p</code>或<code>/q png</code>来引用图片（而不是贴纸）。

    💡 <b>酷组合</b>

    • 带回复的白色引言：<code>/q white rp</code>
    • 高质量的红色图片：<code>/q i red</code>
    • 带媒体 & 回复的引言：<code>/q r #cbafff m</code>

    ⚙️ <b>更多选项</b>

    • 评分引言：<code>/q rate</code>（如果在群组中启用）
    • 随机引言：<code>/qrand</code>（如果在群组中启用）
    • 顶级引言：<code>/qtop</code>（如果在群组中启用）
    • 更改语言：<code>/lang</code>

    🎯 <b>群组管理员设置</b>（仅限群组管理员）

    • 默认颜色：<code>/qcolor [color]</code>
    • 启用评分：<code>/qrate</code>
    • 保存到贴纸包：<code>/qs [emoji]</code>
    • 移除贴纸：<code>/qd</code>（回复贴纸）
    • 随机引言频率：<code>/qgab [number]</code>
    • 表情后缀更改：<code>/qemoji</code>（更改贴纸表情后缀）
    • 表情风格：
        • 经典：<code>/qb apple</code>, <code>/qb google</code>
        • 替代：<code>/qb twitter</code>, <code>/qb joypixels</code>
        • 复古：<code>/qb blob</code>

    📱 <b>需要帮助?</b>

    • 博客：<a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub：<a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • 支持：<code>/donate</code>
help_group =
    <b>你好！👋</b>
    我将在此群组内创建美丽的引语——只需在回复的消息中使用<code>/q</code>！

    了解我在私人中的所有功能：<a href="t.me/{ $username }?start=help">获取帮助</a>✨
btn-add_group = 添加到群组
btn-help = 帮助
quote-unsupported_message = 此消息类型不支持引用
quote-api_error =
    <b>糟糕！出错了 😅</b>
    <pre>{ $error }</pre>
    请稍等片刻再试！
quote-empty_forward = 请回复或转发您想引用的消息✨
quote-set_background_color = <b>太好了！</b> 引文背景已更改为：<code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>完成！</b> 表情符号样式更改为：<code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 引用服务暂时不可用。请稍后再试。

    如果问题仍然存在，请查看@LyBlog以获取更新。
quote-errors-rate_limit = ⏳ 请求过多！请等待{ $seconds }秒后再创建新的引用。
quote-errors-file_too_large = 📸 媒体文件太大（最大5MB）。尝试使用较小的图像或视频。
quote-errors-invalid_format =
    ❌ 不支持的文件格式。我支持以下格式：
    • 图片（JPG, PNG, WEBP）
    • 视频（MP4）
    • 贴纸
    • 文本消息
quote-errors-telegram_error =
    ⚠️ Telegram错误：{ $error }

    这通常发生在：
    • 文件太大
    • 贴纸包已满
    • 机器人权限不足
quote-errors-generic_error =
    😅 哎呀！出了点问题：
    <code>{ $error }</code>

    请再试一次，或者如果问题持续存在，请向 @Ly_oBot 报告。
quote-errors-no_rights_send_documents =
    🚫 <b>权限错误</b>
    我没有权限在此聊天中发送文件。

    <b>解决方法：</b>
    • 群管理员：请给予我“发送文件”权限
    • 私聊：确保您没有屏蔽此机器人
quote-errors-no_rights_send_stickers =
    🚫 <b>权限错误</b>
    我没有权限在此聊天中发送贴纸。

    <b>解决方法：</b>
    • 群管理员：请给予我“发送贴纸”权限
    • 尝试使用<code>/q img</code>以图像格式发送
quote-errors-no_rights_send_photos =
    🚫 <b>权限错误</b>
    我没有权限在此聊天中发送照片。

    <b>解决方法：</b>
    • 群管理员：请给予我“发送照片”权限
    • 尝试使用<code>/q</code>以贴纸格式发送
quote-errors-chat_write_forbidden =
    🚫 <b>聊天受限</b>
    我无法在此聊天中发送消息。

    <b>可能的原因：</b>
    • 您已屏蔽此机器人
    • 群组限制了机器人
    • 我被移出了群组
quote-errors-sticker_set_invalid =
    🔄 <b>贴纸包问题</b>
    贴纸包存在问题，正在创建新的引用...
quote-errors-sticker_set_full =
    📦 <b>贴纸包已满</b>
    贴纸包已达到上限，您的引用将被作为普通贴纸发送。
quote-errors-bot_blocked =
    🚫 <b>机器人被屏蔽</b>
    您已屏蔽了此机器人，请解除屏蔽以接收引用。
quote-errors-user_deactivated =
    👤 <b>账号问题</b>
    目标用户账号已被停用或删除。
quote-errors-message_too_long =
    📝 <b>消息太长</b>
    引用的消息太长，请尝试引用较少的消息或较短的文本。
quote-errors-network_error =
    🌐 <b>网络错误</b>
    出现连接问题，请稍后重试。
quote-errors-timeout_error =
    ⏱️ <b>超时错误</b>
    请求耗时过长，请尝试使用更简单的引用重试。
quote-image_to_quote-processing = 🔍 正在分析图像并提取文本...
quote-image_to_quote-success =
    ✅ 已从 { $count } 条消息中创建引用！

    💡 <b>提示：</b>发送截图并添加<code>/qi</code>或<code>/quote_image</code>标题以创建引用
quote-image_to_quote-errors-no_image = ❌ 请发送图像文件（JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ 图像过大。最大尺寸：20MB
quote-image_to_quote-errors-unsupported_format = ❌ 不支持的图像格式。支持格式：JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ 无法在图像中找到可读的聊天消息。请确保这是对话的明确截图。
quote-image_to_quote-errors-parse_error = ❌ 识别错误。图像可能不包含清晰的对话文本。
quote-image_to_quote-errors-api_error = ❌ 文本识别错误。请再试一次。
quote-image_to_quote-errors-rate_limit = ⏳ 请求次数过多！请等待 { $seconds } 秒后再试。
sticker-save-suc = 成功添加到您的<a href="{ $link }">群组贴纸包</a>✨
sticker-save-error-animated = 抱歉，我暂时无法保存动画贴纸 😅
sticker-save-error-need_creator = <b>快到了！</b> { $creator }需要先发送给我一条消息才能保存贴纸
sticker-save-error-telegram = <b>糟糕！</b> 出现错误：\n<pre>{ $error }</pre>
sticker-delete-suc = 已从您的<a href="{ $link }">群组贴纸包</a>中移除 🗑
sticker-delete-empty_reply = 请回复您想删除的贴纸 🗑
sticker-delete-error-telegram =
    <b>无法移除贴纸 😕</b>
    { $reason }
sticker-delete-error-not_found = 贴纸在包中不存在 🤔
sticker-delete-error-rights = 我没有删除此贴纸的权限 🔒
sticker-delete-error-generic =
    发生了错误。请稍后再试 ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = 已从随机集合中移除 🗑
sticker-delete_random-error =
    <b>无法移除引用 😕</b>
    { $error }
sticker-delete_random-not_found = 此引用不在数据库中 🤔
sticker-empty_forward = 请回复您想保存的贴纸、照片或图片✨
sticker-fstik = 为了将此保存到您的个人贴纸包，请转发到 @fStikBot 🎨
rate-vote-rated = 您 { $rateName } 了它。
rate-vote-back = 您的投票已被撤销
rate-settings-enable = 引用评价已启用。
rate-settings-disable = 引用评价已禁用
random-empty = 此组中还没有高分引用！开始评价消息吧
random-gab = 随机引文频率设置为 { $gab } ✨
hidden-settings-enable = 发送者搜索已启用 🔍
hidden-settings-disable = 发送者搜索已禁用 🔄
privacy-settings-enable = 隐私模式已激活 🔒 您的信息将在引文中被隐藏
privacy-settings-disable = 隐私模式已关闭 🔓
top-info = <b>✨ 顶级引用消息</b>
top-open = 查看顶级引文
donate-info =
    <b>支持 QuotLyBot 的发展！☕</b>

    您的支持帮助我们：
    • 让服务器 24/7 全天候运行
    • 添加新功能和样式
    • 改善引文质量
    • 让机器人运行得更快

    <b>💳 简单支付选项</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">银行卡支付</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 加密货币（适合技术爱好者）</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    每一份贡献都在帮助让 QuotLyBot 变得更好！💜
donate-title = 支持 { $botUsername }
donate-description = 帮助保持魔法继续 ✨
donate-successful =
    <b>感谢您的支持！💜</b>
    您正在帮助让 QuotLyBot 变得更好！
donate-pay = 💜 通过 Telegram 支付
donate-other = 其它选项
emoji-info =
    <b>选择您的引用表情符号！</b>

    • 设置自定义表情：<code>/qemoji</code>💜
    • 使用随机表情：<code>/qemoji random</code>
    • 清除表情：<code>/qemoji clear</code>

    您的表情将添加到所有新引文中 ✨
emoji-done = 表情符号样式已更新！✨
only_admin =
    <b>⚠️ 需要管理员访问权限</b>
    此命令只能由群组管理员使用。
only_group =
    <b>⚠️ 群组命令</b>
    此功能仅在群组聊天中有效。
rate_limit =
    <i>稍作休息...</i> 您可以在 { $seconds } 秒后再次使用此命令 ⏳

    <i>小提示：在等待的同时，尝试自定义您的最后一个引文，使用</i><code>/q color</code> <i>或</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    将消息转换为精美的引用贴纸！
menu-btn-features = ✨ 功能
menu-btn-settings = ⚙️ 设置
menu-btn-help = 📚 命令
menu-btn-language = 🌍 语言
menu-btn-back = ← 返回
menu-btn-add_group = ➕ 添加到群组
qs-title =
    <b>⚙️ 引用设置</b>

    选择一个部分。更改将应用于此处的每条新引用。
qs-on = 开
qs-off = 关
qs-cat-appearance = 🎨 外观
qs-cat-content = ✂️ 引用内容
qs-cat-privacy = 🔒 隐私
qs-cat-group = 👥 群组
qs-cat-appearance-desc =
    <b>🎨 外观</b>

    • <b>格式</b> — 贴纸、图片或 PNG 文件。
    • <b>颜色</b> — 引用背景。
    • <b>表情符号风格</b> — 表情符号的绘制方式（Apple、Google…）。
    • <b>贴纸表情</b> — 添加到已保存贴纸的表情符号。
qs-cat-content-desc =
    <b>✂️ 引用内容</b>

    • <b>部分引用</b> — 当你回复选中的片段时：<i>带边框</i> 以引用边框显示，<i>无边框</i> 仅显示文本，<i>整条消息</i> 忽略选择。
    • <b>显示回复</b> — 包含被回复的消息。
    • <b>媒体</b> — 包含消息中的图片/视频。
    • <b>裁剪媒体</b> — 裁剪过高的媒体以适应。
    • <b>作者身份</b> — 显示发送者的管理员头衔 / 签名（右上角的小标签）。
qs-cat-privacy-desc =
    <b>🔒 隐私</b>

    • <b>隐私</b> — 保存的引用不会关联到其作者（不会在应用中以你的名字显示）。贴纸本身不变。
    • <b>发送者搜索</b> — 尝试识别账户被隐藏的转发消息的原始作者。
qs-cat-group-desc =
    <b>👥 群组</b>

    • <b>评分</b> — 在引用下方显示 👍/👎 按钮。
    • <b>自动引用</b> — 在热闹时刻偶尔重新展示一条热门引用。
    • <b>文本存档</b> — 存储引用文本（搜索和随机所需）。
qs-row-partial = ✂️ 部分引用
qs-partial-framed = 带边框
qs-partial-plain = 无边框
qs-partial-off = 整条消息
qs-row-color = 🎨 颜色
qs-color-title =
    <b>🎨 背景</b>

    选择一种颜色，或用 <code>/qcolor #ff5733</code> 设置自定义颜色。
qs-row-brand = 😀 表情符号风格
qs-row-format = 🖥 格式
qs-format-sticker = 贴纸
qs-format-image = 图片
qs-format-png = PNG 文件
qs-row-gab = 🔁 自动引用
qs-gab-off = 关
qs-gab-often = 经常
qs-gab-sometimes = 有时
qs-gab-rarely = 很少
qs-row-suffix = 💟 贴纸表情
qs-row-media = 📎 媒体
qs-row-reply = 💬 显示回复
qs-row-crop = 🖼 裁剪媒体
qs-row-sendertag = 🏷 作者身份
qs-row-privacy = 🔒 隐私
qs-row-hidden = 🕵 发送者搜索
qs-row-rate = ⭐ 评分
qs-row-archive = 🗂 文本存档
qs-suffix-title =
    <b>💟 贴纸表情</b>

    在下方选择一个，或用 <code>/qemoji 🔥</code> 设置自定义表情。
qs-btn-reset = ↩️ 全部重置
qs-reset-done = 已重置为默认值
menu-features-title =
    <b>✨ 我能做什么？</b>
    点击功能了解更多：
menu-features-btn-basics = 📱 基础
menu-features-btn-colors = 🎨 颜色与样式
menu-features-btn-media = 🖼 媒体
menu-features-btn-group = 👥 群组功能
menu-features-basics-title =
    <b>📱 基本引用</b>

    <b>在群组中：</b>
    回复任何消息并使用 <code>/q</code>

    <b>在私聊中：</b>
    转发消息给我

    <b>多条消息：</b>
    <code>/q 3</code> — 回复的消息 + 下方2条
    <code>/q -3</code> — 回复的消息 + 上方2条
menu-features-colors-title =
    <b>🎨 颜色与样式</b>

    <b>基本颜色：</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>自定义颜色：</b>
    <code>/q #ff69b4</code>

    <b>随机颜色：</b>
    <code>/q random</code>

    <b>渐变：</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 媒体选项</b>

    <b>包含媒体：</b>
    <code>/q m</code> 或 <code>/q media</code>

    <b>裁剪媒体：</b>
    <code>/q c</code> 或 <code>/q crop</code>

    <b>显示回复：</b>
    <code>/q r</code> 或 <code>/q reply</code>

    <b>作为图片：</b>
    <code>/q img</code> 或 <code>/q png</code>
menu-features-group-title =
    <b>👥 群组功能</b>

    <b>管理员：</b>
    • <code>/qcolor blue</code> — 默认颜色
    • <code>/qrate</code> — 启用评分
    • <code>/qs</code> — 保存到贴纸包

    <b>所有人：</b>
    • <code>/qtop</code> — 热门引用
    • <code>/qrand</code> — 随机引用
menu-settings-title =
    <b>⚙️ 设置</b>
    管理您的偏好设置：
menu-settings-btn-privacy = 🔒 隐私
app-open_quote = ✨ 打开引用
app-open_group = 📚 群组中的所有引用
app-open_root = 💫 我的群组
app-info =
    <b>这一切也都在应用中 💬</b>

    翻阅引用、深入存档、追逐榜单——一键即达。点击下方按钮 ↓
aimode-title = 🤖 <b>AI 模式</b>
aimode-current = 当前模式：{ $mode }
aimode-available = <b>可用模式：</b>
aimode-unknown = ❌ 未知模式：<code>{ $mode }</code>
aimode-available_list = 可用：{ $modes }
aimode-success = ✅ AI 模式已更改为：{ $mode }
aimode-error = ❌ 保存设置时出错
aimode-modes-sarcastic-name = 😏 讽刺者
aimode-modes-sarcastic-description = 带有黑色幽默的讽刺机智评论
aimode-modes-philosopher-name = 🧠 哲学家
aimode-modes-philosopher-description = 深刻的思考和哲学反思
aimode-modes-comedian-name = 😂 喜剧演员
aimode-modes-comedian-description = 有趣的笑话和喜剧评论
aimode-modes-poet-name = 📝 诗人
aimode-modes-poet-description = 诗意的句子和优美的比喻
aimode-modes-motivator-name = 💪 激励者
aimode-modes-motivator-description = 激励人心、鼓舞士气的话语
aimode-modes-conspiracy-name = 🕵️ 阴谋论者
aimode-modes-conspiracy-description = 阴谋论和可疑评论
aimode-modes-critic-name = 🎭 评论家
aimode-modes-critic-description = 对一切的批评性评论和评分
aimode-modes-boomer-name = 👴 老一辈
aimode-modes-boomer-description = 来自老一代人的老派评论
aimode-modes-zoomer-name = 😎 Z世代
aimode-modes-zoomer-description = 年轻人的俚语和潮流短语
aimode-modes-academic-name = 🎓 学者
aimode-modes-academic-description = 科学事实和学术评论
aimode-modes-memer-name = 🐸 梗图达人
aimode-modes-memer-description = 梗图短语和网络文化
menu-settings-btn-color = 🎨 默认颜色
menu-settings-btn-emoji_style = 😊 表情符号风格
menu-settings-btn-back = ← 返回
quick_action-remake = 🔄
quick_action-tooltip-remake = 用不同风格重新生成
qarchive-on = ✅ 引用文本存档<b>已启用</b>。新引用将连同文本和作者一起存储。
qarchive-off = ⏸ 引用文本存档<b>已禁用</b>。新引用将仅存储贴纸和评分。
qarchive-status_on =
    当前状态：<b>已启用</b>。

    <code>/qarchive off</code> — 禁用
qarchive-status_off =
    当前状态：<b>已禁用</b>。

    <code>/qarchive on</code> — 启用
qarchive-usage =
    切换此群组的引用文本存档。

    <code>/qarchive on</code> 或 <code>/qarchive off</code>
qforget-usage = 请指定引用编号：<code>/qforget 142</code>
qforget-not_found = 在此群组中未找到引用 #{ $local }。
qforget-not_author = 只有引用作者才能将其遗忘。
qforget-forgotten = ✅ 引用 #{ $local } 已遗忘。贴纸和投票保留，但文本和作者已从存档中移除。
qforget-already_forgotten = 引用 #{ $local } 此前已被遗忘。
qforget-not_yet_archived = 引用 #{ $local } 没有文本（创建于存档之前）。
guest-hint =
    <b>Quotly — 访客模式 💬</b>

    无需成为聊天成员，我也能把任意消息做成引用贴纸。

    <b>使用方法：</b>
    1. 回复您想引用的消息
    2. 在回复中输入 <code>@{ $username }</code>
    3. 完成——我会直接在聊天里发出一张引用贴纸

    <b>可选参数（与 /q 相同）：</b>
    • <code>@{ $username } r</code> — 包含我所回复的消息
    • <code>@{ $username } red</code> — 设置背景颜色
    • <code>@{ $username } rate</code> — 添加 👍 / 👎 按钮
    • <code>@{ $username } p</code> — 渲染为 PNG

    想体验完整功能，请在私聊中打开我。
guest-hint_short = Quotly 在访客模式下如何工作
guest-need_reply =
    <b>就差一步了！🪄</b>

    要制作引用，我需要一条可供引用的消息——回复一条消息并提及 <code>@{ $username }</code>。

    示例：在某条消息上点击“回复”→ 输入 <code>@{ $username }</code> → 发送。
guest-need_reply_short = 回复一条消息并提及机器人
guest-empty_query =
    <b>Quotly 在此 💜</b>

    回复此聊天中的任意消息并提及 <code>@{ $username }</code>，即可将其变成引用贴纸。

    点击下方在私聊中打开我，获取完整功能。
guest-open_in_pm = 在 Quotly 中打开 →
sticker-save-error-too_large = 图片太大了（最大 2048×2048）。请尝试小一点的 📐

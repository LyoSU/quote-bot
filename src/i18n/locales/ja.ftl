# Auto-generated from locales/ja.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs ja

language_name = 🇯🇵 日本語
description-short =
    メッセージを美しい引用ステッカーに変えましょう！✨
    /qで返信するか、メッセージを転送してください
description-long =
    驚くほど美しい引用ステッカーを作成して、お気に入りのチャットの瞬間を保存しましょう！✨

    どんなメッセージにも/qで返信するか、転送してください。以下に最適:
    🌟 チャットのハイライトや思い出
    💭 心に残る思いや会話
    🎨 カスタムスタイルのクリエイティブなメッセージ
    ✍️ 美しい形式の重要なメモ

    今すぐ始めましょう - メッセージを転送するか、/qを使って！
start =
    <b>こんにちは！ 👋 私はQuotLyBotです</b>

    普通のチャットメッセージを美しい引用ステッカーに変換します。シンプルでクリエイティブ、そして使うのが楽しいですよ！

    ✨ <b>最初の引用を作成する準備はできましたか？</b>
    <b>プライベートチャットでは:</b> メッセージを私に転送してください（一度に複数選択することもできます！）
    <b>グループでは:</b> 私をグループに追加し、<code>/q</code>を使ってどのメッセージにも返信してください

    色、スタイル、もっと変更したいですか？すべての創造的な可能性を発見する準備ができた時は、/helpと入力してください！ 🎨
help =
    <b>✨ QuotLyBot: 簡単かつ迅速な引用！ ✨</b>

    メッセージをスタイリッシュな引用に変換します。方法は次の通りです:

    📱 <b>基本的な引用作成</b>

    • 返信して引用: メッセージに返信し、<code>/q</code>を入力して引用します。
    • 複数の引用: いくつかのメッセージの最初に返信し、<code>/q [番号]</code>（例: <code>/q 3</code>）を入力して複数を引用します。
    • 転送して引用: メッセージをボットに転送して直接引用します。

    🎨 <b>引用をカスタマイズ</b>

    • 色:
        • 基本: <code>/q red</code>（またはblue, greenなど）
        • カスタム: <code>/q #[色の16進コード]</code>（例: <code>/q #cbafff</code>）
        • ランダム: <code>/q random</code>
    • メディア: 引用メッセージから画像/ビデオを含むには<code>/q m</code>または<code>/q media</code>を使用
        • メディアを切り取る: <code>/q c</code>または<code>/q crop</code>を使用してメディアを切り取ります。
    • 返信をキープ: 返信されているメッセージを表示するには<code>/q r</code>または<code>/q reply</code>を使用
    • 画像形式: 画像引用には<code>/q i</code>または<code>/q img</code>または<code>/q p</code>または<code>/q png</code>を使用（ステッカーの代わりに）。

    💡 <b>クールな組み合わせ</b>

    • 返信付きの白い引用: <code>/q white rp</code>
    • 高品質の赤い画像: <code>/q i red s3.2</code>
    • メディアと返信付きの引用: <code>/q r #cbafff m</code>

    ⚙️ <b>その他のオプション</b>

    • 引用を評価: <code>/q rate</code>（グループで有効の場合）
    • ランダム引用: <code>/qrand</code>（グループで有効の場合）
    • トップ引用: <code>/qtop</code>（グループで有効の場合）
    • 言語変更: <code>/lang</code>

    🎯 <b>グループ管理者設定</b>（グループ管理者のみ）

    • デフォルトの色: <code>/qcolor [color]</code>
    • 評価を有効にする: <code>/qrate</code>
    • ステッカーパックに保存: <code>/qs [emoji]</code>
    • ステッカーを削除: <code>/qd</code>（ステッカーに返信）
    • ランダム引用の頻度: <code>/qgab [番号]</code>
    • 絵文字サフィックス変更: <code>/qemoji</code>（ステッカーの絵文字サフィックス変更）
    • 絵文字スタイル:
        • クラシック: <code>/qb apple</code>, <code>/qb google</code>
        • 代替: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • レトロ: <code>/qb blob</code>

    📱 <b>助けが必要？</b>

    • ブログ: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • サポート: <code>/donate</code>
help_group =
    <b>こんにちは！👋</b>
    このグループで美しい引用を作成します。どんなメッセージにも<code>/q</code>を使って返信してください！

    プライベートで全機能を学びましょう: <a href="t.me/{ $username }?start=help">ヘルプを取得</a> ✨
btn-add_group = グループに追加
btn-help = ヘルプ
quote-unsupported_message = このメッセージタイプは引用に対応していません
quote-api_error =
    <b>おっと！何かがうまくいかなかったようです 😅</b>
    <pre>{ $error }</pre>
    もう一度試してみてください！
quote-empty_forward = 引用したいメッセージに返信するか、転送してください ✨
quote-set_background_color = <b>完璧です!</b> 引用背景が変更されました: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>完了!</b> 絵文字スタイルが変更されました: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 申し訳ありませんが、引用サービスは一時的に利用できません。数分後にもう一度お試しください。

    問題が解決しない場合は、@LyBlog を確認してください。
quote-errors-rate_limit = ⏳ リクエストが多すぎます！再び引用を作成する前に { $seconds } 秒お待ちください。
quote-errors-file_too_large = 📸 メディアファイルが大きすぎます（最大5MB）。より小さい画像やビデオを使用してください。
quote-errors-invalid_format =
    ❌ 対応していないファイル形式です。対応形式は以下の通りです:
    • 画像 (JPG, PNG, WEBP)
    • ビデオ (MP4)
    • ステッカー
    • テキストメッセージ
quote-errors-telegram_error =
    ⚠️ Telegramエラー: { $error }

    通常このエラーは以下の理由で発生します:
    • ファイルが大きすぎる
    • ステッカーパックが満杯
    • ボットに権限がない
quote-errors-generic_error =
    😅 おっと！何か問題が発生しました:
    <code>{ $error }</code>

    再試行するか、問題が解決しない場合は @Ly_oBot に報告してください。
quote-errors-no_rights_send_documents =
    🚫 <b>アクセス許可エラー</b>
    このチャットでドキュメントを送信する許可がありません。

    <b>修正方法:</b>
    • グループ管理者: "ドキュメント送信" の許可を与えてください
    • プライベートチャット: ボットをブロックしていないことを確認してください。
quote-errors-no_rights_send_stickers =
    🚫 <b>アクセス許可エラー</b>
    このチャットでステッカーを送信する許可がありません。

    <b>修正方法:</b>
    • グループ管理者: "ステッカー送信" の許可を与えてください
    • イメージ形式には <code>/q img</code> を試してください
quote-errors-no_rights_send_photos =
    🚫 <b>アクセス許可エラー</b>
    このチャットで写真を送信する許可がありません。

    <b>修正方法:</b>
    • グループ管理者: "写真送信" の許可を与えてください
    • ステッカー形式には <code>/q</code> を試してください
quote-errors-chat_write_forbidden =
    🚫 <b>チャット制限</b>
    このチャットでメッセージを送信できません。

    <b>可能な理由:</b>
    • ボットをブロックしました
    • グループがボットを制限しています
    • グループから削除されました
quote-errors-sticker_set_invalid =
    🔄 <b>ステッカー パックの問題</b>
    ステッカー パックに問題があります。新しい引用を作成しています...
quote-errors-sticker_set_full =
    📦 <b>ステッカー パックが満杯です</b>
    ステッカー パックが制限に達しました。あなたの引用は通常のステッカーとして送信されます。
quote-errors-bot_blocked =
    🚫 <b>ボットがブロックされました</b>
    このボットをブロックしました。引用を受け取るにはそれを解除してください。
quote-errors-user_deactivated =
    👤 <b>アカウントの問題</b>
    対象ユーザーのアカウントが無効化または削除されています。
quote-errors-message_too_long =
    📝 <b>メッセージが長すぎます</b>
    引用されたメッセージが長すぎます。引用するメッセージ数を減らすか短いテキストを試してください。
quote-errors-network_error =
    🌐 <b>ネットワーク エラー</b>
    接続問題が発生しました。少し時間を置いてもう一度お試しください。
quote-errors-timeout_error =
    ⏱️ <b>タイムアウト エラー</b>
    リクエストに時間がかかりすぎている。より簡単な引用で再度お試しください。
quote-image_to_quote-processing = 🔍 画像を分析しテキストを抽出しています...
quote-image_to_quote-success =
    ✅ { $count } 件のメッセージから引用が生成されました！

    💡 <b>ヒント:</b> スクリーンショットに <code>/qi</code> または <code>/quote_image</code> のキャプションを付けて引用を作成してください
quote-image_to_quote-errors-no_image = ❌ 画像ファイル (JPG、PNG、WebP) を送信してください
quote-image_to_quote-errors-file_too_large = ❌ 画像が大きすぎます。最大サイズ: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ サポートされていない画像形式。サポートされている形式: JPG、PNG、WebP
quote-image_to_quote-errors-no_text_found = ❌ 画像内に読み取れるチャットメッセージが見つかりませんでした。会話の明瞭なスクリーンショットであることを確認してください。
quote-image_to_quote-errors-parse_error = ❌ 認識エラー。画像は明瞭な会話テキストを含んでいない可能性があります。
quote-image_to_quote-errors-api_error = ❌ テキスト認識エラー。もう一度お試しください。
quote-image_to_quote-errors-rate_limit = ⏳ 多くのリクエストがあります！再試行する前に { $seconds } 秒待ってください。
sticker-save-suc = 正常に<a href="{ $link }">グループステッカーパック</a>に追加されました ✨
sticker-save-error-animated = 申し訳ないですが、アニメーションステッカーはまだ保存できません 😅
sticker-save-error-need_creator = <b>もう少し!</b> まず最初に{ $creator }が私にメッセージを送る必要があります
sticker-save-error-telegram = <b>おっと！</b> 何かがうまくいかなかったようです:\n<pre>{ $error }</pre>
sticker-delete-suc = <a href="{ $link }">グループステッカーパック</a>から削除されました 🗑
sticker-delete-empty_reply = 削除したいステッカーに返信してください 🗑
sticker-delete-error-telegram =
    <b>ステッカーの削除に失敗しました 😕</b>
    { $reason }
sticker-delete-error-not_found = ステッカーはもうパックに存在しません 🤔
sticker-delete-error-rights = このステッカーを削除する権限がありません 🔒
sticker-delete-error-generic =
    何かがうまくいきませんでした。後でもう一度お試しください ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = ランダムなコレクションから削除されました 🗑
sticker-delete_random-error =
    <b>引用を削除できませんでした 😕</b>
    { $error }
sticker-delete_random-not_found = この引用はデータベースに存在しません 🤔
sticker-empty_forward = 保存したいステッカー、写真、画像に返信してください ✨
sticker-fstik = 個人用ステッカーパックに保存するには、@fStikBot に転送してください 🎨
rate-vote-rated = この引用に { $rateName } しました
rate-vote-back = 投票を取り消しました
rate-settings-enable = 引用の評価が有効になりました
rate-settings-disable = 引用の評価が無効化されました
random-empty = このグループには高評価の引用がまだありません！引用を評価し始めてください
random-gab = ランダム引用の頻度が{ $gab }に設定されました ✨
hidden-settings-enable = 送信者検索が有効になります 🔍
hidden-settings-disable = 送信者検索は無効になっています 🔄
privacy-settings-enable = プライバシーモードが有効になりました 🔒 引用からあなたの情報が隠されます
privacy-settings-disable = プライバシーモードは無効になっています 🔓
top-info = <b>✨ トップ引用メッセージ</b>
top-open = トップ引用を見る
donate-info =
    <b>QuotLyBotの開発をサポートしよう！☕</b>

    あなたのサポートで私たちが:
    • サーバーを24/7稼働で維持
    • 新機能とスタイルを追加
    • 引用の品質を向上
    • ボットを高速化

    <b>💳 簡単な支払いオプション</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">カード支払い</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 暗号通貨 (技術の得意な方向け)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    すべての貢献はQuotLyBotをより良くする手助けになります！💜
donate-title = { $botUsername }をサポート
donate-description = 魔法を持続させる手助けを ✨
donate-successful =
    <b>サポートありがとうございます！💜</b>
    QuotLyBotのさらなる進化を支援いただけて嬉しいです！
donate-pay = 💜 Telegramで支払う
donate-other = 他の方法
emoji-info =
    <b>引用絵文字を選ぼう！</b>

    • カスタム絵文字を設定: <code>/qemoji</code>💜
    • ランダム絵文字を使用: <code>/qemoji random</code>
    • 絵文字をクリア: <code>/qemoji clear</code>

    新しい引用に絵文字が追加されます ✨
emoji-done = 絵文字スタイルが更新されました！✨
only_admin =
    <b>⚠️ 管理者アクセスが必要です</b>
    このコマンドはグループ管理者のみが使用できます。
only_group =
    <b>⚠️ グループコマンド</b>
    この機能はグループチャットでのみ動作します。
rate_limit =
    <i>ちょっとしたブレイク...</i> このコマンドは{ $seconds }秒後に再度使用できます ⏳

    <i>プロのヒント: 待機中に、最後の引用をカスタマイズするのに </i><code>/q color</code> <i>または</i> <code>/q media</code>をお試しください
menu-title =
    <b>🎨 QuotLyBot</b>
    メッセージを美しい引用ステッカーに変換！
menu-btn-features = ✨ 機能
menu-btn-settings = ⚙️ 設定
menu-btn-help = 📚 コマンド
menu-btn-language = 🌍 言語
menu-btn-back = ← 戻る
menu-btn-add_group = ➕ グループに追加
qs-title =
    <b>⚙️ 引用設定</b>

    セクションを選んでください。変更はここでの新しい引用すべてに適用されます。
qs-on = オン
qs-off = オフ
qs-cat-appearance = 🎨 外観
qs-cat-content = ✂️ 引用する内容
qs-cat-privacy = 🔒 プライバシー
qs-cat-group = 👥 グループ
qs-cat-appearance-desc =
    <b>🎨 外観</b>

    • <b>形式</b> — ステッカー、画像、または PNG ファイル。
    • <b>色</b> — 引用の背景。
    • <b>絵文字スタイル</b> — 絵文字の描き方（Apple、Google…）。
    • <b>ステッカーの絵文字</b> — 保存したステッカーに付ける絵文字。
qs-cat-content-desc =
    <b>✂️ 引用する内容</b>

    • <b>部分引用</b> — 選択した部分に返信したとき：<i>枠あり</i> は引用の枠付きで表示、<i>枠なし</i> はテキストのみ、<i>メッセージ全体</i> は選択を無視します。
    • <b>返信を表示</b> — 返信先のメッセージを含める。
    • <b>メディア</b> — メッセージの写真/動画を含める。
    • <b>メディアを切り抜き</b> — 縦長のメディアを収まるように切り抜く。
    • <b>投稿者の役職</b> — 送信者の管理者の肩書き / 署名を表示（右上の小さなラベル）。
qs-cat-privacy-desc =
    <b>🔒 プライバシー</b>

    • <b>プライバシー</b> — 保存した引用は作成者に紐付けられません（アプリであなたの名前の下に表示されません）。ステッカー自体は変わりません。
    • <b>送信者検索</b> — アカウントが非表示の転送メッセージについて、元の作成者を特定しようとします。
qs-cat-group-desc =
    <b>👥 グループ</b>

    • <b>評価</b> — 引用の下に 👍/👎 ボタンを表示。
    • <b>自動引用</b> — 盛り上がった瞬間に人気の引用をときどき再登場させる。
    • <b>テキストアーカイブ</b> — 引用テキストを保存（検索とランダムに必要）。
qs-row-partial = ✂️ 部分引用
qs-partial-framed = 枠あり
qs-partial-plain = 枠なし
qs-partial-off = メッセージ全体
qs-row-color = 🎨 色
qs-color-title =
    <b>🎨 背景</b>

    色を選ぶか、<code>/qcolor #ff5733</code> でカスタム色を設定してください。
qs-row-brand = 😀 絵文字スタイル
qs-row-format = 🖥 形式
qs-format-sticker = ステッカー
qs-format-image = 画像
qs-format-png = PNG ファイル
qs-row-gab = 🔁 自動引用
qs-gab-off = オフ
qs-gab-often = 頻繁
qs-gab-sometimes = ときどき
qs-gab-rarely = まれに
qs-row-suffix = 💟 ステッカーの絵文字
qs-row-media = 📎 メディア
qs-row-reply = 💬 返信を表示
qs-row-crop = 🖼 メディアを切り抜き
qs-row-sendertag = 🏷 投稿者の役職
qs-row-privacy = 🔒 プライバシー
qs-row-hidden = 🕵 送信者検索
qs-row-rate = ⭐ 評価
qs-row-archive = 🗂 テキストアーカイブ
qs-suffix-title =
    <b>💟 ステッカーの絵文字</b>

    下から選ぶか、<code>/qemoji 🔥</code> でカスタム絵文字を設定してください。
qs-btn-reset = ↩️ すべてリセット
qs-reset-done = デフォルトにリセットしました
menu-features-title =
    <b>✨ 何ができますか？</b>
    機能をタップして詳細を確認:
menu-features-btn-basics = 📱 基本
menu-features-btn-colors = 🎨 色とスタイル
menu-features-btn-media = 🖼 メディア
menu-features-btn-group = 👥 グループ機能
menu-features-basics-title =
    <b>📱 基本的な引用</b>

    <b>グループで:</b>
    任意のメッセージに<code>/q</code>で返信

    <b>プライベートで:</b>
    メッセージを私に転送

    <b>複数のメッセージ:</b>
    <code>/q 3</code> — 返信したメッセージ + 下に2つ
    <code>/q -3</code> — 返信したメッセージ + 上に2つ
menu-features-colors-title =
    <b>🎨 色とスタイル</b>

    <b>基本色:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>カスタム色:</b>
    <code>/q #ff69b4</code>

    <b>ランダム色:</b>
    <code>/q random</code>

    <b>グラデーション:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 メディアオプション</b>

    <b>メディアを含める:</b>
    <code>/q m</code> または <code>/q media</code>

    <b>メディアをクロップ:</b>
    <code>/q c</code> または <code>/q crop</code>

    <b>返信を表示:</b>
    <code>/q r</code> または <code>/q reply</code>

    <b>画像として:</b>
    <code>/q img</code> または <code>/q png</code>
menu-features-group-title =
    <b>👥 グループ機能</b>

    <b>管理者向け:</b>
    • <code>/qcolor blue</code> — デフォルト色
    • <code>/qrate</code> — 評価を有効化
    • <code>/qs</code> — ステッカーパックに保存

    <b>全員向け:</b>
    • <code>/qtop</code> — トップ引用
    • <code>/qrand</code> — ランダム引用
menu-settings-title =
    <b>⚙️ 設定</b>
    設定を管理:
menu-settings-btn-privacy = 🔒 プライバシー
aimode-title = 🤖 <b>AIモード</b>
aimode-current = 現在のモード: { $mode }
aimode-available = <b>利用可能なモード:</b>
aimode-unknown = ❌ 不明なモード: <code>{ $mode }</code>
aimode-available_list = 利用可能: { $modes }
aimode-success = ✅ AIモードを次に変更しました: { $mode }
aimode-error = ❌ 設定の保存に失敗しました
aimode-modes-sarcastic-name = 😏 皮肉屋
aimode-modes-sarcastic-description = ブラックユーモアを交えた皮肉で機知に富んだコメント
aimode-modes-philosopher-name = 🧠 哲学者
aimode-modes-philosopher-description = 深い思索と哲学的な考察
aimode-modes-comedian-name = 😂 コメディアン
aimode-modes-comedian-description = 面白い冗談とコミカルなコメント
aimode-modes-poet-name = 📝 詩人
aimode-modes-poet-description = 詩的な一節と美しい比喩
aimode-modes-motivator-name = 💪 モチベーター
aimode-modes-motivator-description = やる気を起こさせ、心を奮い立たせるメッセージ
aimode-modes-conspiracy-name = 🕵️ 陰謀論者
aimode-modes-conspiracy-description = 陰謀論と疑わしいコメント
aimode-modes-critic-name = 🎭 批評家
aimode-modes-critic-description = あらゆるものへの批判的なレビューと評価
aimode-modes-boomer-name = 👴 ブーマー
aimode-modes-boomer-description = 年配世代による古風なコメント
aimode-modes-zoomer-name = 😎 ズーマー
aimode-modes-zoomer-description = 若者のスラングと流行りのフレーズ
aimode-modes-academic-name = 🎓 学者
aimode-modes-academic-description = 科学的事実と学術的なコメント
aimode-modes-memer-name = 🐸 ミーマー
aimode-modes-memer-description = ミームのフレーズとインターネット文化
app-open_quote = ✨ 引用を開く
app-open_group = 📚 グループ内のすべての引用
app-open_root = 💫 マイグループ
app-info =
    <b>すべてはアプリの中にもあります 💬</b>

    引用をめくり、アーカイブを掘り下げ、トップを追いかける — ワンタップで。ボタンを押してください ↓
menu-settings-btn-color = 🎨 デフォルトの色
menu-settings-btn-emoji_style = 😊 絵文字スタイル
menu-settings-btn-back = ← 戻る
quick_action-remake = 🔄
quick_action-tooltip-remake = 別のスタイルで作り直す
qarchive-on = ✅ 引用テキストのアーカイブが<b>有効</b>になりました。新しい引用はテキストと作成者とともに保存されます。
qarchive-off = ⏸ 引用テキストのアーカイブが<b>無効</b>になりました。新しい引用はステッカーと評価のみを保存します。
qarchive-status_on =
    現在の状態: <b>有効</b>。

    <code>/qarchive off</code> — 無効にする
qarchive-status_off =
    現在の状態: <b>無効</b>。

    <code>/qarchive on</code> — 有効にする
qarchive-usage =
    このグループの引用テキストアーカイブを切り替えます。

    <code>/qarchive on</code> または <code>/qarchive off</code>
qforget-usage = 引用番号を指定してください: <code>/qforget 142</code>
qforget-not_found = 引用 #{ $local } はこのグループで見つかりませんでした。
qforget-not_author = 引用の作成者のみが忘れさせることができます。
qforget-forgotten = ✅ 引用 #{ $local } を忘れました。ステッカーと投票は残りますが、テキストと作成者はアーカイブから削除されます。
qforget-already_forgotten = 引用 #{ $local } はすでに忘れられています。
qforget-not_yet_archived = 引用 #{ $local } にはテキストがありません（アーカイブ導入前に作成されました）。
guest-hint =
    <b>Quotly — ゲストモード 💬</b>

    チャットのメンバーで<i>なくても</i>、どんなメッセージからでも引用ステッカーを作れます。

    <b>使い方:</b>
    1. 引用したいメッセージに返信する
    2. 返信の中に <code>@{ $username }</code> と書く
    3. 完了 — チャットに引用ステッカーを直接送ります

    <b>オプション引数（/q と同じ）:</b>
    • <code>@{ $username } r</code> — 返信先のメッセージを含める
    • <code>@{ $username } red</code> — 背景色を設定する
    • <code>@{ $username } rate</code> — 👍 / 👎 ボタンを追加する
    • <code>@{ $username } p</code> — PNGとしてレンダリングする

    フル機能を体験するにはPMで開いてください。
guest-hint_short = ゲストモードでのQuotlyの使い方
guest-need_reply =
    <b>あと少し！🪄</b>

    引用を作るには引用するメッセージが必要です — メッセージに返信して <code>@{ $username }</code> とメンションしてください。

    例: メッセージの「返信」をタップ → <code>@{ $username }</code> と入力 → 送信。
guest-need_reply_short = メッセージに返信してボットをメンションしてください
guest-empty_query =
    <b>Quotlyです 💜</b>

    このチャットの任意のメッセージに返信して <code>@{ $username }</code> とメンションすると、引用ステッカーに変わります。

    フル機能を使うには下をタップしてPMで開いてください。
guest-open_in_pm = Quotlyで開く →
sticker-save-error-too_large = 画像が大きすぎます（最大 2048×2048）。もっと小さいものを試してください 📐

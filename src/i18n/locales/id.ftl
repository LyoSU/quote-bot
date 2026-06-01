# Auto-generated from locales/id.yaml — do not edit by hand.
# Regenerate: node scripts/convert-locales-to-ftl.cjs id

language_name = 🇮🇩 Indonesia
description-short =
    Ubah pesan apapun menjadi stiker kutipan indah! ✨
    Balas dengan /q atau teruskan pesan ke saya
description-long =
    Buat stiker kutipan memukau dan simpan momen obrolan favoritmu! ✨

    Cukup balas /q ke pesan apapun atau teruskan ke saya. Sempurna untuk menyimpan:
    🌟 Sorotan dan kenangan obrolan terbaik
    💭 Pemikiran dan percakapan yang menginspirasi
    🎨 Pesan kreatif dengan gaya kustom
    ✍️ Catatan penting dalam format indah

    Mulai sekarang - cukup teruskan pesan atau gunakan /q!
start =
    <b>Hai! 👋 Saya QuotLyBot</b>

    Saya mengubah pesan obrolan biasa menjadi stiker kutipan yang menakjubkan. Sederhana, kreatif, dan menyenangkan untuk digunakan!

    ✨ <b>Siap untuk membuat kutipan pertama Anda?</b>
    <b>Di obrolan pribadi:</b> Teruskan pesan apa pun kepada saya (Anda bahkan dapat memilih beberapa sekaligus!)
    <b>Di grup:</b> Tambahkan saya ke grup Anda dan balas dengan <code>/q</code> ke pesan apa pun

    Ingin mengubah warna, gaya, dan lainnya? Ketik /help saat Anda siap untuk menemukan semua kemungkinan kreatif! 🎨
help =
    <b>✨ QuotLyBot: Kutipan Cepat & Mudah! ✨</b>

    Ubah pesan menjadi kutipan bergaya di Telegram. Begini caranya:

    📱 <b>Dasar Kutipan</b>

    • Balas & Kutip: Balas pesan dan ketik <code>/q</code> untuk mengutipnya.
    • Kutip Beberapa: Balas pesan pertama dari beberapa pesan, ketik <code>/q [nomor]</code> (misalnya, <code>/q 3</code>) untuk mengutip beberapa pesan.
    • Teruskan & Kutip: Teruskan pesan ke bot untuk mengutipnya langsung.

    🎨 <b>Kustomisasi Kutipan Anda</b>

    • Warna:
        • Dasar: <code>/q red</code> (atau blue, green, dll.)
        • Kustom: <code>/q #[kode warna hex]</code> (misalnya, <code>/q #cbafff</code>)
        • Acak: <code>/q random</code>
    • Media: Sertakan gambar/video dari pesan yang dikutip dengan <code>/q m</code> atau <code>/q media</code>
        • Potong Media: Gunakan <code>/q c</code> atau <code>/q crop</code> untuk memotong media.
    • Pertahankan Balasan: Tampilkan pesan yang dibalas dengan <code>/q r</code> atau <code>/q reply</code>
    • Format Gambar: Gunakan <code>/q i</code> atau <code>/q img</code> atau <code>/q p</code> atau <code>/q png</code> untuk kutipan gambar (alih-alih stiker).

    💡 <b>Kombinasi Keren</b>

    • Kutipan putih dengan balasan: <code>/q white rp</code>
    • Gambar merah berkualitas tinggi: <code>/q i red s3.2</code>
    • Kutipan dengan media & balasan: <code>/q r #cbafff m</code>

    ⚙️ <b>Opsi Lainnya</b>

    • Nilai Kutipan: <code>/q rate</code> (jika diaktifkan dalam grup)
    • Kutipan Acak: <code>/qrand</code> (jika diaktifkan dalam grup)
    • Kutipan Teratas: <code>/qtop</code> (jika diaktifkan dalam grup)
    • Ubah Bahasa: <code>/lang</code>

    🎯 <b>Pengaturan Admin Grup</b> (hanya untuk admin grup)

    • Warna Default: <code>/qcolor [color]</code>
    • Aktifkan Penilaian: <code>/qrate</code>
    • Simpan ke Paket Stiker: <code>/qs [emoji]</code>
    • Hapus Stiker: <code>/qd</code> (balas ke stiker)
    • Frekuensi Kutipan Acak: <code>/qgab [nomor]</code>
    • Ubah Akhiran Emoji: <code>/qemoji</code> (ubah akhiran emoji stiker)
    • Gaya Emoji:
        • Klasik: <code>/qb apple</code>, <code>/qb google</code>
        • Alt: <code>/qb twitter</code>, <code>/qb joypixels</code>
        • Retro: <code>/qb blob</code>

    📱 <b>Perlu Bantuan?</b>

    • Blog: <a href="https://t.me/LyBlog">@LyBlog</a>
    • GitHub: <a href="https://github.com/LyoSU/quote-bot">github.com/LyoSU/quote-bot</a>
    • Dukungan: <code>/donate</code>
help_group =
    <b>Halo! 👋</b>
    Saya akan membuat kutipan indah di grup ini - cukup gunakan <code>/q</code> untuk membalas pesan apapun!

    Pelajari semua fitur saya secara pribadi: <a href="t.me/{ $username }?start=help">Dapatkan Bantuan</a> ✨
btn-add_group = Tambahkan ke Grup
btn-help = Bantuan
quote-unsupported_message = Jenis pesan ini tidak didukung untuk kutipan
quote-api_error =
    <b>Ups! Ada yang salah 😅</b>
    <pre>{ $error }</pre>
    Silakan coba lagi sebentar lagi!
quote-empty_forward = Silakan balas atau teruskan pesan yang ingin Anda kutip ✨
quote-set_background_color = <b>Sempurna!</b> Latar belakang kutipan diubah menjadi: <code>{ $backgroundColor }</code> 🎨
quote-set_emoji_brand = <b>Selesai!</b> Gaya emoji diubah menjadi: <code>{ $emojiBrand }</code> ✨
quote-errors-api_down =
    😕 Layanan kutipan kami sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.

    Jika masalah terus berlanjut, periksa @LyBlog untuk pembaruan.
quote-errors-rate_limit = ⏳ Terlalu banyak permintaan! Harap tunggu { $seconds } detik sebelum membuat kutipan lain.
quote-errors-file_too_large = 📸 File media terlalu besar (maks 5MB). Coba gunakan gambar atau video yang lebih kecil.
quote-errors-invalid_format =
    ❌ Format file tidak didukung. Saya mendukung:
    • Gambar (JPG, PNG, WEBP)
    • Video (MP4)
    • Stiker
    • Pesan teks
quote-errors-telegram_error =
    ⚠️ Kesalahan Telegram: { $error }

    Ini biasanya terjadi ketika:
    • File terlalu besar
    • Paket stiker penuh
    • Bot tidak memiliki izin
quote-errors-generic_error =
    😅 Ups! Terjadi kesalahan:
    <code>{ $error }</code>

    Silakan coba lagi atau laporkan ke @Ly_oBot jika masalah berlanjut.
quote-errors-no_rights_send_documents =
    🚫 <b>Kesalahan Izin</b>
    Saya tidak memiliki izin untuk mengirim dokumen dalam obrolan ini.

    <b>Untuk memperbaikinya:</b>
    • Admin grup: Berikan saya izin "Kirim dokumen"
    • Obrolan pribadi: Pastikan Anda belum memblokir bot ini
quote-errors-no_rights_send_stickers =
    🚫 <b>Kesalahan Izin</b>
    Saya tidak memiliki izin untuk mengirim stiker dalam obrolan ini.

    <b>Untuk memperbaikinya:</b>
    • Admin grup: Berikan saya izin "Kirim stiker"
    • Coba gunakan <code>/q img</code> untuk format gambar sebagai alternatif
quote-errors-no_rights_send_photos =
    🚫 <b>Kesalahan Izin</b>
    Saya tidak memiliki izin untuk mengirim foto dalam obrolan ini.

    <b>Untuk memperbaikinya:</b>
    • Admin grup: Berikan saya izin "Kirim foto"
    • Coba gunakan <code>/q</code> untuk format stiker sebagai alternatif
quote-errors-chat_write_forbidden =
    🚫 <b>Chat Dibatasi</b>
    Saya tidak bisa mengirim pesan dalam obrolan ini.

    <b>Alasan yang mungkin:</b>
    • Anda telah memblokir bot
    • Grup telah membatasi bot
    • Saya telah dihapus dari grup
quote-errors-sticker_set_invalid =
    🔄 <b>Masalah Paket Stiker</b>
    Ada masalah dengan paket stiker. Membuat kutipan baru...
quote-errors-sticker_set_full =
    📦 <b>Paket Stiker Penuh</b>
    Paket stiker telah mencapai batasnya. Kutipan Anda akan dikirim sebagai stiker biasa.
quote-errors-bot_blocked =
    🚫 <b>Bot Diblokir</b>
    Anda telah memblokir bot ini. Silakan buka blokir agar dapat menerima kutipan.
quote-errors-user_deactivated =
    👤 <b>Masalah Akun</b>
    Akun pengguna target dinonaktifkan atau dihapus.
quote-errors-message_too_long =
    📝 <b>Pesan Terlalu Panjang</b>
    Pesan yang dikutip terlalu panjang. Coba kutip lebih sedikit pesan atau teks yang lebih pendek.
quote-errors-network_error =
    🌐 <b>Kesalahan Jaringan</b>
    Terjadi masalah koneksi. Silakan coba lagi sebentar lagi.
quote-errors-timeout_error =
    ⏱️ <b>Kesalahan Timeout</b>
    Permintaan terlalu lama. Silakan coba lagi dengan kutipan yang lebih sederhana.
quote-image_to_quote-processing = 🔍 Menganalisis gambar dan mengekstrak teks...
quote-image_to_quote-success =
    ✅ Kutipan dibuat dari { $count } pesan!

    💡 <b>Tip:</b> Kirim tangkapan layar dengan deskripsi <code>/qi</code> atau <code>/quote_image</code> untuk membuat kutipan
quote-image_to_quote-errors-no_image = ❌ Silakan kirim file gambar (JPG, PNG, WebP)
quote-image_to_quote-errors-file_too_large = ❌ Gambar terlalu besar. Ukuran maksimum: 20MB
quote-image_to_quote-errors-unsupported_format = ❌ Format gambar tidak didukung. Yang didukung: JPG, PNG, WebP
quote-image_to_quote-errors-no_text_found = ❌ Tidak bisa menemukan pesan obrolan yang dapat dibaca dalam gambar. Pastikan itu adalah tangkapan layar percakapan yang jelas.
quote-image_to_quote-errors-parse_error = ❌ Kesalahan pengenalan. Mungkin gambar tidak berisi teks percakapan yang jelas.
quote-image_to_quote-errors-api_error = ❌ Kesalahan pengenalan teks. Silakan coba lagi.
quote-image_to_quote-errors-rate_limit = ⏳ Terlalu banyak permintaan! Silakan tunggu { $seconds } detik sebelum mencoba lagi.
sticker-save-suc = Stiker telah berhasil ditambahkan ke <a href="{ $link }">paket stiker grup</a> ✨
sticker-save-error-animated = Maaf, saya belum bisa menyimpan stiker animasi 😅
sticker-save-error-need_creator = <b>Hampir selesai!</b> { $creator } harus mengirimkan pesan kepada saya terlebih dahulu untuk menyimpan stiker
sticker-save-error-telegram = <b>Ups!</b> Ada yang salah:\n<pre>{ $error }</pre>
sticker-delete-suc = Dihapus dari <a href="{ $link }">paket stiker grup</a> Anda 🗑
sticker-delete-empty_reply = Silakan balas stiker yang ingin Anda hapus 🗑
sticker-delete-error-telegram =
    <b>Gagal menghapus stiker 😕</b>
    { $reason }
sticker-delete-error-not_found = Stiker tidak ada lagi di dalam paket 🤔
sticker-delete-error-rights = Saya tidak memiliki izin untuk menghapus stiker ini 🔒
sticker-delete-error-generic =
    Ada yang salah. Silakan coba lagi nanti ⚠️

    <code>{ $error }</code>
sticker-delete_random-suc = Dihapus dari koleksi acak 🗑
sticker-delete_random-error =
    <b>Gagal menghapus kutipan 😕</b>
    { $error }
sticker-delete_random-not_found = Kutipan ini tidak ada dalam database 🤔
sticker-empty_forward = Silakan balas pada stiker, foto, atau gambar yang ingin Anda simpan ✨
sticker-fstik = Untuk menyimpan di paket stiker pribadi Anda, teruskan ke @fStikBot 🎨
rate-vote-rated = Anda { $rateName } ini
rate-vote-back = Suara Anda telah dihapus
rate-settings-enable = Evaluasi untuk kutipan disertakan
rate-settings-disable = Evaluasi kutipan telah dinonaktifkan
random-empty = Belum ada kutipan dengan penilaian tinggi di grup ini! Mulailah menilai kutipan
random-gab = Frekuensi kutipan acak diatur ke { $gab } ✨
hidden-settings-enable = Pencarian pengirim diaktifkan. 🔍
hidden-settings-disable = Pencarian pengirim dinonaktifkan. 🔄
privacy-settings-enable = Mode privasi diaktifkan 🔒 Info Anda akan disembunyikan dalam kutipan
privacy-settings-disable = Mode privasi dinonaktifkan 🔓
top-info = <b>✨ Pesan Kutipan Teratas</b>
top-open = Lihat Kutipan Teratas
donate-info =
    <b>Dukung Pengembangan QuotLyBot! ☕</b>

    Dukungan Anda membantu kami:
    • Menjaga server berjalan 24/7
    • Menambah fitur dan gaya baru
    • Meningkatkan kualitas kutipan
    • Membuat bot lebih cepat

    <b>💳 Opsi Pembayaran Mudah</b>
    • <a href="https://send.monobank.ua/jar/2fpLioJzU8">Pembayaran Kartu</a> (Visa/Mastercard)
    • Apple Pay / Google Pay

    <b>🔒 Cryptocurrency (untuk pengguna melek teknologi)</b>
    • BTC: <code>17QaN4wPZFaH4qtsgDdTaYwiW9s9PUcHj7</code>
    • ETH/BUSD: <code>0x34007b75775F8DAe005A407141617aA2fBa2740c</code>

    Setiap kontribusi membantu membuat QuotLyBot lebih baik untuk semua! 💜
donate-title = Dukungan { $botUsername }
donate-description = Bantu agar keajaiban terus berlangsung ✨
donate-successful =
    <b>Terima kasih atas dukungan Anda! 💜</b>
    Anda telah membantu membuat QuotLyBot menjadi lebih baik!
donate-pay = 💜 Bayar Telegram
donate-other = Sebaliknya
emoji-info =
    <b>Pilih Emoji Kutipan Anda!</b>

    • Atur emoji kustom: <code>/qemoji</code>💜
    • Gunakan emoji acak: <code>/qemoji random</code>
    • Hapus emoji: <code>/qemoji clear</code>

    Emoji Anda akan ditambahkan ke semua kutipan baru ✨
emoji-done = Gaya emoji diperbarui! ✨
only_admin =
    <b>⚠️ Akses Admin Diperlukan</b>
    Perintah ini hanya bisa digunakan oleh administrator grup.
only_group =
    <b>⚠️ Perintah Grup</b>
    Fitur ini hanya berfungsi di obrolan grup.
rate_limit =
    <i>Istirahat sejenak...</i> Anda dapat menggunakan perintah ini lagi dalam { $seconds } detik ⏳

    <i>Tip pro: Sambil menunggu, coba kustomisasi kutipan terakhir Anda dengan </i><code>/q color</code> <i>atau</i> <code>/q media</code>
menu-title =
    <b>🎨 QuotLyBot</b>
    Ubah pesan menjadi stiker kutipan yang menakjubkan!
menu-btn-features = ✨ Fitur
menu-btn-settings = ⚙️ Pengaturan
menu-btn-help = 📚 Perintah
menu-btn-language = 🌍 Bahasa
menu-btn-back = ← Kembali
menu-btn-add_group = ➕ Tambahkan ke Grup
menu-features-title =
    <b>✨ Apa yang bisa saya lakukan?</b>
    Ketuk fitur untuk mempelajari lebih lanjut:
menu-features-btn-basics = 📱 Dasar
menu-features-btn-colors = 🎨 Warna & Gaya
menu-features-btn-media = 🖼 Media
menu-features-btn-group = 👥 Fitur Grup
menu-features-basics-title =
    <b>📱 Dasar Kutipan</b>

    <b>Di grup:</b>
    Balas pesan apa pun dengan <code>/q</code>

    <b>Di privat:</b>
    Teruskan pesan kepada saya

    <b>Banyak pesan:</b>
    <code>/q 3</code> — pesan yang dibalas + di bawah
    <code>/q -3</code> — pesan yang dibalas + di atas
menu-features-colors-title =
    <b>🎨 Warna & Gaya</b>

    <b>Warna dasar:</b>
    <code>/q red</code>, <code>/q blue</code>, <code>/q green</code>

    <b>Warna kustom:</b>
    <code>/q #ff69b4</code>

    <b>Warna acak:</b>
    <code>/q random</code>

    <b>Gradien:</b>
    <code>/q red//blue</code>
menu-features-media-title =
    <b>🖼 Opsi Media</b>

    <b>Sertakan media:</b>
    <code>/q m</code> atau <code>/q media</code>

    <b>Potong media:</b>
    <code>/q c</code> atau <code>/q crop</code>

    <b>Tampilkan balasan:</b>
    <code>/q r</code> atau <code>/q reply</code>

    <b>Sebagai gambar:</b>
    <code>/q img</code> atau <code>/q png</code>
menu-features-group-title =
    <b>👥 Fitur Grup</b>

    <b>Untuk admin:</b>
    • <code>/qcolor blue</code> — warna default
    • <code>/qrate</code> — aktifkan rating
    • <code>/qs</code> — simpan ke paket stiker

    <b>Untuk semua:</b>
    • <code>/qtop</code> — kutipan teratas
    • <code>/qrand</code> — kutipan acak
menu-settings-title =
    <b>⚙️ Pengaturan</b>
    Kelola preferensi Anda:
menu-settings-btn-privacy = 🔒 Privasi
menu-settings-btn-language = 🌍 Bahasa
menu-help-title =
    <b>📚 Perintah</b>

    <b>Dasar:</b>
    • <code>/q</code> — buat kutipan
    • <code>/lang</code> — ubah bahasa
    • <code>/donate</code> — dukung pengembangan

    <b>Untuk admin:</b>
    • <code>/qcolor</code> — warna default
    • <code>/qrate</code> — aktifkan rating
    • <code>/qb</code> — gaya emoji
onboarding-welcome-title =
    <b>Hai! 👋</b>

    Saya mengubah pesan obrolan biasa menjadi stiker kutipan yang menakjubkan.

    ✨ <b>Biar saya tunjukkan cara kerjanya!</b>
onboarding-welcome-btn-start = Ayo Mulai! →
onboarding-welcome-btn-skip = Lewati Tutorial
onboarding-step1-title =
    <b>Langkah 1: Teruskan pesan</b>

    Teruskan pesan obrolan apa pun kepada saya sekarang.

    💡 <i>Tips: Anda bisa meneruskan beberapa pesan sekaligus!</i>
onboarding-step2-title =
    <b>Hebat! Ini kutipan Anda! ✨</b>

    Di grup, cukup gunakan <code>/q</code> untuk membalas pesan apa pun.
onboarding-step2-btn-complete = Mengerti! ✓
onboarding-complete-title =
    <b>Anda siap! 🎉</b>

    Sekarang Anda tahu dasarnya. Jelajahi menu untuk menemukan lebih banyak fitur!

aimode-title = 🤖 <b>Mode AI</b>
aimode-current = Mode saat ini: { $mode }
aimode-available = <b>Mode yang tersedia:</b>
aimode-unknown = ❌ Mode tidak dikenal: <code>{ $mode }</code>
aimode-available_list = Tersedia: { $modes }
aimode-success = ✅ Mode AI diubah menjadi: { $mode }
aimode-error = ❌ Gagal menyimpan pengaturan
aimode-modes-sarcastic-name = 😏 Sarkastis
aimode-modes-sarcastic-description = Komentar sarkastis dan jenaka dengan humor gelap
aimode-modes-philosopher-name = 🧠 Filsuf
aimode-modes-philosopher-description = Pemikiran mendalam dan refleksi filosofis
aimode-modes-comedian-name = 😂 Komedian
aimode-modes-comedian-description = Lelucon lucu dan komentar jenaka
aimode-modes-poet-name = 📝 Penyair
aimode-modes-poet-description = Bait puitis dan metafora yang indah
aimode-modes-motivator-name = 💪 Motivator
aimode-modes-motivator-description = Pesan yang memotivasi dan menginspirasi
aimode-modes-conspiracy-name = 🕵️ Teoris Konspirasi
aimode-modes-conspiracy-description = Teori konspirasi dan komentar yang mencurigakan
aimode-modes-critic-name = 🎭 Kritikus
aimode-modes-critic-description = Ulasan kritis dan penilaian untuk segala hal
aimode-modes-boomer-name = 👴 Boomer
aimode-modes-boomer-description = Komentar gaya lama dari generasi tua
aimode-modes-zoomer-name = 😎 Zoomer
aimode-modes-zoomer-description = Bahasa gaul anak muda dan frasa kekinian
aimode-modes-academic-name = 🎓 Akademis
aimode-modes-academic-description = Fakta ilmiah dan komentar akademis
aimode-modes-memer-name = 🐸 Memer
aimode-modes-memer-description = Frasa meme dan budaya internet
app-open_quote = ✨ Buka kutipan
app-open_group = 📚 Semua kutipan di grup
app-open_root = 💫 Grup saya
app-info =
    <b>Semuanya juga ada di aplikasi 💬</b>

    Telusuri kutipan, gali arsip, kejar yang teratas — hanya satu ketukan. Tekan tombol ↓
menu-settings-btn-color = 🎨 Warna Default
menu-settings-btn-emoji_style = 😊 Gaya Emoji
menu-settings-btn-back = ← Kembali
onboarding-step1-waiting =
    Menunggu pesan Anda...
    Cukup teruskan sesuatu dari obrolan mana pun!
onboarding-step2-btn-menu = Buka Menu
onboarding-step2-btn-add_group = Tambahkan ke Grup
quick_action-remake = 🔄
quick_action-tooltip-remake = Buat ulang dengan gaya berbeda
qarchive-on = ✅ Arsip teks kutipan <b>aktif</b>. Kutipan baru akan disimpan beserta teks dan penulisnya.
qarchive-off = ⏸ Arsip teks kutipan <b>nonaktif</b>. Kutipan baru hanya akan menyimpan stiker dan penilaian.
qarchive-status_on =
    Keadaan saat ini: <b>aktif</b>.

    <code>/qarchive off</code> — nonaktifkan
qarchive-status_off =
    Keadaan saat ini: <b>nonaktif</b>.

    <code>/qarchive on</code> — aktifkan
qarchive-usage =
    Alihkan arsip teks kutipan untuk grup ini.

    <code>/qarchive on</code> atau <code>/qarchive off</code>
qforget-usage = Tentukan nomor kutipan: <code>/qforget 142</code>
qforget-not_found = Kutipan #{ $local } tidak ditemukan di grup ini.
qforget-not_author = Hanya penulis kutipan yang dapat melupakannya.
qforget-forgotten = ✅ Kutipan #{ $local } dilupakan. Stiker dan suara tetap ada, tetapi teks dan penulis dihapus dari arsip.
qforget-already_forgotten = Kutipan #{ $local } sudah dilupakan.
qforget-not_yet_archived = Kutipan #{ $local } tidak memiliki teks (dibuat sebelum arsip ada).
guest-hint =
    <b>Quotly — mode tamu 💬</b>

    Saya dapat membuat stiker kutipan dari pesan apa pun <i>tanpa</i> menjadi anggota obrolan.

    <b>Cara penggunaan:</b>
    1. Balas pesan yang ingin Anda kutip
    2. Dalam balasan Anda tulis <code>@{ $username }</code>
    3. Selesai — saya akan mengirim stiker kutipan langsung di obrolan

    <b>Argumen opsional (sama seperti /q):</b>
    • <code>@{ $username } r</code> — sertakan pesan yang saya balas
    • <code>@{ $username } red</code> — atur warna latar belakang
    • <code>@{ $username } rate</code> — tambahkan tombol 👍 / 👎
    • <code>@{ $username } p</code> — render sebagai PNG

    Untuk pengalaman penuh, buka saya di PM.
guest-hint_short = Cara kerja Quotly dalam mode tamu
guest-need_reply =
    <b>Hampir selesai! 🪄</b>

    Untuk membuat kutipan saya perlu pesan untuk dikutip — balas salah satu dan sebut <code>@{ $username }</code>.

    Contoh: ketuk "Balas" pada sebuah pesan → ketik <code>@{ $username }</code> → kirim.
guest-need_reply_short = Balas pesan dan sebut bot
guest-empty_query =
    <b>Quotly di sini 💜</b>

    Balas pesan apa pun di obrolan ini dan sebut <code>@{ $username }</code> untuk mengubahnya menjadi stiker kutipan.

    Ketuk di bawah untuk membuka saya di PM demi set fitur lengkap.
guest-open_in_pm = Buka di Quotly →
sticker-save-error-too_large = Gambar terlalu besar (maks 2048×2048). Coba yang lebih kecil 📐

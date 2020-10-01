# quote-bot
Telegram quote bot

[![time tracker](https://wakatime.com/badge/github/LyoSU/quote-bot.svg)](https://wakatime.com/badge/github/LyoSU/quote-bot)


# Docker installation
1) Pull this repo

2) Pull [quote_api](https://github.com/LyoSU/quote-api)

3) Edit both `.env` files in repos

4) Create network `docker network create quotly`

5) Compile/Download tdlib for linux and place it to `helpers/tdlib/data/libtdjson/libtdjson.so`. To make it easier, check out [this builder](https://github.com/vlakam/tdlib.native) or [this AppVeyor CI](https://ci.appveyor.com/project/vlakam/tdlib-native) (ubuntu > Artifacts > linux)

6) `docker-compose up -d` on both repos

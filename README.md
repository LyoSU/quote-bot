# QuotLy Bot 💬✨

A powerful Telegram bot that creates beautiful quote stickers from chat messages with AI-powered features.

[![time tracker](https://wakatime.com/badge/github/LyoSU/quote-bot.svg)](https://wakatime.com/badge/github/LyoSU/quote-bot)

## Features 🚀

### Core Quote Generation
- **Beautiful Quote Stickers**: Convert messages into stylish quote stickers
- **Multiple Formats**: WebP stickers, PNG images, or document files
- **Customizable Design**: Custom background colors, emoji brands, and scaling
- **Privacy Protection**: Optional user anonymization

### Advanced Features
- **High Performance**: Cluster architecture with load balancing
- **Rate Limiting**: Smart rate limiting to prevent spam
- **Health Monitoring**: Built-in health checks and monitoring
- **Business API**: Support for Telegram Business connections
- **Inline Queries**: Works in inline mode
- **Statistics**: Usage tracking and analytics

## Installation 📦

### Prerequisites
- Node.js 16+
- MongoDB database
- [quote-api](https://github.com/LyoSU/quote-api) service
- TDLib binary

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/LyoSU/quote-bot.git
   cd quote-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up TDLib**
   - Download TDLib binary for your platform
   - Place it at `helpers/tdlib/data/libtdjson.so` (Linux) or `helpers/tdlib/data/libtdjson.dylib` (macOS)
   - Or use the prebuilt-tdlib npm package

5. **Start the bot**
   ```bash
   npm start
   ```

### Docker Installation 🐳

1. **Pull repositories**
   ```bash
   git clone https://github.com/LyoSU/quote-bot.git
   git clone https://github.com/LyoSU/quote-api.git
   ```

2. **Configure environment**
   - Edit `.env` files in both repositories
   - Set up your bot token, database, and API keys

3. **Create Docker network**
   ```bash
   docker network create quotly
   ```

4. **Set up TDLib**
   - Download TDLib binary for Linux
   - Place it at `helpers/tdlib/data/libtdjson/libtdjson.so`
   - Recommended: Use [prebuilt-tdlib](https://npmjs.com/package/prebuilt-tdlib) or [tdlib.native builder](https://github.com/vlakam/tdlib.native)

5. **Start services**
   ```bash
   # Start quote-bot
   cd quote-bot
   docker compose --profile dev up -d

   # Start quote-api
   cd ../quote-api
   docker compose up -d
   ```

## Configuration ⚙️

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Telegram bot token from @BotFather | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `QUOTE_API_URI` | Quote generation API endpoint | Yes |
| `OPENAI_API_KEY` | OpenRouter API key for AI features | No |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | No |
| `MAX_WORKERS` | Number of worker processes | No |
| `WORKER_HANDLER_TIMEOUT` | Worker timeout in milliseconds | No |

### Database Setup
- MongoDB is required for storing user data, quotes, and statistics
- The bot will automatically create necessary collections and indexes

## Usage 📖

### Basic Commands

- `/q` - Create a quote from replied message
- `/q <number>` - Create quote from multiple messages
- `/q <text>` - AI-powered message search and quote creation
- `/qrand` - Random quote from chat history
- `/qtop` - Top-rated quotes
- `/help` - Show help message

### Quote Options

- `/q p` - Generate as PNG image
- `/q i` - Generate as image file
- `/q r` - Include reply context
- `/q rate` - Enable rating buttons
- `/q <color>` - Set custom background color
- `/q s1.5` - Scale factor (1.5x larger)
- `/q c` - Crop image content

### AI Features

- `/q * <query>` - AI-powered message selection
- Example: `/q * funny moments` - Find and quote funny messages
- Example: `/q * jokes from John` - Find jokes from specific user

### Admin Commands

- `/qcolor <color>` - Set default background color
- `/qemoji` - Change emoji brand
- `/qrate` - Enable/disable rating system
- `/privacy` - Toggle privacy mode
- `/lang` - Change language

## Architecture 🏗️

The bot uses a sophisticated cluster architecture:

### Master-Worker Pattern
- **Master Process**: Handles load balancing, queue management, and TDLib operations
- **Worker Processes**: Process individual Telegram updates
- **Queue Manager**: Manages update queues with priority handling

### Key Components
- **Quote Generation**: External API service for image generation
- **AI Integration**: OpenAI/Anthropic APIs for smart features
- **Database Layer**: MongoDB with Mongoose ODM
- **Health Monitoring**: Circuit breaker pattern and health checks

## Development 👨‍💻

### Running in Development
```bash
npm start
```

### Code Quality
```bash
# Lint code
npx eslint .

# Check for issues
npm audit
```

### Adding Features
1. Create handlers in `handlers/` directory
2. Add database models in `database/models/`
3. Implement middleware in `middlewares/`
4. Add utilities in `utils/`

### Project Structure
```
quote-bot/
├── handlers/          # Command and message handlers
├── database/          # Database models and connection
├── middlewares/       # Bot middleware
├── helpers/           # Utility functions and TDLib
├── locales/           # Internationalization files
├── utils/             # General utilities
├── master.js          # Master process (cluster mode)
├── worker.js          # Worker processes
├── bot.js             # Main bot instance
└── index.js           # Entry point
```

## API Integration 🔗

The bot requires the [quote-api](https://github.com/LyoSU/quote-api) service for quote generation. This service handles:
- Quote image rendering
- Custom styling and themes
- Multiple output formats
- Image processing and optimization

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- [Telegraf](https://telegraf.js.org/) - Modern Telegram Bot Framework
- [TDLib](https://core.telegram.org/tdlib) - Telegram Database Library
- [OpenRouter](https://openrouter.ai/) - AI API Gateway
- [Anthropic](https://anthropic.com/) - Claude AI Platform

---

Made with ❤️ by [LyoSU](https://github.com/LyoSU)

# TickerTracker AI 🚀

TickerTracker AI is a professional-grade market intelligence terminal designed for serious traders. It combines AI-powered trade parsing with real-time tracking and automated Discord alerts, all wrapped in a high-fidelity, Obsidian-inspired interface.

## ✨ Key Features

- **AI Magic Paste**: Instantly parse complex trade ideas from Discord, Twitter, or Telegram into structured watchlist items using Gemini AI.
- **Multi-Asset Support**: Track both Stocks and Cryptocurrencies in a unified dashboard.
- **Real-Time Intelligence**: Live price updates powered by Yahoo Finance.
- **Discord Alert Engine**: Automated notifications sent directly to your Discord server when price targets are breached.
- **Live Sync Engine**: Optional background refresh mode that keeps your data synchronized while the terminal is open.
- **Obsidian-Grade UI**: A high-density, Material Design 3 inspired interface optimized for focus and precision.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion (motion/react).
- **Backend**: Node.js, Express.
- **Database & Auth**: Firebase Firestore & Firebase Authentication.
- **AI**: Google Gemini API (@google/genai).
- **Market Data**: Yahoo Finance API.
- **Styling**: Custom Material Design 3 implementation with Tailwind.

## ⚙️ Configuration

To run the full feature set, the following environment variables are required:

- `GEMINI_API_KEY`: For AI trade parsing.
- `CRON_SECRET`: To secure the background refresh endpoint.
- `DISCORD_WEBHOOK_URL`: (Optional) Default endpoint for system alerts.

## 🚀 Getting Started

1. **Enter the Terminal**: Sign in with your Google account.
2. **Configure Alerts**: Head to the **Settings** tab to set your Discord Webhook and Alert Proximity Threshold.
3. **Add Tickers**: Use the **Magic Paste** tool to add new trades or add them manually.
4. **Monitor**: Keep the dashboard open to track live movements, or enable **Live Sync** for automated background updates.

## 🏗 Architecture

The application follows a full-stack architecture:
- **Client**: A Vite-powered SPA that handles real-time Firestore synchronization and UI state.
- **Server**: An Express backend that proxies market data requests and handles AI processing to keep API keys secure.
- **Database**: Firestore stores user configurations and watchlist items with strict security rules.

---
*Built with precision for the modern trader.*

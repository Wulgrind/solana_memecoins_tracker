# Solana Memecoin Dashboard

A real-time dashboard for tracking Solana memecoins with live price updates and trade feeds powered by WebSocket connections.

![Dashboard Preview](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple)

<p align="center">
  <img src="https://i.imgur.com/VydFBsp.png" alt="Screenshot" />
</p>

## Features

- **Real-time Price Tracking**: Live USD and SOL price updates via WebSocket
- **Trade Feed**: View the last 20 transactions in real-time
- **Drag & Drop**: Reposition widgets freely on desktop
- **URL Persistence**: Share your dashboard configuration via URL
- **Responsive Design**: Optimized for both desktop and mobile
- **Multi-widget Support**: Track multiple tokens simultaneously

## Tech Stack

- **Frontend**: React + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **API**: Mobula API (WebSocket + REST)

### Prerequisites

- Node.js and npm
- A Mobula API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Wulgrind/solana_memecoins_tracker.git
cd solana_memecoins_tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your Mobula API key to `.env`:
```env
VITE_MOBULA_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Adding a Widget

1. Click the **"+ Add Widget"** button in the navbar
2. Select widget type:
   - **Live Price Widget**: Real-time price with 24h change
   - **Trade Feed Widget**: Last 20 transactions
3. Enter a Solana token contract address
4. Click **"Create Widget"**

### Popular Token Addresses

- Enter any SPL token contract address from [Solscan](https://solscan.io)

### Moving Widgets (Desktop)

- Drag and drop widgets to reposition them
- Positions are automatically saved to the URL

### Sharing Your Dashboard

Simply copy the URL from your browser - it contains your entire widget configuration:

## URL Format

Widgets are encoded in the URL using this format:

```
?w=type:address:x:y,type:address:x:y
```

**Example**:
```
?w=live-price:So11111111111111111111111111111111111111112:50:50,trade-feed:pump8gTCf:530:50
```

This loads:
- A Live Price widget for SOL at position (50, 50)
- A Trade Feed widget for another token at position (530, 50)

## Features in Detail

### Live Price Widget

- Current price in USD
- Price in SOL
- 24h price change percentage
- Token name and symbol
- Contract address
- Last updated timestamp

### Trade Feed Widget

- Last 20 transactions
- Buy/Sell indicators (green/red)
- Token amounts
- Wallet address
- Solscan links for each transaction


## Performance Optimization

- Single WebSocket connection for all widgets
- Efficient re-renders with Zustand selectors
- Horizontal scrolling for long numbers on mobile

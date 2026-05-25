# Tensor Trading Terminal

An advanced, high-performance paper trading on Indian cash and derivatives market platform built on top of robust RESTful APIs. Tensor provides a seamless, device-agnostic trading experience featuring real-time market quotes, Equity derivatives support, dynamic margin calculations, and a fully decentralized serverless architecture.

## 🚀 Key Features

*   **Real-Time Data Integration**: Direct connectivity to external RESTful APIs for live NSE/BSE equity and derivatives data.
*   **Decentralized Persistence**: Utilizes a highly robust Serverless Cloud Memory (Vercel KV/Upstash Redis) to instantly synchronize your live portfolio, orders, and watchlists globally across all your devices.
*   **Optimistic UI Updates**: Built with Next.js, the frontend leverages zero-latency optimistic state mutations for instant trade execution feedback, silently syncing with the cloud backend.
*   **F&O Engine**: Complete support for Futures and Options with live Options Chain fetching, dynamic strike tracking, and automatic expiration settlement for expired derivative contracts.
*   **Margin Intelligence**: Real-time margin blocking algorithms that correctly isolate pending order margins from your available trading funds.
*   **Glassmorphic Design**: A premium, state-of-the-art visual aesthetic heavily featuring dynamic micro-animations, tailored dark mode typography, and responsive interface scaling.
*   **Secure Access**: Custom passkey authentication mechanism strictly restricting terminal access, synced directly to the cloud store.

## 🛠 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Pure CSS Modules / Vanilla CSS (Glassmorphism UI)
*   **Database (Master Data)**: SQLite (`better-sqlite3`)
*   **Database (State & Memory)**: Upstash Redis (Vercel KV)
*   **Icons**: [Lucide React](https://lucide.dev/)

## ⚙️ Local Development

To run the Tensor Trading Terminal locally:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env.local` file in the root directory and configure your RESTful API credentials:
    ```env
    MARKET_API_KEY=your_api_key
    MARKET_API_SECRET=your_api_secret
    ```
    *Note: The `MARKET_ACCESS_TOKEN` is managed and updated dynamically in the remote Redis database.*

3.  **Start the Server:**
    ```bash
    npm run dev
    ```

4.  **Local Memory Fallback:** 
    If you do not have Vercel KV configured locally, the platform will intelligently fall back to generating and utilizing a `data/memory.json` file on your local filesystem to persist your trading state.

## 📦 Deployment

This project is fully optimized for serverless deployments on platforms like **Vercel**. 

To deploy, simply link this repository to your Vercel account and ensure you provision an **Upstash Redis (KV)** database from the Vercel Storage Dashboard. The application will automatically detect the injected `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables and instantly switch to cloud-persistence mode.

---
*Disclaimer: This is a simulated paper-trading platform. It does not route real orders to any exchanges and is intended strictly for algorithmic testing and interface demonstrations.*

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import YahooFinance from 'yahoo-finance2';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

// Update system version on startup
const updateSystemVersion = async () => {
  try {
    const version = new Date().getTime().toString();
    await db.collection('system_meta').doc('version').set({ 
      version,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`System version synchronized: ${version}`);
  } catch (err) {
    console.error("Failed to update system version:", err);
  }
};
updateSystemVersion();

const yahooFinance = new YahooFinance();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Yahoo Finance API Helper
const fetchPrices = async (items: any[]) => {
  try {
    // Normalize tickers for Yahoo Finance
    const normalizedItems = items.map(item => {
      let ticker = item.ticker.toUpperCase().replace('/', '-');
      // For crypto, if it doesn't have a suffix like -USD, add it
      if (item.assetType === 'crypto' && !ticker.includes('-')) {
        ticker = `${ticker}-USD`;
      }
      return { original: item.ticker, normalized: ticker };
    });

    const normalizedTickers = [...new Set(normalizedItems.map(ni => ni.normalized))];
    
    // Fetch quotes in batch
    const quotes: any = await yahooFinance.quote(normalizedTickers);
    
    const results: Record<string, number> = {};
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
    
    // Map results back to original tickers
    normalizedItems.forEach((ni) => {
      const quote = quotesArray.find((q: any) => q.symbol === ni.normalized);

      if (quote && quote.regularMarketPrice) {
        results[ni.original] = quote.regularMarketPrice;
      }
    });

    return results;
  } catch (error: any) {
    console.error("Yahoo Finance Error:", error.message);
    throw new Error(`Market data fetch failed: ${error.message}`);
  }
};

// Discord Alert Helper
const sendDiscordAlert = async (webhookUrl: string, item: any, currentPrice: number) => {
  const proximity = Math.abs(((currentPrice - item.targetPrice) / currentPrice) * 100).toFixed(2);
  
  const embed = {
    title: `🚨 Price Alert: $${item.ticker}`,
    color: currentPrice >= item.targetPrice ? 0x10B981 : 0xF59E0B, // Emerald or Amber
    fields: [
      { name: "Current Price", value: `$${currentPrice.toLocaleString()}`, inline: true },
      { name: "Your Target", value: `$${item.targetPrice.toLocaleString()}`, inline: true },
      { name: "Proximity", value: `${proximity}% from target`, inline: true },
      { name: "Reasoning", value: item.reasoning || "No reasoning provided." }
    ],
    footer: { text: "TickerTracker AI • Alert Engine" },
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
  } catch (err: any) {
    console.error("Discord alert failed:", err.message);
  }
};

// API Route to check prices
app.post("/api/check", async (req, res) => {
  const { items, config } = req.body;
  
  try {
    if (!items || items.length === 0) {
      return res.json({ success: true, prices: {} });
    }

    const results = await fetchPrices(items);

    // Check for alerts
    if (config?.discordWebhookUrl && items) {
      for (const item of items) {
        const currentPrice = results[item.ticker];
        if (currentPrice !== undefined) {
          const diff = Math.abs(currentPrice - item.targetPrice) / currentPrice;
          const threshold = config.alertThreshold || 0.05;
          
          if (diff <= threshold) {
            await sendDiscordAlert(config.discordWebhookUrl, item, currentPrice);
          }
        }
      }
    }

    res.json({ success: true, prices: results });
  } catch (error: any) {
    console.error("API Route Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// API Route to test Discord Webhook
app.post("/api/test-webhook", async (req, res) => {
  const { webhookUrl } = req.body;
  
  if (!webhookUrl) {
    return res.status(400).json({ error: "Webhook URL is required" });
  }

  const embed = {
    title: "🔔 TickerTracker AI: Webhook Test",
    description: "Your Discord notification engine has been successfully synchronized with the Obsidian Architect terminal.",
    color: 0x4EDE9F, // Primary color
    fields: [
      { name: "Status", value: "✅ Operational", inline: true },
      { name: "Environment", value: "Production", inline: true },
      { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
    ],
    footer: { text: "TickerTracker AI" },
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Test Error:", error.message);
    res.status(500).json({ error: `Failed to send test alert: ${error.message}` });
  }
});

// API Route for automated refresh (Cron)
app.post("/api/cron-refresh", async (req, res) => {
  const secret = req.headers['x-refresh-secret'];
  const expectedSecret = process.env.CRON_SECRET || "ticker-tracker-secure-refresh-key";

  if (secret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized: Invalid refresh secret" });
  }

  try {
    console.log("Starting automated data refresh...");
    
    // 1. Fetch all active watchlist items
    const watchlistSnapshot = await db.collection('watchlist').get();
    const items = watchlistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (items.length === 0) {
      return res.json({ success: true, message: "Watchlist is empty" });
    }

    // 2. Fetch latest prices
    const prices = await fetchPrices(items);

    // 3. Fetch user configurations (for Discord webhooks)
    const configsSnapshot = await db.collection('userConfigs').get();
    const configs: Record<string, any> = {};
    configsSnapshot.forEach(doc => {
      configs[doc.id] = doc.data();
    });

    const updatePromises = [];
    const alertPromises = [];

    // 4. Process each item
    for (const item of items as any[]) {
      const currentPrice = prices[item.ticker];
      if (currentPrice !== undefined) {
        // Update price in DB
        updatePromises.push(
          db.collection('watchlist').doc(item.id).update({
            currentPrice: currentPrice,
            lastChecked: admin.firestore.FieldValue.serverTimestamp()
          })
        );

        // Check for alerts
        const userConfig = configs[item.userId];
        if (userConfig?.discordWebhookUrl) {
          const diff = Math.abs(currentPrice - item.targetPrice) / currentPrice;
          const threshold = userConfig.alertThreshold || 0.05;

          if (diff <= threshold) {
            alertPromises.push(sendDiscordAlert(userConfig.discordWebhookUrl, item, currentPrice));
          }
        }
      }
    }

    await Promise.all([...updatePromises, ...alertPromises]);

    console.log(`Successfully refreshed ${items.length} items and processed alerts.`);
    res.json({ 
      success: true, 
      refreshedCount: items.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Cron Refresh Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

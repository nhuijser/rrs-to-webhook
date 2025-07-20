const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
dotenv.config();

const https = require("https");
const { parseString } = require("xml2js");

// RSS feeds configuration file
const CONFIG_FILE = path.join(__dirname, "rss-config.json");

// Default configuration
const DEFAULT_CONFIG = {
  tech: {
    webhook: process.env.TECH_WEBHOOK,
    feeds: [
      "https://www.apple.com/newsroom/rss-feed.rss",
      "https://android-developers.googleblog.com/feeds/posts/default",
      "https://blog.google/rss/",
      "https://www.sammobile.com/feed/",
      "https://news.samsung.com/us/feed/",
      "https://blogs.microsoft.com/feed/",
      "https://blogs.nvidia.com/feed/",
      "https://newsroom.intel.com/feed/",
      "https://www.qualcomm.com/news/releases/rss",
      "https://openai.com/blog/rss.xml",
      "https://blog.tesla.com/rss",
      "https://aws.amazon.com/blogs/aws/feed/",
      "https://azure.microsoft.com/en-us/blog/feed/",
      "https://cloud.google.com/blog/rss/",
      "https://blog.meta.com/feed/",
      "https://newsroom.spotify.com/feed/",
      "https://blog.netflix.com/rss.xml",
      "https://blog.adobe.com/en/feeds/posts.xml",
    ],
  },
  developing: {
    webhook: process.env.DEVELOPING_WEBHOOK,
    feeds: [
      "https://github.blog/feed/",
      "https://nodejs.org/en/feed/blog.xml",
      "https://legacy.reactjs.org/feed.xml",
      "https://blog.angular.io/feed",
      "https://blog.vuejs.org/feed.rss",
      "https://blogs.microsoft.com/msdev/feed/",
      "https://developer.apple.com/news/rss/news.rss",
      "https://developer.android.com/feeds/all-updates.xml",
      "https://blog.flutter.dev/feed",
      "https://kubernetes.io/feed.xml",
      "https://blog.docker.com/feed/",
      "https://www.mongodb.com/blog/rss.xml",
      "https://about.gitlab.com/atom.xml",
      "https://www.atlassian.com/blog/feed",
      "https://blog.jetbrains.com/feed/",
      "https://www.redhat.com/en/rss/blog",
      "https://ubuntu.com/blog/feed",
    ],
  },
  gaming: {
    webhook: process.env.GAMING_WEBHOOK,
    feeds: [
      "https://steamcommunity.com/groups/GrabFreeGames/rss/",
      "https://news.xbox.com/en-us/feed/",
      "https://blog.playstation.com/feed/",
      "https://www.nintendo.com/us/whatsnew/rss.xml",
      "https://store.steampowered.com/feeds/news.xml",
      "https://www.epicgames.com/store/en-US/news/rss",
      "https://blogs.unity3d.com/feed/",
      "https://www.unrealengine.com/en-US/feed",
      "https://blog.ea.com/feed",
      "https://news.ubisoft.com/en-us/category/news/rss",
      "https://news.activision.com/rss.xml",
      "https://news.blizzard.com/en-us/rss.xml",
      "https://www.riotgames.com/en/rss.xml",
      "https://blog.counter-strike.net/index.php/feed/",
      "https://blog.dota2.com/feed/",
      "https://leagueoflegends.com/en-us/news/rss.xml",
      "https://www.valvesoftware.com/en/news/rss.xml",
      "https://playvalorant.com/en-us/news/rss/",
    ],
  },
  esports: {
    webhook: process.env.ESPORTS_WEBHOOK,
    feeds: [
      "https://vlr.gg/rss",
      "https://dotesports.com/league-of-legends/feed",
    ],
  },
};

// Load or create configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("❌ Error loading config, using defaults:", error.message);
  }
  return DEFAULT_CONFIG;
}

// Save configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log("💾 Configuration saved to", CONFIG_FILE);
  } catch (error) {
    console.error("❌ Error saving config:", error.message);
  }
}

// Current configuration
let RSS_CONFIG = loadConfig();

// Track last sent items
let lastSentItemLinks = {};

// Initialize tracking for all categories
for (const category in RSS_CONFIG) {
  lastSentItemLinks[category] = {};
}

// Function to fetch RSS feed with timeout
function fetchRSSFeed(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      // Handle redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        return fetchRSSFeed(res.headers.location, timeout)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (data.trim().length === 0) {
          reject(new Error("Empty response"));
          return;
        }
        resolve(data);
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout (${timeout}ms)`));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

// Function to parse RSS feed
function parseRSS(xml, url) {
  return new Promise((resolve, reject) => {
    parseString(xml, { trim: true, explicitArray: false }, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        let items = [];
        let format = "unknown";

        if (result.rss && result.rss.channel && result.rss.channel.item) {
          items = Array.isArray(result.rss.channel.item)
            ? result.rss.channel.item
            : [result.rss.channel.item];
          format = "rss";
        } else if (result.feed && result.feed.entry) {
          items = Array.isArray(result.feed.entry)
            ? result.feed.entry
            : [result.feed.entry];
          format = "atom";
        }

        if (items.length === 0) {
          reject(new Error("No items found in feed"));
          return;
        }

        resolve({ items, format });
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

// Function to extract data from RSS item
function extractItemData(item, format) {
  let title, link;

  if (format === "rss") {
    title = item.title || "";
    link = item.link || "";
  } else if (format === "atom") {
    title = item.title && item.title._ ? item.title._ : item.title || "";
    link = item.link && item.link.$ ? item.link.$.href : item.link || "";
  }

  return {
    title: typeof title === "string" ? title : title.toString(),
    link: typeof link === "string" ? link : link.toString(),
  };
}

// Function to send data to Discord webhook (simple link)
function sendToWebhook(webhookUrl, data, category) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Sending to ${category}: ${data.title.substring(0, 50)}...`);

    const postData = JSON.stringify({
      content: data.link,
    });

    const url = new URL(webhookUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "RSS-Bot/1.0",
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 204) {
          console.log(`✅ Successfully sent to ${category}`);
          resolve();
        } else {
          console.error(`❌ Webhook error (${res.statusCode}):`, responseData);
          reject(new Error(`Webhook responded with ${res.statusCode}`));
        }
      });
    });

    req.on("error", (e) => {
      console.error(`❌ Error sending to ${category} webhook:`, e.message);
      reject(e);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Webhook request timeout"));
    });

    req.write(postData);
    req.end();
  });
}

// Function to validate a single RSS feed
async function validateFeed(url) {
  try {
    const xml = await fetchRSSFeed(url, 8000);
    const rss = await parseRSS(xml, url);

    if (rss.items.length === 0) {
      throw new Error("No items found");
    }

    const item = rss.items[0];
    const data = extractItemData(item, rss.format);

    if (!data.title || !data.link) {
      throw new Error("Missing required fields");
    }

    return { valid: true, itemCount: rss.items.length, format: rss.format };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Function to validate and clean all feeds
async function validateAndCleanFeeds() {
  console.log("🔍 Validating all RSS feeds...");

  let totalFeeds = 0;
  let validFeeds = 0;
  let removedFeeds = 0;
  let configChanged = false;

  for (const category in RSS_CONFIG) {
    const { feeds, webhook } = RSS_CONFIG[category];

    if (!webhook) {
      console.log(
        `⚠️  No webhook configured for ${category}, skipping validation`
      );
      continue;
    }

    console.log(`\n📂 Validating ${category} feeds (${feeds.length} total):`);

    const validFeedsForCategory = [];

    for (const url of feeds) {
      totalFeeds++;
      const result = await validateFeed(url);

      if (result.valid) {
        console.log(`✅ ${url} - ${result.itemCount} items (${result.format})`);
        validFeedsForCategory.push(url);
        validFeeds++;
      } else {
        console.log(`❌ ${url} - ${result.error}`);
        removedFeeds++;
        configChanged = true;
      }

      // Small delay to avoid overwhelming servers
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Update the config with only valid feeds
    RSS_CONFIG[category].feeds = validFeedsForCategory;

    console.log(
      `📊 ${category}: ${validFeedsForCategory.length}/${feeds.length} feeds valid`
    );
  }

  console.log(`\n📊 Validation complete:`);
  console.log(`   Total feeds: ${totalFeeds}`);
  console.log(`   Valid feeds: ${validFeeds}`);
  console.log(`   Removed feeds: ${removedFeeds}`);

  if (configChanged) {
    saveConfig(RSS_CONFIG);
    console.log("✅ Updated configuration saved with working feeds only");
  } else {
    console.log("✅ All feeds are working, no changes needed");
  }
}

// Main function to handle RSS updates
async function handleRSSUpdate() {
  console.log(`\n🔄 Checking for updates... (${new Date().toLocaleString()})`);

  let totalProcessed = 0;
  let newItemsFound = 0;

  for (const category in RSS_CONFIG) {
    const { feeds, webhook } = RSS_CONFIG[category];

    if (!webhook) {
      console.log(`⚠️  No webhook configured for ${category}, skipping...`);
      continue;
    }

    console.log(`\n📂 Processing ${category} feeds (${feeds.length} feeds):`);

    for (const url of feeds) {
      try {
        const xml = await fetchRSSFeed(url);
        const rss = await parseRSS(xml, url);

        const latestItem = rss.items[0];
        const data = extractItemData(latestItem, rss.format);

        if (!data.title || !data.link) {
          console.log(`⚠️  Skipping ${url} - missing required fields`);
          continue;
        }

        // Normalize link by removing cache parameters
        const normalizedLink = data.link.split("?")[0]; // Remove query parameters

        // Check if this is a new item using normalized link
        if (normalizedLink !== lastSentItemLinks[category][url]) {
          try {
            await sendToWebhook(webhook, data, category);
            lastSentItemLinks[category][url] = normalizedLink;
            newItemsFound++;
          } catch (webhookError) {
            console.error(
              `❌ Failed to send webhook for ${url}:`,
              webhookError.message
            );
          }
        }

        totalProcessed++;

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`❌ Error processing ${url}:`, error.message);
      }
    }
  }

  console.log(
    `\n📊 Update complete: ${totalProcessed} feeds processed, ${newItemsFound} new items found`
  );
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

// Initialize and start the bot
async function main() {
  console.log("🚀 RSS Bot starting...");

  // Show current configuration
  console.log("\n📋 Current configuration:");
  for (const category in RSS_CONFIG) {
    const { feeds, webhook } = RSS_CONFIG[category];
    console.log(
      `   ${category}: ${feeds.length} feeds, webhook: ${webhook ? "✅" : "❌"}`
    );
  }

  // Validate and clean feeds
  await validateAndCleanFeeds();

  // Initial run
  await handleRSSUpdate();

  // Run every 5 minutes
  console.log("\n⏰ Setting up 1-minute interval...");
  setInterval(handleRSSUpdate, 1 * 60 * 1000);

  console.log("✅ RSS Bot is now running!");
  console.log(`📄 Configuration file: ${CONFIG_FILE}`);
}

main().catch(console.error);

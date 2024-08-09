import * as https from "https"; // Use named import for 'https'
import { parseString } from "xml2js"; // Use named import for 'xml2js'

const RSS_URL = "https://www.androidauthority.com/feed/";
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1271521389576192092/-kuXcNfrbOny0IXSekPxno_1xoECzHlwNyi_TVLfpQJFpZFsc7j3DexBWtqbWPsm0LwF";

let lastSentItemLink: string | null = null; // To track the last sent item

// Function to fetch RSS feed
function fetchRSSFeed(url: string): Promise<string> {
  console.log("Fetching RSS feed...");
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

// Function to parse RSS feed
function parseRSS(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, { trim: true }, (err: Error | null, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Function to send data to Discord webhook
function sendToWebhook(data: { title: string; link: string }): void {
  console.log("Sending data to webhook...");
  const postData = JSON.stringify({
    content: `${data.title}\n\n${data.link}`,
  });

  const url = new URL(WEBHOOK_URL);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    res.on("data", (d) => {
      process.stdout.write(d);
    });
  });

  req.on("error", (e: Error) => {
    console.error(e);
  });

  req.write(postData);
  req.end();
}

// Main function to handle fetching, parsing, and sending data
async function handleRSSUpdate(): Promise<void> {
  console.log("Checking for updates...");
  try {
    const xml = await fetchRSSFeed(RSS_URL);
    const rss = await parseRSS(xml);
    const latestItem = rss.rss.channel[0].item[0];

    const data = {
      title: latestItem.title[0],
      link: latestItem.link[0],
    };

    // Check if the latest item is new
    if (data.link !== lastSentItemLink) {
      sendToWebhook(data);
      lastSentItemLink = data.link; // Update the last sent item link
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script every minute
setInterval(handleRSSUpdate, 60 * 1000);

// Initial run
handleRSSUpdate();

import * as dotenv from "dotenv"; // Import dotenv
dotenv.config(); // Load environment variables from .env file

console.log([process.env.TECH_WEBHOOK, process.env.PROGRAMMING_WEBHOOK]);
import * as https from "https"; // Use named import for 'https'
import { parseString } from "xml2js"; // Use named import for 'xml2js'

// Define RSS feeds with corresponding webhooks
const RSS_FEEDS: { [key: string]: { urls: string[]; webhook: string } } = {
  tech: {
    urls: [
      "https://www.androidauthority.com/feed/", // Tech feed
      "https://www.sammobile.com/feed/",
      "https://feeds.macrumors.com/MacRumors-Front",
      "https://9to5mac.com/feed/",
    ],
    webhook: process.env.TECH_WEBHOOK!, // Environment variable for tech webhook
  },
  programming: {
    urls: [
      "https://nodejs.org/en/feed/blog.xml", // Programming feed
      "https://tailwindcss.com/feeds/feed.xml",
      "https://www.ruby-lang.org/en/feeds/news.rss",
      "https://legacy.reactjs.org/feed.xml",
      "https://github.blog/feed/",
    ],
    webhook: process.env.PROGRAMMING_WEBHOOK!, // Environment variable for programming webhook
  },
};

let lastSentItemLinks: { [key: string]: { [url: string]: string | null } } = {
  tech: {},
  programming: {},
};

// Function to fetch RSS feed
function fetchRSSFeed(url: string): Promise<string> {
  console.log(`Fetching RSS feed from: ${url}`);
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
      .on("error", (err) => {
        console.error(`Error fetching ${url}:`, err);
        reject(err);
      });
  });
}

// Function to parse RSS feed
function parseRSS(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, { trim: true }, (err: Error | null, result: any) => {
      if (err) {
        console.error("Error parsing RSS:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Function to send data to Discord webhook
function sendToWebhook(
  webhookUrl: string,
  data: { title: string; link: string }
): void {
  console.log("Sending data to webhook...");
  const postData = JSON.stringify({
    content: `${data.title}\n\n${data.link}`,
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
    },
  };

  const req = https.request(options, (res) => {
    res.on("data", (d) => {
      process.stdout.write(d);
    });
  });

  req.on("error", (e: Error) => {
    console.error(`Error sending to webhook:`, e);
  });

  req.write(postData);
  req.end();
}

// Main function to handle fetching, parsing, and sending data
async function handleRSSUpdate(): Promise<void> {
  console.log("Checking for updates...");

  for (const category in RSS_FEEDS) {
    const { urls, webhook } = RSS_FEEDS[category];

    for (const url of urls) {
      console.log(webhook);
      try {
        const xml = await fetchRSSFeed(url);
        const rss = await parseRSS(xml);
        const latestItem = rss.rss.channel[0].item[0];

        const data = {
          title: latestItem.title[0],
          link: latestItem.link[0],
        };

        // Check if the latest item is new
        if (data.link !== lastSentItemLinks[category][url]) {
          sendToWebhook(webhook, data);
          lastSentItemLinks[category][url] = data.link; // Update the last sent item link for this RSS URL
        }
      } catch (error) {
        console.error(
          `Error processing ${url} in ${category} category:`,
          error
        );
      }
    }
  }
}

// Run the script every 5 minutes
setInterval(handleRSSUpdate, 5 * 60 * 1000);

// Initial run
handleRSSUpdate();

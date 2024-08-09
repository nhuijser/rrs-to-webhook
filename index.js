"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var https = require("https"); // Use named import for 'https'
var xml2js_1 = require("xml2js"); // Use named import for 'xml2js'
var RSS_URL = "https://www.androidauthority.com/feed/";
var WEBHOOK_URL = "https://discord.com/api/webhooks/1271521389576192092/-kuXcNfrbOny0IXSekPxno_1xoECzHlwNyi_TVLfpQJFpZFsc7j3DexBWtqbWPsm0LwF";
var lastSentItemLink = null; // To track the last sent item
// Function to fetch RSS feed
function fetchRSSFeed(url) {
    console.log("Fetching RSS feed...");
    return new Promise(function (resolve, reject) {
        https
            .get(url, function (res) {
            var data = "";
            res.on("data", function (chunk) {
                data += chunk;
            });
            res.on("end", function () {
                resolve(data);
            });
        })
            .on("error", reject);
    });
}
// Function to parse RSS feed
function parseRSS(xml) {
    return new Promise(function (resolve, reject) {
        (0, xml2js_1.parseString)(xml, { trim: true }, function (err, result) {
            if (err)
                reject(err);
            else
                resolve(result);
        });
    });
}
// Function to send data to Discord webhook
function sendToWebhook(data) {
    console.log("Sending data to webhook...");
    var postData = JSON.stringify({
        content: "".concat(data.title, "\n\n").concat(data.link),
    });
    var url = new URL(WEBHOOK_URL);
    var options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
        },
    };
    var req = https.request(options, function (res) {
        res.on("data", function (d) {
            process.stdout.write(d);
        });
    });
    req.on("error", function (e) {
        console.error(e);
    });
    req.write(postData);
    req.end();
}
// Main function to handle fetching, parsing, and sending data
function handleRSSUpdate() {
    return __awaiter(this, void 0, void 0, function () {
        var xml, rss, latestItem, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Checking for updates...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetchRSSFeed(RSS_URL)];
                case 2:
                    xml = _a.sent();
                    return [4 /*yield*/, parseRSS(xml)];
                case 3:
                    rss = _a.sent();
                    latestItem = rss.rss.channel[0].item[0];
                    data = {
                        title: latestItem.title[0],
                        link: latestItem.link[0],
                    };
                    // Check if the latest item is new
                    if (data.link !== lastSentItemLink) {
                        sendToWebhook(data);
                        lastSentItemLink = data.link; // Update the last sent item link
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("Error:", error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Run the script every minute
setInterval(handleRSSUpdate, 60 * 1000);
// Initial run
handleRSSUpdate();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRedis = ensureRedis;
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
});
// Call connect() once at app bootstrap
async function ensureRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}
exports.default = redisClient;

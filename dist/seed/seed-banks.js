"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const Bank_1 = __importDefault(require("../models/Bank"));
const SEED_BANKS = [
    { name: 'Commercial Bank of Ethiopia', code: 'CBE', type: 'bank' },
    { name: 'Awash Bank', code: 'AWASH', type: 'bank' },
    { name: 'Dashen Bank', code: 'DASHEN', type: 'bank' },
    { name: 'Bank of Abyssinia', code: 'BOA', type: 'bank' },
    { name: 'Wegagen Bank', code: 'WEGAGEN', type: 'bank' },
    { name: 'United Bank', code: 'UNITED', type: 'bank' },
    { name: 'Nib International Bank', code: 'NIB', type: 'bank' },
    { name: 'Cooperative Bank of Oromia', code: 'COOP', type: 'bank' },
    { name: 'Lion International Bank', code: 'LION', type: 'bank' },
    { name: 'Zemen Bank', code: 'ZEMEN', type: 'bank' },
    { name: 'Bunna International Bank', code: 'BUNNA', type: 'bank' },
    { name: 'Berhan International Bank', code: 'BERHAN', type: 'bank' },
    { name: 'Abay Bank', code: 'ABAY', type: 'bank' },
    { name: 'Addis International Bank', code: 'ADDIS', type: 'bank' },
    { name: 'Debub Global Bank', code: 'DEBUB', type: 'bank' },
    { name: 'Enat Bank', code: 'ENAT', type: 'bank' },
    { name: 'Tsehay Bank', code: 'TSEHAY', type: 'bank' },
    { name: 'Hijra Bank', code: 'HIJRA', type: 'bank' },
    { name: 'ZamZam Bank', code: 'ZAMZAM', type: 'bank' },
    { name: 'Telebirr', code: 'TELEBIRR', type: 'wallet' },
    { name: 'CBE Birr', code: 'CBEBIRR', type: 'wallet' },
    { name: 'M-PESA', code: 'MPESA', type: 'wallet' },
];
async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not set. Check your .env file.');
        process.exit(1);
    }
    await mongoose_1.default.connect(uri);
    console.log('✅ Connected to MongoDB');
    let created = 0, existing = 0;
    for (const b of SEED_BANKS) {
        const res = await Bank_1.default.updateOne({ code: b.code }, { $setOnInsert: { ...b, isActive: true } }, { upsert: true });
        if (res.upsertedCount > 0)
            created++;
        else
            existing++;
    }
    console.log(`✅ Seed complete — created: ${created}, already existed: ${existing}`);
    await mongoose_1.default.disconnect();
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });

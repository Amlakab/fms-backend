"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const bankController_1 = require("../controllers/bankController");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, bankController_1.getAllBanks);
router.post('/', auth_1.authenticate, bankController_1.createBank); // add admin check if you want
router.put('/:id', auth_1.authenticate, bankController_1.updateBank);
router.delete('/:id', auth_1.authenticate, bankController_1.deleteBank);
exports.default = router;

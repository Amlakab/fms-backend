"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const agentController_1 = require("../controllers/agentController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All agent routes require authentication and agent role
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('agent'));
router.get('/dashboard', agentController_1.getDashboard);
router.get('/users', agentController_1.getUsers);
router.get('/games', agentController_1.getGames);
router.get('/transactions', agentController_1.getTransactions);
exports.default = router;

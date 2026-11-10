"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const menuController_1 = require("../controllers/menuController");
const auth_1 = require("../middleware/auth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const router = express_1.default.Router();
// Any authenticated user can read menus (needed for sidebar + dialog)
router.get('/', auth_1.authenticate, menuController_1.getMenus);
router.get('/:menuId', auth_1.authenticate, menuController_1.getMenu);
// Only admin can mutate menus
router.post('/', auth_1.authenticate, requireAdmin_1.requireAdmin, menuController_1.createMenu);
router.put('/:menuId', auth_1.authenticate, requireAdmin_1.requireAdmin, menuController_1.updateMenu);
router.delete('/:menuId', auth_1.authenticate, requireAdmin_1.requireAdmin, menuController_1.deleteMenu);
exports.default = router;

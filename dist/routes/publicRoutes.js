"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const publicHouseController_1 = require("../controllers/publicHouseController");
const router = express_1.default.Router();
router.get('/houses', publicHouseController_1.getPublicHouses);
router.get('/houses/trending', publicHouseController_1.getTrendingHouses);
router.get('/houses/map', publicHouseController_1.getHousesForMap);
router.get('/houses/filter-options', publicHouseController_1.getPublicFilterOptions);
router.get('/houses/:id', publicHouseController_1.getPublicHouse);
router.get('/houses/:id/3d', publicHouseController_1.getThreeDModel);
router.get('/houses/:id/image', publicHouseController_1.getHouseImage);
exports.default = router;

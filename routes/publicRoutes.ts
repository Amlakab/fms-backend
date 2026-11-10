import express from 'express';
import {
  getPublicHouses,
  getPublicHouse,
  getHousesForMap,
  getPublicFilterOptions,
  getThreeDModel,
  getHouseImage,
  getTrendingHouses
} from '../controllers/publicHouseController';

const router = express.Router();

router.get('/houses', getPublicHouses);
router.get('/houses/trending', getTrendingHouses);
router.get('/houses/map', getHousesForMap);
router.get('/houses/filter-options', getPublicFilterOptions);
router.get('/houses/:id', getPublicHouse);
router.get('/houses/:id/3d', getThreeDModel);
router.get('/houses/:id/image', getHouseImage);

export default router;
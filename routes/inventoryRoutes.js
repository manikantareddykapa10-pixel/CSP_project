const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const { inventoryValidation } = require('../middleware/validationMiddleware');
const { createInventoryController, getInventoryController, getDonarsController, getHospitalController, getOrgnaisationController, getOrgnaisationForHospitalController, getInventoryHospitalController, getRecentInventoryController } = require('../controllers/inventoryController');
const router = express.Router();


//ADD INVERNTORY || POST
router.post('/create-inventory', authMiddleware, inventoryValidation, createInventoryController);

router.get('/get-inventory', authMiddleware, getInventoryController);
router.get('/get-recent-inventory', authMiddleware, authorizeRoles('admin', 'hospital', 'organisation'), getRecentInventoryController);
router.post('/get-inventory-hospital', authMiddleware, authorizeRoles('admin', 'hospital', 'donar'), getInventoryHospitalController);


router.get('/get-donars', authMiddleware, getDonarsController);
router.get('/get-hospitals', authMiddleware, getHospitalController);
router.get('/get-organisation', authMiddleware, getOrgnaisationController);
router.get('/get-organisation-for-hospital', authMiddleware, getOrgnaisationForHospitalController);

module.exports = router;
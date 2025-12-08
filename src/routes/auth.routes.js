const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../middleware/upload'); // For agent registration images

// Public routes for registration and login
router.post('/superadmin/register', authController.registerSuperAdmin); // Should be run once for initial setup
router.post('/agent/register', upload.fields([{ name: 'shopImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), authController.registerAgent);
router.post('/user/register', authController.registerUser);
router.post('/login', authController.login);

module.exports = router;
// src/routes/public.routes.js

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { authenticate } = require('../middleware/auth'); // We can make it authenticated for any logged-in user

// Any logged-in user can access this route
router.get('/loan-packages', authenticate, publicController.getActiveLoanPackages);

module.exports = router;
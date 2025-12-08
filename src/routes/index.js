const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const superadminRoutes = require('./superadmin.routes');
const adminRoutes = require('./admin.routes');
const agentRoutes = require('./agent.routes');
const userRoutes = require('./user.routes');
const publicRoutes = require('./public.routes');

// Mount all routes
router.use('/auth', authRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);
router.use('/user', userRoutes);
router.use('/public', publicRoutes);

module.exports = router;
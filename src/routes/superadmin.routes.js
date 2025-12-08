const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadmin.controller');
const { authenticate, authorize, SUPER_ADMIN } = require('../middleware/auth');

// All routes below require Super Admin authentication and authorization
router.use(authenticate, authorize(SUPER_ADMIN));

// Admin Management
router.post('/admin/register', superadminController.registerAdmin); // Create Admin
router.get('/admins', superadminController.getAllAdmins);           // Get all Admins
router.get('/admin/:id', superadminController.getAdminById);        // Get Admin by ID
router.put('/admin/:id', superadminController.updateAdmin);         // Update Admin
router.delete('/admin/:id', superadminController.deleteAdmin);      // Delete Admin

module.exports = router;
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { authenticate, authorize, AGENT } = require('../middleware/auth');
const upload = require('../middleware/upload'); // For image uploads

// All routes below require Agent authentication and authorization
router.use(authenticate, authorize(AGENT));

// --- Agent Profile Management ---
router.get('/profile', agentController.getAgentProfile);
router.put('/profile', upload.fields([{ name: 'shopImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), agentController.updateAgentProfile);

// --- User Management (Agent creates users) ---
router.post('/users', agentController.addUserByAgent);
router.get('/users', agentController.getAllUsersByAgent);
router.get('/users/:id', agentController.getUserByAgent);
// Agent cannot directly update/delete users they create (admin handles that), only view.

// --- KYC Management (Agent submits KYC for their users) ---
const kycUploadFields = [
    { name: 'adharCardImage', maxCount: 1 },
    { name: 'panCardImage', maxCount: 1 },
    { name: 'passBookImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
];
router.post('/users/:userId/kyc', upload.fields(kycUploadFields), agentController.submitKycForUser);
// Agent does not view KYC directly, it's part of user profile if needed.

// --- LOAN Management (Agent applies loans for their users) ---
router.post('/users/:userId/loans', agentController.applyLoanForUser);
router.get('/loans', agentController.getAgentUsersLoans); // Get all loans for agent's users
router.get('/loans/:loanId', agentController.getAgentUserLoanById); // Get specific loan for agent's user

// --- PAYMENT Management (Agent submits payment screenshots for their users' installments) ---
router.post('/users/:userId/installments/:installmentId/payments', upload.single('paymentScreenshot'), agentController.submitInstallmentPayment);

module.exports = router;
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize, USER } = require('../middleware/auth');
const upload = require('../middleware/upload'); // For image uploads

// All routes below require User authentication and authorization
router.use(authenticate, authorize(USER));

// --- User Profile Management ---
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);

// --- KYC Management (User self-KYC) ---
const kycUploadFields = [
    { name: 'adharCardImage', maxCount: 1 },
    { name: 'panCardImage', maxCount: 1 },
    { name: 'passBookImage', maxCount: 1 },
    { name: 'userImage', maxCount: 1 }
];
router.post('/kyc', upload.fields(kycUploadFields), userController.submitOwnKyc);
router.get('/kyc', userController.getOwnKycStatus);

// --- LOAN Management (User applies for loans) ---
router.post('/loans', userController.applyOwnLoan);
router.get('/loans', userController.getOwnLoanApplications);
router.get('/loans/:loanId', userController.getOwnLoanDetails); // Includes categorized installments

// --- PAYMENT Management (User submits payment screenshots) ---
router.post('/installments/:installmentId/payments', upload.single('paymentScreenshot'), userController.submitOwnInstallmentPayment);
router.get('/payments', userController.getOwnPayments);

module.exports = router;
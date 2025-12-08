const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize, ADMIN } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes below require Admin authentication and authorization
router.use(authenticate, authorize(ADMIN));

// --- USER Management (Admin creating/managing regular users) ---
router.post('/users', adminController.createUserByAdmin);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// --- PACKAGE Management ---
router.post('/packages', adminController.createPackage);
router.get('/packages', adminController.getAllPackages);
router.get('/packages/:id', adminController.getPackageById);
router.put('/packages/:id', adminController.updatePackage);
router.delete('/packages/:id', adminController.deletePackage);

// --- AGENT Management (Admin creating/managing agents) ---
router.post('/agents', upload.fields([{ name: 'shopImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), adminController.registerAgentByAdmin);
router.get('/agents', adminController.getAllAgents);
router.get('/agents/:id', adminController.getAgentById);
router.put('/agents/:id', upload.fields([{ name: 'shopImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), adminController.updateAgent);
router.delete('/agents/:id', adminController.deleteAgent);

// --- KYC Management ---
router.get('/kyc', adminController.getAllKycRecords);
router.get('/kyc/:id', adminController.getKycById);
router.put('/kyc/:id', adminController.updateKycStatus);
router.delete('/kyc/:id', adminController.deleteKycRecord);

// --- LOAN Management ---
router.get('/loans', adminController.getAllLoanApplications);
router.get('/loans/:id', adminController.getLoanApplicationById);
router.put('/loans/:id/status', adminController.updateLoanApplicationStatus); // Approve/Reject loan
router.delete('/loans/:id', adminController.deleteLoanApplication);

// --- INSTALLMENT & PAYMENT Management ---
router.get('/installments', adminController.getAllInstallments);
router.get('/payments', adminController.getAllPaymentReceipts);
router.put('/payments/:id/approve', adminController.approvePayment); // Approve payment screenshot
router.put('/payments/:id/reject', adminController.rejectPayment); // Reject payment screenshot

// --- COMMISSION Management ---
router.post('/commissions', adminController.setAgentCommission); // Set/Update agent commission
router.get('/commissions', adminController.getAllCommissions);
router.put('/commissions/:id', adminController.updateAgentCommission);
router.delete('/commissions/:id', adminController.deleteAgentCommission);

// --- FINANCIAL Reporting ---
router.get('/balance-sheet', adminController.getBalanceSheet);
router.get('/reports/monthly-performance', adminController.getMonthlyPerformanceReport); // NEW
router.get('/reports/loans-by-package', adminController.getLoansByPackageReport);      // NEW
router.get('/reports/agent-performance', adminController.getAgentPerformanceReport);

// NEW: Report Download Routes
router.get('/reports/monthly-performance/download/csv', adminController.downloadMonthlyPerformanceCsv); // NEW
router.get('/reports/monthly-performance/download/pdf', adminController.downloadMonthlyPerformancePdf); // NEW

router.get('/settings', adminController.getSettings);
router.put('/settings/payment-qr', upload.single('qrCodeImage'), adminController.updatePaymentQrCode);

module.exports = router;
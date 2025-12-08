// src/controllers/user.controller.js
const User = require('../models/user.model');
const Package = require('../models/package.model');
const Kyc = require('../models/kyc.model');
const Loan = require('../models/loan.model');
const Installment = require('../models/installment.model');
const Payment = require('../models/payment.model');
const { uploadFileToSpaces, deleteFileFromSpaces } = require('../config/s3');
const { calculateLoanEligibility } = require('../utils/loanCalculator');
const {
    OK, CREATED, BAD_REQUEST, NOT_FOUND, CONFLICT, INTERNAL_SERVER_ERROR, FORBIDDEN
} = require('../constants/statusCodes');
const {
    ALL_FIELDS_REQUIRED,
    FETCH_SUCCESS,
    NOT_FOUND: NOT_FOUND_MSG,
    SERVER_ERROR,
    USER_NOT_FOUND,
    KYC_CREATED_SUCCESS,
    KYC_NOT_FOUND,
    KYC_ALREADY_SUBMITTED,
    IMAGE_UPLOAD_REQUIRED,
    LOAN_APPLIED_SUCCESS,
    LOAN_NOT_FOUND,
    LOAN_ELIGIBILITY_CHECK,
    LOAN_AMOUNT_INVALID,
    PAYMENT_UPLOADED_SUCCESS,
    INSTALLMENT_NOT_FOUND,
    INSTALLMENT_ALREADY_PAID
} = require('../constants/messages');
const { USER } = require('../constants/roles');

// --- USER PROFILE MANAGEMENT ---
// @desc    Get User's own profile
// @route   GET /api/user/profile
// @access  Private (User only)
// exports.getUserProfile = async (req, res) => {
//     try {
//         const user = await User.findById(req.user.id)
//             .populate('currentLoanEligibilityPackage')
//             .select('-password');
//         if (!user || user.role !== USER) {
//             return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
//         }
//         res.status(OK).json({ message: FETCH_SUCCESS, user });
//     } catch (error) {
//         console.error("Error fetching user profile:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.getUserProfile = async (req, res) => {
    try {
        // CHANGE: Removed .populate('currentLoanEligibilityPackage')
        const user = await User.findById(req.user.id).select('-password');

        if (!user || user.role !== USER) {
            return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};


// @desc    Update User's own profile (limited fields)
// @route   PUT /api/user/profile
// @access  Private (User only)
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    const { fullName, country, state, city } = req.body;

    try {
        let user = await User.findById(userId);
        if (!user || user.role !== USER) {
            return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
        }

        if (fullName) user.fullName = fullName;
        if (country) user.country = country;
        if (state) user.state = state;
        if (city) user.city = city;

        await user.save();

        res.status(OK).json({
            message: UPDATED_SUCCESS,
            user: user.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};


// --- KYC MANAGEMENT (User self-KYC) ---
// @desc    User submits their KYC application
// @route   POST /api/user/kyc
// @access  Private (User only)
exports.submitOwnKyc = async (req, res) => {
    const userId = req.user.id;
    const { adharCard, panCard, bankName, accountNumber, ifscCode } = req.body;

    // Check for required text fields
    if (!adharCard || !panCard || !bankName || !accountNumber || !ifscCode) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }
    // Check for required image files
    if (!req.files || !req.files.adharCardImage || !req.files.panCardImage || !req.files.passBookImage || !req.files.userImage) {
        return res.status(BAD_REQUEST).json({ message: IMAGE_UPLOAD_REQUIRED, errorCode: "IMAGE_MISSING" });
    }

    let adharCardImageURL, panCardImageURL, passBookImageURL, userImageURL;

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== USER) {
            return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
        }

        const existingKyc = await Kyc.findOne({ userId });
        if (existingKyc) {
            return res.status(CONFLICT).json({ message: KYC_ALREADY_SUBMITTED, errorCode: "KYC_ALREADY_EXISTS" });
        }

        // Upload images to DigitalOcean Spaces
        adharCardImageURL = await uploadFileToSpaces(req.files.adharCardImage[0], 'kyc-documents');
        panCardImageURL = await uploadFileToSpaces(req.files.panCardImage[0], 'kyc-documents');
        passBookImageURL = await uploadFileToSpaces(req.files.passBookImage[0], 'kyc-documents');
        userImageURL = await uploadFileToSpaces(req.files.userImage[0], 'kyc-documents');

        const newKyc = new Kyc({
            userId,
            adharCard, panCard, bankName, accountNumber, ifscCode,
            adharCardImage: adharCardImageURL,
            panCardImage: panCardImageURL,
            passBookImage: passBookImageURL,
            userImage: userImageURL,
            status: 'Pending', // Self-submitted KYC is Pending for admin approval
            approvedBy: null
        });

        await newKyc.save();

        res.status(CREATED).json({ message: KYC_CREATED_SUCCESS, kyc: newKyc });

    } catch (error) {
        console.error("Error submitting user's own KYC:", error);
        // Clean up uploaded images if saving to DB fails
        if (adharCardImageURL) await deleteFileFromSpaces(adharCardImageURL);
        if (panCardImageURL) await deleteFileFromSpaces(panCardImageURL);
        if (passBookImageURL) await deleteFileFromSpaces(passBookImageURL);
        if (userImageURL) await deleteFileFromSpaces(userImageURL);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get User's own KYC status
// @route   GET /api/user/kyc
// @access  Private (User only)
exports.getOwnKycStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const kycRecord = await Kyc.findOne({ userId });
        if (!kycRecord) {
            return res.status(NOT_FOUND).json({ message: KYC_NOT_FOUND, errorCode: "KYC_NOT_FOUND_FOR_USER" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, kycRecord });
    } catch (error) {
        console.error("Error fetching user's own KYC:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- LOAN MANAGEMENT (User applies for loans) ---
// @desc    User applies for a loan
// @route   POST /api/user/loans
// @access  Private (User only)
// exports.applyOwnLoan = async (req, res) => {
//     const userId = req.user.id;
//     const { requestedAmount } = req.body;

//     if (!requestedAmount || requestedAmount < 2000) {
//         return res.status(BAD_REQUEST).json({ message: "Requested amount is required and must be at least 2000.", errorCode: "INVALID_LOAN_AMOUNT" });
//     }

//     try {
//         const user = await User.findById(userId);
//         if (!user || user.role !== USER) {
//             return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
//         }

//         // Check if user has approved KYC
//         const kycRecord = await Kyc.findOne({ userId, status: 'Approved' });
//         if (!kycRecord) {
//             return res.status(FORBIDDEN).json({ message: LOAN_ELIGIBILITY_CHECK + " (KYC not approved).", errorCode: "KYC_PENDING_OR_REJECTED" });
//         }

//         // Determine loan eligibility package and amount range
//         const lastLoan = await Loan.findOne({ userId, status: 'Approved' }).sort({ createdAt: -1 });
//         const lastLoanAmount = lastLoan ? lastLoan.approvedAmount : 0;
//         const { min: eligibleMin, max: eligibleMax } = calculateLoanEligibility(lastLoanAmount);

//         if (requestedAmount < eligibleMin || requestedAmount > eligibleMax) {
//             return res.status(BAD_REQUEST).json({
//                 message: `${LOAN_AMOUNT_INVALID} Eligible loan amount is between ${eligibleMin} and ${eligibleMax}.`,
//                 errorCode: "LOAN_AMOUNT_OUT_OF_RANGE"
//             });
//         }

//         // Find a package that matches the requested amount
//         const loanPackage = await Package.findOne({
//             type: 'loan',
//             status: 'active',
//             minLoanAmount: { $lte: requestedAmount },
//             maxLoanAmount: { $gte: requestedAmount }
//         });

//         if (!loanPackage) {
//             return res.status(NOT_FOUND).json({ message: "No suitable loan package found for this amount.", errorCode: "NO_SUITABLE_PACKAGE" });
//         }

//         const newLoan = new Loan({
//             userId,
//             loanPackage: loanPackage._id,
//             requestedAmount,
//             status: 'Pending', // All loan applications need admin approval
//             isFirstLoan: lastLoanAmount === 0,
//             installmentDurationMonths: loanPackage.installmentMonths // <--- ADDED THIS LINE
//         });

//         await newLoan.save();

//         res.status(CREATED).json({ message: LOAN_APPLIED_SUCCESS, loan: newLoan });
//     } catch (error) {
//         console.error("Error applying for own loan:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

// exports.applyOwnLoan = async (req, res) => {
//     const userId = req.user.id;
//     const { requestedAmount } = req.body;

//     if (!requestedAmount || requestedAmount < 2000) {
//         return res.status(BAD_REQUEST).json({ message: "Requested amount is required and must be at least 2000.", errorCode: "INVALID_LOAN_AMOUNT" });
//     }

//     try {
//         const user = await User.findById(userId);
//         if (!user || user.role !== USER) {
//             return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
//         }

//         const kycRecord = await Kyc.findOne({ userId, status: 'Approved' });
//         if (!kycRecord) {
//             return res.status(FORBIDDEN).json({ message: LOAN_ELIGIBILITY_CHECK + " (KYC not approved).", errorCode: "KYC_PENDING_OR_REJECTED" });
//         }

//         const lastLoan = await Loan.findOne({ userId, status: 'Approved' }).sort({ createdAt: -1 });
//         const lastLoanAmount = lastLoan ? lastLoan.approvedAmount : 0;
//         const { min: eligibleMin, max: eligibleMax } = calculateLoanEligibility(lastLoanAmount);

//         if (requestedAmount < eligibleMin || requestedAmount > eligibleMax) {
//             return res.status(BAD_REQUEST).json({
//                 message: `${LOAN_AMOUNT_INVALID} Eligible loan amount is between ${eligibleMin} and ${eligibleMax}.`,
//                 errorCode: "LOAN_AMOUNT_OUT_OF_RANGE"
//             });
//         }

//         const loanPackage = await Package.findOne({
//             type: 'loan',
//             status: 'active',
//             minLoanAmount: { $lte: requestedAmount },
//             maxLoanAmount: { $gte: requestedAmount }
//         });

//         if (!loanPackage) {
//             return res.status(NOT_FOUND).json({ message: "No suitable loan package found for this amount.", errorCode: "NO_SUITABLE_PACKAGE" });
//         }

//         const newLoan = new Loan({
//             userId,
//             loanPackage: loanPackage._id,
//             requestedAmount,
//             status: 'Pending',
//             isFirstLoan: lastLoanAmount === 0,
//             installmentDurationMonths: loanPackage.installmentMonths,
//             // ADDED: Save the interest rate from the package at the time of application
//             interestRate: loanPackage.interestRate
//         });

//         await newLoan.save();

//         res.status(CREATED).json({ message: LOAN_APPLIED_SUCCESS, loan: newLoan });
//     } catch (error) {
//         console.error("Error applying for own loan:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

exports.applyOwnLoan = async (req, res) => {
    const userId = req.user.id;
    // CHANGE: requestedAmount is still needed for validation, but logic is now based on plan level
    const { requestedAmount } = req.body;

    if (!requestedAmount || requestedAmount <= 0) {
        return res.status(BAD_REQUEST).json({ message: "A valid requested amount is required.", errorCode: "INVALID_LOAN_AMOUNT" });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== USER) {
            return res.status(NOT_FOUND).json({ message: USER_NOT_FOUND, errorCode: "USER_NOT_FOUND" });
        }

        const kycRecord = await Kyc.findOne({ userId, status: 'Approved' });
        if (!kycRecord) {
            return res.status(FORBIDDEN).json({ message: "Loan eligibility requires approved KYC.", errorCode: "KYC_PENDING_OR_REJECTED" });
        }

        // CHANGE: Find the package based on the user's current plan level
        const eligiblePackage = await Package.findOne({
            type: 'loan',
            status: 'active',
            planLevel: user.currentPlanLevel
        });

        if (!eligiblePackage) {
            return res.status(NOT_FOUND).json({ message: "No loan plan available for your current level. You may have completed all plans.", errorCode: "NO_SUITABLE_PACKAGE" });
        }

        // CHANGE: Validate the requested amount against the specific eligible package
        if (requestedAmount < eligiblePackage.minLoanAmount || requestedAmount > eligiblePackage.maxLoanAmount) {
            return res.status(BAD_REQUEST).json({
                message: `Requested amount is outside the eligible range for your current plan (Plan ${user.currentPlanLevel}).`,
                errorCode: "LOAN_AMOUNT_OUT_OF_RANGE"
            });
        }

        // Check if there's already an active (not Repaid) loan
        const existingActiveLoan = await Loan.findOne({ userId, status: { $ne: 'Repaid' } });
        if (existingActiveLoan) {
            return res.status(CONFLICT).json({ message: "You already have an active or pending loan. Please repay it before applying for a new one.", errorCode: "ACTIVE_LOAN_EXISTS" });
        }

        const newLoan = new Loan({
            userId,
            loanPackage: eligiblePackage._id,
            requestedAmount,
            status: 'Pending',
            isFirstLoan: user.currentPlanLevel === 1,
            installmentDurationMonths: eligiblePackage.installmentMonths,
            interestRate: eligiblePackage.interestRate
        });

        await newLoan.save();

        res.status(CREATED).json({ message: LOAN_APPLIED_SUCCESS, loan: newLoan });
    } catch (error) {
        console.error("Error applying for own loan:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get User's own loan applications
// @route   GET /api/user/loans
// @access  Private (User only)
exports.getOwnLoanApplications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;
        const query = { userId };
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const loans = await Loan.find(query)
            .populate('loanPackage')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ applicationDate: -1 });

        const totalLoans = await Loan.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalLoans,
            totalPages: Math.ceil(totalLoans / parseInt(limit)),
            currentPage: parseInt(page),
            loans
        });
    } catch (error) {
        console.error("Error fetching user's own loan applications:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get User's specific loan details and installments
// @route   GET /api/user/loans/:loanId
// @access  Private (User only)
exports.getOwnLoanDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { loanId } = req.params;

        const loan = await Loan.findOne({ _id: loanId, userId })
            .populate('loanPackage');
        if (!loan) {
            return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND_FOR_USER" });
        }

        const installments = await Installment.find({ loanId }).sort({ dueDate: 1 });

        // Categorize installments
        const now = new Date();
        const categorizedInstallments = {
            current: [],
            upcoming: [],
            previous: []
        };

        installments.forEach(inst => {
            if (inst.status === 'Paid') {
                categorizedInstallments.previous.push(inst);
            } else if (inst.dueDate < now) {
                inst.status = 'Overdue'; // Mark as overdue if not paid and due date passed
                categorizedInstallments.previous.push(inst);
            } else if (inst.dueDate >= new Date(now.getFullYear(), now.getMonth(), 1) && inst.dueDate <= new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)) {
                categorizedInstallments.current.push(inst);
            } else {
                categorizedInstallments.upcoming.push(inst);
            }
        });


        res.status(OK).json({ message: FETCH_SUCCESS, loan, categorizedInstallments });
    } catch (error) {
        console.error("Error fetching user's own loan details:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- PAYMENT MANAGEMENT (User submits payment screenshots) ---
// @desc    User submits payment screenshot for an installment
// @route   POST /api/user/installments/:installmentId/payments
// @access  Private (User only)
exports.submitOwnInstallmentPayment = async (req, res) => {
    const userId = req.user.id;
    const { installmentId } = req.params;
    const { amountPaid, paymentDate } = req.body;

    if (!amountPaid || amountPaid <= 0 || !paymentDate) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED + " (amountPaid, paymentDate)", errorCode: "MISSING_PAYMENT_FIELDS" });
    }
    if (!req.file) {
        return res.status(BAD_REQUEST).json({ message: "Payment screenshot is required.", errorCode: "SCREENSHOT_MISSING" });
    }

    let paymentScreenshotURL;

    try {
        const installment = await Installment.findById(installmentId).populate('loanId');
        if (!installment || installment.userId.toString() !== userId) {
            return res.status(NOT_FOUND).json({ message: INSTALLMENT_NOT_FOUND, errorCode: "INSTALLMENT_NOT_FOUND_FOR_USER" });
        }
        if (installment.status === 'Paid') {
            return res.status(CONFLICT).json({ message: INSTALLMENT_ALREADY_PAID, errorCode: "INSTALLMENT_ALREADY_PAID" });
        }

        // Ensure amountPaid matches or is close to amountDue for this installment
        if (Math.abs(installment.amountDue - amountPaid) > 0.01) { // Allow slight floating point differences
            return res.status(BAD_REQUEST).json({
                message: `Amount paid (${amountPaid}) does not match expected installment amount (${installment.amountDue}).`,
                errorCode: "AMOUNT_MISMATCH"
            });
        }

        // Check if a payment for this installment is already pending or approved
        const existingPayment = await Payment.findOne({ installmentId });
        if (existingPayment && existingPayment.status !== 'Rejected') {
            return res.status(CONFLICT).json({ message: `A payment for this installment is already ${existingPayment.status.toLowerCase()}.`, errorCode: "PAYMENT_ALREADY_EXISTS" });
        }


        paymentScreenshotURL = await uploadFileToSpaces(req.file, 'payment-screenshots');

        const newPayment = new Payment({
            installmentId: installment._id,
            loanId: installment.loanId._id,
            userId: userId,
            amountPaid,
            paymentScreenshot: paymentScreenshotURL,
            paymentDate: new Date(paymentDate),
            submittedBy: userId,
            status: 'Pending' // Always pending for Admin approval
        });

        await newPayment.save();

        // Update installment status to 'Pending' (waiting for payment approval)
        installment.status = 'Pending';
        await installment.save();

        res.status(CREATED).json({ message: PAYMENT_UPLOADED_SUCCESS, payment: newPayment });
    } catch (error) {
        console.error("Error submitting payment for installment by user:", error);
        if (paymentScreenshotURL) await deleteFileFromSpaces(paymentScreenshotURL);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// NEW: @desc    Get all payments for the authenticated user
// @route   GET /api/user/payments
// @access  Private (User only)
exports.getOwnPayments = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from authenticated token
        const { status, page = 1, limit = 10 } = req.query;
        const query = { userId: userId }; // Filter by current user's ID

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('userId', 'fullName email') // Populate user details
            .populate('loanId', 'approvedAmount totalAmountToRepay') // Populate loan details
            .populate('installmentId', 'amountDue dueDate installmentNumber') // Populate installment details
            .populate('submittedBy', 'fullName role') // Populate who submitted (should be the user themselves)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ paymentDate: -1 });

        const totalPayments = await Payment.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalPayments,
            totalPages: Math.ceil(totalPayments / parseInt(limit)),
            currentPage: parseInt(page),
            payments
        });
    } catch (error) {
        console.error("Error fetching user's own payments:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};
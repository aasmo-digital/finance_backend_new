const User = require('../models/user.model');
const Package = require('../models/package.model');
const Kyc = require('../models/kyc.model');
const Loan = require('../models/loan.model');
const Payment = require('../models/payment.model');
const Installment = require('../models/installment.model'); // For agent to view installments
const { uploadFileToSpaces, deleteFileFromSpaces } = require('../config/s3');
const { calculateLoanEligibility, calculateInstallmentDuration, calculateInstallments } = require('../utils/loanCalculator');
const {
    OK, CREATED, BAD_REQUEST, NOT_FOUND, CONFLICT, INTERNAL_SERVER_ERROR
} = require('../constants/statusCodes');
const {
    ALL_FIELDS_REQUIRED,
    FETCH_SUCCESS,
    NOT_FOUND: NOT_FOUND_MSG,
    SERVER_ERROR,
    USER_EXISTS,
    USER_CREATED_BY_AGENT,
    UPDATED_SUCCESS,
    AGENT_NOT_FOUND,
    AGENT_LIMIT_REACHED,
    AGENT_INVALID_PACKAGE,
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
const { USER, AGENT } = require('../constants/roles');

// --- AGENT PROFILE MANAGEMENT ---
// @desc    Get Agent's own profile
// @route   GET /api/agent/profile
// @access  Private (Agent only)
exports.getAgentProfile = async (req, res) => {
    try {
        const agent = await User.findById(req.user.id)
            .populate('packageId', 'title maxUsers price')
            .select('-password');
        if (!agent || agent.role !== AGENT) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, agent });
    } catch (error) {
        console.error("Error fetching agent profile:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Update Agent's own profile
// @route   PUT /api/agent/profile
// @access  Private (Agent only)
exports.updateAgentProfile = async (req, res) => {
    const agentId = req.user.id;
    const {
        fullName, phone, email, country, state, city,
        bankName, bankAccountNumber, ifscCode, packageId
    } = req.body;

    let shopImageUploadUrl, profileImageUploadUrl;
    let oldShopImageUrl, oldProfileImageUrl;

    try {
        let agent = await User.findById(agentId);
        if (!agent || agent.role !== AGENT) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }

        // Check for duplicate email if updating email
        if (email && email !== agent.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists && emailExists._id.toString() !== agentId) {
                return res.status(CONFLICT).json({ message: AGENT_EXISTS, errorCode: "EMAIL_TAKEN" });
            }
        }

        // Handle image updates
        if (req.files && req.files.shopImage) {
            oldShopImageUrl = agent.shopImage;
            shopImageUploadUrl = await uploadFileToSpaces(req.files.shopImage[0], 'agent-shop-images');
            agent.shopImage = shopImageUploadUrl;
        }
        if (req.files && req.files.profileImage) {
            oldProfileImageUrl = agent.profileImage;
            profileImageUploadUrl = await uploadFileToSpaces(req.files.profileImage[0], 'agent-profile-images');
            agent.profileImage = profileImageUploadUrl;
        }

        // Update fields
        if (fullName) agent.fullName = fullName;
        if (phone) agent.phone = phone;
        if (email) agent.email = email;
        if (country) agent.country = country;
        if (state) agent.state = state;
        if (city) agent.city = city;
        if (bankName) agent.bankName = bankName;
        if (bankAccountNumber) agent.bankAccountNumber = bankAccountNumber;
        if (ifscCode) agent.ifscCode = ifscCode;
        if (packageId && agent.packageId.toString() !== packageId) { // Allow updating package, but requires admin approval/logic
            // For now, disallow agent to change package themselves without admin interaction
            // Or add logic to notify admin for package change request
            return res.status(FORBIDDEN).json({ message: "Agent cannot change package directly.", errorCode: "PACKAGE_CHANGE_FORBIDDEN" });
        }

        await agent.save();

        // Delete old images from S3 if new ones were uploaded successfully
        if (oldShopImageUrl && shopImageUploadUrl) await deleteFileFromSpaces(oldShopImageUrl);
        if (oldProfileImageUrl && profileImageUploadUrl) await deleteFileFromSpaces(oldProfileImageUrl);

        res.status(OK).json({
            message: UPDATED_SUCCESS,
            agent: agent.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
        });
    } catch (error) {
        console.error("Error updating agent profile:", error);
        // Clean up new uploads if DB save didn't happen
        if (shopImageUploadUrl && !agent) await deleteFileFromSpaces(shopImageUploadUrl);
        if (profileImageUploadUrl && !agent) await deleteFileFromSpaces(profileImageUploadUrl);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};


// --- USER MANAGEMENT (Agent creates users) ---
// @desc    Add a user by Agent
// @route   POST /api/agent/users
// @access  Private (Agent only)
exports.addUserByAgent = async (req, res) => {
    const { fullName, email, password, country, state, city } = req.body;
    const agentId = req.user.id;

    if (!fullName || !email || !password || !country || !state || !city) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    try {
        const agent = await User.findById(agentId).populate('packageId');
        if (!agent || agent.role !== AGENT) {
            return res.status(FORBIDDEN).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_INVALID" });
        }
        if (!agent.packageId || agent.packageId.type !== 'agent' || agent.packageId.status !== 'active') {
            return res.status(FORBIDDEN).json({ message: AGENT_INVALID_PACKAGE, errorCode: "AGENT_NO_ACTIVE_PACKAGE" });
        }
        if (agent.usersRegisteredCount >= agent.packageId.maxUsers) {
            return res.status(FORBIDDEN).json({ message: AGENT_LIMIT_REACHED, errorCode: "AGENT_USER_LIMIT_REACHED" });
        }

        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "USER_EXISTS" });
        }

        const newUser = new User({
            fullName, email, password, country, state, city,
            byAgentOrAdmin: true,
            status: "Active", // Agent created users are Active by default
            role: USER,
            createdBy: agentId // Agent's ID
        });

        await newUser.save();

        // Increment agent's user count
        agent.usersRegisteredCount += 1;
        await agent.save();

        res.status(CREATED).json({ message: USER_CREATED_BY_AGENT, user: newUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }) });
    } catch (error) {
        console.error("Error during user creation by agent:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get all users created by the logged-in agent
// @route   GET /api/agent/users
// @access  Private (Agent only)
exports.getAllUsersByAgent = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { search, page = 1, limit = 10, status } = req.query;

        const query = { createdBy: agentId, role: USER };
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const createdUsers = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const totalUsers = await User.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalUsers,
            totalPages: Math.ceil(totalUsers / parseInt(limit)),
            currentPage: parseInt(page),
            users: createdUsers
        });
    } catch (error) {
        console.error("Error fetching users created by agent:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get a single user created by the logged-in agent
// @route   GET /api/agent/users/:id
// @access  Private (Agent only)
exports.getUserByAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const agentId = req.user.id;

        const user = await User.findOne({ _id: id, createdBy: agentId, role: USER })
            .populate('currentLoanEligibilityPackage')
            .select('-password');

        if (!user) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND_BY_AGENT" });
        }

        const loans = await Loan.find({ userId: id }).populate('loanPackage');
        const kyc = await Kyc.findOne({ userId: id });

        res.status(OK).json({ message: FETCH_SUCCESS, user, loans, kyc });
    } catch (error) {
        console.error("Error fetching user by agent:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- KYC MANAGEMENT (Agent applies KYC for their users) ---
// @desc    Agent submits KYC for a user they created
// @route   POST /api/agent/users/:userId/kyc
// @access  Private (Agent only)
exports.submitKycForUser = async (req, res) => {
    const { userId } = req.params; // The user for whom KYC is being submitted
    const agentId = req.user.id;
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
        const user = await User.findOne({ _id: userId, createdBy: agentId, role: USER });
        if (!user) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND_BY_AGENT" });
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

        // KYC for agent-created users is auto-approved
        const newKyc = new Kyc({
            userId,
            adharCard, panCard, bankName, accountNumber, ifscCode,
            adharCardImage: adharCardImageURL,
            panCardImage: panCardImageURL,
            passBookImage: passBookImageURL,
            userImage: userImageURL,
            status: 'Approved', // Auto-approved for agent-created users
            approvedBy: agentId
        });

        await newKyc.save();

        res.status(CREATED).json({ message: KYC_CREATED_SUCCESS, kyc: newKyc });

    } catch (error) {
        console.error("Error submitting KYC for user by agent:", error);
        // Clean up uploaded images if saving to DB fails
        if (adharCardImageURL) await deleteFileFromSpaces(adharCardImageURL);
        if (panCardImageURL) await deleteFileFromSpaces(panCardImageURL);
        if (passBookImageURL) await deleteFileFromSpaces(passBookImageURL);
        if (userImageURL) await deleteFileFromSpaces(userImageURL);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// --- LOAN MANAGEMENT (Agent applies for loans for their users) ---
// @desc    Agent applies for a loan on behalf of a user
// @route   POST /api/agent/users/:userId/loans
// @access  Private (Agent only)
// exports.applyLoanForUser = async (req, res) => {
//     const { userId } = req.params;
//     const { requestedAmount } = req.body;
//     const agentId = req.user.id;

//     if (!requestedAmount || requestedAmount < 2000) {
//         return res.status(BAD_REQUEST).json({ message: "Requested amount is required and must be at least 2000.", errorCode: "INVALID_LOAN_AMOUNT" });
//     }

//     try {
//         const user = await User.findOne({ _id: userId, createdBy: agentId, role: USER });
//         if (!user) {
//             return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND_BY_AGENT" });
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
//             isFirstLoan: lastLoanAmount === 0
//         });

//         await newLoan.save();

//         res.status(CREATED).json({ message: LOAN_APPLIED_SUCCESS, loan: newLoan });
//     } catch (error) {
//         console.error("Error applying for loan by agent:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };


exports.applyLoanForUser = async (req, res) => {
    const { userId } = req.params;
    const { requestedAmount } = req.body;
    const agentId = req.user.id;

    if (!requestedAmount || requestedAmount < 2000) {
        return res.status(BAD_REQUEST).json({ message: "Requested amount is required and must be at least 2000.", errorCode: "INVALID_LOAN_AMOUNT" });
    }

    try {
        const user = await User.findOne({ _id: userId, createdBy: agentId, role: USER });
        if (!user) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND_BY_AGENT" });
        }

        const kycRecord = await Kyc.findOne({ userId, status: 'Approved' });
        if (!kycRecord) {
            return res.status(FORBIDDEN).json({ message: LOAN_ELIGIBILITY_CHECK + " (KYC not approved).", errorCode: "KYC_PENDING_OR_REJECTED" });
        }

        const lastLoan = await Loan.findOne({ userId, status: 'Approved' }).sort({ createdAt: -1 });
        const lastLoanAmount = lastLoan ? lastLoan.approvedAmount : 0;
        const { min: eligibleMin, max: eligibleMax } = calculateLoanEligibility(lastLoanAmount);

        if (requestedAmount < eligibleMin || requestedAmount > eligibleMax) {
            return res.status(BAD_REQUEST).json({
                message: `${LOAN_AMOUNT_INVALID} Eligible loan amount is between ${eligibleMin} and ${eligibleMax}.`,
                errorCode: "LOAN_AMOUNT_OUT_OF_RANGE"
            });
        }

        const loanPackage = await Package.findOne({
            type: 'loan',
            status: 'active',
            minLoanAmount: { $lte: requestedAmount },
            maxLoanAmount: { $gte: requestedAmount }
        });

        if (!loanPackage) {
            return res.status(NOT_FOUND).json({ message: "No suitable loan package found for this amount.", errorCode: "NO_SUITABLE_PACKAGE" });
        }

        const newLoan = new Loan({
            userId,
            loanPackage: loanPackage._id,
            requestedAmount,
            status: 'Pending',
            isFirstLoan: lastLoanAmount === 0,
            // ADDED: Save the interest rate from the package at the time of application
            interestRate: loanPackage.interestRate
        });

        await newLoan.save();

        res.status(CREATED).json({ message: LOAN_APPLIED_SUCCESS, loan: newLoan });
    } catch (error) {
        console.error("Error applying for loan by agent:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};


// @desc    Get all loans for users created by the agent
// @route   GET /api/agent/loans
// @access  Private (Agent only)
exports.getAgentUsersLoans = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { search, status, page = 1, limit = 10 } = req.query;

        // Find users created by this agent
        const agentUsers = await User.find({ createdBy: agentId, role: USER }).select('_id');
        const agentUserIds = agentUsers.map(u => u._id);

        if (agentUserIds.length === 0) {
            return res.status(OK).json({ message: FETCH_SUCCESS, totalLoans: 0, totalPages: 0, currentPage: parseInt(page), loans: [] });
        }

        const query = { userId: { $in: agentUserIds } };
        if (status) query.status = status;
        if (search) {
            const searchUsers = await User.find({
                _id: { $in: agentUserIds },
                $or: [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
            }).select('_id');
            const searchUserIds = searchUsers.map(u => u._id);
            query.userId = { $in: searchUserIds };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const loans = await Loan.find(query)
            .populate('userId', 'fullName email')
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
        console.error("Error fetching agent's users' loans:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get a specific loan application for a user created by the agent
// @route   GET /api/agent/loans/:loanId
// @access  Private (Agent only)
exports.getAgentUserLoanById = async (req, res) => {
    try {
        const { loanId } = req.params;
        const agentId = req.user.id;

        const loan = await Loan.findById(loanId)
            .populate('userId', 'fullName email createdBy')
            .populate('loanPackage');

        if (!loan || loan.userId.createdBy.toString() !== agentId.toString()) {
            return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND_FOR_AGENT" });
        }

        const installments = await Installment.find({ loanId }).sort({ dueDate: 1 });

        res.status(OK).json({ message: FETCH_SUCCESS, loan, installments });
    } catch (error) {
        console.error("Error fetching agent's user's loan by ID:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- PAYMENT MANAGEMENT (Agent submits payment screenshots) ---
// @desc    Agent submits payment screenshot for a user's installment
// @route   POST /api/agent/users/:userId/installments/:installmentId/payments
// @access  Private (Agent only)
exports.submitInstallmentPayment = async (req, res) => {
    const { userId, installmentId } = req.params;
    const agentId = req.user.id;
    const { amountPaid, paymentDate } = req.body;

    if (!amountPaid || amountPaid <= 0 || !paymentDate) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED + " (amountPaid, paymentDate)", errorCode: "MISSING_PAYMENT_FIELDS" });
    }
    if (!req.file) {
        return res.status(BAD_REQUEST).json({ message: "Payment screenshot is required.", errorCode: "SCREENSHOT_MISSING" });
    }

    let paymentScreenshotURL;

    try {
        const user = await User.findOne({ _id: userId, createdBy: agentId, role: USER });
        if (!user) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND_BY_AGENT" });
        }

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
            userId: user._id,
            amountPaid,
            paymentScreenshot: paymentScreenshotURL,
            paymentDate: new Date(paymentDate),
            submittedBy: agentId,
            status: 'Pending' // Always pending for Admin approval
        });

        await newPayment.save();

        // Update installment status to 'Pending' (waiting for payment approval)
        installment.status = 'Pending';
        await installment.save();

        res.status(CREATED).json({ message: PAYMENT_UPLOADED_SUCCESS, payment: newPayment });
    } catch (error) {
        console.error("Error submitting payment for installment by agent:", error);
        if (paymentScreenshotURL) await deleteFileFromSpaces(paymentScreenshotURL);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};
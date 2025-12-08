const User = require('../models/user.model');
const Package = require('../models/package.model');
const { generateToken } = require('../utils/jwt');
const {
    OK, CREATED, BAD_REQUEST, UNAUTHORIZED, CONFLICT, INTERNAL_SERVER_ERROR
} = require('../constants/statusCodes');
const {
    ALL_FIELDS_REQUIRED,
    USER_EXISTS,
    REGISTER_SUCCESS,
    LOGIN_SUCCESS,
    INVALID_CREDENTIALS,
    SERVER_ERROR,
    AGENT_EXISTS,
    AGENT_INVALID_PACKAGE,
    AGENT_NOT_FOUND
} = require('../constants/messages');
const { SUPER_ADMIN, ADMIN, AGENT, USER } = require('../constants/roles');
const { uploadFileToSpaces, deleteFileFromSpaces } = require('../config/s3'); // Import S3 functions

// @desc    Register a new Super Admin (Initial setup only)
// @route   POST /api/auth/superadmin/register
// @access  Public (should be protected in production, e.g., only one super admin)
exports.registerSuperAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "SUPERADMIN_EXISTS" });
        }

        user = new User({ email, password, role: SUPER_ADMIN, fullName: "Super Admin" });
        await user.save();

        res.status(CREATED).json({ message: REGISTER_SUCCESS, user: { id: user._id, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Error during super admin registration:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Register a new Admin (by Super Admin)
// @route   POST /api/superadmin/admin/register
// @access  Private (Super Admin only) - Actual endpoint in superadmin.controller.js
// This logic is for context, the implementation will be in superadmin.controller

// @desc    Register a new Agent
// @route   POST /api/auth/agent/register
// @access  Public (Agent self-registration)
exports.registerAgent = async (req, res) => {
    const {
        fullName, phone, email, password, country, state, city,
        bankName, bankAccountNumber, ifscCode, packageId
    } = req.body;

    if (!fullName || !phone || !email || !password || !country || !state || !city ||
        !bankName || !bankAccountNumber || !ifscCode || !packageId) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    if (!req.files || !req.files.shopImage || !req.files.profileImage) {
        return res.status(BAD_REQUEST).json({ message: "Shop image and profile image are required.", errorCode: "IMAGE_MISSING" });
    }

    let shopImageUploadUrl, profileImageUploadUrl;

    try {
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(CONFLICT).json({ message: AGENT_EXISTS, errorCode: "AGENT_EXISTS" });
        }

        const agentPackage = await Package.findById(packageId);
        if (!agentPackage || agentPackage.type !== 'agent' || agentPackage.status !== 'active') {
            return res.status(BAD_REQUEST).json({ message: AGENT_INVALID_PACKAGE, errorCode: "INVALID_PACKAGE" });
        }

        // Upload images to DigitalOcean Spaces
        shopImageUploadUrl = await uploadFileToSpaces(req.files.shopImage[0], 'agent-shop-images');
        profileImageUploadUrl = await uploadFileToSpaces(req.files.profileImage[0], 'agent-profile-images');

        const newUser = new User({
            fullName, phone, email, password, country, state, city,
            bankName, bankAccountNumber, ifscCode, packageId,
            shopImage: shopImageUploadUrl,
            profileImage: profileImageUploadUrl,
            role: AGENT,
            status: 'Inactive' // Agents created via self-registration might need admin approval
        });

        await newUser.save();

        res.status(CREATED).json({
            message: REGISTER_SUCCESS,
            user: { id: newUser._id, email: newUser.email, role: newUser.role, status: newUser.status }
        });

    } catch (error) {
        console.error("Error during agent registration:", error.message);
        // Clean up uploaded images if saving to DB fails
        if (shopImageUploadUrl) await deleteFileFromSpaces(shopImageUploadUrl);
        if (profileImageUploadUrl) await deleteFileFromSpaces(profileImageUploadUrl);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Register a new User (self-registration)
// @route   POST /api/auth/user/register
// @access  Public
// exports.registerUser = async (req, res) => {
//     const { fullName, email, password, country, state, city, phone  } = req.body;

//     if (!fullName || !email || !password || !country || !state || !city) {
//         return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
//     }

//     try {
//         let existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "USER_EXISTS" });
//         }

//         const newUser = new User({
//             fullName, email, password, country, state, city,
//             byAgentOrAdmin: false,
//             role: USER,
//             status: "Inactive", // Self-registered users are Inactive by default, require KYC and admin approval
//             createdBy: null // Not created by an agent/admin
//         });

//         await newUser.save();

//         res.status(CREATED).json({ message: REGISTER_SUCCESS, user: { id: newUser._id, email: newUser.email, role: newUser.role, status: newUser.status } });
//     } catch (error) {
//         console.error("Error during user registration:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

exports.registerUser = async (req, res) => {
    // CHANGE 1: 'phone' को req.body से निकालें
    const { fullName, email, password, country, state, city, phone } = req.body;

    if (!fullName || !email || !password || !country || !state || !city) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    try {
        // ईमेल की जाँच करें
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "USER_EXISTS" });
        }

        // CHANGE 2: अगर फ़ोन नंबर दिया गया है, तो उसकी भी जाँच करें
        if (phone) {
            existingUser = await User.findOne({ phone });
            if (existingUser) {
                return res.status(CONFLICT).json({ message: "This phone number is already registered.", errorCode: "PHONE_EXISTS" });
            }
        }

        const newUser = new User({
            fullName,
            email,
            password,
            country,
            state,
            city,
            phone: phone || undefined, // CHANGE 3: फ़ोन नंबर को सेव करें
            byAgentOrAdmin: false,
            role: USER,
            status: "Inactive",
            createdBy: null
        });

        await newUser.save();

        res.status(CREATED).json({ message: REGISTER_SUCCESS, user: { id: newUser._id, email: newUser.email, role: newUser.role, status: newUser.status } });
    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};


// @desc    Login for all roles
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(UNAUTHORIZED).json({ message: INVALID_CREDENTIALS, errorCode: "INVALID_CREDENTIALS" });
        }

        // Compare hashed password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(UNAUTHORIZED).json({ message: INVALID_CREDENTIALS, errorCode: "INVALID_CREDENTIALS" });
        }

        // Generate JWT token
        const token = generateToken({ id: user._id, email: user.email, role: user.role });

        res.status(OK).json({
            message: LOGIN_SUCCESS,
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};
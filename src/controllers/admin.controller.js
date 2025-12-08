// src/controllers/admin.controller.js
const User = require('../models/user.model');
const Package = require('../models/package.model');
const Kyc = require('../models/kyc.model');
const Loan = require('../models/loan.model');
const Installment = require('../models/installment.model');
const Payment = require('../models/payment.model');
const Commission = require('../models/commission.model');
const Setting = require('../models/setting.model');
const { uploadFileToSpaces, deleteFileFromSpaces } = require('../config/s3');
const { calculateInstallmentDuration, calculateInstallments, calculateLoanEligibility } = require('../utils/loanCalculator');
const {
    OK, CREATED, BAD_REQUEST, NOT_FOUND, CONFLICT, INTERNAL_SERVER_ERROR, FORBIDDEN
} = require('../constants/statusCodes');

const {
    ALL_FIELDS_REQUIRED,
    FETCH_SUCCESS,
    NOT_FOUND: NOT_FOUND_MSG,
    SERVER_ERROR,
    USER_EXISTS,
    USER_CREATED_BY_ADMIN,
    UPDATED_SUCCESS,
    DELETED_SUCCESS,
    STATUS_INVALID,
    PACKAGE_CREATED,
    PACKAGE_NOT_FOUND,
    PACKAGE_UPDATE_SUCCESS,
    PACKAGE_DELETE_SUCCESS,
    PACKAGE_TYPE_INVALID,
    AGENT_REGISTER_SUCCESS,
    AGENT_EXISTS,
    AGENT_INVALID_PACKAGE,
    AGENT_NOT_FOUND,
    KYC_NOT_FOUND,
    KYC_UPDATED_SUCCESS,
    KYC_DELETED_SUCCESS,
    KYC_STATUS_INVALID,
    LOAN_NOT_FOUND,
    LOAN_UPDATED_SUCCESS,
    LOAN_DELETED_SUCCESS,
    LOAN_STATUS_INVALID,
    LOAN_AMOUNT_INVALID,
    AMOUNT_MUST_BE_POSITIVE,
    COMMISSION_CREATED,
    COMMISSION_NOT_FOUND,
    COMMISSION_UPDATED,
    COMMISSION_DELETED,
    INSTALLMENT_NOT_FOUND,
    INSTALLMENT_STATUS_UPDATED,
    PAYMENT_NOT_FOUND,
    PAYMENT_STATUS_UPDATED,
    BALANCE_SHEET_FETCHED
} = require('../constants/messages');
const { USER, AGENT, ADMIN } = require('../constants/roles');
const { stringify } = require('csv-stringify'); // Add this
const PDFDocument = require('pdfkit'); // Add this

// --- USER MANAGEMENT (Admin creates users) ---
// @desc    Create a new user by Admin
// @route   POST /api/admin/users
// @access  Private (Admin only)
// exports.createUserByAdmin = async (req, res) => {
//     const { fullName, email, password, country, state, city } = req.body;

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
//             byAgentOrAdmin: true,
//             status: "Active", // Admin created users are Active by default
//             role: USER,
//             createdBy: req.user.id // Admin's ID
//         });

//         await newUser.save();

//         res.status(CREATED).json({ message: USER_CREATED_BY_ADMIN, user: newUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }) });
//     } catch (error) {
//         console.error("Error during user creation by admin:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

// exports.createUserByAdmin = async (req, res) => {
//     const { fullName, email, password, country, state, city } = req.body;

//     // 1. Basic Validation
//     if (!fullName || !email || !password || !country || !state || !city) {
//         return res.status(400).json({ message: "All fields are required", errorCode: "MISSING_FIELDS" });
//     }

//     // 2. Security Check: Admin ID hona zaroori hai
//     if (!req.user || !req.user.id) {
//         console.error("Error: Admin ID missing in req.user. Ensure middleware is working.");
//         return res.status(500).json({ message: "Authorization Error: Admin info missing", errorCode: "AUTH_ERROR" });
//     }

//     try {
//         let existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(409).json({ message: "User already exists", errorCode: "USER_EXISTS" });
//         }

//         const newUser = new User({
//             fullName, 
//             email, 
//             password, 
//             country, 
//             state, 
//             city,
//             byAgentOrAdmin: true,
//             status: "Active",
//             role: "User", // Ensure "User" constant matches correctly
//             createdBy: req.user.id,
//             phone: undefined // Explicitly set undefined taaki unique index null error na de
//         });

//         await newUser.save();

//         res.status(201).json({ 
//             message: "User created successfully by Admin", 
//             user: newUser.toObject({ 
//                 getters: true, 
//                 virtuals: false, 
//                 versionKey: false, 
//                 transform: (doc, ret) => { delete ret.password; return ret; } 
//             }) 
//         });

//     } catch (error) {
//         // Detailed error logging
//         console.error("Error during user creation by admin:", error);

//         // Agar Duplicate Key Error (E11000) hai to clear message bhejein
//         if (error.code === 11000) {
//             const field = Object.keys(error.keyValue)[0];
//             return res.status(409).json({ message: `Duplicate value for field: ${field}`, errorCode: "DUPLICATE_KEY" });
//         }

//         res.status(500).json({ message: "Server Error", errorCode: "SERVER_ERROR", error: error.message });
//     }
// };

// exports.createUserByAdmin = async (req, res) => {
//     const { fullName, email, password, country, state, city } = req.body;

//     if (!fullName || !email || !password || !country || !state || !city) {
//         return res.status(400).json({ message: "All fields are required", errorCode: "MISSING_FIELDS" });
//     }
//     if (!req.user || !req.user.id) {
//         console.error("Error: Admin ID missing in req.user. Ensure middleware is working.");
//         return res.status(500).json({ message: "Authorization Error: Admin info missing", errorCode: "AUTH_ERROR" });
//     }
//     try {
//         let existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(409).json({ message: "User already exists", errorCode: "USER_EXISTS" });
//         }
//         const newUser = new User({
//             fullName, email, password, country, state, city,
//             byAgentOrAdmin: true, status: "Active", role: "User",
//             createdBy: req.user.id, phone: undefined
//         });
//         await newUser.save();
//         res.status(201).json({
//             message: "User created successfully by Admin",
//             user: newUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
//         });
//     } catch (error) {
//         console.error("Error during user creation by admin:", error);
//         if (error.code === 11000) {
//             const field = Object.keys(error.keyValue)[0];
//             return res.status(409).json({ message: `Duplicate value for field: ${field}`, errorCode: "DUPLICATE_KEY" });
//         }
//         res.status(500).json({ message: "Server Error", errorCode: "SERVER_ERROR", error: error.message });
//     }
// };


// exports.createUserByAdmin = async (req, res) => {
//     // CHANGE 1: Destructure `phone` from the request body
//     const { fullName, email, password, country, state, city, phone } = req.body;

//     // 1. Basic Validation
//     if (!fullName || !email || !password || !country || !state || !city) {
//         return res.status(400).json({ message: "All fields are required", errorCode: "MISSING_FIELDS" });
//     }

//     // 2. Security Check: Admin ID hona zaroori hai
//     if (!req.user || !req.user.id) {
//         console.error("Error: Admin ID missing in req.user. Ensure middleware is working.");
//         return res.status(500).json({ message: "Authorization Error: Admin info missing", errorCode: "AUTH_ERROR" });
//     }

//     try {
//         let existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(409).json({ message: "User already exists", errorCode: "USER_EXISTS" });
//         }

//         const newUser = new User({
//             fullName,
//             email,
//             password,
//             country,
//             state,
//             city,
//             // CHANGE 2: Use the `phone` variable from the request body.
//             // If phone is not provided (e.g., empty string), it will be saved as such.
//             // The `sparse: true` index on the model handles uniqueness only for documents that HAVE the field.
//             phone: phone || undefined,
//             byAgentOrAdmin: true,
//             status: "Active",
//             role: "User", // Ensure "User" constant matches correctly
//             createdBy: req.user.id,
//         });

//         await newUser.save();

//         res.status(201).json({
//             message: "User created successfully by Admin",
//             user: newUser.toObject({
//                 getters: true,
//                 virtuals: false,
//                 versionKey: false,
//                 transform: (doc, ret) => { delete ret.password; return ret; }
//             })
//         });

//     } catch (error) {
//         // Detailed error logging
//         console.error("Error during user creation by admin:", error);

//         // Agar Duplicate Key Error (E11000) hai to clear message bhejein
//         if (error.code === 11000) {
//             const field = Object.keys(error.keyValue)[0];
//             // Provide a more specific message for phone
//             const message = field === 'phone'
//                 ? `This phone number is already registered. Please use another one.`
//                 : `Duplicate value for field: ${field}`;
//             return res.status(409).json({ message: message, errorCode: "DUPLICATE_KEY" });
//         }

//         res.status(500).json({ message: "Server Error", errorCode: "SERVER_ERROR", error: error.message });
//     }
// };

exports.createUserByAdmin = async (req, res) => {
    const { fullName, email, password, country, state, city, phone } = req.body;

    if (!fullName || !email || !password || !country || !state || !city) {
        return res.status(400).json({ message: "All fields are required", errorCode: "MISSING_FIELDS" });
    }

    if (!req.user || !req.user.id) {
        console.error("Error: Admin ID missing in req.user. Ensure middleware is working.");
        return res.status(500).json({ message: "Authorization Error: Admin info missing", errorCode: "AUTH_ERROR" });
    }

    try {
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists", errorCode: "USER_EXISTS" });
        }

        const newUser = new User({
            fullName,
            email,
            password,
            country,
            state,
            city,
            phone: phone || undefined,
            byAgentOrAdmin: true,
            status: "Active",
            // CHANGE: Use the imported constant `USER` which is 'user' (lowercase)
            role: USER,
            createdBy: req.user.id,
        });

        await newUser.save();

        res.status(201).json({
            message: "User created successfully by Admin",
            user: newUser.toObject({
                getters: true,
                virtuals: false,
                versionKey: false,
                transform: (doc, ret) => { delete ret.password; return ret; }
            })
        });

    } catch (error) {
        console.error("Error during user creation by admin:", error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const message = field === 'phone'
                ? `This phone number is already registered. Please use another one.`
                : `Duplicate value for field: ${field}`;
            return res.status(409).json({ message: message, errorCode: "DUPLICATE_KEY" });
        }

        res.status(500).json({ message: "Server Error", errorCode: "SERVER_ERROR", error: error.message });
    }
};

// @desc    Get all users (with optional search, pagination)
// @route   GET /api/admin/users
// @access  Private (Admin only)
// exports.getAllUsers = async (req, res) => {
//     try {
//         const { search, page = 1, limit = 10, status, createdByRole } = req.query;
//         const query = { role: USER };

//         if (search) {
//             query.$or = [
//                 { fullName: { $regex: search, $options: "i" } },
//                 { email: { $regex: search, $options: "i" } }
//             ];
//         }
//         if (status) query.status = status;

//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         const users = await User.find(query)
//             .populate('createdBy', 'fullName email role')
//             .select('-password')
//             .skip(skip)
//             .limit(parseInt(limit))
//             .sort({ createdAt: -1 });

//         const totalUsers = await User.countDocuments(query);

//         res.status(OK).json({
//             message: FETCH_SUCCESS,
//             totalUsers,
//             totalPages: Math.ceil(totalUsers / parseInt(limit)),
//             currentPage: parseInt(page),
//             users
//         });
//     } catch (error) {
//         console.error("Error fetching user profiles:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.getAllUsers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status, createdByRole } = req.query;
        const query = { role: USER };
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }
        if (status) query.status = status;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const users = await User.find(query)
            .populate('createdBy', 'fullName email role')
            .select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
        const totalUsers = await User.countDocuments(query);
        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalUsers,
            totalPages: Math.ceil(totalUsers / parseInt(limit)),
            currentPage: parseInt(page),
            users
        });
    } catch (error) {
        console.error("Error fetching user profiles:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
// exports.getUserById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const user = await User.findOne({ _id: id, role: USER })
//             .populate('createdBy', 'fullName email role')
//             .populate('currentLoanEligibilityPackage')
//             .select('-password');
//         if (!user) {
//             return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND" });
//         }

//         const loans = await Loan.find({ userId: id }).populate('loanPackage');
//         const kyc = await Kyc.findOne({ userId: id });

//         res.status(OK).json({ message: FETCH_SUCCESS, user, loans, kyc });
//     } catch (error) {
//         console.error("Error fetching user profile:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

// // @desc    Update user details by Admin
// // @route   PUT /api/admin/users/:id
// // @access  Private (Admin only)
// exports.updateUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { fullName, email, password, country, state, city, status } = req.body;

//         let existingUser = await User.findOne({ _id: id, role: USER });
//         if (!existingUser) {
//             return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND" });
//         }

//         if (email && email !== existingUser.email) {
//             const emailExists = await User.findOne({ email });
//             if (emailExists && emailExists._id.toString() !== id) {
//                 return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "EMAIL_TAKEN" });
//             }
//             existingUser.email = email;
//         }

//         if (fullName) existingUser.fullName = fullName;
//         if (country) existingUser.country = country;
//         if (state) existingUser.state = state;
//         if (city) existingUser.city = city;
//         if (status) existingUser.status = status;

//         if (password) {
//             existingUser.password = password;
//         }

//         await existingUser.save();

//         res.status(OK).json({ message: UPDATED_SUCCESS, user: existingUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }) });
//     } catch (error) {
//         console.error("Error updating user by admin:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

// constants import kar lena (agar file alag hai)
// const { USER, ADMIN, SUPER_ADMIN } = require('../constants/roles'); 


// 1. GET User By ID (Fix: Removed role restriction)
// exports.getUserById = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Change 1: 'role: USER' hata diya taaki Admin kisi ko bhi edit kar sake
//         const user = await User.findById(id)
//             .populate('createdBy', 'fullName email role')
//             .populate('currentLoanEligibilityPackage')
//             .select('-password');

//         if (!user) {
//             return res.status(NOT_FOUND).json({ message: "User not found", errorCode: "USER_NOT_FOUND" });
//         }

//         // Optional: Sirf normal users ke liye loans/kyc fetch karein
//         let loans = [];
//         let kyc = null;

//         // Agar Loan/KYC models exist karte hain tabhi fetch karein
//         try {
//              loans = await Loan.find({ userId: id }).populate('loanPackage');
//              kyc = await Kyc.findOne({ userId: id });
//         } catch (err) {
//             // Ignore error if specific to user type
//         }

//         res.status(OK).json({ message: "Fetch Success", user, loans, kyc });
//     } catch (error) {
//         console.error("Error fetching user profile:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: "Server Error", error: error.message });
//     }
// };


// exports.getUserById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const user = await User.findById(id)
//             .populate('createdBy', 'fullName email role')
//             .populate('currentLoanEligibilityPackage')
//             .select('-password');
//         if (!user) {
//             return res.status(NOT_FOUND).json({ message: "User not found", errorCode: "USER_NOT_FOUND" });
//         }
//         let loans = [];
//         let kyc = null;
//         try {
//             loans = await Loan.find({ userId: id }).populate('loanPackage');
//             kyc = await Kyc.findOne({ userId: id });
//         } catch (err) { }
//         res.status(OK).json({ message: "Fetch Success", user, loans, kyc });
//     } catch (error) {
//         console.error("Error fetching user profile:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: "Server Error", error: error.message });
//     }
// };

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        // CHANGE: Removed .populate('currentLoanEligibilityPackage')
        const user = await User.findById(id)
            .populate('createdBy', 'fullName email role')
            .select('-password');

        if (!user) {
            return res.status(NOT_FOUND).json({ message: "User not found", errorCode: "USER_NOT_FOUND" });
        }

        let loans = [];
        let kyc = null;

        try {
            loans = await Loan.find({ userId: id }).populate('loanPackage');
            kyc = await Kyc.findOne({ userId: id });
        } catch (err) {
            // Ignore error
        }

        res.status(OK).json({ message: "Fetch Success", user, loans, kyc });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: "Server Error", error: error.message });
    }
};

// 2. UPDATE User (Fix: Added Role update & Removed restriction)
// exports.updateUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         // Frontend se 'name' aa raha hai, par DB mein 'fullName' hai
//         const { fullName, name, email, password, country, state, city, status, role, phone } = req.body;

//         // Change 2: 'role: USER' hata diya
//         let existingUser = await User.findById(id);

//         if (!existingUser) {
//             return res.status(NOT_FOUND).json({ message: "User not found", errorCode: "USER_NOT_FOUND" });
//         }

//         // Email Check
//         if (email && email !== existingUser.email) {
//             const emailExists = await User.findOne({ email });
//             if (emailExists && emailExists._id.toString() !== id) {
//                 return res.status(CONFLICT).json({ message: "Email already taken", errorCode: "EMAIL_TAKEN" });
//             }
//             existingUser.email = email;
//         }

//         // Fields Update
//         // Change 3: 'name' aur 'fullName' dono check kiye
//         if (fullName) existingUser.fullName = fullName;
//         else if (name) existingUser.fullName = name;

//         if (country) existingUser.country = country;
//         if (state) existingUser.state = state;
//         if (city) existingUser.city = city;
//         if (status) existingUser.status = status;
//         if (phone) existingUser.phone = phone; // Phone add kiya

//         // Change 4: Role update logic add kiya
//         if (role) existingUser.role = role;

//         // Password Update
//         if (password && password.trim() !== "") {
//             // Note: Hashing User Model ke 'pre-save' hook mein ho rahi hogi.
//             // Agar wahan nahi hai, to yahan bcrypt.hash lagana padega.
//             existingUser.password = password; 
//         }

//         await existingUser.save();

//         res.status(OK).json({ 
//             message: "User updated successfully", 
//             user: existingUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } }) 
//         });

//     } catch (error) {
//         console.error("Error updating user by admin:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: "Server Error", errorCode: "SERVER_ERROR" });
//     }
// };


exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, name, email, password, country, state, city, status, role, phone } = req.body;
        let existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(NOT_FOUND).json({ message: "User not found", errorCode: "USER_NOT_FOUND" });
        }
        if (email && email !== existingUser.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists && emailExists._id.toString() !== id) {
                return res.status(CONFLICT).json({ message: "Email already taken", errorCode: "EMAIL_TAKEN" });
            }
            existingUser.email = email;
        }
        if (fullName) existingUser.fullName = fullName;
        else if (name) existingUser.fullName = name;
        if (country) existingUser.country = country;
        if (state) existingUser.state = state;
        if (city) existingUser.city = city;
        if (status) existingUser.status = status;
        if (phone) existingUser.phone = phone;
        if (role) existingUser.role = role;
        if (password && password.trim() !== "") {
            existingUser.password = password;
        }
        await existingUser.save();
        res.status(OK).json({
            message: "User updated successfully",
            user: existingUser.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
        });
    } catch (error) {
        console.error("Error updating user by admin:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: "Server Error", errorCode: "SERVER_ERROR" });
    }
};

// @desc    Delete user by Admin
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
// exports.deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const user = await User.findOne({ _id: id, role: USER });
//         if (!user) {
//             return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND" });
//         }

//         await User.findByIdAndDelete(id);

//         res.status(OK).json({ message: DELETED_SUCCESS });
//     } catch (error) {
//         console.error("Error deleting user:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };


exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ _id: id, role: USER });
        if (!user) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND_MSG, errorCode: "USER_NOT_FOUND" });
        }
        await User.findByIdAndDelete(id);
        res.status(OK).json({ message: DELETED_SUCCESS });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- PACKAGE MANAGEMENT ---
// @desc    Create a new package (loan or agent type)
// @route   POST /api/admin/packages
// @access  Private (Admin only)
// exports.createPackage = async (req, res) => {
//     const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, status } = req.body;

//     if (!title || !type) {
//         return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
//     }
//     if (!['loan', 'agent'].includes(type)) {
//         return res.status(BAD_REQUEST).json({ message: PACKAGE_TYPE_INVALID, errorCode: "INVALID_PACKAGE_TYPE" });
//     }

//     try {
//         let packageData;
//         if (type === 'loan') {
//             if (!minLoanAmount || !maxLoanAmount || !installmentMonths) {
//                 return res.status(BAD_REQUEST).json({ message: "Min/Max loan amount and installment months are required for loan packages.", errorCode: "MISSING_LOAN_PACKAGE_FIELDS" });
//             }
//             packageData = new Package({ title, description, type, minLoanAmount, maxLoanAmount, installmentMonths, status: status || 'inactive' });
//         } else { // type === 'agent'
//             if (!price || !validityInDays || !maxUsers) {
//                 return res.status(BAD_REQUEST).json({ message: "Price, validity in days, and max users are required for agent packages.", errorCode: "MISSING_AGENT_PACKAGE_FIELDS" });
//             }
//             packageData = new Package({ title, description, type, price, validityInDays, maxUsers, status: status || 'inactive' });
//         }

//         await packageData.save();
//         res.status(CREATED).json({ message: PACKAGE_CREATED, package: packageData });
//     } catch (error) {
//         console.error("Error creating package:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

// exports.createPackage = async (req, res) => {
//     // CHANGE: Destructure interestRate from req.body
//     const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, status } = req.body;

//     if (!title || !type) {
//         return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
//     }
//     if (!['loan', 'agent'].includes(type)) {
//         return res.status(BAD_REQUEST).json({ message: PACKAGE_TYPE_INVALID, errorCode: "INVALID_PACKAGE_TYPE" });
//     }

//     try {
//         let packageData;
//         if (type === 'loan') {
//             // CHANGE: Added validation for interestRate
//             if (!minLoanAmount || !maxLoanAmount || !installmentMonths || interestRate === undefined) {
//                 return res.status(BAD_REQUEST).json({ message: "Min/Max loan amount, installment months, and interest rate are required for loan packages.", errorCode: "MISSING_LOAN_PACKAGE_FIELDS" });
//             }
//             // CHANGE: Added interestRate to the new Package
//             packageData = new Package({ title, description, type, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, status: status || 'inactive' });
//         } else { // type === 'agent'
//             if (!price || !validityInDays || !maxUsers) {
//                 return res.status(BAD_REQUEST).json({ message: "Price, validity in days, and max users are required for agent packages.", errorCode: "MISSING_AGENT_PACKAGE_FIELDS" });
//             }
//             packageData = new Package({ title, description, type, price, validityInDays, maxUsers, status: status || 'inactive' });
//         }

//         await packageData.save();
//         res.status(CREATED).json({ message: PACKAGE_CREATED, package: packageData });
//     } catch (error) {
//         console.error("Error creating package:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };


exports.createPackage = async (req, res) => {
    // ADDED: planLevel
    const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, planLevel, status } = req.body;

    if (!title || !type) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }
    if (!['loan', 'agent'].includes(type)) {
        return res.status(BAD_REQUEST).json({ message: PACKAGE_TYPE_INVALID, errorCode: "INVALID_PACKAGE_TYPE" });
    }

    try {
        let packageData;
        if (type === 'loan') {
            // ADDED: planLevel validation
            if (!minLoanAmount || !maxLoanAmount || !installmentMonths || interestRate === undefined || planLevel === undefined) {
                return res.status(BAD_REQUEST).json({ message: "All fields including Plan Level and Interest Rate are required for loan packages.", errorCode: "MISSING_LOAN_PACKAGE_FIELDS" });
            }
            // ADDED: planLevel to new package
            packageData = new Package({ title, description, type, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, planLevel, status: status || 'inactive' });
        } else { // type === 'agent'
            if (!price || !validityInDays || !maxUsers) {
                return res.status(BAD_REQUEST).json({ message: "Price, validity in days, and max users are required for agent packages.", errorCode: "MISSING_AGENT_PACKAGE_FIELDS" });
            }
            packageData = new Package({ title, description, type, price, validityInDays, maxUsers, status: status || 'inactive' });
        }

        await packageData.save();
        res.status(CREATED).json({ message: PACKAGE_CREATED, package: packageData });
    } catch (error) {
        // ADDED: Better error for unique plan level
        if (error.code === 11000 && error.keyPattern && error.keyPattern.planLevel) {
            return res.status(CONFLICT).json({ message: `A loan package with Plan Level ${error.keyValue.planLevel} already exists.`, errorCode: "DUPLICATE_PLAN_LEVEL" });
        }
        console.error("Error creating package:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

exports.updatePackage = async (req, res) => {
    const { id } = req.params;
    // ADDED: planLevel
    const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, planLevel, status } = req.body;

    try {
        const packageData = await Package.findById(id);
        if (!packageData) {
            return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
        }

        if (title) packageData.title = title;
        if (description !== undefined) packageData.description = description;
        if (type && ['loan', 'agent'].includes(type)) packageData.type = type;
        if (price !== undefined) packageData.price = price;
        if (validityInDays !== undefined) packageData.validityInDays = validityInDays;
        if (maxUsers !== undefined) packageData.maxUsers = maxUsers;
        if (minLoanAmount !== undefined) packageData.minLoanAmount = minLoanAmount;
        if (maxLoanAmount !== undefined) packageData.maxLoanAmount = maxLoanAmount;
        if (installmentMonths !== undefined) packageData.installmentMonths = installmentMonths;
        if (interestRate !== undefined) packageData.interestRate = interestRate;
        // ADDED: planLevel update logic
        if (planLevel !== undefined) packageData.planLevel = planLevel;
        if (status && ['active', 'inactive'].includes(status)) packageData.status = status;

        await packageData.save();
        res.status(OK).json({ message: PACKAGE_UPDATE_SUCCESS, package: packageData });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.planLevel) {
            return res.status(CONFLICT).json({ message: `A loan package with Plan Level ${error.keyValue.planLevel} already exists.`, errorCode: "DUPLICATE_PLAN_LEVEL" });
        }
        console.error("Error updating package:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get all packages
// @route   GET /api/admin/packages
// @access  Private (Admin only)
// exports.getAllPackages = async (req, res) => {
//     try {
//         const { type, status } = req.query;
//         const query = {};
//         if (type) query.type = type;
//         if (status) query.status = status;

//         const packages = await Package.find(query);
//         res.status(OK).json({ message: FETCH_SUCCESS, packages });
//     } catch (error) {
//         console.error("Error fetching packages:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

// exports.getAllPackages = async (req, res) => {
//     try {
//         const { type, status } = req.query;
//         const query = {};
//         if (type) query.type = type;
//         if (status) query.status = status;

//         const packages = await Package.find(query);
//         res.status(OK).json({ message: FETCH_SUCCESS, packages });
//     } catch (error) {
//         console.error("Error fetching packages:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.getAllPackages = async (req, res) => {
    try {
        // CHANGE START: Destructure `planLevel` from the query parameters
        const { type, status, planLevel } = req.query;
        const query = {};

        if (type) query.type = type;
        if (status) query.status = status;
        // ADDED: If planLevel is provided in the query, add it to the database query
        if (planLevel) query.planLevel = planLevel;
        // CHANGE END

        const packages = await Package.find(query);
        res.status(OK).json({ message: FETCH_SUCCESS, packages });
    } catch (error) {
        console.error("Error fetching packages:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get package by ID
// @route   GET /api/admin/packages/:id
// @access  Private (Admin only)
// exports.getPackageById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const packageData = await Package.findById(id);
//         if (!packageData) {
//             return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
//         }
//         res.status(OK).json({ message: FETCH_SUCCESS, package: packageData });
//     } catch (error) {
//         console.error("Error fetching package by ID:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };


exports.getPackageById = async (req, res) => {
    try {
        const { id } = req.params;
        const packageData = await Package.findById(id);
        if (!packageData) {
            return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, package: packageData });
    } catch (error) {
        console.error("Error fetching package by ID:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Update package by ID
// @route   PUT /api/admin/packages/:id
// @access  Private (Admin only)
// exports.updatePackage = async (req, res) => {
//     const { id } = req.params;
//     const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, status } = req.body;

//     try {
//         const packageData = await Package.findById(id);
//         if (!packageData) {
//             return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
//         }

//         if (title) packageData.title = title;
//         if (description !== undefined) packageData.description = description;
//         if (type && ['loan', 'agent'].includes(type)) packageData.type = type;
//         if (price !== undefined) packageData.price = price;
//         if (validityInDays !== undefined) packageData.validityInDays = validityInDays;
//         if (maxUsers !== undefined) packageData.maxUsers = maxUsers;
//         if (minLoanAmount !== undefined) packageData.minLoanAmount = minLoanAmount;
//         if (maxLoanAmount !== undefined) packageData.maxLoanAmount = maxLoanAmount;
//         if (installmentMonths !== undefined) packageData.installmentMonths = installmentMonths;
//         if (status && ['active', 'inactive'].includes(status)) packageData.status = status;

//         await packageData.save();
//         res.status(OK).json({ message: PACKAGE_UPDATE_SUCCESS, package: packageData });
//     } catch (error) {
//         console.error("Error updating package:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.updatePackage = async (req, res) => {
    const { id } = req.params;
    // CHANGE: Destructure interestRate from req.body
    const { title, description, type, price, validityInDays, maxUsers, minLoanAmount, maxLoanAmount, installmentMonths, interestRate, status } = req.body;

    try {
        const packageData = await Package.findById(id);
        if (!packageData) {
            return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
        }

        if (title) packageData.title = title;
        if (description !== undefined) packageData.description = description;
        if (type && ['loan', 'agent'].includes(type)) packageData.type = type;
        if (price !== undefined) packageData.price = price;
        if (validityInDays !== undefined) packageData.validityInDays = validityInDays;
        if (maxUsers !== undefined) packageData.maxUsers = maxUsers;
        if (minLoanAmount !== undefined) packageData.minLoanAmount = minLoanAmount;
        if (maxLoanAmount !== undefined) packageData.maxLoanAmount = maxLoanAmount;
        if (installmentMonths !== undefined) packageData.installmentMonths = installmentMonths;
        // CHANGE: Added interestRate update logic
        if (interestRate !== undefined) packageData.interestRate = interestRate;
        if (status && ['active', 'inactive'].includes(status)) packageData.status = status;

        await packageData.save();
        res.status(OK).json({ message: PACKAGE_UPDATE_SUCCESS, package: packageData });
    } catch (error) {
        console.error("Error updating package:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Delete package by ID
// @route   DELETE /api/admin/packages/:id
// @access  Private (Admin only)
// exports.deletePackage = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const packageData = await Package.findByIdAndDelete(id);
//         if (!packageData) {
//             return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
//         }
//         res.status(OK).json({ message: PACKAGE_DELETE_SUCCESS });
//     } catch (error) {
//         console.error("Error deleting package:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.deletePackage = async (req, res) => {
    const { id } = req.params;
    try {
        const packageData = await Package.findByIdAndDelete(id);
        if (!packageData) {
            return res.status(NOT_FOUND).json({ message: PACKAGE_NOT_FOUND, errorCode: "PACKAGE_NOT_FOUND" });
        }
        res.status(OK).json({ message: PACKAGE_DELETE_SUCCESS });
    } catch (error) {
        console.error("Error deleting package:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- AGENT MANAGEMENT (Admin registers agents) ---
// @desc    Register an Agent by Admin
// @route   POST /api/admin/agents
// @access  Private (Admin only)
exports.registerAgentByAdmin = async (req, res) => {
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
        let existingAgent = await User.findOne({ email, role: AGENT });
        if (existingAgent) {
            return res.status(CONFLICT).json({ message: AGENT_EXISTS, errorCode: "AGENT_EXISTS" });
        }

        const agentPackage = await Package.findById(packageId);
        if (!agentPackage || agentPackage.type !== 'agent' || agentPackage.status !== 'active') {
            return res.status(BAD_REQUEST).json({ message: AGENT_INVALID_PACKAGE, errorCode: "INVALID_PACKAGE" });
        }

        shopImageUploadUrl = await uploadFileToSpaces(req.files.shopImage[0], 'agent-shop-images');
        profileImageUploadUrl = await uploadFileToSpaces(req.files.profileImage[0], 'agent-profile-images');

        const newAgent = new User({
            fullName, phone, email, password, country, state, city,
            bankName, bankAccountNumber, ifscCode, packageId,
            shopImage: shopImageUploadUrl,
            profileImage: profileImageUploadUrl,
            role: AGENT,
            status: 'Active' // Admin created agents are Active by default
        });

        await newAgent.save();

        res.status(CREATED).json({
            message: AGENT_REGISTER_SUCCESS,
            agent: newAgent.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
        });

    } catch (error) {
        console.error("Error during agent registration by admin:", error.message);
        if (shopImageUploadUrl) await deleteFileFromSpaces(shopImageUploadUrl);
        if (profileImageUploadUrl) await deleteFileFromSpaces(profileImageUploadUrl);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get all Agents
// @route   GET /api/admin/agents
// @access  Private (Admin only)
exports.getAllAgents = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status } = req.query;
        const query = { role: AGENT };

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const agents = await User.find(query)
            .populate('packageId', 'title maxUsers price')
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const totalAgents = await User.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalAgents,
            totalPages: Math.ceil(totalAgents / parseInt(limit)),
            currentPage: parseInt(page),
            agents
        });
    } catch (error) {
        console.error("Error fetching agents:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get Agent by ID
// @route   GET /api/admin/agents/:id
// @access  Private (Admin only)
exports.getAgentById = async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await User.findOne({ _id: id, role: AGENT })
            .populate('packageId', 'title maxUsers price')
            .select('-password');
        if (!agent) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, agent });
    } catch (error) {
        console.error("Error fetching agent by ID:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Update Agent details by Admin
// @route   PUT /api/admin/agents/:id
// @access  Private (Admin only)
exports.updateAgent = async (req, res) => {
    const { id } = req.params;
    const {
        fullName, phone, email, country, state, city, status,
        bankName, bankAccountNumber, ifscCode, packageId
    } = req.body;

    let shopImageUploadUrl, profileImageUploadUrl;
    let oldShopImageUrl, oldProfileImageUrl;

    try {
        let agent = await User.findOne({ _id: id, role: AGENT });
        if (!agent) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }

        if (email && email !== agent.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists && emailExists._id.toString() !== id) {
                return res.status(CONFLICT).json({ message: AGENT_EXISTS, errorCode: "EMAIL_TAKEN" });
            }
        }

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

        if (fullName) agent.fullName = fullName;
        if (phone) agent.phone = phone;
        if (email) agent.email = email;
        if (country) agent.country = country;
        if (state) agent.state = state;
        if (city) agent.city = city;
        if (status && ['Active', 'Inactive', 'Suspended'].includes(status)) agent.status = status;
        if (bankName) agent.bankName = bankName;
        if (bankAccountNumber) agent.bankAccountNumber = bankAccountNumber;
        if (ifscCode) agent.ifscCode = ifscCode;
        if (packageId) {
            const agentPackage = await Package.findById(packageId);
            if (!agentPackage || agentPackage.type !== 'agent' || agentPackage.status !== 'active') {
                return res.status(BAD_REQUEST).json({ message: AGENT_INVALID_PACKAGE, errorCode: "INVALID_PACKAGE" });
            }
            agent.packageId = packageId;
        }

        await agent.save();

        if (oldShopImageUrl && shopImageUploadUrl) await deleteFileFromSpaces(oldShopImageUrl);
        if (oldProfileImageUrl && profileImageUploadUrl) await deleteFileFromSpaces(oldProfileImageUrl);

        res.status(OK).json({
            message: UPDATED_SUCCESS,
            agent: agent.toObject({ getters: true, virtuals: false, versionKey: false, transform: (doc, ret) => { delete ret.password; return ret; } })
        });
    } catch (error) {
        console.error("Error updating agent:", error);
        if (shopImageUploadUrl && !agent) await deleteFileFromSpaces(shopImageUploadUrl);
        if (profileImageUploadUrl && !agent) await deleteFileFromSpaces(profileImageUploadUrl);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Delete Agent by Admin
// @route   DELETE /api/admin/agents/:id
// @access  Private (Admin only)
exports.deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;

        const agent = await User.findOne({ _id: id, role: AGENT });
        if (!agent) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }

        if (agent.shopImage) await deleteFileFromSpaces(agent.shopImage);
        if (agent.profileImage) await deleteFileFromSpaces(agent.profileImage);

        await User.findByIdAndDelete(id);

        res.status(OK).json({ message: DELETED_SUCCESS });
    } catch (error) {
        console.error("Error deleting agent:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- KYC MANAGEMENT ---
// @desc    Get all KYC records (with optional search, pagination)
// @route   GET /api/admin/kyc
// @access  Private (Admin only)
exports.getAllKycRecords = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const kycRecords = await Kyc.find(query)
            .populate('userId', 'fullName email phone status')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const totalKycRecords = await Kyc.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalKycRecords,
            totalPages: Math.ceil(totalKycRecords / parseInt(limit)),
            currentPage: parseInt(page),
            kycRecords
        });
    } catch (error) {
        console.error("Error fetching all KYC records:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get KYC record by ID
// @route   GET /api/admin/kyc/:id
// @access  Private (Admin only)
exports.getKycById = async (req, res) => {
    try {
        const { id } = req.params;
        const kycRecord = await Kyc.findById(id).populate('userId', 'fullName email phone status');
        if (!kycRecord) {
            return res.status(NOT_FOUND).json({ message: KYC_NOT_FOUND, errorCode: "KYC_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, kycRecord });
    } catch (error) {
        console.error("Error fetching KYC by ID:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Update KYC status (approve/reject)
// @route   PUT /api/admin/kyc/:id
// @access  Private (Admin only)
exports.updateKycStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(BAD_REQUEST).json({ message: KYC_STATUS_INVALID, errorCode: "INVALID_KYC_STATUS" });
        }

        const kycRecord = await Kyc.findById(id);
        if (!kycRecord) {
            return res.status(NOT_FOUND).json({ message: KYC_NOT_FOUND, errorCode: "KYC_NOT_FOUND" });
        }

        kycRecord.status = status;
        kycRecord.approvedBy = req.user.id;
        if (status === 'Rejected') {
            kycRecord.rejectionReason = rejectionReason || 'No specific reason provided.';
        } else {
            kycRecord.rejectionReason = null;
            // If KYC is approved, activate the user if they were inactive
            await User.findByIdAndUpdate(kycRecord.userId, { status: 'Active' });
        }

        await kycRecord.save();
        res.status(OK).json({ message: KYC_UPDATED_SUCCESS, kycRecord });
    } catch (error) {
        console.error("Error updating KYC status:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Delete KYC record
// @route   DELETE /api/admin/kyc/:id
// @access  Private (Admin only)
exports.deleteKycRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const kycRecord = await Kyc.findById(id);
        if (!kycRecord) {
            return res.status(NOT_FOUND).json({ message: KYC_NOT_FOUND, errorCode: "KYC_NOT_FOUND" });
        }

        if (kycRecord.adharCardImage) await deleteFileFromSpaces(kycRecord.adharCardImage);
        if (kycRecord.panCardImage) await deleteFileFromSpaces(kycRecord.panCardImage);
        if (kycRecord.passBookImage) await deleteFileFromSpaces(kycRecord.passBookImage);
        if (kycRecord.userImage) await deleteFileFromSpaces(kycRecord.userImage);

        await Kyc.findByIdAndDelete(id);
        res.status(OK).json({ message: KYC_DELETED_SUCCESS });
    } catch (error) {
        console.error("Error deleting KYC record:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};


// --- LOAN MANAGEMENT ---
// @desc    Get all loan applications (with optional search, pagination)
// @route   GET /api/admin/loans
// @access  Private (Admin only)
// exports.getAllLoanApplications = async (req, res) => {
//     try {
//         const { search, page = 1, limit = 10, status } = req.query;
//         const query = {};

//         if (status) query.status = status;
//         if (search) {
//             const users = await User.find({
//                 $or: [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
//                 role: USER
//             }).select('_id');
//             const userIds = users.map(user => user._id);
//             if (userIds.length > 0) {
//                 query.userId = { $in: userIds };
//             } else {
//                 return res.status(OK).json({ message: FETCH_SUCCESS, totalLoans: 0, totalPages: 0, currentPage: parseInt(page), loans: [] });
//             }
//         }

//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         const loans = await Loan.find(query)
//             .populate('userId', 'fullName email phone')
//             .populate('loanPackage')
//             .skip(skip)
//             .limit(parseInt(limit))
//             .sort({ applicationDate: -1 });

//         const totalLoans = await Loan.countDocuments(query);

//         res.status(OK).json({
//             message: FETCH_SUCCESS,
//             totalLoans,
//             totalPages: Math.ceil(totalLoans / parseInt(limit)),
//             currentPage: parseInt(page),
//             loans
//         });
//     } catch (error) {
//         console.error("Error fetching all loan applications:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.getAllLoanApplications = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status } = req.query;
        const query = {};

        if (status) query.status = status;
        if (search) {
            const users = await User.find({
                $or: [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
                role: USER
            }).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length > 0) {
                query.userId = { $in: userIds };
            } else {
                return res.status(OK).json({ message: FETCH_SUCCESS, totalLoans: 0, totalPages: 0, currentPage: parseInt(page), loans: [] });
            }
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const loans = await Loan.find(query)
            .populate('userId', 'fullName email phone')
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
        console.error("Error fetching all loan applications:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get loan application by ID
// @route   GET /api/admin/loans/:id
// @access  Private (Admin only)
// exports.getLoanApplicationById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const loan = await Loan.findById(id)
//             .populate('userId', 'fullName email phone')
//             .populate('loanPackage');
//         if (!loan) {
//             return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
//         }
//         res.status(OK).json({ message: FETCH_SUCCESS, loan });
//     } catch (error) {
//         console.error("Error fetching loan application by ID:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.getLoanApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id)
            .populate('userId', 'fullName email phone')
            .populate('loanPackage');
        if (!loan) {
            return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, loan });
    } catch (error) {
        console.error("Error fetching loan application by ID:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Approve/Reject a loan application and generate installments
// @route   PUT /api/admin/loans/:id/status
// @access  Private (Admin only)
// exports.updateLoanApplicationStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status, interestRate, rejectionReason, approvedAmount } = req.body;

//         if (!['Approved', 'Rejected'].includes(status)) {
//             return res.status(BAD_REQUEST).json({ message: LOAN_STATUS_INVALID, errorCode: "INVALID_LOAN_STATUS" });
//         }
//         if (status === 'Approved' && (!interestRate || interestRate < 0)) {
//             return res.status(BAD_REQUEST).json({ message: "Interest rate is required for approved loans and must be non-negative.", errorCode: "MISSING_INTEREST_RATE" });
//         }
//         if (status === 'Approved' && (!approvedAmount || approvedAmount < 2000)) {
//             return res.status(BAD_REQUEST).json({ message: "Approved amount is required for approved loans and must be at least 2000.", errorCode: "INVALID_APPROVED_AMOUNT" });
//         }


//         const loan = await Loan.findById(id).populate('userId').populate('loanPackage');
//         if (!loan) {
//             return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
//         }
//         if (loan.status === 'Approved' || loan.status === 'Rejected') {
//             return res.status(CONFLICT).json({ message: `Loan already ${loan.status}.`, errorCode: "LOAN_STATUS_FINALIZED" });
//         }

//         if (status === 'Approved') {
//             if (approvedAmount < loan.loanPackage.minLoanAmount || approvedAmount > loan.loanPackage.maxLoanAmount) {
//                 return res.status(BAD_REQUEST).json({ message: LOAN_AMOUNT_INVALID, errorCode: "APPROVED_AMOUNT_OUT_OF_RANGE" });
//             }

//             loan.status = 'Approved';
//             loan.approvedBy = req.user.id;
//             loan.interestRate = interestRate;
//             loan.approvedAmount = approvedAmount;
//             loan.installmentDurationMonths = calculateInstallmentDuration(approvedAmount);
//             loan.rejectionReason = null;

//             const { totalAmountToRepay, monthlyEMI, installments: calculatedInstallments } = calculateInstallments(
//                 loan.approvedAmount,
//                 loan.interestRate,
//                 loan.installmentDurationMonths
//             );
//             loan.totalAmountToRepay = totalAmountToRepay;
//             loan.currentOutstandingAmount = totalAmountToRepay;

//             await loan.save();

//             const installmentRecords = calculatedInstallments.map(inst => ({
//                 loanId: loan._id,
//                 userId: loan.userId._id,
//                 installmentNumber: inst.installmentNumber,
//                 amountDue: inst.amountDue,
//                 dueDate: inst.dueDate,
//                 status: 'Upcoming'
//             }));
//             await Installment.insertMany(installmentRecords);

//             await User.findByIdAndUpdate(loan.userId._id, { lastLoanAmount: loan.approvedAmount });

//         } else if (status === 'Rejected') {
//             loan.status = 'Rejected';
//             loan.approvedBy = req.user.id;
//             loan.rejectionReason = rejectionReason || 'Loan application rejected by admin.';
//             await loan.save();
//         }

//         res.status(OK).json({ message: LOAN_UPDATED_SUCCESS, loan });
//     } catch (error) {
//         console.error("Error updating loan application status:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

exports.updateLoanApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        // CHANGE: interestRate is now optional in the request body, as it can be overridden
        const { status, interestRate, rejectionReason, approvedAmount } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(BAD_REQUEST).json({ message: LOAN_STATUS_INVALID, errorCode: "INVALID_LOAN_STATUS" });
        }

        // CHANGE: Removed required interest rate validation from here. It's handled below.
        if (status === 'Approved' && (!approvedAmount || approvedAmount < 2000)) {
            return res.status(BAD_REQUEST).json({ message: "Approved amount is required for approved loans and must be at least 2000.", errorCode: "INVALID_APPROVED_AMOUNT" });
        }

        const loan = await Loan.findById(id).populate('userId').populate('loanPackage');
        if (!loan) {
            return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
        }
        if (loan.status === 'Approved' || loan.status === 'Rejected') {
            return res.status(CONFLICT).json({ message: `Loan already ${loan.status}.`, errorCode: "LOAN_STATUS_FINALIZED" });
        }

        if (status === 'Approved') {
            if (approvedAmount < loan.loanPackage.minLoanAmount || approvedAmount > loan.loanPackage.maxLoanAmount) {
                return res.status(BAD_REQUEST).json({ message: LOAN_AMOUNT_INVALID, errorCode: "APPROVED_AMOUNT_OUT_OF_RANGE" });
            }

            // CHANGE: Determine the final interest rate. Use the one from request body if provided (override),
            // otherwise use the one already stored in the loan document (from the package).
            const finalInterestRate = interestRate !== undefined ? interestRate : loan.interestRate;
            if (finalInterestRate < 0) {
                return res.status(BAD_REQUEST).json({ message: "Interest rate must be a non-negative number.", errorCode: "INVALID_INTEREST_RATE" });
            }

            loan.status = 'Approved';
            loan.approvedBy = req.user.id;
            loan.interestRate = finalInterestRate; // CHANGE: Use the final determined interest rate
            loan.approvedAmount = approvedAmount;
            loan.installmentDurationMonths = calculateInstallmentDuration(approvedAmount);
            loan.rejectionReason = null;

            const { totalAmountToRepay, monthlyEMI, installments: calculatedInstallments } = calculateInstallments(
                loan.approvedAmount,
                loan.interestRate, // This now holds the final rate
                loan.installmentDurationMonths
            );
            loan.totalAmountToRepay = totalAmountToRepay;
            loan.currentOutstandingAmount = totalAmountToRepay;

            await loan.save();

            const installmentRecords = calculatedInstallments.map(inst => ({
                loanId: loan._id,
                userId: loan.userId._id,
                installmentNumber: inst.installmentNumber,
                amountDue: inst.amountDue,
                dueDate: inst.dueDate,
                status: 'Upcoming'
            }));
            await Installment.insertMany(installmentRecords);

            await User.findByIdAndUpdate(loan.userId._id, { lastLoanAmount: loan.approvedAmount });

        } else if (status === 'Rejected') {
            loan.status = 'Rejected';
            loan.approvedBy = req.user.id;
            loan.rejectionReason = rejectionReason || 'Loan application rejected by admin.';
            await loan.save();
        }

        res.status(OK).json({ message: LOAN_UPDATED_SUCCESS, loan });
    } catch (error) {
        console.error("Error updating loan application status:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Delete loan application
// @route   DELETE /api/admin/loans/:id
// @access  Private (Admin only)
// exports.deleteLoanApplication = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const loan = await Loan.findByIdAndDelete(id);
//         if (!loan) {
//             return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
//         }
//         await Installment.deleteMany({ loanId: id });
//         await Payment.deleteMany({ loanId: id });
//         res.status(OK).json({ message: DELETED_SUCCESS });
//     } catch (error) {
//         console.error("Error deleting loan application:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
//     }
// };

exports.deleteLoanApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const loan = await Loan.findByIdAndDelete(id);
        if (!loan) {
            return res.status(NOT_FOUND).json({ message: LOAN_NOT_FOUND, errorCode: "LOAN_NOT_FOUND" });
        }
        await Installment.deleteMany({ loanId: id });
        await Payment.deleteMany({ loanId: id });
        res.status(OK).json({ message: DELETED_SUCCESS });
    } catch (error) {
        console.error("Error deleting loan application:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// --- INSTALLMENT MANAGEMENT (Admin views & approves payments) ---
// @desc    Get all installments (with filters, pagination)
// @route   GET /api/admin/installments
// @access  Private (Admin only)
exports.getAllInstallments = async (req, res) => {
    try {
        const { userId, loanId, status, page = 1, limit = 10 } = req.query;
        const query = {};

        if (userId) query.userId = userId;
        if (loanId) query.loanId = loanId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const installments = await Installment.find(query)
            .populate('userId', 'fullName email')
            .populate('loanId', 'approvedAmount totalAmountToRepay')
            .populate('paymentId')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ dueDate: 1, installmentNumber: 1 });

        const totalInstallments = await Installment.countDocuments(query);

        res.status(OK).json({
            message: FETCH_SUCCESS,
            totalInstallments,
            totalPages: Math.ceil(totalInstallments / parseInt(limit)),
            currentPage: parseInt(page),
            installments
        });
    } catch (error) {
        console.error("Error fetching installments:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Approve a payment for an installment (based on screenshot)
// @route   PUT /api/admin/payments/:id/approve
// @access  Private (Admin only)
// exports.approvePayment = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const payment = await Payment.findById(id).populate('installmentId').populate('loanId');

//         if (!payment) {
//             return res.status(NOT_FOUND).json({ message: PAYMENT_NOT_FOUND, errorCode: "PAYMENT_NOT_FOUND" });
//         }
//         if (payment.status !== 'Pending') {
//             return res.status(CONFLICT).json({ message: `Payment already ${payment.status}.`, errorCode: "PAYMENT_STATUS_FINALIZED" });
//         }

//         payment.status = 'Approved';
//         payment.approvedBy = req.user.id;
//         await payment.save();

//         const installment = await Installment.findById(payment.installmentId._id);
//         if (installment) {
//             installment.status = 'Paid';
//             installment.paidDate = new Date();
//             installment.paymentId = payment._id;
//             await installment.save();
//         } else {
//             console.warn(`Installment ID ${payment.installmentId._id} not found for payment ${payment._id}.`);
//         }

//         const loan = await Loan.findById(payment.loanId._id);
//         if (loan) {
//             loan.currentOutstandingAmount -= payment.amountPaid;
//             if (loan.currentOutstandingAmount <= 0) {
//                 loan.status = 'Repaid';
//                 loan.currentOutstandingAmount = 0;
//             }
//             await loan.save();
//         } else {
//             console.warn(`Loan ID ${payment.loanId._id} not found for payment ${payment._id}.`);
//         }

//         res.status(OK).json({ message: PAYMENT_STATUS_UPDATED, payment });
//     } catch (error) {
//         console.error("Error approving payment:", error);
//         res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
//     }
// };

exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params; // This is Payment ID
        const payment = await Payment.findById(id).populate('installmentId').populate('loanId');

        if (!payment) {
            return res.status(NOT_FOUND).json({ message: PAYMENT_NOT_FOUND, errorCode: "PAYMENT_NOT_FOUND" });
        }
        if (payment.status !== 'Pending') {
            return res.status(CONFLICT).json({ message: `Payment already ${payment.status}.`, errorCode: "PAYMENT_STATUS_FINALIZED" });
        }

        payment.status = 'Approved';
        payment.approvedBy = req.user.id;
        await payment.save();

        const installment = await Installment.findById(payment.installmentId._id);
        if (installment) {
            installment.status = 'Paid';
            installment.paidDate = new Date();
            installment.paymentId = payment._id;
            await installment.save();
        } else {
            console.warn(`Installment ID ${payment.installmentId._id} not found for payment ${payment._id}.`);
        }

        const loan = await Loan.findById(payment.loanId._id);
        if (loan) {
            loan.currentOutstandingAmount -= payment.amountPaid;
            if (loan.currentOutstandingAmount <= 0) {
                loan.status = 'Repaid';
                loan.currentOutstandingAmount = 0;

                // ADDED: Increment user's plan level upon full repayment
                await User.findByIdAndUpdate(loan.userId, {
                    $inc: { currentPlanLevel: 1 }
                });
                console.log(`User ${loan.userId} completed loan. Incremented plan level.`);
            }
            await loan.save();
        } else {
            console.warn(`Loan ID ${payment.loanId._id} not found for payment ${payment._id}.`);
        }

        res.status(OK).json({ message: PAYMENT_STATUS_UPDATED, payment });
    } catch (error) {
        console.error("Error approving payment:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Reject a payment for an installment
// @route   PUT /api/admin/payments/:id/reject
// @access  Private (Admin only)
exports.rejectPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const payment = await Payment.findById(id);

        if (!payment) {
            return res.status(NOT_FOUND).json({ message: PAYMENT_NOT_FOUND, errorCode: "PAYMENT_NOT_FOUND" });
        }
        if (payment.status !== 'Pending') {
            return res.status(CONFLICT).json({ message: `Payment already ${payment.status}.`, errorCode: "PAYMENT_STATUS_FINALIZED" });
        }

        payment.status = 'Rejected';
        payment.approvedBy = req.user.id;
        payment.rejectionReason = rejectionReason || 'Payment rejected by admin.';
        await payment.save();

        const installment = await Installment.findById(payment.installmentId._id);
        if (installment && installment.status !== 'Paid') {
            installment.status = 'Pending';
            installment.paymentId = null;
            await installment.save();
        }

        if (payment.paymentScreenshot) {
            await deleteFileFromSpaces(payment.paymentScreenshot);
        }

        res.status(OK).json({ message: PAYMENT_STATUS_UPDATED, payment });
    } catch (error) {
        console.error("Error rejecting payment:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get all payment receipts (with filters, pagination)
// @route   GET /api/admin/payments
// @access  Private (Admin only)
exports.getAllPaymentReceipts = async (req, res) => {
    try {
        const { userId, loanId, installmentId, status, page = 1, limit = 10 } = req.query;
        const query = {};

        if (userId) query.userId = userId;
        if (loanId) query.loanId = loanId;
        if (installmentId) query.installmentId = installmentId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await Payment.find(query)
            .populate('userId', 'fullName email')
            .populate('loanId', 'approvedAmount totalAmountToRepay')
            .populate('installmentId', 'amountDue dueDate installmentNumber')
            .populate('submittedBy', 'fullName role')
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
        console.error("Error fetching all payment receipts:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};


// --- COMMISSION MANAGEMENT ---
// @desc    Set commission rate for an agent
// @route   POST /api/admin/commissions
// @access  Private (Admin only)
exports.setAgentCommission = async (req, res) => {
    const { agentId, commissionRate } = req.body;

    if (!agentId || commissionRate === undefined || commissionRate < 0) {
        return res.status(BAD_REQUEST).json({ message: "Agent ID and a valid commission rate are required.", errorCode: "MISSING_FIELDS" });
    }

    try {
        const agent = await User.findOne({ _id: agentId, role: AGENT });
        if (!agent) {
            return res.status(NOT_FOUND).json({ message: AGENT_NOT_FOUND, errorCode: "AGENT_NOT_FOUND" });
        }

        let commission = await Commission.findOneAndUpdate(
            { agentId },
            { commissionRate, status: 'Active' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(CREATED).json({ message: COMMISSION_CREATED, commission });
    } catch (error) {
        console.error("Error setting agent commission:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get all agent commissions
// @route   GET /api/admin/commissions
// @access  Private (Admin only)
exports.getAllCommissions = async (req, res) => {
    try {
        const commissions = await Commission.find().populate('agentId', 'fullName email phone');
        res.status(OK).json({ message: FETCH_SUCCESS, commissions });
    } catch (error) {
        console.error("Error fetching commissions:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Update agent commission
// @route   PUT /api/admin/commissions/:id
// @access  Private (Admin only)
exports.updateAgentCommission = async (req, res) => {
    const { id } = req.params; // Commission ID
    const { commissionRate, status } = req.body;

    if (commissionRate === undefined && status === undefined) {
        return res.status(BAD_REQUEST).json({ message: "At least one field (commissionRate or status) is required for update.", errorCode: "NO_FIELDS_TO_UPDATE" });
    }

    try {
        const commission = await Commission.findById(id);
        if (!commission) {
            return res.status(NOT_FOUND).json({ message: COMMISSION_NOT_FOUND, errorCode: "COMMISSION_NOT_FOUND" });
        }

        if (commissionRate !== undefined) commission.commissionRate = commissionRate;
        if (status && ['Active', 'Inactive'].includes(status)) commission.status = status;

        await commission.save();
        res.status(OK).json({ message: COMMISSION_UPDATED, commission });
    } catch (error) {
        console.error("Error updating commission:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Delete agent commission
// @route   DELETE /api/admin/commissions/:id
// @access  Private (Admin only)
exports.deleteAgentCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const commission = await Commission.findByIdAndDelete(id);
        if (!commission) {
            return res.status(NOT_FOUND).json({ message: COMMISSION_NOT_FOUND, errorCode: "COMMISSION_NOT_FOUND" });
        }
        res.status(OK).json({ message: COMMISSION_DELETED });
    } catch (error) {
        console.error("Error deleting commission:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};


// --- FINANCIAL REPORTING (BALANCE SHEET) ---
// @desc    Generate Balance Sheet
// @route   GET /api/admin/balance-sheet
// @access  Private (Admin only)
exports.getBalanceSheet = async (req, res) => {
    try {
        // Total loans disbursed
        const totalDisbursedResult = await Loan.aggregate([
            { $match: { status: 'Approved' } },
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
        ]);
        const totalLoansDisbursed = totalDisbursedResult.length > 0 ? totalDisbursedResult[0].total : 0;

        // Total amount repaid
        const totalRepaidResult = await Payment.aggregate([
            { $match: { status: 'Approved' } },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);
        const totalAmountRepaid = totalRepaidResult.length > 0 ? totalRepaidResult[0].total : 0;

        // Total outstanding amount
        const totalOutstandingResult = await Loan.aggregate([
            { $match: { status: { $in: ['Approved', 'Repaid'] } } }, // Consider only approved loans for outstanding
            { $group: { _id: null, total: { $sum: '$currentOutstandingAmount' } } }
        ]);
        const totalOutstanding = totalOutstandingResult.length > 0 ? totalOutstandingResult[0].total : 0;


        // Monthly EMI overview (current month, upcoming, previous)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // EMIs due this month
        const monthlyEMIsDue = await Installment.aggregate([
            { $match: { dueDate: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amountDue' } } }
        ]);
        const currentMonthEMIsDue = monthlyEMIsDue.length > 0 ? monthlyEMIsDue[0].total : 0;

        // EMIs paid this month
        const monthlyEMIsPaid = await Payment.aggregate([
            { $match: { paymentDate: { $gte: startOfMonth, $lte: endOfMonth }, status: 'Approved' } },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);
        const currentMonthEMIsPaid = monthlyEMIsPaid.length > 0 ? monthlyEMIsPaid[0].total : 0;

        // Future EMIs (upcoming)
        const upcomingEMIs = await Installment.aggregate([
            { $match: { dueDate: { $gt: endOfMonth }, status: { $in: ['Upcoming', 'Pending'] } } },
            { $group: { _id: null, total: { $sum: '$amountDue' } } }
        ]);
        const totalUpcomingEMIs = upcomingEMIs.length > 0 ? upcomingEMIs[0].total : 0;

        // Overdue EMIs (previous months, not paid)
        const overdueEMIs = await Installment.aggregate([
            { $match: { dueDate: { $lt: startOfMonth }, status: { $in: ['Upcoming', 'Pending', 'Overdue'] } } }, // Include 'Upcoming' if it was due last month
            { $group: { _id: null, total: { $sum: '$amountDue' } } }
        ]);
        const totalOverdueEMIs = overdueEMIs.length > 0 ? overdueEMIs[0].total : 0;


        res.status(OK).json({
            message: BALANCE_SHEET_FETCHED,
            balanceSheet: {
                totalLoansDisbursed,
                totalAmountRepaid,
                totalOutstanding,
                currentMonth: {
                    emisDue: currentMonthEMIsDue,
                    emisPaid: currentMonthEMIsPaid,
                    emisRemaining: currentMonthEMIsDue - currentMonthEMIsPaid > 0 ? currentMonthEMIsDue - currentMonthEMIsPaid : 0
                },
                totalUpcomingEMIs,
                totalOverdueEMIs
            }
        });
    } catch (error) {
        console.error("Error generating balance sheet:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Generate Monthly Performance Report
// @route   GET /api/admin/reports/monthly-performance
// @access  Private (Admin only)
exports.getMonthlyPerformanceReport = async (req, res) => {
    try {
        const result = await Loan.aggregate([
            { $match: { status: { $in: ['Approved', 'Repaid'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalDisbursed: { $sum: "$approvedAmount" },
                    loansCount: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const paymentsResult = await Payment.aggregate([
            { $match: { status: 'Approved' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
                    totalCollected: { $sum: "$amountPaid" }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const monthlyReports = result.map(loanMonth => {
            const paymentMonth = paymentsResult.find(pm => pm._id === loanMonth._id);
            const collected = paymentMonth ? paymentMonth.totalCollected : 0;
            const pending = loanMonth.totalDisbursed - collected;

            return {
                month: loanMonth._id,
                disbursed: loanMonth.totalDisbursed,
                collected: collected,
                pending: pending > 0 ? pending : 0,
                overdue: 0,
                loansCount: loanMonth.loansCount
            };
        });

        res.status(OK).json({ message: FETCH_SUCCESS, monthlyPerformance: monthlyReports });
    } catch (error) {
        console.error("Error generating monthly performance report:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Generate Loans by Package Report
// @route   GET /api/admin/reports/loans-by-package
// @access  Private (Admin only)
exports.getLoansByPackageReport = async (req, res) => {
    try {
        const result = await Loan.aggregate([
            { $match: { status: { $in: ['Approved', 'Repaid'] } } },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'loanPackage',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            { $unwind: '$packageDetails' },
            {
                $group: {
                    _id: '$loanPackage',
                    packageTitle: { $first: '$packageDetails.title' },
                    packageMinAmount: { $first: '$packageDetails.minLoanAmount' },
                    packageMaxAmount: { $first: '$packageDetails.maxLoanAmount' },
                    totalLoans: { $sum: 1 },
                    totalAmountDisbursed: { $sum: '$approvedAmount' },
                    totalOutstanding: { $sum: '$currentOutstandingAmount' }
                }
            },
            { $sort: { packageMinAmount: 1 } }
        ]);

        const loansByPackageReport = result.map(item => ({
            package: item.packageTitle,
            count: item.totalLoans,
            amount: item.totalAmountDisbursed,
            collected: item.totalAmountDisbursed - item.totalOutstanding,
            pending: item.totalOutstanding
        }));


        res.status(OK).json({ message: FETCH_SUCCESS, loansByPackage: loansByPackageReport });
    } catch (error) {
        console.error("Error generating loans by package report:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Generate Agent Performance Report
// @route   GET /api/admin/reports/agent-performance
// @access  Private (Admin only)
exports.getAgentPerformanceReport = async (req, res) => {
    try {
        const result = await User.aggregate([
            { $match: { role: 'agent' } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'createdBy',
                    as: 'createdUsers'
                }
            },
            { $unwind: { path: '$createdUsers', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'loans',
                    localField: 'createdUsers._id',
                    foreignField: 'userId',
                    as: 'userLoans'
                }
            },
            { $unwind: { path: '$userLoans', preserveNullAndEmptyArrays: true } },
            { $match: { 'userLoans.status': { $in: ['Approved', 'Repaid'] } } },
            {
                $group: {
                    _id: '$_id',
                    agentName: { $first: '$fullName' },
                    agentEmail: { $first: '$email' },
                    totalUsers: { $sum: { $cond: [{ $ifNull: ['$createdUsers._id', false] }, 1, 0] } },
                    loansProcessed: { $sum: { $cond: [{ $ifNull: ['$userLoans._id', false] }, 1, 0] } },
                    amountDisbursed: { $sum: '$userLoans.approvedAmount' },
                    totalOutstanding: { $sum: '$userLoans.currentOutstandingAmount' }
                }
            },
            {
                $addFields: {
                    amountCollected: { $subtract: ['$amountDisbursed', '$totalOutstanding'] }
                }
            },
            {
                $lookup: {
                    from: 'commissions',
                    localField: '_id',
                    foreignField: 'agentId',
                    as: 'agentCommissionSetting'
                }
            },
            {
                $addFields: {
                    commissionEarned: {
                        $multiply: [
                            '$amountDisbursed',
                            { $ifNull: [{ $arrayElemAt: ['$agentCommissionSetting.commissionRate', 0] }, 0] },
                            0.01
                        ]
                    }
                }
            },
            { $sort: { agentName: 1 } }
        ]);

        const agentPerformanceReport = result.map(agent => ({
            agent: agent.agentName,
            users: agent.totalUsers,
            loans: agent.loansProcessed,
            disbursed: agent.amountDisbursed || 0,
            collected: agent.amountCollected || 0,
            commission: agent.commissionEarned || 0,
        }));

        res.status(OK).json({ message: FETCH_SUCCESS, agentPerformance: agentPerformanceReport });
    } catch (error) {
        console.error("Error generating agent performance report:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// NEW: @desc    Download Monthly Performance Report as CSV
// @route   GET /api/admin/reports/monthly-performance/download/csv
// @access  Private (Admin only)
exports.downloadMonthlyPerformanceCsv = async (req, res) => {
    try {
        const monthlyPerformanceData = await exports.getMonthlyPerformanceReportData(); // Re-use the data generation logic

        const columns = [
            { key: 'month', header: 'Month' },
            { key: 'disbursed', header: 'Amount Disbursed (₹)' },
            { key: 'collected', header: 'Amount Collected (₹)' },
            { key: 'pending', header: 'Amount Pending (₹)' },
            { key: 'loansCount', header: 'Loans Count' }
        ];

        stringify(monthlyPerformanceData, { header: true, columns: columns }, (err, output) => {
            if (err) {
                console.error("Error generating CSV:", err);
                return res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: err.message });
            }

            res.header('Content-Type', 'text/csv');
            res.attachment('monthly_performance_report.csv');
            res.send(output);
        });

    } catch (error) {
        console.error("Error downloading monthly performance CSV:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// NEW: @desc    Download Monthly Performance Report as PDF
// @route   GET /api/admin/reports/monthly-performance/download/pdf
// @access  Private (Admin only)
exports.downloadMonthlyPerformancePdf = async (req, res) => {
    try {
        const monthlyPerformanceData = await exports.getMonthlyPerformanceReportData(); // Re-use the data generation logic

        const doc = new PDFDocument();
        const filename = 'monthly_performance_report.pdf';

        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Monthly Performance Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        if (monthlyPerformanceData && monthlyPerformanceData.length > 0) {
            doc.fontSize(10).text('Month | Disbursed (₹) | Collected (₹) | Pending (₹) | Loans Count');
            doc.text('----------------------------------------------------------------------------------------------------------------------------------');
            monthlyPerformanceData.forEach(row => {
                doc.text(`${row.month} | ${row.disbursed.toLocaleString()} | ${row.collected.toLocaleString()} | ${row.pending.toLocaleString()} | ${row.loansCount}`);
            });
        } else {
            doc.text('No monthly performance data available.');
        }

        doc.end();

    } catch (error) {
        console.error("Error downloading monthly performance PDF:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// HELPER: Re-use data generation logic from getMonthlyPerformanceReport
// This function is NOT exposed as an endpoint directly, but called by other functions.
exports.getMonthlyPerformanceReportData = async () => {
    const result = await Loan.aggregate([
        { $match: { status: { $in: ['Approved', 'Repaid'] } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                totalDisbursed: { $sum: "$approvedAmount" },
                loansCount: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    const paymentsResult = await Payment.aggregate([
        { $match: { status: 'Approved' } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
                totalCollected: { $sum: "$amountPaid" }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    const monthlyReports = result.map(loanMonth => {
        const paymentMonth = paymentsResult.find(pm => pm._id === loanMonth._id);
        const collected = paymentMonth ? paymentMonth.totalCollected : 0;
        const pending = loanMonth.totalDisbursed - collected;

        return {
            month: loanMonth._id,
            disbursed: loanMonth.totalDisbursed,
            collected: collected,
            pending: pending > 0 ? pending : 0,
            overdue: 0, // This still requires more complex aggregation
            loansCount: loanMonth.loansCount
        };
    });
    return monthlyReports;
};

exports.getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await new Setting().save();
        }
        res.status(OK).json({ message: FETCH_SUCCESS, settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Upload or update the payment QR code
// @route   PUT /api/admin/settings/payment-qr
// @access  Private (Admin only)
exports.updatePaymentQrCode = async (req, res) => {
    if (!req.file) {
        return res.status(BAD_REQUEST).json({ message: "QR code image is required.", errorCode: "IMAGE_MISSING" });
    }

    try {
        const currentSettings = await Setting.findOne();

        if (currentSettings && currentSettings.paymentQrCodeUrl) {
            await deleteFileFromSpaces(currentSettings.paymentQrCodeUrl);
        }

        const newQrUrl = await uploadFileToSpaces(req.file, 'settings');

        const updatedSettings = await Setting.findOneAndUpdate(
            {},
            { paymentQrCodeUrl: newQrUrl },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(OK).json({ message: "Payment QR code updated successfully.", settings: updatedSettings });

    } catch (error) {
        console.error("Error updating QR code:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};
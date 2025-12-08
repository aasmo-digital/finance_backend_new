// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const { SUPER_ADMIN, ADMIN, AGENT, USER } = require('../constants/roles');

// const userSchema = new mongoose.Schema({
//     fullName: {
//         type: String,
//         required: function() { return this.role !== SUPER_ADMIN; } // SuperAdmin might not need a full name in a simple setup
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         lowercase: true,
//         trim: true,
//         match: [/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please fill a valid email address']
//     },
//     password: {
//         type: String,
//         required: true,
//         minlength: 6 // Enforce minimum password length
//     },
//     phone: {
//         type: String,
//         required: function() { return this.role === AGENT; },
//         unique: function() { return this.role === AGENT; }
//     },
//     status: {
//         type: String,
//         enum: ['Active', 'Inactive', 'Suspended'],
//         default: 'Inactive' // Default for new users, SuperAdmin/Admin can set active
//     },
//     role: {
//         type: String,
//         enum: [SUPER_ADMIN, ADMIN, AGENT, USER],
//         default: USER,
//         required: true
//     },
//     country: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     state: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     city: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     // Agent Specific Fields
//     packageId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Package",
//         required: function() { return this.role === AGENT; }
//     },
//     usersRegisteredCount: { // To track how many users an agent has registered
//         type: Number,
//         default: 0,
//         required: function() { return this.role === AGENT; }
//     },
//     shopImage: { // URL to DigitalOcean Spaces
//         type: String,
//         default: "",
//         required: function() { return this.role === AGENT; }
//     },
//     profileImage: { // URL to DigitalOcean Spaces
//         type: String,
//         default: "",
//         required: function() { return this.role === AGENT; }
//     },
//     bankName: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     bankAccountNumber: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     ifscCode: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     // Who created this user (relevant for users created by Admin/Agent)
//     createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User", // Refers to another User (Admin or Agent)
//         required: function() { return this.role === USER && this.byAgentOrAdmin; } // Required if created by agent/admin
//     },
//     byAgentOrAdmin: { // To distinguish users created by self-registration vs. admin/agent
//         type: Boolean,
//         default: false
//     },
//     currentLoanEligibilityPackage: { // For users, which loan package they are eligible for
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Package",
//         default: null
//     },
//     lastLoanAmount: { // To track the last loan amount for calculating next eligibility
//         type: Number,
//         default: 0
//     }
// }, { timestamps: true });

// // Hash password before saving
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) {
//         return next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

// // Method to compare password
// userSchema.methods.matchPassword = async function (enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);

// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
// const { SUPER_ADMIN, ADMIN, AGENT, USER } = require('../constants/roles');

// const userSchema = new mongoose.Schema({
//     fullName: {
//         type: String,
//         required: function() { return this.role !== SUPER_ADMIN; }
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         lowercase: true,
//         trim: true,
//         match: [/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please fill a valid email address']
//     },
//     password: {
//         type: String,
//         required: true,
//         minlength: 6
//     },
//     phone: {
//         type: String,
//         // Yaha changes kiye gaye hain:
//         required: function() { return this.role === AGENT; },
//         unique: true,  // Unique rahega
//         sparse: true   // SPARSE bahut zaroori hai. Ye allow karega ki multiple users ka phone 'null' ho sake.
//     },
//     status: {
//         type: String,
//         enum: ['Active', 'Inactive', 'Suspended'],
//         default: 'Inactive'
//     },
//     role: {
//         type: String,
//         enum: [SUPER_ADMIN, ADMIN, AGENT, USER],
//         default: USER,
//         required: true
//     },
//     country: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     state: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     city: {
//         type: String,
//         required: function() { return this.role === USER || this.role === AGENT; }
//     },
//     // Agent Specific Fields
//     packageId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Package",
//         required: function() { return this.role === AGENT; }
//     },
//     usersRegisteredCount: {
//         type: Number,
//         default: 0,
//         required: function() { return this.role === AGENT; }
//     },
//     shopImage: {
//         type: String,
//         default: "",
//         required: function() { return this.role === AGENT; }
//     },
//     profileImage: {
//         type: String,
//         default: "",
//         required: function() { return this.role === AGENT; }
//     },
//     bankName: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     bankAccountNumber: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     ifscCode: {
//         type: String,
//         required: function() { return this.role === AGENT; }
//     },
//     // Who created this user
//     createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         // Logic fix: Check if req.user exists in controller logic, here it is fine
//         required: function() { return this.role === USER && this.byAgentOrAdmin; }
//     },
//     byAgentOrAdmin: {
//         type: Boolean,
//         default: false
//     },
//     currentLoanEligibilityPackage: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Package",
//         default: null
//     },
//     lastLoanAmount: {
//         type: Number,
//         default: 0
//     }
// }, { timestamps: true });

// // Hash password before saving
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) {
//         return next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

// userSchema.methods.matchPassword = async function (enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);


const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { SUPER_ADMIN, ADMIN, AGENT, USER } = require('../constants/roles');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: function () { return this.role !== SUPER_ADMIN; }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    phone: {
        type: String,
        required: function () { return this.role === AGENT; },
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Inactive'
    },
    role: {
        type: String,
        enum: [SUPER_ADMIN, ADMIN, AGENT, USER],
        default: USER,
        required: true
    },
    country: {
        type: String,
        required: function () { return this.role === USER || this.role === AGENT; }
    },
    state: {
        type: String,
        required: function () { return this.role === USER || this.role === AGENT; }
    },
    city: {
        type: String,
        required: function () { return this.role === USER || this.role === AGENT; }
    },
    // Agent Specific Fields
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        required: function () { return this.role === AGENT; }
    },
    usersRegisteredCount: {
        type: Number,
        default: 0,
        required: function () { return this.role === AGENT; }
    },
    shopImage: {
        type: String,
        default: "",
        required: function () { return this.role === AGENT; }
    },
    profileImage: {
        type: String,
        default: "",
        required: function () { return this.role === AGENT; }
    },
    bankName: {
        type: String,
        required: function () { return this.role === AGENT; }
    },
    bankAccountNumber: {
        type: String,
        required: function () { return this.role === AGENT; }
    },
    ifscCode: {
        type: String,
        required: function () { return this.role === AGENT; }
    },
    // Who created this user
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () { return this.role === USER && this.byAgentOrAdmin; }
    },
    byAgentOrAdmin: {
        type: Boolean,
        default: false
    },
    // CHANGE: Renamed for clarity and added plan level tracking
    lastLoanAmount: {
        type: Number,
        default: 0
    },
    currentPlanLevel: { // Tracks which loan plan level the user is on (e.g., 1 for Plan 1, 2 for Plan 2)
        type: Number,
        default: 1
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
// const mongoose = require("mongoose");

// const packageSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true
//     },
//     description: {
//         type: String,
//         default: ""
//     },
//     type: { // 'loan' for user loan eligibility, 'agent' for agent user registration limit
//         type: String,
//         enum: ['loan', 'agent'],
//         required: true
//     },
//     price: { // Relevant for agent packages, or if loan packages have a "fee"
//         type: Number,
//         default: 0
//     },
//     validityInDays: { // Relevant for agent packages (e.g., package valid for 30 days)
//         type: Number,
//         default: 0
//     },
//     maxUsers: { // Specific for 'agent' type packages
//         type: Number,
//         default: 0,
//         required: function() { return this.type === 'agent'; }
//     },
//     minLoanAmount: { // Specific for 'loan' type packages
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     maxLoanAmount: { // Specific for 'loan' type packages
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     installmentMonths: { // Default installment months for this loan package
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     status: {
//         type: String,
//         enum: ['active', 'inactive'],
//         default: "inactive"
//     },
// }, { timestamps: true });

// module.exports = mongoose.model('Package', packageSchema);



// const mongoose = require("mongoose");

// const packageSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true
//     },
//     description: {
//         type: String,
//         default: ""
//     },
//     type: { // 'loan' for user loan eligibility, 'agent' for agent user registration limit
//         type: String,
//         enum: ['loan', 'agent'],
//         required: true
//     },
//     price: { // Relevant for agent packages, or if loan packages have a "fee"
//         type: Number,
//         default: 0
//     },
//     validityInDays: { // Relevant for agent packages (e.g., package valid for 30 days)
//         type: Number,
//         default: 0
//     },
//     maxUsers: { // Specific for 'agent' type packages
//         type: Number,
//         default: 0,
//         required: function() { return this.type === 'agent'; }
//     },
//     minLoanAmount: { // Specific for 'loan' type packages
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     maxLoanAmount: { // Specific for 'loan' type packages
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     // ADDED: Interest Rate field for loan packages
//     interestRate: { // Default interest rate for this loan package
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     installmentMonths: { // Default installment months for this loan package
//         type: Number,
//         required: function() { return this.type === 'loan'; }
//     },
//     status: {
//         type: String,
//         enum: ['active', 'inactive'],
//         default: "inactive"
//     },
// }, { timestamps: true });

// module.exports = mongoose.model('Package', packageSchema);



const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        enum: ['loan', 'agent'],
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    validityInDays: {
        type: Number,
        default: 0
    },
    maxUsers: {
        type: Number,
        default: 0,
        required: function () { return this.type === 'agent'; }
    },
    minLoanAmount: {
        type: Number,
        required: function () { return this.type === 'loan'; }
    },
    maxLoanAmount: {
        type: Number,
        required: function () { return this.type === 'loan'; }
    },
    interestRate: {
        type: Number,
        required: function () { return this.type === 'loan'; }
    },
    installmentMonths: {
        type: Number,
        required: function () { return this.type === 'loan'; }
    },
    planLevel: {
        type: Number,
        // CHANGE START: Replaced 'required' with a more robust 'validate' function
        validate: {
            validator: function (value) {
                // If it's a loan package, a value for planLevel must exist (not be null or undefined).
                if (this.type === 'loan') {
                    return value != null; // Use != null to check for both undefined and null
                }
                // If it's not a loan package (e.g., 'agent'), this validation passes.
                return true;
            },
            message: 'Plan Level is required for loan packages.'
        }
        // CHANGE END
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: "inactive"
    },
}, { timestamps: true });

packageSchema.index({ type: 1, planLevel: 1 }, { unique: true, partialFilterExpression: { type: 'loan' } });

module.exports = mongoose.model('Package', packageSchema);
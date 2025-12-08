const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    loanPackage: { // The package associated with this loan application
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        required: true
    },
    requestedAmount: {
        type: Number,
        required: true,
    },
    approvedAmount: { // The actual amount approved by admin, might be different from requested
        type: Number,
        default: 0
    },
    interestRate: { // Set by admin on approval
        type: Number,
        default: 0
    },
    totalAmountToRepay: { // approvedAmount + interest
        type: Number,
        default: 0
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Repaid'],
        default: 'Pending'
    },
    approvedBy: { // Admin who approved the loan
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    installmentDurationMonths: { // Pulled from package or set by admin
        type: Number,
        required: true
    },
    currentOutstandingAmount: {
        type: Number,
        default: 0
    },
    isFirstLoan: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
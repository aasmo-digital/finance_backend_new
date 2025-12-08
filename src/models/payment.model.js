const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    installmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Installment",
        required: true,
        unique: true // One payment per installment
    },
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loan",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    amountPaid: {
        type: Number,
        required: true
    },
    paymentScreenshot: { // URL to DigitalOcean Spaces
        type: String,
        required: true
    },
    paymentDate: { // Date when user claims payment was made
        type: Date,
        required: true
    },
    submittedBy: { // User or Agent who submitted the payment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: { // Admin who approved the payment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rejectionReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
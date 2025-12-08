const mongoose = require("mongoose");

const installmentSchema = new mongoose.Schema({
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
    installmentNumber: {
        type: Number,
        required: true
    },
    amountDue: { // Amount including interest for this installment
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Upcoming', 'Pending', 'Paid', 'Overdue'], // Pending for current, Paid after approval, Overdue after due date passes
        default: 'Upcoming'
    },
    paymentId: { // Link to the Payment model
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null
    },
    paidDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Installment', installmentSchema);
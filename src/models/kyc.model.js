const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true // A user should only have one KYC record
    },
    adharCard: {
        type: String,
        required: true,
        unique: true
    },
    panCard: {
        type: String,
        required: true,
        unique: true
    },
    bankName: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true,
        unique: true
    },
    ifscCode: {
        type: String,
        required: true
    },
    adharCardImage: { // URL to DigitalOcean Spaces
        type: String,
        required: true
    },
    panCardImage: { // URL to DigitalOcean Spaces
        type: String,
        required: true
    },
    passBookImage: { // URL to DigitalOcean Spaces
        type: String,
        required: true
    },
    userImage: { // URL to DigitalOcean Spaces (e.g., selfie)
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvedBy: { // Admin or Agent who approved it (if byAgentOrAdmin is true on User model)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Kyc', kycSchema);
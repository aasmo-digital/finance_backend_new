const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Refers to a User with role 'agent'
        required: true,
        unique: true // One commission rate per agent
    },
    commissionRate: { // Percentage or fixed amount per loan disbursed
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Commission', commissionSchema);
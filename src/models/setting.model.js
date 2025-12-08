const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    paymentQrCodeUrl: {
        type: String,
        default: ''
    },
    // भविष्य में आप यहाँ अन्य सेटिंग्स जोड़ सकते हैं
    // supportEmail: { type: String },
}, { timestamps: true });

// मॉडल का नाम 'Setting' (सिंगुलर) रखें, Mongoose इसे 'settings' (प्लुरल) कलेक्शन बना देगा।
module.exports = mongoose.model('Setting', settingsSchema);
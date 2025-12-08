// src/controllers/public.controller.js

const Package = require('../models/package.model');
const { OK, INTERNAL_SERVER_ERROR } = require('../constants/statusCodes');
const { FETCH_SUCCESS, SERVER_ERROR } = require('../constants/messages');
const Setting = require('../models/setting.model');

// @desc    Get all active loan packages for users
// @route   GET /api/public/loan-packages
// @access  Public (or Authenticated Users)
exports.getActiveLoanPackages = async (req, res) => {
    try {
        const { planLevel } = req.query;
        const query = {
            type: 'loan',
            status: 'active'
        };

        if (planLevel) {
            query.planLevel = planLevel;
        }

        const packages = await Package.find(query).sort({ planLevel: 1 });
        
        res.status(OK).json({ message: FETCH_SUCCESS, packages });
    } catch (error) {
        console.error("Error fetching active loan packages:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};

// @desc    Get public system settings (like QR code)
// @route   GET /api/public/settings
// @access  Authenticated Users
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await Setting.findOne().select('paymentQrCodeUrl -_id');
        res.status(OK).json({ message: FETCH_SUCCESS, settings });
    } catch (error) {
        console.error("Error fetching public settings:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, error: error.message });
    }
};
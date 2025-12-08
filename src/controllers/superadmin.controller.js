const User = require('../models/user.model');
const { CREATED, BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, OK } = require('../constants/statusCodes');
const {
    ALL_FIELDS_REQUIRED,
    USER_EXISTS,
    REGISTER_SUCCESS,
    SERVER_ERROR,
    FETCH_SUCCESS,
    NOT_FOUND,
    UPDATED_SUCCESS,
    DELETED_SUCCESS
} = require('../constants/messages');
const { SUPER_ADMIN, ADMIN } = require('../constants/roles');

// @desc    Register a new Admin by Super Admin
// @route   POST /api/superadmin/admin/register
// @access  Private (Super Admin only)
exports.registerAdmin = async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(BAD_REQUEST).json({ message: ALL_FIELDS_REQUIRED, errorCode: "MISSING_FIELDS" });
    }

    try {
        let admin = await User.findOne({ email });
        if (admin) {
            return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "ADMIN_EXISTS" });
        }

        admin = new User({ fullName, email, password, role: ADMIN, status: 'Active' });
        await admin.save();

        res.status(CREATED).json({ message: REGISTER_SUCCESS, user: { id: admin._id, email: admin.email, role: admin.role } });
    } catch (error) {
        console.error("Error during admin registration by super admin:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get all Admins
// @route   GET /api/superadmin/admins
// @access  Private (Super Admin only)
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: ADMIN }).select('-password'); // Exclude password
        res.status(OK).json({ message: FETCH_SUCCESS, admins });
    } catch (error) {
        console.error("Error fetching all admins:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Get Admin by ID
// @route   GET /api/superadmin/admin/:id
// @access  Private (Super Admin only)
exports.getAdminById = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await User.findOne({ _id: id, role: ADMIN }).select('-password');
        if (!admin) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND, errorCode: "ADMIN_NOT_FOUND" });
        }
        res.status(OK).json({ message: FETCH_SUCCESS, admin });
    } catch (error) {
        console.error("Error fetching admin by ID:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Update Admin details by Super Admin
// @route   PUT /api/superadmin/admin/:id
// @access  Private (Super Admin only)
exports.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, status } = req.body; // Password change would be a separate endpoint for security

        let admin = await User.findOne({ _id: id, role: ADMIN });
        if (!admin) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND, errorCode: "ADMIN_NOT_FOUND" });
        }

        if (email && email !== admin.email) {
            const existing = await User.findOne({ email });
            if (existing && existing._id.toString() !== id) {
                return res.status(CONFLICT).json({ message: USER_EXISTS, errorCode: "EMAIL_TAKEN" });
            }
        }

        admin.fullName = fullName || admin.fullName;
        admin.email = email || admin.email;
        admin.status = status || admin.status; // Super Admin can activate/deactivate
        await admin.save();

        res.status(OK).json({ message: UPDATED_SUCCESS, admin: admin.select('-password') });
    } catch (error) {
        console.error("Error updating admin by super admin:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};

// @desc    Delete Admin by Super Admin
// @route   DELETE /api/superadmin/admin/:id
// @access  Private (Super Admin only)
exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await User.findOneAndDelete({ _id: id, role: ADMIN });
        if (!admin) {
            return res.status(NOT_FOUND).json({ message: NOT_FOUND, errorCode: "ADMIN_NOT_FOUND" });
        }
        res.status(OK).json({ message: DELETED_SUCCESS });
    } catch (error) {
        console.error("Error deleting admin by super admin:", error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ message: SERVER_ERROR, errorCode: "SERVER_ERROR" });
    }
};
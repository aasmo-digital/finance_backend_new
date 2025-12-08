const jwt = require('jsonwebtoken');
const { UNAUTHORIZED, FORBIDDEN, BAD_REQUEST } = require('../constants/statusCodes');
const {
    ACCESS_DENIED_NO_TOKEN,
    INVALID_TOKEN,
    USER_NOT_FOUND_TOKEN,
    ACCESS_DENIED_FORBIDDEN
} = require('../constants/messages');
const { SUPER_ADMIN, ADMIN, AGENT, USER } = require('../constants/roles');

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(UNAUTHORIZED).json({ message: ACCESS_DENIED_NO_TOKEN, errorCode: 'AUTH_TOKEN_MISSING' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { id, email, role }
        if (!req.user.id || !req.user.role) {
            return res.status(BAD_REQUEST).json({ message: USER_NOT_FOUND_TOKEN, errorCode: 'INVALID_TOKEN_STRUCTURE' });
        }
        next();
    } catch (error) {
        // Specific JWT errors handled by errorHandler, but good to have a generic here too.
        if (error.name === 'TokenExpiredError') {
            return res.status(UNAUTHORIZED).json({ message: 'Token expired', errorCode: 'TOKEN_EXPIRED' });
        }
        return res.status(UNAUTHORIZED).json({ message: INVALID_TOKEN, errorCode: 'INVALID_TOKEN' });
    }
};

const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(UNAUTHORIZED).json({ message: ACCESS_DENIED_NO_TOKEN, errorCode: 'AUTH_ROLE_MISSING' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(FORBIDDEN).json({ message: ACCESS_DENIED_FORBIDDEN, errorCode: 'AUTH_ROLE_UNAUTHORIZED' });
        }
        next();
    };
};

module.exports = {
    authenticate,
    authorize,
    SUPER_ADMIN,
    ADMIN,
    AGENT,
    USER
};
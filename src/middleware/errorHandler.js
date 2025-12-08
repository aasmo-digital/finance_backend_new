const { INTERNAL_SERVER_ERROR } = require('../constants/statusCodes');
const { SERVER_ERROR } = require('../constants/messages');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging

    // Handle Mongoose CastError (e.g., invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            message: `Invalid ${err.path}: ${err.value}`,
            errorCode: 'INVALID_INPUT'
        });
    }

    // Handle Mongoose duplicate key error (e.g., unique email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            message: `Duplicate field value: ${field}. Please use another value.`,
            errorCode: 'DUPLICATE_FIELD'
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Invalid token, please login again',
            errorCode: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Token expired, please login again',
            errorCode: 'TOKEN_EXPIRED'
        });
    }

    // Custom errors (if you define them)
    // if (err instanceof CustomError) {
    //     return res.status(err.statusCode).json({
    //         message: err.message,
    //         errorCode: err.errorCode
    //     });
    // }

    // Default to 500 server error
    res.status(err.statusCode || INTERNAL_SERVER_ERROR).json({
        message: err.message || SERVER_ERROR,
        errorCode: err.errorCode || 'UNEXPECTED_ERROR'
    });
};

module.exports = { errorHandler };
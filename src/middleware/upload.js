const multer = require('multer');
const { BAD_REQUEST } = require('../constants/statusCodes');
const { ONLY_IMAGE_ALLOWED } = require('../constants/messages');

const storage = multer.memoryStorage(); // Store files in memory as a Buffer

const fileFilter = (req, file, cb) => {
    // Check if the file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error(ONLY_IMAGE_ALLOWED), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB file size limit
    },
});

module.exports = upload;
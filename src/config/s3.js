const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
    region: "us-east-1", // DigitalOcean Spaces typically uses 'us-east-1' for endpoint mapping
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
});

const uploadFileToSpaces = async (file, folder = 'uploads') => {
    // Ensure file.originalname is not undefined
    const originalname = file.originalname || 'unknown_file';
    const uniqueSuffix = `${uuidv4()}${path.extname(originalname)}`;
    const fileName = `${folder}/${uniqueSuffix}`;

    const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read", // Makes the uploaded file publicly accessible
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const url = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${fileName}`;
        console.log("✅ File uploaded to Spaces:", url);
        return url;
    } catch (err) {
        console.error("❌ Error uploading file to Spaces:", err);
        throw err;
    }
};

const deleteFileFromSpaces = async (fileUrl) => {
    try {
        const bucket = process.env.DO_SPACES_BUCKET;
        const endpoint = process.env.DO_SPACES_ENDPOINT;

        // Extract the Key (fileName) from the URL
        const urlParts = fileUrl.split(`https://${bucket}.${endpoint}/`);
        if (urlParts.length < 2) {
            console.warn("Invalid file URL for deletion:", fileUrl);
            return;
        }
        const key = urlParts[1];

        const params = {
            Bucket: bucket,
            Key: key,
        };

        const command = new DeleteObjectCommand(params);
        await s3Client.send(command);
        console.log("✅ File deleted from Spaces:", fileUrl);
    } catch (err) {
        console.error("❌ Error deleting file from Spaces:", err);
        // Do not throw to prevent stopping the main flow if file is already gone or access issue
    }
};

module.exports = { uploadFileToSpaces, deleteFileFromSpaces };
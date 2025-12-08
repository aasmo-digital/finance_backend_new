const mongoose = require('mongoose');
const { MONGO_URI } = process.env;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true, // Deprecated in Mongoose 6+
            // useFindAndModify: false // Deprecated in Mongoose 6+
        });
        console.log("MongoDB Connected Successfully!");
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;
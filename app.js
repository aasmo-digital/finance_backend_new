const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const allRoutes = require('./src/routes'); // Import the main routes index

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: "*", // Adjust as needed for production (e.g., specific domains)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', allRoutes); // All API routes will be prefixed with /api

// Error Handling Middleware (must be last)
app.use(errorHandler);

module.exports = app;
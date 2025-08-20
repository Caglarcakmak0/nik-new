const mainRoute = require('./routes/index.js');
const mongoose = require("mongoose");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();
const port = process.env.PORT || 8000;

dotenv.config();


const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected MongoDb");
    } catch (error) {
        throw error;
    }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

const corsOptions = {
    origin: '*',
    credentials: true,
};

app.use(cors(corsOptions));

// Static file serving for uploaded images (cache for 1 year)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '365d',
    immutable: true,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
}));

// Swagger setup (OpenAPI)
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Portal API',
        version: '1.0.0',
        description: 'Portal backend için OpenAPI dokümantasyonu',
    },
    servers: [
        { url: 'http://localhost:8000/api', description: 'Local' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [{ bearerAuth: [] }]
};

const swaggerOptions = {
    swaggerDefinition,
    apis: [
        path.join(__dirname, 'routes', '*.js'),
        path.join(__dirname, 'models', '*.js')
    ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", mainRoute);

// CoachPerformance background job
const { startCoachPerformanceJob } = require('./jobs/coachPerformance');
const { startPerformanceNotificationsJob } = require('./jobs/performanceNotifications');
const { startLeaderboardNotificationsJob } = require('./jobs/leaderboardNotifications');

app.listen(port, () => {
    connect();
    console.log(`Server is running at port ${port}.`);
    // Başlat: periyodik hesaplama (env ile override edilebilir)
    startCoachPerformanceJob();
    // Başlat: performans bildirimleri (öğle/akşam)
    startPerformanceNotificationsJob();
    startLeaderboardNotificationsJob();
})
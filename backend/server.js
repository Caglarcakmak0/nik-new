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

// .env yükleme: önce backend klasörü, bulunmazsa proje kökü (bir üst klasör)
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URL) {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Alternatif adları destekle
const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;


const connect = async () => {
    if (!MONGO_URL) {
        console.error('[startup] Mongo bağlantı URL bulunamadı. Lütfen .env içine MONGO_URL ekleyin. Örnek:');
        console.error('MONGO_URL=mongodb://localhost:27017/portal');
        console.error('Ayrıca MONGODB_URI veya MONGO_URI isimleri de desteklenir.');
        throw new Error('Missing MONGO_URL');
    }
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected MongoDb');
    } catch (error) {
        console.error('[startup] Mongo bağlantı hatası:', error?.message);
        throw error;
    }
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

const corsOptions = {
    origin: '*',
    credentials: true,
};

app.use(cors(corsOptions));

// === Request Timing & Performance Metrics (in-memory) ===
const os = require('os');
const responseTimes = [];// rolling window (last 200)
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const diff = Number(process.hrtime.bigint() - start) / 1e6; // ms
        responseTimes.push(diff);
        if (responseTimes.length > 200) responseTimes.shift();
    });
    next();
});

// Expose a lightweight function other modules (admin route) can use
app.getPerformanceSnapshot = () => {
    const rt = responseTimes.slice();
    const avg = rt.length ? rt.reduce((a, b) => a + b, 0) / rt.length : 0;
    const p95 = (() => {
        if (!rt.length) return 0;
        const sorted = [...rt].sort((a,b)=>a-b);
        return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    })();
    const mem = process.memoryUsage();
    const loadArr = os.loadavg ? os.loadavg() : [0,0,0];
    const cpuCount = os.cpus ? os.cpus().length : 1;
    let systemLoad = 0;
    if (loadArr && loadArr[0] && cpuCount) {
        systemLoad = Math.min(100, (loadArr[0] / cpuCount) * 100);
    } else {
        // Fallback: use RSS memory ratio
        systemLoad = Math.min(100, (mem.rss / os.totalmem()) * 100);
    }
    return {
        avgResponseTime: avg,
        p95ResponseTime: p95,
        sampleCount: rt.length,
        systemLoad,
        memory: {
            rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
            heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
            heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(2)
        },
        uptimeSeconds: process.uptime(),
        cpuCount
    };
};

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
const { startHabitJobs } = require('./jobs/habitJobs');

async function startServer(customPort) {
    const p = customPort || port;
    console.log(`[startup] Server listening on port ${p}. Mongo bağlanıyor...`);
    try {
        await connect();
        console.log(`[startup] Ready -> http://localhost:${p}`);
        startCoachPerformanceJob();
        startPerformanceNotificationsJob();
        startLeaderboardNotificationsJob();
        startHabitJobs();
        return app.listen(p);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.error('Uygulama Mongo olmadan çalışmayacak. Düzeltip yeniden başlatın.');
        throw error;
    }
}

// Auto start only if run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
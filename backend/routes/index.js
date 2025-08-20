/**
 * ROUTE INDEX - 🗂️ Route Orchestrator
 * 
 * Amaç: Tüm API route'larını merkezi olarak yönetir ve Express app'e register eder
 * 
 * Route Mapping:
 * - /users/* → users.js (👤 Kullanıcı yönetimi)
 * - /image/* → image.js (🖼️ Genel görsel yönetimi)  
 * - /analytics/* → analytics.js (📊 Dashboard istatistikleri)
 * - /upload/* → upload.js (📤 Özel dosya yükleme)
 * 
 * Usage: server.js'de app.use('/api', routes) şeklinde import edilir
 */

const express = require("express");
const router = express.Router();

const UsersRoute = require('./users.js');
const ImageRoute = require("./image.js");
const AnalyticsRoute = require("./analytics.js");
const UploadRoute = require("./upload.js");
const StudySessionsRoute = require("./study-sessions.js");
const DailyPlansRoute = require("./daily-plans.js");
const AchievementsRoute = require("./achievements.js");
const LeaderboardRoute = require("./leaderboard.js");
const GamificationRoute = require("./gamification.js");
const CompetitionsRoute = require("./competitions.js");
const DuelsRoute = require("./duels.js");
const BackupRoute = require("./backup.js");
const CoachRoute = require("./coach.js");
const AdminRoute = require("./admin.js");
const StudentRoute = require("./student.js");
const MotivationRoute = require("./motivation.js");
const TopicMatrixRoute = require("./topicMatrix.js");
const NotificationsRoute = require("./notifications.js");

router.use("/users", UsersRoute);
router.use("/image", ImageRoute);   
router.use("/analytics", AnalyticsRoute);
router.use("/upload", UploadRoute);
router.use("/study-sessions", StudySessionsRoute);
router.use("/daily-plans", DailyPlansRoute);
router.use("/achievements", AchievementsRoute);
router.use("/leaderboard", LeaderboardRoute);
router.use("/gamification", GamificationRoute);
router.use("/competitions", CompetitionsRoute);
router.use("/duels", DuelsRoute);
router.use("/backup", BackupRoute);
router.use("/coach", CoachRoute);
router.use("/admin", AdminRoute);
router.use("/student", StudentRoute);
router.use("/motivation", MotivationRoute);
router.use("/topic-matrix", TopicMatrixRoute);
router.use("/notifications", NotificationsRoute);

module.exports = router;
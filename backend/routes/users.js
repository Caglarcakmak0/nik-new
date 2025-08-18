/**
 * USERS ROUTES - 👤 Kullanıcı Yönetimi API
 * 
 * Amaç: Kullanıcı kayıt, giriş, profil CRUD işlemleri
 * 
 * Endpoints:
 * - POST /users/register - Yeni kullanıcı kaydı (email, şifre, rol)
 * - POST /users/login - Kullanıcı girişi (JWT token döndürür)
 * - GET /users/profile - Mevcut kullanıcının profil bilgileri
 * - PUT /users/:id - Kullanıcı profil güncelleme (kişisel, eğitim, hedefler)
 * - GET /users/:id - Belirli kullanıcı bilgileri (admin veya kendisi)
 * 
 * Auth: JWT token tabanlı kimlik doğrulama
 * Data: Profil, eğitim bilgileri, target universities, tercihler
 */

const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authenticateToken = require('../auth.js');
const { checkRole, checkSameUserOrAdmin } = require('../authRoles.js');
const Users = require("../models/Users.js");
const dotenv = require("dotenv");
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

dotenv.config();


const JWT_SECRET_KEY = process.env.JWT_KEY;


// Kullanıcı oluşturma - firstName/lastName ile güncellendi
router.post("/", async (req, res) => {
    try {
        const { 
            email, 
            password, 
            firstName, 
            lastName, 
            role = 'student' // Varsayılan değer
        } = req.body;
        
        // Zorunlu alanları kontrol et
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Email ve şifre zorunludur." 
            });
        }
        
        const lowerEmail = email.toLowerCase();
        const hashedPassword = await bcryptjs.hash(password, 10);
        
        // Email kontrolü
        const existingUser = await Users.findOne({ email: lowerEmail });
        if (existingUser) { 
            return res.status(400).json({ 
                message: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor." 
            }); 
        }
        
        // Kullanıcı verisi hazırla
        const userData = { 
            email: lowerEmail, 
            password: hashedPassword, 
            firstName: firstName || '',
            lastName: lastName || '',
            role 
        };
        
        const newUser = new Users(userData);
        await newUser.save();
        
        // Hassas bilgileri çıkararak yanıt ver
        const userWithoutPassword = newUser.toObject();
        delete userWithoutPassword.password;
        delete userWithoutPassword.refreshToken;
        delete userWithoutPassword.refreshTokenVersion;
        delete userWithoutPassword.refreshTokenExpiresAt;
        
        res.status(201).json({ 
            message: "Kullanıcı başarıyla oluşturuldu!",
            data: userWithoutPassword
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There is an error: " + error });
    }
});

// Coach'un öğrencilerini getir (gerçek verilerle)
router.get("/coach/students", authenticateToken, checkRole('coach', 'admin'), async (req, res) => {
    try {
        const coachId = req.user?.userId;
        if (!coachId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const CoachStudent = require('../models/CoachStudent');
        const DailyPlan = require('../models/DailyPlan');

        // Koça bağlı aktif öğrencileri bul
        const links = await CoachStudent.find({ coachId, status: 'active' }).populate('studentId', 'firstName lastName email avatar grade stats');
        const students = links.map(l => l.studentId);

        // Öğrenci yoksa boş dön
        if (!students || students.length === 0) {
            return res.json({ message: 'Öğrenci listesi getirildi', data: [] });
        }

        const studentIds = students.map(s => s._id);

        // Son 30 gün içerisindeki plan istatistiklerini topla
        const from = new Date();
        from.setDate(from.getDate() - 30);

        const agg = await DailyPlan.aggregate([
            { $match: { userId: { $in: studentIds }, date: { $gte: from } } },
            {
                $group: {
                    _id: '$userId',
                    activePlansCount: { $sum: { $cond: [{ $in: ['$status', ['active', 'draft']] }, 1, 0] } },
                    avgCompletionRate: { $avg: '$stats.completionRate' },
                    totalStudyTime: { $sum: '$stats.totalStudyTime' }
                }
            }
        ]);

        const metricsByUser = new Map();
        agg.forEach(a => metricsByUser.set(String(a._id), a));

        const enriched = students.map(s => {
            const key = String(s._id);
            const m = metricsByUser.get(key);
            const displayName = (s.firstName && s.lastName) ? `${s.firstName} ${s.lastName}` : (s.firstName || s.lastName || s.email.split('@')[0]);
            return {
                _id: s._id,
                fullName: displayName,
                email: s.email,
                avatar: s.avatar || null,
                grade: s.grade || '12. Sınıf',
                lastActivity: s.stats?.lastActivity || s.updatedAt || s.createdAt,
                activePlansCount: m?.activePlansCount || 0,
                completionRate: Math.round(m?.avgCompletionRate || 0),
                totalStudyTime: m?.totalStudyTime || 0
            };
        });

        res.json({ message: 'Öğrenci listesi getirildi', data: enriched });
    } catch (error) {
        console.error('Coach students fetch error:', error);
        res.status(500).json({ message: 'Öğrenci listesi getirilirken hata oluştu: ' + error });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { password, email } = req.body;
        const lowerEmail = email.toLowerCase();
        const existingUser = await Users.findOne({ email: lowerEmail });
        if (!existingUser) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı!" });
        }
        const isPasswordValid = await bcryptjs.compare(password, existingUser.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Yanlış şifre!" });
        }

        // Access Token - kısa süreli (1 saat)
        const token = jwt.sign(
            {
                userId: existingUser._id,
                email: existingUser.email,
                role: existingUser.role,
                tokenVersion: existingUser.tokenVersion
            },
            JWT_SECRET_KEY,
            { expiresIn: '1h' } // Access token 1 saat
        );

        // Refresh Token - uzun süreli (7 gün) 
        const refreshToken = jwt.sign(
            {
                userId: existingUser._id,
                tokenVersion: existingUser.tokenVersion,
                refreshTokenVersion: existingUser.refreshTokenVersion + 1, // Yeni version
                type: 'refresh' // Token tipi belirt
            },
            JWT_SECRET_KEY,
            { expiresIn: '7d' } // Refresh token 7 gün
        );

        // Refresh token'ı database'e kaydet
        const refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 gün sonra expire

        await Users.findByIdAndUpdate(existingUser._id, {
            refreshToken: refreshToken,
            refreshTokenVersion: existingUser.refreshTokenVersion + 1,
            refreshTokenExpiresAt: refreshTokenExpiresAt
        });

        const userWithoutPassword = existingUser.toObject();
        delete userWithoutPassword.password;
        // Hassas refresh token verilerini response'dan çıkar
        delete userWithoutPassword.refreshToken;
        delete userWithoutPassword.refreshTokenVersion;
        delete userWithoutPassword.refreshTokenExpiresAt;

        res.status(200).json({ 
            message: "Giriş başarılı!", 
            data: userWithoutPassword, 
            token, // Access token (1 saat)
            refreshToken // Refresh token (7 gün)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There is an error: " + error });
    }
});

// Kullanıcı güncelleme - Yeni alanlarla desteklendi
router.put("/:id", authenticateToken, checkSameUserOrAdmin, async (req, res) => {
    try {
        const findUser = await Users.findById(req.params.id);
        if (!findUser) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }

        let updateData = { ...req.body };
        
        // Şifre güncelleniyorsa hash'le
        if (req.body.password) {
            const hashedPassword = await bcryptjs.hash(req.body.password, 10);
            updateData.password = hashedPassword;
        }
        
        // Güvenlik için token version'ı artır (şifre değiştiğinde)
        if (req.body.password) {
            updateData.tokenVersion = findUser.tokenVersion + 1;
        }
        
        // Hassas alanları güncellemeden çıkar
        delete updateData.refreshToken;
        delete updateData.refreshTokenVersion;
        delete updateData.refreshTokenExpiresAt;
        
        // Kullanıcıyı güncelle ve yeni halini döndür
        const updatedUser = await Users.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true, runValidators: true }
        ).select('-password -refreshToken -refreshTokenVersion -refreshTokenExpiresAt');
        
        res.status(200).json({ 
            message: "Kullanıcı başarıyla güncellendi!", 
            data: updatedUser 
        });
    } catch (error) {
        console.log(error);
        
        // Validation hatalarını kullanıcı dostu hale getir
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: "Validation hatası", 
                errors: errorMessages 
            });
        }
        
        res.status(500).json({ message: "Güncelleme hatası: " + error });
    }
});

// Login olan kullanıcının kendi profili - Tam bilgiler
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const userData = await Users.findById(req.user.userId)
            .select('-password -refreshToken -refreshTokenVersion -refreshTokenExpiresAt');
            
        if (!userData) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        // Profile completeness hesapla (0-100)
        const calculateProfileCompleteness = (user) => {
            const requiredFields = ['firstName', 'lastName', 'phone'];
            const optionalFields = ['currentSchool', 'grade', 'city', 'targetFieldType'];
            
            let completed = 0;
            let total = requiredFields.length + optionalFields.length;
            
            // Zorunlu alanları kontrol et (daha yüksek ağırlık)
            requiredFields.forEach(field => {
                if (user[field] && user[field].trim() !== '') completed += 1.5;
            });
            
            // İsteğe bağlı alanları kontrol et
            optionalFields.forEach(field => {
                if (user[field] && user[field] !== '') completed += 1;
            });
            
            return Math.min(Math.round((completed / (total * 1.25)) * 100), 100);
        };

        const profileCompleteness = calculateProfileCompleteness(userData);
        
        // Profile completeness'i database'de güncelle
        if (userData.profileCompleteness !== profileCompleteness) {
            await Users.findByIdAndUpdate(req.user.userId, { 
                profileCompleteness 
            });
        }

        res.status(200).json({ 
            message: "Profil bilgileri başarıyla getirildi", 
            data: {
                ...userData.toObject(),
                profileCompleteness
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Profil getirme hatası: " + error });
    }
});

// Kullanıcı tutorial durumunu işaretle
router.post('/tutorial/seen', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await Users.findByIdAndUpdate(
            userId,
            { hasSeenTutorial: true },
            { new: true }
        ).select('-password -refreshToken -refreshTokenVersion -refreshTokenExpiresAt');

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        res.json({ message: 'Tutorial durumu güncellendi', data: user });
    } catch (error) {
        console.error('POST /users/tutorial/seen error:', error);
        res.status(500).json({ message: 'Tutorial durumu güncellenemedi: ' + error });
    }
});

router.get("/", authenticateToken, checkRole('admin'), async (req, res) => {
    try {
        const userList = await Users.find().sort({ firstName: 1, lastName: 1 });
        const filteredList = userList.map((u) => {
            const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
            return {
                _id: u._id,
                name: displayName,
                mail: u.email,
                role: u.role === "admin" ? "Admin" : 
                      (u.role === "coach" ? "Koç" : 
                       (u.role === "student" ? "Öğrenci" : u.role))
            }
        })
        res.status(200).json({ message: "Verilere başarıyla ulaşıldı!", data: filteredList });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There is an error: " + error });
    }
})

router.get("/:id", authenticateToken, checkSameUserOrAdmin, async (req, res) => {
    try {
        const userData = await Users.findById(req.params.id).select('-password -refreshToken -refreshTokenVersion -refreshTokenExpiresAt');
        
        if (!userData) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }
        
        // İsim birleştirme - firstName + lastName
        const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email;
        const filteredData = {
            _id: userData._id,
            name: displayName,
            firstName: userData.firstName,
            lastName: userData.lastName,
            mail: userData.email,
            role: userData.role,
            phone: userData.phone,
            bio: userData.bio,
            currentSchool: userData.currentSchool,
            grade: userData.grade,
            city: userData.city
        }
        res.status(200).json({ message: "Verilere başarıyla ulaşıldı!", data: filteredData });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There is an error: " + error });
    }
})

router.delete("/:id", authenticateToken, checkRole('admin'), async (req, res) => {
    try {
        const deletedUser = await Users.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Kullanıcı başarıyla silindi!", data: deletedUser });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "There is an error: " + error });
    }
})

// Refresh Token Endpoint - Access token'ı yenileme
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token gerekli" });
        }

        // Refresh token'ı doğrula
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, JWT_SECRET_KEY);
        } catch (error) {
            return res.status(401).json({ message: "Geçersiz refresh token" });
        }

        // Token tipini kontrol et
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: "Geçersiz token tipi" });
        }

        // Kullanıcıyı database'den al
        const user = await Users.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: "Kullanıcı bulunamadı" });
        }

        // Refresh token kontrolü - database'deki ile eşleşiyor mu?
        if (user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Refresh token geçersiz" });
        }

        // Refresh token expire kontrolü
        if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
            return res.status(401).json({ message: "Refresh token süresi dolmuş" });
        }

        // Version kontrolü - güvenlik için
        if (user.refreshTokenVersion !== decoded.refreshTokenVersion) {
            return res.status(401).json({ message: "Refresh token sürümü eski" });
        }

        // Yeni Access Token oluştur
        const newAccessToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role,
                tokenVersion: user.tokenVersion
            },
            JWT_SECRET_KEY,
            { expiresIn: '1h' } // Yeni access token 1 saat
        );

        // İsteğe bağlı: Yeni refresh token da oluştur (rotation)
        const newRefreshToken = jwt.sign(
            {
                userId: user._id,
                tokenVersion: user.tokenVersion,
                refreshTokenVersion: user.refreshTokenVersion + 1,
                type: 'refresh'
            },
            JWT_SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Yeni refresh token'ı database'e kaydet
        const newRefreshTokenExpiresAt = new Date();
        newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 7);

        await Users.findByIdAndUpdate(user._id, {
            refreshToken: newRefreshToken,
            refreshTokenVersion: user.refreshTokenVersion + 1,
            refreshTokenExpiresAt: newRefreshTokenExpiresAt
        });

        res.status(200).json({
            message: "Token başarıyla yenilendi",
            token: newAccessToken, // Yeni access token
            refreshToken: newRefreshToken // Yeni refresh token
        });

    } catch (error) {
        console.log("Refresh token error:", error);
        res.status(500).json({ message: "Token yenileme hatası: " + error });
    }
});

// ====================
// Avatar Upload (self)
// ====================
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Sadece resim dosyaları kabul edilir'));
        }
        cb(null, true);
    }
});

router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Dosya yüklenmedi' });
        }

        const userId = req.user.userId;
        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        // Hedef klasör
        const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
        }

        // Dosya adı
        const filename = `avatar_${userId}_${Date.now()}.webp`;
        const filePath = path.join(avatarsDir, filename);

        // Görseli optimize et ve kaydet
        await sharp(req.file.buffer)
            .resize(256, 256, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(filePath);

        // Eski avatarı sil (sadece avatars klasöründe ise)
        if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('/uploads/avatars/')) {
            try {
                const oldAbsPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
                if (fs.existsSync(oldAbsPath)) fs.unlinkSync(oldAbsPath);
            } catch (e) {
                // sessizce geç
            }
        }

        // Kullanıcıyı güncelle
        const publicUrl = `/uploads/avatars/${filename}`;
        user.avatar = publicUrl;
        await user.save();

        return res.json({ message: 'Avatar güncellendi', avatar: publicUrl });
    } catch (error) {
        console.error('POST /users/avatar error:', error);
        return res.status(500).json({ message: error.message });
    }
});

// Get current user's stats (Leaderboard skorlarına göre)
router.get("/me/stats", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const UserStats = require('../models/UserStats');
        const Achievement = require('../models/Achievement');
        const StudySession = require('../models/StudySession');
        const PracticeExam = require('../models/PracticeExam');

        // Kullanıcının stats'ını getir
        let userStats = await UserStats.findOne({ userId }).populate('userId', 'firstName lastName email avatar');
        
        if (!userStats) {
            // Yoksa default stats oluştur
            userStats = await UserStats.create({
                userId,
                totalXP: 0,
                currentLevel: 1,
                nextLevelXP: 1000,
                currentLevelXP: 0,
                streak: 0,
                maxStreak: 0,
                totalAchievements: 0,
                weeklyXP: 0,
                monthlyXP: 0,
                dailyChallenges: []
            });
            
            userStats = await UserStats.findById(userStats._id).populate('userId', 'firstName lastName email avatar');
        }

        // Overall agregasyon: tüm zamanlar
        const sessionsAgg = await StudySession.aggregate([
            { $group: { 
                _id: '$userId', 
                totalStudyTime: { $sum: '$duration' },
                totalQuestions: { 
                    $sum: { 
                        $add: [
                            { $ifNull: [ '$questionStats.correctAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.wrongAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.blankAnswers', 0 ] }
                        ]
                    }
                }
            } }
        ]);

        const examsAgg = await PracticeExam.aggregate([
            { $group: { _id: '$userId', totalExamNet: { $sum: '$totals.net' } } }
        ]);

        const userMap = new Map();
        sessionsAgg.forEach(s => {
            userMap.set(String(s._id), { userId: String(s._id), totalStudyTime: s.totalStudyTime || 0, totalQuestions: s.totalQuestions || 0, totalExamNet: 0 });
        });
        examsAgg.forEach(e => {
            const key = String(e._id);
            const cur = userMap.get(key) || { userId: key, totalStudyTime: 0, totalQuestions: 0, totalExamNet: 0 };
            cur.totalExamNet = (cur.totalExamNet || 0) + (e.totalExamNet || 0);
            userMap.set(key, cur);
        });

        // Entry list ve sıralama
        const entries = Array.from(userMap.values()).map(v => ({
            ...v,
            _primaryScore: v.totalStudyTime || 0,
            _secondaryScore: (v.totalQuestions || 0) + Math.round(v.totalExamNet || 0),
            periodScore: (v.totalStudyTime || 0) + ((v.totalQuestions || 0) + Math.round(v.totalExamNet || 0))
        }));

        entries.sort((a, b) => {
            if (b._primaryScore !== a._primaryScore) return b._primaryScore - a._primaryScore;
            return b._secondaryScore - a._secondaryScore;
        });

        const userIdStr = String(userId);
        const selfIndex = entries.findIndex(e => e.userId === userIdStr);
        const selfAgg = selfIndex >= 0 ? entries[selfIndex] : { totalStudyTime: 0, totalQuestions: 0, totalExamNet: 0, periodScore: 0 };

        // Achievements
        const achievements = await Achievement.find({ userId, unlockedAt: { $ne: null } });
        const formattedAchievements = achievements.map(ach => ({
            id: ach._id.toString(),
            title: ach.title,
            description: ach.description,
            icon: ach.icon,
            rarity: ach.rarity,
            unlockedAt: ach.unlockedAt,
            points: ach.points
        }));

        const result = {
            _id: userStats.userId._id.toString(),
            name: `${userStats.userId.firstName || ''} ${userStats.userId.lastName || ''}`.trim() || 'Kullanıcı',
            totalScore: selfAgg.periodScore || 0,
            totalQuestions: selfAgg.totalQuestions || 0,
            totalStudyTime: selfAgg.totalStudyTime || 0,
            streak: userStats.streak || 0,
            level: userStats.currentLevel || 1,
            experience: userStats.totalXP || 0,
            achievements: formattedAchievements,
            weeklyScore: 0,
            monthlyScore: 0,
            rank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1,
            weeklyRank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1,
            monthlyRank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1
        };

        res.status(200).json({
            message: "Kullanıcı istatistikleri başarıyla getirildi",
            data: result
        });
        
    } catch (error) {
        console.error('GET /users/me/stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
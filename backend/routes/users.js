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
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sendTemplatedMail } = require('../services/mailer');

dotenv.config();


const JWT_SECRET_KEY = process.env.JWT_KEY;

// Basit in-memory rate limit (IP ve e‑posta bazlı)
const RATE_LIMIT_IP_MAX = Number(process.env.RATE_LIMIT_FORGOT_IP_MAX || 5);
const RATE_LIMIT_IP_WINDOW_MS = Number(process.env.RATE_LIMIT_FORGOT_IP_WINDOW_MS || 60 * 1000); // 1 dk
const RATE_LIMIT_EMAIL_MAX = Number(process.env.RATE_LIMIT_FORGOT_EMAIL_MAX || 3);
const RATE_LIMIT_EMAIL_WINDOW_MS = Number(process.env.RATE_LIMIT_FORGOT_EMAIL_WINDOW_MS || 60 * 60 * 1000); // 1 saat

const rateStore = {
    ip: new Map(),
    email: new Map()
};

function isLimited(map, key, max, windowMs) {
    const now = Date.now();
    const arr = map.get(key) || [];
    // Eski kayıtları temizle
    const recent = arr.filter((ts) => (now - ts) <= windowMs);
    if (recent.length >= max) {
        // Temizlenmiş diziyi geri yaz (hafızayı sınırlı tut)
        map.set(key, recent);
        return true;
    }
    recent.push(now);
    map.set(key, recent);
    return false;
}

// Basit e-posta gönderici (SMTP ile)
const mailTransporter = (() => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        return null;
    }
    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
})();

async function sendMail(to, subject, html) {
    if (!mailTransporter) {
        console.warn('SMTP yapılandırılmadı, e-posta gönderilmeyecek.');
        return;
    }
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await mailTransporter.sendMail({ from, to, subject, html });
}


// Kullanıcı oluşturma - firstName/lastName ile güncellendi
// Admin: Kullanıcı oluşturma
router.post("/", authenticateToken, checkRole('admin'), async (req, res) => {
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

// Public: Kayıt ol (self-register)
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email ve şifre zorunludur.' });
        }
        const lowerEmail = String(email).toLowerCase();

        const existing = await Users.findOne({ email: lowerEmail });
        if (existing) {
            return res.status(400).json({ message: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        // E-posta doğrulaması için token üret
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

        const newUser = await Users.create({
            email: lowerEmail,
            password: hashedPassword,
            firstName: firstName || '',
            lastName: lastName || '',
            role: 'student',
            isEmailVerified: false,
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpiresAt: expiresAt,
        });

        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const verifyUrl = `${frontendBase}/verify-email?uid=${newUser._id}&token=${rawToken}`;

        // Doğrulama e-postası gönder (templated)
        try {
            const logoUrl = process.env.LOGO_PUBLIC_URL || `${process.env.API_PUBLIC_URL || ''}/uploads/logoNik.png`;
            await sendTemplatedMail({
                to: lowerEmail,
                subject: 'E‑posta Doğrulama',
                template: 'verifyEmail',
                data: {
                    brandName: 'Nik',
                    displayName: `${(firstName || '') + ' ' + (lastName || '')}`.trim() || lowerEmail.split('@')[0],
                    verifyUrl,
                    logoUrl,
                    year: new Date().getFullYear()
                }
            });
        } catch (e) {
            console.warn('Doğrulama e-postası gönderilemedi:', e);
        }

        const safeUser = newUser.toObject();
        delete safeUser.password;
        delete safeUser.refreshToken;
        delete safeUser.refreshTokenVersion;
        delete safeUser.refreshTokenExpiresAt;
        delete safeUser.emailVerificationTokenHash;
        delete safeUser.emailVerificationExpiresAt;

        return res.status(201).json({ message: 'Kayıt başarılı. Lütfen e‑postanızı doğrulayın.', data: safeUser });
    } catch (error) {
        console.error('POST /users/register error:', error);
        return res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
    }
});

// Public: E-posta doğrula
router.post('/verify-email', async (req, res) => {
    try {
        const { uid, token } = req.body || {};
        if (!uid || !token) {
            return res.status(400).json({ message: 'Geçersiz istek.' });
        }
        const user = await Users.findById(uid);
        if (!user || !user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
            return res.status(400).json({ message: 'Token geçersiz veya süresi dolmuş.' });
        }
        if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
            await Users.findByIdAndUpdate(uid, {
                emailVerificationTokenHash: null,
                emailVerificationExpiresAt: null
            });
            return res.status(400).json({ message: 'Token süresi dolmuş.' });
        }
        const providedHash = crypto.createHash('sha256').update(token).digest('hex');
        if (providedHash !== user.emailVerificationTokenHash) {
            return res.status(400).json({ message: 'Token geçersiz.' });
        }
        await Users.findByIdAndUpdate(uid, {
            isEmailVerified: true,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null
        });
        return res.status(200).json({ message: 'E‑posta adresiniz doğrulandı.' });
    } catch (error) {
        console.error('POST /users/verify-email error:', error);
        return res.status(500).json({ message: 'E‑posta doğrulama sırasında bir hata oluştu.' });
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

// Şifremi Unuttum — reset linki gönder
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(200).json({ message: 'Eğer bu e‑posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });
        }

        // Rate limit kontrolleri
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || req.connection?.remoteAddress || 'unknown';
        const ipLimited = isLimited(rateStore.ip, ip, RATE_LIMIT_IP_MAX, RATE_LIMIT_IP_WINDOW_MS);
        const emailKey = String(email).toLowerCase();
        const emailLimited = isLimited(rateStore.email, emailKey, RATE_LIMIT_EMAIL_MAX, RATE_LIMIT_EMAIL_WINDOW_MS);
        if (ipLimited || emailLimited) {
            // Uniform response: enumeration koruması
            return res.status(200).json({ message: 'Eğer bu e‑posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });
        }

        const lowerEmail = email.toLowerCase();
        const user = await Users.findOne({ email: lowerEmail });

        // Yanıtı uniform tut (enumeration önleme)
        const uniformResponse = () => res.status(200).json({ message: 'Eğer bu e‑posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });

        if (!user) {
            return uniformResponse();
        }

        // Token üret ve hashle
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

        await Users.findByIdAndUpdate(user._id, {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt
        });

        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;
        if (process.env.NODE_ENV !== 'production') {
            console.log('Password reset link:', resetUrl);
        }

        // Templated e-posta gönder
        try {
            const logoUrl = process.env.LOGO_PUBLIC_URL || `${process.env.API_PUBLIC_URL || ''}/uploads/logoNik.png`;
            const asciiSubject = String(process.env.EMAIL_ASCII_SUBJECT || '').toLowerCase() === 'true';
            const subject = asciiSubject ? 'Sifre sifirlama talebiniz' : 'Şifre Sıfırlama Talebiniz';
            await sendTemplatedMail({
                to: user.email,
                subject,
                template: 'passwordReset',
                data: {
                    brandName: 'Nik',
                    displayName: `${(user.firstName || '') + ' ' + (user.lastName || '')}`.trim() || user.email.split('@')[0],
                    resetUrl,
                    logoUrl,
                    year: new Date().getFullYear()
                }
            });
        } catch (e) {
            // E-posta gönderilemese bile enumeration koruması için success dön
            console.warn('Şifre sıfırlama e-postası gönderilemedi:', e);
        }
        // Dev ortamında debug linki response içine koy (prod'da asla koyma)
        if (process.env.NODE_ENV !== 'production' && String(process.env.EMAIL_DEBUG_LINK || '').toLowerCase() === 'true') {
            return res.status(200).json({ message: 'Eğer bu e‑posta kayıtlıysa, sıfırlama bağlantısı gönderildi.', debugResetUrl: resetUrl });
        }
        return uniformResponse();
    } catch (error) {
        console.error('POST /users/forgot-password error:', error);
        return res.status(500).json({ message: 'İşlem sırasında bir hata oluştu.' });
    }
});

// Şifre Sıfırla — token doğrula ve şifreyi güncelle
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Geçersiz istek.' });
        }

        // Token hash'i oluştur ve kullanıcıyı hash ile bul
        const providedHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await Users.findOne({ passwordResetTokenHash: providedHash });

        if (!user || !user.passwordResetExpiresAt) {
            return res.status(400).json({ message: 'Token geçersiz veya süresi dolmuş.' });
        }

        // Süre kontrolü
        if (user.passwordResetExpiresAt.getTime() < Date.now()) {
            // Token alanlarını temizle
            await Users.findByIdAndUpdate(user._id, {
                passwordResetTokenHash: null,
                passwordResetExpiresAt: null
            });
            return res.status(400).json({ message: 'Token süresi dolmuş.' });
        }

        // Şifreyi güncelle
        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        await Users.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            tokenVersion: (user.tokenVersion || 0) + 1, // Tüm mevcut access token'ları geçersiz kıl
            // Reset token alanlarını temizle
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
            // Mevcut refresh token'ı da geçersiz kılmak isterseniz temizleyin
            refreshToken: null,
            refreshTokenExpiresAt: null
        });

        return res.status(200).json({ message: 'Şifreniz güncellendi. Lütfen yeni şifrenizle giriş yapın.' });
    } catch (error) {
        console.error('POST /users/reset-password error:', error);
        return res.status(500).json({ message: 'Şifre güncellenirken bir hata oluştu.' });
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

// ==== Preferences (In-app notifications) ====
// GET /users/preferences
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const user = await Users.findById(req.user.userId).select('preferences');
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return res.json({ message: 'Tercihler', data: user.preferences || {} });
    } catch (error) {
        console.error('GET /users/preferences error:', error);
        return res.status(500).json({ message: error.message });
    }
});

// PUT /users/preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const updates = req.body?.preferences || req.body || {};
        const user = await Users.findByIdAndUpdate(
            req.user.userId,
            { $set: Object.fromEntries(Object.entries(updates).map(([k, v]) => ([`preferences.${k}`, v]))) },
            { new: true }
        ).select('preferences');
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        return res.json({ message: 'Tercihler güncellendi', data: user.preferences || {} });
    } catch (error) {
        console.error('PUT /users/preferences error:', error);
        return res.status(500).json({ message: error.message });
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
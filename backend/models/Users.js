const mongoose = require("mongoose");


const UsersSchema = mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'coach', 'student'],
        default: 'student' 
    },
    tokenVersion: { type: Number, default: 0 },
    
    // Refresh Token için alanlar (güvenlik)
    refreshToken: { 
        type: String, 
        required: false, 
        default: null 
    },
    refreshTokenVersion: { 
        type: Number, 
        default: 0 
    },
    refreshTokenExpiresAt: { 
        type: Date, 
        required: false, 
        default: null 
    },

    // Şifre Sıfırlama (Forgot Password) alanları
    passwordResetTokenHash: {
        type: String,
        required: false,
        default: null
    },
    passwordResetExpiresAt: {
        type: Date,
        required: false,
        default: null
    },

    // E-posta doğrulama için (opsiyonel)
    emailVerificationTokenHash: {
        type: String,
        required: false,
        default: null
    },
    emailVerificationExpiresAt: {
        type: Date,
        required: false,
        default: null
    },
    
    // Temel Kişisel Bilgiler
    firstName: { 
        type: String, 
        required: false, 
        trim: true,
        maxlength: [50, 'Ad en fazla 50 karakter olabilir'] 
    },
    lastName: { 
        type: String, 
        required: false, 
        trim: true,
        maxlength: [50, 'Soyad en fazla 50 karakter olabilir'] 
    },
    phone: { 
        type: String, 
        required: false, 
        trim: true,
        match: [/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası girin']
    },
    dateOfBirth: { 
        type: Date, 
        required: false 
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: ''
    },
    
    // YKS/Eğitim Bilgileri
    currentSchool: { 
        type: String, 
        required: false, 
        trim: true,
        maxlength: [100, 'Okul adı en fazla 100 karakter olabilir']
    },
    schoolType: {
        type: String,
        enum: ['anadolu', 'fen', 'sosyal_bilimler', 'imam_hatip', 'meslek', 'other', ''],
        default: ''
    },
    grade: { 
        type: String, 
        required: false,
        enum: ['9', '10', '11', '12', 'Mezun'],
    },
    city: { 
        type: String, 
        required: false, 
        trim: true,
        maxlength: [50, 'Şehir adı en fazla 50 karakter olabilir']
    },
    
    // YKS Hedefleri
    targetYear: {
        type: Number,
        required: false,
        min: [2024, 'Hedef yıl en az 2024 olabilir'],
        max: [2030, 'Hedef yıl en fazla 2030 olabilir']
    },
    targetUniversities: [{ 
        name: { type: String, trim: true },
        department: { type: String, trim: true },
        priority: { type: Number, min: 1, max: 10 },
        image: { type: String, trim: true } // Üniversite görseli URL'i
    }],
    targetFieldType: {
        type: String,
        enum: ['sayisal', 'sozel', 'esit_agirlik', 'dil', ''],
        default: ''
    },
    
    // Profil ve Tercihler
    avatar: { 
        type: String, 
        required: false, 
        default: null 
    },
    bio: {
        type: String,
        required: false,
        trim: true,
        maxlength: [500, 'Bio en fazla 500 karakter olabilir']
    },
    
    // Uygulama Tercihleri
    preferences: {
        notifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        studyReminders: { type: Boolean, default: true },
        weeklyReports: { type: Boolean, default: true },
        // In-app bildirim gelişmiş ayarları
        quietHours: {
            start: { type: String, default: '22:00' },
            end: { type: String, default: '08:00' }
        },
        dailyReminderTime: { type: String, default: '09:00' },
        maxNotificationsPerDay: { type: Number, default: 10, min: 1, max: 100 },
        notificationThresholds: {
            morningCompletion: { type: Number, default: 25, min: 0, max: 100 },
            eveningCompletion: { type: Number, default: 75, min: 0, max: 100 }
        },
        theme: { 
            type: String, 
            enum: ['light', 'dark', 'auto'],
            default: 'dark' 
        },
        language: { 
            type: String, 
            enum: ['tr', 'en'],
            default: 'tr' 
        }
    },
    
    // Gelişmiş Dashboard Analytics İstatistikleri
    stats: {
        // Çalışma İstatistikleri
        totalStudyTime: { type: Number, default: 0 }, // dakika cinsinden
        totalStudySessions: { type: Number, default: 0 },
        averageSessionDuration: { type: Number, default: 0 }, // dakika
        averageSessionQuality: { type: Number, default: 0 }, // 1-5 arası
        totalDistractionsCount: { type: Number, default: 0 },
        averageEfficiency: { type: Number, default: 0 }, // 0-100 arası
        
        // Streak İstatistikleri
        currentStreak: { type: Number, default: 0 }, // gün
        longestStreak: { type: Number, default: 0 }, // gün
        streakType: { type: String, enum: ['Study', 'Goal', 'Login'], default: 'Study' },
        lastStudyDate: { type: Date },
        
        // Hedef İstatistikleri
        totalGoals: { type: Number, default: 0 },
        completedGoals: { type: Number, default: 0 },
        activeGoals: { type: Number, default: 0 },
        goalCompletionRate: { type: Number, default: 0 }, // 0-100 arası
        
        // Sınav İstatistikleri (gelecek için hazır)
        totalExams: { type: Number, default: 0 },
        averageExamScore: { type: Number, default: 0 },
        bestExamScore: { type: Number, default: 0 },
        totalExamTime: { type: Number, default: 0 }, // dakika
        
        // Haftalık/Aylık İstatistikler
        weeklyStudyTime: { type: Number, default: 0 }, // bu hafta
        monthlyStudyTime: { type: Number, default: 0 }, // bu ay
        weeklyGoalCompletion: { type: Number, default: 0 }, // 0-100 arası
        monthlyGoalCompletion: { type: Number, default: 0 }, // 0-100 arası
        
        // Ders Bazında İstatistikler
        subjectStats: [{
            subject: { 
                type: String,
                enum: [
                    'matematik', 'geometri', 'turkce', 'tarih', 'cografya', 
                    'felsefe', 'fizik', 'kimya', 'biyoloji',
                    'matematik_ayt', 'fizik_ayt', 'kimya_ayt', 'biyoloji_ayt',
                    'edebiyat', 'tarih_ayt', 'cografya_ayt',
                    'ingilizce', 'almanca', 'fransizca',
                    'genel_tekrar', 'deneme_sinavi'
                ]
            },
            totalTime: { type: Number, default: 0 }, // dakika
            sessionCount: { type: Number, default: 0 },
            averageQuality: { type: Number, default: 0 }, // 1-5 arası
            lastStudied: { type: Date }
        }],
        
        // Ruh Hali İstatistikleri
        moodStats: {
            mostCommonMood: { type: String, default: 'Normal' },
            moodDistribution: {
                Enerjik: { type: Number, default: 0 },
                Normal: { type: Number, default: 0 },
                Yorgun: { type: Number, default: 0 },
                Motivasyonsuz: { type: Number, default: 0 },
                Stresli: { type: Number, default: 0 },
                Mutlu: { type: Number, default: 0 }
            }
        },
        
        // Çalışma Tekniği İstatistikleri
        techniqueStats: {
            mostUsedTechnique: { type: String, default: 'Stopwatch' },
            techniqueDistribution: {
                Pomodoro: { type: Number, default: 0 },
                Stopwatch: { type: Number, default: 0 },
                Timeblock: { type: Number, default: 0 },
                Freeform: { type: Number, default: 0 }
            }
        },
        
        // Genel Aktivite
        lastActivity: { type: Date, default: Date.now },
        loginStreak: { type: Number, default: 0 },
        lastLoginDate: { type: Date }
    },
    
    // Hesap Durumu
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, required: false },
    profileCompleteness: { type: Number, default: 0 }, // yüzde olarak
    // Onboarding/Tutorial durumu
    hasSeenTutorial: { type: Boolean, default: false }
}, { timestamps: true })

// Virtual field for full name
UsersSchema.virtual('name').get(function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    } else if (this.firstName) {
        return this.firstName;
    } else if (this.lastName) {
        return this.lastName;
    } else {
        return this.email.split('@')[0]; // Email'den kullanıcı adı
    }
});

// Virtual field'ları JSON'da göster
UsersSchema.set('toJSON', { virtuals: true });
UsersSchema.set('toObject', { virtuals: true });


const Users = mongoose.model("Users", UsersSchema);
module.exports = Users;
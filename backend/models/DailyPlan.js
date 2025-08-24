const mongoose = require("mongoose");

const DailyPlanSchema = mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Users', 
        required: true 
    },
    coachId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Users',
        required: false
    },
    
    date: { 
        type: Date, 
        required: true,
        unique: false
    },
    title: { 
        type: String, 
        required: false,
        maxlength: [100, 'Plan başlığı en fazla 100 karakter olabilir'],
        trim: true,
        default: function() {
            return `Çalışma Programı - ${this.date.toLocaleDateString('tr-TR')}`;
        }
    },
    
    // Günlük ders programı
    subjects: [{
        subject: { 
            type: String, 
            required: true,
            enum: [
                // TYT Dersleri
                'matematik', 'geometri', 'turkce', 'tarih', 'cografya', 
                'felsefe', 'fizik', 'kimya', 'biyoloji',
                // AYT Dersleri  
                'matematik_ayt', 'fizik_ayt', 'kimya_ayt', 'biyoloji_ayt',
                'edebiyat', 'tarih_ayt', 'cografya_ayt',
                // YDT
                'ingilizce', 'almanca', 'fransizca',
                // Diğer
                'genel_tekrar', 'deneme_sinavi', 'diger'
            ]
        },
        targetQuestions: { 
            type: Number, 
            required: false, // Koç programlarında zorunlu değil
            min: [1, 'Hedef soru sayısı en az 1 olmalıdır'],
            max: [500, 'Hedef soru sayısı en fazla 500 olabilir']
        },
        targetTime: { 
            type: Number, // dakika cinsinden
            required: false,
            min: [5, 'Hedef süre en az 5 dakika olmalıdır'],
            max: [600, 'Hedef süre en fazla 10 saat olabilir']
        },
        topics: [{ 
            type: String,
            maxlength: [50, 'Konu adı en fazla 50 karakter olabilir'],
            trim: true
        }],
        priority: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },

        description: { 
            type: String,
            maxlength: [1000, 'Açıklama en fazla 1000 karakter olabilir'],
            trim: true
        },
        
        // Progress tracking
        completedQuestions: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        wrongAnswers: { type: Number, default: 0 },
        blankAnswers: { type: Number, default: 0 },
        studyTime: { type: Number, default: 0 }, // dakika
        
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed', 'skipped'],
            default: 'not_started'
        },
        
        // Session referansları
        sessionIds: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'StudySession' 
        }],

        // YouTube video atamaları (koç ekler, öğrenci sadece görüntüler)
        videos: [{
            videoId: { type: String, required: true },
            playlistId: { type: String },
            title: { type: String, trim: true },
            durationSeconds: { type: Number, default: 0 },
            channelTitle: { type: String, trim: true },
            position: { type: Number }, // playlist içindeki orijinal sıra
            order: { type: Number },    // koçun belirlediği çalışma sırası
            addedAt: { type: Date, default: Date.now }
        }],
        videosTotalSeconds: { type: Number, default: 0 }
    }],
    
    // Deneme sınavı planı
    mockExam: {
        isScheduled: { type: Boolean, default: false },
        examType: { 
            type: String, 
            enum: ['TYT', 'AYT', 'YDT', 'MIXED'],
            required: false
        },
        scheduledTime: { type: String }, // "09:00" formatında
        duration: { type: Number }, // dakika
        subjects: [String], // Hangi derslerden
        isCompleted: { type: Boolean, default: false },
        results: {
            totalQuestions: { type: Number, default: 0 },
            correctAnswers: { type: Number, default: 0 },
            wrongAnswers: { type: Number, default: 0 },
            blankAnswers: { type: Number, default: 0 },
            netScore: { type: Number, default: 0 },
            estimatedRanking: { type: Number },
            completionTime: { type: Number } // dakika
        }
    },
    
    // Plan durumu
    status: { 
        type: String, 
        enum: ['draft', 'active', 'completed', 'failed', 'archived'],
        default: 'draft' 
    },
    
    // İstatistikler
    stats: {
        totalTargetQuestions: { type: Number, default: 0 },
        totalCompletedQuestions: { type: Number, default: 0 },
        totalTargetTime: { type: Number, default: 0 },
        totalStudyTime: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 }, // 0-100
        averageQuality: { type: Number, default: 0 },
        netScore: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 }
    },
    
    // Motivasyon ve notlar
    motivationNote: { 
        type: String, 
        maxlength: [500, 'Motivasyon notu en fazla 500 karakter olabilir'],
        trim: true
    },
    dailyGoal: { 
        type: String, 
        maxlength: [200, 'Günlük hedef en fazla 200 karakter olabilir'],
        trim: true
    },
    

    coachApproval: { type: Boolean, default: false },
    
    // Template bilgisi
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, trim: true },
    
    // Plan kaynağı
    source: {
        type: String,
        enum: ['self', 'coach', 'template', 'ai_generated'],
        default: 'self'
    },
    
    // Öğrenci feedback'i
    studentFeedback: {
        feedbackText: {
            type: String,
            maxlength: [1000, 'Feedback en fazla 1000 karakter olabilir'],
            trim: true
        },
        motivationScore: {
            type: Number,
            min: [1, 'Motivasyon skoru en az 1 olmalıdır'],
            max: [10, 'Motivasyon skoru en fazla 10 olabilir'],
            default: 5
        },
        submittedAt: {
            type: Date
        }
    }
    
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Toplam completion rate
DailyPlanSchema.virtual('overallCompletionRate').get(function() {
    if (!this.subjects || this.subjects.length === 0) return 0;
    
    const totalSubjects = this.subjects.length;
    const completedSubjects = this.subjects.filter(s => s.status === 'completed').length;
    
    return Math.round((completedSubjects / totalSubjects) * 100);
});

// Virtual: Total net score
DailyPlanSchema.virtual('totalNetScore').get(function() {
    if (!this.subjects || this.subjects.length === 0) return 0;
    
    return this.subjects.reduce((total, subject) => {
        const net = Math.max(subject.correctAnswers - (subject.wrongAnswers / 4), 0);
        return total + net;
    }, 0);
});

// Virtual: Remaining time estimate
DailyPlanSchema.virtual('estimatedRemainingTime').get(function() {
    if (!this.subjects || this.subjects.length === 0) return 0;
    
    return this.subjects
        .filter(s => s.status !== 'completed' && s.status !== 'skipped')
        .reduce((total, subject) => {
            const remaining = Math.max((subject.targetTime || 0) - subject.studyTime, 0);
            return total + remaining;
        }, 0);
});

// Index'ler
DailyPlanSchema.index({ userId: 1, date: -1 });
DailyPlanSchema.index({ userId: 1, status: 1 });
DailyPlanSchema.index({ date: -1, status: 1 });
DailyPlanSchema.index({ coachId: 1, date: -1 });

// Compound index for unique user-date combination
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

// Static methods
DailyPlanSchema.statics.findByUserAndDate = function(userId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.findOne({
        userId: userId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });
};

DailyPlanSchema.statics.getActiveByUser = function(userId) {
    return this.find({
        userId: userId,
        status: { $in: ['active', 'draft'] },
        date: { 
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
    }).sort({ date: -1 });
};

// Pre-save middleware: İstatistikleri güncelle
DailyPlanSchema.pre('save', function(next) {
    if (this.subjects && this.subjects.length > 0) {
        // Toplam hedefleri hesapla
        this.stats.totalTargetQuestions = this.subjects.reduce((sum, s) => sum + (s.targetQuestions || 0), 0);
        this.stats.totalTargetTime = this.subjects.reduce((sum, s) => sum + (s.targetTime || 0), 0);

        // Video toplam süreleri güncelle (her subject için)
        this.subjects.forEach(s => {
            if (Array.isArray(s.videos) && s.videos.length) {
                s.videosTotalSeconds = s.videos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
                // targetTime belirtilmemişse videoların toplamına göre dakikaya yuvarla (override yoksa)
                if (!s.targetTime) {
                    s.targetTime = Math.ceil(s.videosTotalSeconds / 60); // yukarı yuvarla
                }
            } else {
                s.videosTotalSeconds = s.videosTotalSeconds || 0;
            }
        });

        // Toplam tamamlananları hesapla
        this.stats.totalCompletedQuestions = this.subjects.reduce((sum, s) => sum + (s.completedQuestions || 0), 0);
        this.stats.totalStudyTime = this.subjects.reduce((sum, s) => sum + (s.studyTime || 0), 0);

        // Completion rate hesapla (öncelik: soru hedefi bazlı; yoksa subject tamamlama bazlı)
        const totalTargetQ = this.stats.totalTargetQuestions || 0;
        if (totalTargetQ > 0) {
            const ratio = this.stats.totalCompletedQuestions / totalTargetQ;
            this.stats.completionRate = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        } else {
            this.stats.completionRate = this.overallCompletionRate;
        }

        // Net score hesapla
        this.stats.netScore = this.totalNetScore;

        // Success rate (doğru cevap oranı)
        const totals = this.subjects.reduce((acc, s) => {
            const correct = s.correctAnswers || 0;
            const wrong = s.wrongAnswers || 0;
            const blank = s.blankAnswers || 0;
            acc.correct += correct;
            acc.attempted += correct + wrong + blank;
            return acc;
        }, { correct: 0, attempted: 0 });
        this.stats.successRate = totals.attempted > 0
            ? Math.max(0, Math.min(100, Math.round((totals.correct / totals.attempted) * 100)))
            : 0;

        // Average quality hesapla (session'lardan alınacak)
        const completedSubjects = this.subjects.filter(s => s.status === 'completed');
        if (completedSubjects.length > 0) {
            // Bu hesaplama session verilerinden yapılacak - şimdilik placeholder
            this.stats.averageQuality = 0;
        }
    }

    next();
});

const DailyPlan = mongoose.model("DailyPlan", DailyPlanSchema);
module.exports = DailyPlan;
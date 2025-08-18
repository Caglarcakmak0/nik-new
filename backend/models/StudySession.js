const mongoose = require("mongoose");

const StudySessionSchema = mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Users', 
        required: true 
    },
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
    duration: { 
        type: Number, 
        required: true,
        min: [1, 'Çalışma süresi en az 1 dakika olmalıdır'],
        max: [600, 'Çalışma süresi en fazla 10 saat (600 dakika) olabilir']
    },
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    notes: { 
        type: String,
        maxlength: [500, 'Not en fazla 500 karakter olabilir'],
        trim: true
    },
    quality: { 
        type: Number,
        required: true,
        min: [1, 'Kalite puanı en az 1 olmalıdır'],
        max: [5, 'Kalite puanı en fazla 5 olabilir'],
        validate: {
            validator: Number.isInteger,
            message: 'Kalite puanı tam sayı olmalıdır'
        }
    },
    technique: { 
        type: String,
        required: true,
        enum: {
            values: ['Pomodoro', 'Stopwatch', 'Timeblock', 'Freeform'],
            message: 'Geçersiz çalışma tekniği'
        }
    },
    tags: [{ 
        type: String,
        maxlength: [30, 'Tag en fazla 30 karakter olabilir'],
        trim: true
    }],
    distractions: { 
        type: Number,
        default: 0,
        min: [0, 'Dikkat dağınıklığı sayısı negatif olamaz'],
        max: [50, 'Dikkat dağınıklığı sayısı çok yüksek']
    },
    mood: { 
        type: String,
        required: true,
        enum: {
            values: ['Enerjik', 'Normal', 'Yorgun', 'Motivasyonsuz', 'Stresli', 'Mutlu'],
            message: 'Geçersiz ruh hali'
        }
    },
    
    // Pomodoro özel alanları
    pomodoroCount: { 
        type: Number,
        default: 0,
        min: 0 
    },
    breakDuration: { 
        type: Number,
        default: 0,
        min: 0 
    },
    
    // Performans metrikleri
    efficiency: { 
        type: Number, // 0-100 arası, kalite ve dikkat dağınıklığına göre hesaplanır
        min: 0,
        max: 100
    },
    
    // Lokasyon bilgisi (opsiyonel)
    location: {
        type: String,
        enum: ['Ev', 'Okul', 'Kütüphane', 'Kafe', 'Diger', ''],
        default: ''
    },
    
    // QUESTION TRACKING - E-tablo entegrasyonu
    questionStats: {
        targetQuestions: { 
            type: Number, 
            min: 0,
            max: 1000,
            default: 0
        },
        correctAnswers: { 
            type: Number, 
            default: 0,
            min: 0 
        },
        wrongAnswers: { 
            type: Number, 
            default: 0,
            min: 0 
        },
        blankAnswers: { 
            type: Number, 
            default: 0,
            min: 0 
        },
        netScore: { 
            type: Number, 
            default: 0,
            min: 0
        },
        topics: [{ 
            type: String,
            maxlength: [50, 'Konu adı en fazla 50 karakter olabilir'],
            trim: true
        }],
        completionRate: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    
    // SESSION INTERVALS - Pomodoro/Break tracking
    intervals: [{
        type: { 
            type: String,
            enum: ['study', 'break'],
            required: true
        },
        duration: { 
            type: Number, 
            required: true,
            min: 1
        },
        startTime: { 
            type: Date, 
            required: true 
        },
        endTime: { 
            type: Date, 
            required: true 
        }
    }],
    
    // DAILY PLAN REFERENCE
    dailyPlanId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'DailyPlan',
        required: false 
    },
    planProgress: { 
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    
    // REAL-TIME TRACKING
    liveTracking: {
        isActive: { 
            type: Boolean, 
            default: false 
        },
        currentInterval: { 
            type: String,
            enum: ['study', 'break', 'paused', ''],
            default: ''
        },
        lastUpdate: { 
            type: Date, 
            default: Date.now 
        }
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Efficiency hesaplama (güncellenmiş)
StudySessionSchema.virtual('calculatedEfficiency').get(function() {
    if (!this.quality || !this.duration) return 0;
    
    // Base efficiency = quality * 20 (5 puan -> 100%)
    let efficiency = this.quality * 20;
    
    // Dikkat dağınıklığı cezası
    const distractionPenalty = Math.min(this.distractions * 5, 30); // Max %30 ceza
    efficiency = Math.max(efficiency - distractionPenalty, 0);
    
    return Math.round(efficiency);
});

// Virtual: Net Score hesaplama
StudySessionSchema.virtual('calculatedNetScore').get(function() {
    if (!this.questionStats) return 0;
    
    const { correctAnswers = 0, wrongAnswers = 0 } = this.questionStats;
    return Math.max(correctAnswers - (wrongAnswers / 4), 0);
});

// Virtual: Question completion rate
StudySessionSchema.virtual('calculatedCompletionRate').get(function() {
    if (!this.questionStats || !this.questionStats.targetQuestions) return 0;
    
    const { targetQuestions, correctAnswers = 0, wrongAnswers = 0, blankAnswers = 0 } = this.questionStats;
    const totalAttempted = correctAnswers + wrongAnswers + blankAnswers;
    
    return Math.round((totalAttempted / targetQuestions) * 100);
});

// Virtual: Success rate (doğru cevap oranı)
StudySessionSchema.virtual('successRate').get(function() {
    if (!this.questionStats) return 0;
    
    const { correctAnswers = 0, wrongAnswers = 0, blankAnswers = 0 } = this.questionStats;
    const totalAttempted = correctAnswers + wrongAnswers + blankAnswers;
    
    if (totalAttempted === 0) return 0;
    return Math.round((correctAnswers / totalAttempted) * 100);
});

// Index'ler - Performans için
StudySessionSchema.index({ userId: 1, date: -1 });
StudySessionSchema.index({ userId: 1, subject: 1, date: -1 });
StudySessionSchema.index({ date: -1 });

// Pre-save middleware: Otomatik hesaplamalar
StudySessionSchema.pre('save', function(next) {
    // Efficiency hesapla
    this.efficiency = this.calculatedEfficiency;
    
    // Question stats varsa net score ve completion rate hesapla
    if (this.questionStats) {
        this.questionStats.netScore = this.calculatedNetScore;
        this.questionStats.completionRate = this.calculatedCompletionRate;
    }
    
    // Live tracking güncelle
    if (this.liveTracking) {
        this.liveTracking.lastUpdate = new Date();
    }
    
    next();
});

const StudySession = mongoose.model("StudySession", StudySessionSchema);
module.exports = StudySession;
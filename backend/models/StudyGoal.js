const mongoose = require("mongoose");

const StudyGoalSchema = mongoose.Schema({
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
            // Genel
            'genel_tekrar', 'deneme_sinavi', 'tum_dersler'
        ]
    },
    title: {
        type: String,
        required: true,
        maxlength: [100, 'Hedef başlığı en fazla 100 karakter olabilir'],
        trim: true
    },
    description: {
        type: String,
        maxlength: [500, 'Hedef açıklaması en fazla 500 karakter olabilir'],
        trim: true
    },
    dailyTarget: { 
        type: Number,
        required: true,
        min: [5, 'Günlük hedef en az 5 dakika olmalıdır'],
        max: [720, 'Günlük hedef en fazla 12 saat (720 dakika) olabilir']
    },
    weeklyTarget: { 
        type: Number,
        required: true,
        min: [30, 'Haftalık hedef en az 30 dakika olmalıdır'],
        max: [5040, 'Haftalık hedef en fazla 84 saat (5040 dakika) olabilir']
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    startDate: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    endDate: { 
        type: Date,
        required: true,
        validate: {
            validator: function(endDate) {
                return endDate > this.startDate;
            },
            message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır'
        }
    },
    streak: { 
        type: Number,
        default: 0,
        min: [0, 'Streak negatif olamaz']
    },
    longestStreak: {
        type: Number,
        default: 0,
        min: [0, 'En uzun streak negatif olamaz']
    },
    
    // İlerleme takibi
    totalCompleted: {
        type: Number,
        default: 0,
        min: 0
    },
    lastCompletedDate: {
        type: Date
    },
    completionRate: {
        type: Number, // 0-100 arası yüzde
        default: 0,
        min: 0,
        max: 100
    },
    
    // Hedef türü ve özellikleri
    goalType: {
        type: String,
        enum: ['Daily', 'Weekly', 'Custom'],
        required: true,
        default: 'Daily'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    
    // Hatırlatma ayarları
    reminderEnabled: {
        type: Boolean,
        default: true
    },
    reminderTime: {
        type: String, // "09:00" formatında
        default: "09:00"
    },
    reminderDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    
    // Ödül sistemi
    rewardPoints: {
        type: Number,
        default: 0,
        min: 0
    },
    milestones: [{
        target: { type: Number, required: true },
        achieved: { type: Boolean, default: false },
        achievedDate: { type: Date },
        reward: { type: String }
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Kalan gün sayısı
StudyGoalSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    const diffTime = this.endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
});

// Virtual: Hedef ilerleme yüzdesi
StudyGoalSchema.virtual('progressPercentage').get(function() {
    const totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((Date.now() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
});

// Virtual: Başarı durumu
StudyGoalSchema.virtual('status').get(function() {
    const now = new Date();
    if (now > this.endDate) {
        return this.completionRate >= 80 ? 'Completed' : 'Failed';
    }
    if (!this.isActive) return 'Paused';
    if (this.completionRate >= 100) return 'Achieved';
    return 'Active';
});

// Index'ler
StudyGoalSchema.index({ userId: 1, isActive: 1 });
StudyGoalSchema.index({ userId: 1, subject: 1 });
StudyGoalSchema.index({ endDate: 1, isActive: 1 });

// Static method: Aktif hedefleri getir
StudyGoalSchema.statics.getActiveGoalsByUser = function(userId) {
    return this.find({ 
        userId: userId, 
        isActive: true,
        endDate: { $gte: new Date() }
    }).sort({ priority: -1, createdAt: -1 });
};

// Static method: Streak güncelle
StudyGoalSchema.statics.updateStreak = async function(userId, subject, studyDate) {
    const goal = await this.findOne({ userId, subject, isActive: true });
    if (!goal) return;
    
    const yesterday = new Date(studyDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (goal.lastCompletedDate) {
        const lastDate = new Date(goal.lastCompletedDate);
        const diffDays = Math.floor((studyDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            // Ardışık gün
            goal.streak += 1;
        } else if (diffDays > 1) {
            // Streak bozuldu
            goal.streak = 1;
        }
        // diffDays === 0 ise aynı gün, streak değişmez
    } else {
        // İlk çalışma
        goal.streak = 1;
    }
    
    // En uzun streak'i güncelle
    if (goal.streak > goal.longestStreak) {
        goal.longestStreak = goal.streak;
    }
    
    goal.lastCompletedDate = studyDate;
    await goal.save();
};

const StudyGoal = mongoose.model("StudyGoal", StudyGoalSchema);
module.exports = StudyGoal;
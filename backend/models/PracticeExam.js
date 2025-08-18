const mongoose = require("mongoose");

// Öğrencilerin deneme sınav kayıtları
// Net hesaplaması: net = doğru - (yanlış / 4)
const PracticeExamSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    // Genel tür: TYT genel, AYT genel veya Branş
    category: {
        type: String,
        enum: ['TYT_GENEL', 'AYT_GENEL', 'BRANS'],
        required: true
    },
    // Branş denemeleri için ders adı (opsiyonel)
    branchSubject: {
        type: String,
        enum: [
            // TYT Dersleri
            'turkce', 'tarih', 'cografya', 'felsefe', 'din_kultur',
            'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji',
            // AYT Dersleri
            'edebiyat', 'tarih_ayt', 'cografya_ayt', 'felsefe_ayt', 'din_kultur_ayt',
            'matematik_ayt', 'fizik_ayt', 'kimya_ayt', 'biyoloji_ayt',
            // YDT
            'ingilizce', 'almanca', 'fransizca',
            // Diğer
            'diger', ''
        ],
        required: false,
        default: ''
    },
    // Yayın adı vb.
    title: { type: String, trim: true, maxlength: 120 },
    examDuration: { type: Number, min: 0, max: 600 }, // dakika
    notes: { type: String, trim: true, maxlength: 1000 },

    // Bölümler: Genel denemelerde alt testler, branşta tek bölüm olabilir
    sections: [{
        name: { type: String, trim: true, maxlength: 60, required: true },
        totalQuestions: { type: Number, min: 0, default: 0 },
        correctAnswers: { type: Number, min: 0, default: 0 },
        wrongAnswers: { type: Number, min: 0, default: 0 },
        blankAnswers: { type: Number, min: 0, default: 0 },
        // Öğrencinin yanlışlarını konu bazında işaretlemesi için liste
        wrongTopics: { type: [String], default: [] },
        net: { type: Number, min: 0, default: 0 }
    }],

    // Toplamlar (otomatik)
    totals: {
        totalQuestions: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        wrongAnswers: { type: Number, default: 0 },
        blankAnswers: { type: Number, default: 0 },
        net: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexler: sık sorgular
PracticeExamSchema.index({ userId: 1, date: -1 });
PracticeExamSchema.index({ userId: 1, category: 1, date: -1 });

// Yardımcı: güvenli net hesaplama
function calcNet(correct, wrong) {
    const c = Number(correct) || 0;
    const w = Number(wrong) || 0;
    const net = c - (w / 4);
    return Math.max(Math.round(net * 100) / 100, 0);
}

// Pre-save: bölüm netleri ve toplamlar
PracticeExamSchema.pre('save', function(next) {
    if (Array.isArray(this.sections)) {
        this.sections = this.sections.map((s) => {
            const totalQuestions = (Number(s.totalQuestions) || 0);
            const correct = (Number(s.correctAnswers) || 0);
            const wrong = (Number(s.wrongAnswers) || 0);
            const blank = (Number(s.blankAnswers) || 0);
            // wrongTopics uzunluğu yanlış sayısından fazla olmasın (fazlaysa kırp)
            const wrongTopics = Array.isArray(s.wrongTopics) ? s.wrongTopics.filter(t => typeof t === 'string').slice(0, wrong) : [];
            const computedTotal = correct + wrong + blank;
            return {
                name: s.name,
                totalQuestions: totalQuestions > 0 ? totalQuestions : computedTotal,
                correctAnswers: correct,
                wrongAnswers: wrong,
                blankAnswers: blank,
                wrongTopics,
                net: calcNet(correct, wrong)
            };
        });
    }

    // Toplamları hesapla
    const totals = (this.sections || []).reduce((acc, s) => {
        acc.totalQuestions += Number(s.totalQuestions) || 0;
        acc.correctAnswers += Number(s.correctAnswers) || 0;
        acc.wrongAnswers += Number(s.wrongAnswers) || 0;
        acc.blankAnswers += Number(s.blankAnswers) || 0;
        acc.net += Number(s.net) || 0;
        return acc;
    }, { totalQuestions: 0, correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, net: 0 });

    // net'i 2 ondalıkla sınırla
    totals.net = Math.round((totals.net + Number.EPSILON) * 100) / 100;
    this.totals = totals;

    // Eğer wrongTopics sayıları yanlış sayısını aşıyorsa buda
    this.sections = (this.sections || []).map((s) => {
        const wrong = Number(s.wrongAnswers) || 0;
        const wrongTopics = Array.isArray(s.wrongTopics) ? s.wrongTopics.slice(0, wrong) : [];
        return { ...s, wrongTopics };
    });

    next();
});

const PracticeExam = mongoose.model("PracticeExam", PracticeExamSchema);
module.exports = PracticeExam;



/*
 Seed Study Data Script
 - Belirtilen e-posta adresine sahip kullanıcının hesabına test amaçlı
   StudySession ve DailyPlan kayıtları ekler.

 Kullanım:
   node backend/scripts/seedStudyData.js --email cglr@example.com --days 10

 Notlar:
 - MONGO_URL .env içinde tanımlı olmalıdır
 - Kullanıcı yoksa script hata verir (test güvenliği için)
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// .env yolunu script konumuna göre (backend/.env) sabitle
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Users = require('../models/Users');
const StudySession = require('../models/StudySession');
const DailyPlan = require('../models/DailyPlan');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = { email: null, days: 7 };
    for (const a of args) {
        if (a.startsWith('--email=')) out.email = a.split('=')[1];
        else if (a.startsWith('--days=')) out.days = parseInt(a.split('=')[1], 10) || 7;
        else if (a === '--help' || a === '-h') {
            console.log('Usage: node backend/scripts/seedStudyData.js --email user@example.com [--days 7]');
            process.exit(0);
        }
    }
    if (!out.email) {
        console.error('Hata: --email parametresi zorunludur');
        process.exit(1);
    }
    return out;
}

function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function addDays(date, delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
}

function setTime(date, hours, minutes = 0) {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

async function main() {
    const { email, days } = parseArgs();
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.error('Hata: MONGO_URL .env içinde tanımlı değil');
        process.exit(1);
    }

    await mongoose.connect(mongoUrl);
    console.log('MongoDB bağlantısı başarılı');

    try {
        const user = await Users.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new Error(`Kullanıcı bulunamadı: ${email}`);
        }
        console.log('Kullanıcı bulundu:', user._id.toString(), user.email);

        // Seed Study Sessions (son N gün)
        const subjects = ['matematik', 'fizik', 'kimya', 'turkce', 'biyoloji'];
        const techniques = ['Pomodoro', 'Stopwatch', 'Timeblock', 'Freeform'];
        const moods = ['Enerjik', 'Normal', 'Yorgun', 'Motivasyonsuz', 'Stresli', 'Mutlu'];

        const today = new Date();
        const startDate = addDays(today, -(days - 1));

        const sessionsToInsert = [];
        for (let i = 0; i < days; i++) {
            const dayDate = addDays(startDate, i);

            // O gün için 1-3 arası oturum üret
            const sessionCount = 1 + Math.floor(Math.random() * 3);
            for (let s = 0; s < sessionCount; s++) {
                const subject = randomChoice(subjects);
                const duration = 30 + Math.floor(Math.random() * 91); // 30-120 dk
                const quality = 2 + Math.floor(Math.random() * 4); // 2-5
                const distractions = Math.floor(Math.random() * 4); // 0-3
                const technique = randomChoice(techniques);
                const mood = randomChoice(moods);

                const base = setTime(dayDate, 10 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));

                // Question stats
                const targetQuestions = 20 + Math.floor(Math.random() * 41); // 20-60
                const attempted = Math.min(targetQuestions, Math.floor(duration / 2) + Math.floor(Math.random() * 10));
                const correct = Math.floor(attempted * (0.5 + Math.random() * 0.4));
                const wrong = Math.floor((attempted - correct) * (0.6));
                const blank = Math.max(attempted - correct - wrong, 0);

                sessionsToInsert.push({
                    userId: user._id,
                    subject,
                    duration,
                    date: base,
                    notes: '',
                    quality,
                    technique,
                    mood,
                    distractions,
                    questionStats: {
                        targetQuestions,
                        correctAnswers: correct,
                        wrongAnswers: wrong,
                        blankAnswers: blank,
                        topics: []
                    },
                    intervals: [{
                        type: 'study',
                        duration: Math.max(duration - 5, 1),
                        startTime: base,
                        endTime: new Date(base.getTime() + Math.max(duration - 5, 1) * 60000)
                    }],
                    liveTracking: { isActive: false },
                    tags: []
                });
            }
        }

        const insertedSessions = await StudySession.insertMany(sessionsToInsert);
        console.log(`Eklendi: ${insertedSessions.length} StudySession`);

        // Bugüne DailyPlan (varsa güncelle)
        const planDate = new Date();
        planDate.setHours(0, 0, 0, 0);

        let plan = await DailyPlan.findOne({ userId: user._id, date: { $gte: planDate, $lte: new Date(planDate.getTime() + 24*60*60*1000 - 1) } });

        // Gün için oturumları grupla
        const todaySessions = insertedSessions.filter(s => {
            const d = new Date(s.date);
            return d >= planDate && d < new Date(planDate.getTime() + 24*60*60*1000);
        });

        // En çok görülen 2 dersi seç
        const countBySubject = todaySessions.reduce((acc, s) => {
            acc[s.subject] = (acc[s.subject] || 0) + 1;
            return acc;
        }, {});
        const topSubjects = Object.keys(countBySubject)
            .sort((a, b) => countBySubject[b] - countBySubject[a])
            .slice(0, 2);
        const planSubjectsBase = (topSubjects.length > 0 ? topSubjects : ['matematik', 'fizik']).map(sub => ({
            subject: sub,
            targetQuestions: 40,
            targetTime: 90,
            topics: [],
            priority: 5,
            description: '',
            completedQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            blankAnswers: 0,
            studyTime: 0,
            status: 'not_started',
            sessionIds: []
        }));

        if (!plan) {
            plan = new DailyPlan({
                userId: user._id,
                date: planDate,
                title: `Çalışma Programı - ${new Date().toLocaleDateString('tr-TR')}`,
                subjects: planSubjectsBase,
                status: 'active',
                source: 'self'
            });
        } else {
            plan.subjects = planSubjectsBase;
        }

        // Plan konularını bugünkü oturumlarla eşleştir ve istatistikleri doldur
        for (let i = 0; i < plan.subjects.length; i++) {
            const subj = plan.subjects[i];
            const subjSessions = todaySessions.filter(s => s.subject === subj.subject);
            subj.studyTime = subjSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            subj.correctAnswers = subjSessions.reduce((sum, s) => sum + (s.questionStats?.correctAnswers || 0), 0);
            subj.wrongAnswers = subjSessions.reduce((sum, s) => sum + (s.questionStats?.wrongAnswers || 0), 0);
            subj.blankAnswers = subjSessions.reduce((sum, s) => sum + (s.questionStats?.blankAnswers || 0), 0);
            subj.completedQuestions = subj.correctAnswers + subj.wrongAnswers + subj.blankAnswers;
            subj.status = subj.completedQuestions > 0 || subj.studyTime > 0 ? (subj.completedQuestions >= (subj.targetQuestions || 0) ? 'completed' : 'in_progress') : 'not_started';
            subj.sessionIds = subjSessions.map(s => s._id);
        }

        await plan.save();
        console.log('DailyPlan hazırlandı:', plan._id.toString());

        // Session'lara plan referansı ekle (sadece bugünküler)
        await StudySession.updateMany(
            { _id: { $in: todaySessions.map(s => s._id) } },
            { $set: { dailyPlanId: plan._id } }
        );

        console.log('Tamamlandı. Özet:');
        console.log(`- Kullanıcı: ${email} (${user._id.toString()})`);
        console.log(`- Eklenen oturum: ${insertedSessions.length}`);
        console.log(`- Bugünkü plan: ${plan._id.toString()}`);
    } catch (err) {
        console.error('Seed işlemi başarısız:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();



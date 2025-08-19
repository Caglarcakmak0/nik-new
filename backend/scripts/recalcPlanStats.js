/*
 Recalculate DailyPlan Stats Script
 - Belirli bir plan veya kullanıcı için (bugünkü) planların stats alanlarını yeniden hesaplar.

 Kullanım:
   node backend/scripts/recalcPlanStats.js --plan=PLAN_ID
   node backend/scripts/recalcPlanStats.js --user=USER_ID
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DailyPlan = require('../models/DailyPlan');

function parseArgs() {
    const out = { planId: null, userId: null };
    for (const a of process.argv.slice(2)) {
        if (a.startsWith('--plan=')) out.planId = a.split('=')[1];
        if (a.startsWith('--user=')) out.userId = a.split('=')[1];
    }
    if (!out.planId && !out.userId) {
        console.log('Usage: node backend/scripts/recalcPlanStats.js --plan=PLAN_ID | --user=USER_ID');
        process.exit(1);
    }
    return out;
}

async function main() {
    const { planId, userId } = parseArgs();
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.error('Hata: MONGO_URL .env içinde tanımlı değil');
        process.exit(1);
    }
    await mongoose.connect(mongoUrl);

    try {
        let plans = [];
        if (planId) {
            const p = await DailyPlan.findById(planId);
            if (p) plans = [p];
        } else if (userId) {
            const start = new Date(); start.setHours(0,0,0,0);
            const end = new Date(); end.setHours(23,59,59,999);
            plans = await DailyPlan.find({ userId, date: { $gte: start, $lte: end } });
        }

        if (plans.length === 0) {
            console.log('Plan bulunamadı.');
            return;
        }

        for (const plan of plans) {
            // touched to trigger pre-save calculations
            plan.markModified('subjects');
            await plan.save();
            console.log(`Güncellendi: ${plan._id} completionRate=${plan.stats.completionRate} successRate=${plan.stats.successRate} totalStudyTime=${plan.stats.totalStudyTime}`);
        }
    } catch (e) {
        console.error('Hata:', e.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();



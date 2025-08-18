const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");
const Competition = require("../models/Competition.js");

// GET /competitions - Tüm yarışmalar
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const competitions = await Competition.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        
        const formattedCompetitions = competitions.map(comp => ({
            id: comp._id.toString(),
            title: comp.title,
            description: comp.description,
            type: comp.type,
            category: comp.category,
            startDate: comp.startDate,
            endDate: comp.endDate,
            participants: comp.participants || [],
            maxParticipants: comp.maxParticipants,
            prizes: comp.prizes.map(prize => ({
                position: 1,
                title: prize.name,
                description: prize.description,
                points: parseInt(prize.value) || 100
            })),
            rules: comp.rules,
            isActive: comp.status === 'active',
            isJoined: comp.participants ? comp.participants.includes(userId) : false,
            status: comp.status,
            createdBy: comp.createdBy,
            createdAt: comp.createdAt,
            leaderboard: comp.leaderboard || []
        }));
        
        res.status(200).json({
            message: "Yarışmalar başarıyla getirildi",
            data: formattedCompetitions
        });
        
    } catch (error) {
        console.error('GET /competitions error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /competitions/active - Sadece aktif yarışmalar
router.get("/active", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const competitions = await Competition.find({ 
            status: 'active',
            endDate: { $gt: new Date() }
        }).populate('createdBy', 'name');
        
        const formattedCompetitions = competitions.map(comp => ({
            id: comp._id.toString(),
            title: comp.title,
            description: comp.description,
            type: comp.type,
            startDate: comp.startDate,
            endDate: comp.endDate,
            participants: comp.participants ? comp.participants.length : 0,
            prize: comp.prizes[0]?.name || 'Özel Rozet',
            isActive: comp.status === 'active',
            isJoined: comp.participants ? comp.participants.includes(userId) : false
        }));
        
        res.status(200).json({
            message: "Aktif yarışmalar başarıyla getirildi",
            data: formattedCompetitions
        });
        
    } catch (error) {
        console.error('GET /competitions/active error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /competitions/:id/join - Yarışmaya katıl
router.post("/:id/join", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const competition = await Competition.findById(id);
        if (!competition) {
            return res.status(404).json({ message: 'Yarışma bulunamadı' });
        }
        
        // Zaten katılmış mı?
        if (competition.participants && competition.participants.includes(userId)) {
            return res.status(400).json({ message: 'Zaten bu yarışmaya katıldınız' });
        }
        
        // Maksimum katılımcı kontrolü
        if (competition.maxParticipants && 
            competition.participants && 
            competition.participants.length >= competition.maxParticipants) {
            return res.status(400).json({ message: 'Yarışma kapasitesi dolu' });
        }
        
        // Yarışmaya katıl
        if (!competition.participants) {
            competition.participants = [];
        }
        competition.participants.push(userId);
        await competition.save();
        
        res.status(200).json({
            message: "Yarışmaya başarıyla katıldınız!",
            data: {
                competitionId: id,
                participantCount: competition.participants.length
            }
        });
        
    } catch (error) {
        console.error('POST /competitions/:id/join error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");
const Backup = require("../models/Backup.js");

// GET /backup/list - Kullanıcının backup'larını listele
router.get("/list", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Mock backup data - gerçek implementasyonda database'den gelecek
        const mockBackups = [
            {
                id: 'backup_1',
                type: 'manual',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                size: 1024 * 1024 * 2.5, // 2.5MB
                dataTypes: ['study-sessions', 'daily-plans', 'achievements'],
                status: 'completed',
                downloadUrl: '/api/backup/download/backup_1',
                expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'backup_2',
                type: 'auto',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                size: 1024 * 1024 * 1.8, // 1.8MB
                dataTypes: ['study-sessions', 'daily-plans'],
                status: 'completed',
                downloadUrl: '/api/backup/download/backup_2',
                expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        res.status(200).json({
            message: "Backup listesi başarıyla getirildi",
            data: mockBackups
        });
        
    } catch (error) {
        console.error('GET /backup/list error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /backup/create - Yeni backup oluştur
router.post("/create", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { type, dataTypes } = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Backup oluşturma simülasyonu
        const newBackup = {
            id: `backup_${Date.now()}`,
            type: type || 'manual',
            createdAt: new Date().toISOString(),
            size: Math.floor(Math.random() * 3000000) + 1000000, // 1-4MB random
            dataTypes: dataTypes || ['study-sessions', 'daily-plans', 'achievements', 'settings'],
            status: 'processing',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        // Processing'den completed'a geçiş simülasyonu
        setTimeout(() => {
            newBackup.status = 'completed';
            newBackup.downloadUrl = `/api/backup/download/${newBackup.id}`;
        }, 2000);
        
        res.status(201).json({
            message: "Backup oluşturma işlemi başlatıldı",
            data: newBackup
        });
        
    } catch (error) {
        console.error('POST /backup/create error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /backup/auto-status - Otomatik backup durumu
router.get("/auto-status", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Mock auto backup status
        const autoBackupStatus = {
            enabled: true,
            frequency: 'daily',
            lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            nextBackup: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            retentionDays: 30
        };
        
        res.status(200).json({
            message: "Otomatik backup durumu getirildi",
            data: autoBackupStatus
        });
        
    } catch (error) {
        console.error('GET /backup/auto-status error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /backup/auto-toggle - Otomatik backup aç/kapat
router.post("/auto-toggle", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { enabled } = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        res.status(200).json({
            message: `Otomatik backup ${enabled ? 'açıldı' : 'kapatıldı'}`,
            data: {
                enabled,
                updatedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('POST /backup/auto-toggle error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
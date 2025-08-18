/**
 * UPLOAD ROUTES - 📤 Özel Dosya Yükleme API
 * 
 * Amaç: Üniversite fotoğrafları için özelleştirilmiş upload sistemi
 * 
 * Endpoints:
 * - POST /upload/university-image - Üniversite fotoğrafı yükle (Goals sayfası için)
 * - DELETE /upload/university-image - Eski üniversite fotoğrafını sil
 * 
 * Features:
 * - 5MB dosya boyutu limiti
 * - Sadece image/* mime type kabul
 * - Unique filename generation
 * - Automatic directory creation
 * 
 * Storage: /backend/uploads/universities/
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../auth.js');
const User = require('../models/Users');

const router = express.Router();

// Upload klasörünü oluştur
const uploadDir = path.join(__dirname, '../uploads/universities');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Dosya adını unique yap
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Sadece resim dosyalarına izin ver
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Üniversite fotoğrafı yükleme
router.post('/university-image', authenticateToken, upload.single('universityImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Dosya yüklenmedi' });
        }

        // Dosya URL'i oluştur
        const imageUrl = `/uploads/universities/${req.file.filename}`;

        res.status(200).json({
            message: 'Fotoğraf başarıyla yüklendi',
            data: {
                imageUrl: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Fotoğraf yüklenirken hata oluştu: ' + error.message });
    }
});

// Eski fotoğrafı silme
router.delete('/university-image', authenticateToken, async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ message: 'Image URL gereklidir' });
        }

        // Dosya yolunu oluştur
        const filename = path.basename(imageUrl);
        const filePath = path.join(uploadDir, filename);

        // Dosya varsa sil
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(200).json({ message: 'Fotoğraf başarıyla silindi' });

    } catch (error) {
        console.error('Image delete error:', error);
        res.status(500).json({ message: 'Fotoğraf silinirken hata oluştu: ' + error.message });
    }
});

module.exports = router;
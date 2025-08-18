/**
 * IMAGE ROUTES - 🖼️ Genel Görsel Yönetimi API
 * 
 * Amaç: Kullanıcı avatar'ları ve genel resim dosyalarının upload/yönetimi
 * 
 * Endpoints:
 * - POST /image/upload - Genel resim yükleme (avatar, profil fotoğrafları)
 * - GET /image/:id - Belirli resmi getir
 * - DELETE /image/:id - Resim silme
 * 
 * Tech: Multer ile file handling, Image model ile metadata saklama
 * Storage: /backend/uploads/ klasörü
 */

const express = require("express");
const router = express.Router();
const Image = require("../models/Image.js")
const cors = require('cors');
const bodyParser = require('body-parser');
const authenticateToken = require('../auth.js');

const multer = require('multer');
const path = require("path");
const fs = require('fs');

router.use(cors())
router.use(bodyParser.json({ charset: 'utf-8', limit: '2000kb' }));
router.use(express.static('public'));

const imagePath = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        res.json(req.file);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error." });
    }
});

router.post("/save", authenticateToken, async (req, res) => {
    try {
        const data = req.body;

        const newInsert = new Image(data);
        await newInsert.save();

        res.status(201).json({ ...newInsert, id: newInsert._id });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server Error." });
    }
})

router.get('/allImages', authenticateToken, async (req, res) => {
    try {
        const images = await Image.find().sort({ _id: -1 });
        res.status(200).json(images);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server Error." });
    }
});

// University image upload - özelleştirilmiş endpoint
const universityStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const universityPath = path.join(__dirname, '..', 'uploads', 'universities');
        if (!fs.existsSync(universityPath)) {
            fs.mkdirSync(universityPath, { recursive: true });
        }
        cb(null, universityPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `uni_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const universityUpload = multer({ 
    storage: universityStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları kabul edilir!'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/university-upload', authenticateToken, universityUpload.single('universityImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Dosya yüklenmedi' });
        }

        const imageUrl = `/uploads/universities/${req.file.filename}`;

        res.status(200).json({
            message: 'Üniversite fotoğrafı başarıyla yüklendi',
            data: {
                imageUrl: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('University image upload error:', error);
        res.status(500).json({ message: 'Fotoğraf yüklenirken hata oluştu: ' + error.message });
    }
});

router.get('/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(imagePath, filename);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send('File not found.');
        } else {
            res.sendFile(filePath);
        }
    });
});

module.exports = router;
    const express = require('express');
    const router = express.Router();
    const multer = require('multer');
    const { uploadMaterial, getMaterialsByClass, getSignedUrl, deleteMaterial } = require('../controllers/materialController');
    const { verifyToken } = require('../middleware/auth');
    const { storage } = require('../config/cloudinary');

    const upload = multer({ storage });

    router.post('/upload', verifyToken, upload.single('file'), uploadMaterial);
    router.get('/class/:classId', verifyToken, getMaterialsByClass);
    router.get('/:materialId/signed-url', verifyToken, getSignedUrl);
    router.delete('/:materialId', verifyToken, deleteMaterial);

    module.exports = router;

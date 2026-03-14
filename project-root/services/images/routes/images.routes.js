const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/auth.middleware');
const { upload, uploadImage, getGroupImages, deleteImage } = require('../controllers/images.controller');

router.use(authMiddleware);

router.post('/upload', upload.single('image'), uploadImage);
router.get('/group/:groupId', getGroupImages);
router.delete('/:id', deleteImage);

module.exports = router;

const router = require('express').Router();
const { uploadScreening, getHistory, getScreeningById, downloadReport } = require('../controllers/screeningController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('image'), uploadScreening);
router.get('/history', protect, getHistory);
router.get('/:id', protect, getScreeningById);
router.get('/:id/report', protect, downloadReport);

module.exports = router;

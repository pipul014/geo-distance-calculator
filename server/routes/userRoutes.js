import express from 'express';
import { createUser, changeUserStatus, getDistance, getUserListingByWeekday } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();

router.post('/register', createUser);
router.put('/change-status', authenticateToken, changeUserStatus);
router.get('/get-distance', authenticateToken, getDistance);
router.post('/get-user-listing', authenticateToken, getUserListingByWeekday);

export default router;

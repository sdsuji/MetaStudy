const express = require('express'); 
const router = express.Router();

const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword
} = require('../controllers/userController');

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail); // Email verification route
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  const token =
    req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

  if (!token) {
    return res.status(403).json({ status_code: '403', message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, verified) => {
    if (err) {
      return res.status(403).json({ status_code: '403', message: 'Invalid token' });
    }

    try {
      const user = await User.findById(verified.id);
      if (!user) {
        return res.status(404).json({ status_code: '404', message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ status_code: '500', message: 'Internal Server Error' });
    }
  });
};

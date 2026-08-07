import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserById } from './accountStore.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '30d';

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'ログインが必要です' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'アカウントが見つかりません' });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'セッションが無効です。再度ログインしてください' });
  }
};

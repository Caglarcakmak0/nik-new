const Users = require("./models/Users.js");
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET_KEY = process.env.JWT_KEY;

const authenticateToken = async  (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1].replaceAll('"', '');
  // Support token via query param (for EventSource which can't set headers)
  if (!token && req.query && req.query.token) {
    token = String(req.query.token);
  }
  if (!token) {
    return res.status(401).end();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const user = await Users.findById(decoded.userId);

    if (!user) {
      return res.status(403).json({ message: "Bilgileriniz getirilemedi, lütfen tekrar giriş yapın." });
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(403).json({ message: "Token sürümü eski, lütfen yeniden giriş yapın." });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    return res.status(403).json({ message: "Oturum süreniz doldu, lütfen tekrar giriş yapın." });
  }
};

module.exports = authenticateToken;
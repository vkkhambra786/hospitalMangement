const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET || "your_jwt_secret_key";




  
// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
    const token = authHeader.split(' ')[1];
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      console.log("Decoded Token:", decoded);
      req.user = decoded;
      next();
    });
  };

  
  module.exports = authenticate
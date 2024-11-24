const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const router = express.Router();
const secretKey = process.env.JWT_SECRET_KEY || "your_jwt_secret_key";

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: "Invalid credentials" });
  
      // Check if the password matches
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
  
      // Generate JWT token and include email in the payload
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role }, // Include email here
        secretKey,
        { expiresIn: "1h" }
      );
  
      res.json({ message: "Logged in successfully", token, role: user.role });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

module.exports = router;

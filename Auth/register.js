const express = require("express");
const User = require("../model/user");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "Please provide all fields" });
  }

  if (!["doctor", "patients"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const newUser = new User({ username, email, password, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully", newUser });
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

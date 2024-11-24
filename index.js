 

require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticate =  require('./middleware/authenticate.js');
// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
 const registerRoute = require("./Auth/register")
 const loginRoute = require("./Auth/login")
// MongoDB connection
let uri = "mongodb+srv://vkkhambra786:vke3Cgm3QTE0lV0G@cluster0.lphsb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function connectToDatabase() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}
connectToDatabase();

app.use("/api", registerRoute);
app.use("/api", loginRoute);
 
 
const generateToken = (user) => {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role }, // Ensure email is included
      secretKey,
      { expiresIn: "1h" }
    );
  }; 
const appointmentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    timeSlot: { type: String, required: true },  
    doctorName: { type: String, required: true },  
  }, { timestamps: true });
  
  appointmentSchema.index({ timeSlot: 1, doctorName: 1 }, { unique: true });
  
  const Appointment = mongoose.model("Appointment", appointmentSchema);
   
   
app.post("/api/book-appointment", authenticate, async (req, res) => {
    const { firstName, lastName, email, timeSlot, doctorName } = req.body;
    const patientEmail = req.user?.email; // Safely access email
  
    if (!patientEmail) {
      return res.status(401).json({ error: "Unauthorized Email For Patient" });
    }
  
    
    if (!firstName || !lastName || !email || !timeSlot || !doctorName) {
      return res.status(400).json({ error: "Please provide firstName, lastName, email, timeSlot, and doctorName" });
    }
   
    const availableSlots = {
      "Dr. Smith": ["9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM" ,"3:00 PM - 4:00 PM"],
      "Dr. Jones": ["9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM","10:00 PM - 11:00 PM"],
      "Dr. Williams": ["1:00 PM - 2:00 PM", "2:00 PM - 3:00 PM"]
    };
  
     
    if (!availableSlots[doctorName] || !availableSlots[doctorName].includes(timeSlot)) {
      return res.status(400).json({ error: `The time slot ${timeSlot} is not available for ${doctorName}.` });
    }
  
    try {
      
      const existingAppointment = await Appointment.findOne({ timeSlot, doctorName });
      if (existingAppointment) {
        return res.status(400).json({ error: `This time slot is already booked for the doctor ${timeSlot}` });
      }
  
      
      const newAppointment = new Appointment({
        firstName,
        lastName,
        email,
        timeSlot,
        doctorName
      });
  
      await newAppointment.save();
  
      res.status(201).json({
        message: `Appointment booked successfully for ${firstName} ${ patientEmail}`,
        appointment: newAppointment,
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // View Appointment Details API
app.get("/api/view-appointment", authenticate, async (req, res) => {
    const patientEmail = req.user?.email; // Safely access email from the token
  
    if (!patientEmail) {
      return res.status(401).json({ error: "Unauthorized Email For Patient" });
    }
  
    try {
       
      const appointments = await Appointment.find({ email: patientEmail });
  
      if (appointments.length === 0) {
        return res.status(404).json({ error: "No appointments found for this patient" });
      }
   
      res.status(200).json({
        message: "Appointments found",
        appointments: appointments.map((appointment) => ({
          doctorName: appointment.doctorName,
          timeSlot: appointment.timeSlot,
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
        })),
      });
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
 
  // View All Appointments by Doctor API
app.get("/api/appointments-by-doctor", authenticate, async (req, res) => {
    const doctorName = req.query.doctorName;  
    const role = req.user?.role; // Role of the authenticated user (patient or doctor)
  
    if (!doctorName) {
      return res.status(400).json({ error: "Doctor's name is required" });
    }
  
    // Allow access only to authenticated doctors or admin roles
    if (role !== "doctor" && role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access" });
    }
  
    try { 
      const appointments = await Appointment.find({ doctorName });
  
      if (appointments.length === 0) {
        return res.status(404).json({ error: "No appointments found for this doctor" });
      }
   
      res.status(200).json({
        message: `Appointments for  ${doctorName} MBBS at `,
        appointments: appointments.map((appointment) => ({
          patientName: `${appointment.firstName} ${appointment.lastName}`,
          patientEmail: appointment.email,
          timeSlot: appointment.timeSlot,
        })),
      });
    } catch (error) {
      console.error("Error fetching appointments for doctor:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Cancel Appointment API
app.delete("/api/cancel-appointment", authenticate, async (req, res) => {
    const { email, timeSlot } = req.body;
    const patientEmail = req.user?.email; // Authenticated patient's email
    const role = req.user?.role; // Authenticated user's role
  
    if (role !== "patients") {
      return res.status(403).json({ error: "Unauthorized access, only patients can cancel appointments" });
    }
  
    if (!email || !timeSlot) {
      return res.status(400).json({ error: "Please provide email and time slot" });
    }
  
    if (email !== patientEmail) {
      return res.status(401).json({ error: "Unauthorized: Cannot cancel appointment for a different email" });
    }
  
    try { 
      const appointment = await Appointment.findOneAndDelete({ email, timeSlot });
  
      if (!appointment) {
        return res.status(404).json({ error: "No appointment found for the given email and time slot" });
      }
  
      res.status(200).json({
        message: `Appointment at ${timeSlot} has been successfully cancelled`,
        appointmentDetails: {
          patientName: `${appointment.firstName} ${appointment.lastName}`,
          email: appointment.email,
          timeSlot: appointment.timeSlot,
          doctorName: appointment.doctorName,
        },
      });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  
  // Modify Appointment API
app.put("/api/modify-appointment", authenticate, async (req, res) => {
    const { email, originalTimeSlot, newTimeSlot } = req.body;
    const patientEmail = req.user?.email;  
    const role = req.user?.role;  
  
    
    if (role !== "patients") {
      return res.status(403).json({ error: "Unauthorized access, only patients can modify appointments" });
    }
  
    if (!email || email !== patientEmail) {
      return res.status(401).json({ error: "Unauthorized: Cannot modify appointment for a different email" });
    }
  
    if (!originalTimeSlot || !newTimeSlot) {
      return res.status(400).json({ error: "Please provide original time slot and new time slot" });
    }
  
    try {
       
      const existingAppointment = await Appointment.findOne({ email, timeSlot: originalTimeSlot });
      if (!existingAppointment) {
        return res.status(404).json({ error: "No appointment found for the given email and original time slot" });
      }
   
      const conflictingAppointment = await Appointment.findOne({
        timeSlot: newTimeSlot,
        doctorName: existingAppointment.doctorName,
      });
      if (conflictingAppointment) {
        return res.status(400).json({ error: "The new time slot is already booked for the doctor" });
      }
   
      existingAppointment.timeSlot = newTimeSlot;
      await existingAppointment.save();
  
      res.status(200).json({
        message: `Appointment time slot updated successfully`,
        updatedAppointment: {
          patientName: `${existingAppointment.firstName} ${existingAppointment.lastName}`,
          email: existingAppointment.email,
          doctorName: existingAppointment.doctorName,
          originalTimeSlot,
          newTimeSlot,
        },
      });
    } catch (error) {
      console.error("Error modifying appointment:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port - ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();

const JWT_SECRET = "super-secret-key-123"; // Your Master Key

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Secure Database Connected"))
    .catch(err => console.log("❌ Error:", err));

const Student = mongoose.model('Student', new mongoose.Schema({ name: String, email: String }));

// Middleware: The "Security Guard"
const checkToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.send("<h1>Access Denied</h1><p>You need a JWT Token to see this.</p><a href='/login-demo'>Login here</a>");
    
    try {
        jwt.verify(token, JWT_SECRET);
        next(); // Let them through!
    } catch (err) {
        res.send("Invalid Token");
    }
};

// 1. Public Home Page
app.get('/', (req, res) => {
    res.send("<h1>Welcome to Educa LMS</h1><p>This is a public page.</p><a href='/admin'>Go to Admin Dashboard (Protected)</a>");
});

// 2. Login Route (Generates the JWT)
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Stephen" }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token); // Give the "ID Card" to the browser
    res.send("<h1>Logged In!</h1><p>Your JWT 'Digital ID' has been issued.</p><a href='/admin'>Enter Admin Dashboard</a>");
});

// 3. Protected Admin Page
app.get('/admin', checkToken, async (req, res) => {
    const students = await Student.find();
    res.send(`
        <h1>Admin Dashboard</h1>
        <p>Verified by JSON Web Token (JWT) ✅</p>
        <form action="/enroll" method="POST">
            <input type="text" name="name" placeholder="Student Name" required>
            <button type="submit">Enroll</button>
        </form>
        <ul>${students.map(s => `<li>${s.name}</li>`).join('')}</ul>
        <br><a href='/logout'>Logout</a>
    `);
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

app.post('/enroll', checkToken, async (req, res) => {
    await new Student({ name: req.body.name }).save();
    res.redirect('/admin');
});

app.listen(3000, () => console.log('🚀 Secure Server @ http://localhost:3000'));
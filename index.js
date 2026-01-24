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
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Educa LMS | Professional Learning</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen">
    <div class="text-center p-8 bg-white shadow-2xl rounded-xl border-t-4 border-blue-600 max-w-lg mx-auto">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Welcome to Educa LMS</h1>
        <p class="text-gray-600 mb-8 text-lg">Your gateway to professional, cloud-based learning management.</p>
        
        <div class="space-y-4">
            <a href="/dashboard" class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                Go to Admin Dashboard (Protected)
            </a>
            <p class="text-sm text-gray-400 italic">Connected to Google Cloud & MongoDB Atlas</p>
        </div>
    </div>
</body>
</html>
    `);
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
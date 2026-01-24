require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Course = require('./Course');
const User = require('./User');

const app = express();

// MIDDLEWARE - Order is critical for reading form data
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. PUBLIC HOME PAGE UI
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
                <h1 class="text-4xl font-bold text-gray-800 mb-4 text-blue-600">Educa LMS</h1>
                <p class="text-gray-600 mb-8 text-lg text-left">The server is live and connected to Google Cloud.</p>
                <div class="grid grid-cols-1 gap-4">
                    <a href="/register" class="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md">
                        Student Registration
                    </a>
                    <a href="/add-sample-course" class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                        Add Sample Course (DB Test)
                    </a>
                    <a href="/dashboard" class="block w-full py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition">
                        Go to Admin Dashboard (Protected)
                    </a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 3. STUDENT REGISTRATION ROUTES
app.get('/register', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-100 flex items-center justify-center h-screen">
            <form action="/register-student" method="POST" class="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">Student Registration</h2>
                <input type="text" name="fullName" placeholder="Full Name" class="w-full p-2 mb-4 border rounded" required>
                <input type="email" name="email" placeholder="Email Address" class="w-full p-2 mb-4 border rounded" required>
                <input type="password" name="password" placeholder="Create Password" class="w-full p-2 mb-6 border rounded" required>
                <button type="submit" class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Register Now</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/register-student', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const newStudent = new User({ fullName, email, password });
        await newStudent.save();
        res.send("<h1>✅ Registration Successful!</h1><p>Welcome to the platform.</p><a href='/'>Go Home</a>");
    } catch (err) {
        res.status(500).send("❌ Registration Error: " + err.message);
    }
});

// 4. COURSE ROUTES
app.get('/add-sample-course', async (req, res) => {
    try {
        const newCourse = new Course({
            title: "Cloud Engineering with Node.js",
            description: "A premium course hosted on Render and MongoDB.",
            instructor: "Stephen",
            price: 450
        });
        await newCourse.save();
        res.send("<h1>✅ Success!</h1><p>Course added to MongoDB Atlas.</p><a href='/'>Back Home</a>");
    } catch (err) {
        res.status(500).send("❌ Database Error: " + err.message);
    }
});

// 5. SECURITY & ADMIN ROUTES
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Stephen", role: "admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token, { httpOnly: true });
    res.send("<h1>🔐 Logged In</h1><p>You now have a secure token.</p><a href='/dashboard'>Go to Dashboard</a>");
});

app.get('/dashboard', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("<h1>🚫 Access Denied</h1><a href='/login-demo'>Login First</a>");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        res.send("<h1>🛠️ Admin Dashboard</h1><p>Welcome, Admin.</p><a href='/'>Back Home</a>");
    } catch (err) { res.status(403).send("Invalid Token."); }
});

// 6. SERVER START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is active on port ${PORT}`);
});
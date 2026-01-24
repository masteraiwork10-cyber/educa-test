require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Course = require('./Course');

const app = express();
app.use(cookieParser());

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ DATABASE: Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ DATABASE: Connection error:', err));

// 2. PUBLIC HOME PAGE
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
                <div class="space-y-4">
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

// 3. DATABASE ROUTE: Add a Course
app.get('/add-sample-course', async (req, res) => {
    try {
        const newCourse = new Course({
            title: "Cloud Engineering with Node.js",
            description: "A premium course hosted on Render and MongoDB.",
            instructor: "Stephen",
            price: 450
        });
        await newCourse.save();
        res.send("<h1>✅ Success!</h1><p>Check your MongoDB Atlas dashboard—the course is there.</p><a href='/'>Back Home</a>");
    } catch (err) {
        res.status(500).send("❌ Database Error: " + err);
    }
});

// 4. SECURITY ROUTE: Login Demo
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Stephen", role: "admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token, { httpOnly: true });
    res.send("<h1>🔐 Logged In</h1><p>Your browser now has a secure token. You can access the Dashboard.</p><a href='/dashboard'>Go to Dashboard</a>");
});

// 5. PROTECTED ADMIN ROUTE
app.get('/dashboard', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send("<h1>🚫 Access Denied</h1><p>You need a secure token to see this. <a href='/login-demo'>Click here to login.</a></p>");
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        res.send("<h1>🛠️ Admin Dashboard</h1><p>Welcome back, Admin. You have full control over the database.</p><a href='/'>Back Home</a>");
    } catch (err) {
        res.status(403).send("Invalid Token.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`); //
});
const User = require('./User'); // Add this at the top with your other requires

// 6. STUDENT REGISTRATION PAGE (The Form)
app.get('/register', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Register | Educa LMS</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
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
app.use(express.urlencoded({ extended: true })); // Place this near app.use(cookieParser())

// 7. POST ROUTE: Saving the Student to MongoDB
app.post('/register-student', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const newStudent = new User({ fullName, email, password });
        await newStudent.save();
        res.send(`<h1>✅ Welcome, ${fullName}!</h1><p>You are now registered. <a href="/">Back to Home</a></p>`);
    } catch (err) {
        res.status(500).send("❌ Registration Error: " + err);
    }
});
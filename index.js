require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Course = require('./Course');
const User = require('./User');

const app = express();

// MIDDLEWARE
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

// ADMIN DASHBOARD WITH STUDENT TABLE
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("<h1>🚫 Access Denied</h1><a href='/login-demo'>Login First</a>");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        
        // Fetch students from DB
        const students = await User.find({});
        
        // Generate table rows
        // REPLACE THIS BLOCK inside app.get('/dashboard')
        let studentRows = students.map(s => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 text-gray-700 font-medium">${s.fullName}</td>
                <td class="p-3 text-gray-700">${s.email}</td>
                <td class="p-3 text-center space-x-2">
                    <a href="/enroll-student/${s._id}" 
                       class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold hover:bg-blue-200">
                       Enroll
                    </a>
                    <a href="/delete-student/${s._id}" 
                       onclick="return confirm('Delete this student?')" 
                       class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold hover:bg-red-200">
                       Delete
                    </a>
                </td>
            </tr>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-gray-50 p-10 font-sans">
                <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div class="bg-blue-600 p-8 text-white flex justify-between items-center">
                        <div>
                            <h1 class="text-3xl font-bold">Admin Dashboard</h1>
                            <p class="text-blue-100 opacity-90">Manage your student directory</p>
                        </div>
                        <a href="/" class="bg-blue-500 hover:bg-blue-400 text-white px-5 py-2 rounded-lg transition">Home</a>
                    </div>
                    <div class="p-8">
                        <table class="w-full text-left">
                            <thead class="text-gray-400 border-b">
                                <tr>
                                    <th class="p-3 uppercase text-xs tracking-wider">Student Name</th>
                                    <th class="p-3 uppercase text-xs tracking-wider">Email</th>
                                    <th class="p-3 uppercase text-xs tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${studentRows || '<tr><td colspan="3" class="p-10 text-center text-gray-400">No students found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) { 
        res.status(403).send("Invalid Token."); 
    }
});

// DELETE STUDENT LOGIC
app.get('/delete-student/:id', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("Unauthorized");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send("Error deleting student: " + err.message);
    }
});

// ADD THIS AT THE BOTTOM (Before the PORT definition)
app.get('/enroll-student/:id', async (req, res) => {
    try {
        // 1. Find the course we want to link to
        const sampleCourse = await Course.findOne({ title: "Cloud Engineering with Node.js" });
        
        if (!sampleCourse) {
            return res.send("Course not found. Go to the Home Page and click 'Add Sample Course' first!");
        }

        // 2. Add the Course ID to the Student's data
        // $addToSet prevents adding the same course twice
        await User.findByIdAndUpdate(req.params.id, { 
            $addToSet: { enrolledCourses: sampleCourse._id } 
        });

        res.send(`<h1>🎓 Enrollment Success</h1><p>Added to ${sampleCourse.title}</p><a href="/dashboard">Back</a>`);
    } catch (err) {
        res.status(500).send("Enrollment Error: " + err.message);
    }
});

// 6. SERVER START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is active on port ${PORT}`);
});
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
            <title>Educa LMS</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center h-screen">
            <div class="text-center p-8 bg-white shadow-2xl rounded-xl border-t-4 border-blue-600 max-w-lg mx-auto">
                <h1 class="text-4xl font-bold text-gray-800 mb-4 text-blue-600">Educa LMS</h1>
                
                <div class="grid grid-cols-1 gap-4 text-left">
                    <a href="/register" class="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-center">
                        Student Registration
                    </a>
                    <a href="/add-sample-course" class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center">
                        Add Sample Course
                    </a>
                    <a href="/dashboard" class="block w-full py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-center">
                        Admin Dashboard
                    </a>

                    <div class="mt-6 pt-6 border-t border-gray-100">
                        <h3 class="text-xs font-bold text-gray-400 uppercase mb-3 text-center tracking-widest">Student Portal</h3>
                        <form action="/student-login" method="POST" class="flex flex-col gap-2">
                            <input type="email" name="email" placeholder="Enter your registered email" 
                                   class="p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required>
                            <button type="submit" class="bg-gray-800 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-black transition">
                                Login to My Courses
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 3. STUDENT REGISTRATION ROUTES (Cleaned up)
app.get('/register', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-100 flex items-center justify-center h-screen">
            <form action="/register-student" method="POST" class="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 class="text-2xl font-bold mb-6 text-gray-800 text-center">Student Registration</h2>
                <input type="text" name="fullName" placeholder="Full Name" class="w-full p-2 mb-4 border rounded" required>
                <input type="email" name="email" placeholder="Email Address" class="w-full p-2 mb-4 border rounded" required>
                <input type="password" name="password" placeholder="Create Password" class="w-full p-2 mb-6 border rounded" required>
                <button type="submit" class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold transition">Register Now</button>
                <div class="mt-4 text-center">
                    <a href="/" class="text-sm text-blue-600 hover:underline">Already registered? Go Home to Login</a>
                </div>
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
// REPLACE the beginning of your app.get('/dashboard') route
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("<h1>🚫 Access Denied</h1><a href='/login-demo'>Login First</a>");
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');

        // 1. Get the search term from the URL (if any)
        const searchQuery = req.query.search || "";
        
        // 2. Fetch students based on search
        const students = await User.find({
            $or: [
                { fullName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        }).populate('enrolledCourses');

        const totalStudents = await User.countDocuments();
        
        // Fetch students from DB
        // This 'populates' the enrolledCourses field with the actual Course data
        const students = await User.find({}).populate('enrolledCourses');
        
        // Generate table rows
        // REPLACE THIS BLOCK inside app.get('/dashboard')
        let studentRows = students.map(s => {
            // Get the names of all courses the student is in
            const courseNames = s.enrolledCourses.map(c => c.title).join(', ') || 'No Courses';

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 text-gray-700 font-medium">${s.fullName}</td>
                    <td class="p-3 text-gray-600 text-sm">
                        <span class="block font-bold text-blue-500">${courseNames}</span>
                        ${s.email}
                    </td>
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
            `;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-gray-50 p-10 font-sans">
                <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    // REPLACE the Header div in your dashboard res.send
<div class="bg-blue-600 p-8 text-white flex justify-between items-center">
    <div>
        <h1 class="text-3xl font-bold">Admin Dashboard</h1>
        <p class="text-blue-100 opacity-90">Total Registered: ${totalStudents}</p>
    </div>
    <form action="/dashboard" method="GET" class="flex gap-2">
        <input type="text" name="search" placeholder="Search students..." 
               class="p-2 rounded-lg text-gray-800 text-sm outline-none" value="${searchQuery}">
        <button type="submit" class="bg-blue-800 px-4 py-2 rounded-lg text-sm font-bold">Search</button>
    </form>
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
// 10. STUDENT LOGIN ROUTE (For Peter to see his courses)
// ADD/CHECK THIS at the bottom of index.js
app.post('/student-login', async (req, res) => {
    try {
        const { email } = req.body;
        // Search the database for the student 
        const student = await User.findOne({ email }).populate('enrolledCourses');

        if (!student) {
            return res.send("<h1>❌ Email not found</h1><p>Please register first.</p><a href='/'>Back</a>");
        }

        // REPLACE the myCourses map block inside app.post('/student-login')
let myCourses = student.enrolledCourses.map(c => `
    <li class="bg-blue-50 p-4 mb-3 rounded-xl border border-blue-100 flex justify-between items-center">
        <div>
            <span class="block text-xs text-blue-400 uppercase font-bold">Course</span>
            <span class="text-blue-900 font-bold">📚 ${c.title}</span>
        </div>
        <a href="/view-certificate/${student.fullName}/${c.title}" 
           class="bg-white text-blue-600 border border-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition">
           View Certificate
        </a>
    </li>
`).join('');

        res.send(`
            <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; border: 1px solid #eee; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <h1 style="color: #1a202c;">Welcome back, ${student.fullName}!</h1>
                <p style="color: #718096;">You are logged in as ${student.email}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <h3 style="color: #2d3748;">My Enrolled Courses:</h3>
                <ul style="list-style: none; padding: 0;">
                    ${myCourses || '<li style="color: #a0aec0;">No courses found.</li>'}
                </ul>
                <br>
                <a href="/" style="display: inline-block; padding: 10px 20px; background: #ebf8ff; color: #3182ce; text-decoration: none; border-radius: 8px; font-weight: bold;">Logout</a>
            </div>
        `);
    } catch (err) {
        res.status(500).send("Login Error: " + err.message);
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server is active on port ${PORT}`);
});
// 11. VIEW CERTIFICATE ROUTE
app.get('/view-certificate/:name/:course', (req, res) => {
    const { name, course } = req.params;
    res.send(`
        <body style="background: #f0f4f8; display: flex; align-items: center; justify-center; height: 100vh; font-family: serif;">
            <div style="width: 800px; height: 500px; background: white; border: 20px solid #2c3e50; padding: 50px; text-align: center; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.1); margin: auto;">
                <h1 style="font-size: 50px; color: #2c3e50; margin-bottom: 0;">Certificate of Achievement</h1>
                <p style="font-size: 20px; color: #7f8c8d;">This is to certify that</p>
                <h2 style="font-size: 40px; color: #e67e22; margin: 20px 0;">${name}</h2>
                <p style="font-size: 20px; color: #7f8c8d;">has successfully completed the course</p>
                <h3 style="font-size: 30px; color: #2c3e50;">${course}</h3>
                <div style="margin-top: 50px; border-top: 2px solid #bdc3c7; display: inline-block; width: 200px;">
                    <p>Program Director</p>
                </div>
                <div style="position: absolute; bottom: 30px; left: 30px; font-size: 12px; color: #bdc3c7;">
                    Educa LMS Verified Digital Record
                </div>
            </div>
        </body>
    `);
});
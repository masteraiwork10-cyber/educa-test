require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. MODELS
const Course = require('./Course');
const User = require('./User');

const app = express();

// 2. MIDDLEWARE SETUP
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. FILE UPLOAD CONFIGURATION (Multer)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadDir));

// 4. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 5. PUBLIC HOME PAGE
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
            <div class="text-center p-8 bg-white shadow-2xl rounded-xl border-t-4 border-blue-600 max-w-lg mx-auto w-full">
                <h1 class="text-4xl font-bold text-gray-800 mb-4 text-blue-600">Educa LMS</h1>
                <div class="grid grid-cols-1 gap-4 text-left">
                    <a href="/register" class="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-center">Student Registration</a>
                    <a href="/add-sample-course" class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center">Add Sample Course</a>
                    <a href="/dashboard" class="block w-full py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-center">Admin Dashboard</a>
                    <div class="mt-6 pt-6 border-t border-gray-100 text-center">
                        <h3 class="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Student Portal</h3>
                        <form action="/student-login" method="POST" class="flex flex-col gap-2">
                            <input type="email" name="email" placeholder="Enter your registered email" class="p-3 border rounded-lg text-sm outline-none" required>
                            <button type="submit" class="bg-gray-800 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-black transition">Login to My Courses</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 6. STUDENT REGISTRATION
app.get('/register', (req, res) => {
    res.send(`
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-100 flex items-center justify-center h-screen">
            <form action="/register-student" method="POST" class="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 class="text-2xl font-bold mb-6 text-gray-800 text-center">Student Registration</h2>
                <input type="text" name="fullName" placeholder="Full Name" class="w-full p-2 mb-4 border rounded" required>
                <input type="email" name="email" placeholder="Email Address" class="w-full p-2 mb-4 border rounded" required>
                <input type="password" name="password" placeholder="Create Password" class="w-full p-2 mb-6 border rounded" required>
                <button type="submit" class="w-full bg-green-600 text-white py-2 rounded font-bold transition">Register Now</button>
                <div class="mt-4 text-center"><a href="/" class="text-sm text-blue-600 hover:underline">Back Home</a></div>
            </form>
        </body>
    `);
});

app.post('/register-student', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const newStudent = new User({ fullName, email, password });
        await newStudent.save();
        res.send("<h1>✅ Registration Successful!</h1><a href='/'>Go Home</a>");
    } catch (err) { res.status(500).send("❌ Error: " + err.message); }
});

// 7. ADMIN DASHBOARD
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("<h1>🚫 Access Denied</h1><a href='/login-demo'>Login First</a>");
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const searchQuery = req.query.search || "";
        const totalStudents = await User.countDocuments();
        const students = await User.find({
            $or: [
                { fullName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        }).populate('enrolledCourses');
        
        let studentRows = students.map(s => {
            const courseNames = s.enrolledCourses.map(c => c.title).join(', ') || 'No Courses';
            return `
                <tr class="border-b">
                    <td class="p-3 font-medium">${s.fullName}</td>
                    <td class="p-3 text-sm"><span class="block font-bold text-blue-500">${courseNames}</span>${s.email}</td>
                    <td class="p-3 text-center">
                        <a href="/enroll-student/${s._id}" class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">Enroll</a>
                        <a href="/delete-student/${s._id}" onclick="return confirm('Delete?')" class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">Delete</a>
                    </td>
                </tr>
            `;
        }).join('');

        res.send(`
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-gray-50 p-10">
                <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div class="bg-blue-600 p-8 text-white flex justify-between items-center">
                        <div>
                            <h1 class="text-3xl font-bold">Admin Dashboard</h1>
                            <p class="text-blue-100">Total Students: ${totalStudents}</p>
                        </div>
                        <form action="/dashboard" method="GET" class="flex gap-2">
                            <input type="text" name="search" placeholder="Search..." class="p-2 rounded text-gray-800 text-sm outline-none" value="${searchQuery}">
                            <button type="submit" class="bg-blue-800 px-4 py-2 rounded text-sm font-bold">Search</button>
                        </form>
                    </div>
                    <div class="p-4 bg-blue-700 text-white text-center">
                        <p class="text-xs font-bold uppercase mb-2">Upload Course Syllabus (PDF)</p>
                        <form action="/upload-syllabus" method="POST" enctype="multipart/form-data" class="flex justify-center gap-2">
                            <input type="file" name="syllabus" accept=".pdf" class="text-xs" required>
                            <button type="submit" class="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold">Upload</button>
                        </form>
                    </div>
                    <div class="p-8">
                        <table class="w-full text-left">
                            <thead class="text-gray-400 border-b"><tr><th>Name</th><th>Email/Course</th><th class="text-center">Actions</th></tr></thead>
                            <tbody>${studentRows || '<tr><td colspan="3" class="p-10 text-center">No students found.</td></tr>'}</tbody>
                        </table>
                        <div class="mt-6 text-center"><a href="/" class="text-blue-600 hover:underline">Back Home</a></div>
                    </div>
                </div>
            </body>
        `);
    } catch (err) { res.status(403).send("Invalid Token."); }
});

// 8. FILE UPLOAD LOGIC
app.post('/upload-syllabus', upload.single('syllabus'), async (req, res) => {
    try {
        if (!req.file) return res.send("No file selected.");
        const fileUrl = `/uploads/${req.file.filename}`;
        await Course.findOneAndUpdate(
            { title: "Cloud Engineering with Node.js" },
            { syllabusUrl: fileUrl },
            { upsert: true }
        );
        res.send(`<h1>✅ Upload Success</h1><a href="/dashboard">Back to Dashboard</a>`);
    } catch (err) { res.status(500).send("Upload Error: " + err.message); }
});

// 9. STUDENT LOGIN & PORTAL
app.post('/student-login', async (req, res) => {
    try {
        const { email } = req.body;
        const student = await User.findOne({ email }).populate('enrolledCourses');
        if (!student) return res.send("<h1>❌ Email not found</h1><a href='/'>Back</a>");

        let myCourses = student.enrolledCourses.map(c => `
            <li class="bg-blue-50 p-4 mb-3 rounded-xl flex justify-between items-center border border-blue-100">
                <div>
                    <span class="block text-xs text-blue-400 uppercase font-bold">Course</span>
                    <span class="text-blue-900 font-bold">📚 ${c.title}</span>
                    ${c.syllabusUrl ? `<br><a href="${c.syllabusUrl}" download class="text-xs text-green-600 font-bold underline">Download Syllabus</a>` : ''}
                </div>
                <a href="/view-certificate/${student.fullName}/${c.title}" class="bg-white text-blue-600 border border-blue-600 px-3 py-1 rounded-lg text-xs font-bold">View Certificate</a>
            </li>
        `).join('');

        res.send(`
            <div style="font-family: sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; border: 1px solid #eee; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <h1 style="color: #1a202c;">Welcome, ${student.fullName}!</h1>
                <h3 style="color: #2d3748;">My Enrolled Courses:</h3>
                <ul style="list-style: none; padding: 0;">${myCourses || '<li>No courses yet.</li>'}</ul>
                <br><a href="/" style="display: inline-block; padding: 10px 20px; background: #ebf8ff; color: #3182ce; text-decoration: none; border-radius: 8px; font-weight: bold;">Logout</a>
            </div>
        `);
    } catch (err) { res.status(500).send("Login Error: " + err.message); }
});

// 10. EXTRA UTILITIES
app.get('/add-sample-course', async (req, res) => {
    try {
        const newCourse = new Course({ 
            title: "Cloud Engineering with Node.js", 
            instructor: "Stephen", 
            price: 450,
            description: "Learn how to build and deploy high-performance applications to the cloud." // DESCRIPTION ADDED HERE
        });
        await newCourse.save();
        res.send("<h1>✅ Course Added</h1><a href='/'>Back Home</a>");
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/enroll-student/:id', async (req, res) => {
    try {
        const course = await Course.findOne({ title: "Cloud Engineering with Node.js" });
        await User.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledCourses: course._id } });
        res.redirect('/dashboard');
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/delete-student/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard');
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Stephen", role: "admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    const { name, course } = req.params;
    res.send(`
        <body style="background: #f0f4f8; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: serif;">
            <div style="width: 800px; height: 500px; background: white; border: 20px solid #2c3e50; padding: 50px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
                <h1 style="font-size: 50px; color: #2c3e50;">Certificate of Achievement</h1>
                <p style="font-size: 20px; color: #7f8c8d;">This is to certify that</p>
                <h2 style="font-size: 40px; color: #e67e22;">${name}</h2>
                <p style="font-size: 20px; color: #7f8c8d;">has completed</p>
                <h3 style="font-size: 30px; color: #2c3e50;">${course}</h3>
            </div>
        </body>
    `);
});

app.use((req, res) => {
    res.status(404).send("<body style='text-align:center; padding:50px; font-family:sans-serif;'><h1>404</h1><p>Page Not Found</p><a href='/'>Go Home</a></body>");
});

// SERVER START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server active on port ${PORT}`); });
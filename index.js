require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. MODELS (User & Course)
const Course = require('./Course');
const User = require('./User');

const app = express();

// 2. MIDDLEWARE
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. FILE UPLOAD CONFIG
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadDir));

// 4. DB CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 5. HOME PAGE
app.get('/', (req, res) => {
    res.send(`
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 flex items-center justify-center h-screen font-sans">
            <div class="text-center p-10 bg-white shadow-2xl rounded-3xl border-b-8 border-blue-600 max-w-md w-full">
                <h1 class="text-5xl font-black text-slate-800 mb-2">Educa<span class="text-blue-600">.</span></h1>
                <p class="text-slate-400 mb-8 font-medium">Professional LMS Core</p>
                <div class="space-y-3">
                    <a href="/register" class="block py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition">Student Join</a>
                    <a href="/dashboard" class="block py-4 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition">Admin Panel</a>
                    <div class="pt-6 mt-6 border-t">
                        <form action="/student-login" method="POST" class="space-y-2">
                            <input type="email" name="email" placeholder="Student Email" class="w-full p-4 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400" required>
                            <button class="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition">Login to Portal</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
    `);
});

// 6. ADMIN DASHBOARD (With Progress Controls)
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("<h1>Unauthorized</h1><a href='/login-demo'>Login</a>");
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const students = await User.find().populate('enrolledCourses');
        
        let rows = students.map(s => `
            <tr class="border-b text-sm">
                <td class="p-4 font-bold text-slate-700">${s.fullName}</td>
                <td class="p-4">
                    <form action="/update-progress/${s._id}" method="POST" class="flex items-center gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" min="0" max="100" class="w-16 p-1 border rounded text-center">
                        <button class="text-xs bg-slate-800 text-white px-2 py-1 rounded">% Set</button>
                    </form>
                </td>
                <td class="p-4 text-center">
                    <a href="/enroll-student/${s._id}" class="text-blue-600 font-bold mr-3">Enroll</a>
                    <a href="/delete-student/${s._id}" class="text-red-400 hover:text-red-600">Delete</a>
                </td>
            </tr>
        `).join('');

        res.send(`
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-100 p-8 font-sans">
                <div class="max-w-4xl mx-auto">
                    <div class="bg-white rounded-3xl shadow-sm overflow-hidden">
                        <div class="bg-blue-600 p-8 text-white flex justify-between items-center">
                            <h1 class="text-2xl font-black">LMS Management</h1>
                            <div class="flex gap-2">
                                <a href="/add-sample-course" class="bg-blue-500 px-4 py-2 rounded-xl text-xs font-bold">Add Course</a>
                                <a href="/" class="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">Logout</a>
                            </div>
                        </div>
                        <div class="p-4 bg-slate-50 border-b flex justify-center gap-4">
                             <form action="/upload-syllabus" method="POST" enctype="multipart/form-data" class="flex items-center gap-2">
                                <span class="text-xs font-bold text-slate-400 uppercase">Syllabus PDF:</span>
                                <input type="file" name="syllabus" class="text-xs">
                                <button class="bg-blue-600 text-white px-3 py-1 rounded text-xs">Upload</button>
                             </form>
                        </div>
                        <table class="w-full">
                            <thead class="bg-slate-50 text-slate-400 text-xs uppercase text-left">
                                <tr><th class="p-4">Student</th><th class="p-4">Progress</th><th class="p-4 text-center">Actions</th></tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </body>
        `);
    } catch (e) { res.redirect('/'); }
});

// 7. PROGRESS & UPLOAD LOGIC
app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.post('/upload-syllabus', upload.single('syllabus'), async (req, res) => {
    if (req.file) {
        await Course.findOneAndUpdate({ title: "Cloud Engineering with Node.js" }, { syllabusUrl: `/uploads/${req.file.filename}` }, { upsert: true });
    }
    res.redirect('/dashboard');
});

// 8. STUDENT PORTAL (With Visual Progress Bar)
app.post('/student-login', async (req, res) => {
    const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
    if (!student) return res.send("User not found");

    let progress = student.courseProgress || 0;
    let courses = student.enrolledCourses.map(c => `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-black text-slate-800 text-lg">${c.title}</h3>
                    <p class="text-sm text-slate-400">${c.instructor}</p>
                </div>
                ${c.syllabusUrl ? `<a href="${c.syllabusUrl}" download class="text-blue-600 text-xs font-bold underline">Syllabus PDF</a>` : ''}
            </div>
            <div class="relative pt-1">
                <div class="flex mb-2 items-center justify-between">
                    <div><span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100">Progress</span></div>
                    <div class="text-right"><span class="text-xs font-semibold inline-block text-blue-600">${progress}%</span></div>
                </div>
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                    <div style="width:${progress}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                </div>
            </div>
            <a href="/view-certificate/${student.fullName}/${c.title}" class="block text-center py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition">View Certificate</a>
        </div>
    `).join('');

    res.send(`
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 p-6 font-sans">
            <div class="max-w-md mx-auto">
                <h1 class="text-3xl font-black text-slate-800 mb-6">My Learning<span class="text-blue-600">.</span></h1>
                <div class="space-y-4">${courses || '<p class="text-slate-400">No courses enrolled yet.</p>'}</div>
                <a href="/" class="block text-center mt-8 text-slate-400 text-sm font-bold">Logout</a>
            </div>
        </body>
    `);
});

// 9. SYSTEM ROUTES
app.get('/register', (req, res) => {
    res.send(`
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-100 flex items-center justify-center h-screen">
            <form action="/register-student" method="POST" class="bg-white p-10 rounded-3xl shadow-xl w-96">
                <h2 class="text-2xl font-black mb-6">Create Account</h2>
                <input type="text" name="fullName" placeholder="Name" class="w-full p-3 mb-3 bg-slate-50 rounded-xl outline-none" required>
                <input type="email" name="email" placeholder="Email" class="w-full p-3 mb-3 bg-slate-50 rounded-xl outline-none" required>
                <input type="password" name="password" placeholder="Password" class="w-full p-3 mb-6 bg-slate-50 rounded-xl outline-none" required>
                <button class="w-full py-4 bg-blue-600 text-white font-bold rounded-xl">Register</button>
            </form>
        </body>
    `);
});

app.post('/register-student', async (req, res) => {
    await new User(req.body).save();
    res.send("<h1>Done!</h1><a href='/'>Login</a>");
});

app.get('/add-sample-course', async (req, res) => {
    await new Course({ title: "Cloud Engineering with Node.js", instructor: "Stephen", price: 450, description: "Full Stack Mastery" }).save();
    res.redirect('/dashboard');
});

app.get('/enroll-student/:id', async (req, res) => {
    const course = await Course.findOne();
    await User.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledCourses: course._id } });
    res.redirect('/dashboard');
});

app.get('/delete-student/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/dashboard');
});

app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:serif;"><div style="width:700px;border:15px solid #1e293b;padding:50px;text-align:center;background:white;box-shadow:0 20px 50px rgba(0,0,0,0.1);"><h1>Certificate</h1><p>Awarded to</p><h2 style="color:#2563eb;font-size:40px;">${req.params.name}</h2><p>for completing</p><h3>${req.params.course}</h3></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Port ${PORT}`));
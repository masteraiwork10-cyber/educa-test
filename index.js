require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// 1. MODELS
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

// 5. PUBLIC INSTRUCTOR PORTFOLIO (New Feature!)
app.get('/portfolio/:name', async (req, res) => {
    try {
        const courses = await Course.find({ instructor: req.params.name });
        const totalStudents = await User.countDocuments(); // Simplified for demo
        
        const courseList = courses.map(c => `
            <div class="p-4 border-l-4 border-blue-500 bg-white shadow-sm rounded-r-xl">
                <h3 class="font-bold text-slate-800">${c.title}</h3>
                <p class="text-xs text-slate-500">${c.description}</p>
            </div>
        `).join('');

        res.send(`
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-50 p-8 font-sans">
                <div class="max-w-2xl mx-auto text-center">
                    <div class="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black">
                        ${req.params.name[0]}
                    </div>
                    <h1 class="text-3xl font-black text-slate-800">${req.params.name}</h1>
                    <p class="text-slate-400 mb-8">Verified Expert Instructor</p>
                    
                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div class="bg-white p-6 rounded-2xl shadow-sm">
                            <span class="block text-2xl font-black text-blue-600">${courses.length}</span>
                            <span class="text-xs font-bold text-slate-400 uppercase">Courses</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl shadow-sm">
                            <span class="block text-2xl font-black text-green-600">${totalStudents}+</span>
                            <span class="text-xs font-bold text-slate-400 uppercase">Students</span>
                        </div>
                    </div>

                    <div class="text-left space-y-4">
                        <h2 class="font-bold text-slate-800 uppercase text-xs tracking-widest">Available Courses</h2>
                        ${courseList || '<p class="text-slate-400">No courses published yet.</p>'}
                    </div>
                    
                    <a href="/" class="inline-block mt-12 text-blue-600 font-bold text-sm">← Back to Educa Home</a>
                </div>
            </body>
        `);
    } catch (err) { res.status(500).send("Error loading portfolio."); }
});

// 6. HOME PAGE
app.get('/', (req, res) => {
    res.send(`
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 flex items-center justify-center h-screen font-sans">
            <div class="text-center p-10 bg-white shadow-2xl rounded-3xl border-b-8 border-blue-600 max-w-md w-full">
                <h1 class="text-5xl font-black text-slate-800 mb-2">Educa<span class="text-blue-600">.</span></h1>
                <p class="text-slate-400 mb-8 font-medium">Professional LMS Core</p>
                <div class="space-y-3">
                    <a href="/register" class="block py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition">Student Join</a>
                    <a href="/portfolio/Stephen" class="block py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition">View Instructor Portfolio</a>
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

// [KEEPING ALL PREVIOUS ROUTES: /download-invoice, /dashboard, /update-progress, /upload-syllabus, /student-login, /register, /add-sample-course, /enroll-student, /delete-student, /login-demo, /view-certificate]

// 7. INVOICE GENERATOR
app.get('/download-invoice/:id', async (req, res) => {
    const student = await User.findById(req.params.id).populate('enrolledCourses');
    const doc = new PDFDocument();
    res.setHeader('Content-disposition', `attachment; filename=Invoice.pdf`);
    doc.fontSize(20).text('OFFICIAL RECEIPT', { align: 'center' });
    doc.moveDown().fontSize(12).text(`Student: ${student.fullName}`);
    student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
    doc.pipe(res); doc.end();
});

// 8. ADMIN DASHBOARD
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("Unauthorized");
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
                    <a href="/download-invoice/${s._id}" class="text-green-600 font-bold mr-3">Invoice</a>
                    <a href="/enroll-student/${s._id}" class="text-blue-600 font-bold mr-3">Enroll</a>
                    <a href="/delete-student/${s._id}" class="text-red-400">Delete</a>
                </td>
            </tr>
        `).join('');
        res.send(`
            <head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-slate-100 p-8 font-sans">
                <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm overflow-hidden">
                    <div class="bg-blue-600 p-8 text-white flex justify-between">
                        <h1 class="text-2xl font-black">Admin Panel</h1>
                        <a href="/add-sample-course" class="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">Add Course</a>
                    </div>
                    <table class="w-full"><tbody>${rows}</tbody></table>
                </div>
            </body>
        `);
    } catch (e) { res.redirect('/'); }
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.post('/student-login', async (req, res) => {
    const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
    let courses = student.enrolledCourses.map(c => `
        <div class="bg-white p-6 rounded-2xl mb-4">
            <h3 class="font-black text-slate-800">${c.title}</h3>
            <div class="w-full bg-slate-100 h-2 rounded-full my-2"><div style="width:${student.courseProgress}%" class="bg-blue-500 h-full rounded-full"></div></div>
            <a href="/view-certificate/${student.fullName}/${c.title}" class="text-xs font-bold text-blue-600">Certificate</a>
        </div>
    `).join('');
    res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6"><div class="max-w-md mx-auto">${courses}</div></body>`);
});

app.post('/register-student', async (req, res) => {
    await new User(req.body).save();
    res.send("Success! <a href='/'>Login</a>");
});

app.get('/add-sample-course', async (req, res) => {
    await new Course({ title: "Cloud Engineering", instructor: "Stephen", price: 450, description: "Master the Cloud" }).save();
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
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:serif;"><div style="width:700px;border:15px solid #1e293b;padding:50px;text-align:center;background:white;"><h1>Certificate</h1><h2>${req.params.name}</h2><h3>${req.params.course}</h3></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online` ));
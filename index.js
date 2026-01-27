require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const Course = require('./Course');
const User = require('./User');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle Uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Global Head Helper
const headHTML = (title) => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☁️</text></svg>">
    <title>${title}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>`;

// 1. HOME PAGE
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col group p-8">
                <div class="h-40 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 overflow-hidden">
                    <span class="text-7xl font-black text-indigo-200 group-hover:scale-110 transition-transform">${c.title.charAt(0)}</span>
                </div>
                <h3 class="text-xl font-black text-slate-800 mb-2">${c.title}</h3>
                <p class="text-sm text-slate-500 mb-6 line-clamp-2">${c.description}</p>
                <div class="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                    <span class="text-xl font-black text-slate-900">$${c.price}</span>
                    <a href="/register" class="bg-indigo-600 text-white text-[10px] font-black px-6 py-3 rounded-xl uppercase tracking-widest">Enroll</a>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html>${headHTML('Educa Academy')}
        <body class="bg-[#F8FAFC]">
            <nav class="bg-white border-b border-slate-100 h-20 flex items-center px-8 justify-between sticky top-0 z-50">
                <a href="/" class="text-2xl font-black italic text-indigo-600">EDUCA.</a>
                <div class="flex gap-4">
                    <a href="/login-demo" class="text-[11px] font-black uppercase tracking-widest text-slate-400 p-3">Admin Login</a>
                    <a href="/register" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">Join</a>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto px-6 py-20">
                <div class="mb-12 flex justify-between items-end">
                    <div><h2 class="text-4xl font-black text-slate-900">Available Courses</h2></div>
                    <a href="/add-sample-course" class="text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-100">Reset Demo Data</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">${courseCards || '<p>No courses found. Click Reset Demo Data.</p>'}</div>
            </main>
        </body></html>`);
    } catch (e) { res.send(e.message); }
});

// 2. DASHBOARD
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login-demo');
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const students = await User.find();
        const courses = await Course.find();
        let rows = students.map(s => `
            <tr class="border-b border-slate-50">
                <td class="p-6 font-bold">${s.fullName}<br><span class="text-[10px] text-slate-400">${s.email}</span></td>
                <td class="p-6">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-12 border rounded p-1">
                        <button class="bg-black text-white px-2 py-1 rounded text-[8px] uppercase">Set</button>
                    </form>
                </td>
                <td class="p-6 text-right">
                    <a href="/enroll-student/${s._id}" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Enroll</a>
                    <a href="/delete-student/${s._id}" class="text-red-500 ml-4 text-[10px] font-bold uppercase">Delete</a>
                </td>
            </tr>`).join('');
        res.send(`<html>${headHTML('Admin')} <body class="bg-slate-50 p-10">
            <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
                <div class="bg-slate-900 p-8 text-white flex justify-between">
                    <h1 class="font-black italic">ADMIN PANEL</h1>
                    <a href="/" class="text-xs uppercase font-bold">Exit</a>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-slate-100 text-[10px] uppercase font-black tracking-widest text-slate-400">
                        <tr><th class="p-6">Student</th><th class="p-6">Progress %</th><th class="p-6 text-right">Actions</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </body></html>`);
    } catch (e) { res.redirect('/login-demo'); }
});

// 3. STUDENT PORTAL (LOGIN)
app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send("Student not found.");
        
        // IMPORTANT: If student has no courses, we show a button to get started
        let content = student.enrolledCourses.map(c => `
            <div class="bg-white p-8 rounded-3xl shadow-lg mb-4 border border-slate-100">
                <h3 class="font-black text-xl mb-4">${c.title}</h3>
                <div class="bg-slate-100 h-2 rounded-full mb-6"><div style="width:${student.courseProgress}%" class="bg-indigo-600 h-full rounded-full"></div></div>
                <div class="flex justify-between items-center">
                    <a href="/view-lesson/${c._id}" class="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase">Study Now</a>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-slate-400 text-[10px] font-black uppercase">Certificate</a>
                </div>
            </div>`).join('');

        res.send(`<html>${headHTML('Portal')} <body class="bg-slate-50 p-10">
            <div class="max-w-xl mx-auto">
                <div class="mb-10 flex justify-between items-center">
                    <h1 class="text-2xl font-black italic">Hello, ${student.fullName.split(' ')[0]}!</h1>
                    <a href="/" class="text-xs font-bold text-slate-400 uppercase">Logout</a>
                </div>
                ${content || '<div class="text-center p-20 bg-white rounded-3xl border-2 border-dashed border-slate-200"><p class="text-slate-400 font-bold">No courses yet. Contact Admin to enroll.</p></div>'}
            </div>
        </body></html>`);
    } catch (e) { res.send(e.message); }
});

// HELPERS & AUTH
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET);
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/add-sample-course', async (req, res) => {
    await Course.deleteMany({});
    await Course.insertMany([
        { title: "Cloud Engineering", instructor: "Stephen", price: 499, description: "Professional Grade Cloud Architecture." },
        { title: "DevSecOps Mastery", instructor: "Alex", price: 599, description: "Advanced Security and Automation." }
    ]);
    res.redirect('/');
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.send("Registration Successful! <a href='/'>Go to Login</a>"); }
    catch (e) { res.send(e.message); }
});

app.get('/register', (req, res) => {
    res.send(`<html>${headHTML('Register')} <body class="bg-indigo-600 flex items-center justify-center min-h-screen">
        <form action="/register-student" method="POST" class="bg-white p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md">
            <h2 class="text-2xl font-black mb-8">Create Account</h2>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-4 mb-4 bg-slate-50 rounded-xl border-none outline-none" required>
            <input type="email" name="email" placeholder="Email" class="w-full p-4 mb-4 bg-slate-50 rounded-xl border-none outline-none" required>
            <input type="password" name="password" placeholder="Password" class="w-full p-4 mb-8 bg-slate-50 rounded-xl border-none outline-none" required>
            <button class="w-full bg-indigo-600 text-white p-5 rounded-xl font-black uppercase text-xs tracking-widest">Sign Up</button>
        </form>
    </body></html>`);
});

app.get('/enroll-student/:id', async (req, res) => {
    const course = await Course.findOne();
    if (course) await User.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledCourses: course._id } });
    res.redirect('/dashboard');
});

app.get('/delete-student/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/dashboard');
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Store-Ready LMS Online` ));
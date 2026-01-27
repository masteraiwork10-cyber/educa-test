require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const Course = require('./Course');
const User = require('./User');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Assets and Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use('/assets', express.static('assets'));

// Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- SHARED UI COMPONENTS ---
const FOOTER = `
<footer class="bg-white border-t border-slate-100 py-16 mt-auto">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
        <div><span class="text-2xl font-black italic text-indigo-600">EDUCA.</span><p class="text-[10px] text-slate-400 uppercase tracking-widest mt-4 font-bold">The Gold Standard in Cloud Education • Stephen</p></div>
        <div class="flex gap-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <a href="/dashboard" class="hover:text-indigo-600 transition-colors">Admin Dashboard</a>
            <a href="/register" class="hover:text-indigo-600 transition-colors">Registration</a>
            <p class="text-slate-300">© 2026</p>
        </div>
    </div>
</footer>`;

// --- 1. HOME PAGE ---
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const getStyles = (tag) => {
            if (tag === 'Security') return { tag: 'bg-rose-50 text-rose-600 border-rose-100', bgLetter: 'bg-rose-50 text-rose-400/30' };
            if (tag === 'Frontend') return { tag: 'bg-emerald-50 text-emerald-600 border-emerald-100', bgLetter: 'bg-emerald-50 text-emerald-400/30' };
            return { tag: 'bg-indigo-50 text-indigo-600 border-indigo-100', bgLetter: 'bg-indigo-50 text-indigo-400/30' };
        };

        const courseCards = courses.map(c => {
            const style = getStyles(c.tag || 'Backend');
            return `
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col group">
                <div class="h-48 ${style.bgLetter} flex items-center justify-center overflow-hidden relative">
                    <span class="text-8xl font-black italic select-none transform transition-transform duration-700 group-hover:scale-125 group-hover:rotate-6">${c.title.charAt(0)}</span>
                </div>
                <div class="p-8 flex-grow">
                    <div class="flex justify-between items-center mb-4">
                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${style.tag}">${c.tag || 'Backend'}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">${c.level || 'Professional'}</span>
                    </div>
                    <h3 class="text-2xl font-black text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">${c.title}</h3>
                    <p class="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-8">${c.description}</p>
                    <div class="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                        <span class="text-2xl font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="bg-indigo-600 text-white text-xs font-black px-8 py-3.5 rounded-2xl uppercase tracking-widest hover:bg-black shadow-lg">Enroll</a>
                    </div>
                </div>
            </div>`;
        }).join('');

        res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script><title>Educa Academy</title><style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; }</style></head>
        <body class="bg-[#F8FAFC] text-slate-900 flex flex-col min-h-screen">
            <nav class="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100 h-20 flex items-center justify-between px-8">
                <a href="/" class="text-2xl font-black italic text-indigo-600">EDUCA.</a>
                <div class="flex gap-4">
                    <a href="/login-demo" class="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">Admin Login</a>
                    <a href="/register" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest">Join</a>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto px-6 py-20 flex-grow">
                <div class="flex justify-between items-end mb-16 border-l-4 border-indigo-600 pl-6">
                    <div><h2 class="text-3xl font-black text-slate-900 uppercase">Available Tracks</h2></div>
                    <a href="/add-sample-course" class="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-slate-200">↻ Reset Demo</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">${courseCards || '<p class="text-center col-span-3 py-20 font-bold text-slate-300">NO COURSES FOUND. CLICK RESET DEMO.</p>'}</div>
            </main>
            ${FOOTER}
        </body></html>`);
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

// --- 2. DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login-demo');
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const students = await User.find().populate('enrolledCourses');
        const courses = await Course.find();
        let rows = students.map(s => `
            <tr class="border-b border-slate-50">
                <td class="p-6 font-bold">${s.fullName}<br><span class="text-[10px] text-slate-400 font-normal">${s.email}</span></td>
                <td class="p-6">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-16 border rounded-xl p-2 text-center font-bold">
                        <button class="bg-black text-white px-3 py-2 rounded-xl text-[8px] uppercase font-black">Set</button>
                    </form>
                </td>
                <td class="p-6 text-right flex gap-2 justify-end">
                    <a href="/download-invoice/${s._id}" class="bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase">Invoice</a>
                    <a href="/enroll-student/${s._id}" class="bg-indigo-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase">Enroll</a>
                    <a href="/delete-student/${s._id}" class="bg-rose-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase">Delete</a>
                </td>
            </tr>`).join('');
        res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-[#F8FAFC] min-h-screen flex flex-col">
            <div class="p-10 flex-grow">
                <div class="max-w-6xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
                    <div class="bg-slate-900 p-8 text-white flex justify-between">
                        <h1 class="text-xl font-black italic">ADMIN MANAGEMENT</h1>
                        <a href="/" class="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest">← Exit</a>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                            <tr><th class="p-6">Student</th><th class="p-6">Progress</th><th class="p-6 text-right">Actions</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="3" class="p-20 text-center text-slate-300 font-bold uppercase">No students in database</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
            ${FOOTER}
        </body>`);
    } catch (e) { res.clearCookie('token').redirect('/login-demo'); }
});

// --- AUTH & SETUP ---
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'dev-secret');
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/add-sample-course', async (req, res) => {
    try {
        await Course.deleteMany({}); 
        await Course.insertMany([
            { title: "Cloud Engineering with Node.js", instructor: "Stephen", price: 450, tag: "Backend", level: "Advanced", description: "Master scalable architecture." },
            { title: "Security & DevSecOps", instructor: "Alex Rivera", price: 550, tag: "Security", level: "Professional", description: "Secure your MERN apps." }
        ]);
        res.redirect('/');
    } catch (e) { res.send(e.message); }
});

// [All remaining routes: /student-login, /register, /view-lesson, /enroll-student, /delete-student, /update-progress, /download-invoice, /view-certificate should remain exactly as you had them originally]

// (I am omitting repeating the middle routes to save space, but make sure you keep your original logic for those!)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Premium LMS Engine Online` ));
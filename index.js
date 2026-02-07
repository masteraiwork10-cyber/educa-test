require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// ROOT IMPORTS
const Course = require('./Course');
const User = require('./User');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- MULTER SETUP FOR PDF UPLOADS ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/materials';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- GLOBAL UI COMPONENTS ---
const headHTML = (title) => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="/assets/favicon.png?v=1.1">
    <script src="https://cdn.tailwindcss.com"></script>
    <title>${title} | EDUCA Academy</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap'); 
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        @media (max-width: 480px) {
            .nav-container { flex-direction: column; height: auto; padding: 1rem; gap: 1rem; }
            .nav-auth-buttons { width: 100%; justify-content: center; flex-wrap: wrap; }
        }
    </style>
</head>`;

const FOOTER = `
<footer class="bg-white border-t border-slate-100 py-16 mt-auto">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
        <div class="flex items-center gap-3">
            <span class="text-2xl font-black italic text-indigo-600">EDUCA.</span>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">The Gold Standard in Cloud Education</p>
        </div>
        <div class="flex gap-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <a href="/dashboard" class="hover:text-indigo-600 transition-colors">Admin</a>
            <p>© 2026</p>
        </div>
    </div>
</footer>`;

// --- HOME PAGE (With Video) ---
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all p-8">
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">${c.tag || 'Cloud'}</span>
                <h3 class="text-2xl font-black text-slate-800 mt-4 mb-2">${c.title}</h3>
                <p class="text-sm text-slate-500 mb-8 line-clamp-2">${c.description}</p>
                <div class="flex items-center justify-between pt-6 border-t border-slate-50">
                    <span class="text-2xl font-black text-slate-900">$${c.price}</span>
                    <a href="/register" class="bg-indigo-600 text-white text-xs font-black px-8 py-3.5 rounded-2xl uppercase tracking-widest hover:bg-black">Enroll</a>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html>${headHTML('Deploy Your Future')}
        <body class="bg-[#F8FAFC] flex flex-col min-h-screen">
            <nav class="nav-container bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100 min-h-[5rem] flex items-center justify-between px-8">
                <a href="/" class="text-2xl font-black italic text-indigo-600">EDUCA.</a>
                <div class="nav-auth-buttons flex gap-4">
                    <a href="/login-demo" class="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Admin Login</a>
                    <a href="/register" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase shadow-lg">Join Now</a>
                </div>
            </nav>

            <header class="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <span class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase mb-6 inline-block">Enterprise Learning</span>
                    <h1 class="text-5xl md:text-7xl font-black mb-8 leading-tight text-slate-900">Master the <span class="text-indigo-600">Cloud</span> Stack.</h1>
                    <p class="text-slate-500 mb-12 text-lg leading-relaxed">Join the most advanced Cloud Engineering Academy. High-speed servers, expert mentors, and real-world projects.</p>
                </div>
                <div class="relative group">
                    <div class="absolute -inset-4 bg-indigo-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div class="relative aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                        <iframe class="w-full h-full" src="https://www.youtube.com/embed/ScMzIvxBSi4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-6 py-20">
                <h2 class="text-3xl font-black text-slate-900 uppercase mb-12 border-l-4 border-indigo-600 pl-6">Professional Tracks</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">${courseCards}</div>
            </main>${FOOTER}</body></html>`);
    } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN DASHBOARD (With PDF Upload) ---
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login-demo');
    try {
        const students = await User.find();
        let rows = students.map(s => `
            <tr class="border-b border-slate-50">
                <td class="p-6 font-bold text-slate-800">${s.fullName}<br><span class="text-[10px] text-slate-400">${s.email}</span></td>
                <td class="p-6">
                    <form action="/upload-pdf/${s._id}" method="POST" enctype="multipart/form-data" class="flex gap-2">
                        <input type="file" name="material" class="text-[10px] border rounded-lg p-1 w-32" required>
                        <button class="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Upload PDF</button>
                    </form>
                </td>
                <td class="p-6 text-right flex gap-2 justify-end">
                    <a href="/delete-student/${s._id}" class="bg-rose-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">Delete</a>
                </td>
            </tr>`).join('');
        res.send(`<!DOCTYPE html><html>${headHTML('Admin')}
        <body class="bg-[#F8FAFC] min-h-screen flex flex-col"><div class="p-10 flex-grow">
            <div class="max-w-6xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div class="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <h1 class="text-xl font-black uppercase italic">Admin Portal</h1>
                    <a href="/" class="bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase">Logout</a>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <tr><th class="p-6">Student</th><th class="p-6">Material Management</th><th class="p-6 text-right">Actions</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>${FOOTER}</body></html>`);
    } catch (e) { res.redirect('/login-demo'); }
});

// --- PDF UPLOAD ROUTE ---
app.post('/upload-pdf/:id', upload.single('material'), async (req, res) => {
    try {
        // Here you can save the PDF path to the Student's database record if you have a field for it
        console.log(`PDF uploaded for student ${req.params.id}: ${req.file.path}`);
        res.redirect('/dashboard?success=PDFUploaded');
    } catch (e) { res.status(500).send(e.message); }
});

// --- REST OF THE ROUTES (LOGIN, REGISTER, ETC.) ---
app.get('/register', (req, res) => {
    res.send(`<!DOCTYPE html><html>${headHTML('Join')}
    <body class="bg-indigo-600 flex items-center justify-center min-h-screen">
        <form action="/register-student" method="POST" class="bg-white p-16 rounded-[3rem] shadow-2xl w-full max-w-md text-center">
            <h2 class="text-3xl font-black mb-8">Join the Academy</h2>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-4 mb-4 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-indigo-600" required>
            <input type="email" name="email" placeholder="Email" class="w-full p-4 mb-4 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-indigo-600" required>
            <button class="w-full py-4 bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest shadow-xl">Get Started</button>
        </form>
    </body></html>`);
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.redirect('/'); } catch (e) { res.send(e.message); }
});

app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'dev-secret');
    res.cookie('token', token).redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 EDUCA Academy Live on Port ${PORT}`));
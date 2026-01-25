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

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadDir));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 1. PROFESSIONAL HOME PAGE
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="group bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-blue-500 transition-all duration-300">
                <div class="h-40 bg-slate-50 flex items-center justify-center border-b border-slate-50">
                    <span class="text-slate-200 font-black text-6xl uppercase">${c.title[0]}</span>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span class="text-[10px] font-bold tracking-widest text-slate-400 uppercase italic">Premium Course</span>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-1">${c.title}</h3>
                    <p class="text-xs text-slate-400 mb-4">Instructor: ${c.instructor}</p>
                    <p class="text-sm text-slate-500 leading-relaxed mb-6">${c.description}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span class="text-lg font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter">Enroll Now →</a>
                    </div>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><title>Educa Premium</title>
        <style> @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap'); body { font-family: 'Inter', sans-serif; } </style></head>
        <body class="bg-white text-slate-900">
            <nav class="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between border-b border-slate-50">
                <a href="/" class="text-xl font-black tracking-tighter italic">EDUCA<span class="text-blue-600">.</span></a>
                <div class="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <a href="#courses" class="hover:text-blue-600 transition">Courses</a>
                    <a href="/dashboard" class="hover:text-blue-600 transition">Admin</a>
                    <a href="/register" class="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition">Join Academy</a>
                </div>
            </nav>

            <header class="max-w-7xl mx-auto px-8 py-32 grid md:grid-cols-2 gap-20 items-center">
                <div>
                    <h1 class="text-6xl md:text-8xl font-black leading-none tracking-tighter mb-8">LEARN<br><span class="text-blue-600">BETTER.</span></h1>
                    <p class="text-slate-400 text-lg max-w-sm leading-relaxed mb-10">High-fidelity engineering courses for the modern developer.</p>
                    <form action="/student-login" method="POST" class="flex items-center border-b-2 border-slate-900 py-2 max-w-md">
                        <input type="email" name="email" placeholder="student@example.com" class="bg-transparent w-full outline-none font-medium">
                        <button class="text-xs font-black uppercase tracking-widest hover:text-blue-600">Login</button>
                    </form>
                </div>
                <div class="hidden md:block relative">
                    <div class="aspect-square bg-slate-50 rounded-full flex items-center justify-center">
                         <div class="w-2/3 h-2/3 border border-slate-100 rounded-full animate-ping absolute"></div>
                         <span class="text-slate-200 font-black text-[150px] opacity-20">LMS</span>
                    </div>
                </div>
            </header>

            <main id="courses" class="max-w-7xl mx-auto px-8 py-32 border-t border-slate-50">
                <div class="flex justify-between items-end mb-16">
                    <h2 class="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Available Courses</h2>
                    <a href="/add-sample-course" class="text-xs font-bold text-blue-600">+ Add Entry</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">${courseCards}</div>
            </main>

            <footer class="border-t border-slate-50 py-20 bg-slate-50/30">
                <div class="max-w-7xl mx-auto px-8 grid md:grid-cols-4 gap-12">
                    <div class="col-span-2">
                        <a href="/" class="text-lg font-black tracking-tighter mb-4 block italic">EDUCA.</a>
                        <p class="text-xs text-slate-400 max-w-xs leading-loose uppercase tracking-widest">A premium course hosted on Render and MongoDB. Designed for Stephen.</p>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6">Explore</h4>
                        <ul class="text-xs text-slate-400 space-y-4 font-medium uppercase tracking-tighter">
                            <li><a href="#" class="hover:text-blue-600">Cloud Engineering</a></li>
                            <li><a href="#" class="hover:text-blue-600">Node.js Mastery</a></li>
                            <li><a href="/dashboard" class="hover:text-blue-600">Admin Panel</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-6">Company</h4>
                        <ul class="text-xs text-slate-400 space-y-4 font-medium uppercase tracking-tighter">
                            <li><a href="#" class="hover:text-blue-600">Privacy Policy</a></li>
                            <li><a href="#" class="hover:text-blue-600">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div class="max-w-7xl mx-auto px-8 mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    <p>© 2026 EDUCA ACADEMY</p>
                    <p>Designed by You</p>
                </div>
            </footer>
        </body></html>`);
    } catch (err) { res.status(500).send("Home Error: " + err.message); }
});

// [All previous logic for /download-invoice, /dashboard, /student-login etc remains the same]
// Note: Updated the Sample Course below to your specific details

app.get('/add-sample-course', async (req, res) => {
    try {
        await new Course({ 
            title: "Cloud Engineering with Node.js", 
            instructor: "Stephen", 
            price: 450, 
            description: "A premium course hosted on Render and MongoDB. Expert-led backend architecture." 
        }).save();
        res.redirect('/');
    } catch (e) { res.send(e.message); }
});

// ... (Rest of system routes: /register, /enroll-student, /view-certificate)
app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;margin:0;"><div style="width:800px;height:550px;border:1px solid #f0f0f0;padding:60px;text-align:center;font-family:'Inter',sans-serif;"><h1 style="font-weight:900;letter-spacing:-2px;font-size:50px;">CERTIFICATE</h1><p style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:4px;font-weight:bold;margin-top:40px;">This confirms that</p><h2 style="font-size:32px;margin:20px 0;">${req.params.name}</h2><p style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:4px;font-weight:bold;">has mastered</p><h3 style="font-size:24px;color:#2563eb;">${req.params.course}</h3><div style="margin-top:80px;border-top:1px solid #eee;padding-top:20px;font-size:10px;color:#ccc;text-transform:uppercase;letter-spacing:2px;">Issued by EDUCA. Premium Academy</div></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Premium System Live`));
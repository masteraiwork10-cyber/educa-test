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

// DATABASE & STORAGE
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

// 1. HOME PAGE
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="group bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col">
                <div class="h-40 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white/20 text-7xl font-black italic select-none">${c.title[0]}</div>
                <div class="p-6 flex-grow">
                    <div class="flex items-center gap-2 mb-2"><span class="text-[10px] font-bold tracking-widest text-indigo-500 uppercase px-2 py-1 bg-indigo-50 rounded">Premium</span></div>
                    <h3 class="text-xl font-extrabold text-slate-800 leading-tight mb-2">${c.title}</h3>
                    <p class="text-xs text-slate-400 mb-4 font-semibold uppercase tracking-tighter">Instructor: ${c.instructor}</p>
                    <p class="text-sm text-slate-500 line-clamp-3 mb-6">${c.description}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                        <span class="text-xl font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="bg-indigo-600 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl hover:bg-black transition uppercase">Enroll</a>
                    </div>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><title>Educa Academy</title><style> @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; } </style></head>
        <body class="bg-slate-50 text-slate-900">
            <nav class="bg-white/90 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-100"><div class="max-w-7xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between"><a href="/" class="text-xl font-extrabold tracking-tighter text-indigo-600 italic">EDUCA.</a><div class="flex items-center gap-3 md:gap-6"><a href="/dashboard" class="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition">Admin</a><a href="/register" class="bg-indigo-600 text-white px-4 md:px-6 py-2.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-widest">Join</a></div></div></nav>
            <header class="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center"><div class="text-center md:text-left"><h1 class="text-3xl md:text-5xl font-extrabold leading-tight mb-6">Master the Art of <br><span class="text-indigo-600">Cloud Engineering.</span></h1><p class="text-slate-500 text-sm md:text-base max-w-sm mx-auto md:mx-0 leading-relaxed mb-10 text-balance">Premium courses hosted on Render and MongoDB. Get certified by industry veterans like Stephen.</p>
            <form action="/student-login" method="POST" class="flex items-center bg-white p-2 rounded-2xl shadow-xl border border-slate-100 max-w-md mx-auto md:mx-0"><input type="email" name="email" placeholder="Student email" class="bg-transparent w-full px-4 outline-none text-sm font-medium"><button type="submit" class="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition">Login</button></form></div><div class="hidden md:block relative h-80 bg-gradient-to-br from-indigo-100 to-white rounded-[40px] border border-slate-100 overflow-hidden"><div class="absolute inset-0 opacity-10 font-black text-8xl flex items-center justify-center pointer-events-none italic">EDUCA</div></div></header>
            <main id="courses" class="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-20"><div class="flex justify-between items-center mb-10"><h2 class="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">Top Courses</h2><a href="/add-sample-course" class="text-[10px] font-bold text-indigo-600 py-2 px-4 bg-indigo-50 rounded-lg">+ Add Demo</a></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">${courseCards}</div></main>
        </body></html>`);
    } catch (err) { res.status(500).send("Home Error: " + err.message); }
});

// 2. ADMIN DASHBOARD (Point 2 Fixed: Proper Buttons)
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.send("<h1>Unauthorized</h1><a href='/login-demo'>Click here to login as Admin</a>");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const students = await User.find().populate('enrolledCourses');
        let rows = students.map(s => `
            <tr class="border-b text-xs md:text-sm">
                <td class="p-4 font-bold text-slate-700">${s.fullName}</td>
                <td class="p-4">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-12 p-1 border rounded text-center">
                        <button class="bg-slate-800 text-white px-2 py-1 rounded text-[10px] uppercase font-bold">Set</button>
                    </form>
                </td>
                <td class="p-4">
                    <div class="flex flex-wrap gap-2 justify-center">
                        <a href="/download-invoice/${s._id}" class="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-green-200">Invoice</a>
                        <a href="/enroll-student/${s._id}" class="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-indigo-200">Enroll</a>
                        <a href="/delete-student/${s._id}" class="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-red-200">Delete</a>
                    </div>
                </td>
            </tr>`).join('');
        res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-100 p-4 md:p-8"><div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
            <div class="bg-indigo-600 p-6 text-white flex justify-between items-center"><h1 class="text-lg font-black italic">ADMIN CONTROL</h1><a href="/" class="text-xs bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold">Exit Panel</a></div>
            <div class="overflow-x-auto"><table class="w-full text-left">
                <thead class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th class="p-4">Student Name</th><th class="p-4">Progress %</th><th class="p-4 text-center">Management</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table></div>
        </div></body>`);
    } catch (e) { res.redirect('/'); }
});

// 3. STUDENT LOGIN (Point 1 Fixed: POST Route)
app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send("User not found. <a href='/register'>Register here</a>");
        
        let courseContent = student.enrolledCourses.map(c => `
            <div class="bg-white p-8 rounded-3xl mb-4 shadow-lg border border-slate-50">
                <h3 class="font-black text-slate-800 text-xl">${c.title}</h3>
                <div class="w-full bg-slate-100 h-3 rounded-full my-6 overflow-hidden">
                    <div style="width:${student.courseProgress}%" class="bg-indigo-600 h-full rounded-full transition-all duration-1000"></div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${student.courseProgress}% Complete</span>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-600 pb-1">Get Certificate</a>
                </div>
            </div>`).join('');

        res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 p-6 md:p-12"><div class="max-w-xl mx-auto">
            <h1 class="text-2xl font-black mb-8 italic">Academy Portal: ${student.fullName}</h1>
            ${courseContent || '<p class="text-slate-400">Not enrolled in any courses yet.</p>'}
            <a href="/" class="block text-center mt-12 text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Logout</a>
        </div></body>`);
    } catch (e) { res.status(500).send(e.message); }
});

// 4. REMAINING UTILITIES
app.get('/register', (req, res) => {
    res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-indigo-600 flex items-center justify-center min-h-screen p-6">
        <form action="/register-student" method="POST" class="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl w-full max-w-md">
            <h2 class="text-2xl font-black mb-1">Create Account</h2>
            <p class="text-slate-400 text-xs mb-8 uppercase font-bold tracking-widest">Join Stephen's Cloud Academy</p>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none border border-slate-100" required>
            <input type="email" name="email" placeholder="Email" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none border border-slate-100" required>
            <input type="password" name="password" placeholder="Password" class="w-full p-4 mb-8 bg-slate-50 rounded-2xl outline-none border border-slate-100" required>
            <button class="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-xs">Register</button>
            <a href="/" class="block text-center mt-6 text-slate-400 text-[10px] font-black uppercase tracking-widest">Home</a>
        </form></body>`);
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.send("Success! <a href='/'>Login</a>"); } catch (e) { res.send(e.message); }
});

app.get('/add-sample-course', async (req, res) => {
    try {
        await new Course({ title: "Cloud Engineering with Node.js", instructor: "Stephen", price: 450, description: "A premium course hosted on Render and MongoDB. High-performance architecture masterclass." }).save();
        res.redirect('/');
    } catch (e) { res.redirect('/'); }
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

app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'super-secret-key');
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/download-invoice/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('enrolledCourses');
        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=Invoice.pdf`);
        doc.fontSize(25).text('RECEIPT', { align: 'center' });
        doc.moveDown().fontSize(12).text(`Student: ${student.fullName}`);
        student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
        doc.pipe(res); doc.end();
    } catch (e) { res.send(e.message); }
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;margin:0;padding:20px;"><div style="width:100%;max-width:600px;border:5px solid #000;padding:40px;text-align:center;font-family:sans-serif;"><h1>CERTIFICATE</h1><p>Awarded to</p><h2>${req.params.name}</h2><p>For mastery in</p><h3>${req.params.course}</h3></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online` ));
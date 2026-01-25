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
            <div class="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col">
                <div class="h-40 bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white/20 text-7xl font-black italic">${c.title[0]}</div>
                <div class="p-6 flex-grow">
                    <h3 class="text-xl font-extrabold text-slate-800 leading-tight mb-2">${c.title}</h3>
                    <p class="text-xs text-slate-400 mb-4 font-bold uppercase">Instructor: ${c.instructor}</p>
                    <p class="text-sm text-slate-500 line-clamp-3 mb-6">${c.description}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                        <span class="text-xl font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="bg-indigo-600 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl uppercase">Enroll</a>
                    </div>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><title>Educa Academy</title></head>
        <body class="bg-slate-50 text-slate-900 flex flex-col min-h-screen">
            <nav class="bg-white/90 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-100"><div class="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between"><a href="/" class="text-xl font-black italic text-indigo-600">EDUCA.</a><div class="flex gap-4"><a href="/dashboard" class="text-xs font-bold text-slate-500">Admin</a><a href="/register" class="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-bold">Join</a></div></div></nav>
            <header class="max-w-7xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center flex-grow">
                <div><h1 class="text-4xl md:text-5xl font-black mb-6">Master <span class="text-indigo-600">Cloud Engineering.</span></h1><p class="text-slate-500 mb-10 text-balance">Premium courses hosted on Render. Dedicated to Stephen.</p>
                <form action="/student-login" method="POST" class="flex bg-white p-2 rounded-2xl shadow-xl border border-slate-100 max-w-md mx-auto md:mx-0"><input type="email" name="email" placeholder="Student email" class="w-full px-4 outline-none text-sm"><button class="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold">Login</button></form></div>
                <div class="hidden md:block h-64 bg-indigo-50 rounded-[40px] border border-indigo-100"></div>
            </header>
            <main class="max-w-7xl mx-auto px-5 py-10 md:py-20"><div class="grid grid-cols-1 md:grid-cols-3 gap-8">${courseCards}</div></main>
            <footer class="bg-white border-t border-slate-100 py-12 mt-20">
                <div class="max-w-7xl mx-auto px-5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div><span class="font-black italic text-indigo-600">EDUCA.</span><p class="text-[10px] text-slate-400 uppercase tracking-widest mt-2 italic">Render & MongoDB • Dedicated to Stephen</p></div>
                    <div class="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400"><a href="/dashboard" class="hover:text-indigo-600">Admin Panel</a><a href="/register" class="hover:text-indigo-600">Register</a><p>© 2026</p></div>
                </div>
            </footer>
        </body></html>`);
    } catch (err) { res.status(500).send(err.message); }
});

// 2. STUDENT LOGIN & PORTAL
app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send("User not found. <a href='/register'>Register</a>");
        let content = student.enrolledCourses.map(c => `
            <div class="bg-white p-8 rounded-3xl mb-4 shadow-lg border border-slate-50">
                <h3 class="font-black text-slate-800 text-xl">${c.title}</h3>
                <div class="w-full bg-slate-100 h-2 rounded-full my-6 overflow-hidden"><div style="width:${student.courseProgress}%" class="bg-indigo-600 h-full"></div></div>
                <div class="flex justify-between items-center">
                    <a href="/view-lesson/${c._id}" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Watch Lesson</a>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-[10px] font-bold text-indigo-600 uppercase border-b border-indigo-600">Certificate</a>
                </div>
            </div>`).join('');
        res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-xl mx-auto"><h1 class="text-2xl font-black mb-8 italic">Portal: ${student.fullName}</h1>${content || '<p class="text-slate-400">No courses.</p>'}<a href="/" class="block text-center mt-12 text-slate-400 text-xs font-bold uppercase">Logout</a></div></body>`);
    } catch (e) { res.status(500).send(e.message); }
});

// 3. LESSON VIEW (Point 1 Answer: Where students see videos)
app.get('/view-lesson/:courseId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        // We use the first video in the array or a placeholder
        const videoId = course.syllabusUrl || "dQw4w9WgXcQ"; // Dummy YouTube ID if none exists
        res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-900 text-white p-5"><div class="max-w-4xl mx-auto">
            <a href="/" class="text-xs text-slate-400 uppercase font-bold mb-8 block">← Portal</a>
            <h1 class="text-2xl font-black mb-6">${course.title}</h1>
            <div class="aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl"><iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>
            <div class="mt-8 p-6 bg-slate-800 rounded-3xl"><h3 class="font-bold mb-2">Instructor Notes</h3><p class="text-slate-400 text-sm">${course.description}</p></div>
        </div></body>`);
    } catch (e) { res.redirect('/'); }
});

// 4. ADMIN DASHBOARD (With "Add Lesson" Feature)
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.send("<h1>Unauthorized</h1><a href='/login-demo'>Login</a>");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const students = await User.find().populate('enrolledCourses');
        const courses = await Course.find();
        
        let studentRows = students.map(s => `
            <tr class="border-b text-sm"><td class="p-4 font-bold text-slate-700">${s.fullName}</td>
            <td class="p-4"><form action="/update-progress/${s._id}" method="POST" class="flex gap-2"><input type="number" name="progress" value="${s.courseProgress || 0}" class="w-12 p-1 border rounded text-center"><button class="bg-slate-800 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Set</button></form></td>
            <td class="p-4 flex gap-2"><a href="/download-invoice/${s._id}" class="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold">INV</a><a href="/enroll-student/${s._id}" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-bold">ENR</a><a href="/delete-student/${s._id}" class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-bold">DEL</a></td></tr>`).join('');

        let courseOptions = courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');

        res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-100 p-4 md:p-8"><div class="max-w-5xl mx-auto space-y-8">
            <div class="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div class="bg-indigo-600 p-6 text-white flex justify-between items-center"><h1 class="font-black italic">ADMIN: STUDENTS</h1><a href="/" class="text-xs bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold uppercase">Exit</a></div>
                <table class="w-full text-left"><tbody>${studentRows}</tbody></table>
            </div>
            <div class="bg-white p-8 rounded-3xl shadow-xl">
                <h2 class="text-xl font-black mb-6 italic text-indigo-600 uppercase">Manage Video Content</h2>
                <form action="/add-lesson-video" method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <select name="courseId" class="p-3 bg-slate-50 border rounded-xl">${courseOptions}</select>
                    <input type="text" name="videoId" placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)" class="p-3 bg-slate-50 border rounded-xl" required>
                    <button class="md:col-span-2 bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase text-xs">Update Course Video</button>
                </form>
            </div>
        </div></body>`);
    } catch (e) { res.redirect('/'); }
});

// 5. UPDATE LESSON VIDEO ROUTE
app.post('/add-lesson-video', async (req, res) => {
    try {
        await Course.findByIdAndUpdate(req.body.courseId, { syllabusUrl: req.body.videoId });
        res.redirect('/dashboard');
    } catch (e) { res.send(e.message); }
});

// ALL UTILITIES
app.get('/register', (req, res) => {
    res.send(`<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-indigo-600 flex items-center justify-center min-h-screen p-6"><form action="/register-student" method="POST" class="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md"><h2 class="text-2xl font-black mb-1">Join</h2><p class="text-slate-400 text-xs mb-8 font-bold uppercase italic">Stephen's Academy</p><input type="text" name="fullName" placeholder="Name" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" required><input type="email" name="email" placeholder="Email" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none" required><input type="password" name="password" placeholder="Pass" class="w-full p-4 mb-8 bg-slate-50 rounded-2xl outline-none" required><button class="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-xs">Create Account</button></form></body>`);
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.send("Done! <a href='/'>Login</a>"); } catch (e) { res.send(e.message); }
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
        doc.moveDown().text(`Student: ${student.fullName}`);
        student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
        doc.pipe(res); doc.end();
    } catch (e) { res.send(e.message); }
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#fff;margin:0;"><div style="width:100%;max-width:600px;border:5px solid #000;padding:40px;text-align:center;font-family:sans-serif;"><h1>CERTIFICATE</h1><p>Awarded to</p><h2>${req.params.name}</h2><p>For mastery in</p><h3>${req.params.course}</h3></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online` ));
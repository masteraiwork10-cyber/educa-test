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

// 1. VIBRANT HOME PAGE
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="group bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:-translate-y-2 transition-all duration-300">
                <div class="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span class="text-white/30 font-black text-6xl uppercase">${c.title[0]}</span>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-[10px] font-bold tracking-widest text-purple-500 uppercase">Premium Content</span>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-1">${c.title}</h3>
                    <p class="text-xs text-slate-400 mb-4">By ${c.instructor}</p>
                    <p class="text-sm text-slate-500 leading-relaxed mb-6">${c.description}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span class="text-lg font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition uppercase">Enroll</a>
                    </div>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><title>Educa Academy</title>
        <style> @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; } </style></head>
        <body class="bg-slate-50 text-slate-900">
            <nav class="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                <div class="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
                    <a href="/" class="text-xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">EDUCA.</a>
                    <div class="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest">
                        <a href="#courses" class="text-slate-500 hover:text-blue-600 transition">Courses</a>
                        <a href="/dashboard" class="text-slate-500 hover:text-blue-600 transition">Admin Panel</a>
                        <a href="/register" class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-blue-200 transition">Join Academy</a>
                    </div>
                </div>
            </nav>

            <header class="max-w-7xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <h1 class="text-4xl md:text-5xl font-extrabold leading-tight mb-6">Master the Future of <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Cloud Engineering.</span></h1>
                    <p class="text-slate-500 text-md max-w-sm leading-relaxed mb-8">High-fidelity engineering courses hosted on Render and MongoDB. Get certified by experts.</p>
                    <form action="/student-login" method="POST" class="flex items-center bg-white p-2 rounded-2xl shadow-xl border border-slate-100 max-w-md">
                        <input type="email" name="email" placeholder="Enter student email" class="bg-transparent w-full px-4 outline-none text-sm font-medium">
                        <button class="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-purple-600 transition">Portal Login</button>
                    </form>
                </div>
                <div class="hidden md:block">
                    <div class="relative w-full h-80 bg-gradient-to-br from-blue-100 to-purple-100 rounded-[40px] flex items-center justify-center">
                         <div class="absolute inset-0 bg-white/20 backdrop-blur-3xl rounded-[40px]"></div>
                         <span class="relative text-blue-600/20 font-black text-8xl">LMS</span>
                    </div>
                </div>
            </header>

            <main id="courses" class="max-w-7xl mx-auto px-8 py-20">
                <div class="flex justify-between items-center mb-12">
                    <h2 class="text-xl font-bold text-slate-800">Featured Courses</h2>
                    <a href="/add-sample-course" class="text-xs font-bold text-purple-600 py-2 px-4 bg-purple-50 rounded-lg hover:bg-purple-100">+ Add Sample Course</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">${courseCards}</div>
            </main>

            <footer class="bg-white border-t border-slate-100 py-16">
                <div class="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-12">
                    <div>
                        <a href="/" class="text-lg font-black italic mb-4 block">EDUCA.</a>
                        <p class="text-xs text-slate-400 leading-relaxed uppercase tracking-widest">Premium hosting on Render. Database by MongoDB. Created for Stephen.</p>
                    </div>
                    <div class="flex gap-20">
                        <div>
                            <h4 class="text-[10px] font-black uppercase text-slate-900 mb-4 tracking-widest">Links</h4>
                            <ul class="text-xs text-slate-500 space-y-3">
                                <li><a href="/dashboard" class="hover:text-blue-600">Admin Dashboard</a></li>
                                <li><a href="/register" class="hover:text-blue-600">Student Register</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </body></html>`);
    } catch (err) { res.status(500).send("Home Error: " + err.message); }
});

// 2. FIXED DASHBOARD ROUTE
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.send("<h1>Unauthorized</h1><a href='/login-demo'>Click here to login as Admin</a>");
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const students = await User.find().populate('enrolledCourses');
        let rows = students.map(s => `
            <tr class="border-b text-sm">
                <td class="p-4 font-bold text-slate-700">${s.fullName}</td>
                <td class="p-4">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-16 p-1 border rounded text-center">
                        <button class="bg-blue-600 text-white px-2 py-1 rounded text-xs">Set</button>
                    </form>
                </td>
                <td class="p-4 text-center">
                    <a href="/download-invoice/${s._id}" class="text-green-600 font-bold mr-2">Invoice</a>
                    <a href="/enroll-student/${s._id}" class="text-blue-600 font-bold mr-2">Enroll</a>
                    <a href="/delete-student/${s._id}" class="text-red-400">Delete</a>
                </td>
            </tr>`).join('');

        res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-100 p-8"><div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
            <div class="bg-blue-600 p-8 text-white flex justify-between items-center">
                <h1 class="text-2xl font-black italic">EDUCA ADMIN.</h1>
                <a href="/" class="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">Back to Site</a>
            </div>
            <table class="w-full">
                <thead class="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                    <tr><th class="p-4 text-left">Student</th><th class="p-4 text-left">Progress %</th><th class="p-4">Actions</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div></body>`);
    } catch (e) { res.redirect('/'); }
});

// 3. FIXED REGISTER ROUTE
app.get('/register', (req, res) => {
    res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center h-screen">
        <form action="/register-student" method="POST" class="bg-white p-10 rounded-[40px] shadow-2xl w-96">
            <h2 class="text-2xl font-black mb-2">Join the Academy</h2>
            <p class="text-slate-400 text-xs mb-8">Start your journey into Cloud Engineering.</p>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-400" required>
            <input type="email" name="email" placeholder="Email Address" class="w-full p-4 mb-3 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-400" required>
            <input type="password" name="password" placeholder="Create Password" class="w-full p-4 mb-8 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-400" required>
            <button class="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-purple-600 transition">Create Account</button>
            <a href="/" class="block text-center mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest">Back to Home</a>
        </form></body>`);
});

// 4. STUDENT LOGIN & PORTAL
app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send("User not found. <a href='/register'>Register here</a>");
        let courses = student.enrolledCourses.map(c => `
            <div class="bg-white p-8 rounded-3xl mb-4 shadow-lg border border-slate-50">
                <h3 class="font-black text-slate-800 text-xl">${c.title}</h3>
                <div class="w-full bg-slate-100 h-3 rounded-full my-6 overflow-hidden">
                    <div style="width:${student.courseProgress}%" class="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"></div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest">${student.courseProgress}% Complete</span>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-xs font-black text-blue-600 uppercase border-b-2 border-blue-600">View Certificate</a>
                </div>
            </div>`).join('');
        res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-50 p-8">
            <div class="max-w-xl mx-auto">
                <h1 class="text-3xl font-black mb-8 italic">Welcome, ${student.fullName}.</h1>
                ${courses || '<p class="text-slate-400">No courses enrolled.</p>'}
                <a href="/" class="block text-center mt-12 text-slate-400 text-xs font-bold uppercase tracking-widest">Logout</a>
            </div></body>`);
    } catch (e) { res.send(e.message); }
});

// 5. REST OF UTILITIES
app.post('/register-student', async (req, res) => {
    try {
        await new User(req.body).save();
        res.send("<h1>Registration Successful!</h1><a href='/'>Click here to login</a>");
    } catch (e) { res.send(e.message); }
});

app.get('/add-sample-course', async (req, res) => {
    try {
        await new Course({ 
            title: "Cloud Engineering with Node.js", 
            instructor: "Stephen", 
            price: 450, 
            description: "A premium course hosted on Render and MongoDB. Master high-performance backend systems." 
        }).save();
        res.redirect('/');
    } catch (e) { res.send("Error or Course already exists: " + e.message); }
});

app.get('/enroll-student/:id', async (req, res) => {
    const course = await Course.findOne();
    if (!course) return res.send("Please add a course first using the button on the home page.");
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

app.get('/download-invoice/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('enrolledCourses');
        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=Invoice.pdf`);
        doc.fontSize(25).text('EDUCA RECEIPT', { align: 'center' });
        doc.moveDown().fontSize(12).text(`Billed To: ${student.fullName}`);
        student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
        doc.pipe(res); doc.end();
    } catch (e) { res.send(e.message); }
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#fafafa;margin:0;"><div style="width:750px;border:2px solid #000;padding:60px;text-align:center;font-family:sans-serif;background:white;"><h1>CERTIFICATE OF MASTERY</h1><p>Awarded to</p><h2>${req.params.name}</h2><p>for</p><h3>${req.params.course}</h3><p style="margin-top:50px;font-size:12px;color:#aaa;">VERIFIED BY EDUCA ACADEMY</p></div></body>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online` ));
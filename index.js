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

// 5. PROFESSIONAL HOME PAGE
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        const courseCards = courses.map(c => `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition duration-300 flex flex-col">
                <div class="h-48 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">${c.title[0]}</div>
                <div class="p-6 flex-grow">
                    <div class="flex justify-between items-center mb-2">
                        <span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Bestseller</span>
                        <span class="text-slate-900 font-bold">$${c.price}</span>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">${c.title}</h3>
                    <p class="text-slate-500 text-sm mb-4 line-clamp-2">${c.description}</p>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">${c.instructor[0]}</div>
                        <span class="text-xs text-slate-600 font-medium">${c.instructor}</span>
                    </div>
                </div>
                <div class="p-6 pt-0">
                    <a href="/register" class="block w-full text-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition">Enroll Now</a>
                </div>
            </div>`).join('');

        res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><title>Educa LMS</title></head>
        <body class="bg-slate-50 font-sans text-slate-900">
            <nav class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <a href="/" class="text-2xl font-black tracking-tighter text-blue-600">EDUCA.</a>
                    <div class="flex gap-4">
                        <a href="/dashboard" class="text-sm font-bold text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg">Admin</a>
                        <a href="/register" class="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold text-sm">Get Started</a>
                    </div>
                </div>
            </nav>
            <section class="bg-white py-20"><div class="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                <div><h1 class="text-5xl md:text-7xl font-black mb-6">Master Skills That <span class="text-blue-600">Matter.</span></h1>
                <p class="text-lg text-slate-500 mb-10">Professional learning platform for industry experts.</p>
                <form action="/student-login" method="POST" class="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-md">
                    <input type="email" name="email" placeholder="student@example.com" class="bg-transparent px-4 py-2 w-full outline-none" required>
                    <button class="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold whitespace-nowrap">Portal Login</button>
                </form></div>
                <div class="hidden md:block bg-slate-100 rounded-3xl h-96 flex items-center justify-center font-black text-slate-300 text-8xl">LMS</div>
            </div></section>
            <section class="py-24 max-w-7xl mx-auto px-6"><div class="grid grid-cols-1 md:grid-cols-3 gap-8">${courseCards}</div></section>
        </body></html>`);
    } catch (err) { res.status(500).send("Home Error: " + err.message); }
});

// 6. INVOICE GENERATOR
app.get('/download-invoice/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('enrolledCourses');
        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=Invoice.pdf`);
        doc.fontSize(20).text('OFFICIAL RECEIPT', { align: 'center' });
        doc.moveDown().fontSize(12).text(`Student: ${student.fullName}`);
        student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
        doc.pipe(res); doc.end();
    } catch (e) { res.status(500).send(e.message); }
});

// 7. ADMIN DASHBOARD
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).send("Unauthorized. <a href='/login-demo'>Login</a>");
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key');
        const students = await User.find().populate('enrolledCourses');
        let rows = students.map(s => `
            <tr class="border-b text-sm">
                <td class="p-4 font-bold text-slate-700">${s.fullName}</td>
                <td class="p-4">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-16 p-1 border rounded text-center">
                        <button class="bg-slate-800 text-white px-2 py-1 rounded text-xs">Set</button>
                    </form>
                </td>
                <td class="p-4 text-center">
                    <a href="/download-invoice/${s._id}" class="text-green-600 font-bold mr-2">Invoice</a>
                    <a href="/enroll-student/${s._id}" class="text-blue-600 font-bold mr-2">Enroll</a>
                    <a href="/delete-student/${s._id}" class="text-red-400">Delete</a>
                </td>
            </tr>`).join('');
        res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-100 p-8">
            <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm overflow-hidden">
                <div class="bg-blue-600 p-8 text-white flex justify-between">
                    <h1 class="text-2xl font-black">Admin Panel</h1>
                    <div class="flex gap-2"><a href="/add-sample-course" class="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">Add Course</a><a href="/" class="bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold">Exit</a></div>
                </div>
                <div class="p-6 border-b"><form action="/upload-syllabus" method="POST" enctype="multipart/form-data" class="text-xs flex gap-4"><b>Upload Syllabus:</b> <input type="file" name="syllabus"> <button class="bg-blue-600 text-white px-2 rounded">Upload</button></form></div>
                <table class="w-full"><tbody>${rows}</tbody></table>
            </div></body>`);
    } catch (e) { res.redirect('/'); }
});

app.post('/update-progress/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress });
    res.redirect('/dashboard');
});

app.post('/upload-syllabus', upload.single('syllabus'), async (req, res) => {
    if (req.file) await Course.findOneAndUpdate({ title: "Cloud Engineering" }, { syllabusUrl: `/uploads/${req.file.filename}` }, { upsert: true });
    res.redirect('/dashboard');
});

// 8. STUDENT LOGIN & PORTAL
app.post('/student-login', async (req, res) => {
    const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
    if (!student) return res.send("User not found");
    let courses = student.enrolledCourses.map(c => `
        <div class="bg-white p-6 rounded-2xl mb-4 shadow-sm border border-slate-100">
            <h3 class="font-black text-slate-800">${c.title}</h3>
            <div class="w-full bg-slate-100 h-2 rounded-full my-4"><div style="width:${student.courseProgress}%" class="bg-blue-500 h-full rounded-full transition-all"></div></div>
            <div class="flex gap-4">
                <a href="/view-certificate/${student.fullName}/${c.title}" class="text-xs font-bold text-blue-600 underline">Certificate</a>
                ${c.syllabusUrl ? `<a href="${c.syllabusUrl}" download class="text-xs font-bold text-green-600 underline">Syllabus</a>` : ''}
            </div>
        </div>`).join('');
    res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6"><div class="max-w-md mx-auto"><h1 class="text-2xl font-black mb-6">Hello, ${student.fullName}!</h1>${courses}<a href="/" class="block text-center mt-6 text-slate-400 text-sm">Logout</a></div></body>`);
});

// 9. UTILITIES
app.get('/register', (req, res) => {
    res.send(`<head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-100 flex items-center justify-center h-screen">
        <form action="/register-student" method="POST" class="bg-white p-10 rounded-3xl shadow-xl w-96">
            <h2 class="text-2xl font-black mb-6">Create Account</h2>
            <input type="text" name="fullName" placeholder="Name" class="w-full p-3 mb-3 bg-slate-50 rounded-xl outline-none" required>
            <input type="email" name="email" placeholder="Email" class="w-full p-3 mb-3 bg-slate-50 rounded-xl outline-none" required>
            <input type="password" name="password" placeholder="Password" class="w-full p-3 mb-6 bg-slate-50 rounded-xl outline-none" required>
            <button class="w-full py-4 bg-blue-600 text-white font-bold rounded-xl">Register</button>
        </form></body>`);
});

app.post('/register-student', async (req, res) => {
    await new User(req.body).save();
    res.send("Success! <a href='/'>Login</a>");
});

app.get('/add-sample-course', async (req, res) => {
    await new Course({ title: "Cloud Engineering", instructor: "Stephen", price: 450, description: "Professional Node.js & Cloud mastery." }).save();
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
    res.send(`<body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;"><div style="width:700px;border:15px solid #1e293b;padding:50px;text-align:center;background:white;"><h1>Certificate</h1><h2>${req.params.name}</h2><h3>${req.params.course}</h3></div></body>`);
});

// 10. SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online`));
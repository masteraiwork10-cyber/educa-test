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

// Assets and Uploads Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
// This serves the 'assets' folder at the '/assets' URL path
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- GLOBAL UI COMPONENTS ---
// FIX: Added cache-busting query (?v=1.1) to ensure the favicon updates immediately
const headHTML = (title) => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="/assets/favicon.png?v=1.1">
    <link rel="shortcut icon" type="image/png" href="/assets/favicon.png?v=1.1">
    <script src="https://cdn.tailwindcss.com"></script>
    <title>${title} | EDUCA Academy</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>`;

const FOOTER = `
<footer class="bg-white border-t border-slate-100 py-16 mt-auto">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
        <div class="flex items-center gap-3">
            <img src="/assets/hero-cloud.png" class="w-8 h-8 opacity-50" alt="Cloud Icon">
            <div>
                <span class="text-2xl font-black italic text-indigo-600">EDUCA.</span>
                <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">The Gold Standard in Cloud Education • Stephen</p>
            </div>
        </div>
        <div class="flex gap-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <a href="/dashboard" class="hover:text-indigo-600 transition-colors font-bold">Admin Dashboard</a>
            <a href="/register" class="hover:text-indigo-600 transition-colors font-bold">Registration</a>
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
                    <p class="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em] mb-4">Instructor: ${c.instructor}</p>
                    <p class="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-8">${c.description}</p>
                    <div class="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                        <span class="text-2xl font-black text-slate-900">$${c.price}</span>
                        <a href="/register" class="bg-indigo-600 text-white text-xs font-black px-8 py-3.5 rounded-2xl uppercase tracking-widest hover:bg-black shadow-lg">Enroll</a>
                    </div>
                </div>
            </div>`;
        }).join('');

        res.send(`<!DOCTYPE html><html>${headHTML('Deploy Your Future')}
        <body class="bg-[#F8FAFC] flex flex-col min-h-screen">
            <nav class="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100 h-20 flex items-center justify-between px-8">
                <div class="flex items-center gap-2">
                    <img src="/assets/favicon.png" class="w-6 h-6" alt="Cloud Logo">
                    <a href="/" class="text-2xl font-black italic text-indigo-600">EDUCA.</a>
                </div>
                <div class="flex gap-4">
                    <a href="/login-demo" class="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Admin Login</a>
                    <a href="/register" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg">Join Now</a>
                </div>
            </nav>
            <header class="max-w-7xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <span class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block animate-bounce">Premium Cloud Learning</span>
                    <h1 class="text-7xl font-black mb-8 leading-[1.1] tracking-tight text-slate-900">Deploy your <span class="text-indigo-600 underline decoration-indigo-200">Future</span> Today.</h1>
                    <p class="text-slate-500 mb-12 text-lg max-w-md leading-relaxed">Master enterprise Cloud Engineering with Stephen. Industry-standard certifications hosted on Render.</p>
                    <form action="/student-login" method="POST" class="flex bg-white p-3 rounded-[2rem] shadow-2xl border border-slate-100 max-w-md">
                        <input type="email" name="email" placeholder="Enter student email" class="w-full px-6 outline-none text-sm font-medium" required>
                        <button type="submit" class="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">Login</button>
                    </form>
                </div>
                <div class="hidden md:block relative">
                    <div class="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[3rem] blur-2xl opacity-20"></div>
                    <img src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800" class="relative rounded-[3rem] shadow-2xl rotate-2">
                </div>
            </header>
            <main class="max-w-7xl mx-auto px-6 py-20">
                <div class="flex justify-between items-end mb-16 border-l-4 border-indigo-600 pl-6">
                    <div><h2 class="text-3xl font-black text-slate-900 uppercase">Available Tracks</h2></div>
                    <a href="/add-sample-course" class="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border border-slate-200">↻ Reset Demo Content</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">${courseCards}</div>
            </main>${FOOTER}</body></html>`);
    } catch (err) { res.status(500).send("Critical System Error: " + err.message); }
});

// --- REMAINING ROUTES UNCHANGED ---
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login-demo');
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const students = await User.find().populate('enrolledCourses');
        let rows = students.map(s => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td class="p-6 font-bold text-slate-800">${s.fullName}<br><span class="text-[10px] text-slate-400 font-normal tracking-tight">${s.email}</span></td>
                <td class="p-6">
                    <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
                        <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-16 border rounded-xl p-2 text-center font-bold outline-none focus:border-indigo-600">
                        <button class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 transition-colors">Set</button>
                    </form>
                </td>
                <td class="p-6 text-right flex gap-2 justify-end">
                    <a href="/download-invoice/${s._id}" class="bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100">Invoice</a>
                    <a href="/enroll-student/${s._id}" class="bg-indigo-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Enroll</a>
                    <a href="/delete-student/${s._id}" class="bg-rose-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-rose-100">Delete</a>
                </td>
            </tr>`).join('');
        res.send(`<!DOCTYPE html><html>${headHTML('Admin Management')}
        <body class="bg-[#F8FAFC] min-h-screen flex flex-col"><div class="p-10 flex-grow">
            <div class="max-w-6xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
                <div class="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div><h1 class="text-xl font-black italic uppercase tracking-widest">Admin Dashboard</h1><p class="text-[10px] text-slate-400 font-bold uppercase mt-1">LMS Control Center v1.0</p></div>
                    <a href="/" class="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">← Exit Admin</a>
                </div>
                <div class="overflow-x-auto"><table class="w-full text-left">
                    <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                        <tr><th class="p-6">Student Information</th><th class="p-6">Progress</th><th class="p-6 text-right">Actions</th></tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="3" class="p-20 text-center font-bold text-slate-300 uppercase">No students found</td></tr>'}</tbody>
                </table></div>
            </div>
        </div>${FOOTER}</body></html>`);
    } catch (e) { res.clearCookie('token').redirect('/login-demo'); }
});

app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send(`<html>${headHTML('Error')}<body class="bg-slate-50 p-20 flex flex-col items-center">
            <h1 class="text-3xl font-black mb-4">User Not Found.</h1>
            <a href="/register" class="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase">Register Here</a>
        </body></html>`);
        let content = student.enrolledCourses.map(c => `
            <div class="bg-white p-10 rounded-[2.5rem] mb-6 shadow-xl border border-slate-50 transition-all hover:scale-[1.01]">
                <h3 class="font-black text-slate-800 text-2xl mb-2">${c.title}</h3>
                <p class="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-8 italic">Academy Mastery Track</p>
                <div class="w-full bg-slate-100 h-3 rounded-full my-8 overflow-hidden"><div style="width:${student.courseProgress}%" class="bg-indigo-600 h-full transition-all duration-1000 shadow-lg shadow-indigo-200"></div></div>
                <div class="flex justify-between items-center">
                    <a href="/view-lesson/${c._id}" class="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-indigo-100">Resume Learning</a>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-[11px] font-black text-slate-400 uppercase hover:text-indigo-600">Certificate</a>
                </div>
            </div>`).join('');
        res.send(`<!DOCTYPE html><html>${headHTML('Student Portal')}
        <body class="bg-[#F8FAFC] p-6 md:p-20 flex flex-col min-h-screen"><div class="max-w-2xl mx-auto flex-grow">
            <div class="flex justify-between items-center mb-12">
                <div><h1 class="text-3xl font-black italic tracking-tighter uppercase">My Academy</h1><p class="text-sm font-medium text-slate-400 mt-1">Signed in as: ${student.fullName}</p></div>
                <a href="/" class="text-[11px] font-black uppercase text-slate-400 hover:text-rose-500">Logout</a>
            </div>
            ${content || '<div class="bg-white p-20 rounded-[2.5rem] text-center font-black text-slate-300 uppercase border-2 border-dashed">No Courses Enrolled</div>'}
        </div>${FOOTER}</body></html>`);
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/register', (req, res) => {
    res.send(`<!DOCTYPE html><html>${headHTML('Join EDUCA')}
    <body class="bg-indigo-600 flex flex-col items-center justify-center min-h-screen p-6">
        <a href="/" class="text-white/50 text-[10px] font-black uppercase tracking-widest mb-10 hover:text-white">← Back to Academy</a>
        <form action="/register-student" method="POST" class="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl w-full max-w-md">
            <h2 class="text-3xl font-black mb-2 text-slate-900 tracking-tight">Create Account.</h2>
            <p class="text-slate-400 text-[10px] mb-10 font-black uppercase tracking-widest">Premium Cloud Masterclass</p>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-5 mb-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-600" required>
            <input type="email" name="email" placeholder="Email Address" class="w-full p-5 mb-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-600" required>
            <input type="password" name="password" placeholder="Create Password" class="w-full p-5 mb-10 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-600" required>
            <button class="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-100">Create My Account</button>
        </form></body></html>`);
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.send(`<html>${headHTML('Success')}<body class="p-20 text-center font-sans"><h1>Success!</h1><a href="/" class="text-indigo-600 font-bold">Go Login</a></body></html>`); } catch (e) { res.send(e.message); }
});

app.get('/login-demo', (req, res) => {
    const token = jwt.sign({ user: "Admin" }, process.env.JWT_SECRET || 'dev-secret');
    res.cookie('token', token).redirect('/dashboard');
});

app.get('/add-sample-course', async (req, res) => {
    try {
        await Course.deleteMany({}); 
        await Course.insertMany([
          { title: "Cloud Engineering with Node.js", instructor: "Stephen", price: 450, tag: "Backend", level: "Advanced", description: "Master scalable architecture and enterprise deployment." },
          { title: "Security & DevSecOps Mastery", instructor: "Alex Rivera", price: 550, tag: "Security", level: "Professional", description: "Learn to secure MERN applications at scale." },
          { title: "Modern UI Design with Tailwind CSS", instructor: "Sarah Chen", price: 350, tag: "Frontend", level: "Intermediate", description: "Build stunning interfaces with utility-first CSS." }
        ]);
        res.redirect('/');
    } catch (e) { res.redirect('/'); }
});

app.get('/download-invoice/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('enrolledCourses');
        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=Invoice.pdf`);
        doc.fontSize(25).text('OFFICIAL RECEIPT', { align: 'center' });
        doc.moveDown().fontSize(12).text(`Billed To: ${student.fullName}`);
        student.enrolledCourses.forEach(c => doc.text(`${c.title}: $${c.price}`));
        doc.pipe(res); doc.end();
    } catch (e) { res.status(500).send(e.message); }
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

app.get('/view-lesson/:courseId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        res.send(`<!DOCTYPE html><html>${headHTML('Lesson View')}
        <body class="bg-slate-950 text-white p-5 md:p-10 flex flex-col min-h-screen">
            <div class="max-w-5xl mx-auto w-full flex-grow">
                <a href="/" class="text-[10px] uppercase font-black text-slate-500 tracking-widest">← Back to Portal</a>
                <div class="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black mt-8 shadow-2xl border border-white/10 ring-1 ring-white/10">
                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${course.syllabusUrl || 'dQw4w9WgXcQ'}" frameborder="0" allowfullscreen></iframe>
                </div>
                <h2 class="mt-8 text-2xl font-black">${course.title}</h2>
            </div></body></html>`);
    } catch (e) { res.redirect('/'); }
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<!DOCTYPE html><html>${headHTML('Certificate')}
    <body class="bg-[#F8FAFC] flex flex-col items-center justify-center min-h-screen p-6">
        <a href="/" class="mb-12 text-[11px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors font-bold">← Back to Portal</a>
        <div style="width:100%;max-width:700px;border:1px solid #E2E8F0;padding:80px;text-align:center;font-family:serif;background:white;box-shadow:0 30px 60px rgba(0,0,0,0.05);">
            <h1 class="text-5xl font-black mb-12 tracking-tighter">CERTIFICATE</h1>
            <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">This honors that</p>
            <h2 class="text-4xl font-bold mb-12 border-b-2 border-slate-100 pb-4 mx-auto w-fit">${req.params.name}</h2>
            <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">has completed the masterclass</p>
            <h3 class="text-2xl font-black text-indigo-600 tracking-tight">${req.params.course}</h3>
        </div></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Premium LMS Engine Online: http://localhost:${PORT}` ));
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

// Ensure uploads exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use('/assets', express.static('assets'));

// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Global UI Components ---
const headHTML = (title) => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☁️</text></svg>">
    <title>${title}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>`;

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

        res.send(`<!DOCTYPE html><html>${headHTML('Educa Academy')}
        <body class="bg-[#F8FAFC] flex flex-col min-h-screen">
            <nav class="bg-white border-b border-slate-100 h-20 flex items-center justify-between px-8 sticky top-0 z-50">
                <a href="/" class="text-2xl font-black italic text-indigo-600">EDUCA.</a>
                <div class="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                    <form action="/student-login" method="POST" class="flex">
                        <input type="email" name="email" placeholder="Student Email" class="px-4 py-1 text-xs outline-none font-medium" required>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Login</button>
                    </form>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto px-6 py-20 flex-grow">
                <div class="flex justify-between items-end mb-16 border-l-4 border-indigo-600 pl-6">
                    <div><h2 class="text-3xl font-black text-slate-900 uppercase">Available Tracks</h2></div>
                    <a href="/add-sample-course" class="bg-white text-indigo-600 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border border-slate-200">↻ Reset Demo</a>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">${courseCards}</div>
            </main>${FOOTER}</body></html>`);
    } catch (err) { res.status(500).send("Error: " + err.message); }
});

// --- 2. ADMIN DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login-demo');
    try {
        jwt.verify(token, process.env.JWT_SECRET);
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
        res.send(`<!DOCTYPE html><html>${headHTML('Admin Dashboard')}
        <body class="bg-[#F8FAFC] min-h-screen flex flex-col">
            <div class="p-10 flex-grow">
                <div class="max-w-6xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
                    <div class="bg-slate-900 p-8 text-white flex justify-between items-center">
                        <h1 class="text-xl font-black italic uppercase">Admin Management</h1>
                        <div class="flex gap-4">
                            <a href="/add-sample-course" class="bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Reset DB</a>
                            <a href="/" class="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-[11px] uppercase">Exit</a>
                        </div>
                    </div>
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                            <tr><th class="p-6">Student</th><th class="p-6">Progress</th><th class="p-6 text-right">Actions</th></tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="3" class="p-20 text-center font-bold text-slate-300">NO STUDENTS</td></tr>'}</tbody>
                    </table>
                </div>
            </div>${FOOTER}</body></html>`);
    } catch (e) { res.clearCookie('token').redirect('/login-demo'); }
});

// --- 3. STUDENT ACTIONS & VIEWS ---
app.post('/student-login', async (req, res) => {
    try {
        const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
        if (!student) return res.send("User not found.");
        let content = student.enrolledCourses.map(c => `
            <div class="bg-white p-10 rounded-[2.5rem] mb-6 shadow-xl border border-slate-50">
                <h3 class="font-black text-slate-800 text-2xl mb-2">${c.title}</h3>
                <div class="w-full bg-slate-100 h-3 rounded-full my-8 overflow-hidden"><div style="width:${student.courseProgress || 0}%" class="bg-indigo-600 h-full"></div></div>
                <div class="flex justify-between items-center">
                    <a href="/view-lesson/${c._id}" class="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-indigo-100">Resume</a>
                    <a href="/view-certificate/${student.fullName}/${c.title}" class="text-[11px] font-black text-slate-400 uppercase">Certificate</a>
                </div>
            </div>`).join('');
        res.send(`<!DOCTYPE html><html>${headHTML('Student Portal')}
        <body class="bg-[#F8FAFC] p-6 md:p-20 flex flex-col min-h-screen"><div class="max-w-2xl mx-auto flex-grow">
            <h1 class="text-3xl font-black italic mb-12 uppercase tracking-tighter">Student: ${student.fullName}</h1>
            ${content || '<div class="bg-white p-20 rounded-[2.5rem] text-center font-black text-slate-300 border-2 border-dashed">NO COURSES ENROLLED</div>'}
        </div>${FOOTER}</body></html>`);
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/register', (req, res) => {
    res.send(`<!DOCTYPE html><html>${headHTML('Join Academy')}
    <body class="bg-indigo-600 flex flex-col items-center justify-center min-h-screen p-6">
        <form action="/register-student" method="POST" class="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl w-full max-w-md text-center">
            <h2 class="text-3xl font-black mb-10 text-slate-900">Create Account.</h2>
            <input type="text" name="fullName" placeholder="Full Name" class="w-full p-5 mb-4 bg-slate-50 rounded-2xl border-none outline-none" required>
            <input type="email" name="email" placeholder="Email Address" class="w-full p-5 mb-4 bg-slate-50 rounded-2xl border-none outline-none" required>
            <input type="password" name="password" placeholder="Password" class="w-full p-5 mb-10 bg-slate-50 rounded-2xl border-none outline-none" required>
            <button class="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl">Join Now</button>
            <a href="/" class="block mt-6 text-[10px] font-black uppercase text-slate-400">Back to home</a>
        </form></body></html>`);
});

app.post('/register-student', async (req, res) => {
    try { await new User(req.body).save(); res.send("Success! <a href='/'>Login at Home</a>"); } catch (e) { res.status(500).send(e.message); }
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

app.get('/delete-student/:id', async (req, res) => {
    try { await User.findByIdAndDelete(req.params.id); res.redirect('/dashboard'); } catch (e) { res.status(500).send(e.message); }
});

app.get('/view-lesson/:courseId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        res.send(`<!DOCTYPE html><html>${headHTML('Lesson')}
        <body class="bg-slate-950 text-white p-5 md:p-10 flex flex-col min-h-screen">
            <div class="max-w-5xl mx-auto w-full flex-grow">
                <a href="/" class="text-[10px] uppercase font-black text-slate-500">← Back to Portal</a>
                <div class="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black mt-8 border border-white/10 shadow-2xl">
                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${course.syllabusUrl || 'dQw4w9WgXcQ'}" frameborder="0" allowfullscreen></iframe>
                </div>
                <h2 class="mt-8 text-2xl font-black">${course.title}</h2>
            </div></body></html>`);
    } catch (e) { res.redirect('/'); }
});

app.get('/view-certificate/:name/:course', (req, res) => {
    res.send(`<!DOCTYPE html><html>${headHTML('Certificate')}
    <body class="bg-[#F8FAFC] flex flex-col items-center justify-center min-h-screen p-6">
        <div style="width:100%;max-width:700px;border:1px solid #E2E8F0;padding:80px;text-align:center;font-family:serif;background:white;box-shadow:0 30px 60px rgba(0,0,0,0.05);">
            <h1 class="text-5xl font-black mb-12 tracking-tighter">CERTIFICATE</h1>
            <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">This honors that</p>
            <h2 class="text-4xl font-bold mb-12 border-b-2 border-slate-100 pb-4 mx-auto w-fit">${req.params.name}</h2>
            <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">has completed the track</p>
            <h3 class="text-2xl font-black text-indigo-600 tracking-tight">${req.params.course}</h3>
        </div></body></html>`);
});

// --- ADMIN CONTROLS ---
app.get('/login-demo', (req, res) => {
    const secret = process.env.JWT_SECRET || 'dev-fallback-only';
    const token = jwt.sign({ user: "Admin" }, secret);
    res.cookie('token', token).redirect('/dashboard');
});

app.post('/update-progress/:id', async (req, res) => {
    try { await User.findByIdAndUpdate(req.params.id, { courseProgress: req.body.progress }); res.redirect('/dashboard'); } catch (e) { res.send(e.message); }
});

app.get('/enroll-student/:id', async (req, res) => {
    try {
        const course = await Course.findOne();
        if (course) await User.findByIdAndUpdate(req.params.id, { $addToSet: { enrolledCourses: course._id } });
        res.redirect('/dashboard');
    } catch (e) { res.send(e.message); }
});

app.get('/add-sample-course', async (req, res) => {
    try {
        await Course.deleteMany({}); 
        await Course.insertMany([
          { title: "Cloud Engineering with Node.js", instructor: "Stephen", price: 450, tag: "Backend", level: "Advanced", description: "Master scalable architecture and enterprise deployment." },
          { title: "Security & DevSecOps Mastery", instructor: "Alex Rivera", price: 550, tag: "Security", level: "Professional", description: "Learn to secure MERN applications at scale." },
          { title: "UI Design with Tailwind CSS", instructor: "Sarah Chen", price: 350, tag: "Frontend", level: "Intermediate", description: "Modern design systems for the web." }
        ]);
        res.redirect('/');
    } catch (e) { res.redirect('/'); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Online: http://localhost:${PORT}` ));
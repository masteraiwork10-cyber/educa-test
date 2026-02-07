require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

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
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- EMAIL TRANSPORT (owner ko mail ke liye) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- GLOBAL UI COMPONENTS ---
const headHTML = (title) => `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="/assets/favicon.png?v=1.1">
  <link rel="shortcut icon" type="image/png" href="/assets/favicon.png?v=1.1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>${title} | EDUCA Academy</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }

    /* Custom CSS to fix button overlap on very small screens */
    @media (max-width: 480px) {
      .nav-container {
        padding-left: 1rem;
        padding-right: 1rem;
        height: auto;
        padding-top: 1rem;
        padding-bottom: 1rem;
        flex-direction: column;
        gap: 1rem;
      }
      .nav-auth-buttons {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      .nav-auth-buttons a {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        font-size: 9px;
      }
    }
  </style>
</head>`;

const FOOTER = `
<footer class="mt-auto border-t border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
  <div class="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-8">
    <div class="flex items-center gap-3">
      <img src="/assets/favicon.png" class="w-8 h-8 opacity-60" alt="Cloud Icon">
      <div>
        <span class="text-2xl font-black italic text-indigo-300">EDUCA.</span>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          SAP / IT Career Launchpad • Bengaluru
        </p>
      </div>
    </div>
    <div class="flex flex-wrap gap-6 text-[11px] font-black uppercase tracking-widest text-slate-400 justify-center">
      <a href="/dashboard" class="hover:text-indigo-300 transition-colors font-bold">Admin Dashboard</a>
      <a href="/register" class="hover:text-indigo-300 transition-colors font-bold">Registration</a>
      <p class="text-slate-500">© 2026 EDUCA Academy</p>
    </div>
  </div>
</footer>`;

// --- 1. HOME PAGE ---
app.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    const getStyles = (tag) => {
      if (tag === 'Security') return { tag: 'bg-rose-500/10 text-rose-300 border-rose-500/40', bgLetter: 'bg-rose-500/10 text-rose-500/40' };
      if (tag === 'Frontend') return { tag: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40', bgLetter: 'bg-emerald-500/10 text-emerald-500/40' };
      return { tag: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40', bgLetter: 'bg-indigo-500/10 text-indigo-500/40' };
    };

    const courseCards = courses.map(c => {
      const style = getStyles(c.tag || 'Backend');
      return `
      <div class="bg-slate-900/50 rounded-[2.1rem] shadow-xl border border-white/10 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col group">
        <div class="h-40 ${style.bgLetter} flex items-center justify-center overflow-hidden relative">
          <span class="text-7xl font-black italic select-none transform transition-transform duration-700 group-hover:scale-125 group-hover:rotate-6">${c.title.charAt(0)}</span>
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <div class="flex justify-between items-center mb-3">
            <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${style.tag}">${c.tag || 'Backend'}</span>
            <span class="text-[10px] text-slate-400 font-bold uppercase">${c.level || 'Professional'}</span>
          </div>
          <h3 class="text-xl font-black text-white leading-tight mb-1 group-hover:text-indigo-300 transition-colors">${c.title}</h3>
          <p class="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mb-3">Instructor: ${c.instructor}</p>
          <p class="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-5">${c.description}</p>
          <div class="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
            <span class="text-lg font-black text-emerald-300">₹${c.price}</span>
            <a href="/register" class="bg-indigo-500 text-white text-[11px] font-black px-5 py-2.5 rounded-2xl uppercase tracking-widest hover:bg-indigo-300 hover:text-slate-900 shadow-md">
              Enroll
            </a>
          </div>
        </div>
      </div>`;
    }).join('') || `
      <div class="col-span-full bg-slate-900/60 rounded-3xl border border-dashed border-white/30 p-10 text-center text-slate-400 text-xs font-black uppercase tracking-[0.3em]">
        No courses added yet. Use "Reset Demo Content".
      </div>`;

    // MATERIAL ACCESS CARDS
    const materialCards = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="bg-slate-900/60 border border-emerald-500/30 rounded-3xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-xl transition-all">
          <p class="text-[10px] font-black uppercase tracking-widest text-emerald-300">SAP FICO</p>
          <h3 class="text-sm font-bold text-white">Configuration Notes</h3>
          <p class="text-[11px] text-slate-300">Important IMG paths, GL, tax, AR/AP configuration summaries.</p>
          <button class="mt-2 text-[11px] font-black text-emerald-300 uppercase tracking-widest">Access</button>
        </div>
        <div class="bg-slate-900/60 border border-sky-500/30 rounded-3xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-xl transition-all">
          <p class="text-[10px] font-black uppercase tracking-widest text-sky-300">SAP FICO</p>
          <h3 class="text-sm font-bold text-white">Interview Q&A</h3>
          <p class="text-[11px] text-slate-300">Top questions on integration, tables, error handling.</p>
          <button class="mt-2 text-[11px] font-black text-sky-300 uppercase tracking-widest">Access</button>
        </div>
        <div class="bg-slate-900/60 border border-violet-500/30 rounded-3xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-xl transition-all">
          <p class="text-[10px] font-black uppercase tracking-widest text-violet-300">Finance</p>
          <h3 class="text-sm font-bold text-white">GST / TDS Basics</h3>
          <p class="text-[11px] text-slate-300">Concept notes + examples mapped with SAP postings.</p>
          <button class="mt-2 text-[11px] font-black text-violet-300 uppercase tracking-widest">Access</button>
        </div>
        <div class="bg-slate-900/60 border border-amber-500/30 rounded-3xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-xl transition-all">
          <p class="text-[10px] font-black uppercase tracking-widest text-amber-300">Career</p>
          <h3 class="text-sm font-bold text-white">Resume + Roadmap</h3>
          <p class="text-[11px] text-slate-300">Sample CV, skill roadmap for FICO, S/4HANA tips.</p>
          <button class="mt-2 text-[11px] font-black text-amber-300 uppercase tracking-widest">Access</button>
        </div>
      </div>
    `;

    const demoVideoId = process.env.DEMO_SAP_FICO_VIDEO_ID || 'GZdnF9Ad9TE';

    res.send(`<!DOCTYPE html>
<html>${headHTML('Deploy Your Future')}
<body class="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
  <!-- NAVBAR -->
  <nav class="nav-container bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 border-b border-white/10 min-h-[5rem] flex items-center justify-between px-4 md:px-8">
    <div class="flex items-center gap-2">
      <img src="/assets/favicon.png" class="w-6 h-6" alt="Cloud Logo">
      <a href="/" class="text-2xl font-black italic text-indigo-300">EDUCA.</a>
    </div>
    <div class="nav-auth-buttons flex gap-2 md:gap-4 flex-wrap">
      <a href="#enquiry" class="bg-emerald-500/10 text-emerald-300 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-emerald-400 hover:text-slate-950 transition-all">
        Course Enquiry
      </a>
      <a href="/login-demo" class="bg-slate-800 text-slate-200 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
        Admin Login
      </a>
      <a href="/register" class="bg-indigo-500 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-300 hover:text-slate-950 transition-all">
        Join Now
      </a>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <header class="max-w-7xl mx-auto px-6 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
    <div class="space-y-5">
      <span class="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
        SAP FICO • IT Training
      </span>
      <h1 class="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
        Launch your <span class="text-indigo-300 underline decoration-indigo-500/40">SAP Career</span> from Bengaluru.
      </h1>
      <p class="text-slate-300 text-sm md:text-base max-w-md leading-relaxed">
        Live & online classes for SAP FICO and IT students, designed for working professionals and freshers targeting jobs in India and abroad.
      </p>
      <div class="flex flex-col sm:flex-row gap-3">
        <a href="#demo-video" class="bg-indigo-500 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-300 hover:text-slate-950 transition-all">
          Watch Demo Class
        </a>
        <a href="#enquiry" class="bg-slate-900/60 text-indigo-200 border border-indigo-500/40 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
          Request Free Counselling
        </a>
      </div>
      <p class="text-[11px] text-slate-400 font-black uppercase tracking-[0.25em]">
        1:1 Doubt Support • Practical Scenarios • Interview Prep
      </p>
    </div>

    <div class="relative">
      <div class="absolute -inset-6 bg-gradient-to-tr from-indigo-500 via-emerald-500 to-cyan-400 rounded-[3rem] blur-3xl opacity-40"></div>
      <div class="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 bg-slate-900/60">
        <img
          src="https://images.pexels.com/photos/5905716/pexels-photo-5905716.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Student learning SAP / IT on laptop"
          class="w-full h-full object-cover">
      </div>
      <div class="absolute -bottom-5 -right-2 bg-slate-950/90 backdrop-blur-xl rounded-3xl shadow-xl px-4 py-3 flex items-center gap-3 border border-emerald-500/40">
        <div class="w-8 h-8 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs font-black">SAP</div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Batch</p>
          <p class="text-xs font-bold text-slate-100">Weekend & Weekday Slots</p>
        </div>
      </div>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="max-w-7xl mx-auto px-6 pb-16 space-y-16">

    <!-- ACCESS TO MATERIAL SECTION -->
    <section id="material" class="bg-slate-950/40 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-white uppercase">Access to Material</h2>
          <p class="text-sm text-slate-300 mt-1">Hand-picked SAP FICO and finance resources for practice and revision.</p>
        </div>
        <span class="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
          Notes • Q&A • Resume • Roadmap
        </span>
      </div>
      ${materialCards}
    </section>

    <!-- DEMO SAP FICO VIDEO SECTION -->
    <section id="demo-video" class="bg-slate-950/40 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-white uppercase">SAP FICO Demo Class</h2>
          <p class="text-sm text-slate-300 mt-1">Get a feel of the teaching style, depth, and practical coverage.</p>
        </div>
        <p class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Click to play sample session</p>
      </div>
      <div class="w-full rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-slate-900/40">
        <div class="relative" style="padding-top: 56.25%;">
          <iframe
            class="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/${demoVideoId}"
            title="SAP FICO Demo Class"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </div>
    </section>

    <!-- COURSE TRACKS / CARDS -->
    <section class="bg-slate-950/40 border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-l-4 border-indigo-500 pl-4 md:pl-6 gap-3">
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-white uppercase">Available Tracks</h2>
          <p class="text-sm text-slate-300 mt-1">Choose from cloud, security, frontend and SAP-focused programs.</p>
        </div>
        <a href="/add-sample-course" class="bg-slate-900/70 text-indigo-200 px-4 md:px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase border border-slate-500/50 hover:bg-indigo-500/20">
          ↻ Reset Demo Content
        </a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
        ${courseCards}
      </div>
    </section>

    <!-- COURSE ENQUIRY / DEMO REQUEST FORM -->
    <section id="enquiry" class="bg-slate-950/60 border border-emerald-500/30 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
      <div class="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-white uppercase">Course Enquiry / Demo</h2>
          <p class="text-sm text-slate-300 mt-1 max-w-md">
            Share your details and get a WhatsApp callback with batch details, fees and demo class schedule.
          </p>
        </div>
        <div class="flex items-start gap-3 text-xs text-slate-300">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-black">✓</span>
          <p>Instant WhatsApp ping to trainer + optional email notification when you submit this form.</p>
        </div>
      </div>
      <form action="/enquiry" method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" name="name" placeholder="Full Name" class="w-full p-4 bg-slate-900/70 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-sm text-white" required>
        <input type="tel" name="phone" placeholder="WhatsApp Number" class="w-full p-4 bg-slate-900/70 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-sm text-white" required>
        <input type="email" name="email" placeholder="Email Address" class="w-full p-4 bg-slate-900/70 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-sm text-white">
        <select name="course" class="w-full p-4 bg-slate-900/70 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-sm text-white">
          <option value="SAP FICO">SAP FICO</option>
          <option value="Cloud Engineering with Node.js">Cloud Engineering with Node.js</option>
          <option value="Security & DevSecOps Mastery">Security & DevSecOps Mastery</option>
          <option value="Modern UI Design with Tailwind CSS">Modern UI Design with Tailwind CSS</option>
          <option value="Other / Not Sure">Other / Not Sure</option>
        </select>
        <textarea name="message" rows="3" placeholder="Your query / preferred timings / experience details" class="md:col-span-2 w-full p-4 bg-slate-900/70 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-sm text-white"></textarea>
        <div class="md:col-span-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mt-2">
          <button type="submit" class="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-300 transition-all">
            Submit & Ping on WhatsApp
          </button>
          <a href="https://wa.me/${process.env.OWNER_WHATSAPP || '919741144608'}?text=Hi%20I%20want%20SAP%20FICO%20course%20details"
             target="_blank"
             class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            Or chat directly on WhatsApp →
          </a>
        </div>
      </form>
    </section>
  </main>

  ${FOOTER}
</body>
</html>`);
  } catch (err) {
    res.status(500).send("Critical System Error: " + err.message);
  }
});

// ENQUIRY FORM HANDLER (WhatsApp + Email)
app.post('/enquiry', async (req, res) => {
  try {
    const { name, phone, email, course, message } = req.body;

    const ownerNumber = process.env.OWNER_WHATSAPP || '919741144608';
    const baseText =
      `New%20course%20enquiry` +
      `%0AName:%20${encodeURIComponent(name)}` +
      `%0AWhatsApp:%20${encodeURIComponent(phone)}` +
      `%0AEmail:%20${encodeURIComponent(email || '')}` +
      `%0ACourse:%20${encodeURIComponent(course)}` +
      `%0AMessage:%20${encodeURIComponent(message || '')}`;

    const waLink = `https://wa.me/${ownerNumber}?text=${baseText}`; // [web:41][web:69]

// Email to owner (optional – works only if SMTP correct)
    if (process.env.OWNER_EMAIL && process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: `"EDUCA Enquiry" <${process.env.SMTP_USER}>`,
          to: process.env.OWNER_EMAIL,
          subject: `New Course Enquiry - ${course || 'Course'}`,
          text: `New enquiry:\n\nName: ${name}\nWhatsApp: ${phone}\nEmail: ${email}\nCourse: ${course}\nMessage:\n${message || ''}`
        });
      } catch (mailErr) {
        console.error('Email send failed:', mailErr.message);
      }
    }

    res.redirect(waLink);
  } catch (e) {
    res.status(500).send('Unable to submit enquiry. Please WhatsApp directly.');
  }
});

// --- ADMIN DASHBOARD ---
app.get('/dashboard', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login-demo');
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const students = await User.find().populate('enrolledCourses');
    let rows = students.map(s => `
      <tr class="border-b border-slate-800 hover:bg-slate-900 transition-colors">
        <td class="p-6 font-bold text-slate-100">
          ${s.fullName}
          <br>
          <span class="text-[10px] text-slate-400 font-normal tracking-tight">${s.email}</span>
        </td>
        <td class="p-6">
          <form action="/update-progress/${s._id}" method="POST" class="flex gap-2">
            <input type="number" name="progress" value="${s.courseProgress || 0}" class="w-16 border border-slate-600 bg-slate-900 rounded-xl p-2 text-center font-bold text-white outline-none focus:border-indigo-400">
            <button class="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-400 hover:text-slate-900 transition-colors">
              Set
            </button>
          </form>
        </td>
        <td class="p-6 text-right flex gap-2 justify-end flex-wrap">
          <a href="/download-invoice/${s._id}" class="bg-emerald-500 text-slate-950 px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-700/40">Invoice</a>
          <a href="/enroll-student/${s._id}" class="bg-indigo-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-700/40">Enroll</a>
          <a href="/delete-student/${s._id}" class="bg-rose-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-rose-700/40">Delete</a>
        </td>
      </tr>`).join('');
    res.send(`<!DOCTYPE html><html>${headHTML('Admin Management')}
    <body class="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div class="p-4 md:p-10 flex-grow">
        <div class="max-w-6xl mx-auto bg-slate-950/70 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
          <div class="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10">
            <div>
              <h1 class="text-xl font-black italic uppercase tracking-widest">Admin Dashboard</h1>
              <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">LMS Control Center v1.0</p>
            </div>
            <a href="/" class="bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-400 hover:text-slate-950 transition-all">
              ← Exit Admin
            </a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10">
                <tr>
                  <th class="p-6">Student Information</th>
                  <th class="p-6">Progress</th>
                  <th class="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="3" class="p-20 text-center font-bold text-slate-600 uppercase">No students found</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ${FOOTER}
    </body></html>`);
  } catch (e) {
    res.clearCookie('token').redirect('/login-demo');
  }
});

// STUDENT LOGIN
app.post('/student-login', async (req, res) => {
  try {
    const student = await User.findOne({ email: req.body.email }).populate('enrolledCourses');
    if (!student) return res.send(`<html>${headHTML('Error')}<body class="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-20 flex flex-col items-center">
      <h1 class="text-3xl font-black mb-4">User Not Found.</h1>
      <a href="/register" class="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase">Register Here</a>
    </body></html>`);
    let content = student.enrolledCourses.map(c => `
      <div class="bg-slate-950/70 p-6 md:p-10 rounded-[2.5rem] mb-6 shadow-xl border border-white/10 transition-all hover:scale-[1.01]">
        <h3 class="font-black text-white text-2xl mb-2">${c.title}</h3>
        <p class="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-8 italic">Academy Mastery Track</p>
        <div class="w-full bg-slate-800 h-3 rounded-full my-8 overflow-hidden">
          <div style="width:${student.courseProgress}%" class="bg-indigo-400 h-full transition-all duration-1000 shadow-lg shadow-indigo-900/50"></div>
        </div>
        <div class="flex justify-between items-center gap-4 flex-wrap">
          <a href="/view-lesson/${c._id}" class="bg-indigo-500 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-indigo-900/60">Resume Learning</a>
          <a href="/view-certificate/${student.fullName}/${c.title}" class="text-[11px] font-black text-slate-300 uppercase hover:text-indigo-300">Certificate</a>
        </div>
      </div>`).join('');
    res.send(`<!DOCTYPE html><html>${headHTML('Student Portal')}
    <body class="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-20 flex flex-col min-h-screen">
      <div class="max-w-2xl mx-auto flex-grow w-full">
        <div class="flex justify-between items-center mb-12">
          <div>
            <h1 class="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">My Academy</h1>
            <p class="text-xs md:text-sm font-medium text-slate-400 mt-1">Signed in as: ${student.fullName}</p>
          </div>
          <a href="/" class="text-[11px] font-black uppercase text-slate-400 hover:text-rose-400">Logout</a>
        </div>
        ${content || '<div class="bg-slate-950/70 p-20 rounded-[2.5rem] text-center font-black text-slate-500 uppercase border-2 border-dashed border-slate-700">No Courses Enrolled</div>'}
      </div>
      ${FOOTER}
    </body></html>`);
  } catch (e) { res.status(500).send(e.message); }
});

// REGISTER PAGE
app.get('/register', (req, res) => {
  res.send(`<!DOCTYPE html><html>${headHTML('Join EDUCA')}
  <body class="bg-gradient-to-b from-indigo-900 via-slate-950 to-slate-950 flex flex-col items-center justify-center min-h-screen p-6 text-white">
    <a href="/" class="text-white/50 text-[10px] font-black uppercase tracking-widest mb-10 hover:text-white">← Back to Academy</a>
    <form action="/register-student" method="POST" class="bg-slate-950/80 border border-white/10 p-10 md:p-16 rounded-[3rem] shadow-2xl w-full max-w-md">
      <h2 class="text-3xl font-black mb-2 text-white tracking-tight">Create Account.</h2>
      <p class="text-slate-400 text-[10px] mb-10 font-black uppercase tracking-widest">Premium SAP & Cloud Masterclass</p>
      <input type="text" name="fullName" placeholder="Full Name" class="w-full p-5 mb-4 bg-slate-900 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-white" required>
      <input type="email" name="email" placeholder="Email Address" class="w-full p-5 mb-4 bg-slate-900 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-white" required>
      <input type="password" name="password" placeholder="Create Password" class="w-full p-5 mb-10 bg-slate-900 rounded-2xl border border-slate-600 outline-none focus:border-indigo-400 text-white" required>
      <button class="w-full py-5 bg-indigo-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-900/70 hover:bg-indigo-300 hover:text-slate-950">
        Create My Account
      </button>
    </form>
  </body></html>`);
});

// HELPER ROUTES
app.post('/register-student', async (req, res) => {
  try {
    await new User(req.body).save();
    res.send(`<html>${headHTML('Success')}<body class="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-20 text-center font-sans"><h1 class="text-3xl font-black mb-4">Success!</h1><a href="/" class="text-indigo-300 font-bold">Go Login</a></body></html>`);
  } catch (e) {
    res.send(e.message);
  }
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
          <iframe class="w-full h-full" src="https://www.youtube.com/embed/${course.syllabusUrl || 'GZdnF9Ad9TE'}" frameborder="0" allowfullscreen></iframe>
        </div>
        <h2 class="mt-8 text-2xl font-black">${course.title}</h2>
      </div>
    </body></html>`);
  } catch (e) { res.redirect('/'); }
});

app.get('/view-certificate/:name/:course', (req, res) => {
  res.send(`<!DOCTYPE html><html>${headHTML('Certificate')}
  <body class="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center min-h-screen p-6 text-white">
    <a href="/" class="mb-12 text-[11px] font-black uppercase text-slate-400 hover:text-indigo-300 transition-colors font-bold">← Back to Portal</a>
    <div style="width:100%;max-width:700px;border:1px solid #E2E8F0;padding:40px;text-align:center;font-family:serif;background:white;box-shadow:0 30px 60px rgba(0,0,0,0.3);">
      <h1 class="text-4xl md:text-5xl font-black mb-12 tracking-tighter text-slate-900">CERTIFICATE</h1>
      <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">This honors that</p>
      <h2 class="text-3xl md:text-4xl font-bold mb-12 border-b-2 border-slate-100 pb-4 mx-auto w-fit text-slate-900">${req.params.name}</h2>
      <p class="italic text-slate-400 mb-12 text-sm uppercase tracking-widest">has completed the masterclass</p>
      <h3 class="text-2xl font-black text-indigo-600 tracking-tight">${req.params.course}</h3>
      <div class="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center px-10">
        <div class="text-left">
          <p class="text-[9px] font-black uppercase text-slate-400">Date Issued</p>
          <p class="text-sm font-bold text-slate-800">Feb 2026</p>
        </div>
        <div class="text-right">
          <p class="text-[9px] font-black uppercase text-slate-400">ID No.</p>
          <p class="text-sm font-bold text-slate-800">EDUCA-7782</p>
        </div>
      </div>
    </div>
  </body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 EDUCA Academy Live on Port ${PORT}`));

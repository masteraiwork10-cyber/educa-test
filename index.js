// ... (Keep all your existing requires, middleware, and database connections from V8)

// 5. PROFESSIONAL HOME PAGE (Hero, Cards, Header, Footer)
app.get('/', async (req, res) => {
    try {
        const courses = await Course.find(); // Fetch real courses from your DB

        const courseCards = courses.map(c => `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition duration-300 flex flex-col">
                <div class="h-48 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                    ${c.title[0]}
                </div>
                <div class="p-6 flex-grow">
                    <div class="flex justify-between items-center mb-2">
                        <span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Bestseller</span>
                        <span class="text-slate-900 font-bold">$${c.price}</span>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">${c.title}</h3>
                    <p class="text-slate-500 text-sm mb-4 line-clamp-2">${c.description}</p>
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">${c.instructor[0]}</div>
                        <span class="text-xs text-slate-600 font-medium">${c.instructor}</span>
                    </div>
                </div>
                <div class="p-6 pt-0">
                    <a href="/register" class="block w-full text-center py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition">Enroll Now</a>
                </div>
            </div>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <title>Educa | Premium Learning</title>
            </head>
            <body class="bg-slate-50 font-sans text-slate-900">

                <nav class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div class="flex items-center gap-8">
                            <a href="/" class="text-2xl font-black tracking-tighter text-blue-600">EDUCA.</a>
                            <div class="hidden md:flex gap-6 text-sm font-bold text-slate-500">
                                <a href="#" class="hover:text-blue-600 transition">Explore</a>
                                <a href="/portfolio/Stephen" class="hover:text-blue-600 transition">Instructors</a>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <a href="/dashboard" class="text-sm font-bold text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg transition">Admin</a>
                            <a href="/register" class="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:shadow-lg hover:shadow-blue-200 transition">Get Started</a>
                        </div>
                    </div>
                </nav>

                <section class="relative bg-white py-20 overflow-hidden">
                    <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                        <div class="relative z-10">
                            <span class="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full">Future of Learning</span>
                            <h1 class="text-5xl md:text-7xl font-black leading-tight mb-6 text-slate-900">
                                Master Skills That <span class="text-blue-600">Matter.</span>
                            </h1>
                            <p class="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
                                Join over 5,000 students learning from top industry experts. Get certified, get noticed, and build the career you've always wanted.
                            </p>
                            <div class="flex flex-col sm:flex-row gap-4">
                                <form action="/student-login" method="POST" class="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full max-w-md">
                                    <input type="email" name="email" placeholder="student@example.com" class="bg-transparent px-4 py-2 w-full outline-none text-sm" required>
                                    <button class="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition whitespace-nowrap">Portal Login</button>
                                </form>
                            </div>
                        </div>
                        <div class="relative hidden md:block">
                            <div class="absolute -top-20 -right-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
                            <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700"></div>
                            <div class="relative bg-slate-100 rounded-3xl h-[500px] border border-slate-200 flex items-center justify-center overflow-hidden">
                                 <span class="text-slate-300 font-black text-9xl">LMS</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="py-24 max-w-7xl mx-auto px-6">
                    <div class="flex justify-between items-end mb-12">
                        <div>
                            <h2 class="text-3xl font-black text-slate-900 mb-2">Featured Courses</h2>
                            <p class="text-slate-500">Handpicked projects for your professional growth.</p>
                        </div>
                        <a href="/add-sample-course" class="text-blue-600 font-bold hover:underline">Add New Course +</a>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        ${courseCards || '<p class="text-slate-400">Loading courses...</p>'}
                    </div>
                </section>

                <footer class="bg-slate-900 text-white pt-20 pb-10">
                    <div class="max-w-7xl mx-auto px-6">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                            <div class="col-span-2 md:col-span-1">
                                <a href="/" class="text-2xl font-black tracking-tighter text-white mb-6 block">EDUCA.</a>
                                <p class="text-slate-400 text-sm leading-relaxed">Empowering the next generation of engineers through project-based learning and expert mentorship.</p>
                            </div>
                            <div>
                                <h4 class="font-bold mb-6 text-sm uppercase tracking-widest">Platform</h4>
                                <ul class="text-slate-400 space-y-4 text-sm font-medium">
                                    <li><a href="#" class="hover:text-white transition">Browse Courses</a></li>
                                    <li><a href="/dashboard" class="hover:text-white transition">Admin Panel</a></li>
                                    <li><a href="/register" class="hover:text-white transition">Registration</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-bold mb-6 text-sm uppercase tracking-widest">Support</h4>
                                <ul class="text-slate-400 space-y-4 text-sm font-medium">
                                    <li><a href="#" class="hover:text-white transition">Help Center</a></li>
                                    <li><a href="#" class="hover:text-white transition">Privacy Policy</a></li>
                                    <li><a href="#" class="hover:text-white transition">Terms of Service</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-bold mb-6 text-sm uppercase tracking-widest">Connect</h4>
                                <div class="flex gap-4">
                                    <div class="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition cursor-pointer">In</div>
                                    <div class="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition cursor-pointer">Tw</div>
                                </div>
                            </div>
                        </div>
                        <div class="border-t border-slate-800 pt-10 text-center text-slate-500 text-xs">
                            <p>© 2026 Educa LMS. Built for Professional Growth.</p>
                        </div>
                    </div>
                </footer>

            </body>
            </html>
        `);
    } catch (err) { res.status(500).send("Home Error: " + err.message); }
});

// ... (Keep the rest of your routes from V8)
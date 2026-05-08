import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; 
import rateLimit from 'express-rate-limit'; 
import { getStudentProfile, getStudentHistory } from './database/queries';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-super-secret-key";
const BOT_TOKEN = process.env.TELEGRAM_TOKEN || ""; 

app.use(cookieParser());

// 🛑 RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "<h1 style='text-align:center; margin-top:50px; font-family:monospace; background:black; color:#22c55e;'>🛑 exception: Walao eh, too many requests! Chill out and try again later.</h1>"
});
app.use(limiter);

// 🔐 AUTH VERIFICATION
function verifyTelegramAuth(data: any): boolean {
    const { hash, ...userData } = data;
    if (!hash || !BOT_TOKEN) return false;

    const dataCheckString = Object.keys(userData)
        .sort()
        .map(key => `${key}=${userData[key]}`)
        .join('\n');

    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return hmac === hash;
}

// 🛡️ XSS PREVENTION
function sanitizeHTML(str: string | number): string {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] as string)
    );
}

// 🏠 LANDING PAGE (Hacker/Singlish Theme)
app.get('/', (req, res) => {
    if (req.cookies.kiasu_session) return res.redirect('/portal');

    res.send(`
    <!DOCTYPE html>
    <html lang="en" class="dark text-white bg-black">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>~/kiasu_code/login</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="flex items-center justify-center h-screen font-mono antialiased bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
        <div class="bg-gray-900/80 p-8 rounded-xl border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] text-center max-w-sm w-full mx-4 relative overflow-hidden">
            
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-purple-600"></div>
            
            <div class="text-left text-xs text-green-400 mb-6 opacity-70">
                <p>> initializing kiasu_auth.sh...</p>
                <p>> connection: steady lah</p>
            </div>

            <h1 class="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-500 tracking-tighter">
                sudo login
            </h1>
            <p class="text-gray-400 text-xs mb-8 leading-relaxed">
                Deploy your grades securely. No passwords, just Telegram. Don't say bojio.
            </p>
            
            <div class="flex justify-center telegram-login-container">
                <script async src="https://telegram.org/js/telegram-widget.js?22" 
                    data-telegram-login="KiasuCodeBot" 
                    data-size="large" 
                    data-radius="5"
                    data-auth-url="/auth/telegram/callback" 
                    data-request-access="write"></script>
            </div>
            
            <p class="mt-8 text-[10px] text-green-500 uppercase tracking-widest font-bold">
                > System Status: Shiok
            </p>
        </div>
    </body>
    </html>
    `);
});

// 📡 TELEGRAM CALLBACK
app.get('/auth/telegram/callback', (req, res) => {
    const isValid = verifyTelegramAuth(req.query);
    if (!isValid) return res.status(403).send("<h1 style='font-family:monospace; background:black; color:red; padding:20px;'>> ERROR 403: Kena blocked. Invalid Auth Signature.</h1>");

    res.cookie('kiasu_session', req.query.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 
    });
    res.redirect('/portal');
});

// 🔐 MAGIC LINK ROUTE
app.get('/auth/:token', (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, JWT_SECRET) as { userId: number };
        res.cookie('kiasu_session', decoded.userId, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 
        });
        res.redirect('/portal');
    } catch (error) {
        res.status(401).send(`
        <!DOCTYPE html>
        <html lang="en" class="dark text-white bg-black">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Exception: Token_Mati</title>
            <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💀</text></svg>">
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="flex items-center justify-center h-screen font-mono antialiased">
            <div class="bg-gray-900 p-8 rounded-xl border border-red-500/50 shadow-2xl max-w-md w-full mx-4 text-center">
                <div class="text-6xl mb-4">💀</div>
                <h1 class="text-2xl font-bold mb-4 text-red-400">Exception: Token_Mati</h1>
                <div class="bg-black p-4 rounded text-xs text-left mb-6 border border-gray-800">
                    <p class="text-green-400">> verifying_jwt_signature...</p>
                    <p class="text-red-500 mt-1">> ERROR 401: Token has expired.</p>
                    <p class="text-gray-400 mt-1">> throw new AlamakError('Walao eh, too slow lah!');</p>
                </div>
                <p class="text-gray-300 mb-6 text-sm">Aiyah! Your Magic Link expired already. We only keep it alive for 1 hour for PDPA.</p>
                <a href="/" class="block w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded border border-gray-700 transition-colors text-sm">
                    cd ~/login_page
                </a>
            </div>
        </body>
        </html>
        `);
    }
});

// 🚪 LOGOUT ROUTE
app.get('/logout', (req, res) => {
    res.clearCookie('kiasu_session');
    res.redirect('/'); 
});

// 🛡️ SECURE PORTAL ROUTE (Singlish + Coding Theme)
app.get('/portal', async (req, res, next) => {
    const userId = req.cookies.kiasu_session;
    if (!userId) return res.redirect('/');

    try {
        const profile = await getStudentProfile(userId);
        const history = await getStudentHistory(userId);

        if (!profile) return res.status(404).send("<h1 style='font-family:monospace; color:red; background:black; padding:20px;'>> ERROR 404: Who are you? Go Telegram type /start first lah!</h1>");

        const cgpa = Number(profile.totalGPA).toFixed(2);
        
        let tableRows = '';
        if (history && history.length > 0) {
            history.forEach(mod => {
                tableRows += `
                <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors text-sm">
                    <td class="py-3"><span class="bg-black px-2 py-1 rounded text-xs text-green-400 border border-green-900">${sanitizeHTML(mod.moduleCode)}</span></td>
                    <td class="py-3 text-gray-300">${sanitizeHTML(mod.moduleName)}</td>
                    <td class="py-3 text-gray-500 text-xs text-center">${sanitizeHTML(mod.academicYear)} ${sanitizeHTML(mod.semester)}</td>
                    <td class="py-3 text-gray-400 text-center">${sanitizeHTML(mod.creditValue)}</td>
                    <td class="py-3 text-center font-bold text-purple-400">${sanitizeHTML(mod.grade)}</td>
                </tr>`;
            });
        } else {
            tableRows = `<tr><td colspan="5" class="py-8 text-center text-gray-500 text-xs">> 0 rows returned. Walao, go Telegram /commit first!</td></tr>`;
        }

        res.send(`
        <!DOCTYPE html>
        <html lang="en" class="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>~/kiasu_code/dashboard</title>
            <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: { extend: { colors: { terminal: '#0f172a', panel: '#1e293b' } } }
                }
            </script>
        </head>
        <body class="bg-terminal text-gray-300 font-mono antialiased min-h-screen selection:bg-green-500/30 selection:text-green-200">
            
            <nav class="bg-panel border-b border-gray-800 p-4 sticky top-0 z-50">
                <div class="max-w-6xl mx-auto flex justify-between items-center">
                    <div class="text-lg font-bold flex items-center gap-2 text-white tracking-tighter">
                        <span class="text-green-400">></span> ./kiasu_portal.sh
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="bg-black px-3 py-1 rounded border border-gray-700 text-xs text-gray-400">
                            root@<span class="text-purple-400">${profile.username}</span>
                        </span>
                        <a href="/logout" class="text-xs text-gray-500 hover:text-red-400 transition-colors uppercase font-bold">
                            exit()
                        </a>
                    </div>
                </div>
            </nav>

            <main class="max-w-6xl mx-auto p-6 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div class="md:col-span-1 space-y-6">
                    <div class="bg-panel p-6 rounded-lg border border-gray-800 shadow-xl relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <h2 class="text-gray-500 text-xs uppercase font-bold mb-4 flex items-center gap-2">
                            <span class="text-green-400">~</span> cat current_gpa.txt
                        </h2>
                        <div class="text-5xl font-black text-white tracking-tighter mb-2">${cgpa} <span class="text-base text-gray-600 font-normal">/ Max</span></div>
                        <div class="text-[10px] text-green-400 uppercase tracking-widest font-bold">
                            > Pipeline: Steady & Safe
                        </div>
                    </div>

                    <div class="bg-panel p-6 rounded-lg border border-gray-800 shadow-xl opacity-60 grayscale hover:grayscale-0 transition-all">
                        <h2 class="text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
                            <span class="text-purple-400">~</span> sudo commit_module
                        </h2>
                        <p class="text-xs text-gray-500 mb-4 leading-relaxed">> Error: Web forms are still compiling. Phase 3 coming soon lah!</p>
                        <button disabled class="w-full bg-black border border-gray-700 text-gray-600 font-bold py-2 px-4 rounded text-xs cursor-not-allowed uppercase tracking-wider">
                            Push to DB (Locked)
                        </button>
                    </div>
                </div>

                <div class="md:col-span-2">
                    <div class="bg-panel p-6 rounded-lg border border-gray-800 shadow-xl h-full">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-gray-300 text-sm font-bold flex items-center gap-2">
                                <span class="text-green-400">~</span> git log --grades
                            </h2>
                            <span class="text-[10px] text-gray-500 uppercase tracking-wider border border-gray-700 px-2 py-1 rounded bg-black">
                                Branch: Master
                            </span>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="border-b-2 border-gray-800 text-gray-500 text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th class="pb-3 font-semibold">Mod_Code</th>
                                        <th class="pb-3 font-semibold">Mod_Name</th>
                                        <th class="pb-3 font-semibold text-center">Timeline</th>
                                        <th class="pb-3 font-semibold text-center">Credits</th>
                                        <th class="pb-3 font-semibold text-center">Output</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </body>
        </html>`);
    } catch (error) {
        next(error); 
    }
});

// 🛑 404 GLOBAL HANDLER
app.use((req, res, next) => {
    res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en" class="dark text-white bg-black">
    <head>
        <title>404 | Page Kena Kidnap</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🕵️‍♂️</text></svg>">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="flex items-center justify-center h-screen font-mono">
        <div class="text-center p-8 border border-yellow-500/50 rounded-xl bg-gray-900 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <div class="text-6xl mb-4">🕵️‍♂️</div>
            <h1 class="text-2xl text-yellow-400 font-bold mb-4">> ERROR 404: Route_Not_Found</h1>
            <p class="text-gray-400 mb-6 text-sm">Walao eh, where you trying to go? This URL doesn't exist.</p>
            <a href="/" class="inline-block bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-700 transition-colors text-sm">
                cd ~/home
            </a>
        </div>
    </body></html>
    `);
});

// 🔥 500 GLOBAL HANDLER
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("🔥 CRITICAL SERVER ERROR:", err);
    res.status(500).send(`
    <!DOCTYPE html>
    <html lang="en" class="dark text-white bg-black">
    <head>
        <title>500 | Server Mati</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔥</text></svg>">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="flex items-center justify-center h-screen font-mono">
        <div class="text-center p-8 border border-red-600 rounded-xl bg-gray-900 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
            <div class="text-6xl mb-4">🔥</div>
            <h1 class="text-2xl text-red-500 font-bold mb-4">> ERROR 500: Server_Mati</h1>
            <p class="text-gray-400 mb-6 text-sm">GGWP. Something exploded in the backend. The database might be sleeping.</p>
            <a href="/" class="inline-block bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-700 transition-colors text-sm">
                systemctl restart
            </a>
        </div>
    </body></html>
    `);
});

export function startWebServer() {
    app.listen(PORT as number, '0.0.0.0', () => {
        console.log(`🌐 Web server listening on port ${PORT}`);
    });
}
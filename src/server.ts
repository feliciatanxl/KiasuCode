import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; 
import { getStudentProfile, getStudentHistory } from './database/queries';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-super-secret-key";
const BOT_TOKEN = process.env.TELEGRAM_TOKEN || ""; 

app.use(cookieParser());

/**
 * Security Helper: Verify Telegram Login Data
 */
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

// 🏠 LANDING PAGE
app.get('/', (req, res) => {
    if (req.cookies.kiasu_session) return res.redirect('/portal');

    res.send(`
    <!DOCTYPE html>
    <html lang="en" class="dark text-white bg-[#111827]">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KiasuCode | Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="flex items-center justify-center h-screen font-sans antialiased">
        <div class="bg-[#1F2937] p-8 rounded-2xl border border-gray-800 shadow-2xl text-center max-w-sm w-full mx-4">
            <div class="text-6xl mb-6">🚀</div>
            <h1 class="text-3xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">KiasuCode</h1>
            <p class="text-gray-400 text-sm mb-10">Deploy your grades from any device. Secure, synced, and password-less.</p>
            
            <div class="flex justify-center bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                <script async src="https://telegram.org/js/telegram-widget.js?22" 
                    data-telegram-login="KiasuCodeBot" 
                    data-size="large" 
                    data-radius="10"
                    data-auth-url="/auth/telegram/callback" 
                    data-request-access="write"></script>
            </div>
            
            <p class="mt-8 text-[10px] text-gray-600 uppercase tracking-widest font-bold tracking-tighter">
                🔒 Verified Auth Pipeline Active
            </p>
        </div>
    </body>
    </html>
    `);
});

// 📡 TELEGRAM CALLBACK
app.get('/auth/telegram/callback', (req, res) => {
    const isValid = verifyTelegramAuth(req.query);
    if (!isValid) return res.status(403).send("Security Verification Failed");

    res.cookie('kiasu_session', req.query.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 
    });
    res.redirect('/portal');
});

// MAGIC LINK ROUTE
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
        // 🎨 SINGLISH + CODING THEMED ERROR PAGE
        res.status(401).send(`
        <!DOCTYPE html>
        <html lang="en" class="dark text-white bg-[#111827]">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KiasuCode | 401 Token Mati</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="flex items-center justify-center h-screen font-sans antialiased">
            <div class="bg-[#1F2937] p-8 rounded-2xl border border-red-500/50 shadow-2xl max-w-md w-full mx-4 relative overflow-hidden text-center">
                
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
                
                <div class="text-6xl mb-4">💀</div>
                <h1 class="text-2xl font-bold mb-4 text-red-400 font-mono tracking-tight">Exception: Token_Mati</h1>
                
                <div class="bg-black/80 p-4 rounded-lg font-mono text-xs text-left mb-6 border border-gray-700 shadow-inner">
                    <p class="text-green-400">> verifying_jwt_signature...</p>
                    <p class="text-red-500 mt-1">> ERROR 401: Token has expired.</p>
                    <p class="text-gray-400 mt-1">> throw new AlamakError('Walao eh, too slow lah!');</p>
                </div>

                <p class="text-gray-300 mb-6 text-sm leading-relaxed">
                    Aiyah! Your Magic Link expired already. For security (PDPA very strict one ok!), we only keep the token alive for 1 hour.
                </p>

                <a href="/" class="inline-block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors font-mono text-sm">
                    cd ~/login_page
                </a>
                
                <p class="mt-5 text-xs text-gray-500">
                    Need a fresh link? Go back to Telegram and spam <code class="text-brand bg-gray-800 px-1 rounded text-purple-400">/dashboard</code>.
                </p>
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

// 🛡️ SECURE PORTAL ROUTE
app.get('/portal', async (req, res) => {
    const userId = req.cookies.kiasu_session;
    if (!userId) return res.redirect('/');

    try {
        const profile = await getStudentProfile(userId);
        const history = await getStudentHistory(userId);

        if (!profile) return res.status(404).send("Profile Not Found");

        const cgpa = Number(profile.totalGPA).toFixed(2);
        
        let tableRows = '';
        if (history && history.length > 0) {
            history.forEach(mod => {
                tableRows += `
                <tr class="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td class="py-4"><span class="bg-gray-800 px-2 py-1 rounded font-mono text-xs text-purple-400">${mod.moduleCode}</span></td>
                    <td class="py-4 text-gray-300">${mod.moduleName}</td>
                    <td class="py-4 text-gray-400 text-xs">${mod.academicYear} ${mod.semester}</td>
                    <td class="py-4 text-gray-400 text-center">${mod.creditValue}</td>
                    <td class="py-4 text-center font-bold text-white">${mod.grade}</td>
                </tr>`;
            });
        } else {
            tableRows = `<tr><td colspan="5" class="py-4 text-center text-gray-500 italic">No modules found.</td></tr>`;
        }

        res.send(`
        <!DOCTYPE html>
        <html lang="en" class="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${profile.username}'s Portal</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: { extend: { colors: { brand: '#8B5CF6', darkbg: '#111827', cardbg: '#1F2937' } } }
                }
            </script>
        </head>
        <body class="bg-darkbg text-white font-sans antialiased">
            <nav class="bg-cardbg border-b border-gray-800 p-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
                <div class="max-w-6xl mx-auto flex justify-between items-center">
                    <div class="text-xl font-bold flex items-center gap-2">
                        🚀 <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand to-pink-500">KiasuCode Portal</span>
                    </div>
                    <div class="flex items-center gap-6">
                        <span class="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300 font-medium">
                            ${profile.username}
                        </span>
                        <a href="/logout" class="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest font-black flex items-center gap-1">
                            Logout 🚪
                        </a>
                    </div>
                </div>
            </nav>

            <main class="max-w-6xl mx-auto p-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-1 space-y-6">
                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg">
                        <h2 class="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Global CGPA</h2>
                        <div class="text-5xl font-black text-white">${cgpa} <span class="text-lg text-gray-500 font-normal">/ Max</span></div>
                    </div>

                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg opacity-50">
                        <h2 class="text-lg font-bold mb-4 flex items-center gap-2">📝 Record New Module</h2>
                        <p class="text-xs text-gray-400 italic mb-4">Web commits coming soon in Phase 3!</p>
                        <button disabled class="w-full bg-gray-700 text-gray-400 font-bold py-2 px-4 rounded-lg cursor-not-allowed">
                            Commit to Database
                        </button>
                    </div>
                </div>

                <div class="md:col-span-2">
                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg">
                        <h2 class="text-lg font-bold mb-4">📂 Full Repository History</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead class="border-b border-gray-700 text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th class="pb-3 font-medium">Code</th>
                                        <th class="pb-3 font-medium">Name</th>
                                        <th class="pb-3 font-medium text-center">Term</th>
                                        <th class="pb-3 font-medium text-center">CR</th>
                                        <th class="pb-3 font-medium text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm">
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
        res.status(500).send("Database Error");
    }
});

export function startWebServer() {
    app.listen(PORT as number, '0.0.0.0', () => {
        console.log(`🌐 Web server listening on port ${PORT}`);
    });
}
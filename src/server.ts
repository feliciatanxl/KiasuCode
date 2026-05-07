import express from 'express';
import cookieParser from 'cookie-parser'; // <-- Make sure this is installed!
import jwt from 'jsonwebtoken';           // <-- Make sure this is installed!
import { getStudentProfile, getStudentHistory } from './database/queries';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-super-secret-key";

// Enable Express to read cookies from the browser
app.use(cookieParser());

// 🔐 AUTHENTICATION ROUTE (Handles the Magic Link from Telegram)
app.get('/auth/:token', (req, res) => {
    try {
        // Verify the token hasn't been tampered with and hasn't expired
        const decoded = jwt.verify(req.params.token, JWT_SECRET) as { userId: number };
        
        // Give the browser an encrypted HTTP-only cookie valid for 24 hours
        res.cookie('kiasu_session', decoded.userId, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (Railway)
            maxAge: 24 * 60 * 60 * 1000 // 1 Day
        });

        // Redirect them to the secure portal
        res.redirect('/portal');
    } catch (error) {
        console.error("JWT Verification Failed:", error);
        res.status(401).send(`
            <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h1>⛔ Link Expired or Invalid.</h1>
                <p>For your security, magic links expire after 1 hour.</p>
                <p>Please open the KiasuCode Telegram Bot and click "Secure Web Login" again.</p>
            </div>
        `);
    }
});

// 🛡️ PROTECTED PORTAL ROUTE (No User ID in the URL!)
app.get('/portal', async (req, res) => {
    // 1. Check if the user has the secure session cookie
    const userId = req.cookies.kiasu_session;

    if (!userId) {
        return res.status(401).send(`
            <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                <h1>⛔ Access Denied.</h1>
                <p>You are not logged in. Please log in via the KiasuCode Telegram Bot first.</p>
            </div>
        `);
    }

    try {
        // 2. Fetch real data using the securely verified User ID
        const profile = await getStudentProfile(userId);
        const history = await getStudentHistory(userId);

        if (!profile) {
            return res.status(404).send(`<h1 style="font-family:sans-serif; text-align:center; margin-top:50px;">⚠️ Profile Not Found. Type /start in Telegram first!</h1>`);
        }

        const cgpa = Number(profile.totalGPA).toFixed(2);
        
        // Generate the real table rows dynamically
        let tableRows = '';
        if (history && history.length > 0) {
            history.forEach(mod => {
                tableRows += `
                <tr class="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td class="py-4"><span class="bg-gray-800 px-2 py-1 rounded font-mono text-xs text-brand">${mod.moduleCode}</span></td>
                    <td class="py-4 text-gray-300">${mod.moduleName}</td>
                    <td class="py-4 text-gray-400">${mod.academicYear} ${mod.semester}</td>
                    <td class="py-4 text-gray-400 text-center">${mod.creditValue}</td>
                    <td class="py-4 text-center font-bold text-white">${mod.grade}</td>
                </tr>
                `;
            });
        } else {
            tableRows = `<tr><td colspan="5" class="py-4 text-center text-gray-500">No modules found in the repository. Run /commit in Telegram!</td></tr>`;
        }

        // Inject into the Dashboard UI
        const html = `
        <!DOCTYPE html>
        <html lang="en" class="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KiasuCode | ${profile.username}'s Portal</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: { extend: { colors: { brand: '#8B5CF6', darkbg: '#111827', cardbg: '#1F2937' } } }
                }
            </script>
        </head>
        <body class="bg-darkbg text-white font-sans antialiased">
            
            <nav class="bg-cardbg border-b border-gray-800 p-4">
                <div class="max-w-6xl mx-auto flex justify-between items-center">
                    <div class="text-xl font-bold flex items-center gap-2">
                        🚀 <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand to-pink-500">KiasuCode Portal</span>
                    </div>
                    <div>
                        <span class="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300">User: ${profile.username}</span>
                    </div>
                </div>
            </nav>

            <main class="max-w-6xl mx-auto p-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div class="md:col-span-1 space-y-6">
                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg">
                        <h2 class="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-2">Global CGPA</h2>
                        <div class="text-5xl font-black text-white">${cgpa} <span class="text-lg text-gray-500 font-normal">/ Max</span></div>
                        <div class="mt-4 text-sm text-brand flex items-center gap-1">
                            Live Sync Active 🔄
                        </div>
                    </div>

                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg opacity-50">
                        <h2 class="text-lg font-bold mb-4 flex items-center gap-2">📝 Record New Module</h2>
                        <p class="text-sm text-gray-400 italic mb-4">Web commits coming soon in Phase 3!</p>
                        <button disabled class="w-full bg-gray-700 text-gray-400 font-bold py-2 px-4 rounded-lg cursor-not-allowed">
                            Commit to Database
                        </button>
                    </div>
                </div>

                <div class="md:col-span-2">
                    <div class="bg-cardbg p-6 rounded-xl border border-gray-800 shadow-lg h-full">
                        <h2 class="text-lg font-bold mb-4 flex items-center gap-2">📂 Full Repository History</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left">
                                <thead>
                                    <tr class="border-b border-gray-700 text-gray-400 text-sm">
                                        <th class="pb-3 font-medium">Code</th>
                                        <th class="pb-3 font-medium">Name</th>
                                        <th class="pb-3 font-medium">Term</th>
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
        </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error("Web routing error:", error);
        res.status(500).send("Database Error");
    }
});

export function startWebServer() {
    app.listen(PORT as number, '0.0.0.0', () => {
        console.log(`🌐 Web server listening on port ${PORT}`);
    });
}
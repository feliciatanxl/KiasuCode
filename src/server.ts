import express from 'express';
import { getDatabase } from './database/connection';

const app = express();
// Railway will provide a PORT environment variable, otherwise use 3000 locally
const PORT = process.env.PORT || 3000;

// A simple API route to test your web server
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>🚀 KiasuCode Enterprise Web</h1>
            <p>Status: <strong>STABLE</strong> ✅</p>
            <p>The Telegram bot and Web Server are running together!</p>
        </div>
    `);
});

// A route that could eventually fetch a specific user's transcript!
app.get('/transcript/:userId', async (req, res) => {
    const userId = req.params.userId;
    // You can query your DB here and return real data later!
    res.json({ message: `Fetching transcript for Telegram User ID: ${userId}` });
});

export function startWebServer() {
    app.listen(PORT, () => {
        console.log(`🌐 Web server listening on port ${PORT}`);
    });
}
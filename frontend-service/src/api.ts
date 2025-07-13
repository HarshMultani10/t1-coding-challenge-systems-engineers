import cors from 'cors';
import express from 'express';
import { getOpenPosition } from './open-position';
import { getPnls } from './pnl';

export const app = express();

// Configure CORS for Server-Sent Events
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control']
}));

app.get('/health', (_req, res) => {
    res.json({ status: 'OK' });
});

// Regular JSON endpoint for PnL data (for polling)
app.get('/api/pnl', async (req, res) => {
    try {
        const pnls = await getPnls();
        console.log(`Sending ${pnls.length} PnL records via JSON endpoint at ${new Date().toISOString()}`);
        res.json(pnls);
    } catch (error) {
        console.error('Error fetching PnL data:', error);
        res.status(500).json({ error: 'Failed to fetch PnL data' });
    }
});

function toStreamMessage(data: any) {
    return `data: ${JSON.stringify(data)}\n\n`;
}

app.get('/open-position', (req, res) => {
    // Set headers for the streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Function to send the open position periodically
    const sendOpenPosition = () => {
        const openPosition = getOpenPosition();
        res.write(toStreamMessage(openPosition.toFixed(1)));
    };

    // Send the initial position immediately
    sendOpenPosition();

    // Send the position every second
    const intervalId = setInterval(sendOpenPosition, 1000);

    // Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
});

app.get('/pnl', (req, res) => {
    console.log('PnL stream connection established');
    
    // Set headers for the streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Function to send the pnl periodically
    const sendPnl = async () => {
        try {
            const pnls = await getPnls();
            console.log(`Sending ${pnls.length} PnL records at ${new Date().toISOString()}`);
            res.write(toStreamMessage(pnls));
        } catch (error) {
            console.error('Error sending PnL data:', error);
        }
    };

    // Send the initial data immediately
    sendPnl();

    // Send the pnl every 10 seconds
    const intervalId = setInterval(sendPnl, 10000);
    console.log('PnL stream interval started (10 seconds)');

    // Cleanup on client disconnect
    req.on('close', () => {
        console.log('PnL stream connection closed');
        clearInterval(intervalId);
        res.end();
    });
});

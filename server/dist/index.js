import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
// Parse env
const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? '0.0.0.0';
const rawOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5178').split(',');
const ALLOWED_ORIGINS = rawOrigins.map(o => o.trim());
const app = express();
// CORS for REST
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin))
            return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST']
    }
});
io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});
server.listen(PORT, HOST, () => {
    console.log(`API listening on http://${HOST}:${PORT}`);
    console.log(`CORS allowed: ${ALLOWED_ORIGINS.join(', ')}`);
});
//# sourceMappingURL=index.js.map
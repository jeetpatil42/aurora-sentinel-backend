"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const sos_routes_1 = __importDefault(require("./routes/sos.routes"));
const presentation_routes_1 = __importDefault(require("./routes/presentation.routes"));
const risk_zones_routes_1 = __importDefault(require("./routes/risk-zones.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const beacon_routes_1 = __importDefault(require("./routes/beacon.routes"));
const handlers_1 = require("./sockets/handlers");
dotenv_1.default.config();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';
const uploadDir = process.env.UPLOAD_DIR || './uploads';
function isAllowedOrigin(origin) {
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
        return true;
    }
    return false;
}
const corsOrigin = (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
};
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: corsOrigin,
        credentials: true,
    },
});
const PORT = Number(process.env.PORT || 3001);
const resolvedUploadDir = path_1.default.resolve(uploadDir);
fs_1.default.mkdirSync(resolvedUploadDir, { recursive: true });
app.set('trust proxy', 1);
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(resolvedUploadDir));
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/sos', sos_routes_1.default);
app.use('/api/beacon', beacon_routes_1.default);
app.use('/api/presentation', presentation_routes_1.default);
app.use('/api/risk-zones', risk_zones_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
(0, handlers_1.setupSocketHandlers)(io);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora Sentinel Backend running on port ${PORT}`);
    console.log('WebSocket server ready');
    console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
    console.log(`Uploads directory: ${resolvedUploadDir}`);
});
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../services/auth");
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = (() => {
            if (!authHeader)
                return null;
            const trimmed = authHeader.trim();
            if (!trimmed)
                return null;
            const parts = trimmed.split(/\s+/);
            if (parts.length === 1)
                return parts[0];
            if (/^Bearer$/i.test(parts[0]) && parts[1])
                return parts[1];
            return parts[parts.length - 1];
        })();
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const payload = (0, jwt_1.verifyAccessToken)(token);
        // Verify user still exists
        const user = await (0, auth_1.getUserById)(payload.userId);
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        if (user.role === 'security' && !user.security_approved) {
            res.status(403).json({ error: 'Security account pending admin approval' });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            security_approved: user.security_approved,
        };
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map
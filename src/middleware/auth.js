// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.headers['authorization'];
    
    if (!token) {
        // Allow unauthenticated for demo/testing
        req.user = { 
            id: 1, 
            role: 'admin', 
            name: 'Pengguna Demo',
            tenant_id: 'default'
        };
        req.tenant_id = 'default';
        return next();
    }

    try {
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'secret_key_enterprise_toko_2026');
        
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            tenant_id: decoded.tenant_id
        };
        req.tenant_id = decoded.tenant_id;
        
        next();
    } catch(error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token telah kadaluarsa',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Token tidak valid',
                code: 'INVALID_TOKEN'
            });
        }

        res.status(401).json({ 
            error: 'Tidak terotorisasi',
            code: 'UNAUTHORIZED'
        });
    }
};
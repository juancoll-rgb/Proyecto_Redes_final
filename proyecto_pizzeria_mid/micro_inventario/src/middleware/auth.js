const userService = require('../services/userService');

/**
 * Middleware para verificar que el usuario sea administrador
 * Acepta autenticación por email (header) o por token JWT (Authorization header)
 */
async function requireAdmin(req, res, next) {
    try {
        let user = null;

        // Método 1: Verificar por email en header
        const userEmail = req.headers['x-user-email'];
        if (userEmail) {
            user = await userService.verifyAdminByEmail(userEmail);
        } else {
            // Método 2: Verificar por token JWT
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                user = await userService.verifyAdminByToken(token);
            }
        }

        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requiere rol de administrador.',
                error: 'INSUFFICIENT_PRIVILEGES'
            });
        }

        // Agregar información del usuario al request
        req.user = user;
        next();

    } catch (error) {
        console.error('Error en middleware de autenticación:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Error interno de autenticación',
            error: 'AUTH_SERVICE_ERROR'
        });
    }
}

/**
 * Middleware opcional para verificar usuario (no requiere admin)
 * Útil para rutas que necesitan identificar al usuario pero no requieren admin
 */
async function requireUser(req, res, next) {
    try {
        let user = null;

        // Verificar por email en header
        const userEmail = req.headers['x-user-email'];
        if (userEmail) {
            const userData = await userService.verifyAdminByEmail(userEmail);
            if (userData) {
                user = userData;
            }
        } else {
            // Verificar por token JWT
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                user = await userService.verifyToken(token);
            }
        }

        // Agregar información del usuario al request (puede ser null)
        req.user = user;
        next();

    } catch (error) {
        console.error('Error en middleware de usuario:', error.message);
        
        // En este caso, continuamos sin usuario (no es crítico)
        req.user = null;
        next();
    }
}

/**
 * Middleware para verificar que el servicio de usuarios esté disponible
 */
async function checkUserServiceHealth(req, res, next) {
    try {
        // Intentar una verificación simple
        await userService.verifyAdminByEmail('test@test.com');
        next();
    } catch (error) {
        if (error.message.includes('No se puede conectar') || 
            error.message.includes('Timeout')) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de usuarios no disponible',
                error: 'USER_SERVICE_UNAVAILABLE'
            });
        }
        // Si es otro error (como 404), el servicio está funcionando
        next();
    }
}

module.exports = {
    requireAdmin,
    requireUser,
    checkUserServiceHealth
};

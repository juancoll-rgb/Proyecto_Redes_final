const axios = require('axios');

const USUARIOS_URL = process.env.USUARIOS_URL || 'http://localhost:3000/usuarios';

/**
 * Middleware para verificar que el usuario sea un cajero
 * Valida el email del usuario contra el microservicio de usuarios
 */
async function requireCajero(req, res, next) {
    try {
        // Obtener el email del header x-user-email
        const userEmail = req.headers['x-user-email'];
        
        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: 'Se requiere header x-user-email para autenticación'
            });
        }

        // Consultar al microservicio de usuarios
        const response = await axios.get(
            `${USUARIOS_URL}/correo/${encodeURIComponent(userEmail)}`,
            { 
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const user = response.data;
        
        // Verificar que el usuario existe y es cajero
        if (!user || user.rol !== 'Cajero') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Se requiere rol de cajero.'
            });
        }

        // Agregar información del usuario al request
        req.user = {
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            tipo_usuario: user.rol.toLowerCase() // Para compatibilidad con el código existente
        };

        next();

    } catch (error) {
        console.error('Error en middleware de autenticación:', error.message);
        
        if (error.response) {
            // El microservicio de usuarios respondió con un error
            if (error.response.status === 404) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Error del servicio de usuarios'
            });
        } else if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Servicio de usuarios no disponible'
            });
        } else if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                success: false,
                error: 'Timeout al conectar con el servicio de usuarios'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Error interno de autenticación'
        });
    }
}

/**
 * Middleware opcional para verificar usuario (no requiere cajero específicamente)
 * Útil para rutas que necesitan identificar al usuario pero no requieren cajero
 */
async function requireUser(req, res, next) {
    try {
        const userEmail = req.headers['x-user-email'];
        
        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: 'Se requiere header x-user-email para autenticación'
            });
        }

        const response = await axios.get(
            `${USUARIOS_URL}/correo/${encodeURIComponent(userEmail)}`,
            { 
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const user = response.data;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Agregar información del usuario al request
        req.user = {
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            tipo_usuario: user.rol.toLowerCase()
        };

        next();

    } catch (error) {
        console.error('Error en middleware de usuario:', error.message);
        
        if (error.response && error.response.status === 404) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Error de autenticación'
        });
    }
}

module.exports = {
    requireCajero,
    requireUser
};


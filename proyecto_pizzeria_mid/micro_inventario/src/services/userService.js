const axios = require('axios');

class UserService {
    constructor() {
        this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
        this.timeout = 5000; // 5 segundos timeout
    }

    /**
     * Verifica si un usuario es administrador por su email
     * @param {string} email - Email del usuario
     * @returns {Promise<Object>} - Información del usuario si es admin, null si no
     */
    async verifyAdminByEmail(email) {
        try {
            const response = await axios.get(
                `${this.userServiceUrl}/usuarios/correo/${encodeURIComponent(email)}`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.rol === 'Admin') {
                return {
                    id: response.data.id,
                    nombre: response.data.nombre,
                    email: response.data.email,
                    rol: response.data.rol,
                    estado: response.data.estado
                };
            }

            return null;
        } catch (error) {
            console.error('Error verificando usuario administrador:', error.message);
            
            if (error.response) {
                // El microservicio respondió con un error
                if (error.response.status === 404) {
                    return null; // Usuario no encontrado
                }
                throw new Error(`Error del servicio de usuarios: ${error.response.status}`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('No se puede conectar con el servicio de usuarios');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Timeout al conectar con el servicio de usuarios');
            }
            
            throw new Error('Error interno al verificar usuario');
        }
    }

    /**
     * Verifica un token JWT con el microservicio de usuarios
     * @param {string} token - Token JWT
     * @returns {Promise<Object>} - Información del usuario si el token es válido
     */
    async verifyToken(token) {
        try {
            const response = await axios.get(
                `${this.userServiceUrl}/usuarios/perfil`,
                {
                    timeout: this.timeout,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.user) {
                return response.data.user;
            }

            return null;
        } catch (error) {
            console.error('Error verificando token:', error.message);
            
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                    return null; // Token inválido o expirado
                }
                throw new Error(`Error del servicio de usuarios: ${error.response.status}`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('No se puede conectar con el servicio de usuarios');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Timeout al conectar con el servicio de usuarios');
            }
            
            throw new Error('Error interno al verificar token');
        }
    }

    /**
     * Verifica si un usuario es administrador usando token JWT
     * @param {string} token - Token JWT
     * @returns {Promise<Object>} - Información del usuario si es admin, null si no
     */
    async verifyAdminByToken(token) {
        try {
            const user = await this.verifyToken(token);
            
            if (user && user.rol === 'Admin') {
                return user;
            }

            return null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new UserService();

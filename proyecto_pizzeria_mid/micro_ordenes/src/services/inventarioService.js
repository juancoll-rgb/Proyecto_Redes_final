const axios = require('axios');

const INVENTARIO_URL = process.env.INVENTARIO_URL || 'http://localhost:3001/api';

class InventarioService {
    constructor() {
        this.inventarioUrl = INVENTARIO_URL;
        this.timeout = 5000; // 5 segundos timeout
    }

    /**
     * Obtener todas las recetas disponibles
     * @returns {Promise<Array>} - Lista de recetas
     */
    async getRecetas() {
        try {
            const response = await axios.get(
                `${this.inventarioUrl}/recetas`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data || response.data || [];
        } catch (error) {
            console.error('Error obteniendo recetas:', error.message);
            throw new Error('No se pudieron obtener las recetas del inventario');
        }
    }

    /**
     * Obtener una receta específica por ID
     * @param {number} recetaId - ID de la receta
     * @returns {Promise<Object>} - Datos de la receta
     */
    async getRecetaById(recetaId) {
        try {
            const response = await axios.get(
                `${this.inventarioUrl}/recetas/${recetaId}`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data || response.data;
        } catch (error) {
            console.error('Error obteniendo receta por ID:', error.message);
            if (error.response && error.response.status === 404) {
                throw new Error('Receta no encontrada');
            }
            throw new Error('No se pudo obtener la receta del inventario');
        }
    }

    /**
     * Obtener el costo de una receta
     * @param {number} recetaId - ID de la receta
     * @returns {Promise<Object>} - Datos de costo de la receta
     */
    async getCostoReceta(recetaId) {
        try {
            const response = await axios.get(
                `${this.inventarioUrl}/recetas/${recetaId}/costo`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data || response.data;
        } catch (error) {
            console.error('Error obteniendo costo de receta:', error.message);
            if (error.response && error.response.status === 404) {
                throw new Error('Receta no encontrada');
            }
            throw new Error('No se pudo obtener el costo de la receta');
        }
    }

    /**
     * Verificar si hay stock suficiente para una receta
     * @param {number} recetaId - ID de la receta
     * @param {number} cantidad - Cantidad a verificar
     * @returns {Promise<Object>} - Resultado de la verificación
     */
    async verificarStockSuficiente(recetaId, cantidad = 1) {
        try {
            const response = await axios.post(
                `${this.inventarioUrl}/validaciones/stock-suficiente`,
                {
                    receta_id: recetaId,
                    cantidad: cantidad
                },
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data || response.data;
        } catch (error) {
            console.error('Error verificando stock:', error.message);
            throw new Error('No se pudo verificar el stock disponible');
        }
    }

    /**
     * Preparar una receta (descontar stock)
     * @param {number} recetaId - ID de la receta
     * @param {number} cantidad - Cantidad a preparar
     * @param {string} referencia - Referencia de la orden
     * @param {string} usuario - Usuario que prepara
     * @returns {Promise<Object>} - Resultado de la preparación
     */
    async prepararReceta(recetaId, cantidad, referencia, usuario) {
        try {
            const response = await axios.post(
                `${this.inventarioUrl}/validaciones/preparar-receta`,
                {
                    receta_id: recetaId,
                    cantidad: cantidad,
                    referencia: referencia
                },
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': usuario
                    }
                }
            );

            return response.data.data || response.data;
        } catch (error) {
            console.error('Error preparando receta:', error.message);
            if (error.response && error.response.status === 400) {
                throw new Error('Stock insuficiente para preparar la receta');
            }
            throw new Error('No se pudo preparar la receta');
        }
    }

    /**
     * Obtener recetas disponibles (con stock suficiente)
     * @returns {Promise<Object>} - Recetas disponibles y no disponibles
     */
    async getRecetasDisponibles() {
        try {
            const response = await axios.get(
                `${this.inventarioUrl}/validaciones/recetas-disponibles`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data || response.data;
        } catch (error) {
            console.error('Error obteniendo recetas disponibles:', error.message);
            throw new Error('No se pudieron obtener las recetas disponibles');
        }
    }

    /**
     * Buscar receta por nombre
     * @param {string} nombre - Nombre de la receta
     * @returns {Promise<Object>} - Receta encontrada
     */
    async buscarRecetaPorNombre(nombre) {
        try {
            const recetas = await this.getRecetas();
            const receta = recetas.find(r => 
                r.nombre && r.nombre.toLowerCase().includes(nombre.toLowerCase())
            );
            
            if (!receta) {
                throw new Error('Receta no encontrada');
            }
            
            return receta;
        } catch (error) {
            console.error('Error buscando receta por nombre:', error.message);
            throw error;
        }
    }

    /**
     * Obtener precios de recetas por tamaño
     * @param {string} tipoPizza - Tipo de pizza
     * @param {string} tamaño - Tamaño de la pizza
     * @returns {Promise<Object>} - Receta con precio
     */
    async getRecetaPorTipoYTamaño(tipoPizza, tamaño) {
        try {
            const recetas = await this.getRecetas();
            const receta = recetas.find(r => 
                r.tipo_pizza && r.tipo_pizza.toLowerCase() === tipoPizza.toLowerCase() &&
                r.tamano && r.tamano.toUpperCase() === tamaño.toUpperCase()
            );
            
            if (!receta) {
                throw new Error(`Receta no encontrada para ${tipoPizza} ${tamaño}`);
            }
            
            // Obtener el costo actualizado
            const costoData = await this.getCostoReceta(receta.id);
            receta.costo_actual = costoData.costo_estimado;
            receta.precio_base = costoData.precio_base;
            
            return receta;
        } catch (error) {
            console.error('Error obteniendo receta por tipo y tamaño:', error.message);
            throw error;
        }
    }
}

module.exports = new InventarioService();


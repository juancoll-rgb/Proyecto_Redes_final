const { pool } = require('../../config/database');

class RecetasModel {
    static async getAll() {
        const [rows] = await pool.execute(
            'SELECT * FROM recetas WHERE activa = TRUE ORDER BY tipo_pizza, tamano'
        );
        
        for (let receta of rows) {
            receta.ingredientes = await this.getIngredientesByReceta(receta.id);
            receta.costo_estimado = await this.calcularCostoEstimado(receta.id);
        }
        
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM recetas WHERE id = ? AND activa = TRUE',
            [id]
        );
        
        if (rows.length === 0) return null;
        
        const receta = rows[0];
        receta.ingredientes = await this.getIngredientesByReceta(receta.id);
        receta.costo_estimado = await this.calcularCostoEstimado(receta.id);
        
        return receta;
    }

    static async getIngredientesByReceta(recetaId) {
        const [rows] = await pool.execute(
            `SELECT ri.*, i.nombre, i.unidad_medida, i.costo_unitario
             FROM receta_ingredientes ri
             INNER JOIN ingredientes i ON ri.ingrediente_id = i.id
             WHERE ri.receta_id = ? AND i.activo = TRUE
             ORDER BY i.nombre`,
            [recetaId]
        );
        return rows;
    }

    static async create(recetaData) {
        const { nombre, tipo_pizza, tamano, precio_base, tolerancia_merma, ingredientes } = recetaData;
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                `INSERT INTO recetas (nombre, tipo_pizza, tamano, precio_base, tolerancia_merma)
                 VALUES (?, ?, ?, ?, ?)`,
                [nombre, tipo_pizza, tamano, precio_base, tolerancia_merma || 5.00]
            );
            
            const recetaId = result.insertId;
            
            if (ingredientes && ingredientes.length > 0) {
                for (const ingrediente of ingredientes) {
                    await connection.execute(
                        `INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad_requerida)
                         VALUES (?, ?, ?)`,
                        [recetaId, ingrediente.ingrediente_id, ingrediente.cantidad_requerida]
                    );
                }
            }
            
            await connection.commit();
            return this.getById(recetaId);
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, recetaData) {
        const { nombre, tipo_pizza, tamano, precio_base, tolerancia_merma, ingredientes } = recetaData;
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            await connection.execute(
                `UPDATE recetas 
                 SET nombre = ?, tipo_pizza = ?, tamano = ?, precio_base = ?, tolerancia_merma = ?
                 WHERE id = ? AND activa = TRUE`,
                [nombre, tipo_pizza, tamano, precio_base, tolerancia_merma, id]
            );
            
            if (ingredientes) {
                await connection.execute(
                    'DELETE FROM receta_ingredientes WHERE receta_id = ?',
                    [id]
                );
                
                for (const ingrediente of ingredientes) {
                    await connection.execute(
                        `INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad_requerida)
                         VALUES (?, ?, ?)`,
                        [id, ingrediente.ingrediente_id, ingrediente.cantidad_requerida]
                    );
                }
            }
            
            await connection.commit();
            return this.getById(id);
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        await pool.execute(
            'UPDATE recetas SET activa = FALSE WHERE id = ?',
            [id]
        );
        return true;
    }

    static async calcularCostoEstimado(recetaId) {
        const [rows] = await pool.execute(
            `SELECT SUM(ri.cantidad_requerida * i.costo_unitario) as costo_total
             FROM receta_ingredientes ri
             INNER JOIN ingredientes i ON ri.ingrediente_id = i.id
             WHERE ri.receta_id = ? AND i.activo = TRUE`,
            [recetaId]
        );
        
        return parseFloat(rows[0].costo_total || 0);
    }

    static async verificarStockSuficiente(recetaId, cantidad = 1) {
        const ingredientes = await this.getIngredientesByReceta(recetaId);
        const StockModel = require('./stock');
        
        const verificaciones = [];
        
        for (const ingrediente of ingredientes) {
            const cantidadRequerida = ingrediente.cantidad_requerida * cantidad;
            const stockSuficiente = await StockModel.verificarStockSuficiente(
                ingrediente.ingrediente_id, 
                cantidadRequerida
            );
            
            verificaciones.push({
                ingrediente_id: ingrediente.ingrediente_id,
                nombre: ingrediente.nombre,
                cantidad_requerida: cantidadRequerida,
                unidad_medida: ingrediente.unidad_medida,
                stock_suficiente: stockSuficiente
            });
        }
        
        const todosSuficientes = verificaciones.every(v => v.stock_suficiente);
        
        return {
            stock_suficiente: todosSuficientes,
            verificaciones
        };
    }

    static async prepararReceta(recetaId, cantidad, usuario, referencia) {
        const verificacion = await this.verificarStockSuficiente(recetaId, cantidad);
        
        if (!verificacion.stock_suficiente) {
            throw new Error('Stock insuficiente para preparar la receta');
        }
        
        const StockModel = require('./stock');
        const MovimientosModel = require('./movimientos');
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const ingredientes = await this.getIngredientesByReceta(recetaId);
            const movimientos = [];
            
            for (const ingrediente of ingredientes) {
                const cantidadRequerida = ingrediente.cantidad_requerida * cantidad;
                
                const movimiento = await MovimientosModel.registrarSalida(
                    ingrediente.ingrediente_id,
                    cantidadRequerida,
                    `Preparación de receta: ${ingredientes[0]?.nombre || 'Receta'} x${cantidad}`,
                    referencia,
                    usuario
                );
                
                movimientos.push(movimiento);
            }
            
            await connection.commit();
            return movimientos;
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async existsByTipoTamaño(tipoPizza, tamano, excludeId = null) {
        let query = 'SELECT COUNT(*) as count FROM recetas WHERE tipo_pizza = ? AND tamano = ? AND activa = TRUE';
        let params = [tipoPizza, tamano];
        
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        
        const [rows] = await pool.execute(query, params);
        return rows[0].count > 0;
    }
}

module.exports = RecetasModel;

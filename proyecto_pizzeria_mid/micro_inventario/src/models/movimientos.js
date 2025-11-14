const { pool } = require('../../config/database');

class MovimientosModel {
    static async create(movimientoData) {
        const { ingrediente_id, tipo_movimiento, motivo, cantidad, referencia, usuario } = movimientoData;
        
        const [result] = await pool.execute(
            `INSERT INTO movimientos_inventario (ingrediente_id, tipo_movimiento, motivo, cantidad, referencia, usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ingrediente_id, tipo_movimiento, motivo, cantidad, referencia, usuario]
        );
        
        return this.getById(result.insertId);
    }

    static async getById(id) {
        const [rows] = await pool.execute(
            `SELECT m.*, i.nombre as ingrediente_nombre, i.unidad_medida
             FROM movimientos_inventario m
             INNER JOIN ingredientes i ON m.ingrediente_id = i.id
             WHERE m.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getAll(filtros = {}) {
        let query = `
            SELECT m.*, i.nombre as ingrediente_nombre, i.unidad_medida
            FROM movimientos_inventario m
            INNER JOIN ingredientes i ON m.ingrediente_id = i.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.ingrediente_id) {
            query += ' AND m.ingrediente_id = ?';
            params.push(filtros.ingrediente_id);
        }

        if (filtros.tipo_movimiento) {
            query += ' AND m.tipo_movimiento = ?';
            params.push(filtros.tipo_movimiento);
        }

        if (filtros.fecha_inicio) {
            query += ' AND m.fecha_movimiento >= ?';
            params.push(filtros.fecha_inicio);
        }

        if (filtros.fecha_fin) {
            query += ' AND m.fecha_movimiento <= ?';
            params.push(filtros.fecha_fin);
        }

        query += ' ORDER BY m.fecha_movimiento DESC';

        if (filtros.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filtros.limit));
        }

        const [rows] = await pool.execute(query, params);
        return rows;
    }

    static async registrarEntrada(ingredienteId, cantidad, motivo, referencia, usuario, lote = null) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const movimiento = await this.create({
                ingrediente_id: ingredienteId,
                tipo_movimiento: 'ENTRADA',
                motivo,
                cantidad,
                referencia,
                usuario
            });
            
            if (lote) {
                const [existingStock] = await connection.execute(
                    'SELECT cantidad_disponible FROM stock WHERE ingrediente_id = ? AND lote = ?',
                    [ingredienteId, lote]
                );
                
                if (existingStock.length > 0) {
                    const nuevaCantidad = existingStock[0].cantidad_disponible + cantidad;
                    await connection.execute(
                        'UPDATE stock SET cantidad_disponible = ? WHERE ingrediente_id = ? AND lote = ?',
                        [nuevaCantidad, ingredienteId, lote]
                    );
                } else {
                    throw new Error(`No se encontró el lote ${lote} para el ingrediente`);
                }
            } else {
                const [firstStock] = await connection.execute(
                    'SELECT id, cantidad_disponible FROM stock WHERE ingrediente_id = ? ORDER BY fecha_creacion ASC LIMIT 1',
                    [ingredienteId]
                );
                
                if (firstStock.length > 0) {
                    const nuevaCantidad = firstStock[0].cantidad_disponible + cantidad;
                    await connection.execute(
                        'UPDATE stock SET cantidad_disponible = ? WHERE id = ?',
                        [nuevaCantidad, firstStock[0].id]
                    );
                } else {
                    throw new Error('No se encontró stock para actualizar');
                }
            }
            
            await connection.commit();
            return movimiento;
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async registrarSalida(ingredienteId, cantidad, motivo, referencia, usuario) {
        const StockModel = require('./stock');
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const stockSuficiente = await StockModel.verificarStockSuficiente(ingredienteId, cantidad);
            if (!stockSuficiente) {
                throw new Error('Stock insuficiente para realizar la salida');
            }
            
            const movimiento = await this.create({
                ingrediente_id: ingredienteId,
                tipo_movimiento: 'SALIDA',
                motivo,
                cantidad,
                referencia,
                usuario
            });
            
            await StockModel.descontarStock(ingredienteId, cantidad);
            
            await connection.commit();
            return movimiento;
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getResumenPorPeriodo(fechaInicio, fechaFin) {
        const [rows] = await pool.execute(
            `SELECT 
                i.nombre as ingrediente,
                SUM(CASE WHEN m.tipo_movimiento = 'ENTRADA' THEN m.cantidad ELSE 0 END) as total_entradas,
                SUM(CASE WHEN m.tipo_movimiento = 'SALIDA' THEN m.cantidad ELSE 0 END) as total_salidas,
                COUNT(*) as total_movimientos
             FROM movimientos_inventario m
             INNER JOIN ingredientes i ON m.ingrediente_id = i.id
             WHERE m.fecha_movimiento BETWEEN ? AND ?
             GROUP BY m.ingrediente_id, i.nombre
             ORDER BY i.nombre`,
            [fechaInicio, fechaFin]
        );
        return rows;
    }
}

module.exports = MovimientosModel;
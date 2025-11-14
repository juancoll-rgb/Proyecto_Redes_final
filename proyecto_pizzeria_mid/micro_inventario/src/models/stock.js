const { pool } = require('../../config/database');

class StockModel {
    static async getAll() {
        const [rows] = await pool.execute(
            `SELECT s.*, i.nombre, i.unidad_medida
             FROM stock s
             INNER JOIN ingredientes i ON s.ingrediente_id = i.id
             WHERE i.activo = 1
             ORDER BY i.nombre`
        );
        return rows;
    }

    static async getByIngrediente(ingredienteId) {
        const [rows] = await pool.execute(
            `SELECT s.*, i.nombre, i.unidad_medida
             FROM stock s
             INNER JOIN ingredientes i ON s.ingrediente_id = i.id
             WHERE s.ingrediente_id = ? AND i.activo = 1`,
            [ingredienteId]
        );
        return rows;
    }

    static async upsert(stockData) {
        const { ingrediente_id, cantidad_disponible, min_threshold, lote, fecha_vencimiento } = stockData;
        
        const [existing] = await pool.execute(
            'SELECT id FROM stock WHERE ingrediente_id = ? AND lote = ?',
            [ingrediente_id, lote]
        );
        
        if (existing.length > 0) {
            await pool.execute(
                `UPDATE stock 
                 SET cantidad_disponible = ?, min_threshold = ?, fecha_vencimiento = ?
                 WHERE ingrediente_id = ? AND lote = ?`,
                [cantidad_disponible, min_threshold, fecha_vencimiento, ingrediente_id, lote]
            );
            return existing[0].id;
        } else {
            const [result] = await pool.execute(
                `INSERT INTO stock (ingrediente_id, cantidad_disponible, min_threshold, lote, fecha_vencimiento)
                 VALUES (?, ?, ?, ?, ?)`,
                [ingrediente_id, cantidad_disponible, min_threshold, lote, fecha_vencimiento]
            );
            return result.insertId;
        }
    }

    static async getBajoUmbral() {
        const [rows] = await pool.execute(
            `SELECT s.*, i.nombre, i.unidad_medida
             FROM stock s
             INNER JOIN ingredientes i ON s.ingrediente_id = i.id
             WHERE s.cantidad_disponible <= s.min_threshold AND i.activo = 1
             ORDER BY i.nombre`
        );
        return rows;
    }

    static async verificarStockSuficiente(ingredienteId, cantidadRequerida) {
        const [rows] = await pool.execute(
            'SELECT SUM(cantidad_disponible) as total_disponible FROM stock WHERE ingrediente_id = ?',
            [ingredienteId]
        );
        
        const totalDisponible = rows[0].total_disponible || 0;
        return totalDisponible >= cantidadRequerida;
    }

    static async descontarStock(ingredienteId, cantidadADescontar) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [lotes] = await connection.execute(
                `SELECT id, cantidad_disponible, lote, fecha_vencimiento
                 FROM stock 
                 WHERE ingrediente_id = ? AND cantidad_disponible > 0
                 ORDER BY fecha_vencimiento ASC`,
                [ingredienteId]
            );
            
            let cantidadRestante = cantidadADescontar;
            const movimientos = [];
            
            for (const lote of lotes) {
                if (cantidadRestante <= 0) break;
                
                const cantidadAUsar = Math.min(lote.cantidad_disponible, cantidadRestante);
                const nuevaCantidad = lote.cantidad_disponible - cantidadAUsar;
                
                await connection.execute(
                    'UPDATE stock SET cantidad_disponible = ? WHERE id = ?',
                    [nuevaCantidad, lote.id]
                );
                
                movimientos.push({
                    lote: lote.lote,
                    cantidadUsada: cantidadAUsar,
                    cantidadRestante: nuevaCantidad
                });
                
                cantidadRestante -= cantidadAUsar;
            }
            
            await connection.commit();
            
            if (cantidadRestante > 0) {
                throw new Error(`Stock insuficiente. Faltan ${cantidadRestante} unidades`);
            }
            
            return movimientos;
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = StockModel;
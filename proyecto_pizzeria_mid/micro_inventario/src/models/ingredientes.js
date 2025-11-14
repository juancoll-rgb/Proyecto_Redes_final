const { pool } = require('../../config/database');

class IngredientesModel {
    static async getAll() {
        const [rows] = await pool.execute(
            'SELECT * FROM ingredientes WHERE activo = TRUE ORDER BY nombre'
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM ingredientes WHERE id = ? AND activo = TRUE',
            [id]
        );
        return rows[0];
    }

    static async create(ingredienteData) {
        const { nombre, unidad_medida, costo_unitario, alergenos, vida_util, proveedor } = ingredienteData;
        
        const [result] = await pool.execute(
            `INSERT INTO ingredientes (nombre, unidad_medida, costo_unitario, alergenos, vida_util, proveedor)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, unidad_medida, costo_unitario, alergenos, vida_util, proveedor]
        );
        
        return this.getById(result.insertId);
    }

    static async update(id, ingredienteData) {
        const { nombre, unidad_medida, costo_unitario, alergenos, vida_util, proveedor } = ingredienteData;
        
        await pool.execute(
            `UPDATE ingredientes 
             SET nombre = ?, unidad_medida = ?, costo_unitario = ?, 
                 alergenos = ?, vida_util = ?, proveedor = ?
             WHERE id = ? AND activo = TRUE`,
            [nombre, unidad_medida, costo_unitario, alergenos, vida_util, proveedor, id]
        );
        
        return this.getById(id);
    }

    static async canDelete(id) {
        const [stockRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM stock WHERE ingrediente_id = ? AND cantidad_disponible > 0',
            [id]
        );
        
        const [recetasRows] = await pool.execute(
            `SELECT COUNT(*) as count FROM receta_ingredientes ri 
             INNER JOIN recetas r ON ri.receta_id = r.id 
             WHERE ri.ingrediente_id = ? AND r.activa = TRUE`,
            [id]
        );
        
        return stockRows[0].count === 0 && recetasRows[0].count === 0;
    }

    static async delete(id) {
        const canDelete = await this.canDelete(id);
        if (!canDelete) {
            throw new Error('No se puede eliminar: el ingrediente tiene stock o está en recetas activas');
        }
        
        await pool.execute(
            'UPDATE ingredientes SET activo = FALSE WHERE id = ?',
            [id]
        );
        
        return true;
    }

    static async existsByName(nombre, excludeId = null) {
        let query = 'SELECT COUNT(*) as count FROM ingredientes WHERE nombre = ? AND activo = TRUE';
        let params = [nombre];
        
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        
        const [rows] = await pool.execute(query, params);
        return rows[0].count > 0;
    }
}

module.exports = IngredientesModel;

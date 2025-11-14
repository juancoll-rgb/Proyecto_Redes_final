const StockModel = require('../models/stock');
const MovimientosModel = require('../models/movimientos');
const IngredientesModel = require('../models/ingredientes');

class StockController {
    static async getAll(req, res, next) {
        try {
            const stock = await StockModel.getAll();
            res.json({
                success: true,
                data: stock,
                count: stock.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async getByIngrediente(req, res, next) {
        try {
            const stock = await StockModel.getByIngrediente(req.params.id);
            res.json({
                success: true,
                data: stock,
                count: stock.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async upsert(req, res, next) {
        try {
            const ingrediente = await IngredientesModel.getById(req.body.ingrediente_id);
            if (!ingrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            const stockId = await StockModel.upsert(req.body);
            const stockActualizado = await StockModel.getByIngrediente(req.body.ingrediente_id);
            
            res.json({
                success: true,
                message: 'Stock actualizado exitosamente',
                data: stockActualizado
            });
        } catch (error) {
            next(error);
        }
    }

    static async getBajoUmbral(req, res, next) {
        try {
            const stockBajo = await StockModel.getBajoUmbral();
            res.json({
                success: true,
                data: stockBajo,
                count: stockBajo.length,
                message: stockBajo.length > 0 ? 
                    `${stockBajo.length} ingrediente(s) con stock bajo el umbral` :
                    'Todos los ingredientes tienen stock suficiente'
            });
        } catch (error) {
            next(error);
        }
    }

    static async registrarEntrada(req, res, next) {
        try {
            const { ingrediente_id, cantidad, motivo, referencia, usuario, lote } = req.body;
            
            const ingrediente = await IngredientesModel.getById(ingrediente_id);
            if (!ingrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            const movimiento = await MovimientosModel.registrarEntrada(
                ingrediente_id, cantidad, motivo, referencia, usuario, lote
            );
            
            res.json({
                success: true,
                message: 'Entrada de stock registrada exitosamente',
                data: movimiento
            });
        } catch (error) {
            next(error);
        }
    }

    static async registrarSalida(req, res, next) {
        try {
            const { ingrediente_id, cantidad, motivo, referencia, usuario } = req.body;
            
            const ingrediente = await IngredientesModel.getById(ingrediente_id);
            if (!ingrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            const movimiento = await MovimientosModel.registrarSalida(
                ingrediente_id, cantidad, motivo, referencia, usuario
            );
            
            res.json({
                success: true,
                message: 'Salida de stock registrada exitosamente',
                data: movimiento
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMovimientos(req, res, next) {
        try {
            const filtros = {
                ingrediente_id: req.query.ingrediente_id,
                tipo_movimiento: req.query.tipo_movimiento,
                fecha_inicio: req.query.fecha_inicio,
                fecha_fin: req.query.fecha_fin,
                limit: req.query.limit || 50
            };

            const movimientos = await MovimientosModel.getAll(filtros);
            
            res.json({
                success: true,
                data: movimientos,
                count: movimientos.length,
                filtros: filtros
            });
        } catch (error) {
            next(error);
        }
    }

    static async getResumenMovimientos(req, res, next) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren fecha_inicio y fecha_fin'
                });
            }

            const resumen = await MovimientosModel.getResumenPorPeriodo(fecha_inicio, fecha_fin);
            
            res.json({
                success: true,
                data: resumen,
                count: resumen.length,
                periodo: { fecha_inicio, fecha_fin }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = StockController;
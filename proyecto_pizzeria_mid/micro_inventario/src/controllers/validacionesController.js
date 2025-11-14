const RecetasModel = require('../models/recetas');

class ValidacionesController {
    static async getRecetasDisponibles(req, res, next) {
        try {
            const recetas = await RecetasModel.getAll();
            const recetasConDisponibilidad = [];
            
            for (const receta of recetas) {
                const verificacion = await RecetasModel.verificarStockSuficiente(receta.id, 1);
                
                recetasConDisponibilidad.push({
                    id: receta.id,
                    nombre: receta.nombre,
                    tipo_pizza: receta.tipo_pizza,
                    tamano: receta.tamano,
                    precio_base: receta.precio_base,
                    costo_estimado: receta.costo_estimado,
                    disponible: verificacion.stock_suficiente,
                    ingredientes_faltantes: verificacion.verificaciones
                        .filter(v => !v.stock_suficiente)
                        .map(v => ({
                            nombre: v.nombre,
                            cantidad_requerida: v.cantidad_requerida,
                            unidad_medida: v.unidad_medida
                        }))
                });
            }

            const disponibles = recetasConDisponibilidad.filter(r => r.disponible);
            const noDisponibles = recetasConDisponibilidad.filter(r => !r.disponible);

            res.json({
                success: true,
                data: {
                    recetas_disponibles: disponibles,
                    recetas_no_disponibles: noDisponibles,
                    resumen: {
                        total_recetas: recetasConDisponibilidad.length,
                        disponibles: disponibles.length,
                        no_disponibles: noDisponibles.length
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async verificarStockSuficiente(req, res, next) {
        try {
            const { receta_id, cantidad } = req.body;
            
            const receta = await RecetasModel.getById(receta_id);
            if (!receta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            const verificacion = await RecetasModel.verificarStockSuficiente(receta_id, cantidad);
            
            res.json({
                success: true,
                data: {
                    receta: {
                        id: receta.id,
                        nombre: receta.nombre,
                        tipo_pizza: receta.tipo_pizza,
                        tamano: receta.tamano
                    },
                    cantidad_solicitada: cantidad,
                    stock_suficiente: verificacion.stock_suficiente,
                    ingredientes: verificacion.verificaciones,
                    puede_preparar: verificacion.stock_suficiente
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async prepararReceta(req, res, next) {
        try {
            const { receta_id, cantidad, referencia } = req.body;
            
            // Usar el usuario autenticado del middleware
            const usuario = req.user ? req.user.email : 'Sistema';
            
            const receta = await RecetasModel.getById(receta_id);
            if (!receta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            const movimientos = await RecetasModel.prepararReceta(
                receta_id, cantidad, usuario, referencia || `ORDEN-${Date.now()}`
            );
            
            res.json({
                success: true,
                message: `${cantidad} unidades de ${receta.nombre} preparadas exitosamente`,
                data: {
                    receta: {
                        id: receta.id,
                        nombre: receta.nombre,
                        tipo_pizza: receta.tipo_pizza,
                        tamano: receta.tamano
                    },
                    cantidad_preparada: cantidad,
                    movimientos_generados: movimientos.length,
                    referencia: referencia || `ORDEN-${Date.now()}`,
                    usuario: usuario,
                    costo_total: receta.costo_estimado * cantidad
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getAlertasStock(req, res, next) {
        try {
            const StockModel = require('../models/stock');
            const stockBajo = await StockModel.getBajoUmbral();
            
            const alertas = stockBajo.map(stock => ({
                ingrediente_id: stock.ingrediente_id,
                nombre: stock.nombre,
                cantidad_actual: stock.cantidad_disponible,
                umbral_minimo: stock.min_threshold,
                unidad_medida: stock.unidad_medida,
                proveedor: stock.proveedor,
                deficit: Math.max(0, stock.min_threshold - stock.cantidad_disponible),
                urgencia: stock.cantidad_disponible === 0 ? 'CRITICA' : 
                         stock.cantidad_disponible < (stock.min_threshold * 0.5) ? 'ALTA' : 'MEDIA'
            }));

            const ordenUrgencia = { 'CRITICA': 3, 'ALTA': 2, 'MEDIA': 1 };
            alertas.sort((a, b) => ordenUrgencia[b.urgencia] - ordenUrgencia[a.urgencia]);

            res.json({
                success: true,
                data: {
                    alertas: alertas,
                    resumen: {
                        total_alertas: alertas.length,
                        criticas: alertas.filter(a => a.urgencia === 'CRITICA').length,
                        altas: alertas.filter(a => a.urgencia === 'ALTA').length,
                        medias: alertas.filter(a => a.urgencia === 'MEDIA').length
                    }
                },
                message: alertas.length > 0 ? 
                    `${alertas.length} ingrediente(s) requieren reabastecimiento` :
                    'No hay alertas de stock en este momento'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ValidacionesController;
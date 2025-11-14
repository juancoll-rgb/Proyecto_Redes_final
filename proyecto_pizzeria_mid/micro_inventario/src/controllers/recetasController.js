const RecetasModel = require('../models/recetas');
const IngredientesModel = require('../models/ingredientes');

class RecetasController {
    static async getAll(req, res, next) {
        try {
            const recetas = await RecetasModel.getAll();
            res.json({
                success: true,
                data: recetas,
                count: recetas.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req, res, next) {
        try {
            const receta = await RecetasModel.getById(req.params.id);
            
            if (!receta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            res.json({
                success: true,
                data: receta
            });
        } catch (error) {
            next(error);
        }
    }

    static async create(req, res, next) {
        try {
            const { tipo_pizza, tamano, ingredientes } = req.body;
            
            const exists = await RecetasModel.existsByTipoTamaño(tipo_pizza, tamano);
            if (exists) {
                return res.status(409).json({
                    success: false,
                    message: `Ya existe una receta de ${tipo_pizza} ${tamano}`
                });
            }

            for (const ing of ingredientes) {
                const ingrediente = await IngredientesModel.getById(ing.ingrediente_id);
                if (!ingrediente) {
                    return res.status(400).json({
                        success: false,
                        message: `Ingrediente con ID ${ing.ingrediente_id} no encontrado`
                    });
                }
            }

            const receta = await RecetasModel.create(req.body);
            
            res.status(201).json({
                success: true,
                message: 'Receta creada exitosamente',
                data: receta
            });
        } catch (error) {
            next(error);
        }
    }

    static async update(req, res, next) {
        try {
            const { tipo_pizza, tamano, ingredientes } = req.body;
            
            const existingReceta = await RecetasModel.getById(req.params.id);
            if (!existingReceta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            const nameExists = await RecetasModel.existsByTipoTamaño(tipo_pizza, tamano, req.params.id);
            if (nameExists) {
                return res.status(409).json({
                    success: false,
                    message: `Ya existe otra receta de ${tipo_pizza} ${tamano}`
                });
            }

            if (ingredientes) {
                for (const ing of ingredientes) {
                    const ingrediente = await IngredientesModel.getById(ing.ingrediente_id);
                    if (!ingrediente) {
                        return res.status(400).json({
                            success: false,
                            message: `Ingrediente con ID ${ing.ingrediente_id} no encontrado`
                        });
                    }
                }
            }

            const receta = await RecetasModel.update(req.params.id, req.body);
            
            res.json({
                success: true,
                message: 'Receta actualizada exitosamente',
                data: receta
            });
        } catch (error) {
            next(error);
        }
    }

    static async delete(req, res, next) {
        try {
            const receta = await RecetasModel.getById(req.params.id);
            if (!receta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            await RecetasModel.delete(req.params.id);
            
            res.json({
                success: true,
                message: 'Receta eliminada exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    static async getCosto(req, res, next) {
        try {
            const receta = await RecetasModel.getById(req.params.id);
            if (!receta) {
                return res.status(404).json({
                    success: false,
                    message: 'Receta no encontrada'
                });
            }

            res.json({
                success: true,
                data: {
                    receta_id: receta.id,
                    nombre: receta.nombre,
                    costo_estimado: receta.costo_estimado,
                    precio_base: receta.precio_base,
                    margen: receta.precio_base - receta.costo_estimado,
                    porcentaje_margen: ((receta.precio_base - receta.costo_estimado) / receta.precio_base * 100).toFixed(2)
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = RecetasController;
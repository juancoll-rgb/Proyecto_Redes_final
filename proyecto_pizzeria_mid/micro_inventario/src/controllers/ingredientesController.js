const IngredientesModel = require('../models/ingredientes');

class IngredientesController {
    static async getAll(req, res, next) {
        try {
            const ingredientes = await IngredientesModel.getAll();
            res.json({
                success: true,
                data: ingredientes,
                count: ingredientes.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req, res, next) {
        try {
            const ingrediente = await IngredientesModel.getById(req.params.id);
            
            if (!ingrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            res.json({
                success: true,
                data: ingrediente
            });
        } catch (error) {
            next(error);
        }
    }

    static async create(req, res, next) {
        try {
            const exists = await IngredientesModel.existsByName(req.body.nombre);
            if (exists) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un ingrediente con ese nombre'
                });
            }

            const ingrediente = await IngredientesModel.create(req.body);
            
            res.status(201).json({
                success: true,
                message: 'Ingrediente creado exitosamente',
                data: ingrediente
            });
        } catch (error) {
            next(error);
        }
    }

    static async update(req, res, next) {
        try {
            const existingIngrediente = await IngredientesModel.getById(req.params.id);
            if (!existingIngrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            const nameExists = await IngredientesModel.existsByName(req.body.nombre, req.params.id);
            if (nameExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un ingrediente con ese nombre'
                });
            }

            const ingrediente = await IngredientesModel.update(req.params.id, req.body);
            
            res.json({
                success: true,
                message: 'Ingrediente actualizado exitosamente',
                data: ingrediente
            });
        } catch (error) {
            next(error);
        }
    }

    static async delete(req, res, next) {
        try {
            const ingrediente = await IngredientesModel.getById(req.params.id);
            if (!ingrediente) {
                return res.status(404).json({
                    success: false,
                    message: 'Ingrediente no encontrado'
                });
            }

            await IngredientesModel.delete(req.params.id);
            
            res.json({
                success: true,
                message: 'Ingrediente eliminado exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = IngredientesController;
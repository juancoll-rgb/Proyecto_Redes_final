const Joi = require('joi');

const schemas = {
    ingrediente: Joi.object({
        nombre: Joi.string().trim().min(1).max(100).required(),
        unidad_medida: Joi.string().trim().min(1).max(20).required(),
        costo_unitario: Joi.number().positive().precision(2).required(),
        alergenos: Joi.string().trim().max(500).allow('', null),
        vida_util: Joi.number().integer().positive().required(),
        proveedor: Joi.string().trim().max(100).allow('', null)
    }),

    stock: Joi.object({
        ingrediente_id: Joi.number().integer().positive().required(),
        cantidad_disponible: Joi.number().min(0).precision(3).required(),
        min_threshold: Joi.number().min(0).precision(3).required(),
        lote: Joi.string().trim().max(50).required(),
        fecha_vencimiento: Joi.date().iso().required()
    }),

    movimiento: Joi.object({
        ingrediente_id: Joi.number().integer().positive().required(),
        tipo_movimiento: Joi.string().valid('ENTRADA', 'SALIDA').required(),
        motivo: Joi.string().trim().min(1).max(100).required(),
        cantidad: Joi.number().positive().precision(3).required(),
        referencia: Joi.string().trim().max(100).allow('', null),
        usuario: Joi.string().trim().min(1).max(50).required(),
        lote: Joi.string().trim().max(50).optional()
    }),

    receta: Joi.object({
        nombre: Joi.string().trim().min(1).max(100).required(),
        tipo_pizza: Joi.string().trim().min(1).max(50).required(),
        tamano: Joi.string().valid('PEQUEÑA', 'MEDIANA', 'GRANDE', 'FAMILIAR').required(),
        precio_base: Joi.number().positive().precision(2).required(),
        tolerancia_merma: Joi.number().min(0).max(100).precision(2).default(5.00),
        ingredientes: Joi.array().items(
            Joi.object({
                ingrediente_id: Joi.number().integer().positive().required(),
                cantidad_requerida: Joi.number().positive().precision(3).required()
            })
        ).min(1).required()
    }),

    verificarStock: Joi.object({
        receta_id: Joi.number().integer().positive().required(),
        cantidad: Joi.number().integer().positive().default(1)
    }),

    prepararReceta: Joi.object({
        receta_id: Joi.number().integer().positive().required(),
        cantidad: Joi.number().integer().positive().required(),
        usuario: Joi.string().trim().min(1).max(50).required(),
        referencia: Joi.string().trim().max(100).allow('', null)
    })
};

function validateSchema(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        
        req.body = value;
        next();
    };
}

function validateId(req, res, next) {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID inválido'
        });
    }
    
    req.params.id = id;
    next();
}

const validateIngrediente = validateSchema(schemas.ingrediente);
const validateStock = validateSchema(schemas.stock);
const validateMovimiento = validateSchema(schemas.movimiento);
const validateReceta = validateSchema(schemas.receta);
const validateVerificarStock = validateSchema(schemas.verificarStock);
const validatePrepararReceta = validateSchema(schemas.prepararReceta);

module.exports = {
    validateIngrediente,
    validateStock,
    validateMovimiento,
    validateReceta,
    validateVerificarStock,
    validatePrepararReceta,
    validateId
};
const express = require('express');
const router = express.Router();
const IngredientesController = require('../controllers/ingredientesController');
const { validateIngrediente, validateId } = require('../middleware/validation');
const { requireAdmin } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.get('/', IngredientesController.getAll);
router.get('/:id', validateId, IngredientesController.getById);

// Rutas administrativas (requieren rol de administrador)
router.post('/', requireAdmin, validateIngrediente, IngredientesController.create);
router.put('/:id', requireAdmin, validateId, validateIngrediente, IngredientesController.update);
router.delete('/:id', requireAdmin, validateId, IngredientesController.delete);

module.exports = router;
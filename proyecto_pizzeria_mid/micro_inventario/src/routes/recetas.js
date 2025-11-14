const express = require('express');
const router = express.Router();
const RecetasController = require('../controllers/recetasController');
const { validateReceta, validateId } = require('../middleware/validation');
const { requireAdmin } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.get('/', RecetasController.getAll);
router.get('/:id', validateId, RecetasController.getById);
router.get('/:id/costo', validateId, RecetasController.getCosto);

// Rutas administrativas (requieren rol de administrador)
router.post('/', requireAdmin, validateReceta, RecetasController.create);
router.put('/:id', requireAdmin, validateId, validateReceta, RecetasController.update);
router.delete('/:id', requireAdmin, validateId, RecetasController.delete);

module.exports = router;
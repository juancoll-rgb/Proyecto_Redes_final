const express = require('express');
const router = express.Router();
const StockController = require('../controllers/stockController');
const { validateStock, validateMovimiento, validateId } = require('../middleware/validation');
const { requireAdmin } = require('../middleware/auth');

router.get('/', StockController.getAll);
router.get('/ingrediente/:id', validateId, StockController.getByIngrediente);
router.get('/bajo-umbral', StockController.getBajoUmbral);
router.get('/movimientos', StockController.getMovimientos);
router.get('/resumen-movimientos', StockController.getResumenMovimientos);

router.post('/', requireAdmin, validateStock, StockController.upsert);
router.post('/entrada', requireAdmin, validateMovimiento, StockController.registrarEntrada);
router.post('/salida', requireAdmin, validateMovimiento, StockController.registrarSalida);

module.exports = router;
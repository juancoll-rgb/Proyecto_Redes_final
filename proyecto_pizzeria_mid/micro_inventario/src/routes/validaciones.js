const express = require('express');
const router = express.Router();
const ValidacionesController = require('../controllers/validacionesController');
const { validateVerificarStock, validatePrepararReceta } = require('../middleware/validation');
const { requireAdmin, requireUser } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.get('/recetas-disponibles', ValidacionesController.getRecetasDisponibles);
router.post('/stock-suficiente', validateVerificarStock, ValidacionesController.verificarStockSuficiente);
router.get('/alertas-stock', ValidacionesController.getAlertasStock);

// Rutas que requieren usuario autenticado (no necesariamente admin)
router.post('/preparar-receta', requireUser, validatePrepararReceta, ValidacionesController.prepararReceta);

module.exports = router;
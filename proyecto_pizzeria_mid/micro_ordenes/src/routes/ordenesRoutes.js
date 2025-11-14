// routes/ordenesRoutes.js
const express = require('express');
const router = express.Router();
const OrdenesController = require('../controllers/ordenesController');
const { requireCajero } = require('../middleware/auth');

// Obtener todas las órdenes (requiere cajero)
router.get('/', requireCajero, OrdenesController.getAll);

// Endpoints para integración con inventario (requieren cajero) - DEBEN IR ANTES DE /:id
router.get('/recetas', requireCajero, OrdenesController.getRecetas);
router.get('/recetas/disponibles', requireCajero, OrdenesController.getRecetasDisponibles);
router.get('/recetas/:id', requireCajero, OrdenesController.getRecetaById);
router.get('/recetas/:id/costo', requireCajero, OrdenesController.getCostoReceta);
router.get('/recetas/buscar/:nombre', requireCajero, OrdenesController.buscarRecetaPorNombre);
router.get('/recetas/tipo/:tipo/tamaño/:tamaño', requireCajero, OrdenesController.getRecetaPorTipoYTamaño);

// Obtener órdenes por nombre (requiere cajero)
router.get('/nombre/:nombre', requireCajero, OrdenesController.getByNombre);

// Obtener órdenes por correo del cajero (requiere cajero)
router.get('/correo/:correo', requireCajero, OrdenesController.getByCorreo);

// Obtener orden por ID (requiere cajero) - DEBE IR AL FINAL
router.get('/:id', requireCajero, OrdenesController.getById);

// Crear nueva orden (requiere cajero)
router.post('/', requireCajero, OrdenesController.create);

// Actualizar orden completa (requiere cajero)
router.put('/:id', requireCajero, OrdenesController.update);

// Eliminar orden (requiere cajero)
router.delete('/:id', requireCajero, OrdenesController.delete);

// Actualizar estado de domicilio (requiere cajero)
router.patch('/domicilio/estado', requireCajero, OrdenesController.actualizarEstadoDomicilio);

// Verificar stock (requiere cajero)
router.post('/verificar-stock', requireCajero, OrdenesController.verificarStock);

module.exports = router;


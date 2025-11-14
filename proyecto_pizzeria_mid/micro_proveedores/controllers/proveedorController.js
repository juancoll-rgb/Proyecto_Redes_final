const { Router } = require('express');
const router = Router();
const proveedorModel = require('../models/proveedorModel');

// Obtener todos los ingredientes
router.get('/ingredientes', async (req, res) => {
    try {
        const result = await proveedorModel.traerIngredientes();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener un ingrediente por ID
router.get('/ingredientes/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await proveedorModel.traerIngrediente(id);
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear un nuevo ingrediente
router.post('/ingredientes', async (req, res) => {
    try {
        const { nombre, stock_actual, proveedor } = req.body;

        if (!nombre || stock_actual == null || !proveedor) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        await proveedorModel.crearIngrediente(nombre, stock_actual, proveedor);
        res.send("Ingrediente agregado");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear un pedido
router.post('/pedidos', async (req, res) => {
    try {
        const { ingrediente_id, cantidad, estado } = req.body;

        if (ingrediente_id == null || cantidad == null) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                body_recibido: req.body
            });
        }

        // si no viene estado en el body, queda como "pendiente"
        const estadoFinal = estado || 'pendiente';

        await proveedorModel.crearPedido(ingrediente_id, cantidad, estadoFinal);
        res.send("Pedido creado");
    } catch (error) {
        console.error('Error en POST /pedidos:', error);
        res.status(500).json({ error: error.message });
    }
});


// Actualizar estado de un pedido
router.patch('/pedidos/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const { id } = req.params;
        if (!estado) {
            return res.status(400).json({ error: 'Debe indicar un estado' });
        }

        const result = await proveedorModel.actualizarEstadoPedido(id, estado);
        if (result.affectedRows > 0) {
            res.send(`Estado del pedido ${id} actualizado a ${estado} exitosamente!`);
        } else {
            res.status(404).send("Pedido no encontrado");
        }
    } catch (error) {
        console.error('Error en PATCH /pedidos/:id/estado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar stock después de recibir pedido
router.patch('/ingredientes/:id/stock', async (req, res) => {
    try {
        const id = req.params.id;
        const { cantidad } = req.body;

        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: "Cantidad inválida" });
        }

        await proveedorModel.actualizarStock(id, cantidad);
        res.send("Stock actualizado");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Listar pedidos
router.get('/pedidos', async (req, res) => {
    try {
        const result = await proveedorModel.traerPedidos();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

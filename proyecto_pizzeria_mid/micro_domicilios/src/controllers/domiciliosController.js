const { Router } = require('express');
const router = Router();
const model = require('../models/domiciliosModel');
const moment = require('moment-timezone');
const axios = require('axios');

// Crear domicilio desde microservicio de órdenes
router.post('/api/ordenes/domicilio', async (req, res) => {
  const { order_id, nombre, direccion_entrega } = req.body;

  try {
    // Hora actual en Colombia
    const fechaColombia = moment.tz(new Date(), 'America/Bogota');
    const fecha_asignacion = fechaColombia.format('YYYY-MM-DD HH:mm:ss');
    const hora_entrega = fechaColombia.clone().add(2, 'hours').format('HH:mm:ss');

    //  Buscar repartidor activo
    const repartidor = await model.obtenerRepartidorActivo();
    if (!repartidor) return res.status(404).json({ error: 'No hay repartidores activos' });

    // Crear domicilio
    const domicilio = await model.crearDomicilio({
      order_id,
      direccion_entrega,
      nombre,
      fecha_asignacion,
      hora_entrega,
      repartidor_id: repartidor.repartidor_id
    });

    // Actualizar orden con domicilio_id en microservicio de órdenes
    try {
      await axios.put(`http://localhost:3004/api/ordenes/${order_id}`, {
        domicilio_id: domicilio.domicilio_id
      });
    } catch (errorOrden) {
      console.error(' Error al actualizar la orden con domicilio_id:', errorOrden.message);
      // No detenemos el flujo, pero lo notificamos
    }

    res.status(201).json({
      ...domicilio,
      repartidor
    });
  } catch (err) {
    console.error(' Error al crear domicilio:', err);
    res.status(500).json({ error: 'Error al procesar la orden' });
  }
});

// Actualizar estado del domicilio (solo si el usuario tiene rol REPARTIDOR, se válida por el correo y telefono)
router.put('/api/domicilios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado, correo, telefono } = req.body;

  try {
    const esRepartidor = await model.validarRepartidorFlexible({ correo, telefono });
    if (!esRepartidor) return res.status(403).json({ error: 'No autorizado' });

    await model.actualizarEstadoDomicilio(id, nuevoEstado);

    // Obtener order_id del domicilio actualizado
    const domicilio = await model.obtenerDomicilioPorId(id);
    const { order_id } = domicilio;

    // Notificar al microservicio de órdenes
     await axios.put(`http://localhost:3004/api/ordenes/${order_id}/estado`, {
        estado: nuevoEstado
      });
    
    res.json({ mensaje: 'Estado del domicilio actualizado y sincronizado con órdenes' });
  } catch (err) {
    console.error('Error al actualizar estado del domicilio:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// Cambiar estado del repartidor usando correo o telefono al ingresar
router.put('/api/repartidores/:id/estado', async (req, res) => {
  const { correo, telefono, estado } = req.body;

  try {
    const repartidor = await model.obtenerRepartidorFlexible({ correo, telefono });
    if (!repartidor) return res.status(404).json({ error: 'Repartidor no encontrado' });

    await model.actualizarEstadoRepartidor(repartidor.repartidor_id, estado);
    res.json({ mensaje: 'Estado del repartidor actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar estado del repartidor:', err);
    res.status(500).json({ error: 'Error al actualizar estado del repartidor' });
  }
});

// Eliminar repartidor
router.delete('/api/repartidores/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await model.eliminarRepartidor(id);
    res.json({ mensaje: 'Repartidor eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar repartidor:', err);
    res.status(500).json({ error: 'Error al eliminar repartidor' });
  }
});

module.exports = router;

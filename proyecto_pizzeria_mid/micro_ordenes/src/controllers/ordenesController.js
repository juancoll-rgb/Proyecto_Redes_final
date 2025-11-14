const axios = require('axios');
const ordenesModel = require('../models/ordenesModel');
const recetasModel = require('../models/recetasModel');
const inventarioService = require('../services/inventarioService');

const INVENTARIO_URL = process.env.INVENTARIO_URL || 'http://localhost:3001/api';
const DOMICILIOS_URL = process.env.DOMICILIOS_URL || 'http://localhost:3003/api';

class OrdenesController {
  static async getAll(req, res) {
    try {
      const ordenes = await ordenesModel.obtenerOrdenes();
      res.status(200).json({ success: true, data: ordenes || [] });
    } catch (error) {
      res.status(500).json({ success: false, data: [] });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const orden = await ordenesModel.obtenerPorId(id);
      if (!orden) {
        return res.status(404).json({ success: false, error: 'Orden no encontrada' });
      }
      res.status(200).json({ success: true, data: orden });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener la orden por ID' });
    }
  }

  static async getByNombre(req, res) {
    try {
      const { nombre } = req.params;
      const ordenes = await ordenesModel.obtenerPorNombre(nombre);
      res.status(200).json({ success: true, data: ordenes || [] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener órdenes por nombre' });
    }
  }

  static async getByCorreo(req, res) {
    try {
      const { correo } = req.params;
      const ordenes = await ordenesModel.obtenerPorCorreo(correo);
      res.status(200).json({ success: true, data: ordenes || [] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener órdenes por correo' });
    }
  }

  static async create(req, res) {
    try {
      console.log('Datos recibidos en create:', req.body);
      console.log('Usuario autenticado:', req.user);

      const {
        pizza_id,
        pizza_name,
        pizza_size,
        pizza_category,
        quantity,
        unit_price,
        total_price,
        receta_id,
        orden_direccion,
        modo_entrega,
        nombre,
        order_id // Campo opcional para continuar una orden existente
      } = req.body;

      const correo_cajero = req.user?.email;
      console.log('Correo del cajero:', correo_cajero);
      console.log('order_id recibido en request:', order_id);
      
      if (!pizza_size || total_price == null) {
        console.log('Error: pizza_size o total_price faltantes');
        console.log('   pizza_size:', pizza_size);
        console.log('   total_price:', total_price);
        return res.status(400).json({ success: false, error: 'pizza_size y total_price son obligatorios' });
      }

      let recetaFinalId = receta_id;
      if (!recetaFinalId && pizza_name) {
        const receta = await recetasModel.buscarPorNombre(pizza_name);
        if (receta) recetaFinalId = receta.id;
      }

      let canMake = true;
      let faltantes = [];
      
      // Usar order_id existente o generar uno nuevo
      const finalOrderId = order_id || `ORD-${Date.now()}`;
      console.log('Order ID recibido:', order_id);
      console.log('Order ID final a usar:', finalOrderId);
      console.log('¿Es order_id truthy?', !!order_id);
      
      // Verificar stock usando el servicio de inventario
      if (recetaFinalId) {
        try {
          const verificacion = await inventarioService.verificarStockSuficiente(recetaFinalId, quantity || 1);
          canMake = verificacion.stock_suficiente;
          faltantes = verificacion.verificaciones ? verificacion.verificaciones.filter(v => !v.stock_suficiente).map(v => v.nombre) : [];
        } catch (err) {
          console.error('Error verificando stock:', err.message);
          canMake = false;
          faltantes = ['Error verificando stock'];
        }
      }

      if (!canMake) {
        let errorMessage = 'No hay stock suficiente para esta receta';
        if (faltantes && faltantes.length > 0) {
          errorMessage += `. Ingredientes faltantes: ${faltantes.join(', ')}`;
        }
        
        console.log('Stock insuficiente:', { receta_id: recetaFinalId, faltantes });
        
        return res.status(400).json({
          success: false,
          error: errorMessage,
          faltantes,
          tipo_error: 'stock_insuficiente'
        });
      }

      const result = await ordenesModel.crearOrden({
        order_id: finalOrderId,
        pizza_id,
        quantity: quantity || 1,
        unit_price: unit_price || 0,
        total_price,
        pizza_size,
        pizza_category: pizza_category || null,
        pizza_name: pizza_name || null,
        correo_cajero,
        orden_direccion: orden_direccion || null,
        receta_id: recetaFinalId || null,
        modo_entrega: modo_entrega || 'para_llevar',
        nombre: nombre || null,
        estado: 'pendiente'
      });

      // Preparar la receta (descontar stock) si se pudo crear la orden
      if (recetaFinalId && canMake) {
        try {
          await inventarioService.prepararReceta(
            recetaFinalId, 
            quantity || 1, 
            finalOrderId, 
            correo_cajero
          );
          console.log(`Receta ${recetaFinalId} preparada para orden ${finalOrderId}`);
        } catch (prepError) {
          console.error('Error preparando receta:', prepError.message);
          // No fallar la orden si hay error en la preparación
        }
      }

      // Si es domicilio, crear orden en microservicio de domicilios
      if (modo_entrega === 'domicilio' && orden_direccion) {
        try {
          await axios.post(`${DOMICILIOS_URL}/ordenes`, {
            order_id: finalOrderId,
            direccion: orden_direccion,
            nombre_cliente: nombre,
            correo_cajero: correo_cajero
          });
        } catch (err) {
          console.error('Error creando orden de domicilio:', err.message);
        }
      }

      const id = result.insertId;
      res.status(201).json({
        success: true,
        mensaje: 'Orden creada con éxito',
        orden: {
          id,
          order_id: finalOrderId,
          pizza_id,
          pizza_name,
          pizza_size,
          pizza_category: pizza_category || null,
          quantity: quantity || 1,
          unit_price: unit_price || 0,
          total_price,
          correo_cajero,
          receta_id: recetaFinalId || null,
          orden_direccion: orden_direccion || null,
          modo_entrega: modo_entrega || 'para_llevar',
          nombre: nombre || null,
          estado: 'pendiente'
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error del servidor al insertar la orden' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const orden = await ordenesModel.obtenerPorId(id);
      if (!orden) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
      if (orden.correo_cajero !== req.user.email) {
        return res.status(403).json({ success: false, error: 'No puedes editar órdenes de otro cajero' });
      }
      await ordenesModel.actualizarOrden(id, req.body);
      res.status(200).json({ success: true, mensaje: 'Orden actualizada con éxito' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error del servidor al actualizar la orden' });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const orden = await ordenesModel.obtenerPorId(id);
      if (!orden) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
      if (orden.correo_cajero !== req.user.email) {
        return res.status(403).json({ success: false, error: 'No puedes borrar órdenes de otro cajero' });
      }
      await ordenesModel.eliminarOrden(id);
      res.status(200).json({ success: true, mensaje: 'Orden eliminada con éxito' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error del servidor al eliminar la orden' });
    }
  }

  static async actualizarEstadoDomicilio(req, res) {
    try {
      const { order_id, estado } = req.body;
      await ordenesModel.actualizarEstadoDomicilio(order_id, estado);
      res.json({ success: true, mensaje: 'Estado de domicilio actualizado' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al actualizar estado de domicilio' });
    }
  }

  // Nuevos endpoints para integración con inventario

  /**
   * Obtener todas las recetas disponibles
   */
  static async getRecetas(req, res) {
    try {
      const recetas = await inventarioService.getRecetas();
      res.status(200).json({ success: true, data: recetas });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener recetas disponibles (con stock suficiente)
   */
  static async getRecetasDisponibles(req, res) {
    try {
      const recetasDisponibles = await inventarioService.getRecetasDisponibles();
      res.status(200).json({ success: true, data: recetasDisponibles });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener una receta específica por ID
   */
  static async getRecetaById(req, res) {
    try {
      const { id } = req.params;
      const receta = await inventarioService.getRecetaById(id);
      res.status(200).json({ success: true, data: receta });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener el costo de una receta
   */
  static async getCostoReceta(req, res) {
    try {
      const { id } = req.params;
      const costo = await inventarioService.getCostoReceta(id);
      res.status(200).json({ success: true, data: costo });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Buscar receta por nombre
   */
  static async buscarRecetaPorNombre(req, res) {
    try {
      const { nombre } = req.params;
      const receta = await inventarioService.buscarRecetaPorNombre(nombre);
      res.status(200).json({ success: true, data: receta });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtener receta por tipo y tamaño
   */
  static async getRecetaPorTipoYTamaño(req, res) {
    try {
      const { tipo, tamaño } = req.params;
      const receta = await inventarioService.getRecetaPorTipoYTamaño(tipo, tamaño);
      res.status(200).json({ success: true, data: receta });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Verificar stock suficiente para una receta
   */
  static async verificarStock(req, res) {
    try {
      const { receta_id, cantidad } = req.body;
      const verificacion = await inventarioService.verificarStockSuficiente(receta_id, cantidad);
      res.status(200).json({ success: true, data: verificacion });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = OrdenesController;


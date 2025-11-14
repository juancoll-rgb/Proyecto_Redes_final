const mysql = require('mysql2/promise');

const connection = mysql.createPool({
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'micro_ordenes'
});

async function obtenerOrdenes() {
  const [rows] = await connection.query('SELECT * FROM ordenes');
  return rows;
}

async function obtenerPorId(order_id) {
  const [rows] = await connection.query(
    'SELECT * FROM ordenes WHERE order_id = ?',
    [order_id]
  );
  return rows[0] || null;
}

async function obtenerPorNombre(nombre) {
  const [rows] = await connection.query(
    'SELECT * FROM ordenes WHERE nombre LIKE ?',
    [`%${nombre}%`]
  );
  return rows;
}

async function obtenerPorCorreo(correo_cajero) {
  const [rows] = await connection.query(
    'SELECT * FROM ordenes WHERE correo_cajero = ?',
    [correo_cajero]
  );
  return rows;
}

async function crearOrden({
  order_id,
  pizza_id,
  quantity,
  unit_price,
  total_price,
  pizza_size,
  pizza_category = null,
  pizza_name = null,
  orden_direccion = null,
  receta_id = null,
  estado = 'pendiente',
  modo_entrega = 'para_llevar',
  nombre = null,
  correo_cajero
}) {
  console.log('🔍 Parámetros recibidos en crearOrden:', {
    order_id, pizza_id, quantity, unit_price, total_price, 
    pizza_size, pizza_category, pizza_name, orden_direccion, 
    receta_id, estado, modo_entrega, nombre, correo_cajero
  });
  // Mantener order_id como string
  const orderIdStr = order_id;
  
  // Mapear tamaños de pizza a los valores del enum
  const sizeMapping = {
    'PEQUEÑA': 'S',
    'PEQUEÑO': 'S',
    'SMALL': 'S',
    'S': 'S',
    'MEDIANA': 'M',
    'MEDIANO': 'M',
    'MEDIUM': 'M',
    'M': 'M',
    'GRANDE': 'L',
    'LARGE': 'L',
    'L': 'L',
    'FAMILIAR': 'XL',
    'FAMILY': 'XL',
    'XL': 'XL',
    'EXTRA_LARGE': 'XL'
  };
  
  console.log('🔍 Tamaño recibido:', pizza_size); // Debug
  console.log('🗺️ Mapeo disponible:', sizeMapping); // Debug
  
  const mappedSize = sizeMapping[pizza_size] || 'M';
  console.log('✅ Tamaño mapeado:', mappedSize); // Debug
  
  const [result] = await connection.query(
    `INSERT INTO ordenes
     (order_id, pizza_id, quantity, unit_price, total_price,
      pizza_size, pizza_category, pizza_name,
      orden_direccion, receta_id, estado, modo_entrega, nombre, correo_cajero)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderIdStr,
      pizza_id,
      quantity,
      unit_price,
      total_price,
      mappedSize,
      pizza_category,
      pizza_name,
      orden_direccion,
      receta_id,
      estado,
      modo_entrega,
      nombre,
      correo_cajero
    ]
  );
  return result;
}

async function actualizarOrden(order_id, orden) {
  const [result] = await connection.query(
    `UPDATE ordenes
     SET pizza_id=?, quantity=?, unit_price=?, total_price=?,
         pizza_size=?, pizza_category=?, pizza_name=?,
         orden_direccion=?, receta_id=?, estado=?, modo_entrega=?, nombre=?, correo_cajero=?
     WHERE order_id=?`,
    [
      orden.pizza_id,
      orden.quantity,
      orden.unit_price,
      orden.total_price,
      orden.pizza_size,
      orden.pizza_category,
      orden.pizza_name,
      orden.orden_direccion || null,
      orden.receta_id || null,
      orden.estado || 'pendiente',
      orden.modo_entrega || 'para_llevar',
      orden.nombre || null,
      orden.correo_cajero,
      order_id
    ]
  );
  return result;
}

async function patchOrden(order_id, campos) {
  const keys = Object.keys(campos);
  const values = Object.values(campos);
  if (keys.length === 0) return null;
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const sql = `UPDATE ordenes SET ${setClause} WHERE order_id = ?`;
  const [result] = await connection.query(sql, [...values, order_id]);
  return result;
}

async function eliminarOrden(order_id) {
  const [result] = await connection.query(
    'DELETE FROM ordenes WHERE order_id = ?',
    [order_id]
  );
  return result;
}

async function actualizarEstadoDomicilio(order_id, estado) {
  const [result] = await connection.query(
    'UPDATE ordenes SET estado = ? WHERE order_id = ?',
    [estado, order_id]
  );
  return result;
}

module.exports = {
  obtenerOrdenes,
  obtenerPorId,
  obtenerPorNombre,
  obtenerPorCorreo,
  crearOrden,
  actualizarOrden,
  eliminarOrden,
  patchOrden,
  actualizarEstadoDomicilio
};


const mysql = require('mysql2/promise');
const axios = require('axios');
const db = mysql.createPool({
  host: 'mysql',
  user: 'root',
  password: 'root', 
  database: 'micro_domicilio'
});

async function crearDomicilio({ order_id, direccion_entrega, nombre, fecha_asignacion, hora_entrega, repartidor_id }) {
  const query = `
    INSERT INTO domicilios (order_id, direccion_entrega, nombre, fecha_asignacion, hora_entrega, repartidor_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.query(query, [order_id, direccion_entrega, nombre, fecha_asignacion, hora_entrega, repartidor_id]);

  const [rows] = await db.query(`SELECT * FROM domicilios WHERE domicilio_id = ?`, [result.insertId]);
  return rows[0];
}

async function validarRepartidorFlexible({ correo, telefono }) {
  const repartidor = await obtenerRepartidorFlexible({ correo, telefono });
  return repartidor && repartidor.estado !== 'inactivo';
}

async function obtenerDomicilioPorId(id) {
  const [rows] = await db.query('SELECT * FROM domicilios WHERE domicilio_id = ?', [id]);
  return rows[0];
}

async function actualizarEstadoDomicilio(id, estado) {
  const query = `UPDATE domicilios SET estado = ? WHERE domicilio_id = ?`;
  return db.query(query, [estado, id]);
}

async function obtenerRepartidorFlexible({ correo, telefono }) {
  if (correo) {
    const [rows] = await db.query('SELECT * FROM repartidores WHERE correo = ?', [correo]);
    return rows[0];
  }
  if (telefono) {
    const [rows] = await db.query('SELECT * FROM repartidores WHERE telefono = ?', [telefono]);
    return rows[0];
  }
  return null;
}

async function actualizarEstadoRepartidor(id, estado) {
  const query = `UPDATE repartidores SET estado = ? WHERE repartidor_id = ?`;
  return db.query(query, [estado, id]);
}

async function eliminarRepartidor(id) {
  return db.query(`DELETE FROM repartidores WHERE repartidor_id = ?`, [id]);
}

async function obtenerRepartidorActivo() {
  const [rows] = await db.query(`SELECT * FROM repartidores WHERE estado = 'activo' LIMIT 1`);
  return rows[0];
}

async function validarRepartidor({ correo, telefono}) {
  try {
    const response = await axios.post('http://localhost:3000/api/usuarios/validar', {
      correo, telefono
    });

    const { rol, estado } = response.data;
    return rol === 'repartidor' && estado === 'activo';
  } catch (err) {
    console.error('Error al validar repartidor:', err.message);
    return false;
  }
  // Simulación de validación contra microservicio de usuarios
  // Aquí deberías hacer una petición HTTP real
  
}

module.exports = {
  crearDomicilio,
  actualizarEstadoDomicilio,
  obtenerRepartidorFlexible,
  actualizarEstadoRepartidor,
  eliminarRepartidor,
  obtenerRepartidorActivo,
  validarRepartidor,
  validarRepartidorFlexible,
  obtenerDomicilioPorId
};

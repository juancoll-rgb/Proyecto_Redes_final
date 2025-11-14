const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'mysql',
    user: 'root',
    password: 'root',
    database: 'capasProveedores'
});

// Traer todos los ingredientes
async function traerIngredientes() {
    const [result] = await connection.query('SELECT * FROM ingredientes');
    return result;
}

// Traer un ingrediente por ID
async function traerIngrediente(id) {
    const [result] = await connection.query('SELECT * FROM ingredientes WHERE id = ?', [id]);
    return result;
}

// Crear nuevo ingrediente
async function crearIngrediente(nombre, stock_actual, proveedor) {
    const query = 'INSERT INTO ingredientes (nombre, stock_actual, proveedor) VALUES (?, ?, ?)';
    const [result] = await connection.execute(query, [nombre, stock_actual, proveedor]);
    return result;
}

// Crear pedido con estado por defecto
async function crearPedido(ingrediente_id, cantidad, estado = 'pendiente') {
    const query = 'INSERT INTO pedidos (ingrediente_id, cantidad, estado) VALUES (?, ?, ?)';
    const [result] = await connection.execute(query, [ingrediente_id, cantidad, estado]);
    return result;
}

// Traer todos los pedidos (uniendo con el nombre del ingrediente)
async function traerPedidos() {
    const [result] = await connection.query(`
        SELECT p.id, p.ingrediente_id, i.nombre AS ingrediente, p.cantidad, p.estado
        FROM pedidos p
        JOIN ingredientes i ON p.ingrediente_id = i.id
    `);
    return result;
}

// Actualizar estado de un pedido
async function actualizarEstadoPedido(id, estado) {
    const query = 'UPDATE pedidos SET estado = ? WHERE id = ?';
    const [result] = await connection.execute(query, [estado, id]);
    return result;
}

// Actualizar stock de un ingrediente
async function actualizarStock(id, cantidad) {
    const query = 'UPDATE ingredientes SET stock_actual = stock_actual + ? WHERE id = ?';
    const [result] = await connection.execute(query, [cantidad, id]);
    return result;
}

module.exports = {
    traerIngredientes,
    traerIngrediente,
    crearIngrediente,
    crearPedido,
    traerPedidos,
    actualizarEstadoPedido,
    actualizarStock
};

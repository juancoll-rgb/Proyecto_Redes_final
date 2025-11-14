CREATE DATABASE IF NOT EXISTS capasProveedores;
USE capasProveedores;

-- Tabla de ingredientes
CREATE TABLE IF NOT EXISTS ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    proveedor VARCHAR(100) NOT NULL
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id INT NOT NULL,
    cantidad INT NOT NULL,
    estado ENUM('pendiente', 'en_proceso', 'entregado', 'cancelado') 
        NOT NULL DEFAULT 'pendiente',
    
    CONSTRAINT fk_ingrediente
        FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
        ON DELETE CASCADE
);


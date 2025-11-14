CREATE DATABASE IF NOT EXISTS micro_ordenes;
USE micro_ordenes;

CREATE TABLE ordenes (
  order_id VARCHAR(50) PRIMARY KEY,
  pizza_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  pizza_size ENUM('S', 'M', 'L', 'XL') NOT NULL DEFAULT 'M',
  pizza_category VARCHAR(100),
  pizza_name VARCHAR(100),

  orden_direccion VARCHAR(255),
  receta_id INT,

  estado ENUM('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado')
    NOT NULL DEFAULT 'pendiente',

  modo_entrega ENUM('para_llevar', 'domicilio') NOT NULL DEFAULT 'para_llevar',

  nombre VARCHAR(100),
  correo_cajero VARCHAR(100) NOT NULL
);


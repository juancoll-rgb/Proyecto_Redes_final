CREATE TABLE IF NOT EXISTS repartidores (
  repartidor_id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  correo VARCHAR(100),
  telefono VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS domicilios (
  domicilio_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  direccion_entrega VARCHAR(255),
  nombre VARCHAR(100),
  fecha_asignacion DATE,
  hora_entrega TIME,
  repartidor_id INT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  FOREIGN KEY (repartidor_id) REFERENCES repartidores(repartidor_id)
);


CREATE DATABASE IF NOT EXISTS pizzeria_inventario;
USE pizzeria_inventario;

-- -----------------------------------------------------
-- TABLA: ingredientes
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    unidad_medida VARCHAR(50) NOT NULL,
    costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    alergenos VARCHAR(255),
    vida_util INT,
    proveedor VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- TABLA: stock
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id INT NOT NULL,
    cantidad_disponible DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
    lote VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
);

-- índice útil para búsquedas por ingrediente y lote
CREATE INDEX idx_stock_ingrediente_lote 
ON stock (ingrediente_id, lote);

-- -----------------------------------------------------
-- TABLA: recetas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo_pizza VARCHAR(100) NOT NULL,
    tamano VARCHAR(50) NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    tolerancia_merma DECIMAL(5,2) DEFAULT 5.00,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS receta_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receta_id INT NOT NULL,
    ingrediente_id INT NOT NULL,
    cantidad_requerida DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (receta_id) REFERENCES recetas(id),
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
);

CREATE INDEX idx_receta_ingredientes_receta ON receta_ingredientes (receta_id);
CREATE INDEX idx_receta_ingredientes_ingrediente ON receta_ingredientes (ingrediente_id);


CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id INT NOT NULL,
    tipo_movimiento ENUM('ENTRADA', 'SALIDA') NOT NULL,
    motivo VARCHAR(255),
    cantidad DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100),
    usuario VARCHAR(100),
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
);

CREATE INDEX idx_movimientos_fecha ON movimientos_inventario (fecha_movimiento);
CREATE INDEX idx_movimientos_ingrediente ON movimientos_inventario (ingrediente_id);


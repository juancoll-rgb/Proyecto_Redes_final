/**
 * Buscar receta por nombre
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 * Se mantiene para evitar errores de importación en ordenesController.js
 */
async function buscarPorNombre(nombre) {
  // Esta función es un placeholder. La búsqueda real se hace en inventarioService.
  // Podría devolver un ID de receta simulado o null.
  console.warn(`[RecetasModel] Buscando receta por nombre: ${nombre}. Esta es una función placeholder.`);
  // Retorna un objeto simulado si el nombre coincide con alguna receta conocida para pruebas
  if (nombre.toLowerCase().includes('margarita')) {
    return { id: 1, nombre: 'Pizza Margarita Mediana' };
  }
  return null;
}

/**
 * Obtener todas las recetas
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 */
async function obtenerRecetas() {
  console.warn('[RecetasModel] obtenerRecetas() es un placeholder. Use inventarioService.getRecetas()');
  return [];
}

/**
 * Obtener receta por ID
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 */
async function obtenerPorId(id) {
  console.warn(`[RecetasModel] obtenerPorId(${id}) es un placeholder. Use inventarioService.getRecetaById()`);
  return null;
}

/**
 * Crear receta
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 */
async function crearReceta(receta) {
  console.warn('[RecetasModel] crearReceta() es un placeholder. Las recetas se gestionan en micro_inventario');
  throw new Error('Las recetas se gestionan en el microservicio de inventario');
}

/**
 * Actualizar receta
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 */
async function actualizarReceta(id, receta) {
  console.warn('[RecetasModel] actualizarReceta() es un placeholder. Las recetas se gestionan en micro_inventario');
  throw new Error('Las recetas se gestionan en el microservicio de inventario');
}

/**
 * Eliminar receta
 * Nota: Este modelo es un placeholder. La lógica de recetas se maneja en micro_inventario.
 */
async function eliminarReceta(id) {
  console.warn('[RecetasModel] eliminarReceta() es un placeholder. Las recetas se gestionan en micro_inventario');
  throw new Error('Las recetas se gestionan en el microservicio de inventario');
}

module.exports = {
  buscarPorNombre,
  obtenerRecetas,
  obtenerPorId,
  crearReceta,
  actualizarReceta,
  eliminarReceta
};


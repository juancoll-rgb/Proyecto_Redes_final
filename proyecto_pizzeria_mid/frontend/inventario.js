// Configuración de servicios
const INVENTARIO_BASE = (window.location.hostname === 'elsalamidelitaliano.com')
  ? 'https://elsalamidelitaliano.com:3001'
  : 'http://localhost:3001';

const USUARIOS_BASE = (window.location.hostname === 'elsalamidelitaliano.com')
  ? 'https://elsalamidelitaliano.com/usuarios'
  : 'http://localhost:3000/usuarios';

function setBadge(level = 'info') {
  const badge = document.getElementById('badgeInfo');
  badge.textContent = level.toUpperCase();
}

function showAlert(message, type = 'info') {
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : type} mb-2" role="alert">${message}</div>`;
}

function clearAlert() {
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = '';
}

function renderTable({ headers, rows }) {
  const thead = `<thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="table-responsive"><table class="table table-sm table-striped align-middle">${thead}${tbody}</table></div>`;
}

function renderEmpty(message = 'Sin datos para mostrar') {
  return `<div class="text-center text-muted py-5"><i class="bi bi-inbox me-2"></i>${message}</div>`;
}

function setView(html) {
  const view = document.getElementById('view');
  view.innerHTML = html;
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('userRol');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (rol === 'Admin') {
    const email = localStorage.getItem('userEmail');
    if (email) headers['x-user-email'] = email;
  }
  return headers;
}

// Helpers de unidades y formato
function getUnitDecimals(unidad) {
  const u = String(unidad || '').toLowerCase();
  if (u.includes('kg') || u.includes('lt')) return 3;
  if (u.includes('und') || u === 'unidad' || u === 'unid') return 0;
  if (u.includes('g') || u.includes('ml')) return 0;
  return 3; // por defecto, 3 decimales para cantidades continuas
}

function roundTo(value, decimals = 3) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function formatQty(value, unidad) {
  const decimals = getUnitDecimals(unidad);
  const n = roundTo(value, decimals);
  return (decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals));
}

async function apiGet(path) {
  const res = await fetch(`${INVENTARIO_BASE}${path}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
  return data;
}

async function apiSend(path, method, body) {
  const res = await fetch(`${INVENTARIO_BASE}${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Error en la solicitud');
  return data;
}

// Funciones específicas para usuarios
async function usuariosApiGet(path) {
  const res = await fetch(`${USUARIOS_BASE}${path}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.msg || data.error || 'Error en la solicitud');
  return data;
}

async function usuariosApiSend(path, method, body) {
  const res = await fetch(`${USUARIOS_BASE}${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.msg || data.error || 'Error en la solicitud');
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Validar acceso
  const rol = localStorage.getItem('userRol');
  const token = localStorage.getItem('token');
  if (!token || rol !== 'Admin') {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar la página (evitar parpadeo)
  document.documentElement.style.visibility = 'visible';

  // Botones
  document.getElementById('btnInicio').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  document.getElementById('btnSalir').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRol');
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
  });

  document.getElementById('btnIngredientes').addEventListener('click', async () => {
    try {
      clearAlert();
      setBadge('cargando');
      const resp = await apiGet('/api/ingredientes');
      const items = resp.data || resp; // soporta ambos formatos
      if (!items || items.length === 0) {
        setView(renderEmpty('No hay ingredientes registrados'));
      } else {
        const headers = ['Nombre', 'Unidad', 'Costo', 'Proveedor', 'Activo', 'Acciones'];
        const rows = items.map(i => {
          const acciones = `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary" data-action="edit" data-id="${i.id}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" data-action="del" data-id="${i.id}"><i class="bi bi-trash"></i></button>
            </div>`;
          return [
            i.nombre ?? '-',
            i.unidad_medida ?? '-',
            (i.costo_unitario != null ? `$ ${Number(i.costo_unitario).toFixed(2)}` : '-'),
            i.proveedor ?? '-',
            (i.activo === 0 || i.activo === false) ? '<span class="badge text-bg-secondary">No</span>' : '<span class="badge text-bg-success">Sí</span>',
            acciones
          ];
        });
        setView(renderTable({ headers, rows }));
        bindIngredientesActions(items);
      }
      setBadge('ok');
    } catch (e) {
      setBadge('error');
      showAlert(e.message, 'danger');
      setView(renderEmpty('No fue posible cargar los ingredientes'));
    }
  });

  // Abrir modal para nuevo
  document.getElementById('btnNuevoIngrediente').addEventListener('click', () => {
    openIngredienteModal();
  });

  // Botones de usuarios
  const btnUsuariosEl = document.getElementById('btnUsuarios');
  if (btnUsuariosEl) btnUsuariosEl.addEventListener('click', async () => {
    try {
      clearAlert();
      setBadge('cargando');
      const usuarios = await usuariosApiGet('/');
      if (!usuarios || usuarios.length === 0) {
        setView(renderEmpty('No hay usuarios registrados'));
      } else {
        const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones'];
        const rows = usuarios.map(u => {
          const acciones = `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary" data-action="edit-user" data-id="${u.id}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" data-action="del-user" data-id="${u.id}"><i class="bi bi-trash"></i></button>
            </div>`;
          const estadoNorm = String(u.estado ?? '').trim().toLowerCase();
          return [
            u.id ?? '-',
            u.nombre ?? '-',
            u.email ?? '-',
            u.telefono ?? '-',
            u.rol ?? '-',
            estadoNorm === 'activo' ? '<span class="badge text-bg-success">Activo</span>' : '<span class="badge text-bg-secondary">Inactivo</span>',
            acciones
          ];
        });
        setView(renderTable({ headers, rows }));
        bindUsuariosActions(usuarios);
      }
      setBadge('ok');
    } catch (e) {
      setBadge('error');
      showAlert(e.message, 'danger');
      setView(renderEmpty('No fue posible cargar los usuarios'));
    }
  });

  // Abrir modal para nuevo usuario
  const btnNuevoUsuarioEl = document.getElementById('btnNuevoUsuario');
  if (btnNuevoUsuarioEl) btnNuevoUsuarioEl.addEventListener('click', () => {
    openUsuarioModal();
  });

  document.getElementById('btnStockBajo').addEventListener('click', async () => {
    try {
      clearAlert();
      setBadge('cargando');
      const resp = await apiGet('/api/stock/bajo-umbral');
      const items = resp.data || resp;
      if (!items || items.length === 0) {
        setView(renderEmpty('No hay alertas de stock bajo'));
      } else {
        const headers = ['Ingrediente', 'Unidad', 'Disponible', 'Mínimo', 'Déficit', 'Lote', 'Vence', 'Acciones'];
        const rows = items.map(s => {
          const unidad = s.unidad_medida ?? '';
          const disponible = Number(s.cantidad_disponible ?? 0);
          const minimo = Number(s.min_threshold ?? 0);
          const deficit = Math.max(0, roundTo(minimo - disponible, getUnitDecimals(unidad)));
          const acciones = deficit > 0 ? `
            <button class="btn btn-sm btn-success" data-action="buy" data-ing="${s.ingrediente_id}" data-deficit="${deficit}" data-lote="${s.lote || ''}">
              <i class="bi bi-cart-plus me-1"></i>Hacer compra
            </button>` : '<span class="text-muted">-</span>';
          return [
            s.nombre ?? '-',
            unidad || '-',
            isFinite(disponible) ? formatQty(disponible, unidad) : '-',
            isFinite(minimo) ? formatQty(minimo, unidad) : '-',
            isFinite(deficit) ? formatQty(deficit, unidad) : '-',
            s.lote ?? '-',
            s.fecha_vencimiento ? new Date(s.fecha_vencimiento).toLocaleDateString() : '-',
            acciones
          ];
        });
        setView(renderTable({ headers, rows }));
        bindStockBajoActions(items);
      }
      setBadge('ok');
    } catch (e) {
      setBadge('error');
      showAlert(e.message, 'danger');
      setView(renderEmpty('No fue posible cargar el stock'));
    }
  });

  // eliminado: botón de recetas disponibles

  // Botón ver recetas (CRUD)
  const btnRecetasEl = document.getElementById('btnRecetas');
  if (btnRecetasEl) btnRecetasEl.addEventListener('click', async () => {
    try {
      clearAlert();
      setBadge('cargando');
      const resp = await apiGet('/api/recetas');
      const recetas = resp.data || resp;
      if (!recetas || recetas.length === 0) {
        setView(renderEmpty('No hay recetas registradas'));
      } else {
        const headers = ['ID', 'Nombre', 'Tipo', 'Tamaño', 'Precio Base', 'Costo Estimado', 'Acciones'];
        const rows = recetas.map(r => {
          const acciones = `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary" data-action="edit-receta" data-id="${r.id}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" data-action="del-receta" data-id="${r.id}"><i class="bi bi-trash"></i></button>
            </div>`;
          return [
            r.id ?? '-',
            r.nombre ?? '-',
            r.tipo_pizza ?? '-',
            r.tamano ?? '-',
            (r.precio_base != null ? `$ ${Number(r.precio_base).toFixed(2)}` : '-'),
            (r.costo_estimado != null ? `$ ${Number(r.costo_estimado).toFixed(2)}` : '-'),
            acciones
          ];
        });
        setView(renderTable({ headers, rows }));
        bindRecetasActions(recetas);
      }
      setBadge('ok');
    } catch (e) {
      setBadge('error');
      showAlert(e.message, 'danger');
      setView(renderEmpty('No fue posible cargar las recetas'));
    }
  });

  // Abrir modal nueva receta
  const btnNuevaRecetaEl = document.getElementById('btnNuevaReceta');
  if (btnNuevaRecetaEl) btnNuevaRecetaEl.addEventListener('click', () => {
    openRecetaModal();
  });

  // Guardar modal ingrediente
  document.getElementById('guardarIngredienteBtn').addEventListener('click', async () => {
    try {
      clearAlert();
      const payload = readIngredienteForm();
      if (!payload.nombre || !payload.unidad_medida || payload.costo_unitario === '' || !payload.vida_util) {
        showAlert('Completa los campos requeridos', 'warning');
        return;
      }
      // Validaciones numéricas
      if (!isFinite(payload.costo_unitario) || Number(payload.costo_unitario) <= 0) {
        showAlert('El costo unitario debe ser un número mayor que 0', 'warning');
        return;
      }
      if (!Number.isInteger(Number(payload.vida_util)) || Number(payload.vida_util) <= 0) {
        showAlert('La vida útil debe ser un entero mayor que 0', 'warning');
        return;
      }

      // Normalizar tipos
      const normalized = {
        nombre: payload.nombre,
        unidad_medida: payload.unidad_medida,
        costo_unitario: Number(Number(payload.costo_unitario).toFixed(2)),
        alergenos: payload.alergenos,
        vida_util: Number(payload.vida_util),
        proveedor: payload.proveedor
      };

      if (payload.id) {
        await apiSend(`/api/ingredientes/${payload.id}`, 'PUT', normalized);
        showAlert('Ingrediente actualizado', 'success');
      } else {
        await apiSend('/api/ingredientes', 'POST', normalized);
        showAlert('Ingrediente creado', 'success');
      }
      closeIngredienteModal();
      // Recargar lista
      document.getElementById('btnIngredientes').click();
    } catch (e) {
      showAlert(e.message, 'danger');
    }
  });

  // Guardar receta (solo si existe el botón en el DOM)
  const guardarRecetaBtnEl = document.getElementById('guardarRecetaBtn');
  if (guardarRecetaBtnEl) guardarRecetaBtnEl.addEventListener('click', async () => {
    try {
      clearAlert();
      const payload = readRecetaForm();
      if (!payload.nombre || !payload.tipo_pizza || !payload.tamano || !isFinite(payload.precio_base)) {
        showAlert('Completa los campos de la receta (nombre, tipo, tamaño, precio)', 'warning');
        return;
      }
      if (!payload.ingredientes || payload.ingredientes.length === 0) {
        showAlert('Agrega al menos un ingrediente con cantidad', 'warning');
        return;
      }

      // Construir cuerpo sin id y con tipos numéricos correctos
      const body = {
        nombre: payload.nombre,
        tipo_pizza: payload.tipo_pizza,
        tamano: payload.tamano,
        precio_base: Number(Number(payload.precio_base).toFixed(2)),
        tolerancia_merma: isFinite(payload.tolerancia_merma) ? Number(Number(payload.tolerancia_merma).toFixed(2)) : 5.00,
        ingredientes: payload.ingredientes.map(i => ({
          ingrediente_id: Number(i.ingrediente_id),
          cantidad_requerida: Number(Number(i.cantidad_requerida).toFixed(3))
        }))
      };

      if (payload.id) {
        await apiSend(`/api/recetas/${payload.id}`, 'PUT', body);
        showAlert('Receta actualizada', 'success');
      } else {
        await apiSend('/api/recetas', 'POST', body);
        showAlert('Receta creada', 'success');
      }
      closeRecetaModal();
      document.getElementById('btnRecetas').click();
    } catch (e) {
      showAlert(`Error guardando receta: ${e.message}`, 'danger');
    }
  });

  // Guardar modal usuario
  document.getElementById('guardarUsuarioBtn').addEventListener('click', async () => {
    try {
      clearAlert();
      const payload = readUsuarioForm();
      if (!payload.nombre || !payload.email || !payload.telefono || !payload.rol || !payload.estado) {
        showAlert('Completa todos los campos requeridos', 'warning');
        return;
      }
      
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        showAlert('Ingresa un correo electrónico válido', 'warning');
        return;
      }

      // Validar contraseña para nuevos usuarios
      if (!payload.id && (!payload.password || payload.password.length < 6)) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
      }

      // Preparar payload para la API
      const userData = {
        nombre: payload.nombre,
        email: payload.email.toLowerCase().trim(),
        telefono: payload.telefono,
        rol: payload.rol,
        estado: payload.estado
      };

      // Solo incluir password si es nuevo usuario o si se especificó
      if (!payload.id && payload.password) {
        userData.password = payload.password;
      }

      if (payload.id) {
        await usuariosApiSend(`/${payload.id}`, 'PUT', userData);
        showAlert('Usuario actualizado correctamente', 'success');
      } else {
        await usuariosApiSend('/register', 'POST', userData);
        showAlert('Usuario creado correctamente', 'success');
      }
      closeUsuarioModal();
      // Recargar lista
      document.getElementById('btnUsuarios').click();
    } catch (e) {
      showAlert(e.message, 'danger');
    }
  });
});

// Helpers CRUD Ingredientes
function bindIngredientesActions(items) {
  const view = document.getElementById('view');
  view.querySelectorAll('button[data-action]')?.forEach(btn => {
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const item = items.find(x => String(x.id) === String(id));
    if (action === 'edit') {
      btn.addEventListener('click', () => openIngredienteModal(item));
    } else if (action === 'del') {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar ingrediente "${item?.nombre}"?`)) return;
        try {
          await apiSend(`/api/ingredientes/${id}`, 'DELETE');
          showAlert('Ingrediente eliminado', 'success');
          document.getElementById('btnIngredientes').click();
        } catch (e) {
          showAlert(e.message, 'danger');
        }
      });
    }
  });
}

// Helpers CRUD Recetas
function bindRecetasActions(recetas) {
  const view = document.getElementById('view');
  view.querySelectorAll('button[data-action]')?.forEach(btn => {
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const receta = recetas.find(x => String(x.id) === String(id));
    if (action === 'edit-receta') {
      btn.addEventListener('click', async () => {
        // Cargar ingredientes de receta si no vienen incluidos
        openRecetaModal(receta);
      });
    } else if (action === 'del-receta') {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar receta "${receta?.nombre}"?`)) return;
        try {
          await apiSend(`/api/recetas/${id}`, 'DELETE');
          showAlert('Receta eliminada', 'success');
          document.getElementById('btnRecetas').click();
        } catch (e) {
          showAlert(e.message, 'danger');
        }
      });
    }
  });
}

let recetaModalInstance = null;
function getRecetaModal() {
  if (!recetaModalInstance) {
    const el = document.getElementById('recetaModal');
    recetaModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
  return recetaModalInstance;
}

function renderIngredienteRow({ ingrediente_id = '', nombre = '', unidad = '', cantidad = '' } = {}) {
  return `
    <div class="row g-2 align-items-end mb-2 rec-ing-row">
      <div class="col-6 col-md-5">
        <label class="form-label mb-1">Ingrediente</label>
        <input type="text" class="form-control rec-ing-nombre" placeholder="Nombre (auto)" value="${nombre}" disabled>
        <input type="hidden" class="rec-ing-id" value="${ingrediente_id}">
      </div>
      <div class="col-3 col-md-3">
        <label class="form-label mb-1">Unidad</label>
        <input type="text" class="form-control rec-ing-unidad" value="${unidad}" disabled>
      </div>
      <div class="col-3 col-md-3">
        <label class="form-label mb-1">Cantidad requerida</label>
        <input type="number" step="0.001" min="0" class="form-control rec-ing-cantidad" value="${cantidad}">
      </div>
      <div class="col-12 col-md-1 d-grid">
        <button type="button" class="btn btn-outline-danger btn-sm rec-ing-remove"><i class="bi bi-x"></i></button>
      </div>
    </div>`;
}

async function populateIngredienteRow(container, rowEl) {
  try {
    // Obtener catálogo de ingredientes para selección rápida
    const resp = await apiGet('/api/ingredientes');
    const items = resp.data || resp;
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm mb-1 rec-ing-select';
    select.innerHTML = `<option value="">Seleccionar ingrediente</option>` +
      items.map(i => `<option value="${i.id}" data-unidad="${i.unidad_medida}">${i.nombre}</option>`).join('');

    const nombreInput = rowEl.querySelector('.rec-ing-nombre');
    const unidadInput = rowEl.querySelector('.rec-ing-unidad');
    const idHidden = rowEl.querySelector('.rec-ing-id');
    rowEl.querySelector('.col-6.col-md-5').insertBefore(select, nombreInput);

    select.addEventListener('change', e => {
      const opt = select.selectedOptions[0];
      idHidden.value = select.value || '';
      nombreInput.value = opt ? opt.textContent : '';
      unidadInput.value = opt ? (opt.getAttribute('data-unidad') || '') : '';
    });

    // Botón eliminar
    rowEl.querySelector('.rec-ing-remove').addEventListener('click', () => {
      rowEl.remove();
    });
  } catch (e) {
    showAlert('No fue posible cargar ingredientes para la receta', 'danger');
  }
}

function openRecetaModal(receta) {
  // Título
  document.getElementById('recetaModalTitle').textContent = receta ? 'Editar receta' : 'Nueva receta';
  // Campos base
  document.getElementById('recetaId').value = receta?.id || '';
  document.getElementById('recNombre').value = receta?.nombre || '';
  document.getElementById('recTipo').value = receta?.tipo_pizza || '';
  document.getElementById('recTamano').value = receta?.tamano || '';
  document.getElementById('recPrecio').value = receta?.precio_base != null ? receta.precio_base : '';
  document.getElementById('recMerma').value = receta?.tolerancia_merma != null ? receta.tolerancia_merma : '5.00';

  // Ingredientes dinámicos
  const cont = document.getElementById('recetaIngredientesContainer');
  cont.innerHTML = '';
  const ingList = receta?.ingredientes || [];
  if (ingList.length === 0) {
    cont.insertAdjacentHTML('beforeend', renderIngredienteRow());
  } else {
    ingList.forEach(ing => {
      cont.insertAdjacentHTML('beforeend', renderIngredienteRow({
        ingrediente_id: ing.ingrediente_id,
        nombre: ing.nombre,
        unidad: ing.unidad_medida,
        cantidad: ing.cantidad_requerida
      }));
    });
  }

  // Enriquecer filas con select y acciones
  cont.querySelectorAll('.rec-ing-row').forEach(row => populateIngredienteRow(cont, row));

  // Botón agregar fila
  const btnAdd = document.getElementById('btnAgregarIngReceta');
  btnAdd.onclick = () => {
    cont.insertAdjacentHTML('beforeend', renderIngredienteRow());
    const row = cont.querySelectorAll('.rec-ing-row')[cont.querySelectorAll('.rec-ing-row').length - 1];
    populateIngredienteRow(cont, row);
  };

  getRecetaModal().show();
}

function closeRecetaModal() {
  getRecetaModal().hide();
}

function readRecetaForm() {
  const ingRows = Array.from(document.querySelectorAll('#recetaIngredientesContainer .rec-ing-row'));
  const ingredientes = ingRows.map(r => ({
    ingrediente_id: Number(r.querySelector('.rec-ing-id').value),
    cantidad_requerida: parseFloat(r.querySelector('.rec-ing-cantidad').value)
  })).filter(x => x.ingrediente_id && isFinite(x.cantidad_requerida) && x.cantidad_requerida > 0);

  return {
    id: document.getElementById('recetaId').value || undefined,
    nombre: document.getElementById('recNombre').value.trim(),
    tipo_pizza: document.getElementById('recTipo').value.trim(),
    tamano: document.getElementById('recTamano').value,
    precio_base: parseFloat(document.getElementById('recPrecio').value),
    tolerancia_merma: parseFloat(document.getElementById('recMerma').value || '5.00'),
    ingredientes
  };
}

// Acciones para Stock Bajo (comprar)
function bindStockBajoActions(items) {
  const view = document.getElementById('view');
  view.querySelectorAll('button[data-action="buy"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ingredienteId = Number(btn.getAttribute('data-ing'));
      const deficit = Number(btn.getAttribute('data-deficit')) || 0;
      const lote = btn.getAttribute('data-lote') || `AUTO-${Date.now()}`;
      const item = items.find(x => Number(x.ingrediente_id) === ingredienteId && String(x.lote || '') === String(btn.getAttribute('data-lote') || ''))
        || items.find(x => Number(x.ingrediente_id) === ingredienteId);
      const unidad = item?.unidad_medida || '';
      if (!ingredienteId || deficit <= 0) return;

      // Permitir ajustar la cantidad según la unidad de medida
      // Sugerir una cantidad que supere el mínimo: déficit + margen (10% del mínimo o 1 unidad)
      const minimo = Number(item?.min_threshold ?? 0);
      const margen = Math.max(minimo * 0.10, 1);
      const sugerida = Number((deficit + margen).toFixed(3));
      const entradaStr = prompt(`Cantidad a ingresar (${unidad}). Sugerida para pasar el mínimo: ${sugerida}`,
        String(sugerida));
      if (entradaStr == null) return; // cancelado
      const cantidad = parseFloat(entradaStr);
      if (!isFinite(cantidad) || cantidad <= 0) {
        showAlert('Cantidad inválida', 'warning');
        return;
      }

      try {
        clearAlert();
        setBadge('cargando');
        // Registrar entrada de stock en inventario
        await apiSend('/api/stock/entrada', 'POST', {
          ingrediente_id: ingredienteId,
          cantidad,
          tipo_movimiento: 'ENTRADA',
          motivo: 'Compra a proveedor (rápida)',
          referencia: `COMPRA-${Date.now()}`,
          usuario: localStorage.getItem('userEmail') || 'admin',
          lote
        });
        showAlert('Compra registrada y stock actualizado', 'success');
        // Recargar la vista de stock bajo
        document.getElementById('btnStockBajo').click();
        setBadge('ok');
      } catch (e) {
        setBadge('error');
        showAlert(e.message, 'danger');
      }
    });
  });
}

let ingredienteModalInstance = null;
function getIngredienteModal() {
  if (!ingredienteModalInstance) {
    const el = document.getElementById('ingredienteModal');
    ingredienteModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
  return ingredienteModalInstance;
}

function openIngredienteModal(item) {
  // Título
  document.getElementById('ingredienteModalTitle').textContent = item ? 'Editar ingrediente' : 'Nuevo ingrediente';
  // Form
  document.getElementById('ingId').value = item?.id || '';
  document.getElementById('ingNombre').value = item?.nombre || '';
  document.getElementById('ingUnidad').value = item?.unidad_medida || '';
  document.getElementById('ingCosto').value = (item?.costo_unitario != null ? item.costo_unitario : '');
  document.getElementById('ingVidaUtil').value = item?.vida_util || '';
  document.getElementById('ingProveedor').value = item?.proveedor || '';
  document.getElementById('ingAlergenos').value = item?.alergenos || '';
  getIngredienteModal().show();
}

function closeIngredienteModal() {
  getIngredienteModal().hide();
}

function readIngredienteForm() {
  return {
    id: document.getElementById('ingId').value || undefined,
    nombre: document.getElementById('ingNombre').value.trim(),
    unidad_medida: document.getElementById('ingUnidad').value.trim(),
    costo_unitario: parseFloat(document.getElementById('ingCosto').value),
    alergenos: document.getElementById('ingAlergenos').value.trim() || null,
    vida_util: parseInt(document.getElementById('ingVidaUtil').value, 10),
    proveedor: document.getElementById('ingProveedor').value.trim() || null
  };
}

// Helpers CRUD Usuarios
function bindUsuariosActions(usuarios) {
  const view = document.getElementById('view');
  view.querySelectorAll('button[data-action]')?.forEach(btn => {
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const usuario = usuarios.find(u => String(u.id) === String(id));
    if (action === 'edit-user') {
      btn.addEventListener('click', () => openUsuarioModal(usuario));
    } else if (action === 'del-user') {
      btn.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar usuario "${usuario?.nombre}" (${usuario?.email})?`)) return;
        try {
          await usuariosApiSend(`/email/${encodeURIComponent(usuario.email)}`, 'DELETE');
          showAlert('Usuario eliminado correctamente', 'success');
          document.getElementById('btnUsuarios').click();
        } catch (e) {
          showAlert(e.message, 'danger');
        }
      });
    }
  });
}

let usuarioModalInstance = null;
function getUsuarioModal() {
  if (!usuarioModalInstance) {
    const el = document.getElementById('usuarioModal');
    usuarioModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
  return usuarioModalInstance;
}

function openUsuarioModal(usuario) {
  // Título
  document.getElementById('usuarioModalTitle').textContent = usuario ? 'Editar usuario' : 'Nuevo usuario';
  
  // Form
  document.getElementById('userId').value = usuario?.id || '';
  document.getElementById('userNombre').value = usuario?.nombre || '';
  document.getElementById('userEmail').value = usuario?.email || '';
  document.getElementById('userTelefono').value = usuario?.telefono || '';
  document.getElementById('userRol').value = usuario?.rol || '';
  document.getElementById('userEstado').value = (usuario?.estado ? String(usuario.estado).trim().toLowerCase() : '');
  document.getElementById('userPassword').value = '';
  
  // Ajustar campo de contraseña
  const passwordSection = document.getElementById('passwordSection');
  const passwordInput = document.getElementById('userPassword');
  if (usuario) {
    // Editando usuario existente
    passwordInput.required = false;
    passwordSection.querySelector('.form-text').textContent = 'Dejar vacío para mantener la contraseña actual';
  } else {
    // Nuevo usuario
    passwordInput.required = true;
    passwordSection.querySelector('.form-text').textContent = 'Mínimo 6 caracteres';
  }
  
  getUsuarioModal().show();
}

function closeUsuarioModal() {
  getUsuarioModal().hide();
}

function readUsuarioForm() {
  return {
    id: document.getElementById('userId').value || undefined,
    nombre: document.getElementById('userNombre').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    telefono: document.getElementById('userTelefono').value.trim(),
    rol: document.getElementById('userRol').value,
    estado: document.getElementById('userEstado').value,
    password: document.getElementById('userPassword').value
  };
}



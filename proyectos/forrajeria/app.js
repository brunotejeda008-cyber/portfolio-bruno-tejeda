// ===================== FORRAJERIA MIS VIEJOS =====================
// Gestión de catálogo, inventario, distribuidoras y pedidos.
// Persistencia: localStorage.

const KEYS = {
  productos: 'fmv_productos',
  pedidos: 'fmv_pedidos',
  distribuidoras: 'fmv_distribuidoras',
  nextId: 'fmv_nextId',
  nextPedidoId: 'fmv_nextPedidoId',
  nextDistId: 'fmv_nextDistId',
};

const PRODUCTOS_DEMO = [
  { id: 1, nombre: 'Alfalfa Premium', categoria: 'alimento', descripcion: 'Alfalfa de primera calidad para bovinos y equinos.', precio: 850, stock: 120, stockMin: 30, unidad: 'kg' },
  { id: 2, nombre: 'Maíz Partido', categoria: 'alimento', descripcion: 'Maíz partido ideal para aves y cerdos.', precio: 420, stock: 80, stockMin: 25, unidad: 'kg' },
  { id: 3, nombre: 'Pellet de Soja', categoria: 'alimento', descripcion: 'Alto contenido proteico para ganado.', precio: 960, stock: 15, stockMin: 20, unidad: 'kg' },
  { id: 4, nombre: 'Semilla de Girasol', categoria: 'semilla', descripcion: 'Semilla certificada para siembra.', precio: 1200, stock: 0, stockMin: 10, unidad: 'kg' },
  { id: 5, nombre: 'Semilla de Trigo', categoria: 'semilla', descripcion: 'Trigo pan de alta germinación.', precio: 780, stock: 45, stockMin: 15, unidad: 'kg' },
  { id: 6, nombre: 'Bebedero Automático', categoria: 'accesorio', descripcion: 'Bebedero de acero inoxidable para bovinos.', precio: 3500, stock: 8, stockMin: 3, unidad: 'unidad' },
];

const DISTRIBUIDORAS_DEMO = [
  { id: 1, nombre: 'Distribuidora El Campo', telefono: '5492215551234', contacto: 'Juan Pérez', notas: 'Entregas los martes y jueves.' },
  { id: 2, nombre: 'Agropecuaria La Huerta', telefono: '5492215559876', contacto: 'María Gómez', notas: 'Pedidos mínimos de 20 kg.' },
];

// ===================== ESTADO =====================
let productos = leer('productos', PRODUCTOS_DEMO);
let pedidos = leer('pedidos', []);
let distribuidoras = leer('distribuidoras', DISTRIBUIDORAS_DEMO);
let nextId = leerNumero('nextId', 7);
let nextPedidoId = leerNumero('nextPedidoId', 1);
let nextDistId = leerNumero('nextDistId', 3);

function leer(key, fallback) {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function leerNumero(key, fallback) {
  const n = parseInt(leer(key, fallback), 10);
  return isNaN(n) ? fallback : n;
}

function guardarDatos() {
  try {
    Object.keys(KEYS).forEach(k => localStorage.setItem(KEYS[k], JSON.stringify(
      k === 'productos' ? productos :
      k === 'pedidos' ? pedidos :
      k === 'distribuidoras' ? distribuidoras :
      k === 'nextId' ? nextId :
      k === 'nextPedidoId' ? nextPedidoId : nextDistId
    )));
  } catch (e) {
    mostrarToast('No se pudo guardar en el navegador');
  }
}

// Escapa texto para evitar inyección de HTML en los renderizados.
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function money(n) {
  return '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ===================== NAVEGACIÓN =====================
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');

  if (id === 'catalogo') renderCatalogo();
  if (id === 'inventario') renderInventario();
  if (id === 'pedidos') { renderPedidos(); renderAlertasStock(); }
  if (id === 'distribuidoras') renderDistribuidoras();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== CATÁLOGO =====================
let categoriaActiva = 'todos';

function filtrarCategoria(cat, btn) {
  categoriaActiva = cat;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCatalogo();
}

function buscarEn(lista, termino) {
  if (!termino) return lista;
  const t = termino.toLowerCase().trim();
  return lista.filter(p =>
    (p.nombre || '').toLowerCase().includes(t) ||
    (p.descripcion || '').toLowerCase().includes(t)
  );
}

function renderCatalogo() {
  const grid = document.getElementById('catalogo-grid');
  const termino = document.getElementById('buscar-catalogo')?.value || '';
  let lista = categoriaActiva === 'todos' ? productos : productos.filter(p => p.categoria === categoriaActiva);
  lista = buscarEn(lista, termino);

  if (lista.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-magnifying-glass"></i><p>No se encontraron productos.</p></div>`;
    return;
  }

  const iconos = {
    alimento: '<i class="fa-solid fa-cow"></i>',
    semilla: '<i class="fa-solid fa-leaf"></i>',
    accesorio: '<i class="fa-solid fa-toolbox"></i>',
  };
  const imgs = {
    alimento: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80',
    semilla: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    accesorio: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80',
  };

  grid.innerHTML = lista.map(p => {
    const stockClass = p.stock === 0 ? 'stock-agotado' : p.stock <= p.stockMin ? 'stock-bajo' : 'stock-ok';
    const stockLabel = p.stock === 0 ? 'Sin stock' : p.stock <= p.stockMin ? `Stock bajo: ${p.stock} ${esc(p.unidad)}` : `Stock: ${p.stock} ${esc(p.unidad)}`;
    return `
      <div class="producto-card">
        <img class="producto-card-img" src="${imgs[p.categoria] || imgs.alimento}" alt="${esc(p.nombre)}" loading="lazy" />
        <div class="producto-card-body">
          <span class="categoria-badge">${iconos[p.categoria] || ''} ${esc(p.categoria)}</span>
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion || 'Sin descripción.')}</p>
          <div class="precio">${money(p.precio)} <small style="font-size:0.7rem;color:#95a5a6">/ ${esc(p.unidad)}</small></div>
          <div class="stock-info"><span class="${stockClass}">${stockLabel}</span></div>
        </div>
      </div>`;
  }).join('');
}

// ===================== INVENTARIO =====================
function renderInventario() {
  const tbody = document.getElementById('inventario-body');
  const termino = document.getElementById('buscar-inventario')?.value || '';
  const lista = buscarEn(productos, termino);

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-boxes-stacked"></i><p>${productos.length ? 'No se encontraron productos.' : 'No hay productos cargados.'}</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const estado = p.stock === 0 ? ['badge-agotado', 'Sin stock'] : p.stock <= p.stockMin ? ['badge-bajo', 'Stock bajo'] : ['badge-ok', 'Normal'];
    return `
      <tr>
        <td><strong>${esc(p.nombre)}</strong></td>
        <td>${esc(p.categoria)}</td>
        <td>${money(p.precio)}</td>
        <td>${p.stock} ${esc(p.unidad)}</td>
        <td>${p.stockMin} ${esc(p.unidad)}</td>
        <td><span class="badge ${estado[0]}">${estado[1]}</span></td>
        <td>
          <div class="acciones">
            <button class="btn-icon" title="Editar" onclick="editarProducto(${p.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon" title="Ajustar stock" onclick="ajustarStock(${p.id})"><i class="fa-solid fa-boxes-stacked"></i></button>
            <button class="btn-icon" title="Eliminar" onclick="eliminarProducto(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function abrirModal(id) {
  if (id === 'modal-producto') limpiarFormProducto();
  if (id === 'modal-pedido') limpiarFormPedido();
  if (id === 'modal-distribuidora') limpiarFormDistribuidora();
  document.getElementById(id).classList.add('open');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

function limpiarFormProducto() {
  document.getElementById('form-producto').reset();
  document.getElementById('producto-id').value = '';
  document.getElementById('modal-producto-titulo').innerHTML = '<i class="fa-solid fa-box"></i> Agregar Producto';
}

function guardarProducto(e) {
  e.preventDefault();
  const id = document.getElementById('producto-id').value;
  const prod = {
    nombre: document.getElementById('producto-nombre').value.trim(),
    categoria: document.getElementById('producto-categoria').value,
    descripcion: document.getElementById('producto-descripcion').value.trim(),
    precio: parseFloat(document.getElementById('producto-precio').value),
    stock: parseInt(document.getElementById('producto-stock').value, 10),
    stockMin: parseInt(document.getElementById('producto-stock-min').value, 10),
    unidad: document.getElementById('producto-unidad').value,
  };

  if (id) {
    const idx = productos.findIndex(p => p.id === parseInt(id, 10));
    if (idx >= 0) {
      productos[idx] = { ...productos[idx], ...prod };
      mostrarToast('Producto actualizado ✓');
    }
  } else {
    prod.id = nextId++;
    productos.push(prod);
    mostrarToast('Producto agregado ✓');
  }

  guardarDatos();
  cerrarModal('modal-producto');
  renderInventario();
  renderCatalogo();
  renderAlertasStock();
}

function editarProducto(id) {
  const p = productos.find(p => p.id === id);
  if (!p) return;
  document.getElementById('producto-id').value = p.id;
  document.getElementById('producto-nombre').value = p.nombre;
  document.getElementById('producto-categoria').value = p.categoria;
  document.getElementById('producto-descripcion').value = p.descripcion;
  document.getElementById('producto-precio').value = p.precio;
  document.getElementById('producto-stock').value = p.stock;
  document.getElementById('producto-stock-min').value = p.stockMin;
  document.getElementById('producto-unidad').value = p.unidad;
  document.getElementById('modal-producto-titulo').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Producto';
  document.getElementById('modal-producto').classList.add('open');
}

function ajustarStock(id) {
  const p = productos.find(p => p.id === id);
  if (!p) return;
  const nuevo = prompt(`Stock actual de "${p.nombre}": ${p.stock} ${p.unidad}\nIngresá el nuevo stock:`, p.stock);
  if (nuevo === null) return;
  const val = parseInt(nuevo, 10);
  if (isNaN(val) || val < 0) { alert('Valor inválido.'); return; }
  p.stock = val;
  guardarDatos();
  renderInventario();
  renderCatalogo();
  renderAlertasStock();
  mostrarToast('Stock actualizado ✓');
}

function eliminarProducto(id) {
  const p = productos.find(p => p.id === id);
  if (!p || !confirm(`¿Eliminar "${p.nombre}"?`)) return;
  productos = productos.filter(p => p.id !== id);
  guardarDatos();
  renderInventario();
  renderCatalogo();
  renderAlertasStock();
  mostrarToast('Producto eliminado');
}

// ===================== DISTRIBUIDORAS =====================
function renderDistribuidoras() {
  const tbody = document.getElementById('distribuidoras-body');
  if (distribuidoras.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-industry"></i><p>No hay distribuidoras registradas.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = distribuidoras.map(d => `
    <tr>
      <td><strong>${esc(d.nombre)}</strong></td>
      <td>${d.telefono ? `<a href="https://wa.me/${esc(d.telefono)}" target="_blank" rel="noopener" style="color:var(--verde-agua-oscuro)"><i class="fa-brands fa-whatsapp"></i> +${esc(d.telefono)}</a>` : '<span style="color:var(--gris)">-</span>'}</td>
      <td>${esc(d.contacto || '-')}</td>
      <td>${esc(d.notas || '-')}</td>
      <td>
        <div class="acciones">
          <button class="btn-icon" title="Editar" onclick="editarDistribuidora(${d.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon" title="Eliminar" onclick="eliminarDistribuidora(${d.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function limpiarFormDistribuidora() {
  document.getElementById('form-distribuidora').reset();
  document.getElementById('dist-id').value = '';
  document.getElementById('modal-dist-titulo').innerHTML = '<i class="fa-solid fa-industry"></i> Agregar Distribuidora';
}

function guardarDistribuidora(e) {
  e.preventDefault();
  const id = document.getElementById('dist-id').value;
  const dist = {
    nombre: document.getElementById('dist-nombre').value.trim(),
    telefono: document.getElementById('dist-telefono').value.trim(),
    contacto: document.getElementById('dist-contacto').value.trim(),
    notas: document.getElementById('dist-notas').value.trim(),
  };
  if (id) {
    const idx = distribuidoras.findIndex(d => d.id === parseInt(id, 10));
    if (idx >= 0) {
      distribuidoras[idx] = { ...distribuidoras[idx], ...dist };
      mostrarToast('Distribuidora actualizada ✓');
    }
  } else {
    dist.id = nextDistId++;
    distribuidoras.push(dist);
    mostrarToast('Distribuidora agregada ✓');
  }
  guardarDatos();
  cerrarModal('modal-distribuidora');
  renderDistribuidoras();
}

function editarDistribuidora(id) {
  const d = distribuidoras.find(d => d.id === id);
  if (!d) return;
  document.getElementById('dist-id').value = d.id;
  document.getElementById('dist-nombre').value = d.nombre;
  document.getElementById('dist-telefono').value = d.telefono;
  document.getElementById('dist-contacto').value = d.contacto;
  document.getElementById('dist-notas').value = d.notas;
  document.getElementById('modal-dist-titulo').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Distribuidora';
  document.getElementById('modal-distribuidora').classList.add('open');
}

function eliminarDistribuidora(id) {
  const d = distribuidoras.find(d => d.id === id);
  if (!d || !confirm(`¿Eliminar "${d.nombre}"?`)) return;
  distribuidoras = distribuidoras.filter(d => d.id !== id);
  guardarDatos();
  renderDistribuidoras();
  mostrarToast('Distribuidora eliminada');
}

// ===================== ALERTAS DE STOCK =====================
function renderAlertasStock() {
  const cont = document.getElementById('alertas-stock');
  const bajos = productos.filter(p => p.stock <= p.stockMin);
  if (bajos.length === 0) {
    cont.innerHTML = `<div class="alerta-ok"><i class="fa-solid fa-circle-check"></i> Todos los productos tienen stock suficiente.</div>`;
    return;
  }
  cont.innerHTML = bajos.map(p => {
    const critico = p.stock === 0;
    return `<div class="alerta-item ${critico ? 'critico' : ''}">
      <span><i class="fa-solid fa-circle-exclamation"></i> <strong>${esc(p.nombre)}</strong> — Stock: ${p.stock} ${esc(p.unidad)} (mínimo: ${p.stockMin})</span>
      <button class="btn-primary btn-sm" onclick="pedidoRapido(${p.id})">Pedir</button>
    </div>`;
  }).join('');
}

// ===================== PEDIDOS =====================
function limpiarFormPedido() {
  document.getElementById('form-pedido').reset();
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('pedido-fecha').value = hoy;
  const sel = document.getElementById('pedido-distribuidora');
  sel.innerHTML = '<option value="">Seleccionar distribuidora...</option>' +
    distribuidoras.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('');
  document.getElementById('pedido-telefono').value = '';
  document.getElementById('grupo-wsp-pedido').style.display = 'none';
  const cont = document.getElementById('items-pedido');
  cont.innerHTML = '';
  agregarItemPedido();
  actualizarTotalPedido();
}

function pedidoRapido(id) {
  abrirModal('modal-pedido');
  const select = document.querySelector('#items-pedido .item-producto');
  const prod = productos.find(p => p.id === id);
  if (select && prod) {
    select.value = id;
    const cant = select.closest('.item-pedido').querySelector('.item-cantidad');
    cant.value = Math.max(1, prod.stockMin - prod.stock);
    cant.focus();
    actualizarTotalPedido();
  }
}

function autocompletarDistribuidora() {
  const id = parseInt(document.getElementById('pedido-distribuidora').value, 10);
  const d = distribuidoras.find(d => d.id === id);
  const grupo = document.getElementById('grupo-wsp-pedido');
  if (d && d.telefono) {
    document.getElementById('pedido-telefono').value = d.telefono;
    grupo.style.display = 'block';
  } else {
    document.getElementById('pedido-telefono').value = '';
    grupo.style.display = 'none';
  }
}

function agregarItemPedido() {
  const cont = document.getElementById('items-pedido');
  const div = document.createElement('div');
  div.className = 'item-pedido';
  div.innerHTML = `
    <select class="item-producto">
      <option value="">Seleccionar producto...</option>
      ${productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}
    </select>
    <input type="number" class="item-cantidad" placeholder="Cantidad" min="1" step="1" />
    <button type="button" class="btn-danger btn-sm" title="Quitar" onclick="eliminarItemPedido(this)"><i class="fa-solid fa-xmark"></i></button>`;
  div.querySelector('.item-producto').addEventListener('change', actualizarTotalPedido);
  div.querySelector('.item-cantidad').addEventListener('input', actualizarTotalPedido);
  cont.appendChild(div);
}

function eliminarItemPedido(btn) {
  btn.closest('.item-pedido').remove();
  actualizarTotalPedido();
}

function actualizarTotalPedido() {
  const el = document.getElementById('total-pedido-preview');
  if (!el) return;
  let total = 0;
  document.querySelectorAll('.item-pedido').forEach(item => {
    const prod = productos.find(p => p.id === parseInt(item.querySelector('.item-producto').value, 10));
    const cant = parseFloat(item.querySelector('.item-cantidad').value) || 0;
    if (prod) total += (Number(prod.precio) || 0) * cant;
  });
  el.textContent = `Total estimado: ${money(total)}`;
}

function totalPedido(p) {
  return (p.items || []).reduce((t, i) => {
    const prod = productos.find(x => x.id === i.productoId);
    return t + (Number(i.precio ?? prod?.precio ?? 0) * Number(i.cantidad || 0));
  }, 0);
}

function guardarPedido(e) {
  e.preventDefault();
  const items = [];
  let valido = true;

  document.querySelectorAll('.item-pedido').forEach(item => {
    const prodId = parseInt(item.querySelector('.item-producto').value, 10);
    const cant = parseFloat(item.querySelector('.item-cantidad').value);
    if (prodId && cant > 0) {
      const prod = productos.find(p => p.id === prodId);
      if (prod) items.push({
        productoId: prodId,
        nombre: prod.nombre,
        cantidad: cant,
        precio: prod.precio,
        unidad: prod.unidad,
      });
    } else if (prodId || cant) {
      valido = false;
    }
  });

  if (!valido || items.length === 0) {
    alert('Completá correctamente todos los productos del pedido.');
    return;
  }
  const distId = parseInt(document.getElementById('pedido-distribuidora').value, 10);
  if (!distId) {
    alert('Seleccioná una distribuidora.');
    return;
  }

  const pedido = {
    id: nextPedidoId++,
    distribuidoraId: distId,
    distribuidora: distribuidoras.find(d => d.id === distId)?.nombre || '',
    telefono: document.getElementById('pedido-telefono').value.trim(),
    fecha: document.getElementById('pedido-fecha').value,
    notas: document.getElementById('pedido-notas').value.trim(),
    items,
    estado: 'pendiente',
  };

  pedidos.unshift(pedido);
  guardarDatos();
  cerrarModal('modal-pedido');
  renderPedidos();
  renderAlertasStock();
  mostrarToast('Pedido creado ✓');

  if (pedido.telefono) enviarWhatsApp(pedido);
}

function renderPedidos() {
  const tbody = document.getElementById('pedidos-body');
  if (pedidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-truck"></i><p>No hay pedidos registrados.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = pedidos.map(p => {
    const estadoBadge = { pendiente: 'badge-pendiente', recibido: 'badge-recibido', cancelado: 'badge-cancelado' };
    const resumen = (p.items || []).map(i => `${i.nombre} x${i.cantidad}`).join(', ');
    return `
      <tr>
        <td>${formatFecha(p.fecha)}</td>
        <td><strong>${esc(p.distribuidora)}</strong></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(resumen)}">${esc(resumen)}</td>
        <td>
          <select class="badge ${estadoBadge[p.estado]}" onchange="cambiarEstado(${p.id}, this.value)" aria-label="Estado del pedido">
            <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
            <option value="recibido" ${p.estado === 'recibido' ? 'selected' : ''}>✅ Recibido</option>
            <option value="cancelado" ${p.estado === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
          </select>
        </td>
        <td>
          <div class="acciones">
            <button class="btn-icon" title="Ver detalle" onclick="verPedido(${p.id})"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-icon" title="Eliminar" onclick="eliminarPedido(${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// Aplica (+1) o revierte (-1) el stock de un pedido.
function aplicarStockPedido(pedido, signo) {
  (pedido.items || []).forEach(i => {
    const prod = productos.find(p => p.id === i.productoId);
    if (prod) prod.stock = Math.max(0, (Number(prod.stock) || 0) + signo * (Number(i.cantidad) || 0));
  });
}

function cambiarEstado(id, nuevoEstado) {
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido || pedido.estado === nuevoEstado) return;

  const antes = pedido.estado;
  if (nuevoEstado === 'recibido' && antes !== 'recibido') aplicarStockPedido(pedido, 1);
  else if (antes === 'recibido' && nuevoEstado !== 'recibido') aplicarStockPedido(pedido, -1);

  pedido.estado = nuevoEstado;
  guardarDatos();
  renderPedidos();
  renderInventario();
  renderCatalogo();
  renderAlertasStock();
  mostrarToast(nuevoEstado === 'recibido' ? 'Pedido recibido — stock actualizado ✓' : 'Estado actualizado ✓');
}

let pedidoActualId = null;

function verPedido(id) {
  pedidoActualId = id;
  const p = pedidos.find(p => p.id === id);
  if (!p) return;
  const estadoLabel = { pendiente: '⏳ Pendiente', recibido: '✅ Recibido', cancelado: '❌ Cancelado' };
  const btnWsp = document.getElementById('btn-whatsapp-pedido');
  btnWsp.style.display = p.telefono ? 'inline-flex' : 'none';

  document.getElementById('detalle-pedido-content').innerHTML = `
    <div class="detalle-pedido">
      <div class="info-row"><span>Pedido N°</span><span>#${p.id}</span></div>
      <div class="info-row"><span>Distribuidora</span><span>${esc(p.distribuidora)}</span></div>
      ${p.telefono ? `<div class="info-row"><span>WhatsApp</span><span>+${esc(p.telefono)}</span></div>` : ''}
      <div class="info-row"><span>Fecha</span><span>${formatFecha(p.fecha)}</span></div>
      <div class="info-row"><span>Estado</span><span>${estadoLabel[p.estado] || esc(p.estado)}</span></div>
      ${p.notas ? `<div class="info-row"><span>Notas</span><span>${esc(p.notas)}</span></div>` : ''}
      <div style="margin-top:16px">
        <strong style="color:var(--verde-oscuro)">Productos:</strong>
        <table style="width:100%;margin-top:8px;border-collapse:collapse">
          <thead style="background:var(--fondo)">
            <tr>
              <th style="padding:8px;text-align:left;font-size:0.85rem">Producto</th>
              <th style="padding:8px;text-align:right;font-size:0.85rem">Cantidad</th>
              <th style="padding:8px;text-align:right;font-size:0.85rem">Precio</th>
              <th style="padding:8px;text-align:right;font-size:0.85rem">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(p.items || []).map(i => {
              const precio = Number(i.precio ?? productos.find(x => x.id === i.productoId)?.precio ?? 0);
              return `
              <tr style="border-bottom:1px solid var(--gris-claro)">
                <td style="padding:8px;font-size:0.85rem">${esc(i.nombre)}</td>
                <td style="padding:8px;text-align:right;font-size:0.85rem">${i.cantidad} ${esc(i.unidad || '')}</td>
                <td style="padding:8px;text-align:right;font-size:0.85rem">${money(precio)}</td>
                <td style="padding:8px;text-align:right;font-size:0.85rem">${money(precio * i.cantidad)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:10px 8px;text-align:right;font-weight:700">Total</td>
            <td style="padding:10px 8px;text-align:right;font-weight:700;color:var(--verde-oscuro)">${money(totalPedido(p))}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>`;
  document.getElementById('modal-ver-pedido').classList.add('open');
}

function eliminarPedido(id) {
  const p = pedidos.find(p => p.id === id);
  if (!p || !confirm('¿Eliminar este pedido?')) return;
  if (p.estado === 'recibido') aplicarStockPedido(p, -1);
  pedidos = pedidos.filter(p => p.id !== id);
  guardarDatos();
  renderPedidos();
  renderInventario();
  renderCatalogo();
  renderAlertasStock();
  mostrarToast('Pedido eliminado');
}

function mensajeWhatsApp(p) {
  const lineas = (p.items || []).map(i => `  • ${i.nombre}: ${i.cantidad} ${i.unidad || ''}`).join('\n');
  return `🌿 *Forrajeria Mis Viejos* — Pedido #${p.id}
📍 Calle 149 entre 49a y 50 N°4978
📅 Fecha: ${formatFecha(p.fecha)}

*Productos solicitados:*
${lineas}${p.notas ? `\n\n📝 Notas: ${p.notas}` : ''}
💰 Total estimado: ${money(totalPedido(p))}`;
}

function enviarWhatsApp(pedido) {
  const p = pedido || pedidos.find(x => x.id === pedidoActualId);
  if (!p || !p.telefono) return;
  window.open(`https://wa.me/${encodeURIComponent(p.telefono)}?text=${encodeURIComponent(mensajeWhatsApp(p))}`, '_blank', 'noopener');
}

// ===================== RESPALDO / RESTAURACIÓN =====================
function exportarDatos() {
  const data = {
    version: 1,
    exportado: new Date().toISOString(),
    productos, pedidos, distribuidoras, nextId, nextPedidoId, nextDistId,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forrajeria-respaldo-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  mostrarToast('Respaldo descargado ✓');
}

function importarDatos(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!Array.isArray(d.productos) || !Array.isArray(d.pedidos) || !Array.isArray(d.distribuidoras)) {
        throw new Error('formato inválido');
      }
      productos = d.productos;
      pedidos = d.pedidos;
      distribuidoras = d.distribuidoras;
      nextId = Math.max(0, ...productos.map(p => p.id || 0)) + 1;
      nextPedidoId = Math.max(0, ...pedidos.map(p => p.id || 0)) + 1;
      nextDistId = Math.max(0, ...distribuidoras.map(d => d.id || 0)) + 1;
      guardarDatos();
      renderTodo();
      mostrarToast('Respaldo importado ✓');
    } catch (err) {
      alert('El archivo no es un respaldo válido.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function restablecerDatos() {
  if (!confirm('¿Restablecer los datos de ejemplo? Se perderán todos los cambios actuales.')) return;
  productos = PRODUCTOS_DEMO.map(p => ({ ...p }));
  distribuidoras = DISTRIBUIDORAS_DEMO.map(d => ({ ...d }));
  pedidos = [];
  nextId = 7;
  nextPedidoId = 1;
  nextDistId = 3;
  guardarDatos();
  renderTodo();
  mostrarToast('Datos de ejemplo restaurados ✓');
}

// ===================== UTILS =====================
function formatFecha(f) {
  if (!f) return '-';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(mostrarToast.timer);
  mostrarToast.timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function renderTodo() {
  renderCatalogo();
  renderInventario();
  renderDistribuidoras();
  renderPedidos();
  renderAlertasStock();
}

// Cerrar modal haciendo click fuera o con Escape.
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) cerrarModal(e.target.id);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
});

// ===================== INIT =====================
renderTodo();

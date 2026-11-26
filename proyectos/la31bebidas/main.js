import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase.js";

let currentUser = null;
let drinks = [];
let orders = [];
let movements = [];
let unsubDrinks = null;
let unsubOrders = null;
let unsubMovements = null;

const loadingView = document.getElementById("loading-view");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authError = document.getElementById("auth-error");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const kpiProducts = document.getElementById("kpi-products");
const kpiUnits = document.getElementById("kpi-units");
const kpiLow = document.getElementById("kpi-low");
const kpiValue = document.getElementById("kpi-value");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const lowStockOnly = document.getElementById("low-stock-only");
const drinksGrid = document.getElementById("drinks-grid");
const emptyDrinks = document.getElementById("empty-drinks");
const movementsList = document.getElementById("movements-list");
const emptyMovements = document.getElementById("empty-movements");
const orderForm = document.getElementById("order-form");
const orderCliente = document.getElementById("order-cliente");
const orderProducto = document.getElementById("order-producto");
const orderCantidad = document.getElementById("order-cantidad");
const orderPrecioUnit = document.getElementById("order-precio-unit");
const orderPrecioTotal = document.getElementById("order-precio-total");
const ordersTbody = document.getElementById("orders-tbody");
const emptyOrders = document.getElementById("empty-orders");
const drinkModal = document.getElementById("drink-modal");
const drinkForm = document.getElementById("drink-form");
const movementModal = document.getElementById("movement-modal");
const movementForm = document.getElementById("movement-form");
const toastEl = document.getElementById("toast");

const currencyFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.add("hidden"), 3000);
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

document.getElementById("btn-google-login").addEventListener("click", async () => {
  authError.classList.add("hidden");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    authError.textContent = err.code === "auth/unauthorized-domain"
      ? "Dominio no autorizado en Firebase Auth. Agregalo en Authorized domains."
      : `No se pudo iniciar sesión: ${err.message}`;
    authError.classList.remove("hidden");
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => { await signOut(auth); });

onAuthStateChanged(auth, (user) => {
  loadingView.classList.add("hidden");
  currentUser = user;
  if (unsubDrinks) { unsubDrinks(); unsubDrinks = null; }
  if (unsubOrders) { unsubOrders(); unsubOrders = null; }
  if (unsubMovements) { unsubMovements(); unsubMovements = null; }
  if (!user) { authView.classList.remove("hidden"); appView.classList.add("hidden"); return; }
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userName.textContent = user.displayName || user.email;
  if (user.photoURL) { userAvatar.src = user.photoURL; userAvatar.classList.remove("hidden"); } else { userAvatar.classList.add("hidden"); }
  subscribeToData();
});

function subscribeToData() {
  unsubDrinks = onSnapshot(query(collection(db, "drinks"), orderBy("name")), (snap) => {
    drinks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderKpis(); renderDrinks(); renderOrderProductOptions();
  });
  unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100)), (snap) => {
    orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderOrders();
  });
  unsubMovements = onSnapshot(query(collection(db, "movements"), orderBy("createdAt", "desc"), limit(50)), (snap) => {
    movements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMovements();
  });
}

function renderKpis() {
  kpiProducts.textContent = drinks.length;
  kpiUnits.textContent = drinks.reduce((acc, d) => acc + (Number(d.stock) || 0), 0);
  kpiLow.textContent = drinks.filter((d) => Number(d.stock) <= Number(d.minStock ?? 5)).length;
  kpiValue.textContent = currencyFmt.format(drinks.reduce((acc, d) => acc + (Number(d.stock) || 0) * (Number(d.price) || 0), 0));
}

function renderDrinks() {
  const term = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const onlyLow = lowStockOnly.checked;
  const filtered = drinks.filter((d) => {
    if (cat !== "Todas" && d.category !== cat) return false;
    if (onlyLow && Number(d.stock) > Number(d.minStock ?? 5)) return false;
    if (term && !`${d.name || ""} ${d.brand || ""} ${d.size || ""} ${d.notes || ""}`.toLowerCase().includes(term)) return false;
    return true;
  });
  drinksGrid.innerHTML = "";
  if (filtered.length === 0) { emptyDrinks.classList.remove("hidden"); return; }
  emptyDrinks.classList.add("hidden");
  for (const d of filtered) {
    const stock = Number(d.stock) || 0;
    const minStock = Number(d.minStock ?? 5);
    const isOut = stock === 0;
    const isLow = stock > 0 && stock <= minStock;
    const card = document.createElement("article");
    card.className = `drink-card ${isOut ? "out-stock" : isLow ? "low-stock" : ""}`;
    card.innerHTML = `
      <div class="drink-head">
        <div>
          <div class="drink-title">${escapeHtml(d.name)}</div>
          <div class="drink-meta">${escapeHtml([d.brand, d.size].filter(Boolean).join(" · ") || "Sin detalle")}</div>
        </div>
        <span class="badge">${escapeHtml(d.category)}</span>
      </div>
      <div class="stock-row">
        <div>
          <div class="drink-meta">Stock actual (mín: ${minStock})</div>
          <div class="stock-count ${isOut ? "stock-out" : isLow ? "stock-low" : "stock-ok"}">${stock} u.</div>
        </div>
        <div class="quick-controls">
          <button class="qty-btn" data-action="dec" data-id="${d.id}">−</button>
          <button class="qty-btn" data-action="inc" data-id="${d.id}">+</button>
          <button class="btn btn-ghost btn-sm" data-action="move" data-id="${d.id}">Mov.</button>
        </div>
      </div>
      ${d.notes ? `<div class="drink-meta">📝 ${escapeHtml(d.notes)}</div>` : ""}
      <div class="card-footer">
        <span class="price-tag">${currencyFmt.format(Number(d.price) || 0)}</span>
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${d.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${d.id}">Borrar</button>
        </div>
      </div>`;
    drinksGrid.appendChild(card);
  }
}

function renderMovements() {
  movementsList.innerHTML = "";
  if (movements.length === 0) { emptyMovements.classList.remove("hidden"); return; }
  emptyMovements.classList.add("hidden");
  for (const m of movements) {
    const dateStr = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Recién";
    const badgeClass = m.type === "in" ? "move-in" : m.type === "out" ? "move-out" : "move-adjust";
    const sign = m.type === "in" ? "+" : m.type === "out" ? "−" : "=";
    const item = document.createElement("div");
    item.className = "movement-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(m.drinkName)}</strong>
        <div class="drink-meta">${escapeHtml(m.reason || "Movimiento")} · ${m.previousStock} → ${m.newStock} u.</div>
        <div class="drink-meta">${dateStr} · ${escapeHtml(m.userEmail || "")}</div>
      </div>
      <span class="move-badge ${badgeClass}">${sign}${m.quantity} u.</span>`;
    movementsList.appendChild(item);
  }
}

function renderOrderProductOptions() {
  const prevVal = orderProducto.value;
  orderProducto.innerHTML = `<option value="">Seleccioná un producto...</option>`;
  for (const d of drinks) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.name}${d.size ? ` (${d.size})` : ""} — ${currencyFmt.format(Number(d.price) || 0)} · Stock: ${d.stock} u.`;
    orderProducto.appendChild(opt);
  }
  if (prevVal && drinks.some((d) => d.id === prevVal)) orderProducto.value = prevVal;
  updateOrderPricePreview();
}

function updateOrderPricePreview() {
  const drink = drinks.find((d) => d.id === orderProducto.value);
  const qty = Math.max(1, Math.floor(Number(orderCantidad.value) || 0));
  const unitPrice = drink ? Number(drink.price) || 0 : 0;
  orderPrecioUnit.value = currencyFmt.format(unitPrice);
  orderPrecioTotal.value = currencyFmt.format(unitPrice * qty);
}

orderProducto.addEventListener("change", updateOrderPricePreview);
orderCantidad.addEventListener("input", updateOrderPricePreview);

function renderOrders() {
  ordersTbody.innerHTML = "";
  if (orders.length === 0) { emptyOrders.classList.remove("hidden"); return; }
  emptyOrders.classList.add("hidden");
  for (const o of orders) {
    const isCancelled = o.status === "cancelado";
    const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Recién";
    const tr = document.createElement("tr");
    if (isCancelled) tr.className = "row-cancelled";
    tr.innerHTML = `
      <td><strong>${escapeHtml(o.cliente)}</strong></td>
      <td>${escapeHtml(o.producto)}</td>
      <td>${o.cantidad} u.</td>
      <td>${currencyFmt.format(Number(o.precioUnitario) || 0)}</td>
      <td class="total-highlight">${currencyFmt.format(Number(o.precio) || 0)}</td>
      <td><span class="status-badge ${isCancelled ? "status-cancelled" : "status-active"}">${isCancelled ? "Cancelado" : "Activo"}</span></td>
      <td class="drink-meta">${dateStr}</td>
      <td>${isCancelled ? `<span class="drink-meta">—</span>` : `<button class="btn btn-danger btn-sm" data-cancel-order="${o.id}">Cancelar</button>`}</td>`;
    ordersTbody.appendChild(tr);
  }
}

async function applyStockChange(drinkId, type, quantity, reason) {
  const drinkRef = doc(db, "drinks", drinkId);
  const movRef = doc(collection(db, "movements"));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(drinkRef);
    if (!snap.exists()) throw new Error("La bebida ya no existe.");
    const data = snap.data();
    const prev = Number(data.stock) || 0;
    const next = type === "in" ? prev + quantity : Math.max(0, prev - quantity);
    const actualDelta = Math.abs(next - prev);
    if (actualDelta === 0 && type === "out") throw new Error("El stock ya está en 0.");
    tx.update(drinkRef, { stock: next, updatedBy: currentUser.uid, updatedAt: serverTimestamp() });
    tx.set(movRef, { drinkId, drinkName: data.name, type, quantity: actualDelta, previousStock: prev, newStock: next, reason: reason || "Movimiento", userId: currentUser.uid, userEmail: currentUser.email || "", createdAt: serverTimestamp() });
  });
}

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cliente = orderCliente.value.trim();
  const drinkId = orderProducto.value;
  const cantidad = Math.max(1, Math.floor(Number(orderCantidad.value) || 0));
  if (!cliente || !drinkId) { showToast("Completá cliente y producto."); return; }
  const drinkRef = doc(db, "drinks", drinkId);
  const orderRef = doc(collection(db, "orders"));
  const movRef = doc(collection(db, "movements"));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(drinkRef);
      if (!snap.exists()) throw new Error("El producto no existe.");
      const data = snap.data();
      const prevStock = Number(data.stock) || 0;
      if (prevStock < cantidad) throw new Error(`Stock insuficiente: solo hay ${prevStock} u.`);
      const precioUnitario = Number(data.price) || 0;
      const newStock = prevStock - cantidad;
      tx.update(drinkRef, { stock: newStock, updatedBy: currentUser.uid, updatedAt: serverTimestamp() });
      tx.set(orderRef, { cliente, productoId: drinkId, producto: data.name, cantidad, precioUnitario, precio: precioUnitario * cantidad, status: "activo", userId: currentUser.uid, userEmail: currentUser.email || "", createdAt: serverTimestamp() });
      tx.set(movRef, { drinkId, drinkName: data.name, type: "out", quantity: cantidad, previousStock: prevStock, newStock, reason: `Pedido de ${cliente}`, userId: currentUser.uid, userEmail: currentUser.email || "", createdAt: serverTimestamp() });
    });
    orderCliente.value = ""; orderCantidad.value = 1; updateOrderPricePreview();
    showToast("Pedido registrado y descontado del stock");
  } catch (err) { showToast(err.message || "Error al registrar pedido"); }
});

ordersTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-cancel-order]");
  if (!btn) return;
  const id = btn.dataset.cancelOrder;
  const order = orders.find((o) => o.id === id);
  if (!order || order.status === "cancelado") return;
  if (!confirm(`¿Cancelar el pedido de "${order.cliente}"?`)) return;
  const orderRef = doc(db, "orders", id);
  const drinkRef = doc(db, "drinks", order.productoId);
  const movRef = doc(collection(db, "movements"));
  try {
    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) throw new Error("El pedido no existe.");
      const orderData = orderSnap.data();
      if (orderData.status === "cancelado") throw new Error("Ya estaba cancelado.");
      const drinkSnap = await tx.get(drinkRef);
      if (drinkSnap.exists()) {
        const prevStock = Number(drinkSnap.data().stock) || 0;
        const newStock = prevStock + Number(orderData.cantidad);
        tx.update(drinkRef, { stock: newStock, updatedBy: currentUser.uid, updatedAt: serverTimestamp() });
        tx.set(movRef, { drinkId: orderData.productoId, drinkName: orderData.producto, type: "in", quantity: Number(orderData.cantidad), previousStock: prevStock, newStock, reason: `Pedido cancelado (${orderData.cliente})`, userId: currentUser.uid, userEmail: currentUser.email || "", createdAt: serverTimestamp() });
      }
      tx.update(orderRef, { status: "cancelado", cancelledBy: currentUser.uid, cancelledAt: serverTimestamp() });
    });
    showToast("Pedido marcado como cancelado y stock restaurado");
  } catch (err) { showToast(err.message || "Error al cancelar pedido"); }
});

searchInput.addEventListener("input", renderDrinks);
categoryFilter.addEventListener("change", renderDrinks);
lowStockOnly.addEventListener("change", renderDrinks);
document.getElementById("kpi-low-card").addEventListener("click", () => { lowStockOnly.checked = !lowStockOnly.checked; renderDrinks(); });
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById("tab-orders").classList.toggle("hidden", tab !== "orders");
    document.getElementById("tab-inventory").classList.toggle("hidden", tab !== "inventory");
    document.getElementById("tab-movements").classList.toggle("hidden", tab !== "movements");
  });
});
document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", () => document.getElementById(btn.dataset.close).close()));

function openDrinkModal(drink = null) {
  document.getElementById("drink-modal-title").textContent = drink ? "Editar bebida" : "Nueva bebida";
  document.getElementById("drink-id").value = drink?.id || "";
  document.getElementById("drink-name").value = drink?.name || "";
  document.getElementById("drink-brand").value = drink?.brand || "";
  document.getElementById("drink-size").value = drink?.size || "473ml";
  document.getElementById("drink-category").value = drink?.category || "Gaseosas";
  document.getElementById("drink-price").value = drink?.price ?? 0;
  document.getElementById("drink-stock").value = drink?.stock ?? 0;
  document.getElementById("drink-min-stock").value = drink?.minStock ?? 5;
  document.getElementById("drink-notes").value = drink?.notes || "";
  drinkModal.showModal();
}

document.getElementById("btn-new-drink").addEventListener("click", () => openDrinkModal());
document.getElementById("btn-empty-add").addEventListener("click", () => openDrinkModal());

drinkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("drink-id").value;
  const payload = {
    name: document.getElementById("drink-name").value.trim(),
    brand: document.getElementById("drink-brand").value.trim(),
    size: document.getElementById("drink-size").value,
    category: document.getElementById("drink-category").value,
    price: Number(document.getElementById("drink-price").value) || 0,
    stock: Math.max(0, Math.floor(Number(document.getElementById("drink-stock").value) || 0)),
    minStock: Math.max(0, Math.floor(Number(document.getElementById("drink-min-stock").value) || 0)),
    notes: document.getElementById("drink-notes").value.trim(),
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  };
  try {
    if (id) { await updateDoc(doc(db, "drinks", id), payload); showToast("Bebida actualizada"); }
    else { await addDoc(collection(db, "drinks"), { ...payload, createdBy: currentUser.uid, createdAt: serverTimestamp() }); showToast("Bebida agregada"); }
    drinkModal.close();
  } catch (err) { showToast(`Error: ${err.message}`); }
});

drinksGrid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  const drink = drinks.find((d) => d.id === id);
  if (!drink) return;
  try {
    if (action === "inc") await applyStockChange(id, "in", 1, "Entrada rápida (+1)");
    else if (action === "dec") await applyStockChange(id, "out", 1, "Salida rápida (-1)");
    else if (action === "move") {
      document.getElementById("move-drink-id").value = id;
      document.getElementById("move-drink-summary").textContent = `${drink.name} — Stock actual: ${drink.stock} u.`;
      document.getElementById("move-qty").value = 1;
      document.getElementById("move-reason").value = "";
      movementModal.showModal();
    } else if (action === "edit") openDrinkModal(drink);
    else if (action === "delete" && confirm(`¿Eliminar "${drink.name}"?`)) { await deleteDoc(doc(db, "drinks", id)); showToast("Bebida eliminada"); }
  } catch (err) { showToast(err.message || "Error"); }
});

movementForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const drinkId = document.getElementById("move-drink-id").value;
  const type = document.getElementById("move-type").value;
  const qty = Math.max(1, Math.floor(Number(document.getElementById("move-qty").value) || 1));
  const reason = document.getElementById("move-reason").value.trim();
  try { await applyStockChange(drinkId, type, qty, reason); movementModal.close(); showToast("Movimiento registrado"); }
  catch (err) { showToast(err.message || "Error"); }
});

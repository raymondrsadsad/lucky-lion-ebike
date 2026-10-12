/*
 * api.js — THE data layer for Lucky Lion eBike (Supabase backend).
 *
 * Same async interface as before, so no page code changes. Records now live in a
 * shared Postgres database (Supabase) instead of localStorage, so data created on
 * one device (e.g. staff creating a user) is visible on every device.
 *
 * Only the current session (which user is logged in on THIS device) is kept locally.
 */
const API = (() => {
  const BASE = `${SUPABASE.url}/rest/v1`;
  const HEADERS = {
    apikey: SUPABASE.anonKey,
    Authorization: `Bearer ${SUPABASE.anonKey}`,
    'Content-Type': 'application/json'
  };
  const SESSION_KEY = 'LL_SESSION';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---- REST helpers ----
  async function req(path, opts = {}) {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try { const e = await res.json(); msg = e.message || e.hint || msg; } catch { }
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ---- row <-> app object mapping (snake_case DB <-> camelCase JS) ----
  const toApp = (r) => r && ({
    id: r.id, memberId: r.member_id, role: r.role, username: r.username, password: r.password,
    name: r.name, email: r.email, phone: r.phone, address: r.address, ownedModelId: r.owned_model_id,
    avatarUrl: r.avatar_url, branch: r.branch, mustChangePassword: !!r.must_change_password
  });
  const userToRow = (u) => ({
    id: u.id, member_id: u.memberId, role: u.role, username: u.username, password: u.password,
    name: u.name, email: u.email, phone: u.phone, address: u.address, owned_model_id: u.ownedModelId,
    avatar_url: u.avatarUrl, branch: u.branch
  });
  const repToApp = (r) => r && ({
    id: r.id, userId: r.user_id, modelId: r.model_id, date: r.date,
    timeSlot: r.time_slot, status: r.status, notes: r.notes,
    repairType: r.repair_type, cost: r.cost, completedAt: r.completed_at, branch: r.branch
  });
  const msgToApp = (r) => r && ({ id: r.id, userId: r.user_id, sender: r.sender, body: r.body, read: r.read, createdAt: r.created_at });

  // ---- session (per-device) ----
  // Always use localStorage so the session survives the login -> staff.html redirect
  // on all browsers (mobile browsers can drop sessionStorage across navigations).
  const setSession = (id) => localStorage.setItem(SESSION_KEY, id);
  const getSessionId = () => localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);

  return {
    async init() { /* schema + seed live in Supabase (schema.sql). Nothing to do. */ },

    // ---- auth ----
    async login(username, password, remember) {
      const rows = await req(`/users?username=eq.${encodeURIComponent(String(username).trim())}&password=eq.${encodeURIComponent(password)}&select=*`);
      if (!rows || !rows.length) throw new Error('Invalid username or password.');
      setSession(rows[0].id);
      return toApp(rows[0]);
    },
    async logout() { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); },
    async currentUser() {
      const id = getSessionId();
      if (!id) return null;
      const rows = await req(`/users?id=eq.${encodeURIComponent(id)}&select=*`);
      return rows && rows.length ? toApp(rows[0]) : null;
    },

    // ---- users ----
    async getUsers() { return (await req(`/users?select=*&order=created_at`) || []).map(toApp); },
    async getCustomers() { return (await req(`/users?role=eq.customer&select=*`) || []).map(toApp); },
    async createUser(data) {
      const dup = await req(`/users?username=eq.${encodeURIComponent(data.username.trim())}&select=id`);
      if (dup && dup.length) throw new Error('Username already taken.');
      const role = data.role || 'customer';
      // Admins are global (no branch); staff/customers belong to one branch.
      const branch = role === 'admin' ? null : (data.branch || null);
      // Per-branch, per-role member IDs:
      //   customer → TRECE-C-0001   staff → TRECE-S-01   admin → ADMIN-01
      let prefix, pad;
      if (role === 'admin') { prefix = 'ADMIN'; pad = 2; }
      else {
        const code = (typeof branchCode === 'function' && branchCode(branch)) || 'NOBR';
        prefix = `${code}-${role === 'staff' ? 'S' : 'C'}`;
        pad = role === 'staff' ? 2 : 4;
      }
      // Count existing member_ids that share this prefix, take the max running number + 1.
      const existing = await req(`/users?member_id=like.${encodeURIComponent(prefix + '-%')}&select=member_id`) || [];
      const nums = existing.map(x => {
        const m = String(x.member_id || '').match(/(\d+)\s*$/);
        return m ? parseInt(m[1], 10) : 0;
      });
      const memberId = `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(pad, '0')}`;
      const row = userToRow({
        id: uid(), memberId, role, branch, username: data.username.trim(), password: data.password,
        name: data.name || '', email: data.email || '', phone: data.phone || '',
        address: data.address || '', ownedModelId: data.ownedModelId || null
      });
      // #8: a staff/admin-created account gets a TEMPORARY password → force a change on first login.
      // Public self-signup passes mustChange:false (the person chose their own password).
      row.must_change_password = data.mustChange != null ? !!data.mustChange : true;
      let created;
      try { created = await req(`/users`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }); }
      catch (e) {   // column may not exist yet (panel-revisions.sql not run) → create without it
        delete row.must_change_password;
        created = await req(`/users`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      }
      return toApp(created[0]);
    },
    async updateUser(id, patch) {
      const row = {};
      if ('name' in patch) row.name = patch.name;
      if ('email' in patch) row.email = patch.email;
      if ('phone' in patch) row.phone = patch.phone;
      if ('address' in patch) row.address = patch.address;
      if ('ownedModelId' in patch) row.owned_model_id = patch.ownedModelId;
      if ('avatarUrl' in patch) row.avatar_url = patch.avatarUrl;
      if ('branch' in patch) row.branch = patch.branch;
      if ('mustChangePassword' in patch) row.must_change_password = !!patch.mustChangePassword;
      const updated = await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return toApp(updated[0]);
    },
    // #8: set a brand-new password during the forced-change flow (no current needed — the active
    // session already proves identity). Clears the must-change flag.
    async setNewPassword(id, next) {
      await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ password: next, must_change_password: false }) });
      return true;
    },
    // #8: staff/admin reset a customer's password to a temporary one → forces a change on next login.
    async resetPassword(id, tempPass) {
      await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ password: tempPass, must_change_password: true }) });
      return true;
    },
    // Upload a staff avatar image to the shared 'store-photos' bucket; returns the public URL.
    async uploadAvatar(blob) {
      const name = `avatar-${uid()}.jpg`;
      const up = await fetch(`${SUPABASE.url}/storage/v1/object/store-photos/${name}`, {
        method: 'POST',
        headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
        body: blob
      });
      if (!up.ok) { let m = `Upload failed (${up.status})`; try { const e = await up.json(); m = e.message || e.error || m; } catch { } throw new Error(m); }
      return `${SUPABASE.url}/storage/v1/object/public/store-photos/${name}`;
    },
    async deleteUser(id) {
      await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- user e-bike units (a customer can own several) ----
    async getUserEbikes(userId) { return (await req(`/user_ebikes?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at`)) || []; },
    async getAllUserEbikes() { return (await req(`/user_ebikes?select=*&order=created_at`)) || []; },
    // Add a unit to a customer. `detail` may carry a chosen colour variant + the
    // physical identifiers; passing a variantId also decrements that colour's stock.
    async addUserEbike(userId, modelId, detail = {}) {
      const row = {
        id: uid(), user_id: userId, model_id: modelId,
        variant_id: detail.variantId || null, color: detail.color || null,
        chassis_no: detail.chassisNo || null, battery_no: detail.batteryNo || null, motor_no: detail.motorNo || null,
        acquired_at: detail.acquiredAt || new Date().toISOString().slice(0, 10),
        payment_mode: detail.paymentMode || null,
        sale_price: (detail.salePrice === '' || detail.salePrice == null) ? null : Number(detail.salePrice),
        sale_note: detail.saleNote || null
      };
      const rec = await req(`/user_ebikes`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      // Decrement the stock of the branch that handed over the unit (the customer's branch).
      if (detail.variantId && detail.branch) { try { await this.decrementVariantStock(detail.variantId, detail.branch); } catch { } }
      else if (detail.variantId) { try { await this.decrementStock(detail.variantId); } catch { } }
      return rec[0];
    },
    async updateUserEbike(id, patch) {
      const row = {};
      if ('modelId' in patch) row.model_id = patch.modelId;
      if ('variantId' in patch) row.variant_id = patch.variantId || null;
      if ('color' in patch) row.color = patch.color;
      if ('chassisNo' in patch) row.chassis_no = patch.chassisNo;
      if ('batteryNo' in patch) row.battery_no = patch.batteryNo;
      if ('motorNo' in patch) row.motor_no = patch.motorNo;
      if ('acquiredAt' in patch) row.acquired_at = patch.acquiredAt || null;
      if ('paymentMode' in patch) row.payment_mode = patch.paymentMode || null;
      if ('salePrice' in patch) row.sale_price = (patch.salePrice === '' || patch.salePrice == null) ? null : Number(patch.salePrice);
      if ('saleNote' in patch) row.sale_note = patch.saleNote || null;
      const updated = await req(`/user_ebikes?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return updated && updated[0];
    },
    async removeUserEbike(id) {
      await req(`/user_ebikes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },
    async changePassword(id, current, next) {
      const rows = await req(`/users?id=eq.${encodeURIComponent(id)}&select=password`);
      if (!rows || !rows.length) throw new Error('User not found.');
      if (rows[0].password !== current) throw new Error('Current password is incorrect.');
      // #8: changing the password also clears the "must change" flag (retry without it if the column is absent).
      try { await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ password: next, must_change_password: false }) }); }
      catch (e) { await req(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ password: next }) }); }
      return true;
    },

    // ---- repairs ----
    async getRepairs() { return (await req(`/repairs?select=*&order=date`) || []).map(repToApp); },
    async getRepairsByUser(userId) { return (await req(`/repairs?user_id=eq.${encodeURIComponent(userId)}&select=*&order=date`) || []).map(repToApp); },
    // Which time slots on a date are already booked? A repair only frees its slot once it's done.
    async getBookedSlots(date) {
      if (!date) return [];
      const rows = await req(`/repairs?date=eq.${encodeURIComponent(date)}&select=id,time_slot,status`) || [];
      // a repair frees its slot once it's done OR cancelled
      return rows.filter(r => r.status !== 'done' && r.status !== 'cancelled').map(r => ({ id: r.id, slot: r.time_slot }));
    },
    // #13: booked slots for a whole date RANGE at once (one query), for the month calendar.
    // Returns { 'YYYY-MM-DD': ['08:00–10:00', ...] } of slots that still hold a booking.
    async getBookedSlotsRange(startDate, endDate) {
      if (!startDate || !endDate) return {};
      const rows = await req(`/repairs?date=gte.${encodeURIComponent(startDate)}&date=lte.${encodeURIComponent(endDate)}&select=date,time_slot,status`) || [];
      const map = {};
      rows.filter(r => r.status !== 'done' && r.status !== 'cancelled').forEach(r => { (map[r.date] ??= []).push(r.time_slot); });
      return map;
    },
    async createRepair(data) {
      const row = { id: uid(), user_id: data.userId, model_id: data.modelId, date: data.date, time_slot: data.timeSlot, status: 'pending', notes: data.notes || '' };
      // #12: staff/admin create-on-behalf can set a service type + the branch the repair belongs to.
      if (data.repairType) row.repair_type = data.repairType;
      if (data.branch) row.branch = data.branch;
      let created;
      try { created = await req(`/repairs`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }); }
      catch (e) {   // repairs.branch may not exist yet (panel-revisions.sql not run) → create without it
        delete row.branch;
        created = await req(`/repairs`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      }
      return repToApp(created[0]);
    },
    async updateRepairStatus(id, status) {
      // Stamp the completion time when a repair is marked done; clear it if re-opened.
      const body = { status, completed_at: status === 'done' ? new Date().toISOString() : null };
      const updated = await req(`/repairs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) });
      return repToApp(updated[0]);
    },
    async updateRepair(id, patch) {
      const row = {};
      if ('repairType' in patch) row.repair_type = patch.repairType;
      if ('cost' in patch) row.cost = patch.cost;
      if ('notes' in patch) row.notes = patch.notes;
      if ('date' in patch) row.date = patch.date;
      if ('timeSlot' in patch) row.time_slot = patch.timeSlot;
      const updated = await req(`/repairs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return repToApp(updated[0]);
    },
    async deleteRepair(id) {
      await req(`/repairs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- model meta (badges, sale, price overrides, custom models) ----
    async getModelMeta() {
      const rows = await req(`/model_meta?select=*`) || [];
      const o = {}; rows.forEach(r => o[r.id] = r); return o;
    },
    async upsertModelMeta(id, patch) {
      await req(`/model_meta`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id, ...patch }) });
      return true;
    },
    async deleteModelMeta(id) {
      await req(`/model_meta?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- site settings (staff-editable contact info / links) ----
    async getSettings() {
      const rows = await req(`/site_settings?select=key,value`) || [];
      const o = {}; rows.forEach(r => o[r.key] = r.value); return o;
    },
    async updateSettings(patch) {
      const rows = Object.entries(patch).map(([key, value]) => ({ key, value: value ?? '' }));
      if (!rows.length) return true;
      await req(`/site_settings`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) });
      return true;
    },

    // ---- store photos (Supabase Storage bucket 'store-photos') ----
    async getStorePhotos() {
      return (await req(`/store_photos?select=*&order=sort,created_at`)) || [];
    },
    async addStorePhoto(blob) {
      const name = `store-${uid()}.jpg`;
      const up = await fetch(`${SUPABASE.url}/storage/v1/object/store-photos/${name}`, {
        method: 'POST',
        headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
        body: blob
      });
      if (!up.ok) { let m = `Upload failed (${up.status})`; try { const e = await up.json(); m = e.message || e.error || m; } catch { } throw new Error(m); }
      const url = `${SUPABASE.url}/storage/v1/object/public/store-photos/${name}`;
      const rec = await req(`/store_photos`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: uid(), path: name, url }) });
      return rec[0];
    },
    async reorderStorePhotos(ids) {
      for (let i = 0; i < ids.length; i++) {
        await req(`/store_photos?id=eq.${encodeURIComponent(ids[i])}`, { method: 'PATCH', body: JSON.stringify({ sort: i }) });
      }
      return true;
    },
    async deleteStorePhoto(id, path) {
      if (path) {
        await fetch(`${SUPABASE.url}/storage/v1/object/store-photos/${path}`, {
          method: 'DELETE', headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` }
        }).catch(() => { });
      }
      await req(`/store_photos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- model photos (multiple per model; reuses the 'store-photos' bucket) ----
    async getAllModelPhotos() {
      return (await req(`/model_photos?select=*&order=model_id,sort,created_at`)) || [];
    },
    async getModelPhotos(modelId) {
      return (await req(`/model_photos?model_id=eq.${encodeURIComponent(modelId)}&select=*&order=sort,created_at`)) || [];
    },
    // variantId (optional) tags the photo to a colour; null = a general model photo.
    async addModelPhoto(modelId, blob, variantId = null) {
      const name = `model-${uid()}.jpg`;
      const up = await fetch(`${SUPABASE.url}/storage/v1/object/store-photos/${name}`, {
        method: 'POST',
        headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
        body: blob
      });
      if (!up.ok) { let m = `Upload failed (${up.status})`; try { const e = await up.json(); m = e.message || e.error || m; } catch { } throw new Error(m); }
      const url = `${SUPABASE.url}/storage/v1/object/public/store-photos/${name}`;
      const rec = await req(`/model_photos`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: uid(), model_id: modelId, variant_id: variantId, path: name, url, sort: 9999 }) });
      return rec[0];
    },
    async reorderModelPhotos(ids) {
      for (let i = 0; i < ids.length; i++) {
        await req(`/model_photos?id=eq.${encodeURIComponent(ids[i])}`, { method: 'PATCH', body: JSON.stringify({ sort: i }) });
      }
      return true;
    },
    async deleteModelPhoto(id, path) {
      if (path) {
        await fetch(`${SUPABASE.url}/storage/v1/object/store-photos/${path}`, {
          method: 'DELETE', headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` }
        }).catch(() => { });
      }
      await req(`/model_photos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- model color variants (+ per-variant stock) ----
    async getAllModelVariants() {
      return (await req(`/model_variants?select=*&order=model_id,sort,created_at`)) || [];
    },
    async getModelVariants(modelId) {
      return (await req(`/model_variants?model_id=eq.${encodeURIComponent(modelId)}&select=*&order=sort,created_at`)) || [];
    },
    async addVariant(modelId, data = {}) {
      const row = { id: uid(), model_id: modelId, name: data.name || 'Colour', color_hex: data.colorHex || '#888888', stock: Number(data.stock || 0), sort: Number(data.sort || 9999) };
      const rec = await req(`/model_variants`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return rec[0];
    },
    async updateVariant(id, patch) {
      const row = {};
      if ('name' in patch) row.name = patch.name;
      if ('colorHex' in patch) row.color_hex = patch.colorHex;
      if ('stock' in patch) row.stock = Math.max(0, Number(patch.stock) || 0);
      if ('sort' in patch) row.sort = Number(patch.sort) || 0;
      const rec = await req(`/model_variants?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return rec && rec[0];
    },
    // Add `delta` (can be negative) to a variant's stock, floored at 0.
    async adjustStock(id, delta) {
      const rows = await req(`/model_variants?id=eq.${encodeURIComponent(id)}&select=stock`);
      const cur = rows && rows.length ? Number(rows[0].stock) || 0 : 0;
      return this.updateVariant(id, { stock: Math.max(0, cur + Number(delta || 0)) });
    },
    async decrementStock(id) { return this.adjustStock(id, -1); },
    async deleteVariant(id) {
      // remove this colour's photos (storage objects + rows) first
      try {
        const photos = await req(`/model_photos?variant_id=eq.${encodeURIComponent(id)}&select=id,path`) || [];
        for (const p of photos) { await this.deleteModelPhoto(p.id, p.path); }
      } catch { }
      // remove this colour's per-branch stock rows too
      try { await req(`/variant_stock?variant_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch { }
      await req(`/model_variants?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    },

    // ---- per-branch brand-new stock (variant_stock: one row per colour per branch) ----
    async getAllVariantStock() {
      return (await req(`/variant_stock?select=variant_id,branch,stock`)) || [];
    },
    async getBranchStock(branch) {
      return (await req(`/variant_stock?branch=eq.${encodeURIComponent(branch)}&select=variant_id,branch,stock`)) || [];
    },
    // Set the on-hand count for one colour at one branch (upsert on the composite key).
    async setVariantStock(variantId, branch, stock) {
      const row = { variant_id: variantId, branch, stock: Math.max(0, Number(stock) || 0), updated_at: new Date().toISOString() };
      await req(`/variant_stock`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(row) });
      return true;
    },
    // Add `delta` (can be negative) to a colour's stock at a branch, floored at 0.
    async adjustVariantStock(variantId, branch, delta) {
      const rows = await req(`/variant_stock?variant_id=eq.${encodeURIComponent(variantId)}&branch=eq.${encodeURIComponent(branch)}&select=stock`);
      const cur = rows && rows.length ? Number(rows[0].stock) || 0 : 0;
      return this.setVariantStock(variantId, branch, Math.max(0, cur + Number(delta || 0)));
    },
    async decrementVariantStock(variantId, branch) { return this.adjustVariantStock(variantId, branch, -1); },

    // ---- messages (customer <-> branch staff; one thread per customer) ----
    async getMessages(userId) {
      return (await req(`/messages?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at`) || []).map(msgToApp);
    },
    async getAllMessages() {
      return (await req(`/messages?select=*&order=created_at`) || []).map(msgToApp);
    },
    async sendMessage(userId, sender, body) {
      const row = { id: uid(), user_id: userId, sender, body: String(body), read: false };
      const rec = await req(`/messages`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return msgToApp(rec[0]);
    },
    // mark every message FROM `senderToMark` in this thread as read (called when the other side opens it)
    async markMessagesRead(userId, senderToMark) {
      await req(`/messages?user_id=eq.${encodeURIComponent(userId)}&sender=eq.${encodeURIComponent(senderToMark)}&read=eq.false`,
        { method: 'PATCH', body: JSON.stringify({ read: true }) });
      return true;
    }
  };
})();

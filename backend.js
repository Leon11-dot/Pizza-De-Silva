window.PDS_BACKEND = (() => {
  const cfg = window.PDS_CONFIG || {};
  const live = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  function baseHeaders(extra={}) {
    return {
      "Content-Type": "application/json",
      "apikey": cfg.supabaseAnonKey,
      ...extra
    };
  }

  function getAccessToken() { return sessionStorage.getItem("pds_access_token") || ""; }
  function getRefreshToken() { return sessionStorage.getItem("pds_refresh_token") || ""; }

  function authHeaders(extra={}) {
    const token = getAccessToken();
    return baseHeaders({
      ...(token ? {"Authorization": `Bearer ${token}`} : {}),
      ...extra
    });
  }

  async function refreshSession() {
    if (!live) return true;
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    const res = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({refresh_token: refreshToken})
    });
    if (!res.ok) {
      signOut();
      return false;
    }
    const data = await res.json();
    sessionStorage.setItem("pds_access_token", data.access_token || "");
    sessionStorage.setItem("pds_refresh_token", data.refresh_token || refreshToken);
    return true;
  }

  async function request(path, options={}, useAuth=false, retry=true) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        ...(useAuth ? authHeaders() : baseHeaders()),
        ...(options.headers || {})
      }
    });

    if (res.status === 401 && useAuth && retry && await refreshSession()) {
      return request(path, options, useAuth, false);
    }

    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  }

  function mapSettings(x={}) {
    const deliveryOpen = x.delivery_open ?? x.deliveryOpen ?? x.store_open ?? x.storeOpen ?? true;
    const pickupOpen = x.pickup_open ?? x.pickupOpen ?? x.store_open ?? x.storeOpen ?? true;
    return {
      storeOpen: deliveryOpen || pickupOpen,
      deliveryOpen,
      pickupOpen,
      openingHoursText: x.opening_hours_text ?? x.openingHoursText ?? "Öffnungszeiten bitte eintragen",
      deliveryAreaText: x.delivery_area_text ?? x.deliveryAreaText ?? "Liefergebiet bitte eintragen",
      deliveryMinimum: Number(x.delivery_minimum ?? x.deliveryMinimum ?? 0),
      deliveryFee: Number(x.delivery_fee ?? x.deliveryFee ?? 0),
      autoCancelMinutes: Number(x.auto_cancel_minutes ?? x.autoCancelMinutes ?? 5),
      restaurantAddress: x.restaurant_address ?? "Niederstrasse 76, 47829 Krefeld-Uerdingen",
      deliveryRadiusKm: Number(x.delivery_radius_km ?? 10),
      deliveryFee5km: Number(x.delivery_fee_5km ?? 0),
      deliveryMinimum5km: Number(x.delivery_minimum_5km ?? 0),
      deliveryFee10km: Number(x.delivery_fee_10km ?? 0),
      deliveryMinimum10km: Number(x.delivery_minimum_10km ?? 0)
    };
  }

  function mapOrder(x) {
    if (!x) return null;
    return {
      id: x.id,
      number: x.order_number ?? x.number,
      createdAt: x.created_at ?? x.createdAt,
      updatedAt: x.updated_at ?? x.updatedAt,
      status: x.status,
      eta: x.eta,
      expiresAt: x.expires_at ? new Date(x.expires_at).getTime() : x.expiresAt,
      total: Number(x.total || 0),
      customer: x.customer,
      items: x.items,
      cancelReason: x.cancel_reason ?? x.cancelReason,
      statusToken: x.status_token ?? x.statusToken
    };
  }

  async function verifyAdmin() {
    if (!live) return true;
    if (!getAccessToken()) return false;
    try {
      const rows = await request("admin_users?select=email&limit=1", {}, true);
      return Array.isArray(rows) && rows.length === 1;
    } catch (e) {
      return false;
    }
  }

  async function signIn(email, password) {
    if (!live) {
      sessionStorage.setItem("pds_admin_email", email);
      return {access_token:"local-demo"};
    }

    const res = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method:"POST",
      headers:baseHeaders(),
      body:JSON.stringify({email,password})
    });

    if (!res.ok) throw new Error(await res.text() || "Anmeldung fehlgeschlagen");
    const data = await res.json();

    sessionStorage.setItem("pds_access_token", data.access_token || "");
    sessionStorage.setItem("pds_refresh_token", data.refresh_token || "");
    sessionStorage.setItem("pds_admin_email", email);

    const allowed = await verifyAdmin();
    if (!allowed) {
      signOut();
      throw new Error("Dieses Konto ist nicht als Pizza-De-Silva-Admin freigeschaltet.");
    }
    return data;
  }

  function signOut() {
    sessionStorage.removeItem("pds_access_token");
    sessionStorage.removeItem("pds_refresh_token");
    sessionStorage.removeItem("pds_admin_email");
  }

  return {
    live,
    modeLabel: live ? "Online verbunden" : "Vorschau / lokal",
    signIn,
    signOut,
    verifyAdmin,
    isSignedIn() { return !live || !!getAccessToken(); },

    async getSettings() {
      if (!live) return {
        storeOpen:true, deliveryOpen:true, pickupOpen:true,
        openingHoursText:cfg.openingHoursText,
        deliveryAreaText:"Liefergebiet bitte eintragen",
        deliveryMinimum:Number(cfg.deliveryMinimum||0),
        deliveryFee:Number(cfg.deliveryFee||0),
        autoCancelMinutes:Number(cfg.autoCancelMinutes||5)
      };
      const rows = await request("store_settings?id=eq.1&select=*");
      return mapSettings(rows?.[0]);
    },

    async saveSettings(settings) {
      if (!live) return settings;
      if (!await verifyAdmin()) throw new Error("Nicht als Admin angemeldet.");
      const payload = {
        store_open: !!(settings.deliveryOpen || settings.pickupOpen),
        delivery_open: !!settings.deliveryOpen,
        pickup_open: !!settings.pickupOpen,
        opening_hours_text: settings.openingHoursText,
        delivery_area_text: settings.deliveryAreaText,
        delivery_minimum: settings.deliveryMinimum,
        delivery_fee: settings.deliveryFee,
        auto_cancel_minutes: settings.autoCancelMinutes,
        restaurant_address: settings.restaurantAddress,
        delivery_radius_km: settings.deliveryRadiusKm,
        delivery_fee_5km: settings.deliveryFee5km,
        delivery_minimum_5km: settings.deliveryMinimum5km,
        delivery_fee_10km: settings.deliveryFee10km,
        delivery_minimum_10km: settings.deliveryMinimum10km
      };
      await request("store_settings?id=eq.1", {
        method:"PATCH",
        headers:{"Prefer":"return=minimal"},
        body:JSON.stringify(payload)
      }, true);
      return settings;
    },

    async createOrder(order) {
      if (!live) {
        const local = JSON.parse(localStorage.getItem("pds_orders") || "[]");
        local.unshift(order);
        localStorage.setItem("pds_orders", JSON.stringify(local));
        localStorage.setItem("pds_order_ping", String(Date.now()));
        return order;
      }
      const payload = {
        id: order.id,
        created_at: order.createdAt,
        status: "new",
        eta: null,
        expires_at: new Date(order.expiresAt).toISOString(),
        total: order.total,
        customer: order.customer,
        items: order.items,
        status_token: order.statusToken
      };
      await request("orders", {
        method:"POST",
        headers:{"Prefer":"return=minimal"},
        body:JSON.stringify(payload)
      });
      return await this.getOrder(order.id, order.statusToken);
    },

    async getOrder(id, statusToken) {
      if (!live) {
        const local = JSON.parse(localStorage.getItem("pds_orders") || "[]");
        return local.find(x => String(x.id)===String(id)) || null;
      }
      const token = statusToken || localStorage.getItem(`pds_order_token_${id}`) || "";
      const rows = await request(
        `orders?id=eq.${encodeURIComponent(id)}&select=*`,
        {headers:{"x-order-token":token}}
      );
      return mapOrder(rows?.[0]);
    },

    async listOrders() {
      if (!live) return JSON.parse(localStorage.getItem("pds_orders") || "[]");
      if (!await verifyAdmin()) throw new Error("Nicht als Admin angemeldet.");
      const rows = await request("orders?select=*&order=created_at.desc", {}, true);
      return (rows || []).map(mapOrder);
    },

    async updateOrder(id, patch) {
      if (!live) {
        const local = JSON.parse(localStorage.getItem("pds_orders") || "[]");
        const x = local.find(z => String(z.id)===String(id));
        if (!x) return null;
        Object.assign(x, patch);
        localStorage.setItem("pds_orders", JSON.stringify(local));
        return x;
      }
      if (!await verifyAdmin()) throw new Error("Nicht als Admin angemeldet.");
      const payload = {};
      if ("status" in patch) payload.status = patch.status;
      if ("eta" in patch) payload.eta = patch.eta;
      if ("cancelReason" in patch) payload.cancel_reason = patch.cancelReason;
      if ("updatedAt" in patch) payload.updated_at = patch.updatedAt;
      await request(`orders?id=eq.${encodeURIComponent(id)}`, {
        method:"PATCH",
        headers:{"Prefer":"return=minimal"},
        body:JSON.stringify(payload)
      }, true);
      return true;
    }
  };
})();

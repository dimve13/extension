const slots = require("../data/slots.json");

const ADDON_ID = "community.starmeter.prototype";
const ADDON_NAME = "STARmeter 100 Prototype";

function slotId(index) {
  return String(index).padStart(3, "0");
}

function getSlot(id) {
  return slots[id] || {
    rank: Number(id),
    name: `STARmeter Slot ${id}`,
    profileColor: "#334155",
    movies: [],
  };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0");
  res.end(JSON.stringify(body));
}

function sendText(res, status, contentType, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0");
  res.end(body);
}

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function manifest() {
  return {
    id: ADDON_ID,
    version: "1.0.0",
    name: ADDON_NAME,
    description: "Prototype dynamic STARmeter actor filmography slots for Nuvio testing.",
    resources: ["catalog", "meta"],
    types: ["movie"],
    idPrefixes: ["tt"],
    catalogs: Array.from({ length: 100 }, (_, index) => {
      const id = slotId(index + 1);
      const slot = getSlot(id);
      return {
        type: "movie",
        id: `starmeter.slot.${id}`,
        name: `#${slot.rank || index + 1} ${slot.name}`,
      };
    }),
  };
}

function nuvioCollection(baseUrl) {
  return {
    name: "STARmeter 100 Prototype",
    version: 1,
    folders: Array.from({ length: 100 }, (_, index) => {
      const id = slotId(index + 1);
      return {
        title: `Slot ${id}`,
        hideTitle: true,
        coverImageUrl: `${baseUrl}/starmeter/slot/${id}/cover.svg`,
        focusGifUrl: `${baseUrl}/starmeter/slot/${id}/cover.svg`,
        catalogSources: [
          {
            type: "movie",
            addonId: ADDON_ID,
            catalogId: `starmeter.slot.${id}`,
          },
        ],
      };
    }),
  };
}

function catalog(id) {
  const slot = getSlot(id);
  return {
    metas: (slot.movies || []).map((movie) => ({
      id: movie.id,
      type: "movie",
      name: movie.name,
      poster: movie.poster,
      background: movie.background,
      description: movie.description,
    })),
  };
}

function meta(imdbId) {
  for (const slot of Object.values(slots)) {
    for (const movie of slot.movies || []) {
      if (movie.id === imdbId) {
        return {
          meta: {
            id: movie.id,
            type: "movie",
            name: movie.name,
            poster: movie.poster,
            background: movie.background,
            description: movie.description,
          },
        };
      }
    }
  }
  return { meta: null };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coverSvg(id) {
  const slot = getSlot(id);
  const color = slot.profileColor || "#334155";
  const name = escapeXml(slot.name);
  const rank = escapeXml(slot.rank || Number(id));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#101418"/>
  <rect width="600" height="900" fill="${color}"/>
  <circle cx="300" cy="310" r="165" fill="rgba(255,255,255,0.18)"/>
  <circle cx="300" cy="270" r="85" fill="rgba(255,255,255,0.55)"/>
  <path d="M125 660c25-105 110-170 175-170s150 65 175 170" fill="rgba(255,255,255,0.55)"/>
  <rect x="34" y="34" width="140" height="72" rx="12" fill="rgba(0,0,0,0.36)"/>
  <text x="104" y="83" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#fff">#${rank}</text>
  <text x="300" y="735" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="#fff">${name}</text>
  <text x="300" y="790" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="500" fill="rgba(255,255,255,0.82)">STARmeter Prototype</text>
</svg>`;
}

module.exports = function handler(req, res) {
  const path = (req.url || "/").split("?")[0];
  const baseUrl = getBaseUrl(req);

  if (path === "/" || path === "/api" || path === "/api/index" || path === "/health") {
    return sendText(res, 200, "text/plain; charset=utf-8", "ok");
  }

  if (path === "/manifest.json" || path === "/api/manifest.json") {
    return sendJson(res, 200, manifest());
  }

  if (path === "/nuvio-collection.json" || path === "/api/nuvio-collection.json") {
    return sendJson(res, 200, nuvioCollection(baseUrl));
  }

  const catalogMatch = path.match(/^\/catalog\/movie\/starmeter\.slot\.(\d{3})\.json$/);
  if (catalogMatch) {
    return sendJson(res, 200, catalog(catalogMatch[1]));
  }

  const metaMatch = path.match(/^\/meta\/movie\/(tt\d+)\.json$/);
  if (metaMatch) {
    return sendJson(res, 200, meta(metaMatch[1]));
  }

  const coverMatch = path.match(/^\/starmeter\/slot\/(\d{3})\/cover\.svg$/);
  if (coverMatch) {
    return sendText(res, 200, "image/svg+xml; charset=utf-8", coverSvg(coverMatch[1]));
  }

  return sendJson(res, 404, { error: "not found" });
};

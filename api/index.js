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

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0");
  res.end("");
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
  return [
    {
      id: "collection-STARMETER-100",
      title: "STARmeter 100",
      folders: Array.from({ length: 100 }, (_, index) => {
      const id = slotId(index + 1);
      return {
        id: `folder-STARMETER-${id}`,
        title: `STARmeter ${id}`,
        hideTitle: true,
        tileShape: "POSTER",
        coverImageUrl: `${baseUrl}/starmeter/slot/${id}/cover.svg`,
        focusGifUrl: `${baseUrl}/starmeter/slot/${id}/cover.svg`,
        focusGifEnabled: false,
        catalogSources: [
          {
            type: "movie",
            addonId: ADDON_ID,
            catalogId: `starmeter.slot.${id}`,
          },
        ],
      };
    }),
    },
  ];
}

function copyPage(baseUrl) {
  const json = JSON.stringify(nuvioCollection(baseUrl), null, 2);
  const escapedJson = escapeXml(json);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>STARmeter Nuvio Collection</title>
  <style>
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #101418; color: #f8fafc; }
    main { max-width: 900px; margin: 0 auto; padding: 24px; }
    button { border: 0; border-radius: 8px; padding: 14px 18px; font-weight: 700; font-size: 16px; background: #38bdf8; color: #08111a; }
    textarea { width: 100%; min-height: 65vh; margin-top: 16px; border-radius: 8px; border: 1px solid #334155; background: #020617; color: #e2e8f0; padding: 14px; font: 12px/1.45 Consolas, monospace; box-sizing: border-box; }
    p { color: #cbd5e1; }
  </style>
</head>
<body>
  <main>
    <h1>STARmeter 100 Collection JSON</h1>
    <p>Tap copy, then paste the JSON text into Nuvio's Collections import box. Do not paste the URL there.</p>
    <button id="copy">Copy JSON</button>
    <textarea id="json" spellcheck="false">${escapedJson}</textarea>
  </main>
  <script>
    const textarea = document.getElementById('json');
    document.getElementById('copy').addEventListener('click', async () => {
      textarea.select();
      await navigator.clipboard.writeText(textarea.value);
      document.getElementById('copy').textContent = 'Copied';
    });
  </script>
</body>
</html>`;
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

function slotRevision(id) {
  const slot = getSlot(id);
  const source = JSON.stringify({
    name: slot.name,
    color: slot.profileColor,
    movies: (slot.movies || []).map((movie) => movie.id),
  });

  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
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

  if (
    path === "/nuvio-collection.json" ||
    path === "/nuvio-collections.json" ||
    path === "/collections.json" ||
    path === "/api/nuvio-collection.json" ||
    path === "/api/nuvio-collections.json" ||
    path === "/api/collections.json"
  ) {
    return sendJson(res, 200, nuvioCollection(baseUrl));
  }

  if (path === "/copy" || path === "/collection-copy" || path === "/copy.html") {
    return sendText(res, 200, "text/html; charset=utf-8", copyPage(baseUrl));
  }

  if (path === "/raw" || path === "/collection-raw" || path === "/raw.json") {
    return sendText(
      res,
      200,
      "text/plain; charset=utf-8",
      JSON.stringify(nuvioCollection(baseUrl), null, 2)
    );
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
    const id = coverMatch[1];
    return redirect(res, `/starmeter/slot/${id}/cover-${slotRevision(id)}.svg`);
  }

  const versionedCoverMatch = path.match(/^\/starmeter\/slot\/(\d{3})\/cover-[a-z0-9]+\.svg$/);
  if (versionedCoverMatch) {
    return sendText(res, 200, "image/svg+xml; charset=utf-8", coverSvg(versionedCoverMatch[1]));
  }

  return sendJson(res, 404, { error: "not found" });
};

# STARmeter Nuvio Prototype

This is a minimal proof of concept for a Nuvio/Stremio-style addon that exposes
100 fixed STARmeter slots.

The goal is to test whether Nuvio accepts:

- a custom addon manifest
- folder cover image URLs
- folders pointing to addon catalogs
- dynamic slot content

## Run

### Local PowerShell Prototype

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-starmeter-prototype.ps1
```

Default local URL:

```text
http://127.0.0.1:7171
```

If Nuvio is on another device, run the server on all interfaces:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-starmeter-prototype.ps1 -HostName 0.0.0.0
```

Then use your PC's LAN IP in Nuvio, for example:

```text
http://192.168.1.50:7171/manifest.json
http://192.168.1.50:7171/nuvio-collection.json
```

### Vercel Version

This repo also contains a Vercel-ready serverless version:

```text
api/index.js
vercel.json
package.json
```

After deploying to Vercel, use this as the addon/plugin URL:

```text
https://YOUR-PROJECT.vercel.app/manifest.json
```

The manifest exposes 100 movie catalogs:

```text
starmeter.slot.001
starmeter.slot.002
...
starmeter.slot.100
```

Nuvio should treat those catalogs like normal addon sections. The separate
`nuvio-collection.json` file is only an optional experiment for Nuvio-native
collection import, not required for normal addon installation.

Vercel deployment options:

```powershell
npm i -g vercel
vercel
vercel --prod
```

Or push this git repo to GitHub and import it from the Vercel dashboard.

Useful endpoints:

```text
http://127.0.0.1:7171/manifest.json
http://127.0.0.1:7171/nuvio-collection.json
http://127.0.0.1:7171/starmeter/slot/001/cover.jpg
http://127.0.0.1:7171/catalog/movie/starmeter.slot.001.json
```

## What To Test In Nuvio

1. Install the addon using:

   ```text
   http://YOUR_SERVER:7171/manifest.json
   ```

2. Import the collection JSON:

   ```text
   http://YOUR_SERVER:7171/nuvio-collection.json
   ```

3. Open the `STARmeter 100 Prototype` collection.

Expected result:

- You see fixed folders/slots.
- Each folder has a generated actor-style cover image.
- Opening a folder shows that slot's movie catalog.

If the folder cover changes when `data\slots.json` changes, then the dynamic
image approach works.

## Notes

This prototype uses sample data. The production version would replace
`data\slots.json` each day from:

```text
IMDb STARmeter -> TMDb person -> TMDb movie credits
```

The important test here is Nuvio behavior, not scraping.

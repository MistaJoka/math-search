# Equation Search — Embed Guide

Use this document to embed the game into another page using an iframe.

## Files to host
- index.html — main game page
- styles.css — visual styles
- app.js — game logic

## Quick steps
1. Place the three files above on a web‑accessible folder.
2. Add this iframe where you want the game to appear:

```html
<iframe src="PATH/TO/index.html" title="Equation Search" style="width:100%;height:80vh;border:0;border-radius:12px"></iframe>
```

## Examples
- GitHub Pages: https://username.github.io/repo-name/index.html
- Self-host: https://yourdomain.com/path-to-folder/index.html

Notes: the game runs client-side in the browser and needs no build tools.

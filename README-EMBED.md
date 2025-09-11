<!-- README comment: Embed guide for Equation Search -->

# Equation Search — Embed Guide

<!-- Steps section -->
Use this if you want to place the game inside an existing page as an iframe.

## Steps
1. Host these three files together: `index.html`, `styles.css`, `app.js`.
2. On the page where you want the game, paste:

<!-- Example snippet -->
```html
<iframe src="PATH/TO/index.html" title="Equation Search" style="width:100%;height:80vh;border:0;border-radius:12px"></iframe>
```

### Example for GitHub Pages
If your repo is `username/equation-search`, your `src` becomes:
```
https://username.github.io/equation-search/index.html
```

### Example for wmbmartialarts.com
Upload the folder to `/testpage-math/` and set:
```
https://wmbmartialarts.com/testpage-math/index.html
```

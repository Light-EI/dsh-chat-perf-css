/**
 * Client half: injects one stylesheet into the page it runs in.
 *
 * Why a Client plugin and not a Host plugin:
 *   The Desktop app serves `/`, `/index.html` and `/assets/*` straight from the
 *   packaged front-end and forwards every other route to the Host, so Host-side
 *   interception of the asset bundle never reaches the Desktop window. A Client
 *   plugin runs inside that very renderer — and its `/plugins/...` bundle route
 *   *is* forwarded to the Host — so the same rule applies in the Desktop window
 *   and in the browser GUI: no second window, no other interface.
 *
 * What it changes: nothing but painting. `content-visibility: auto` lets the
 * browser skip style, layout and paint for subtrees that are off-screen, and
 * `contain-intrinsic-size: auto <size>` keeps a stable placeholder size (the
 * last rendered size is remembered once a subtree has been seen).
 *
 * Lifecycle: the style tag is removed when the plugin is unloaded, through the
 * disposer registered below with `ctx.effect`.
 *
 * Until DSH 0.2.2 a second mechanism covered the paths that skip a disposer: the
 * module system swept every `style[data-plugin]` tag on invalidation, HMR
 * replacement or pruning (`removeOwnedStyles`), which is why the tag carries that
 * attribute. 0.2.3 dropped the sweep — the framework now installs only the
 * stylesheets a module's own build metadata declares, and owns nothing else — so
 * the attribute is a marker now, not a cleanup hook. `apply` therefore removes any
 * earlier copy before adding its own: re-materialization that runs before a
 * disposer cannot leave two copies of the rule behind.
 */
window.__ModuleLoader__.load({
  id: 'dsh-chat-perf-css',
  factory() {
    const RULES = [
      '/* dsh-chat-perf-css: off-screen message bodies skip style, layout and paint */',
      // Message body container: the front-end renders it as a CSS-module class
      // (`_markdown_<hash>_<line>`), so match the stable key part, not the hash.
      //
      // Two exclusions, both verified against the installed front-end bundle:
      //   `:not([class*="_icon_"])` — the file-type icon component also carries a
      //   `_markdown_<hash>_<line>` class (the ".md" file icon), always together
      //   with `_icon_<hash>_1`. Without this, off-screen attachment icons would
      //   reserve a 320px placeholder box.
      //   `:not(svg)` — that icon class is applied to the <svg> element itself.
      // v1.0.5 dropped the per-formula rule (`.katex-display` + `auto 90px`): the
      // placeholder is far below the real height of a display formula, so every
      // reveal rewrote the document height and scroll anchoring chained those
      // rewrites together — dragging a formula-heavy conversation could freeze for
      // tens of seconds. One coarse rule stays; what it no longer covers is
      // scrolling *inside* a single enormous message (documented as a known limit).
      '[class*="_markdown_"]:not([class*="_icon_"]):not(svg){content-visibility:auto;contain-intrinsic-size:auto 320px}',
    ].join('\n');

    return {
      apply(ctx) {
        // One tag per page: a re-materialized module may run before any disposer.
        for (const stale of document.querySelectorAll('style[data-plugin="dsh-chat-perf-css"]')) stale.remove();

        const tag = document.createElement('style');
        tag.setAttribute('data-plugin', 'dsh-chat-perf-css');
        tag.textContent = RULES;
        document.head.append(tag);

        // Remove the tag when the plugin is unloaded.
        if (ctx && typeof ctx.effect === 'function') {
          ctx.effect(() => () => tag.remove());
        }
      },
    };
  },
});

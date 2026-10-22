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
 * Lifecycle: the style tag is removed when the plugin is unloaded. Two
 * independent mechanisms cover that:
 *   1. the disposer registered below through `ctx.effect`;
 *   2. the module system's `removeOwnedStyles(id)`, which drops every
 *      `style[data-plugin="dsh-chat-perf-css"]` when the module is invalidated,
 *      replaced (HMR) or pruned — the tag carries that attribute on purpose so
 *      this second path can find it.
 * Note: the automatic tagging (`claimStyles`) only covers styles created while
 * the module *factory* runs; this style is created later, inside `apply`, so it
 * has to set `data-plugin` itself.
 */
window.__ModuleLoader__.load({
  id: 'dsh-chat-perf-css',
  factory() {
    const RULES = [
      '/* dsh-chat-perf-css: off-screen message bodies and block formulas skip style, layout and paint */',
      // Message body container: the front-end renders it as a CSS-module class
      // (`_markdown_<hash>_<line>`), so match the stable key part, not the hash.
      //
      // Two exclusions, both verified against the installed front-end bundle:
      //   `:not([class*="_icon_"])` — the file-type icon component also carries a
      //   `_markdown_<hash>_<line>` class (the ".md" file icon), always together
      //   with `_icon_<hash>_1`. Without this, off-screen attachment icons would
      //   reserve a 320px placeholder box.
      //   `:not(svg)` — that icon class is applied to the <svg> element itself.
      '[class*="_markdown_"]:not([class*="_icon_"]):not(svg){content-visibility:auto;contain-intrinsic-size:auto 320px}',
      // Block formulas: KaTeX ships this class name itself.
      '.katex-display{content-visibility:auto;contain-intrinsic-size:auto 90px}',
    ].join('\n');

    return {
      apply(ctx) {
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

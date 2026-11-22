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
 * Where it applies: only inside the chat column (`[data-chat-flow]`). An earlier
 * version matched the message-body class anywhere on the page, which also caught
 * markdown in the document preview, tool details, dialogs and the virtualized
 * trajectory table — inner scroll areas where a 320px placeholder makes the
 * scrollbar estimate its own length. The chat column is the only surface that
 * grows without bound, so it is the only one that needs this.
 *
 * Which class it matches: DSH builds CSS-module names in one of two shapes, and
 * both are in the wild, so both are matched:
 *   `_<local>_<hash>_<line>`  e.g. `_markdown_13jw0_5`   (≤ 0.2.2, Vite-hashed)
 *   `<hash>_<local>`          e.g. `NkM3Kq_markdown`     (0.2.3+, lightningcss)
 * 0.2.3 moved `ui-primitives` styles out of the Web shell's CSS file into module
 * metadata installed by the renderer, and with that moved the hashing from Vite
 * to lightningcss's `[hash]_[local]` pattern. The local name stayed `markdown`;
 * only its position moved, which is what the three class substrings cover.
 *
 * Lifecycle: the style tag is removed when the plugin is unloaded, through the
 * disposer registered below with `ctx.effect`.
 *
 * Until DSH 0.2.2 a second mechanism covered the paths that skip a disposer: the
 * module system swept every `style[data-plugin]` tag on invalidation, HMR
 * replacement or pruning (`removeOwnedStyles`). 0.2.3 dropped the sweep — the
 * framework now installs only the stylesheets a module's own build metadata
 * declares (`meta.stylesheets`) and never scans the DOM — so a hand-written tag
 * has to own itself. It carries `data-plugin` for readers that look for DSH's
 * convention and `data-dsh-chat-perf` as its own identity: `apply` removes any
 * earlier copy bearing that marker, so a re-materialization that runs before a
 * disposer cannot leave two copies of the rule behind.
 *
 * Styles are injected by hand rather than through `meta.stylesheets` on purpose:
 * releases before 0.2.3 ignore `meta` entirely, and they would then get no styles
 * at all. One `<style>` tag works on every release this plugin supports.
 */
window.__ModuleLoader__.load({
  id: 'dsh-chat-perf-css',
  factory() {
    const RULES = [
      '/* dsh-chat-perf-css: off-screen message bodies skip style, layout and paint */',
      // Two exclusions, both verified against the installed front-end bundle:
      //   `:not([class*="_icon"])` — the file-type icon component also carries a
      //   `markdown` class (the ".md" file icon), always together with an `icon`
      //   class, in either naming shape (`_icon_1wejo_1`, `NkM3Kq_icon`). Without
      //   this, off-screen attachment icons would reserve a 320px placeholder box.
      //   `:not(svg)` — that icon class is applied to the <svg> element itself.
      // v1.0.5 dropped the per-formula rule (`.katex-display` + `auto 90px`): the
      // placeholder is far below the real height of a display formula, so every
      // reveal rewrote the document height and scroll anchoring chained those
      // rewrites together — dragging a formula-heavy conversation could freeze for
      // tens of seconds. One coarse rule stays; what it no longer covers is
      // scrolling *inside* a single enormous message (documented as a known limit).
      '[data-chat-flow] :is([class*="_markdown_"], [class$="_markdown"], [class*="_markdown "])'
        + ':not([class*="_icon"]):not(svg){content-visibility:auto;contain-intrinsic-size:auto 320px}',
    ].join('\n');

    return {
      apply(ctx) {
        // The module system can execute a bundle in a realm with no document (0.2.3 made the
        // main realm explicitly carrier-agnostic). A page effect has nothing to do there.
        if (typeof document === 'undefined') return;

        // One tag per page: a re-materialized module may run before any disposer.
        for (const stale of document.querySelectorAll('style[data-dsh-chat-perf]')) stale.remove();

        const tag = document.createElement('style');
        tag.setAttribute('data-plugin', 'dsh-chat-perf-css');
        tag.setAttribute('data-dsh-chat-perf', '');
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

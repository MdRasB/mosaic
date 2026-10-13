## Summary

Replaces the last two placeholder glyphs in the sidebar navigation with proper SVG icons, completing the sidebar icon set.

The **TV Shows** and **Settings** links were the only two nav items still using fallback Unicode characters (`▤` and `⚙`) while every other link used an `<img>` element. Both now match the established pattern.

## Changes

**New icons**
- `frontend/public/icons/slidebar-icons/mosaic-tv.svg` — TV screen with antenna and play glyph
- `frontend/public/icons/slidebar-icons/mosaic-settings.svg` — gear rendered as a center circle with eight radial spokes

**Modified**
- `frontend/index.html` — swapped the two `<span>` placeholders for `<img class="sidebar-icon">`, matching the markup of the other seven nav links

All nine sidebar icons now follow the `mosaic-` filename prefix.

## Design consistency

The new icons are drawn to match the existing set exactly, so they sit evenly beside the others:

| Property | Value |
| --- | --- |
| Canvas | `24 × 24` (`viewBox="0 0 24 24"`) |
| Stroke | `#A7A6B5` |
| Stroke width | `1.7` |
| Line caps / joins | `round` |
| Fill | `none` |

Sizing is handled by the existing `.sidebar-icon` rule in `frontend/src/styles/layout.css` (`24px`, `flex: 0 0 24px`), so no CSS changes were needed.

## Accessibility

Each icon is decorative next to its text label, so both are marked `alt=""` and `aria-hidden="true"` — identical to the existing icons. The accessible name still comes from the adjacent `.sidebar-label` text.

## Visual check

Both links sit inside `.nav-link-disabled`, which applies `opacity: 0.62`. They therefore render dimmed, consistent with the other not-yet-implemented routes. Worth confirming on a hard reload (Ctrl+Shift+R) in case the browser cached the earlier `/icons/slidebar-icons/` responses.

## Testing

- Sidebar renders all nine icons at consistent size and stroke weight in both themes
- Collapsed-sidebar mode (`72px`) aligns icons to center as before
- Text labels remain readable with icons present, no overflow at mobile breakpoints

## Notes

This branch contains icon work only. Unrelated local changes to `frontend/.env.example` and `frontend/config.example.js` were intentionally excluded — see below.
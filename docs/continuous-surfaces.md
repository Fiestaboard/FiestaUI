# Continuous surfaces and device thumbnails

`PageCard surface="plain"` keeps the existing page spacing, section headings,
keyboard-reachable scroll regions, and mount behavior while removing the outer
card surface and automatic section rules. The default remains `surface="card"`.
The surface flows through wrappers; an explicitly nested PageCard starts its own
surface. Use this for route canvases, not selectable items or input boundaries.

`PreviewSlot` gives device thumbnails equal space without changing their geometry.
The compact density is 168px high; normal is 200px. The measured preview shrinks
uniformly to fit the available area, with 12px inset, and never enlarges. ResizeObserver
keeps it fitted when content or the container changes. Loading and unavailable
states should use the same slot as the loaded preview.

Use a static device renderer inside the slot. Interactive Fit/Actual-size controls
belong in the detail view outside it; otherwise the slot would scale the controls
and override Actual size. A stacked collection must include all offsets in its
measured layout, rather than absolutely positioning children outside that layout.

Stories: Chrome/PageCard Plain and Board/PreviewSlot ShapesAndStates. Unit tests
cover surface propagation/reset and measured wide, tall and small previews.
These APIs are additive and require a minor package release before consumers
adopt them. This branch does not publish or bump the package.

---
"@fiestaboard/ui": minor
---

Template editor toolbar: Copy and Cut put the template on the clipboard as the field's own copy does (chips as their markup, no U+200B cursor anchors), and Escape from the Variables, Colors or Formatting picker returns focus to the editor at its caret. New `ToolbarDropdown` prop `returnFocus` says where focus goes on Escape. The field's own copy no longer carries the anchors either.

# OneShot – AI Agent Guide

This file tells AI agents (Claude Code, GPT, Aider, etc.) how to collaborate on the shared whiteboard.

## The Shared Canvas

The canvas state lives at the root of this repository:

```
canvas.excalidraw.json
```

The web UI (Excalidraw running at `http://localhost:3000`) watches this file in real time.
**Any change you make to this file will be reflected in the UI within ~1 second.**

---

## File Format

`canvas.excalidraw.json` is a JSON object with this structure:

```jsonc
{
  "type": "excalidraw",
  "version": 2,
  "elements": [ /* array of ExcalidrawElement */ ],
  "appState": { "viewBackgroundColor": "#1a1a2e" },
  "files": {}
}
```

### Element Types

Every element has these common fields:

| Field | Description |
|-------|-------------|
| `id` | Unique string (use `crypto.randomUUID()` or any unique string) |
| `type` | `"rectangle"`, `"ellipse"`, `"diamond"`, `"arrow"`, `"text"`, `"frame"` |
| `x`, `y` | Position in canvas coordinates (top-left origin) |
| `width`, `height` | Dimensions in pixels |
| `angle` | Rotation in radians (usually `0`) |
| `strokeColor` | Hex color string, e.g. `"#e2e8f0"` |
| `backgroundColor` | Hex or `"transparent"` |
| `fillStyle` | `"solid"`, `"hachure"`, `"cross-hatch"` |
| `strokeWidth` | `1`, `2`, `4` |
| `opacity` | `0`–`100` |
| `version` | Increment when modifying an existing element |
| `versionNonce` | Any integer (used for conflict resolution) |
| `isDeleted` | `false` (set to `true` to remove element) |
| `groupIds` | `[]` or array of group id strings |
| `boundElements` | Array of `{id, type}` for connected arrows |

### Text Elements

```jsonc
{
  "type": "text",
  "text": "My Label",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "<id of parent shape or null>"
}
```

To place text **inside** a shape, set `containerId` to the shape's `id`.

### Arrows (Connections)

```jsonc
{
  "type": "arrow",
  "startBinding": { "elementId": "<source-id>", "focus": 0, "gap": 8 },
  "endBinding":   { "elementId": "<target-id>", "focus": 0, "gap": 8 },
  "points": [[0, 0], [120, 0]],
  "arrowType": "elbow"
}
```

When connecting with arrows, also add a `boundElements` entry to both endpoint shapes:
```jsonc
// on the source shape:
"boundElements": [{ "id": "<arrow-id>", "type": "arrow" }]
```

### Frames (Sections)

Use frames to group related elements into labelled sections:

```jsonc
{
  "type": "frame",
  "name": "Backend Services",
  "x": 100, "y": 100,
  "width": 600, "height": 400
}
```

Elements physically inside a frame's bounding box are considered part of that section.

---

## Reading the Canvas

```bash
cat canvas.excalidraw.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for el in data['elements']:
    if not el.get('isDeleted'):
        print(el['type'], el.get('text',''), f'@({el[\"x\"]:.0f},{el[\"y\"]:.0f})')
"
```

## Writing to the Canvas

**Always preserve existing elements** unless you intend to modify or delete them.
To modify an element, increment its `version` field.
To remove an element, set `"isDeleted": true`.

Example – append a new rectangle with a text label:

```python
import json, uuid, math, pathlib

canvas = json.loads(pathlib.Path("canvas.excalidraw.json").read_text())

rect_id = str(uuid.uuid4())
text_id = str(uuid.uuid4())

canvas["elements"].extend([
  {
    "id": rect_id,
    "type": "rectangle",
    "x": 200, "y": 200,
    "width": 180, "height": 80,
    "angle": 0,
    "strokeColor": "#e2e8f0",
    "backgroundColor": "#1e3a5f",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "opacity": 100,
    "version": 1,
    "versionNonce": 1,
    "isDeleted": False,
    "groupIds": [],
    "boundElements": [{"id": text_id, "type": "text"}],
    "roundness": {"type": 3}
  },
  {
    "id": text_id,
    "type": "text",
    "x": 200, "y": 220,
    "width": 180, "height": 40,
    "angle": 0,
    "strokeColor": "#e2e8f0",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "opacity": 100,
    "text": "My Component",
    "fontSize": 18,
    "fontFamily": 1,
    "textAlign": "center",
    "verticalAlign": "middle",
    "containerId": rect_id,
    "version": 1,
    "versionNonce": 2,
    "isDeleted": False,
    "groupIds": [],
    "boundElements": []
  }
])

pathlib.Path("canvas.excalidraw.json").write_text(
  json.dumps(canvas, indent=2)
)
print("Canvas updated.")
```

---

## Workflow Tips

1. **Read first** — always load the current canvas before modifying it to avoid overwriting the human's work.
2. **Preserve human elements** — only modify elements you created or that you were explicitly asked to change.
3. **Use frames as sections** — create a `frame` element to group your additions and label the section (e.g. "AI Suggestions").
4. **Text inside shapes** — always set `containerId` so labels stay attached to their shapes.
5. **Arrow bindings** — update `boundElements` on both endpoints when adding arrows.
6. **Increment versions** — when modifying existing elements, increment their `version` field.

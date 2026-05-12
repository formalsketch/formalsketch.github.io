# JSON import/export format

Files produced by **Export JSON** and accepted by **Import** use this envelope. The `format` field is the contract; bumping the version (`fsmStudio.v2`, `v3`, ...) signals an incompatible change and lets future versions migrate or reject old files.

## `fsmStudio.v1`

```json
{
  "format": "fsmStudio.v1",
  "createdAt": "2026-05-12T23:41:00.000Z",
  "nodes": [
    { "x": 100, "y": 100, "text": "q0", "isAcceptState": false },
    { "x": 300, "y": 100, "text": "q1", "isAcceptState": true }
  ],
  "links": [
    { "type": "StartLink", "node": 0, "text": "", "deltaX": -50, "deltaY": 0 },
    { "type": "Link", "nodeA": 0, "nodeB": 1, "text": "a",
      "lineAngleAdjust": 0, "parallelPart": 0.5, "perpendicularPart": 0 },
    { "type": "SelfLink", "node": 1, "text": "b", "anchorAngle": 0 }
  ]
}
```

### Top-level fields

| field       | type    | required | notes                                                |
|-------------|---------|----------|------------------------------------------------------|
| `format`    | string  | yes      | must be exactly `"fsmStudio.v1"`                     |
| `createdAt` | string  | no       | ISO 8601 timestamp; informational                    |
| `nodes`     | array   | yes      | each entry is a node object (below)                  |
| `links`     | array   | yes      | each entry is a link object (below)                  |

### Node object

| field            | type    | required | notes                                          |
|------------------|---------|----------|------------------------------------------------|
| `x`              | number  | yes      | canvas-space x (0..canvas.width)               |
| `y`              | number  | yes      | canvas-space y (0..canvas.height)              |
| `text`           | string  | yes      | label, may contain LaTeX shortcuts like `\beta`|
| `isAcceptState`  | boolean | yes      | true for double-circle accept states           |

### Link object

`type` selects which fields are read; unknown types are rejected.

#### `Link` (state -> state)

| field                  | type   | required | notes                                |
|------------------------|--------|----------|--------------------------------------|
| `type`                 | "Link" | yes      |                                      |
| `nodeA`                | number | yes      | source node index                    |
| `nodeB`                | number | yes      | target node index                    |
| `text`                 | string | yes      | label; comma-separated for multiple symbols |
| `lineAngleAdjust`      | number | yes      | radians; flips the label across the line |
| `parallelPart`         | number | yes      | bezier control along the chord       |
| `perpendicularPart`    | number | yes      | bezier control perpendicular to chord; 0 means a straight line |

#### `SelfLink` (state -> itself)

| field          | type        | required | notes                          |
|----------------|-------------|----------|--------------------------------|
| `type`         | "SelfLink"  | yes      |                                |
| `node`         | number      | yes      | the looping node's index       |
| `text`         | string      | yes      | label                          |
| `anchorAngle`  | number      | yes      | radians; angle of the loop     |

#### `StartLink` (entry arrow into a state)

| field    | type        | required | notes                                |
|----------|-------------|----------|--------------------------------------|
| `type`   | "StartLink" | yes      |                                      |
| `node`   | number      | yes      | the target node's index              |
| `text`   | string      | no       | label, usually empty                 |
| `deltaX` | number      | yes      | x offset of the tail from the node   |
| `deltaY` | number      | yes      | y offset of the tail from the node   |

## Validation

Importing checks:
1. `format === "fsmStudio.v1"`.
2. `nodes` and `links` are arrays.
3. Each node has numeric `x` and `y`.
4. Each link has a recognised `type`.

Anything else (extra fields, missing optional fields) is tolerated; missing required fields show a toast and the import is rejected.

## Versioning

When the editor needs a breaking change, bump to `fsmStudio.v2` and add a migration that reads v1 files and produces v2 output. The current importer rejects unknown formats outright, so old files keep working only as long as the loader is taught to migrate them.

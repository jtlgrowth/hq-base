# Accessories

Everything you can add to the office. Write the **id** in `accessories.json`.
The page checks for changes every 3 seconds, so a new item appears on its own.

## How to place something

```json
[
  { "model": "plant", "near": "Maya" },
  { "model": "lounge-set", "spot": "lounge" },
  { "model": "coffee-corner", "spot": "pantry" },
  { "model": "cat", "near": "Nora", "color": "#e08a3c" },
  { "model": "logo" },
  { "model": "bookshelf", "x": -3, "z": -2, "rotY": 90, "scale": 1.2 }
]
```

- **near**: a teammate's name. It goes beside their desk (right, then left, then behind). Add `"side": "left"` to choose.
- **spot**: one of `lounge`, `pantry`, `entrance`, `hub`, `back-left`, `back-right`, `front-left`, `front-right`. Several things in one spot spread out by themselves.
- **x / z**: exact floor position in metres-ish units, 0,0 is the middle of the room. Only if near and spot are not enough.
- **rotY**: turn it, in degrees. **scale**: bigger or smaller, 0.2 to 4.
- **Your own model**: put a `.glb` file in `models/custom/` and use `"model": "custom/yourfile.glb"`.

Anything not in this list shows a small note at the top of the page naming it, so a typo is easy to spot.

## The catalog

### Plants

| id | what it is |
|---|---|
| `plant` | Tall potted plant |
| `plant-small` | Small plant |
| `plant-small-2` | Small plant, round pot |
| `plant-small-3` | Small plant, leafy |
| `cactus` | Tall cactus |
| `cactus-small` | Short cactus |

### Books and storage

| id | what it is |
|---|---|
| `bookshelf` | Open bookshelf |
| `bookshelf-closed` | Closed bookshelf |
| `bookshelf-wide` | Wide bookshelf |
| `bookshelf-low` | Low bookshelf |
| `books` | Stack of books |
| `boxes` | Cardboard box |
| `box-open` | Open box |

### Lounge

| id | what it is |
|---|---|
| `sofa` | Sofa |
| `sofa-long` | Long sofa |
| `sofa-corner` | Corner sofa |
| `armchair` | Armchair |
| `armchair-relax` | Reclining armchair |
| `design-chair` | Designer chair |
| `bench` | Cushioned bench |
| `pillow` | Pillow |
| `coffee-table` | Coffee table |
| `side-table` | Side table |
| `table` | Table |
| `table-round` | Round table |
| `table-glass` | Glass table |

### Pantry

| id | what it is |
|---|---|
| `coffee-machine` | Coffee machine |
| `kitchen-bar` | Kitchen counter |
| `kitchen-cabinet` | Kitchen cabinet |
| `fridge` | Small fridge |
| `microwave` | Microwave |
| `toaster` | Toaster |
| `sink` | Sink |
| `bar-stool` | Bar stool |

### Screens and sound

| id | what it is |
|---|---|
| `tv` | TV |
| `tv-cabinet` | TV cabinet |
| `speaker` | Floor speaker |
| `speaker-small` | Small speaker |
| `radio` | Radio |
| `laptop` | Laptop |
| `tv-wall` | TV on a cabinet with a speaker each side |

### Light and air

| id | what it is |
|---|---|
| `lamp-floor` | Round floor lamp |
| `lamp-floor-square` | Square floor lamp |
| `lamp-table` | Table lamp |
| `ceiling-fan` | Ceiling fan |

### Rugs and odds

| id | what it is |
|---|---|
| `rug` | Rectangle rug |
| `rug-round` | Round rug |
| `rug-square` | Square rug |
| `doormat` | Doormat |
| `coat-rack` | Coat rack |
| `trashcan` | Trash can |

### Ready-made sets

| id | what it is |
|---|---|
| `coffee-corner` | Coffee corner: counter, coffee machine, small fridge, stool |
| `reading-nook` | Armchair, floor lamp, side table and books |
| `lounge-set` | Sofa facing a coffee table with a rug under both |

### Drawn in code

| id | what it is |
|---|---|
| `cat` | Office cat (say its color: "color": "#e08a3c") |
| `logo` | Your logo on the back wall (put logo.png in this folder; without it, your initials) |

All models are CC0 from Kenney (kenney.nl): free to use, no credit required.

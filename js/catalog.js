// The accessory catalog: the id you write in accessories.json -> the model it loads.
// ACCESSORIES.md is the human copy of this list; test/run.mjs keeps them equal.
// Every file is a CC0 model from Kenney (kenney.nl). "cat" and "logo" are drawn in code.
export const CATALOG = {
  // plants
  "plant":            { file: "furniture/pottedPlant.glb", label: "Tall potted plant" },
  "plant-small":      { file: "furniture/plantSmall1.glb", label: "Small plant" },
  "plant-small-2":    { file: "furniture/plantSmall2.glb", label: "Small plant, round pot" },
  "plant-small-3":    { file: "furniture/plantSmall3.glb", label: "Small plant, leafy" },
  "cactus":           { file: "furniture/cactus_tall.glb", label: "Tall cactus" },
  "cactus-small":     { file: "furniture/cactus_short.glb", label: "Short cactus" },
  // books and storage
  "bookshelf":        { file: "furniture/bookcaseOpen.glb", label: "Open bookshelf" },
  "bookshelf-closed": { file: "furniture/bookcaseClosed.glb", label: "Closed bookshelf" },
  "bookshelf-wide":   { file: "furniture/bookcaseClosedWide.glb", label: "Wide bookshelf" },
  "bookshelf-low":    { file: "furniture/bookcaseOpenLow.glb", label: "Low bookshelf" },
  "books":            { file: "furniture/books.glb", label: "Stack of books" },
  "boxes":            { file: "furniture/cardboardBoxClosed.glb", label: "Cardboard box" },
  "box-open":         { file: "furniture/cardboardBoxOpen.glb", label: "Open box" },
  // lounge
  "sofa":             { file: "furniture/loungeSofa.glb", label: "Sofa" },
  "sofa-long":        { file: "furniture/loungeSofaLong.glb", label: "Long sofa" },
  "sofa-corner":      { file: "furniture/loungeSofaCorner.glb", label: "Corner sofa" },
  "armchair":         { file: "furniture/loungeChair.glb", label: "Armchair" },
  "armchair-relax":   { file: "furniture/loungeChairRelax.glb", label: "Reclining armchair" },
  "design-chair":     { file: "furniture/loungeDesignChair.glb", label: "Designer chair" },
  "bench":            { file: "furniture/benchCushion.glb", label: "Cushioned bench" },
  "pillow":           { file: "furniture/pillow.glb", label: "Pillow" },
  "coffee-table":     { file: "furniture/tableCoffee.glb", label: "Coffee table" },
  "side-table":       { file: "furniture/sideTable.glb", label: "Side table" },
  "table":            { file: "furniture/table.glb", label: "Table" },
  "table-round":      { file: "furniture/tableRound.glb", label: "Round table" },
  "table-glass":      { file: "furniture/tableGlass.glb", label: "Glass table" },
  // pantry
  "coffee-machine":   { file: "furniture/kitchenCoffeeMachine.glb", label: "Coffee machine" },
  "kitchen-bar":      { file: "furniture/kitchenBar.glb", label: "Kitchen counter" },
  "kitchen-cabinet":  { file: "furniture/kitchenCabinet.glb", label: "Kitchen cabinet" },
  "fridge":           { file: "furniture/kitchenFridgeSmall.glb", label: "Small fridge" },
  "microwave":        { file: "furniture/kitchenMicrowave.glb", label: "Microwave" },
  "toaster":          { file: "furniture/toaster.glb", label: "Toaster" },
  "sink":             { file: "furniture/kitchenSink.glb", label: "Sink" },
  "bar-stool":        { file: "furniture/stoolBar.glb", label: "Bar stool" },
  // screens and sound
  "tv":               { file: "furniture/televisionModern.glb", label: "TV" },
  "tv-cabinet":       { file: "furniture/cabinetTelevision.glb", label: "TV cabinet" },
  "speaker":          { file: "furniture/speaker.glb", label: "Floor speaker" },
  "speaker-small":    { file: "furniture/speakerSmall.glb", label: "Small speaker" },
  "radio":            { file: "furniture/radio.glb", label: "Radio" },
  "laptop":           { file: "furniture/laptop.glb", label: "Laptop" },
  // light and air
  "lamp-floor":       { file: "furniture/lampRoundFloor.glb", label: "Round floor lamp" },
  "lamp-floor-square":{ file: "furniture/lampSquareFloor.glb", label: "Square floor lamp" },
  "lamp-table":       { file: "furniture/lampRoundTable.glb", label: "Table lamp" },
  "ceiling-fan":      { file: "furniture/ceilingFan.glb", label: "Ceiling fan", y: 1.25 },
  // rugs and odds
  "rug":              { file: "furniture/rugRectangle.glb", label: "Rectangle rug" },
  "rug-round":        { file: "furniture/rugRound.glb", label: "Round rug" },
  "rug-square":       { file: "furniture/rugSquare.glb", label: "Square rug" },
  "doormat":          { file: "furniture/rugDoormat.glb", label: "Doormat" },
  "coat-rack":        { file: "furniture/coatRackStanding.glb", label: "Coat rack" },
  "trashcan":         { file: "furniture/trashcan.glb", label: "Trash can" },
  // ready-made sets: several pieces placed together as one accessory
  "coffee-corner":    { label: "Coffee corner: counter, coffee machine, small fridge, stool", parts: [
    { file: "furniture/kitchenCabinet.glb" },
    { file: "furniture/kitchenCoffeeMachine.glb", y: 0.43, z: -0.02 },
    { file: "furniture/kitchenFridgeSmall.glb", x: 0.62 },
    { file: "furniture/stoolBar.glb", z: 0.62 } ] },
  "tv-wall":          { label: "TV on a cabinet with a speaker each side", parts: [
    { file: "furniture/cabinetTelevision.glb" },
    { file: "furniture/televisionModern.glb", y: 0.3 },
    { file: "furniture/speakerSmall.glb", x: -0.75 },
    { file: "furniture/speakerSmall.glb", x: 0.75 } ] },
  "reading-nook":     { label: "Armchair, floor lamp, side table and books", parts: [
    { file: "furniture/loungeChair.glb" },
    { file: "furniture/lampRoundFloor.glb", x: 0.62, z: -0.2 },
    { file: "furniture/sideTable.glb", x: -0.62 },
    { file: "furniture/books.glb", x: -0.62, y: 0.3 } ] },
  "lounge-set":       { label: "Sofa facing a coffee table with a rug under both", parts: [
    { file: "furniture/rugRectangle.glb", z: 0.35 },
    { file: "furniture/loungeSofa.glb" },
    { file: "furniture/tableCoffee.glb", z: 0.75 } ] },
  // drawn in code
  "cat":              { procedural: "cat", label: "Office cat (say its color: \"color\": \"#e08a3c\")" },
  "logo":             { procedural: "logo", label: "Your logo on the back wall (put logo.png in this folder; without it, your initials)" },
  // travel and display, drawn in code (js/props.js)
  "display-shelf":    { procedural: "displayShelf", wall: { w: 1.3, d: 0.12 }, label: "Lit display shelf on the back wall, six souvenirs in black-framed cubbies" },
  "meeting-table":    { procedural: "meetingTable", big: 1.6, label: "Long meeting table with four black leather chairs and two laptops" },
  "airplane-model":   { procedural: "airplane", label: "Model airplane on a stand" },
  "hot-air-balloon":  { procedural: "balloon", label: "Hot air balloon on a stand" },
  "parasol":          { procedural: "parasol", label: "Yellow paper parasol" },
  "globe":            { procedural: "globe", label: "Desk globe" },
  "suitcase":         { procedural: "suitcase", label: "Rolling suitcase (say its color: \"color\": \"#f39a1e\")" },
  "palm":             { procedural: "palm", label: "Potted palm tree" },
  "trophy":           { procedural: "trophy", label: "Crystal award" },
  "teddy-bear":       { procedural: "teddy", label: "Teddy bear in a yellow shirt" },
  // the system on the walls, and bigger rooms (js/props.js)
  "led-screen":       { procedural: "ledScreen", wall: { w: 1.45, d: 0.06 }, label: "LED wall screen, live: \"show\": \"team\", \"tasks\", \"brain\" or \"work\"" },
  "world-map":        { procedural: "worldMap", wall: { w: 1.25, d: 0.03 }, label: "World map with pins, on the wall" },
  "meeting-room":     { procedural: "meetingRoom", big: 1.8, label: "Glass meeting room: round table, four chairs and a TV" },
  "reception-desk":   { procedural: "receptionDesk", label: "Reception desk with a monitor and a bell (best at the entrance spot)" },
  "whiteboard":       { procedural: "whiteboard", label: "Whiteboard on wheels" },
  "water-dispenser":  { procedural: "waterDispenser", label: "Water dispenser" },
  "printer":          { procedural: "printer", label: "Office printer" },
};

// What an LED screen can show, set with "show" on the accessory. The first is the default.
export const SCREEN_SHOWS = ["team", "tasks", "brain", "work"];

// The room itself, set in company.json as "look". The first value is the default.
export const LOOKS = {
  walls: ["plain", "wood-slat"],
  floor: ["wood", "stone"],
  outside: ["lawn", "island"],
};

// Named places you can use instead of x/z coordinates.
export const SPOTS = ["lounge", "pantry", "entrance", "hub", "back-left", "back-right", "front-left", "front-right"];

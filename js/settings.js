// PROJECT SETTINGS for the 3D scene. The page chrome reads css/tokens.css; WebGL cannot,
// so the scene colors live here as numbers. The shared ones (lawn, ink, accent) must
// stay identical to the CSS; test/run.mjs checks.
export const SETTINGS = {
  brand: { name: "", logo: "" },
  content: { cta: "" },
  behavior: { animations: true, pollSeconds: 3 },
  integration: { analyticsId: "" },
  scene: {
    lawn: 0x9fac62,
    slabSide: 0x8e6136,
    floor: 0xf1e9da,
    floorLine: 0xe3d7c2,
    wall: 0xdcc38d,
    wallTrim: 0xf4efe3,
    rug: 0xd9b98a,
    hubRug: 0xb8563c,
    ink: 0x17242b,
    accent: 0xb8563c,
    sun: 0xffe6bf,
    bounce: 0xb08a5a,
    // the "look" options in company.json (see ACCESSORIES.md)
    slat: 0xd8ba8e,      // walls: "wood-slat"
    slatLine: 0xa98a5e,
    stone: 0xe9e4dc,     // floor: "stone"
    stoneLine: 0xd6cfc3,
    sea: 0x5cc0d8,       // outside: "island"
    shallows: 0x9fe2ea,
    sand: 0xf0dcab,
  },
};

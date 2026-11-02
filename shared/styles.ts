export type Category =
  | "Orgânicos"
  | "Pastéis"
  | "Editoriais"
  | "Escuros"
  | "Vibrantes"
  | "Técnicos";
export interface StyleTokens {
  background: string;
  ink: string;
  palette: string[];
  font: "sans" | "serif" | "mono";
  fontSize: number;
  radius: number;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  pattern: "dots" | "grid" | "none";
  shadow: "none" | "soft" | "offset";
  nodeStyle: "soft" | "outline" | "solid";
  spacing: number;
  rootFill?: string;
  rootText?: string;
  rootBorder?: string;
  rootRadius?: number;
}
export interface Preset {
  id: string;
  name: string;
  category: Category;
  description: string;
  tokens: StyleTokens;
}
const base: StyleTokens = {
  background: "#f8f9f5",
  ink: "#263b32",
  palette: ["#699c73", "#e8ad6c", "#9097cb", "#6aa8b4", "#cc7e83", "#a4a15c"],
  font: "sans",
  fontSize: 16,
  radius: 14,
  lineWidth: 2,
  lineStyle: "solid",
  pattern: "dots",
  shadow: "soft",
  nodeStyle: "soft",
  spacing: 42,
};
function p(
  id: string,
  name: string,
  category: Category,
  description: string,
  colors: string[],
  overrides: Partial<StyleTokens> = {},
): Preset {
  return {
    id,
    name,
    category,
    description,
    tokens: { ...base, palette: colors, ...overrides },
  };
}
export const PRESETS: Preset[] = [
  p("botanica", "Botânica", "Orgânicos", "Ideias que crescem naturalmente.", [
    "#679979",
    "#d4aa63",
    "#8e93ba",
    "#78a9b0",
    "#c78782",
    "#9fa66a",
  ]),
  p(
    "floresta",
    "Floresta",
    "Orgânicos",
    "Camadas de verde e profundidade.",
    ["#25634b", "#478a61", "#72a574", "#a0ba7f", "#998152", "#50796c"],
    { background: "#f2f5eb", font: "serif", radius: 22 },
  ),
  p(
    "terracota",
    "Terracota",
    "Orgânicos",
    "Argila, areia e formas acolhedoras.",
    ["#bd7254", "#d7a160", "#9e9f74", "#af8372", "#ceae85", "#7f956e"],
    { background: "#faf3e9", ink: "#4f392d", shadow: "none", radius: 24 },
  ),
  p(
    "oceano",
    "Oceano",
    "Orgânicos",
    "Correntes azuis em um horizonte aberto.",
    ["#267c95", "#57a6ad", "#5d86be", "#86b6c7", "#4e9c8c", "#959fd0"],
    { background: "#f1f8fa", ink: "#244d62", lineWidth: 3 },
  ),
  p(
    "deserto",
    "Deserto",
    "Orgânicos",
    "O essencial, em tons solares.",
    ["#c79945", "#bf7659", "#aa9e72", "#8a9362", "#cdad7a", "#ae8580"],
    { background: "#faf5e7", font: "serif", pattern: "none", shadow: "none" },
  ),
  p(
    "salvia",
    "Sálvia",
    "Orgânicos",
    "Silêncio visual para organizar o pensamento.",
    ["#91a08a", "#b7ad8d", "#829893", "#a3a69b", "#abb99b", "#9899a7"],
    { background: "#f4f5f0", radius: 6, shadow: "none", lineWidth: 1.5 },
  ),
  p(
    "lavanda",
    "Lavanda",
    "Pastéis",
    "Leveza com um toque lilás.",
    ["#9e8bc7", "#cba0b6", "#92aec8", "#b3b78c", "#c7ac84", "#a3c3bb"],
    { background: "#f8f5fd", ink: "#51436a", radius: 24 },
  ),
  p(
    "algodao",
    "Algodão",
    "Pastéis",
    "Rosa suave e espaço para respirar.",
    ["#d5a0b3", "#acbfe0", "#dcc49e", "#b5c5b4", "#c0afe0", "#a5cecd"],
    { background: "#fff8fa", ink: "#674d5a", pattern: "none", radius: 28 },
  ),
  p(
    "sorvete",
    "Sorvete",
    "Pastéis",
    "Uma paleta doce para ideias frescas.",
    ["#eb9f95", "#9fc9b3", "#e6c378", "#b0a0d0", "#8dbdcf", "#d8ac88"],
    { background: "#fffbf0", radius: 18, shadow: "offset" },
  ),
  p(
    "matcha",
    "Matcha latte",
    "Pastéis",
    "Verde cremoso com notas de pêssego.",
    ["#a7bb7f", "#d1b190", "#bdcfa0", "#d7bba9", "#9eb7a0", "#c4b879"],
    { background: "#fafbf2", ink: "#526343", font: "serif", pattern: "none" },
  ),
  p(
    "aurora",
    "Aurora",
    "Pastéis",
    "Cores tranquilas, conexões fluidas.",
    ["#91bbb1", "#b69cc8", "#99b8d2", "#d8b59b", "#a3c893", "#d1a1bb"],
    { background: "#f5f8fb", lineStyle: "dotted", lineWidth: 3, radius: 20 },
  ),
  p(
    "pessego",
    "Pêssego",
    "Pastéis",
    "Calor e delicadeza em equilíbrio.",
    ["#d29b7b", "#c9b075", "#b9a3bb", "#a3b59c", "#c6a19b", "#9fbdc1"],
    { background: "#fff5ed", ink: "#735348", font: "serif", shadow: "none" },
  ),
  p(
    "jornal",
    "Jornal",
    "Editoriais",
    "Tipografia clássica. Ideias em destaque.",
    ["#3b3b3b", "#696969", "#808080", "#999999", "#585858", "#aaaaaa"],
    {
      background: "#f8f6ef",
      ink: "#242424",
      font: "serif",
      nodeStyle: "outline",
      radius: 0,
      pattern: "none",
      shadow: "none",
      lineWidth: 1.5,
    },
  ),
  p(
    "bauhaus",
    "Bauhaus",
    "Editoriais",
    "Formas fortes e cores fundamentais.",
    ["#db493c", "#e7b93e", "#3b70a8", "#303c48", "#cb7d49", "#678582"],
    {
      background: "#f8f3e5",
      ink: "#252b32",
      radius: 0,
      shadow: "offset",
      lineWidth: 3,
    },
  ),
  p(
    "swiss",
    "Swiss",
    "Editoriais",
    "Precisão, estrutura e um acento vermelho.",
    ["#d8473f", "#717d83", "#9ca3a6", "#bb716b", "#465763", "#aba29b"],
    {
      background: "#ffffff",
      ink: "#20262b",
      radius: 0,
      nodeStyle: "outline",
      pattern: "grid",
      shadow: "none",
      fontSize: 15,
    },
  ),
  p(
    "caderno",
    "Caderno",
    "Editoriais",
    "O prazer de pensar no papel.",
    ["#526e93", "#b47770", "#799577", "#b39c64", "#a48caa", "#719c9e"],
    {
      background: "#fffdf5",
      ink: "#334966",
      font: "serif",
      pattern: "grid",
      nodeStyle: "outline",
      shadow: "none",
      lineStyle: "dashed",
    },
  ),
  p(
    "galeria",
    "Galeria",
    "Editoriais",
    "Um espaço em branco para suas ideias.",
    ["#565656", "#8e7668", "#92897a", "#797c73", "#838b94", "#a49891"],
    {
      background: "#ffffff",
      ink: "#282828",
      font: "serif",
      radius: 2,
      pattern: "none",
      shadow: "none",
      spacing: 55,
    },
  ),
  p(
    "cobalto",
    "Cobalto",
    "Editoriais",
    "Azul editorial com presença gráfica.",
    ["#365ed6", "#6b7ca7", "#89a0d2", "#c69363", "#8895b6", "#afbbdb"],
    {
      background: "#f4f6fc",
      ink: "#223d85",
      radius: 4,
      nodeStyle: "outline",
      shadow: "offset",
      lineWidth: 2.5,
    },
  ),
  p(
    "meia-noite",
    "Meia-noite",
    "Escuros",
    "Um céu profundo para grandes ideias.",
    ["#84a6f5", "#a18ed4", "#6fbeb0", "#d2a76e", "#cc8caa", "#84b9c7"],
    {
      background: "#151d2e",
      ink: "#e8edf9",
      nodeStyle: "outline",
      shadow: "none",
    },
  ),
  p(
    "dracula",
    "Drácula",
    "Escuros",
    "Contrastes de violeta e verde elétrico.",
    ["#bd93f9", "#50cba0", "#f291b8", "#edc477", "#7cbddd", "#d99a74"],
    {
      background: "#252533",
      ink: "#f5f3ff",
      font: "mono",
      radius: 8,
      pattern: "none",
    },
  ),
  p(
    "nord",
    "Nord",
    "Escuros",
    "O azul frio encontra a clareza.",
    ["#88c0d0", "#81a1c1", "#a3be8c", "#d7b379", "#b48ead", "#b87b80"],
    { background: "#2e3440", ink: "#eceff4", radius: 8, shadow: "none" },
  ),
  p(
    "carbono",
    "Carbono",
    "Escuros",
    "Monocromático e concentrado.",
    ["#b7bfc9", "#8c98a5", "#d4d8df", "#9fabb8", "#788a9c", "#b3bbc5"],
    {
      background: "#17191d",
      ink: "#f1f2f4",
      nodeStyle: "outline",
      radius: 2,
      pattern: "grid",
      font: "mono",
      shadow: "none",
    },
  ),
  p(
    "cosmos",
    "Cosmos",
    "Escuros",
    "Lilás e magenta entre constelações.",
    ["#b79be8", "#d288c0", "#84a0e3", "#67b6bf", "#cc9e74", "#9686d6"],
    {
      background: "#21192f",
      ink: "#f5edff",
      radius: 25,
      lineStyle: "dotted",
      lineWidth: 3,
    },
  ),
  p(
    "esmeralda",
    "Esmeralda",
    "Escuros",
    "Verde luminoso sobre a noite.",
    ["#7bc79e", "#a4c27b", "#65afa5", "#c7b179", "#9da5cd", "#83b1be"],
    {
      background: "#142a26",
      ink: "#e1f7eb",
      nodeStyle: "outline",
      radius: 20,
      shadow: "none",
    },
  ),
  p(
    "carnaval",
    "Carnaval",
    "Vibrantes",
    "Cada ramo, uma nova energia.",
    ["#e86b80", "#e8bc43", "#48b499", "#747ad5", "#e78a4d", "#52a9cf"],
    {
      background: "#fffaf3",
      ink: "#313345",
      shadow: "offset",
      radius: 18,
      lineWidth: 3,
    },
  ),
  p(
    "pop",
    "Pop art",
    "Vibrantes",
    "Ideias com volume máximo.",
    ["#ee5680", "#ecc437", "#53abc8", "#9c70d2", "#72b875", "#e2944d"],
    {
      background: "#fffce8",
      ink: "#242633",
      nodeStyle: "solid",
      radius: 0,
      shadow: "offset",
      lineWidth: 3,
      fontSize: 18,
    },
  ),
  p(
    "sunset",
    "Sunset",
    "Vibrantes",
    "Um pôr do sol em cada conexão.",
    ["#dd7762", "#dbab53", "#bc6f9c", "#9676bd", "#dc966d", "#bc9873"],
    { background: "#fff6eb", ink: "#754039", radius: 24, lineWidth: 3 },
  ),
  p(
    "tropical",
    "Tropical",
    "Vibrantes",
    "Verdes vivos, ideias ensolaradas.",
    ["#2b9d7a", "#e7b745", "#e37672", "#679cce", "#a880b4", "#90b958"],
    { background: "#f6fbef", ink: "#2e5842", radius: 20, shadow: "none" },
  ),
  p(
    "memphis",
    "Memphis",
    "Vibrantes",
    "Geometria que gosta de experimentar.",
    ["#d774a2", "#55b0ae", "#d7b94d", "#9a7bc7", "#e88d61", "#718bc5"],
    {
      background: "#fff6f0",
      ink: "#463e65",
      shadow: "offset",
      radius: 5,
      pattern: "grid",
      lineStyle: "dashed",
    },
  ),
  p(
    "citrus",
    "Citrus",
    "Vibrantes",
    "Fresco, claro e cheio de movimento.",
    ["#a5b941", "#d6ae42", "#64a984", "#ca8c53", "#6aa5ad", "#a698bd"],
    {
      background: "#fbffe9",
      ink: "#3e5228",
      nodeStyle: "solid",
      radius: 28,
      pattern: "none",
    },
  ),
  p(
    "blueprint",
    "Blueprint",
    "Técnicos",
    "A planta das suas próximas ideias.",
    ["#83b9e3", "#aed7ed", "#75a6cf", "#b1c3e9", "#8aced6", "#99b0d4"],
    {
      background: "#16375c",
      ink: "#e4f2ff",
      font: "mono",
      nodeStyle: "outline",
      radius: 0,
      pattern: "grid",
      shadow: "none",
      lineWidth: 1.5,
    },
  ),
  p(
    "terminal",
    "Terminal",
    "Técnicos",
    "Pensamento em modo de comando.",
    ["#7abb85", "#9bca7d", "#65b7a1", "#b2c589", "#77ad97", "#99b5a0"],
    {
      background: "#15221c",
      ink: "#c3eacc",
      font: "mono",
      nodeStyle: "outline",
      radius: 0,
      pattern: "none",
      shadow: "none",
      lineStyle: "dashed",
    },
  ),
  p(
    "circuito",
    "Circuito",
    "Técnicos",
    "Conexões precisas e raciocínio claro.",
    ["#579baf", "#877ac0", "#68a697", "#be9474", "#6992c4", "#a17ea5"],
    {
      background: "#f0f6f8",
      ink: "#314655",
      font: "mono",
      radius: 4,
      pattern: "grid",
      nodeStyle: "outline",
      shadow: "none",
    },
  ),
  p(
    "wireframe",
    "Wireframe",
    "Técnicos",
    "A estrutura vem primeiro.",
    ["#667788", "#8899aa", "#778899", "#99aabb", "#5e7184", "#a1acb7"],
    {
      background: "#ffffff",
      ink: "#334455",
      font: "mono",
      nodeStyle: "outline",
      radius: 0,
      pattern: "dots",
      shadow: "none",
      lineWidth: 1,
    },
  ),
  p(
    "isometrico",
    "Isométrico",
    "Técnicos",
    "Blocos de informação com dimensão.",
    ["#6a8bc3", "#78ad9a", "#ad8cc0", "#c1a26f", "#c28487", "#79a7b6"],
    {
      background: "#f3f5fb",
      ink: "#334663",
      font: "mono",
      radius: 2,
      shadow: "offset",
      pattern: "grid",
      spacing: 50,
    },
  ),
  p(
    "laboratorio",
    "Laboratório",
    "Técnicos",
    "Curiosidade com método.",
    ["#408d98", "#839e63", "#a67eac", "#c69c55", "#7198c3", "#bf8282"],
    {
      background: "#f9fbfc",
      ink: "#304f58",
      font: "mono",
      radius: 10,
      nodeStyle: "outline",
      shadow: "none",
      lineStyle: "dotted",
    },
  ),
];
export const FONT_FAMILIES = {
  sans: "Arial, sans-serif",
  serif: "Georgia, serif",
  mono: "Consolas, monospace",
};
export function resolveStyle(
  id: string,
  overrides: Partial<StyleTokens> = {},
): StyleTokens {
  const preset = PRESETS.find((s) => s.id === id);
  if (!preset) throw new Error("Estilo desconhecido.");
  return { ...preset.tokens, ...overrides };
}
/** Root-only adjustments; absent fields preserve the preset's existing appearance. */
export function resolveRootStyle(tokens: StyleTokens): {
  fill: string;
  text: string;
  border: string;
  radius: number;
} {
  const fill = tokens.rootFill ?? tokens.ink;
  return {
    fill,
    text: tokens.rootText ?? contrast(fill),
    border: tokens.rootBorder ?? fill,
    radius: tokens.rootRadius ?? tokens.radius,
  };
}
export function mix(hex: string, background: string, weight = 0.2): string {
  const channels = [1, 3, 5].map((i) =>
    Math.round(
      parseInt(hex.slice(i, i + 2), 16) * weight +
        parseInt(background.slice(i, i + 2), 16) * (1 - weight),
    ),
  );
  return "#" + channels.map((v) => v.toString(16).padStart(2, "0")).join("");
}
export function contrast(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 0.179 ? "#17222b" : "#ffffff";
}

import type { ReactNode } from "react";
import {
  FaAppleWhole,
  FaBookOpen,
  FaCarSide,
  FaCloudSun,
  FaCube,
  FaHouse,
  FaMusic,
  FaPaw,
  FaPuzzlePiece,
  FaSeedling,
  FaShirt,
  FaStethoscope,
  FaTv,
  FaUserLarge,
} from "react-icons/fa6";
import registry from "../../content/icon-registry.json";

export type IconKind =
  | "animal"
  | "clothing"
  | "food"
  | "health"
  | "home"
  | "music"
  | "nature"
  | "object"
  | "person"
  | "place"
  | "school"
  | "tech"
  | "toy"
  | "transport"
  | "weather";

interface IconVisualMeta {
  icon: ReactNode;
  badge: string;
  panel: string;
  iconClass: string;
}

const iconKinds = registry as Record<string, IconKind>;

const kindMeta: Record<IconKind, IconVisualMeta> = {
  animal: {
    icon: <FaPaw />,
    badge: "bg-[rgba(126,97,61,0.14)] text-[#6e5131]",
    panel: "from-[#fff2de] to-[#f7e3ca]",
    iconClass: "text-3xl",
  },
  clothing: {
    icon: <FaShirt />,
    badge: "bg-[rgba(182,81,109,0.14)] text-[var(--rose)]",
    panel: "from-[#fff1f4] to-[#f8dde6]",
    iconClass: "text-3xl",
  },
  food: {
    icon: <FaAppleWhole />,
    badge: "bg-[rgba(198,92,59,0.14)] text-[var(--accent-strong)]",
    panel: "from-[#fff2ea] to-[#f6d5c4]",
    iconClass: "text-3xl",
  },
  health: {
    icon: <FaStethoscope />,
    badge: "bg-[rgba(31,111,120,0.14)] text-[var(--teal)]",
    panel: "from-[#edf9fa] to-[#d9eef0]",
    iconClass: "text-3xl",
  },
  home: {
    icon: <FaHouse />,
    badge: "bg-[rgba(137,112,78,0.16)] text-[#6d4e2d]",
    panel: "from-[#fff7ed] to-[#efe1ce]",
    iconClass: "text-3xl",
  },
  music: {
    icon: <FaMusic />,
    badge: "bg-[rgba(97,88,194,0.14)] text-[#4d46a6]",
    panel: "from-[#f3f1ff] to-[#e2ddff]",
    iconClass: "text-3xl",
  },
  nature: {
    icon: <FaSeedling />,
    badge: "bg-[rgba(59,130,96,0.14)] text-[#2f6f4b]",
    panel: "from-[#eefaf1] to-[#dbf0e0]",
    iconClass: "text-3xl",
  },
  object: {
    icon: <FaCube />,
    badge: "bg-[rgba(112,100,84,0.14)] text-[#635544]",
    panel: "from-[#fbf5ef] to-[#e9dfd3]",
    iconClass: "text-3xl",
  },
  person: {
    icon: <FaUserLarge />,
    badge: "bg-[rgba(72,110,154,0.14)] text-[#375b84]",
    panel: "from-[#eef4fb] to-[#dde8f6]",
    iconClass: "text-3xl",
  },
  place: {
    icon: <FaHouse />,
    badge: "bg-[rgba(142,118,74,0.14)] text-[#72561d]",
    panel: "from-[#fff8e7] to-[#f0e2bf]",
    iconClass: "text-3xl",
  },
  school: {
    icon: <FaBookOpen />,
    badge: "bg-[rgba(83,108,161,0.14)] text-[#3b5586]",
    panel: "from-[#eef2fb] to-[#dfe6f7]",
    iconClass: "text-3xl",
  },
  tech: {
    icon: <FaTv />,
    badge: "bg-[rgba(62,77,105,0.14)] text-[#344256]",
    panel: "from-[#eef1f5] to-[#dde4ee]",
    iconClass: "text-3xl",
  },
  toy: {
    icon: <FaPuzzlePiece />,
    badge: "bg-[rgba(211,164,68,0.16)] text-[#8b6317]",
    panel: "from-[#fff7e9] to-[#f1e0b8]",
    iconClass: "text-3xl",
  },
  transport: {
    icon: <FaCarSide />,
    badge: "bg-[rgba(31,111,120,0.16)] text-[var(--teal)]",
    panel: "from-[#eef9fb] to-[#d9eff2]",
    iconClass: "text-3xl",
  },
  weather: {
    icon: <FaCloudSun />,
    badge: "bg-[rgba(217,146,28,0.16)] text-[#936314]",
    panel: "from-[#fff8eb] to-[#f0e1bc]",
    iconClass: "text-3xl",
  },
};

const exactEmoji: Record<string, string> = {
  apple: "🍎",
  bag: "👜",
  ball: "⚽",
  banana: "🍌",
  bath: "🛁",
  bed: "🛏️",
  beige: "🟫",
  bell: "🔔",
  bike: "🚲",
  bird: "🐦",
  boat: "⛵",
  book: "📘",
  boot: "🥾",
  box: "📦",
  boy: "👦",
  brother: "🧑",
  brush: "🖌️",
  bus: "🚌",
  cake: "🎂",
  car: "🚗",
  cat: "🐱",
  chair: "🪑",
  cheese: "🧀",
  chicken: "🐔",
  clock: "🕒",
  cloud: "☁️",
  coat: "🧥",
  coin: "🪙",
  cook: "🧑‍🍳",
  cookie: "🍪",
  cow: "🐄",
  cup: "☕",
  doctor: "🧑‍⚕️",
  dog: "🐶",
  door: "🚪",
  dress: "👗",
  drum: "🥁",
  duck: "🦆",
  eye: "👁️",
  fan: "🪭",
  feather: "🪶",
  fish: "🐟",
  foot: "🦶",
  fork: "🍴",
  game: "🎮",
  garage: "🅿️",
  gift: "🎁",
  giraffe: "🦒",
  glass: "🥛",
  goat: "🐐",
  hand: "✋",
  hat: "🧢",
  horse: "🐴",
  house: "🏠",
  jacket: "🧥",
  jam: "🍓",
  juice: "🧃",
  key: "🔑",
  king: "🤴",
  kite: "🪁",
  lamp: "💡",
  leaf: "🍃",
  lemon: "🍋",
  light: "💡",
  lion: "🦁",
  map: "🗺️",
  milk: "🥛",
  moon: "🌙",
  mother: "👩",
  mouse: "🐭",
  needle: "🪡",
  nest: "🪺",
  nose: "👃",
  nurse: "🧑‍⚕️",
  oil: "🛢️",
  panda: "🐼",
  paper: "📄",
  pen: "🖊️",
  phone: "📱",
  pig: "🐷",
  pizza: "🍕",
  plane: "✈️",
  purse: "👛",
  rabbit: "🐰",
  rain: "🌧️",
  ring: "💍",
  river: "🏞️",
  road: "🛣️",
  robot: "🤖",
  rose: "🌹",
  salad: "🥗",
  seat: "💺",
  sheep: "🐑",
  ship: "🚢",
  shirt: "👕",
  shoe: "👟",
  snake: "🐍",
  sock: "🧦",
  sofa: "🛋️",
  song: "🎵",
  soup: "🍲",
  spoon: "🥄",
  star: "⭐",
  sun: "☀️",
  tea: "🍵",
  teacher: "🧑‍🏫",
  television: "📺",
  thermometer: "🌡️",
  thumb: "👍",
  tiger: "🐯",
  tomato: "🍅",
  tooth: "🦷",
  toy: "🧸",
  train: "🚆",
  treasure: "💎",
  van: "🚐",
  vase: "🏺",
  violin: "🎻",
  watch: "⌚",
  water: "💧",
  weather: "🌦️",
  whale: "🐋",
  window: "🪟",
  wing: "🪽",
  yard: "🏡",
  yellow: "🟡",
  yogurt: "🥣",
  yoyo: "🪀",
  zipper: "🤐",
  zoo: "🦓",
};

export function getIconVisual(key: string) {
  const kind = iconKinds[key] ?? "object";
  const meta = kindMeta[kind];
  const emoji = exactEmoji[key];

  if (!emoji) {
    return meta;
  }

  return {
    ...meta,
    icon: (
      <span aria-label={key} role="img">
        {emoji}
      </span>
    ),
    iconClass: "text-5xl leading-none",
  };
}

export function hasIconKey(key: string) {
  return key in iconKinds;
}

const logosByTicker: Record<string, { src: string; background: string }> = {
  NBK: { src: "/company-logos/nbk.png", background: "#f0f3fa" },
  KFH: { src: "/company-logos/kfh.png", background: "#ffffff" },
  ZAIN: { src: "/company-logos/zain.png", background: "#020c4b" },
  GBK: { src: "/company-logos/gulf-bank.png", background: "#ffffff" },
  MKHZN: { src: "/company-logos/agility.png", background: "#ffffff" },
  BOUBYAN: { src: "/company-logos/boubyan.png", background: "#ffffff" },
  MABANEE: { src: "/company-logos/mabanee.png", background: "#ffffff" },
  HUMANSOFT: { src: "/company-logos/humansoft.png", background: "#fbfbfb" },
  BOURSA: { src: "/company-logos/boursa-kuwait.png", background: "#cda468" },
  OOREDOO: { src: "/company-logos/ooredoo.png", background: "#ffffff" },
  WARBABANK: { src: "/company-logos/warba-bank.png", background: "#ffffff" },
  CBK: { src: "/company-logos/commercial-bank.png", background: "#ffffff" },
  XAU: { src: "/metals/gold.svg", background: "#f4ecda" },
  XAG: { src: "/metals/silver.svg", background: "#e8edf1" },
};

export function companyLogoFor(ticker: string, fallback = "") {
  return fallback || logosByTicker[ticker.trim().toUpperCase()]?.src || "";
}

export function companyLogoBgFor(ticker: string, fallback = "") {
  return fallback || logosByTicker[ticker.trim().toUpperCase()]?.background || "#ffffff";
}

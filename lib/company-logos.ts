const logosByTicker: Record<string, string> = {
  NBK: "/company-logos/nbk.png",
  KFH: "/company-logos/kfh.png",
  ZAIN: "/company-logos/zain.png",
  GBK: "/company-logos/gulf-bank.png",
  MKHZN: "/company-logos/agility.png",
  BOUBYAN: "/company-logos/boubyan.png",
  MABANEE: "/company-logos/mabanee.png",
  HUMANSOFT: "/company-logos/humansoft.png",
  BOURSA: "/company-logos/boursa-kuwait.png",
  OOREDOO: "/company-logos/ooredoo.png",
  WARBABANK: "/company-logos/warba-bank.png",
  CBK: "/company-logos/commercial-bank.png",
};

export function companyLogoFor(ticker: string, fallback = "") {
  return logosByTicker[ticker.trim().toUpperCase()] ?? fallback;
}

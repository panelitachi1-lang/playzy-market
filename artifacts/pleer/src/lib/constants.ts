export const GAME_COLORS: Record<string, string> = {
  "Free Fire": "#FF4E00",
  "PUBG Mobile": "#E8B800",
  "Telegram": "#2AABEE",
  "Roblox": "#E3372F",
  "Brawl Stars": "#9B3DE8",
  "Genshin Impact": "#4F7CE8",
  "CS2": "#F06400",
  "Steam": "#1B2838",
  "Стриминг": "#1DB954",
  "Mobile Legends": "#C30000",
  "Minecraft": "#62B347",
  "Valorant": "#FF4655",
  "Fortnite": "#00C8FF",
  "Apex Legends": "#DA3E2F",
  "Clash Royale": "#5C4AE4",
  "Clash of Clans": "#F4A52D",
  "Dota 2": "#C23C2A",
  "League of Legends": "#C89B3C",
  "Call of Duty": "#4A7C59",
  "FIFA": "#0E4D92",
  "NBA 2K": "#C8102E",
  "Pokemon GO": "#FFCB05",
  "Among Us": "#C51111",
  "GTA V": "#F7941C",
  "Overwatch 2": "#F99E1A",
  "Rocket League": "#1A91C5",
  "Warframe": "#4CDFFF",
  "Diablo IV": "#AA0000",
  "World of Warcraft": "#14437A",
  "Rainbow Six Siege": "#000B19",
  "Fall Guys": "#F99FD8",
  "Stumble Guys": "#5B3FE8",
  "Standoff 2": "#D4460C",
  "8 Ball Pool": "#2D8653",
}

export const ALL_GAMES = Object.keys(GAME_COLORS)

export const getGameColor = (category: string | null | undefined) => {
  if (!category) return "#6B7280"
  return GAME_COLORS[category] || "#6B7280"
}

/** Map game names → public image paths */
export const GAME_IMAGES: Record<string, string> = {
  "Free Fire":          "/games/freefile.png",
  "PUBG Mobile":        "/games/pubg.png",
  "Telegram":           "/games/telegram.png",
  "Roblox":             "/games/roblox.jpg",
  "Brawl Stars":        "/games/brawlstars.jpg",
  "Genshin Impact":     "/games/genshin.png",
  "CS2":                "/games/cs2.jpg",
  "Steam":              "/games/steam.jpg",
  "Стриминг":           "/games/streaming.jpg",
  "Mobile Legends":     "/games/mobilelegends.jpg",
  "Minecraft":          "/games/minecraft.png",
  "Valorant":           "/games/valorant.jpg",
  "Fortnite":           "/games/fortnite.jpg",
  "Apex Legends":       "/games/apex.jpg",
  "Clash Royale":       "/games/clashroyale.jpg",
  "Clash of Clans":     "/games/clashofclans.jpg",
  "Dota 2":             "/games/dota2.jpg",
  "League of Legends":  "/games/league.png",
  "Call of Duty":       "/games/codmobile.png",
  "FIFA":               "/games/fifa.jpg",
  "NBA 2K":             "/games/nba2k.jpg",
  "Pokemon GO":         "/games/pokemongo.png",
  "Among Us":           "/games/amongus.jpg",
  "GTA V":              "/games/gtav.jpg",
  "Overwatch 2":        "/games/ow2.jpg",
  "Rocket League":      "/games/rocket.jpg",
  "Warframe":           "/games/warframe.jpg",
  "Diablo IV":          "/games/diablo4.jpg",
  "World of Warcraft":  "/games/wow.jpg",
  "Rainbow Six Siege":  "/games/r6.jpg",
  "Fall Guys":          "/games/fallguys.jpg",
  "Stumble Guys":       "/games/stumble.jpg",
  "Standoff 2":         "/games/standoff2.png",
  "8 Ball Pool":        "/games/8ball.jpg",
}

export const getGameImage = (name: string | null | undefined) =>
  (name && GAME_IMAGES[name]) || null

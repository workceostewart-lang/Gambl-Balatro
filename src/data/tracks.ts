export type Track = {
  id: string;
  title: string;
  file: string;
  source: "Pixabay" | "StockTune";
  duration: string;
};

// Display metadata from Music/Gambl_Balatro_Music_PRD.md.
// Filenames are the exact supplied originals; never rename the assets.
export const tracks: readonly Track[] = [
  {
    id: "casino-vip",
    title: "Casino VIP",
    file: "casino-vip-music-mafia-casino-jazz-2-469343.mp3",
    source: "Pixabay",
    duration: "4:44",
  },
  {
    id: "las-vegas-intro",
    title: "Las Vegas Intro Theme",
    file: "mfcc-jazz-music-casino-poker-roulette-las-vegas-background-intro-theme-287498.mp3",
    source: "Pixabay",
    duration: "1:29",
  },
  {
    id: "casino-jazz",
    title: "Casino Jazz",
    file: "dpstudiomusic-casino-jazz-317385.mp3",
    source: "Pixabay",
    duration: "1:57",
  },
  {
    id: "whiskey-bar",
    title: "Whiskey Bar Jazz",
    file: "maksymmalko-jazz-background-music-bar-restaurant-casino-mafia-whiskey-249670.mp3",
    source: "Pixabay",
    duration: "1:15",
  },
  {
    id: "saxophone-restaurant",
    title: "Saxophone Restaurant",
    file: "alex-morgan-saxophone-jazz-restaurant-567542.mp3",
    source: "Pixabay",
    duration: "2:03",
  },
  {
    id: "moonlit-lounge",
    title: "Moonlit Jazz Lounge Serenade",
    file: "StockTune-Moonlit_Jazz_Lounge_Serenade_1790212108.mp3",
    source: "StockTune",
    duration: "3:01",
  },
];
export const trackUrl = (track: Track) =>
  `${import.meta.env.BASE_URL}audio/music/${encodeURIComponent(track.file)}`;

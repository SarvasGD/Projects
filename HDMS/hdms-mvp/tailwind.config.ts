import type { Config } from "tailwindcss";
const config: Config = {
content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
theme: {
extend: {
colors: {
hs: {
bg: "#0a0e14",
panel: "#151a24",
border: "#2a3140",
gold: "#d4af37",
blue: "#4a9eff",
red: "#e04a4a",
green: "#4ae07a",
text: "#e8e6e3",
muted: "#8a8a8a"
}
}
}
},
plugins: []
};
export default config;
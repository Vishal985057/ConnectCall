import React from "react";
const COLORS = ["#1a73e8","#34a853","#f29900","#ea4335","#9c27b0","#00bcd4","#ff5722","#607d8b"];
function colorFor(n) {
  let h = 0;
  for (let i = 0; i < (n||"").length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffff;
  return COLORS[h % COLORS.length];
}
export default function GmAvatar({ name, size = 40 }) {
  const init = (name||"?").trim().split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colorFor(name), display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: Math.max(11, Math.round(size * 0.38)),
      fontWeight: 500, color: "#fff",
      fontFamily: "Google Sans, Roboto, sans-serif",
      flexShrink: 0, userSelect: "none",
    }}>{init}</div>
  );
}

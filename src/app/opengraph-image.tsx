import { ImageResponse } from "next/og";

export const alt = "5GPak - Pakistan 5G coverage and network insights";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f4f5f6", color: "#111827", padding: "64px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
        <div style={{ width: "76px", height: "76px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", background: "#1d1d1d", color: "#77e8bd", fontSize: "38px", fontWeight: 800 }}>5G</div>
        <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "44px", fontWeight: 800 }}>5GPak</span><span style={{ fontSize: "20px", color: "#64748b" }}>Pakistan network companion</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "950px" }}>
        <div style={{ fontSize: "66px", lineHeight: 1.06, fontWeight: 800 }}>Pakistan 5G coverage, site data and network status</div>
        <div style={{ marginTop: "24px", fontSize: "25px", lineHeight: 1.4, color: "#475569" }}>Provider-published locations, privacy-preserving community signals, and independently reviewed speed-test insights.</div>
      </div>
      <div style={{ display: "flex", gap: "12px" }}><span style={{ width: "180px", height: "10px", background: "#49cbeb" }} /><span style={{ width: "180px", height: "10px", background: "#77e8bd" }} /><span style={{ width: "180px", height: "10px", background: "#f9c74f" }} /></div>
    </div>,
    size,
  );
}

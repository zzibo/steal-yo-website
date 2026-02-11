import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: card } = await supabase
    .from("cards")
    .select("vibe, stops")
    .eq("slug", slug)
    .single();

  if (!card) {
    return new Response("Not found", { status: 404 });
  }

  const stops = (card.stops as Array<{ order: number; name: string; time: string; category: string; price: string }>)
    .sort((a, b) => a.order - b.order);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#FAF8F5",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Vibe tag */}
        <div
          style={{
            display: "flex",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#737373",
              border: "1px solid #d4d4d4",
              borderRadius: 9999,
              padding: "6px 16px",
            }}
          >
            {card.vibe}
          </span>
        </div>

        {/* Stops */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {stops.map((stop, i) => (
            <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1a",
                  border: "2px solid #d4d4d4",
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "#a3a3a3",
                  }}
                >
                  {stop.time}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#171717",
                    marginTop: 2,
                  }}
                >
                  {stop.name}
                </span>
                <span style={{ fontSize: 14, color: "#737373", marginTop: 4 }}>
                  {stop.category} &middot; {stop.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #e5e5e5",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "#a3a3a3",
            }}
          >
            DateDrop &middot; San Francisco
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

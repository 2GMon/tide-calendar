import { Moon } from "lunarphase-js";

import { stationToPlace, lunarToTide } from "../../../const";

function formatYYYYMMDD(date: Date) {
  return date.toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "2-digit", day: "2-digit" }
  ).replaceAll("/", "");
}

function calendar(place: string, today: Date) {
  let ical = "BEGIN\r\n";
  ical += "VERSION:2.0\r\n";
  ical += "PRODID: 2GMon\r\n";
  ical += "CALSCALE:GREGORIAN\r\n";
  ical += "METHOD:PUBLISH\r\n";
  ical += `X-WR-CALNAME:${place}の潮汐(MIRC方式)\r\n`;
  ical += "X-WR-TIMEZONE:Asia/Tokyo\r\n";
  for (let i = 0; i < 90; i++) {
    ical += "BEGIN:VEVENT\r\n";
    ical += `DTSTART;VALUE=DATE:${formatYYYYMMDD(today)}\r\n`;
    const lunarAge = Moon.lunarAge(today);
    const tide = lunarToTide[Math.round(lunarAge)];

    today.setDate(today.getDate() + 1);
    ical += `DTEND;VALUE=DATE:${formatYYYYMMDD(today)}\r\n`;
    ical += `SUMMARY:${tide}\r\n`
    ical += "END:VEVENT\r\n";
  }

  return ical;
}

export async function GET(
  request: Request,
  { params }: { params: { station: string } }
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const place = stationToPlace[params.station];
  const ical = calendar(place, today);

  return new Response(
    ical,
    {
      status: 200,
      headers: {
        "content-type": "text/calendar",
      }
    }
  );
}

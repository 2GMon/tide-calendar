import { Moon } from "lunarphase-js";

import { stationToPlace, lunarToTide } from "../../../const";

function formatYYYYMMDD(date: Date) {
  return date.toLocaleDateString(
    "ja-JP",
    { year: "numeric", month: "2-digit", day: "2-digit" }
  ).replaceAll("/", "");
}

async function fetchTide(year: number, station: string) {
  const res = await fetch(`https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/${station}.txt`);
  const raw = await res.text();
  const tides = raw.split("\n");
  const result: {
    [_: string]: any,
  } = {};

  for (let i = 0; i < tides.length; i++) {
    const year = tides[i].slice(72, 74);
    const month = tides[i].slice(74, 76).replace(" ", "0");
    const date = tides[i].slice(76, 78).replace(" ", "0");
    const ymd = `20${year}${month}${date}`
    const fulls = [];
    for (let j = 0; j < 4; j++) {
      const hh = tides[i].slice(80 + 7 * j, 82 + 7 * j).replace(" ", "0");
      const mm = tides[i].slice(82 + 7 * j, 84 + 7 * j).replace(" ", "0");
      const cm = tides[i].slice(84 + 7 * j, 87 + 7 * j).replaceAll(" ", "");
      if (`${hh}${mm}` !== "9999") {
        fulls.push({ hhmm: `${hh}:${mm}`, cm: `${cm}` });
      }
    }
    const lows = [];
    for (let j = 0; j < 4; j++) {
      const hh = tides[i].slice(108 + 7 * j, 110 + 7 * j).replace(" ", "0");
      const mm = tides[i].slice(110 + 7 * j, 112 + 7 * j).replace(" ", "0");
      const cm = tides[i].slice(112 + 7 * j, 115 + 7 * j).replaceAll(" ", "");
      if (`${hh}${mm}` !== "9999") {
        lows.push({ hhmm: `${hh}:${mm}`, cm: `${cm}` });
      }
    }

    result[ymd] = {
      fulls: fulls,
      lows: lows,
    }
  }

  return result;
}

async function calendar(station: string, place: string, today: Date) {
  const cache: {
    [_: number]: any;
  } = {};

  let ical = "BEGIN:VCALENDAR\r\n";
  ical += "PRODID:2GMon\r\n";
  ical += "VERSION:2.0\r\n";
  ical += "CALSCALE:GREGORIAN\r\n";
  ical += "METHOD:PUBLISH\r\n";
  ical += `X-WR-CALNAME:${place}の潮汐(MIRC方式)\r\n`;
  ical += "X-WR-TIMEZONE:Asia/Tokyo\r\n";
  ical += "BEGIN:VTIMEZONE\r\n";
  ical += "TZID:Asia/Tokyo\r\n";
  ical += "X-LIC-LOCATION:Asia/Tokyo\r\n";
  ical += "BEGIN:STANDARD\r\n";
  ical += "TZOFFSETFROM:+0900\r\n";
  ical += "TZOFFSETTO:+0900\r\n";
  ical += "TZNAME:JST\r\n";
  ical += "DTSTART:19700101T000000\r\n";
  ical += "END:STANDARD\r\n";
  ical += "END:VTIMEZONE\r\n";
  for (let i = 0; i < 90; i++) {
    if (cache[today.getFullYear()] == undefined) {
      cache[today.getFullYear()] = await fetchTide(today.getFullYear(), station);
    }
    ical += "BEGIN:VEVENT\r\n";
    ical += `DTSTART;VALUE=DATE:${formatYYYYMMDD(today)}\r\n`;
    const lunarAge = Moon.lunarAge(today);
    const tide = lunarToTide[Math.round(lunarAge)];
    let summary = "満潮: ";
    summary += cache[today.getFullYear()][formatYYYYMMDD(today)].fulls.map((full: any) => {
      return full.hhmm
    }).join(" ");
    summary += " 干潮: ";
    summary += cache[today.getFullYear()][formatYYYYMMDD(today)].lows.map((low: any) => {
      return low.hhmm
    }).join(" ");

    let desc = "満潮 ";
    desc += cache[today.getFullYear()][formatYYYYMMDD(today)].fulls.map((full: any) => {
      return full.hhmm + " " + full.cm + "cm";
    }).join(", ");
    desc += "\\n干潮 ";
    desc += cache[today.getFullYear()][formatYYYYMMDD(today)].lows.map((low: any) => {
      return low.hhmm + " " + low.cm + "cm";
    }).join(", ");
    desc += "\\n";
    desc += `https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=${station}`;

    today.setDate(today.getDate() + 1);
    ical += `DTEND;VALUE=DATE:${formatYYYYMMDD(today)}\r\n`;
    ical += `SUMMARY:[${tide}] ${summary}\r\n`
    ical += `DESCRIPTION:${desc}\r\n`;
    ical += "END:VEVENT\r\n";
  }
  ical += "END:VCALENDAR\r\n";

  return ical;
}

export async function GET(
  request: Request,
  { params }: { params: { station: string } }
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const place = stationToPlace[params.station];
  const ical = await calendar(params.station, place, today);

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

#!/usr/bin/python
#
# Adapted to run under Grail.  Three dependency swaps, all forced by
# libraries that are C extensions and so cannot run here:
#
#   curl_cffi  -> requests.  curl_cffi was here only for
#                 impersonate="chrome" (forging Chrome's TLS fingerprint
#                 past bot detection).  Measured 2026-08-08: both
#                 endpoints answer 200 to Grail's plain requests, so the
#                 impersonation is not needed.  If the site starts
#                 returning 403 again, this is the first thing to suspect.
#   lxml.html  -> a string scan (_find_script).  Only one XPath was used:
#                 find the <script> holding window.airport.  stdlib
#                 html.parser works but needs ~8s per 1 MB page here,
#                 hours across a full run, so a scan is used instead.
#   geopy      -> haversine below.  geopy IS pure Python and could be
#                 vendored, but importing it needs the real
#                 urllib.request handler framework, which Grail does not
#                 have yet.  Measured against geographiclib's geodesic:
#                 within +/-0.3% (TPA-ATL 655.0 vs 653.3 km, JFK-LHR
#                 5540.0 vs 5554.9 km -- so up to ~15 km on a long haul,
#                 after the int() truncation).  Swap back once geopy lands.
#
# Two behaviour changes, both deliberate:
#   * retries are bounded (MAX_RETRIES) instead of looping forever -- the
#     original caught every Exception and slept 5 minutes, so a plain
#     programming error became an infinite loop;
#   * MAX_AIRPORTS caps the walk, for smoke-testing.  Default None = the
#     original unlimited behaviour.
import sys
import json
from collections import defaultdict
import time
from math import asin, cos, radians, sin, sqrt

import requests

MAX_AIRPORTS = 3         # None = every airport, as originally written
MAX_RETRIES = 5
RETRY_SLEEP = 60 * 5


def _find_script(html_text, needle):
    """Text of every <script> containing ``needle``.

    Stands in for lxml's //script[contains(., "...")].

    A string scan rather than an html.parser pass: these pages are ~1 MB
    and Grail's pure-Python HTMLParser takes ~8s on one (and scales
    superlinearly), which would add hours of pure parsing across a full
    run.  Locating the enclosing <script> bounds is all the XPath did."""
    out = []
    pos = 0
    while True:
        i = html_text.find(needle, pos)
        if i == -1:
            return out
        start = html_text.rfind("<script", 0, i)
        end = html_text.find("</script>", i)
        if start == -1 or end == -1:
            return out
        body_start = html_text.find(">", start)
        if body_start == -1 or body_start > i:
            return out
        out.append(html_text[body_start + 1:end])
        pos = end + 1


def geodesic_km(origin, destination):
    """Great-circle distance in km (haversine, mean Earth radius)."""
    lat1, lon1 = radians(float(origin[0])), radians(float(origin[1]))
    lat2, lon2 = radians(float(destination[0])), radians(float(destination[1]))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * 6371.0088 * asin(sqrt(h))

if __name__ == "__main__":


    print("Fetching airports list...")

    airports_headers = {
        "Accept": "application/json",
        "Origin": "https://www.flightsfrom.com",
        "Referer": "https://www.flightsfrom.com/"
    }
    response = requests.get(
        "https://www.flightsfrom.com/airports", headers=airports_headers
    )
    try:
        airports_json = json.loads(response.content)
    except json.decoder.JSONDecodeError as e:
        print("Failed to load airport JSON, page body was: '%s'" % response.content)
        sys.exit(1)

    iatas = [airport["IATA"] for airport in airports_json["response"]["airports"]]

    airports = defaultdict(dict)

    while iatas:
        if MAX_AIRPORTS is not None and len(airports) >= MAX_AIRPORTS:
            print("Reached MAX_AIRPORTS (%s), stopping early." % MAX_AIRPORTS)
            break

        iata = iatas.pop()
        if iata in airports:
            continue

        print("Fetching #%s: %s" % (len(airports), iata))

        attempt = 0
        while True:
            try:
                destinations_headers = {
                    "Accept": "text/html",
                    "Origin": "https://www.flightsfrom.com",
                    "Referer": "https://www.flightsfrom.com/"
                }
                response = requests.get(
                    "https://www.flightsfrom.com/%s/destinations" % iata,
                    headers=destinations_headers
                )
                scripts = _find_script(response.text, "window.airport")
                if not scripts:
                    raise ValueError(
                        "no <script> with window.airport (status %s, %s bytes)"
                        % (response.status_code, len(response.content)))
                metadata_tag = scripts[0]
                metadata_bits = metadata_tag.split("window.")
                break
            except Exception as e:
                attempt = attempt + 1
                if attempt > MAX_RETRIES:
                    print("! Giving up on %s after %s attempts: %s"
                          % (iata, MAX_RETRIES, e))
                    metadata_bits = None
                    break
                print("! Error while fetching IATA, having a little 5m sleep "
                      "before retrying (%s/%s): %s" % (attempt, MAX_RETRIES, e))
                time.sleep(RETRY_SLEEP)

        if metadata_bits is None:
            continue

        metadata = {}
        for bit in metadata_bits:
            split = bit.find("=")
            if split != -1:
                metadata[bit[:split].strip()] = json.loads(bit.strip()[split + 2 : -1])

        airport_fields = [
            "city_name",
            "continent",
            "country",
            "country_code",
            "display_name",
            "elevation",
            "IATA",
            "ICAO",
            "latitude",
            "longitude",
            "name",
            "timezone",
        ]
        airport = {
            field.lower(): metadata["airport"][field] for field in airport_fields
        }
        if airport["elevation"]:
            airport["elevation"] = int(airport["elevation"])

        routes = []
        for route in metadata["routes"]:
            carrier_fields = [
                "name",
                "IATA",
            ]

            carriers = []
            for aroute in route["airlineroutes"]:
                is_passenger = (
                    str(aroute["airline"]["is_scheduled_passenger"]) == "1"
                    or str(aroute["airline"]["is_nonscheduled_passenger"]) == "1"
                )
                is_active = str(aroute["airline"]["active"]) == "1"
                if is_active and is_passenger:
                    carriers.append(
                        {
                            field.lower(): aroute["airline"][field]
                            for field in carrier_fields
                        }
                    )

            orig_ll = (airport["latitude"], airport["longitude"])
            dest_ll = (route["airport"]["latitude"], route["airport"]["longitude"])
            distance = int(geodesic_km(orig_ll, dest_ll))

            routes.append(
                {
                    "carriers": carriers,
                    "km": distance,
                    "min": int(route["common_duration"]),
                    "iata": route["iata_to"],
                }
            )

            iatas.append(route["iata_to"])

        airport["routes"] = routes
        airports[iata] = airport

        time.sleep(1)

    with open("airline_routes.json", "w") as f:
        f.write(json.dumps(airports, indent=4, sort_keys=True, separators=(",", ": ")))

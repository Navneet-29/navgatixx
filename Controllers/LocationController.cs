using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace navgatix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationController : ControllerBase
    {
        private static readonly HttpClient _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(8)
        };

        static LocationController()
        {
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("NavgatixApp/1.0 (contact@navgatix.co.in)");
        }

        public class LocationSearchResult
        {
            public string DisplayName { get; set; } = string.Empty;
            public string Lat { get; set; } = string.Empty;
            public string Lon { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string Type { get; set; } = string.Empty;
        }

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] double? lat = null, [FromQuery] double? lng = null)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            {
                return Ok(new List<LocationSearchResult>());
            }

            var cleanQuery = q.Trim();
            var results = new List<LocationSearchResult>();
            var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // 1. Try Photon (Komoot) Geocoding Engine - Optimized for small local places, landmarks & shops
            try
            {
                var photonUrl = $"https://photon.komoot.io/api/?q={Uri.EscapeDataString(cleanQuery)}&limit=10&countrycodes=in";
                if (lat.HasValue && lng.HasValue)
                {
                    photonUrl += $"&lat={lat.Value}&lon={lng.Value}";
                }

                var response = await _httpClient.GetAsync(photonUrl);
                if (response.IsSuccessStatusCode)
                {
                    using var stream = await response.Content.ReadAsStreamAsync();
                    using var doc = await JsonDocument.ParseAsync(stream);
                    if (doc.RootElement.TryGetProperty("features", out var features) && features.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var feature in features.EnumerateArray())
                        {
                            if (!feature.TryGetProperty("properties", out var props) || !feature.TryGetProperty("geometry", out var geom)) continue;
                            if (!geom.TryGetProperty("coordinates", out var coords) || coords.GetArrayLength() < 2) continue;

                            double lon = coords[0].GetDouble();
                            double ltt = coords[1].GetDouble();

                            var nameParts = new List<string>();
                            if (props.TryGetProperty("name", out var n) && !string.IsNullOrWhiteSpace(n.GetString())) nameParts.Add(n.GetString()!);
                            if (props.TryGetProperty("street", out var st) && !string.IsNullOrWhiteSpace(st.GetString())) nameParts.Add(st.GetString()!);
                            if (props.TryGetProperty("housenumber", out var hn) && !string.IsNullOrWhiteSpace(hn.GetString())) nameParts.Add($"#{hn.GetString()!}");
                            if (props.TryGetProperty("district", out var dist) && !string.IsNullOrWhiteSpace(dist.GetString())) nameParts.Add(dist.GetString()!);
                            if (props.TryGetProperty("city", out var ct) && !string.IsNullOrWhiteSpace(ct.GetString())) nameParts.Add(ct.GetString()!);
                            if (props.TryGetProperty("state", out var state) && !string.IsNullOrWhiteSpace(state.GetString())) nameParts.Add(state.GetString()!);
                            if (props.TryGetProperty("postcode", out var pc) && !string.IsNullOrWhiteSpace(pc.GetString())) nameParts.Add(pc.GetString()!);

                            var fullAddress = string.Join(", ", nameParts);
                            if (string.IsNullOrWhiteSpace(fullAddress)) continue;

                            if (seenNames.Add(fullAddress))
                            {
                                results.Add(new LocationSearchResult
                                {
                                    DisplayName = fullAddress,
                                    Lat = ltt.ToString("F6"),
                                    Lon = lon.ToString("F6"),
                                    Category = props.TryGetProperty("osm_key", out var k) ? k.GetString() ?? "" : "",
                                    Type = props.TryGetProperty("osm_value", out var v) ? v.GetString() ?? "" : ""
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Photon Search Error: {ex.Message}");
            }

            // 2. Fallback / Complementary Search via OpenStreetMap Nominatim
            if (results.Count < 5)
            {
                try
                {
                    var nominatimUrl = $"https://nominatim.openstreetmap.org/search?format=json&q={Uri.EscapeDataString(cleanQuery)}&addressdetails=1&countrycodes=in&limit=10";
                    var response = await _httpClient.GetAsync(nominatimUrl);
                    if (response.IsSuccessStatusCode)
                    {
                        using var stream = await response.Content.ReadAsStreamAsync();
                        using var doc = await JsonDocument.ParseAsync(stream);
                        if (doc.RootElement.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in doc.RootElement.EnumerateArray())
                            {
                                var displayName = item.TryGetProperty("display_name", out var dn) ? dn.GetString() : "";
                                var latStr = item.TryGetProperty("lat", out var lt) ? lt.GetString() : "";
                                var lonStr = item.TryGetProperty("lon", out var ln) ? ln.GetString() : "";

                                if (!string.IsNullOrWhiteSpace(displayName) && !string.IsNullOrWhiteSpace(latStr) && !string.IsNullOrWhiteSpace(lonStr))
                                {
                                    if (seenNames.Add(displayName))
                                    {
                                        results.Add(new LocationSearchResult
                                        {
                                            DisplayName = displayName,
                                            Lat = latStr,
                                            Lon = lonStr,
                                            Category = item.TryGetProperty("class", out var cl) ? cl.GetString() ?? "" : "",
                                            Type = item.TryGetProperty("type", out var tp) ? tp.GetString() ?? "" : ""
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Nominatim Search Error: {ex.Message}");
                }
            }

            return Ok(results);
        }

        [HttpGet("reverse")]
        [AllowAnonymous]
        public async Task<IActionResult> Reverse([FromQuery] double lat, [FromQuery] double lng)
        {
            try
            {
                var nominatimUrl = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1";
                var response = await _httpClient.GetAsync(nominatimUrl);
                if (response.IsSuccessStatusCode)
                {
                    using var stream = await response.Content.ReadAsStreamAsync();
                    using var doc = await JsonDocument.ParseAsync(stream);
                    var root = doc.RootElement;
                    var displayName = root.TryGetProperty("display_name", out var dn) ? dn.GetString() : "";
                    
                    return Ok(new
                    {
                        displayName = displayName ?? $"{lat:F4}, {lng:F4}",
                        lat = lat.ToString("F6"),
                        lon = lng.ToString("F6")
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Reverse Geocode Error: {ex.Message}");
            }

            return Ok(new
            {
                displayName = $"{lat:F4}, {lng:F4}",
                lat = lat.ToString("F6"),
                lon = lng.ToString("F6")
            });
        }
    }
}

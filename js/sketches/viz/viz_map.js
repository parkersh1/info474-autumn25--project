// viz_map.js
// Severity-weighted heat map for Washington traffic incidents.
// Cell color = average severity, opacity = crash density.

(function () {
    window.VizMap = {
        draw: function (p, manager, ai, progress) {
            p.push();

            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var w = manager.width || 720;
            var h = manager.height || 520;

            // persistent state
            if (!manager._vizMap) manager._vizMap = { initialized: false };
            var M = manager._vizMap;

            // WA bounds
            var lonMin = -125.0, lonMax = -116.9;
            var latMin = 45.5, latMax = 49.05;

            // grid resolution
            var GRID_COLS = 36;
            var GRID_ROWS = 60;

            var boxX = left;
            var boxY = top;
            var boxW = w;
            var boxH = h;

            // === 1. INITIALIZE / LOAD DATA ONCE =====================================
            if (!M.initialized) {
                M.initialized = true;
                M.loading = true;
                M.dataError = false;
                M.lastLoadMsg = 'Loading data from data/US_Accidents_March23_WA.csv...';

                var CSV_PATH = 'data/US_Accidents_March23_WA.csv';

                // grid[ry][cx] = { count, sevSum }
                M.grid = [];
                for (var r = 0; r < GRID_ROWS; r++) {
                    var row = [];
                    for (var c = 0; c < GRID_COLS; c++) row.push({ count: 0, sevSum: 0 });
                    M.grid.push(row);
                }
                M.maxCount = 1;

                function inBounds(lat, lon) {
                    return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
                }

                function addPoint(lat, lon, sev) {
                    if (!inBounds(lat, lon)) return;
                    var xNorm = (lon - lonMin) / (lonMax - lonMin);
                    var yNorm = (lat - latMin) / (latMax - latMin);

                    var cx = Math.floor(xNorm * GRID_COLS);
                    var cy = Math.floor(yNorm * GRID_ROWS);
                    if (cx < 0) cx = 0;
                    if (cx >= GRID_COLS) cx = GRID_COLS - 1;
                    if (cy < 0) cy = 0;
                    if (cy >= GRID_ROWS) cy = GRID_ROWS - 1;

                    var cell = M.grid[cy][cx];
                    cell.count += 1;
                    cell.sevSum += sev;
                    if (cell.count > M.maxCount) M.maxCount = cell.count;
                }

                function parseCsvText(csvText) {
                    try {
                        Papa.parse(csvText, {
                            download: false,
                            header: true,
                            skipEmptyLines: true,
                            worker: false,
                            step: function (results) {
                                var row = results.data || {};
                                var sevRaw = row['Severity'] || row['severity'] || row['SEVERITY'];
                                var latRaw = row['Start_Lat'] || row['start_lat'] || row['START_LAT'];
                                var lngRaw = row['Start_Lng'] || row['start_lng'] || row['START_LNG'];

                                var sev = parseInt(sevRaw, 10);
                                var lat = parseFloat(latRaw);
                                var lon = parseFloat(lngRaw);
                                if (isNaN(sev) || sev < 1 || sev > 4) return;
                                if (isNaN(lat) || isNaN(lon)) return;

                                addPoint(lat, lon, sev);
                            },
                            complete: function () {
                                // pre-compute average severities
                                M.avgSevGrid = [];
                                for (var rr = 0; rr < GRID_ROWS; rr++) {
                                    var rrow = [];
                                    for (var cc = 0; cc < GRID_COLS; cc++) {
                                        var cell = M.grid[rr][cc];
                                        var avg = cell.count ? (cell.sevSum / cell.count) : 0;
                                        rrow.push(avg);
                                    }
                                    M.avgSevGrid.push(rrow);
                                }

                                window.__WA_ACC_GRID = {
                                    grid: M.grid,
                                    avgSevGrid: M.avgSevGrid,
                                    maxCount: M.maxCount,
                                    gridCols: GRID_COLS,
                                    gridRows: GRID_ROWS
                                };

                                M.loading = false;
                                M.dataError = false;
                                M.lastLoadMsg = 'Loaded data from ' + CSV_PATH;
                                console.log('VizMap heat map: grid built, max cell count =', M.maxCount);
                            },
                            error: function (err) {
                                console.error('VizMap heat map: Papa.parse error', err);
                                M.dataError = true;
                                M.loading = false;
                                M.lastLoadMsg = 'Papa.parse error, see console.';
                            }
                        });
                    } catch (e) {
                        console.error('VizMap heat map: exception in parseCsvText', e);
                        M.dataError = true;
                        M.loading = false;
                        M.lastLoadMsg = 'Exception in parseCsvText, see console.';
                    }
                }

                function startLoad() {
                    console.log('VizMap heat map: fetching CSV via fetch()', CSV_PATH);
                    fetch(CSV_PATH, { method: 'GET', cache: 'no-store' })
                        .then(function (resp) {
                            if (!resp.ok) {
                                console.error('VizMap heat map: fetch failed', resp.status, resp.statusText);
                                M.dataError = true;
                                M.loading = false;
                                M.lastLoadMsg = 'Fetch failed for ' + CSV_PATH + ' (' + resp.status + ')';
                                return null;
                            }
                            return resp.text();
                        })
                        .then(function (text) {
                            if (!text) return;
                            parseCsvText(text);
                        })
                        .catch(function (err) {
                            console.error('VizMap heat map: fetch error', err);
                            M.dataError = true;
                            M.loading = false;
                            M.lastLoadMsg = 'Fetch error for ' + CSV_PATH + ', see console.';
                        });
                }

                if (window.__WA_ACC_GRID && window.__WA_ACC_GRID.grid) {
                    var cache = window.__WA_ACC_GRID;
                    M.grid = cache.grid;
                    M.avgSevGrid = cache.avgSevGrid;
                    M.maxCount = cache.maxCount || 1;
                    M.loading = false;
                    M.dataError = false;
                    M.lastLoadMsg = 'Using cached severity grid.';
                } else {
                    if (window.Papa) {
                        startLoad();
                    } else {
                        console.log('VizMap heat map: loading PapaParse from CDN...');
                        var s = document.createElement('script');
                        s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
                        s.onload = startLoad;
                        s.onerror = function (e) {
                            console.error('VizMap heat map: failed to load PapaParse', e);
                            M.dataError = true;
                            M.loading = false;
                            M.lastLoadMsg = 'Failed to load PapaParse from CDN.';
                        };
                        document.head.appendChild(s);
                    }
                }
            }

            // === 2. TITLE / LOADING STATES =========================================

            p.fill(0);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(16);
            p.text('Where and how severely people crash in Washington',
                   boxX + boxW / 2, boxY + 6);

            if (M.loading) {
                p.fill(80);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(12);
                p.text(M.lastLoadMsg || 'Loading data...', boxX + 8, boxY + 30);
                p.pop();
                return;
            }
            if (M.dataError || !M.grid || !M.avgSevGrid) {
                p.fill(120);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(12);
                p.text(M.lastLoadMsg || 'Data failed to load.', boxX + 8, boxY + 30);
                p.pop();
                return;
            }

            // === 3. MAP AREA (LOWER + LARGER) ======================================

            var targetAspect = (lonMax - lonMin) / (latMax - latMin); // ~2.3

            // allow more vertical space so map is taller
            var maxMapW = boxW - 60;       // small horizontal margin
            var maxMapH = boxH - 170;      // leave room for title + legend

            var innerW = maxMapW;
            var innerH = innerW / targetAspect;
            if (innerH > maxMapH) {
                innerH = maxMapH;
                innerW = innerH * targetAspect;
            }

            // place map lower on the canvas
            var innerX = boxX + (boxW - innerW) / 2;
            var innerY = boxY + 80;  // lower than before

            // === 4. DRAW HEAT CELLS ================================================

            var cellW = innerW / GRID_COLS;
            var cellH = innerH / GRID_ROWS;
            var maxCount = Math.max(1, M.maxCount || 1);

            function colorForSeverity(avg) {
                if (avg <= 0) return p.color('#cccccc');
                if (avg <= 1.5) return p.color('#00aa00');
                if (avg <= 2.5) return p.color('#F2EE1B');
                if (avg <= 3.2) return p.color('#ff8800');
                return p.color('#8b0000');
            }

            for (var ry = 0; ry < GRID_ROWS; ry++) {
                for (var cx = 0; cx < GRID_COLS; cx++) {
                    var cell = M.grid[ry][cx];
                    if (!cell || cell.count === 0) continue;

                    var avgSev = M.avgSevGrid[ry][cx] || 0;
                    var baseCol = colorForSeverity(avgSev);
                    var densityNorm = cell.count / maxCount;

                    // brighter / less transparent
                    var alpha = 150 + Math.pow(densityNorm, 0.4) * 105;
                    if (alpha > 255) alpha = 255;

                    p.noStroke();
                    p.fill(p.red(baseCol), p.green(baseCol), p.blue(baseCol), alpha);
                    var x = innerX + cx * cellW;
                    var y = innerY + innerH - (ry + 1) * cellH; // flip y
                    p.rect(x, y, cellW + 0.7, cellH + 0.7);
                }
            }

            // === 5. LEGEND BELOW MAP ===============================================

            var legendX = innerX;
            var legendY = innerY + innerH + 20;

            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.fill(0);
            p.text('Color = typical severity', legendX, legendY);

            var ly = legendY + 18;
            var legendItems = [
                { c: '#00aa00', t: 'Mostly severity 1 (low)' },
                { c: '#F2EE1B', t: 'Mostly severity 2' },
                { c: '#ff8800', t: 'Mostly severity 3' },
                { c: '#8b0000', t: 'Mostly severity 4 (high)' }
            ];
            for (var i = 0; i < legendItems.length; i++) {
                p.fill(legendItems[i].c);
                p.rect(legendX, ly + i * 16, 12, 12, 2);
                p.fill(0);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(11);
                p.text(legendItems[i].t, legendX + 18, ly + i * 16 - 2);
            }

            var ly2 = ly + legendItems.length * 16 + 10;
            p.fill(0);
            p.textSize(11);
            p.text('Darker color = more crashes\nin that area of Washington',
                   legendX, ly2);

            p.pop();
        }
    };
})();

// viz_bar.js
// Horizontal bar plot showing Severity (1-4) counts for selected Washington cities.
// Loads real data from data/US_Accidents_March23_WA.csv and presents a selector for major cities.

(function () {
    window.VizBar = {
        draw: function (p, manager, ai, progress) {
            p.push();

            var labels = ['Severity 1', 'Severity 2', 'Severity 3', 'Severity 4'];
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var availW = (manager.width || 700) - 40; // leave some right padding
            var availH = (manager.height || 520) - 20;
            var rowH = availH / labels.length;
            var barMaxW = Math.max(140, availW - 160);

            // persistent viz state on manager
            if (!manager._viz) manager._viz = { initialized: false };
            var V = manager._viz;

            // === 1. INITIALIZE AND LOAD DATA ONCE =====================================
            if (!V.initialized) {
                V.initialized = true;
                V.dataReady = false;
                V.dataError = false;
                V.countsOverall = [0, 0, 0, 0];
                V.countsByCity = {}; // city -> [c1,c2,c3,c4]
                V.topCities = [];
                V.selectedCity = 'All WA';
                V.globalMax = 1;
                V.lastLoadMsg = 'Loading data from data/US_Accidents_March23_WA.csv...';

                var CSV_PATH = 'data/US_Accidents_March23_WA.csv';

                function runParse() {
                    try {
                        console.log('viz_bar: starting Papa.parse for', CSV_PATH);
                        Papa.parse(CSV_PATH, {
                            download: true,
                            header: true,
                            skipEmptyLines: true,
                            worker: false,
                            step: function (results, parser) {
                                var row = results.data || {};
                                var sevRaw = row['Severity'] || row['severity'] || row['SEVERITY'];
                                var cityRaw = row['City'] || row['city'] || row['CITY'] || '';
                                var sev = parseInt(sevRaw);
                                var city = (cityRaw || '').trim();
                                if (!city) city = 'Unknown';
                                if (!isNaN(sev) && sev >= 1 && sev <= 4) {
                                    V.countsOverall[sev - 1]++;
                                    if (!V.countsByCity[city]) V.countsByCity[city] = [0, 0, 0, 0];
                                    V.countsByCity[city][sev - 1]++;
                                }
                            },
                            complete: function () {
                                // compute top cities by total accidents
                                var cityTotals = [];
                                for (var c in V.countsByCity) {
                                    var sum = V.countsByCity[c].reduce(function (a, b) { return a + b; }, 0);
                                    cityTotals.push({ city: c, total: sum });
                                }
                                cityTotals.sort(function (a, b) { return b.total - a.total; });
                                var topN = 15;
                                V.topCities = cityTotals.slice(0, topN).map(function (x) { return x.city; });

                                V.globalMax = 1;
                                for (var ci = 0; ci < V.topCities.length; ci++) {
                                    var arr = V.countsByCity[V.topCities[ci]];
                                    for (var k = 0; k < 4; k++) if (arr[k] > V.globalMax) V.globalMax = arr[k];
                                }
                                for (var k2 = 0; k2 < 4; k2++) if (V.countsOverall[k2] > V.globalMax) V.globalMax = V.countsOverall[k2];

                                V.dataReady = true;
                                V.staticCountsByCity = JSON.parse(JSON.stringify(V.countsByCity));
                                V.staticCountsOverall = V.countsOverall.slice();
                                V.lastLoadMsg = 'Loaded data from ' + CSV_PATH;
                                console.log('viz_bar: parse complete; topCities:', V.topCities.slice(0, 10));

                                createCitySelector();
                                updateBarCounts('All WA');
                            },
                            error: function (err) {
                                console.error('viz_bar: Papa.parse error for', CSV_PATH, err);
                                V.dataError = true;
                                V.dataReady = false;
                                V.lastLoadMsg = 'Papa.parse error, see console.';
                            }
                        });
                    } catch (e) {
                        console.error('viz_bar: exception starting Papa.parse', e);
                        V.dataError = true;
                        V.dataReady = false;
                        V.lastLoadMsg = 'Exception starting Papa.parse, see console.';
                    }
                }

                // Ensure Papa is available; if not, load from CDN then parse.
                if (window.Papa) {
                    runParse();
                } else {
                    console.log('viz_bar: loading PapaParse from CDN...');
                    var s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
                    s.onload = runParse;
                    s.onerror = function (e) {
                        console.error('viz_bar: failed to load PapaParse from CDN', e);
                        V.dataError = true;
                        V.lastLoadMsg = 'Failed to load PapaParse from CDN.';
                    };
                    document.head.appendChild(s);
                }
            }

            // === 2. HELPERS ==========================================================

            function createCitySelector() {
                if (V.cityContainer) return;
                V.cityContainer = p.createDiv('')
                    .style('position', 'absolute')
                    .style('z-index', '10000')
                    .style('background', 'transparent')
                    .style('display', 'none');
                V.cityContainer.parent(document.body);

                V.citySelect = p.createSelect().parent(V.cityContainer);
                V.citySelect.option('All WA');
                for (var i = 0; i < V.topCities.length; i++) V.citySelect.option(V.topCities[i]);
                V.citySelect.changed(function () {
                    var val = V.citySelect.value();
                    V.selectedCity = val;
                    updateBarCounts(val);
                });

                V.clearBtn = p.createButton('Reset')
                    .parent(V.cityContainer)
                    .style('margin-left', '8px');
                V.clearBtn.mousePressed(function () {
                    V.citySelect.value('All WA');
                    V.selectedCity = 'All WA';
                    updateBarCounts('All WA');
                });

                V.cityContainer.position(10, 10);
                V.selectorShown = false;
            }

            function updateBarCounts(cityName) {
                var counts = [0, 0, 0, 0];
                if (!cityName || cityName === 'All WA') counts = V.staticCountsOverall.slice();
                else if (V.staticCountsByCity && V.staticCountsByCity[cityName]) counts = V.staticCountsByCity[cityName].slice();

                var maxForNorm = Math.max(1, V.globalMax);
                manager._barCounts = counts.map(function (v) { return v / maxForNorm; });
                manager._barLabels = counts;
            }

            // === 3. DRAW TITLE / LOADING STATE =======================================

            p.noStroke();
            p.fill(0);
            p.textSize(14);
            p.textAlign(p.LEFT, p.TOP);
            p.text('Accident Severity by Level (select major city)', left, top - 18);

            if (V.dataError || !V.dataReady) {
                p.fill(120);
                p.textSize(12);
                var msg = (V && V.lastLoadMsg) ? V.lastLoadMsg : 'Data not available.';
                p.text(msg, left, top + 6);
                p.textSize(11);
                p.text('Ensure data/US_Accidents_March23_WA.csv exists and the site is served over HTTP (e.g. http://localhost:8000/).', left, top + 26);
                p.pop();
                return;
            }

            // === 4. POSITION SELECTOR ONCE DATA IS READY =============================

            if (V.dataReady && V.cityContainer && p.canvas) {
                try {
                    var crect = p.canvas.getBoundingClientRect();
                    var px = Math.round(crect.left + window.scrollX + left);
                    var py = Math.round(crect.top + window.scrollY + top - 36);
                    V.cityContainer.position(px, py);
                    if (!V.selectorShown) {
                        V.cityContainer.style('display', 'block');
                        V.selectorShown = true;
                    }
                } catch (e) { /* ignore */ }
            }

            // === 5. DRAW BARS ========================================================

            var bc = manager._barCounts || [0, 0, 0, 0];
            var labelsAbs = manager._barLabels || [0, 0, 0, 0];

            var sevColors = ['#00aa00', '#F2EE1B', '#ff0000', '#8b0000'];
            p.noStroke();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(12);

            for (var i = 0; i < labels.length; i++) {
                var y = top + i * rowH + rowH / 2;
                p.fill(30);
                p.text(labels[i], left, y);

                var valNorm = bc[i] || 0;
                var scaled = Math.pow(valNorm, 0.6);
                var bx = left + 160;
                var bw = 0;
                if (valNorm > 0) {
                    bw = Math.max(10, scaled * barMaxW);
                }
                var by = y - (rowH * 0.35);
                var bh = rowH * 0.7;
                var col = sevColors[i % sevColors.length];
                p.fill(col);
                p.rect(bx, by, bw, bh, 3);

                var absCount = labelsAbs[i] || 0;
                if (bw > 36) {
                    p.fill(255);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text('' + absCount, bx + 6, y);
                } else {
                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text('' + absCount, bx + bw + 8, y);
                }
            }

            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            var cityLabel = V.selectedCity || 'All WA';
            p.fill(0);
            p.text('Selected: ' + cityLabel, left + 20 + barMaxW, top);

            p.pop();
        }
    };
})();

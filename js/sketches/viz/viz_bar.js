// viz_bar.js
// Horizontal bar plot showing Severity (1-4) counts for selected Washington cities.
// Loads real data from data/US_Accidents_March23_WA.csv and presents a selector for major cities.
(function () {
    window.VizBar = {
        draw: function (p, manager, ai, progress) {
            p.push();

            var labels = ['Severity 1','Severity 2','Severity 3','Severity 4'];
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var availW = (manager.width || 700) - 40; // leave some right padding
            var availH = (manager.height || 520) - 20;
            var rowH = availH / labels.length;
            // Make bars wider so lower values are more visible; allow more of the available width
            var barMaxW = Math.max(140, availW - 160);

            // persistent viz state on manager
            if (!manager._viz) manager._viz = { initialized: false };
            var V = manager._viz;

            if (!V.initialized) {
                V.initialized = true;
                V.dataReady = false;
                V.dataError = false;
                V.countsOverall = [0,0,0,0];
                V.countsByCity = {}; // city -> [c1,c2,c3,c4]
                V.topCities = [];
                V.selectedCity = 'All WA';
                V.globalMax = 1;

                // try to load CSV from repo-relative data folder. Attempt several candidate paths
                V.loadAttempted = V.loadAttempted || false;
                V.lastLoadMsg = V.lastLoadMsg || '';
                if (p.loadTable) {
                    try {
                        if (!V.loadAttempted) {
                            V.loadAttempted = true;
                            var candidates = [
                                'data/US_Accidents_March23_WA.csv',
                                '/data/US_Accidents_March23_WA.csv',
                                'US_Accidents_March23_WA.csv'
                            ];

                            var tryIndex = 0;
                            function tryNext() {
                                if (tryIndex >= candidates.length) {
                                    V.lastLoadMsg = 'All attempts failed.';
                                    V.dataError = true;
                                    V.dataReady = false;
                                    console.error('viz_bar: all candidate paths failed:', candidates);
                                    return;
                                }
                                var path = candidates[tryIndex];
                                V.lastLoadMsg = 'Trying ' + path + ' (attempt ' + (tryIndex+1) + '/' + candidates.length + ')';
                                console.log('viz_bar:', V.lastLoadMsg);

                                // First do a quick fetch to check availability
                                fetch(path, {method:'GET', cache: 'no-store'}).then(function(resp){
                                    if (resp.ok) {
                                        console.log('viz_bar: fetch ok for', path, 'status', resp.status, resp.statusText);
                                        // prefer PapaParse for robust CSV parsing (handles big files and quoted fields)
                                        function doParseWithPapa(url) {
                                            function parseNow() {
                                                try {
                                                    Papa.parse(url, {
                                                        download: true,
                                                        header: true,
                                                        skipEmptyLines: true,
                                                        worker: false,
                                                        step: function(results, parser) {
                                                            var row = results.data;
                                                            // row is an object mapping header->value
                                                            var sevRaw = row['Severity'] || row['severity'] || row['SEVERITY'];
                                                            var cityRaw = row['City'] || row['city'] || row['CITY'] || '';
                                                            var sev = parseInt(sevRaw);
                                                            var city = (cityRaw || '').trim();
                                                            if (!city) city = 'Unknown';
                                                            if (!isNaN(sev) && sev >=1 && sev <=4) {
                                                                V.countsOverall[sev-1]++;
                                                                if (!V.countsByCity[city]) V.countsByCity[city] = [0,0,0,0];
                                                                V.countsByCity[city][sev-1]++;
                                                            }
                                                        },
                                                        complete: function() {
                                                            // compute top cities by total accidents
                                                            var cityTotals = [];
                                                            for (var c in V.countsByCity) {
                                                                var sum = V.countsByCity[c].reduce(function(a,b){return a+b;},0);
                                                                cityTotals.push({city:c, total:sum});
                                                            }
                                                            cityTotals.sort(function(a,b){return b.total - a.total;});
                                                            var topN = 15;
                                                            V.topCities = cityTotals.slice(0, topN).map(function(x){return x.city;});

                                                            V.globalMax = 1;
                                                            for (var ci=0; ci<V.topCities.length; ci++){
                                                                var arr = V.countsByCity[V.topCities[ci]];
                                                                for (var k=0;k<4;k++) if (arr[k] > V.globalMax) V.globalMax = arr[k];
                                                            }
                                                            for (var k2=0;k2<4;k2++) if (V.countsOverall[k2] > V.globalMax) V.globalMax = V.countsOverall[k2];

                                                            V.dataReady = true;
                                                            V.staticCountsByCity = JSON.parse(JSON.stringify(V.countsByCity));
                                                            V.staticCountsOverall = V.countsOverall.slice();
                                                            createCitySelector();
                                                            updateBarCounts('All WA');
                                                            console.log('viz_bar: loaded data from', url, 'topCities:', V.topCities.slice(0,10));
                                                        },
                                                        error: function(err){
                                                            console.warn('viz_bar: Papa.parse failed for', url, err);
                                                            tryIndex++;
                                                            tryNext();
                                                        }
                                                    });
                                                } catch(pe) {
                                                    console.warn('viz_bar: exception running Papa.parse', pe);
                                                    tryIndex++;
                                                    tryNext();
                                                }
                                            }
                                            // ensure Papa is loaded (load from CDN if missing)
                                            if (window.Papa) parseNow();
                                            else {
                                                var s = document.createElement('script');
                                                s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
                                                s.onload = parseNow;
                                                s.onerror = function(e){
                                                    console.warn('viz_bar: failed to load PapaParse', e);
                                                    tryIndex++;
                                                    tryNext();
                                                };
                                                document.head.appendChild(s);
                                            }
                                        }
                                        doParseWithPapa(path);
                                    } else {
                                        console.warn('viz_bar: fetch returned', resp.status, resp.statusText, 'for', path);
                                        tryIndex++;
                                        tryNext();
                                    }
                                }).catch(function(fetchErr){
                                    console.warn('viz_bar: fetch error for', path, fetchErr);
                                    tryIndex++;
                                    tryNext();
                                });
                            }

                            tryNext();
                        }
                    } catch(e) {
                        console.error('viz_bar: exception loading CSV', e);
                        V.dataError = true;
                    }
                } else {
                    console.error('viz_bar: p.loadTable not available');
                    V.dataError = true;
                }
            }

            // helper: create a select dropdown for top cities
            function createCitySelector(){
                if (V.cityContainer) return;
                V.cityContainer = p.createDiv('').style('position','absolute').style('z-index','10000').style('background','transparent').style('display','none');
                V.cityContainer.parent(document.body);

                V.citySelect = p.createSelect().parent(V.cityContainer);
                V.citySelect.option('All WA');
                for (var i=0;i<V.topCities.length;i++) V.citySelect.option(V.topCities[i]);
                V.citySelect.changed(function(){
                    var val = V.citySelect.value();
                    V.selectedCity = val;
                    updateBarCounts(val);
                });

                // Clear / Reset button
                V.clearBtn = p.createButton('Reset').parent(V.cityContainer).style('margin-left','8px');
                V.clearBtn.mousePressed(function(){ V.citySelect.value('All WA'); V.selectedCity='All WA'; updateBarCounts('All WA'); });

                // initial positioning (will be refreshed each draw). Keep hidden until the graph is ready.
                V.cityContainer.position(10,10);
                V.selectorShown = false;
            }

            // helper: update manager._barCounts using selected city or overall
            function updateBarCounts(cityName){
                var counts = [0,0,0,0];
                if (!cityName || cityName === 'All WA') counts = V.staticCountsOverall.slice();
                else if (V.staticCountsByCity && V.staticCountsByCity[cityName]) counts = V.staticCountsByCity[cityName].slice();

                // update manager cached normalized values for drawing
                var maxForNorm = Math.max(1, V.globalMax);
                manager._barCounts = counts.map(function(v){ return v / maxForNorm; });
                manager._barLabels = counts; // absolute counts to display
            }

            // draw title
            p.noStroke(); p.fill(0); p.textSize(14); p.textAlign(p.LEFT, p.TOP);
            p.text('Accident Severity by Level (select major city)', left, top - 18);

            if (V.dataError || !V.dataReady) {
                p.fill(120);
                p.textSize(12);
                // show last load attempt/message if available to help debugging
                var msg = (V && V.lastLoadMsg) ? V.lastLoadMsg : 'Data not available.';
                p.text(msg, left, top + 6);
                p.textSize(11);
                p.text('Tried paths: data/US_Accidents_March23_WA.csv, /data/US_Accidents_March23_WA.csv, US_Accidents_March23_WA.csv', left, top + 26);
                p.text('Serve the project directory over HTTP (e.g. python3 -m http.server) and open via http://localhost:8000/', left, top + 44);
                p.pop();
                return;
            }

            // once data is ready, show the selector (but only once) and position it next to the canvas
            if (V.dataReady && V.cityContainer && p.canvas) {
                try {
                    var crect = p.canvas.getBoundingClientRect();
                    var px = Math.round(crect.left + window.scrollX + left);
                    var py = Math.round(crect.top + window.scrollY + top - 36);
                    V.cityContainer.position(px, py);
                    if (!V.selectorShown) {
                        V.cityContainer.style('display','block');
                        V.selectorShown = true;
                    }
                } catch(e) { /* ignore */ }
            }

            // draw bars using manager._barCounts (normalized) and manager._barLabels (absolute)
            var bc = manager._barCounts || [0,0,0,0];
            var labelsAbs = manager._barLabels || [0,0,0,0];

            var sevColors = ['#00aa00', '#F2EE1B', '#ff0000', '#8b0000'];
            p.noStroke();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(12);

            for (var i = 0; i < labels.length; i++) {
                var y = top + i * rowH + rowH / 2;
                p.fill(30);
                p.text(labels[i], left, y);

                var valNorm = bc[i] || 0;
                // use a non-linear scaling to stretch smaller values: exponent < 1 expands small values
                var scaled = Math.pow(valNorm, 0.6);
                var bx = left + 160; // offset for labels
                var bw = 0;
                if (valNorm > 0) {
                    bw = Math.max(10, scaled * barMaxW); // minimum visible width for non-zero
                }
                var by = y - (rowH * 0.35);
                var bh = rowH * 0.7;
                var col = sevColors[i % sevColors.length];
                p.fill(col);
                p.rect(bx, by, bw, bh, 3);

                // show absolute count; place inside bar when there's room, otherwise to the right
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

            // legend / info: show currently selected city
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            var cityLabel = V.selectedCity || 'All WA';
            p.fill(0);
            p.text('Selected: ' + cityLabel, left + 20 + barMaxW, top);

            p.pop();
        }
    };
})();

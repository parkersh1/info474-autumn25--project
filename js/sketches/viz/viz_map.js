console.log('viz_map.js loaded, window.VizMap before define =', window.VizMap);
// js/sketches/viz/viz_map.js

(function (global) {
    console.log('viz_map.js: wiring VizMap, current global.VizMap =', global.VizMap);

    const VizMap = {
        draw: function (p, manager, ai, progress) {
            console.log('VizMap.draw called with ai=', ai, 'progress=', progress);
            // ... your existing draw code here ...
        }
    };

    // Attach to window
    global.VizMap = VizMap;
    console.log('viz_map.js: global.VizMap now =', global.VizMap);

})(window);

// viz_map.js
// Simple static map visualization showing severity incidence for major WA cities.
// Loads data from data/US_Accidents_March23_WA.csv (via PapaParse) and plots circles at city locations.
(function () {
    window.VizMap = {
        draw: function(p, manager, ai, progress) {
            console.log('VizMap.draw called with ai=', ai, 'progress=', progress);
            p.push();
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            // persistent state
            if (!manager._vizMap) manager._vizMap = { initialized:false };
            var M = manager._vizMap;

            // rough Washington lon/lat bounds
            var lonMin = -125.0, lonMax = -116.9;
            var latMin = 45.5, latMax = 49.05;

            // major city coordinates (approx lon,lat)
            var cityCoords = {
                'Seattle': [-122.3321, 47.6062],
                'Tacoma': [-122.4443, 47.2529],
                'Bellevue': [-122.2015, 47.6101],
                'Everett': [-122.2021, 47.978984],
                'Spokane': [-117.4260, 47.6588],
                'Vancouver': [-122.6587, 45.6387],
                'Yakima': [-120.5059, 46.6021],
                'Olympia': [-122.8931, 47.0379],
                'Bellingham': [-122.4790, 48.7491],
                'Renton': [-122.2167, 47.4829],
                'Kent': [-122.2035, 47.3809],
                'Redmond': [-122.1215, 47.6740]
            };

            // prepare map drawing box
            var mapX = left + 40;
            var mapY = top + 40;
            var mapW = w - 200; // leave space for legend
            var mapH = h - 120;

            // load data once (use global cache if present)
            if (!M.initialized) {
                M.initialized = true;
                M.loading = true;
                M.dataError = false;
                M.countsByCity = {};

                // If parsed data exists global, reuse it
                if (window.__WA_ACC_DATA && window.__WA_ACC_DATA.countsByCity) {
                    M.countsByCity = JSON.parse(JSON.stringify(window.__WA_ACC_DATA.countsByCity));
                    M.staticCountsOverall = (window.__WA_ACC_DATA.countsOverall || [0,0,0,0]).slice();
                    M.loading = false;
                    M.frozen = true;
                } else {
                    // load via PapaParse (dynamically load if needed)
                    function startParse() {
                        try {
                            Papa.parse('data/US_Accidents_March23_WA.csv', {
                                download:true,
                                header:true,
                                skipEmptyLines:true,
                                step: function(results) {
                                    var row = results.data;
                                    var sevRaw = row['Severity'] || row['severity'] || row['SEVERITY'];
                                    var cityRaw = row['City'] || row['city'] || row['CITY'] || '';
                                    var sev = parseInt(sevRaw);
                                    var city = (cityRaw||'').trim();
                                    if (!city) city = 'Unknown';
                                    if (!isNaN(sev) && sev >=1 && sev <=4) {
                                        if (!M.countsByCity[city]) M.countsByCity[city] = [0,0,0,0];
                                        M.countsByCity[city][sev-1]++;
                                    }
                                },
                                complete: function() {
                                    // global snapshot
                                    M.staticCountsByCity = JSON.parse(JSON.stringify(M.countsByCity));
                                    M.staticCountsOverall = [0,0,0,0];
                                    for (var c in M.countsByCity) {
                                        var arr = M.countsByCity[c];
                                        for (var k=0;k<4;k++) M.staticCountsOverall[k] += arr[k] || 0;
                                    }
                                    window.__WA_ACC_DATA = { countsByCity: M.staticCountsByCity, countsOverall: M.staticCountsOverall };
                                    M.loading = false;
                                    M.frozen = true;
                                    console.log('VizMap: parsed data, cities:', Object.keys(M.staticCountsByCity).slice(0,10));
                                },
                                error: function(err) {
                                    M.dataError = true;
                                    M.loading = false;
                                    console.warn('VizMap: Papa.parse error', err);
                                }
                            });
                        } catch(e) {
                            M.dataError = true;
                            M.loading = false;
                            console.error('VizMap: exception starting parse', e);
                        }
                    }
                    if (window.Papa) startParse(); else {
                        var s = document.createElement('script');
                        s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
                        s.onload = startParse;
                        s.onerror = function(){ M.dataError=true; M.loading=false; };
                        document.head.appendChild(s);
                    }
                }
            }

            // draw map box
            p.noStroke();
            p.fill(245);
            p.rect(mapX, mapY, mapW, mapH, 6);

            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(14);
            p.text('WA Severity map (major cities)', mapX + 6, mapY + 6);

            if (M.loading) {
                p.fill(80);
                p.textSize(12);
                p.text('Loading data...', mapX + 6, mapY + 28);
                p.pop();
                return;
            }
            if (M.dataError) {
                p.fill(120);
                p.textSize(12);
                p.text('Data failed to load.', mapX + 6, mapY + 28);
                p.pop();
                return;
            }

            // determine counts for the major cities we have coords for
            var cityList = Object.keys(cityCoords);
            var counts = M.staticCountsByCity || {};

            // find max total across these cities for scaling
            var maxTotal = 1;
            for (var i=0;i<cityList.length;i++){
                var c = cityList[i];
                var arr = counts[c] || [0,0,0,0];
                var ssum = arr.reduce(function(a,b){return a+b;},0);
                if (ssum > maxTotal) maxTotal = ssum;
            }

            // draw city dots
            for (var i=0;i<cityList.length;i++){
                var cname = cityList[i];
                var coord = cityCoords[cname];
                var lon = coord[0]; var lat = coord[1];
                // map lon/lat to mapX..mapX+mapW and mapY..mapY+mapH
                var tx = mapX + ((lon - lonMin) / (lonMax - lonMin)) * mapW;
                var ty = mapY + mapH - ((lat - latMin) / (latMax - latMin)) * mapH; // flip y

                var arr = counts[cname] || [0,0,0,0];
                var total = arr.reduce(function(a,b){return a+b;},0);
                var r = 6 + (total / maxTotal) * 20; // radius scaled by total

                // color by weighted severity (1 green .. 4 dark red). compute avg severity
                var weighted = 0; var weightSum = 0;
                for (var k=0;k<4;k++) { weighted += (k+1) * (arr[k] || 0); weightSum += (arr[k] || 0); }
                var avg = weightSum ? (weighted / weightSum) : 0;
                // map avg to color ramp
                var col = p.color(200);
                if (avg <= 1.5) col = p.color('#00aa00');
                else if (avg <= 2.5) col = p.color('#F2EE1B');
                else if (avg <= 3.2) col = p.color('#ff8800');
                else col = p.color('#8b0000');

                p.noStroke();
                p.fill(col);
                p.ellipse(tx, ty, r*2, r*2);

                // label
                p.fill(0);
                p.textSize(11);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(cname + ' (' + total + ')', tx + r + 6, ty);
            }

            // legend
            var lx = mapX + mapW + 10;
            var ly = mapY + 10;
            p.textSize(12);
            p.fill(0);
            p.text('Legend', lx, ly);
            var ley = ly + 18;
            var legendColors = [{c:'#00aa00',t:'Mostly 1 (low)'},{c:'#F2EE1B',t:'Mostly 2'},{c:'#ff8800',t:'Mostly 3'},{c:'#8b0000',t:'Mostly 4 (high)'}];
            for (var li=0; li<legendColors.length; li++){
                p.fill(legendColors[li].c);
                p.rect(lx, ley + li*18, 12, 12, 3);
                p.fill(0);
                p.text(legendColors[li].t, lx + 18, ley + li*18);
            }

            p.pop();
        }
    };
})();

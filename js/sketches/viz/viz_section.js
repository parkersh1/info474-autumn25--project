(function () {
    window.VizSection = {
        draw: function (p, manager, ai, progress) {
            p.push();

            const DATA_PATH = "./data/US_Accidents_March23_WA.csv";

            if (!manager._sectionCounts) {
                manager._sectionCounts = {
                    crossing: { true: 0, false: 0 },
                    roundabout: { true: 0, false: 0 },
                    total: 0
                };
                manager._dataRows = null;
                manager._cities = null;
                manager._selectedCity = '';

                (async () => {
                    try {
                        const parsed = await loadCSV(DATA_PATH);
                        manager._dataRows = parsed.rows;
                        const cityCounts = Object.create(null);
                        parsed.rows.forEach(r => {
                            const crossingVal = normalizeBool(r["Crossing"]);
                            const roundVal = normalizeBool(r["Roundabout"]);
                            if (crossingVal === true) manager._sectionCounts.crossing.true++;
                            else if (crossingVal === false) manager._sectionCounts.crossing.false++;
                            if (roundVal === true) manager._sectionCounts.roundabout.true++;
                            else if (roundVal === false) manager._sectionCounts.roundabout.false++;
                            manager._sectionCounts.total++;
                            const city = (r['City'] || '').trim() || 'Unknown';
                            cityCounts[city] = (cityCounts[city] || 0) + 1;
                        });
                        const cityTotals = Object.keys(cityCounts).map(function (c) { return { city: c, total: cityCounts[c] }; });
                        cityTotals.sort(function (a, b) { return b.total - a.total; });
                        var topN = 15;
                        manager._cities = cityTotals.slice(0, topN).map(function (x) { return x.city; });
                        manager._selectedCity = 'All WA';
                        createCityFilterUI(manager);
                    } catch (err) {
                        console.error('Failed to load section CSV', err);
                    }
                })();
            }

            function normalizeBool(v) {
                if (v === true || v === false) return v;
                if (typeof v === 'number') return v !== 0;
                if (!v && v !== "") return false;
                const s = String(v).trim().toLowerCase();
                if (s === 'true' || s === 't' || s === '1' || s === 'yes') return true;
                if (s === 'false' || s === 'f' || s === '0' || s === 'no' || s === '') return false;
                return false;
            }

            async function loadCSV(path) {
                const response = await fetch(path);
                if (!response.ok) throw new Error('Fetch failed');
                const text = await response.text();
                return parseCSV(text);
            }

            function parseCSV(data) {
                const rows = [];
                let cur = '', row = [], inQuotes = false;
                for (let i = 0; i < data.length; i++) {
                    const ch = data[i];
                    if (ch === '"') {
                        if (inQuotes && data[i + 1] === '"') { cur += '"'; i++; }
                        else { inQuotes = !inQuotes; }
                    } else if (ch === ',' && !inQuotes) {
                        row.push(cur); cur = '';
                    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                        if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ''; }
                        if (ch === '\r' && data[i + 1] === '\n') i++;
                    } else {
                        cur += ch;
                    }
                }
                if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); }
                if (rows.length === 0) return { headers: [], rows: [] };
                const headers = rows[0].map(s => s.trim());
                const objs = [];
                for (let r = 1; r < rows.length; r++) {
                    const rr = rows[r];
                    let allEmpty = true;
                    for (let z = 0; z < rr.length; z++) if (rr[z] !== '') { allEmpty = false; break; }
                    if (allEmpty) continue;
                    const obj = {};
                    for (let c = 0; c < headers.length; c++) {
                        let val = (c < rr.length) ? rr[c].trim() : '';
                        if (val !== '' && !isNaN(val)) {
                            obj[headers[c]] = Number(val);
                        } else {
                            obj[headers[c]] = val;
                        }
                    }
                    objs.push(obj);
                }
                return { headers, rows: objs };
            }

            function createCityFilterUI(manager) {
                if (manager._cityFilterCreated) return;
                manager._cityFilterCreated = true;

                try {
                    var cityContainer = p.createDiv('')
                        .style('position', 'absolute')
                        .style('z-index', '10000')
                        .style('background', 'transparent')
                        .style('display', 'none');
                    cityContainer.parent(document.body);

                    var citySelect = p.createSelect().parent(cityContainer);
                    citySelect.option('All WA');
                    if (manager._cities && manager._cities.length) {
                        for (var i = 0; i < manager._cities.length; i++) {
                            citySelect.option(manager._cities[i]);
                        }
                    }
                    citySelect.changed(function () {
                        var val = citySelect.value();
                        manager._selectedCity = val || 'All WA';
                    });

                    var clearBtn = p.createButton('Reset').parent(cityContainer).style('margin-left', '8px');
                    clearBtn.mousePressed(function () {
                        try { citySelect.value('All WA'); } catch (e) { }
                        manager._selectedCity = 'All WA';
                    });

                    manager._cityContainer = cityContainer;
                    manager._citySelectP5 = citySelect;
                    manager._cityClearBtn = clearBtn;

                    try { citySelect.value(manager._selectedCity || 'All WA'); } catch (e) { }
                    return;
                } catch (e) {
                }
                const container = document.createElement('div');
                container.id = 'viz-section-controls';
                container.style.position = 'absolute';
                container.style.background = 'rgba(255,255,255,0.95)';
                container.style.padding = '8px 10px';
                container.style.border = '1px solid rgba(0,0,0,0.12)';
                container.style.borderRadius = '6px';
                container.style.zIndex = 9999;
                container.style.fontFamily = 'sans-serif';
                container.style.fontSize = '13px';

                const label = document.createElement('label');
                label.textContent = 'City: ';
                label.style.marginRight = '6px';

                const select = document.createElement('select');
                select.style.minWidth = '160px';

                const allOpt = document.createElement('option');
                allOpt.value = 'All WA';
                allOpt.textContent = 'All WA';
                select.appendChild(allOpt);

                if (manager._cities && manager._cities.length) {
                    manager._cities.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        select.appendChild(opt);
                    });
                }

                select.addEventListener('change', function () {
                    manager._selectedCity = this.value || 'All WA';
                });

                try { select.value = manager._selectedCity || 'All WA'; } catch (e) { }

                container.appendChild(label);
                container.appendChild(select);
                document.body.appendChild(container);
                manager._cityContainer = container; manager._citySelectEl = select;
            }

            function getCountsForCity(city) {
                const crossing = { true: 0, false: 0 };
                const roundabout = { true: 0, false: 0 };
                if (!manager._dataRows) return { crossing, roundabout };
                var target = (city || '').trim();
                if (target === 'All WA') target = '';
                for (let i = 0; i < manager._dataRows.length; i++) {
                    const r = manager._dataRows[i];
                    const rcity = (r['City'] || '').trim();
                    if (target && rcity !== target) continue;
                    const cVal = normalizeBool(r['Crossing']);
                    const rVal = normalizeBool(r['Roundabout']);
                    if (cVal === true) crossing.true++;
                    else if (cVal === false) crossing.false++;
                    if (rVal === true) roundabout.true++;
                    else if (rVal === false) roundabout.false++;
                }
                return { crossing, roundabout };
            }

            const w = manager.width || 600;
            const h = manager.height || 520;
            const ox = (manager.offsetX || 0);
            const oy = (manager.offsetY || 0);

            const margin = 24;
            const areaH = (h - margin * 3) / 2;

            const topX = ox + w * 0.35;
            const topY = oy + margin + areaH / 2;

            (function manageCityContainerVisibility() {
                var BUTTON_VIS_THRESHOLD = 0.55;
                try {
                    var cont = manager._cityContainer;
                    if (!cont || !p.canvas) return;
                    var crect = p.canvas.getBoundingClientRect();
                    var px = Math.round(crect.left + window.scrollX + (ox + w) - 190);
                    var py = Math.round(crect.top + window.scrollY + oy + 8);
                    if (progress >= BUTTON_VIS_THRESHOLD) {
                        if (typeof cont.position === 'function') {
                            cont.position(px, py);
                            cont.style('display', 'block');
                        } else {
                            cont.style.display = 'block';
                            cont.style.left = px + 'px';
                            cont.style.top = py + 'px';
                        }
                    } else {
                        if (typeof cont.style === 'function') {
                            cont.style('display', 'none');
                        } else if (cont.style) {
                            cont.style.display = 'none';
                        }
                    }
                } catch (e) {
                }
            })();

            const crossingCounts = manager._dataRows ? getCountsForCity(manager._selectedCity).crossing : (manager._sectionCounts ? manager._sectionCounts.crossing : null);
            drawCrossing(p, topX, topY, Math.min(w * 0.5, areaH * 0.8), crossingCounts);

            const botX = ox + w * 0.35;
            const botY = oy + margin * 2 + areaH + areaH / 2;

            const roundCounts = manager._dataRows ? getCountsForCity(manager._selectedCity).roundabout : (manager._sectionCounts ? manager._sectionCounts.roundabout : null);
            drawRoundabout(p, botX, botY, Math.min(w * 0.4, areaH * 0.7), roundCounts);

            p.push();
            p.fill(0);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(16);
            p.text('Traffic Crossing — Accident Proportion', topX, topY - areaH / 2 + 8);
            p.text('Roundabout — Accident Proportion', botX, botY - areaH / 2 + 8);
            p.pop();

            p.pop();

            function drawCrossing(p, cx, cy, size, counts) {
                p.push();
                p.rectMode(p.CENTER);
                p.noStroke();

                const roadW = size * 0.25;
                const box = size * 0.18;

                p.fill(245);
                p.rect(cx, cy, size, size, 6);

                p.fill(60);
                p.rect(cx, cy, roadW, size * 0.95, 2);
                p.rect(cx, cy, size * 0.95, roadW, 2);

                p.stroke(220);
                p.strokeWeight(2);
                for (let i = -1; i <= 1; i += 2) {
                    const x = cx + (roadW / 4) * i;
                    p.line(x, cy - size * 0.45, x, cy + size * 0.45);
                }


                p.noStroke();
                p.fill(80);
                p.rect(cx, cy, box, box, 4);

                drawPieAt(p, cx, cy, box * 1.3, counts);

                p.fill(255);
                const crosswalkW = roadW * 0.8;
                const markH = 6;
                for (let j = -1; j <= 1; j += 2) {
                    p.rect(cx + j * (size / 2 - crosswalkW / 2 - 6), cy - size / 6, 6, markH, 2);
                    p.rect(cx + j * (size / 2 - crosswalkW / 2 - 6), cy + size / 6, 6, markH, 2);
                    p.rect(cx - size / 6, cy + j * (size / 2 - crosswalkW / 2 - 6), markH, 6, 2);
                    p.rect(cx + size / 6, cy + j * (size / 2 - crosswalkW / 2 - 6), markH, 6, 2);
                }

                drawLegend(p, cx + size * 0.6, cy - size * 0.35, counts);

                p.pop();
            }

            function drawRoundabout(p, cx, cy, size, counts) {
                p.push();
                p.noStroke();

                p.fill(245);
                p.rectMode(p.CENTER);
                p.rect(cx, cy, size * 1.2, size * 0.9, 6);

                const outerR = size * 0.45;
                const ringW = outerR * 0.4;

                p.fill(60);
                const approachW = ringW * 0.8;
                p.rect(cx - outerR * 1.2, cy, approachW, outerR * 0.5, 4);
                p.rect(cx + outerR * 1.2, cy, approachW, outerR * 0.5, 4);
                p.rect(cx, cy - outerR * 1.2, outerR * 0.5, approachW, 4);
                p.rect(cx, cy + outerR * 1.2, outerR * 0.5, approachW, 4);

                p.fill(70);
                p.ellipse(cx, cy, outerR * 2, outerR * 2);
                p.fill(245);
                p.ellipse(cx, cy, (outerR - ringW) * 2, (outerR - ringW) * 2);

                drawPieAt(p, cx, cy, (outerR - ringW) * 1.3, counts);

                p.fill(200);
                p.noStroke();
                p.triangle(cx + outerR * 0.7, cy - 6, cx + outerR * 0.9, cy, cx + outerR * 0.7, cy + 6);
                p.triangle(cx - outerR * 0.7, cy - 6, cx - outerR * 0.9, cy, cx - outerR * 0.7, cy + 6);
                p.triangle(cx - 6, cy + outerR * 0.7, cx, cy + outerR * 0.9, cx + 6, cy + outerR * 0.7);
                p.triangle(cx - 6, cy - outerR * 0.7, cx, cy - outerR * 0.9, cx + 6, cy - outerR * 0.7);

                drawLegend(p, cx + outerR * 1.6, cy - outerR * 0.4, counts);

                p.pop();
            }

            function drawPieAt(p, cx, cy, diameter, counts) {
                p.push();
                p.angleMode(p.DEGREES);
                const t = (counts && (counts.true + counts.false) > 0) ? counts.true : 0;
                const f = (counts && (counts.true + counts.false) > 0) ? counts.false : 0;
                const total = t + f;
                const truePct = total > 0 ? (t / total) : 0;

                p.noStroke();
                p.fill(230);
                p.ellipse(cx, cy, diameter + 6, diameter + 6);

                let start = -90;
                const aTrue = truePct * 360;
                p.fill(200, 70, 70);
                if (aTrue > 0) p.arc(cx, cy, diameter, diameter, start, start + aTrue, p.PIE);
                start += aTrue;
                p.fill(80, 160, 60);
                if (360 - aTrue > 0) p.arc(cx, cy, diameter, diameter, start, start + (360 - aTrue), p.PIE);

                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(Math.max(10, diameter * 0.25));
                p.textStyle(p.BOLD);
                if (total > 0) p.text(Math.round(truePct * 100) + '%', cx, cy);
                else p.text('no data', cx, cy);

                p.pop();
            }

            function drawLegend(p, x, y, counts) {
                p.push();
                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(12);
                p.noStroke();
                p.fill(200, 70, 70);
                p.rect(x, y, 12, 12, 2);
                p.fill(0);
                p.text('Accidents At This Feature' + (counts ? ' — ' + (counts.true || 0) : ''), x + 14, y + 2);
                p.fill(80, 160, 60);
                p.rect(x, y + 18, 12, 12, 2);
                p.fill(0);
                p.text('Other Traffic Accidents' + (counts ? ' — ' + (counts.false || 0) : ''), x + 14, y + 20);
                p.pop();
            }

        }
    };
})();
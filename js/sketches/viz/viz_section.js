(function () {
    // viz_section.js
    // Draw two stacked diagrams: a four-way crossing (top) and a roundabout (bottom).
    // Each diagram has a central pie chart showing the proportion of accidents
    // by the CSV boolean columns `Crossing` and `Roundabout` (True / False).
    window.VizSection = {
        draw: function (p, manager, ai, progress) {
            p.push();

            const DATA_PATH = "./data/US_Accidents_March23_WA.csv";

            // Ensure we only load and parse the CSV once and cache counts on manager
            if (!manager._sectionCounts) {
                manager._sectionCounts = {
                    crossing: { true: 0, false: 0 },
                    roundabout: { true: 0, false: 0 },
                    total: 0
                };

                (async () => {
                    try {
                        const parsed = await loadCSV(DATA_PATH);
                        parsed.rows.forEach(r => {
                            const crossingVal = normalizeBool(r["Crossing"]);
                            const roundVal = normalizeBool(r["Roundabout"]);
                            if (crossingVal === true) manager._sectionCounts.crossing.true++;
                            else if (crossingVal === false) manager._sectionCounts.crossing.false++;
                            if (roundVal === true) manager._sectionCounts.roundabout.true++;
                            else if (roundVal === false) manager._sectionCounts.roundabout.false++;
                            manager._sectionCounts.total++;
                        });
                        // console.log('sectionCounts', manager._sectionCounts);
                    } catch (err) {
                        console.error('Failed to load section CSV', err);
                    }
                })();
            }

            // Helpers: normalize boolean-like fields
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

            // Drawing parameters
            const w = manager.width || 600;
            const h = manager.height || 520;
            const ox = (manager.offsetX || 0);
            const oy = (manager.offsetY || 0);

            // Split into two stacked areas
            const margin = 24;
            const areaH = (h - margin * 3) / 2;

            // Top: Four-way crossing
            const topX = ox + w * 0.35;
            const topY = oy + margin + areaH / 2;

            drawCrossing(p, topX, topY, Math.min(w * 0.5, areaH * 0.8), manager._sectionCounts ? manager._sectionCounts.crossing : null);

            // Bottom: Roundabout
            const botX = ox + w * 0.35;
            const botY = oy + margin * 2 + areaH + areaH / 2;

            drawRoundabout(p, botX, botY, Math.min(w * 0.4, areaH * 0.7), manager._sectionCounts ? manager._sectionCounts.roundabout : null);

            // Titles
            p.push();
            p.fill(0);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(16);
            p.text('Traffic Crossing — Accident proportion', topX, topY - areaH / 2 + 8);
            p.text('Roundabout — Accident proportion', botX, botY - areaH / 2 + 8);
            p.pop();

            p.pop();

            // --- drawing helpers ---
            function drawCrossing(p, cx, cy, size, counts) {
                p.push();
                p.rectMode(p.CENTER);
                p.noStroke();

                const roadW = size * 0.25;
                const box = size * 0.18;

                // background
                p.fill(245);
                p.rect(cx, cy, size, size, 6);

                // vertical road
                p.fill(60);
                p.rect(cx, cy, roadW, size * 0.95, 2);
                // horizontal road
                p.rect(cx, cy, size * 0.95, roadW, 2);

                // lane lines - vertical
                p.stroke(220);
                p.strokeWeight(2);
                for (let i = -1; i <= 1; i += 2) {
                    const x = cx + (roadW / 4) * i;
                    p.line(x, cy - size * 0.45, x, cy + size * 0.45);
                }

                // center square (intersection)
                p.noStroke();
                p.fill(80);
                p.rect(cx, cy, box, box, 4);

                // center pie
                drawPieAt(p, cx, cy, box * 1.3, counts);

                // simple crosswalk marks
                p.fill(255);
                const crosswalkW = roadW * 0.8;
                const markH = 6;
                for (let j = -1; j <= 1; j += 2) {
                    // top/bottom crosswalks
                    p.rect(cx + j * (size / 2 - crosswalkW / 2 - 6), cy - size / 6, 6, markH, 2);
                    p.rect(cx + j * (size / 2 - crosswalkW / 2 - 6), cy + size / 6, 6, markH, 2);
                    // left/right crosswalks
                    p.rect(cx - size / 6, cy + j * (size / 2 - crosswalkW / 2 - 6), markH, 6, 2);
                    p.rect(cx + size / 6, cy + j * (size / 2 - crosswalkW / 2 - 6), markH, 6, 2);
                }

                // legend (moved to right)
                drawLegend(p, cx + size * 0.6, cy - size * 0.35, counts);

                p.pop();
            }

            function drawRoundabout(p, cx, cy, size, counts) {
                p.push();
                p.noStroke();

                // background
                p.fill(245);
                p.rectMode(p.CENTER);
                p.rect(cx, cy, size * 1.2, size * 0.9, 6);

                const outerR = size * 0.45;
                const ringW = outerR * 0.4;

                // draw approaches (4)
                p.fill(60);
                const approachW = ringW * 0.8;
                p.rect(cx - outerR * 1.2, cy, approachW, outerR * 0.5, 4);
                p.rect(cx + outerR * 1.2, cy, approachW, outerR * 0.5, 4);
                p.rect(cx, cy - outerR * 1.2, outerR * 0.5, approachW, 4);
                p.rect(cx, cy + outerR * 1.2, outerR * 0.5, approachW, 4);

                // roundabout ring
                p.fill(70);
                p.ellipse(cx, cy, outerR * 2, outerR * 2);
                p.fill(245);
                p.ellipse(cx, cy, (outerR - ringW) * 2, (outerR - ringW) * 2);

                // center pie
                drawPieAt(p, cx, cy, (outerR - ringW) * 1.3, counts);

                // arrows to indicate circulation
                p.fill(200);
                p.noStroke();
                p.triangle(cx + outerR * 0.7, cy - 6, cx + outerR * 0.9, cy, cx + outerR * 0.7, cy + 6);
                p.triangle(cx - outerR * 0.7, cy - 6, cx - outerR * 0.9, cy, cx - outerR * 0.7, cy + 6);
                p.triangle(cx - 6, cy + outerR * 0.7, cx, cy + outerR * 0.9, cx + 6, cy + outerR * 0.7);
                p.triangle(cx - 6, cy - outerR * 0.7, cx, cy - outerR * 0.9, cx + 6, cy - outerR * 0.7);

                // legend (moved to right)
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

                // draw a subtle ring under pie
                p.noStroke();
                p.fill(230);
                p.ellipse(cx, cy, diameter + 6, diameter + 6);

                let start = -90;
                // True slice (green)
                const aTrue = truePct * 360;
                p.fill(200, 70, 70);
                if (aTrue > 0) p.arc(cx, cy, diameter, diameter, start, start + aTrue, p.PIE);
                start += aTrue;
                // False slice (red)
                p.fill(80, 160, 60);
                if (360 - aTrue > 0) p.arc(cx, cy, diameter, diameter, start, start + (360 - aTrue), p.PIE);

                // center label
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
                p.text('Accidents' + (counts ? ' — ' + (counts.true || 0) : ''), x + 14, y + 2);
                p.fill(80, 160, 60);
                p.rect(x, y + 18, 12, 12, 2);
                p.fill(0);
                p.text('Other Traffic Accidents' + (counts ? ' — ' + (counts.false || 0) : ''), x + 14, y + 20);
                p.pop();
            }

        }
    };
})();
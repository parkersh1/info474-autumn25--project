(function () {
    class VizScatter {
        constructor() {
            this.DATA_PATH = './data/US_Accidents_March23_WA.csv';
            this.KEYS = ['Bump','Crossing','Give_Way','Junction','No_Exit','Railway','Roundabout','Station','Stop','Traffic_Calming','Traffic_Signal'];

            this.counts = {};
            this.KEYS.forEach(k => this.counts[k] = 0);

            this._fetchStarted = false;
            this._computedManagerRef = null;
        }

        parseCSV(text) {
            const rows = [];
            let cur = '', row = [], inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (ch === '"') {
                    if (inQuotes && text[i+1] === '"') { cur += '"'; i++; }
                    else { inQuotes = !inQuotes; }
                } else if (ch === ',' && !inQuotes) {
                    row.push(cur); cur = '';
                } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                    if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ''; }
                    if (ch === '\r' && text[i+1] === '\n') i++;
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
                for (let c = 0; c < headers.length; c++) obj[headers[c]] = (c < rr.length) ? rr[c] : '';
                objs.push(obj);
            }
            return { headers, rows: objs };
        }

        computeCountsFromRows(rows) {
            const counts = {};
            this.KEYS.forEach(k => counts[k] = 0);
            rows.forEach(r => {
                this.KEYS.forEach(k => {
                    const raw = (r[k] === undefined || r[k] === null) ? '' : String(r[k]).trim();
                    if (raw.toUpperCase() === 'TRUE') counts[k]++;
                });
            });
            return counts;
        }

        startFetchIfNeeded() {
            if (this._fetchStarted) return;
            this._fetchStarted = true;
            fetch(this.DATA_PATH).then(res => {
                if (!res.ok) throw new Error('fetch failed');
                return res.text();
            }).then(text => {
                const parsed = this.parseCSV(text);
                this.counts = this.computeCountsFromRows(parsed.rows);
            }).catch(() => {r
            });
        }

        draw(p, manager, ai, progress) {
            p.clear();
            p.noStroke();
            const w = manager.width || 600;
            const h = manager.height || 520;
            const margin = { left: 160, right: 20, top: 24, bottom: 24 };
            const innerW = w - margin.left - margin.right;
            const innerH = h - margin.top - margin.bottom;

            if (manager && manager.data && Array.isArray(manager.data) && manager.data.length > 0) {
                if (this._computedManagerRef !== manager.data) {
                    this.counts = this.computeCountsFromRows(manager.data);
                    this._computedManagerRef = manager.data;
                }
            } else {
                this.startFetchIfNeeded();
            }

            const dataPairs = this.KEYS.map(k => ({ key: k, val: this.counts[k] || 0 }))
                .sort((a, b) => b.val - a.val);

            const n = dataPairs.length;
            const barH = Math.max(14, Math.floor(innerH / (n + 0.5)));
            const gap = Math.max(6, Math.floor((innerH - n * barH) / (n + 1)));
            const maxVal = Math.max(1, dataPairs.reduce((m, d) => d.val > m ? d.val : m, 0));
            
            p.fill(0);
            p.textSize(18);
            p.textAlign(p.CENTER, p.TOP);
            p.text('Accident Counts by Traffic Feature Involvement', w / 2 + 70, 4);
            
            p.push();
            p.fill(30);
            p.textSize(16);
            p.textAlign(p.LEFT, p.TOP);
            p.pop();

            for (let i = 0; i < n; i++) {
                const item = dataPairs[i];
                const y = margin.top + gap + i * (barH + gap);
                const barW = Math.round((item.val / maxVal) * innerW);
                const displayKey = item.key.replace(/_/g, ' ');

                p.push();
                p.fill(40);
                p.textSize(12);
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(displayKey, margin.left - 8, y + barH / 2);
                p.pop();

                p.push();
                p.fill(235);
                p.rect(margin.left, y, innerW, barH, 3);
                p.pop();

                const topR = 70 + Math.round(120 * (1 - 0));
                const topG = 140 + Math.round(60 * 0);
                const topB = 200;

                p.push();
                p.fill(topR, topG, topB, 220);
                p.rect(margin.left, y, barW, barH, 3);
                p.pop();

                p.push();
                p.fill(20);
                p.textSize(11);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(item.val, margin.left + barW + 6, y + barH / 2);
                p.pop();
            }
            const lastBarBottom = margin.top + gap + (n - 1) * (barH + gap) + barH;

            p.push();
            p.stroke(180);
            p.strokeWeight(1);
            p.line(margin.left, lastBarBottom + 4, margin.left + innerW, lastBarBottom + 4);
            p.noStroke();
            p.fill(90);
            p.textSize(10);
            p.textAlign(p.CENTER, p.TOP);

            const interval = 5000;
            const maxTick = Math.max(interval, Math.ceil(maxVal / interval) * interval);
            for (let v = 0; v <= maxVal; v += interval) {
                const tx = margin.left + (v / maxVal) * innerW;
                p.text(String(v), tx, lastBarBottom + 8);
            }
            p.pop();
        }
    }

    window.VizScatter = new VizScatter();
})();
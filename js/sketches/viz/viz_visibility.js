(function () {
  window.VizSeverityVisibility = {
    constructor: function() {
            this.DATA_PATH = './data/US_Accidents_March23_WA.csv';
            this.KEYS = ['Severity','Visibility'];

            this.counts = {};
            this.KEYS.forEach(k => this.counts[k] = 0);

            this._fetchStarted = false;
            this._computedManagerRef = null;
        },

        parseCSV: function(text) {
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
        },

        computeCountsFromRows: function(rows) {
            const counts = {};
            this.KEYS.forEach(k => counts[k] = 0);
            rows.forEach(r => {
                this.KEYS.forEach(k => {
                    const raw = (r[k] === undefined || r[k] === null) ? '' : String(r[k]).trim();
                    if (raw.toUpperCase() === 'TRUE') counts[k]++;
                });
            });
            return counts;
        },

        startFetchIfNeeded: function() {
            if (this._fetchStarted) return;
            this._fetchStarted = true;
            fetch(this.DATA_PATH).then(res => {
                if (!res.ok) throw new Error('fetch failed');
                return res.text();
            }).then(text => {
                const parsed = this.parseCSV(text);
                this.counts = this.computeCountsFromRows(parsed.rows);
                ai.update(this.counts);
            }).catch(() => { });
        },

        draw: function (p, manager) {
          p.push();
          this.startFetchIfNeeded();
          manager.offsetX = manager.offsetX || 0;
          manager.offsetY = manager.offsetY || 0;
          manager.width = manager.width || 600;
          manager.height = manager.height || 400;

          p.fill(255, 0, 0); // Set color for severity
          p.rect(manager.offsetX, manager.offsetY, manager.width * (this.counts['Severity'] / 100), manager.height); // Draw severity bar

          p.fill(0, 0, 255); // Set color for visibility
          p.rect(manager.offsetX, manager.offsetY + 20, manager.width * (this.counts['Visibility'] / 100), manager.height - 20); // Draw visibility bar

          p.pop(); // Restore the previous drawing state
        }
  };
})();
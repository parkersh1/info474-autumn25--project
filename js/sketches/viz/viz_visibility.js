(function () {
  window.VizSeverityVisibility = {
    // Initialize properties directly on the object
    DATA_PATH: './data/US_Accidents_March23_WA.csv',
    KEYS: ['Severity', 'Visibility'],
    counts: { Severity: 0, Visibility: 0 },
    _fetchStarted: false,
    _dataLoaded: false,

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
        var self = this;
        fetch(this.DATA_PATH).then(res => {
            if (!res.ok) throw new Error('fetch failed');
            return res.text();
        }).then(text => {
            const parsed = self.parseCSV(text);
            self.counts = self.computeCountsFromRows(parsed.rows);
            self._dataLoaded = true;
            console.log('VizSeverityVisibility: Data loaded', self.counts);
        }).catch(err => { 
            console.error('VizSeverityVisibility: fetch error', err);
        });
    },

    draw: function (p, manager, ai, progress) {
        p.push();
        this.startFetchIfNeeded();
        
        var offsetX = manager.offsetX || 20;
        var offsetY = manager.offsetY || 20;
        var width = (manager.width || 600) - 40;
        var height = (manager.height || 400) - 60;

        // Draw title
        p.fill(0);
        p.textSize(16);
        p.text('Severity and Visibility Impact', offsetX, offsetY);

        // Draw label for Severity
        p.fill(0);
        p.textSize(12);
        p.text('Severity: ' + this.counts['Severity'], offsetX, offsetY + 30);

        // Draw severity bar (red)
        p.fill(255, 0, 0);
        var severityBarWidth = Math.max(0, width * (this.counts['Severity'] / 1000));
        p.rect(offsetX, offsetY + 40, severityBarWidth, 30);

        // Draw label for Visibility
        p.fill(0);
        p.textSize(12);
        p.text('Visibility: ' + this.counts['Visibility'], offsetX, offsetY + 100);

        // Draw visibility bar (blue)
        p.fill(0, 0, 255);
        var visibilityBarWidth = Math.max(0, width * (this.counts['Visibility'] / 1000));
        p.rect(offsetX, offsetY + 110, visibilityBarWidth, 30);

        p.pop();
    }
  };
})();
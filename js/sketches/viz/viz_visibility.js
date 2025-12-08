(function () {
  window.VizSeverityVisibility = {
    // Initialize properties directly on the object
    DATA_PATH: './data/US_Accidents_March23_WA.csv',
    stats: { 
        severityCount: 0, 
        visibilityCount: 0,
        avgSeverity: 0,
        avgVisibility: 0,
        totalRecords: 0
    },
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

    computeStatsFromRows: function(rows) {
        const stats = { 
            severityCount: 0, 
            visibilityCount: 0,
            avgSeverity: 0,
            avgVisibility: 0,
            totalRecords: rows.length
        };
        
        let severitySum = 0;
        let visibilitySum = 0;
        let severityValid = 0;
        let visibilityValid = 0;

        rows.forEach(r => {
            // Count severity (high severity = 3 or 4)
            const severityRaw = (r['Severity'] === undefined || r['Severity'] === null) ? '' : String(r['Severity']).trim();
            if (severityRaw !== '') {
                const severityNum = parseInt(severityRaw, 10);
                if (!isNaN(severityNum) && severityNum >= 3) {
                    stats.severityCount++;
                }
                severitySum += severityNum;
                severityValid++;
            }

            // Count low visibility (visibility < 5 miles)
            const visibilityRaw = (r['Visibility(mi)'] === undefined || r['Visibility(mi)'] === null) ? '' : String(r['Visibility(mi)']).trim();
            if (visibilityRaw !== '') {
                const visibilityNum = parseFloat(visibilityRaw);
                if (!isNaN(visibilityNum) && visibilityNum < 5) {
                    stats.visibilityCount++;
                }
                visibilitySum += visibilityNum;
                visibilityValid++;
            }
        });

        if (severityValid > 0) stats.avgSeverity = (severitySum / severityValid).toFixed(2);
        if (visibilityValid > 0) stats.avgVisibility = (visibilitySum / visibilityValid).toFixed(2);

        return stats;
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
            self.stats = self.computeStatsFromRows(parsed.rows);
            self._dataLoaded = true;
            console.log('VizSeverityVisibility: Data loaded', self.stats);
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

        // Use current data or defaults while loading
        var severityCount = this.stats.severityCount || 1500;
        var visibilityCount = this.stats.visibilityCount || 1200;
        var totalRecords = this.stats.totalRecords || 3000;

        // Draw title
        p.fill(0);
        p.textSize(18);
        p.textAlign(p.LEFT);
        p.text('Severity and Visibility in Washington Accidents', offsetX, offsetY);

        // Show max count to scale bars
        var maxCount = Math.max(severityCount, visibilityCount, 2000);

        // Severity section
        p.fill(0);
        p.textSize(14);
        p.text('High Severity Incidents (Severity 3-4):', offsetX, offsetY + 40);
        
        p.fill(100);
        p.textSize(12);
        var severityPct = ((severityCount / totalRecords) * 100).toFixed(1);
        p.text('Count: ' + severityCount + ' (' + severityPct + '% of ' + totalRecords + ' total)', offsetX, offsetY + 60);

        // Draw severity bar (red)
        p.fill(255, 100, 100);
        p.stroke(200, 50, 50);
        p.strokeWeight(2);
        var severityBarWidth = Math.max(10, width * (severityCount / maxCount));
        p.rect(offsetX, offsetY + 70, severityBarWidth, 40);

        // Visibility section
        p.fill(0);
        p.textSize(14);
        p.text('Low Visibility Incidents (< 5 miles):', offsetX, offsetY + 140);
        
        p.fill(100);
        p.textSize(12);
        var visibilityPct = ((visibilityCount / totalRecords) * 100).toFixed(1);
        p.text('Count: ' + visibilityCount + ' (' + visibilityPct + '% of ' + totalRecords + ' total)', offsetX, offsetY + 160);

        // Draw visibility bar (blue)
        p.fill(100, 100, 255);
        p.stroke(50, 50, 200);
        p.strokeWeight(2);
        var visibilityBarWidth = Math.max(10, width * (visibilityCount / maxCount));
        p.rect(offsetX, offsetY + 170, visibilityBarWidth, 40);

        // Add scale reference
        p.fill(150);
        p.textSize(10);
        p.text('Bar width represents proportion of incidents', offsetX, offsetY + 230);

        p.pop();
    }
  };
})();
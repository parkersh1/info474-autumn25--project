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

        // Build visibility integer histogram (percentage per visibility integer)
        const visCounts = {};
        let visTotal = 0;
        rows.forEach(r2 => {
            const visibilityRaw2 = (r2['Visibility(mi)'] === undefined || r2['Visibility(mi)'] === null) ? '' : String(r2['Visibility(mi)']).trim();
            if (visibilityRaw2 !== '') {
                const visNum2 = parseFloat(visibilityRaw2);
                if (!isNaN(visNum2)) {
                    const vInt = Math.round(visNum2);
                    visCounts[vInt] = (visCounts[vInt] || 0) + 1;
                    visTotal++;
                }
            }
        });

        const visPercentages = {};
        Object.keys(visCounts).forEach(k => {
            visPercentages[k] = ((visCounts[k] / (visTotal || 1)) * 100).toFixed(2);
        });

        stats.visibilityHistogram = {
            totalWithVisibility: visTotal,
            counts: visCounts,
            percentages: visPercentages
        };

        // Log histogram summary once
        if (!this._visibilityHistogramLogged) {
            console.log('VizSeverityVisibility: visibility integer histogram', stats.visibilityHistogram);
            this._visibilityHistogramLogged = true;
        }

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

    // Draw title for the histogram view
    p.fill(0);
    p.textSize(18);
    p.textAlign(p.LEFT);
    p.text('Visibility (mi) distribution — percentage of incidents', offsetX, offsetY);

        // --- Visibility integer histogram (1..10) - vertical bars showing percentage of incidents ---
        var histX = offsetX;
        var histY = offsetY + 250;
        var histWidth = Math.min(width, 540);
        var histHeight = Math.min(160, height - 260);

        p.push();
        p.translate(histX, histY);
        p.fill(0);
        p.textSize(14);
        p.textAlign(p.LEFT, p.TOP);
        p.text('Visibility (mi) histogram (1–10): % of incidents', 0, 0);

        // Get counts; guard if not present
        var hist = this.stats.visibilityHistogram || { counts: {}, totalWithVisibility: 0 };
        var counts = hist.counts || {};
        var totalWithVis = hist.totalWithVisibility || 0;
        var totalRecordsAll = this.stats.totalRecords || 1;

        // Prepare data for 1..10
        var bars = [];
        var maxPct = 0;
        for (var v = 1; v <= 10; v++) {
            var cnt = counts[v] || 0;
            // percentage of ALL incidents (as requested)
            var pctOfAll = (cnt / (totalRecordsAll || 1)) * 100;
            bars.push({vis: v, count: cnt, pctAll: pctOfAll});
            if (pctOfAll > maxPct) maxPct = pctOfAll;
        }
        if (maxPct <= 0) maxPct = 1;

        // Draw axes for histogram
        var marginLeft = 30;
        var marginBottom = 28;
        var axisX = marginLeft;
        var axisY = histHeight - marginBottom;
        var axisW = histWidth - marginLeft - 10;

        p.stroke(0);
        p.strokeWeight(1);
        p.line(axisX, axisY, axisX + axisW, axisY); // x axis
        p.line(axisX, axisY, axisX, 0); // y axis

        // Y ticks (percent) - 0 to maxPct in nice steps
        p.fill(0);
        p.textSize(10);
        p.textAlign(p.RIGHT, p.CENTER);
        var yTicks = 4;
        for (var t = 0; t <= yTicks; t++) {
            var yy = axisY - (t / yTicks) * (axisY - 10);
            var pctLabel = ((t / yTicks) * maxPct).toFixed(1) + '%';
            p.line(axisX - 4, yy, axisX, yy);
            p.text(pctLabel, axisX - 6, yy);
        }

        // Draw bars
        var barSlot = axisW / 10;
        for (var i = 0; i < bars.length; i++) {
            var b = bars[i];
            var bx = axisX + i * barSlot + 4;
            var bw = Math.max(4, barSlot - 8);
            var bh = (b.pctAll / maxPct) * (axisY - 10);
            var by = axisY - bh;

            p.fill(100, 150, 255);
            p.noStroke();
            p.rect(bx, by, bw, bh);

            // label x with visibility integer
            p.fill(0);
            p.textSize(10);
            p.textAlign(p.CENTER, p.TOP);
            p.text(b.vis, bx + bw / 2, axisY + 6);

            // show percentage value above bar if space
            p.textAlign(p.CENTER, p.BOTTOM);
            p.text((b.pctAll).toFixed(2) + '%', bx + bw / 2, by - 4);
        }

        p.pop();

        p.pop();
    }
  };
})();
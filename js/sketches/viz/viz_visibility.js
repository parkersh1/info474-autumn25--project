(function () {
  window.VizSeverityVisibility = window.VizSeverityVisibility || {
    DATA_PATH: './data/US_Accidents_March23_WA.csv',
    parseCSV: function (text) {
      const rows = [];
      let cur = '', row = [], inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          row.push(cur); cur = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ''; }
          if (ch === '\r' && text[i + 1] === '\n') i++;
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
    fetchAndParseCSV: function () {
      if (this._fetchPromise) return this._fetchPromise;
      const path = this.DATA_PATH || 'data/accident.csv';
      console.log('[VizSeverityVisibility] fetching CSV from', path);
      this._fetchPromise = fetch(path)
        .then(r => {
          if (!r.ok) throw new Error('Network response not ok: ' + r.status);
          return r.text();
        })
        .then(text => {
          const parsed = this.parseCSV(text);
          this._parsedRows = parsed.rows;
          console.log('[VizSeverityVisibility] parsed rows:', this._parsedRows.length);
          return this._parsedRows;
        })
        .catch(err => {
          console.error('[VizSeverityVisibility] fetch/parse error:', err);
          throw err;
        });
      return this._fetchPromise;
    }
  };

  // Renderer
  window.viz_fatalities_by_year = {
    setData: function (manager, rawData) {
      console.log('[viz_fatalities_by_year] setData called. rawData type:', typeof rawData);
      function parseCSVWithUserParser(text) {
        if (window.VizSeverityVisibility && typeof window.VizSeverityVisibility.parseCSV === 'function') {
          return window.VizSeverityVisibility.parseCSV(text).rows;
        }
    
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) return [];
        const headers = lines.shift().split(',').map(h => h.trim());
        return lines.map(line => {
          const cols = line.split(',');
          const obj = {};
          headers.forEach((h, i) => obj[h] = cols[i] === undefined ? '' : cols[i]);
          return obj;
        });
      }

      const getRows = async () => {
        if (Array.isArray(rawData)) return rawData;
        if (typeof rawData === 'string') return parseCSVWithUserParser(rawData);

        if (window.VizSeverityVisibility && typeof window.VizSeverityVisibility.fetchAndParseCSV === 'function') {
          return window.VizSeverityVisibility.fetchAndParseCSV();
        }
        // fallback fetch
        const path = 'data/accident.csv';
        const resp = await fetch(path);
        const text = await resp.text();
        return parseCSVWithUserParser(text);
      };

      return getRows().then(rows => {
        console.log('[viz_fatalities_by_year] rows loaded:', rows ? rows.length : 0);
        manager._rawRows = rows || [];

        // robust key detection
        const keys = rows.length ? Object.keys(rows[0]) : [];
        const stateKey = keys.find(k => k.toLowerCase() === 'state') || 'STATE';
        const stateNameKey = keys.find(k => k.toLowerCase() === 'statename') || 'STATENAME';
        const yearKey = keys.find(k => k.toLowerCase() === 'year') || 'YEAR';
        const fatKey = keys.find(k => k.toLowerCase().includes('fatal')) || 'FATALS';
        console.log('[viz_fatalities_by_year] detected keys:', { stateKey, stateNameKey, yearKey, fatKey });

        // filter WA and aggregate
        const yearMap = Object.create(null);
        let total = 0;
        rows.forEach(r => {
          const stateName = (r[stateNameKey] || '').trim();
          const stateCode = (r[stateKey] || '').trim();
          const isWA = (stateName.toLowerCase() === 'washington') || (stateCode === '53');
          if (!isWA) return;

          const yearRaw = (r[yearKey] || '').trim();
          const yearNum = parseInt(yearRaw, 10);
          if (isNaN(yearNum)) return;

          const fatRaw = (r[fatKey] || '').trim();
          const fatNum = fatRaw === '' ? 0 : parseFloat(fatRaw);
          const fatVal = isNaN(fatNum) ? 0 : fatNum;

          yearMap[yearNum] = (yearMap[yearNum] || 0) + fatVal;
          total += fatVal;
        });

        const arr = Object.keys(yearMap).map(y => ({ year: +y, fatalities: yearMap[y] }));
        arr.sort((a, b) => a.year - b.year);

        manager.fatalitiesByYear = arr;
        manager._maxFatalities = arr.length ? Math.max(...arr.map(d => d.fatalities)) : 0;
        manager._totalFatalitiesWA = total;
        console.log('[viz_fatalities_by_year] aggregated years:', manager.fatalitiesByYear);
      }).catch(err => {
        console.error('[viz_fatalities_by_year] setData error:', err);
        // attach empty so draw shows message
        manager.fatalitiesByYear = [];
        manager._maxFatalities = 0;
        manager._totalFatalitiesWA = 0;
      });
    },

    draw: function (p, manager, activeIndex, progress) {
      const data = manager.fatalitiesByYear;
      p.clear();
      p.background(255);

      if (!data) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Renderer initialized but data is undefined', p.width / 2, p.height / 2);
        return;
      }

      if (data.length === 0) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('No Washington rows found or data still loading.\nCheck console for errors and confirm CSV path/headers.', p.width / 2, p.height / 2);
        return;
      }

      // draw chart (simple)
      const margin = 60;
      const legendArea = 80;
      const chartW = p.width - margin * 2;
      const chartH = p.height - margin * 2 - legendArea;
      const maxF = manager._maxFatalities || 1;
      const barCount = data.length;
      const barGap = Math.max(2, Math.floor(chartW / (barCount * 20)));
      const barW = Math.max(2, (chartW - (barCount - 1) * barGap) / barCount);

      // grid
      p.stroke(230);
      for (let i = 0; i <= 4; i++) {
        const y = margin + (chartH * i) / 4;
        p.line(margin, y, margin + chartW, y);
      }

      // bars
      data.forEach((d, i) => {
        const x = margin + i * (barW + barGap);
        const barH = p.map(d.fatalities, 0, maxF, 0, chartH);
        const y = margin + (chartH - barH);
        p.noStroke();
        p.fill(70, 130, 180);
        p.rect(x, y, barW, barH);

        // year label
        p.push();
        p.translate(x + barW / 2, margin + chartH + 12);
        p.fill(0);
        p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        p.text(String(d.year), 0, 0);
        p.pop();
      });

      // title and total
      p.fill(0);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(18);
      p.text('Fatalities per Year — Washington', p.width / 2, 8);
      p.textSize(12);
      p.textAlign(p.RIGHT, p.TOP);
      p.text(`Total fatalities (WA): ${Math.round(manager._totalFatalitiesWA || 0)}`, p.width - 12, 8);

      // legend (colored boxes)
      const legendX = margin;
      const legendY = margin + chartH + 40;
      const boxSize = 14;
      const gap = 8;
      const itemSpacing = 220;

      p.noStroke();
      p.fill(60, 180, 75);
      p.rect(legendX, legendY - boxSize / 2, boxSize, boxSize);
      p.fill(0);
      p.textAlign(p.LEFT, p.CENTER);
      p.textSize(12);
      p.text('Low Severity (<2)', legendX + boxSize + gap, legendY);

      p.fill(250, 200, 60);
      p.rect(legendX + itemSpacing, legendY - boxSize / 2, boxSize, boxSize);
      p.fill(0);
      p.text('Medium Severity (2–3)', legendX + itemSpacing + boxSize + gap, legendY);

      p.fill(220, 60, 60);
      p.rect(legendX + itemSpacing * 2, legendY - boxSize / 2, boxSize, boxSize);
      p.fill(0);
      p.text('High Severity (>3)', legendX + itemSpacing * 2 + boxSize + gap, legendY);
    }
  };
})();
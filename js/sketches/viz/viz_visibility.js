(function () {
  window.VizSeverityVisibility = window.VizSeverityVisibility || {
    DATA_PATH: 'data/accident.csv',

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
          if (this._parsedRows.length > 0) {
            console.log('[VizSeverityVisibility] first row keys:', Object.keys(this._parsedRows[0]));
          }
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
        const path = 'data/accident.csv';
        const resp = await fetch(path);
        const text = await resp.text();
        return parseCSVWithUserParser(text);
      };

      return getRows().then(rows => {
        console.log('[viz_fatalities_by_year] rows loaded:', rows ? rows.length : 0);
        if (!rows || rows.length === 0) {
          manager.fatalitiesByYear = [];
          manager._maxFatalities = 0;
          manager._totalFatalitiesWA = 0;
          return;
        }

        const keys = Object.keys(rows[0] || {});
        const lowerKeys = keys.map(k => k.toLowerCase());

        const stateKey = keys[lowerKeys.findIndex(k => k === 'state')] || 'STATE';
        const stateNameKey = keys[lowerKeys.findIndex(k => k === 'statename')] || null;
        const yearKey = keys[lowerKeys.findIndex(k => k === 'year')] || 'YEAR';
        const fatKey =
          keys[lowerKeys.findIndex(k => k.includes('fatal'))] ||
          keys[lowerKeys.findIndex(k => k.includes('fat'))] ||
          'FATALS';

        console.log('[viz_fatalities_by_year] detected keys:', { stateKey, stateNameKey, yearKey, fatKey });

        const yearMap = Object.create(null);
        let total = 0;
        let waRows = 0;

        rows.forEach(r => {
          let isWA = false;

          if (stateNameKey && r[stateNameKey] != null) {
            const s = String(r[stateNameKey]).trim().toLowerCase();
            if (s === 'washington') isWA = true;
          }

          if (!isWA && r[stateKey] != null) {
            const raw = String(r[stateKey]).trim();
            const low = raw.toLowerCase();
            if (low === 'wa') isWA = true;
            const num = parseInt(raw, 10);
            if (num === 53) isWA = true;
          }

          if (!isWA) return;
          waRows++;

          const yearRaw = (r[yearKey] || '').toString().trim();
          const yearNum = parseInt(yearRaw, 10);
          if (isNaN(yearNum)) return;

          const fatRaw = (r[fatKey] || '').toString().trim();
          const fatNum = fatRaw === '' ? 0 : parseFloat(fatRaw);
          const fatVal = isNaN(fatNum) ? 0 : fatNum;

          yearMap[yearNum] = (yearMap[yearNum] || 0) + fatVal;
          total += fatVal;
        });

        console.log('[viz_fatalities_by_year] WA rows found:', waRows);

        const arr = Object.keys(yearMap).map(y => ({ year: +y, fatalities: yearMap[y] }));
        arr.sort((a, b) => a.year - b.year);

        manager.fatalitiesByYear = arr;
        manager._maxFatalities = arr.length ? Math.max(...arr.map(d => d.fatalities)) : 0;
        manager._totalFatalitiesWA = total;
        console.log('[viz_fatalities_by_year] aggregated years:', manager.fatalitiesByYear);
      }).catch(err => {
        console.error('[viz_fatalities_by_year] setData error:', err);
        manager.fatalitiesByYear = [];
        manager._maxFatalities = 0;
        manager._totalFatalitiesWA = 0;
      });
    },

    draw: function (p, manager, activeIndex, progress) {
      if (!manager._fatalInit) {
        manager._fatalInit = true;
        window.viz_fatalities_by_year.setData(manager);
      }

      const data = manager.fatalitiesByYear;
      p.clear();
      p.background(255);

      if (!data) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Loading Washington fatality data…', p.width / 2, p.height / 2);
        return;
      }

      if (data.length === 0) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text(
          'No Washington rows found or data still loading.\n' +
          'Check console for CSV path and detected column names.',
          p.width / 2, p.height / 2
        );
        return;
      }

      const margin = 60;
      const legendArea = 80;
      const chartW = p.width - margin * 2;
      const chartH = p.height - margin * 2 - legendArea;
      const maxF = manager._maxFatalities || 1;
      const barCount = data.length;
      const barGap = Math.max(2, Math.floor(chartW / (barCount * 20)));
      const barW = Math.max(2, (chartW - (barCount - 1) * barGap) / barCount);

      // grid lines
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

      // legend
      const legendX = margin;
      const legendY = margin + chartH + 40;
      const boxSize = 14;
      const gap = 8;

      p.noStroke();
      p.fill(70, 130, 180);
      p.rect(legendX, legendY - boxSize / 2, boxSize, boxSize);
      p.fill(0);
      p.textAlign(p.LEFT, p.CENTER);
      p.textSize(12);
      p.text('Annual fatality count (Washington)', legendX + boxSize + gap, legendY);
    }
  };
})();

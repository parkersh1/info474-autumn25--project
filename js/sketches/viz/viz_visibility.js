(function () {
  window.VizSeverityVisibility = {
    draw: function (p, manager, ai, progress) {
      p.push();

      // size defaults
      manager.width = manager.width || 700;
      manager.height = manager.height || 500;
      const offsetX = manager.offsetX || 60;
      const offsetY = manager.offsetY || 80;
      const chartWidth = manager.width - 2 * offsetX;
      const chartHeight = manager.height - 2 * offsetY;

      // --------- LOAD & AGGREGATE DATA ONCE ----------
      if (!window._waFatalitiesLoaded && !window._waFatalitiesLoading) {
        window._waFatalitiesLoading = true;
        console.log('[VizFatalitiesByYear] fetching data/accident.csv');

        fetch('data/accident.csv')
          .then(res => res.text())
          .then(text => {
            const lines = text.trim().split(/\r?\n/);
            if (!lines.length) {
              console.warn('[VizFatalitiesByYear] empty CSV');
              window._waFatalitiesData = [];
              window._waFatalitiesLoaded = true;
              window._waFatalitiesLoading = false;
              return;
            }

            // headers exactly as you pasted
            const headers = lines[0].split(',');
            const idxSTATE     = headers.indexOf('STATE');
            const idxSTATENAME = headers.indexOf('STATENAME');
            const idxYEAR      = headers.indexOf('YEAR');
            const idxFATALS    = headers.indexOf('FATALS');

            console.log('[VizFatalitiesByYear] header indices', {
              idxSTATE, idxSTATENAME, idxYEAR, idxFATALS
            });

            const yearMap = Object.create(null);
            let total = 0;

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i]) continue;
              const row = lines[i].split(',');

              const stateCode = (row[idxSTATE] || '').trim();
              const stateName = (row[idxSTATENAME] || '').trim();

              const isWA =
                stateCode === '53' ||
                stateName.toLowerCase() === 'washington';

              if (!isWA) continue;

              const yearRaw = (row[idxYEAR] || '').trim();
              const yearNum = parseInt(yearRaw, 10);
              if (isNaN(yearNum)) continue;

              const fatRaw = (row[idxFATALS] || '').trim();
              const fatNum = fatRaw === '' ? 0 : parseFloat(fatRaw);
              const fatVal = isNaN(fatNum) ? 0 : fatNum;

              yearMap[yearNum] = (yearMap[yearNum] || 0) + fatVal;
              total += fatVal;
            }

            const result = Object.keys(yearMap)
              .map(y => ({ year: +y, fatalities: yearMap[y] }))
              .sort((a, b) => a.year - b.year);

            console.log('[VizFatalitiesByYear] aggregated years:', result);

            window._waFatalitiesData = result;
            window._waFatalitiesTotal = total;
            window._waFatalitiesLoaded = true;
            window._waFatalitiesLoading = false;
          })
          .catch(err => {
            console.error('[VizFatalitiesByYear] fetch/parse error:', err);
            window._waFatalitiesData = [];
            window._waFatalitiesTotal = 0;
            window._waFatalitiesLoaded = true;
            window._waFatalitiesLoading = false;
          });
      }

      const data = window._waFatalitiesData || [];

      // --------- DRAWING ----------
      p.clear();
      p.background(255);

      if (!window._waFatalitiesLoaded) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Loading Washington fatalities data...', manager.width / 2, manager.height / 2);
        p.pop();
        return;
      }

      if (!data.length) {
        p.fill(0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('No Washington rows found in accident.csv', manager.width / 2, manager.height / 2);
        p.pop();
        return;
      }

      const maxF = data.reduce((m, d) => Math.max(m, d.fatalities), 0) || 1;
      const barCount = data.length;
      const barGap = Math.max(2, Math.floor(chartWidth / (barCount * 20)));
      const barW = Math.max(2, (chartWidth - (barCount - 1) * barGap) / barCount);

      // grid
      p.stroke(230);
      p.strokeWeight(1);
      for (let i = 0; i <= 4; i++) {
        const y = offsetY + (chartHeight * i) / 4;
        p.line(offsetX, y, offsetX + chartWidth, y);
      }

      // y-axis labels
      p.fill(0);
      p.noStroke();
      p.textAlign(p.RIGHT, p.CENTER);
      p.textSize(10);
      for (let i = 0; i <= 4; i++) {
        const y = offsetY + (chartHeight * i) / 4;
        const val = Math.round(maxF * (1 - i / 4));
        p.text(String(val), offsetX - 8, y);
      }

      // bars
      data.forEach((d, i) => {
        const x = offsetX + i * (barW + barGap);
        const barH = p.map(d.fatalities, 0, maxF, 0, chartHeight);
        const y = offsetY + (chartHeight - barH);

        p.noStroke();
        p.fill(70, 130, 180);
        p.rect(x, y, barW, barH);

        // year label
        p.push();
        p.translate(x + barW / 2, offsetY + chartHeight + 10);
        p.fill(0);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(10);
        p.text(String(d.year), 0, 0);
        p.pop();
      });

      // title + total
      p.fill(0);
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(18);
      p.text('Washington Fatalities per Year (accident.csv)', manager.width / 2, 10);

      p.textAlign(p.RIGHT, p.TOP);
      p.textSize(12);
      p.text(
        `Total fatalities (WA): ${Math.round(window._waFatalitiesTotal || 0)}`,
        manager.width - 10,
        10
      );

      p.pop();
    }
  };
})();

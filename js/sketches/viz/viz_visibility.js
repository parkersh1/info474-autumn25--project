(function () {
    window.VizSeverityVisibility = {
        draw: function (p, manager, ai, progress) {
            p.push();

            // canvas defaults
            manager.width = manager.width || 700;
            manager.height = manager.height || 500;
            const offsetX = manager.offsetX || 60;
            const offsetY = manager.offsetY || 80;
            const chartWidth = manager.width - 2 * offsetX;
            const chartHeight = manager.height - 2 * offsetY;

            // ---------- LOAD & AGGREGATE (ONCE) ----------
            if (!window._waFatalitiesMonthlyLoaded && !window._waFatalitiesMonthlyLoading) {
                window._waFatalitiesMonthlyLoading = true;
                console.log('[VizFatalitiesByYear] fetching data/accident.csv');

                fetch('data/accident.csv')
                    .then(res => res.text())
                    .then(text => {
                        const lines = text.trim().split(/\r?\n/);
                        if (!lines.length) {
                            console.warn('[VizFatalitiesByYear] empty CSV');
                            window._waFatalitiesMonthlyData = [];
                            window._waFatalitiesMonthlyLoaded = true;
                            window._waFatalitiesMonthlyLoading = false;
                            return;
                        }

                        const headers = lines[0].split(',');
                        const idxSTATE = headers.indexOf('STATE');
                        const idxSTATENAME = headers.indexOf('STATENAME');
                        const idxYEAR = headers.indexOf('YEAR');
                        const idxMONTH = headers.indexOf('MONTH');
                        const idxMONTHNAME = headers.indexOf('MONTHNAME');
                        const idxFATALS = headers.indexOf('FATALS');

                        console.log('[VizFatalitiesByYear] header indices', {
                            idxSTATE, idxSTATENAME, idxYEAR, idxMONTH, idxMONTHNAME, idxFATALS
                        });

                        const monthlyByYear = {};     // { [year]: { [month]: totalFatals } }
                        const totalByYear = {};       // { [year]: totalFatals }
                        const monthNames = {};        // { [month]: "January" }

                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i];
                            if (!line) continue;
                            const row = line.split(',');

                            const stateCode = (row[idxSTATE] || '').trim();
                            const stateName = (row[idxSTATENAME] || '').trim();

                            const isWA =
                                stateCode === '53' ||
                                stateName.toLowerCase() === 'washington';

                            if (!isWA) continue;

                            const yearRaw = (row[idxYEAR] || '').trim();
                            const monthRaw = (row[idxMONTH] || '').trim();
                            const monthName = (row[idxMONTHNAME] || '').trim();

                            const yearNum = parseInt(yearRaw, 10);
                            const monthNum = parseInt(monthRaw, 10);

                            if (isNaN(yearNum) || isNaN(monthNum)) continue;

                            // const fatRaw = (row[idxFATALS] || '').trim();
                            // const fatNum = fatRaw === '' ? 0 : parseFloat(fatRaw);
                            // const fatVal = isNaN(fatNum) ? 0 : fatNum;

                            // if (!monthlyByYear[yearNum]) monthlyByYear[yearNum] = {};
                            // monthlyByYear[yearNum][monthNum] =
                            //     (monthlyByYear[yearNum][monthNum] || 0) + fatVal;

                            // totalByYear[yearNum] = (totalByYear[yearNum] || 0) + fatVal;
//                             const fatRaw = (row[idxFATALS] || '').trim();
// const fatNum = fatRaw === '' ? 0 : parseFloat(fatRaw);
// const fatFlag = fatNum === 1 ? 2 : 0;   // 2 = fatal, 1 = non-fatal

// if (!monthlyByYear[yearNum]) monthlyByYear[yearNum] = {};
// monthlyByYear[yearNum][monthNum] =
//   (monthlyByYear[yearNum][monthNum] || 0) + fatFlag;  // count fatal crashes

// totalByYear[yearNum] = (totalByYear[yearNum] || 0) + fatFlag;


                            if (monthName && !monthNames[monthNum]) {
                                monthNames[monthNum] = monthName;
                            }
                        }

                        const years = Object.keys(monthlyByYear).map(Number);
                        if (!years.length) {
                            console.warn('[VizFatalitiesByYear] no WA rows found');
                            window._waFatalitiesMonthlyData = [];
                            window._waFatalitiesMonthlyLoaded = true;
                            window._waFatalitiesMonthlyLoading = false;
                            return;
                        }

                        // Use the latest year found (e.g., 2022)
                        const targetYear = Math.max(...years);
                        const perMonth = monthlyByYear[targetYear];

                        const result = [];
                        let maxF = 0;
                        for (let m = 1; m <= 12; m++) {
                            const val = perMonth ? (perMonth[m] || 0) : 0;
                            maxF = Math.max(maxF, val);
                            result.push({
                                month: m,
                                monthName: monthNames[m] || String(m),
                                fatalities: val
                            });
                        }

                        console.log('[VizFatalitiesByYear] monthly for year', targetYear, result);

                        window._waFatalitiesMonthlyData = result;
                        window._waFatalitiesMonthlyMax = maxF || 1;
                        window._waFatalitiesMonthlyTotal = totalByYear[targetYear] || 0;
                        window._waFatalitiesMonthlyYear = targetYear;
                        window._waFatalitiesMonthlyLoaded = true;
                        window._waFatalitiesMonthlyLoading = false;
                    })
                    .catch(err => {
                        console.error('[VizFatalitiesByYear] fetch/parse error:', err);
                        window._waFatalitiesMonthlyData = [];
                        window._waFatalitiesMonthlyMax = 1;
                        window._waFatalitiesMonthlyTotal = 0;
                        window._waFatalitiesMonthlyYear = null;
                        window._waFatalitiesMonthlyLoaded = true;
                        window._waFatalitiesMonthlyLoading = false;
                    });
            }

            const data = window._waFatalitiesMonthlyData || [];
            const maxF = window._waFatalitiesMonthlyMax || 1;
            const year = window._waFatalitiesMonthlyYear;

            // ---------- DRAW ----------
            p.clear();
            p.background(255);

            if (!window._waFatalitiesMonthlyLoaded) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(14);
                p.text('Loading Washington fatalities data...', manager.width / 2, manager.height / 2);
                p.pop();
                return;
            }

            if (!data.length || !year) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(14);
                p.text('No Washington rows found in accident.csv', manager.width / 2, manager.height / 2);
                p.pop();
                return;
            }

            const barCount = data.length; // 12
            const barGap = Math.max(6, Math.floor(chartWidth / (barCount * 8)));
            const barW = Math.max(10, (chartWidth - (barCount - 1) * barGap) / barCount);

            // grid
            p.stroke(230);
            p.strokeWeight(1);
            for (let i = 0; i <= 4; i++) {
                const y = offsetY + (chartHeight * i) / 4;
                p.line(offsetX, y, offsetX + chartWidth, y);
            }

            //sideways y-axis label
            p.push();
            p.translate(20, manager.height / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.fill(0);
            p.text('# Fatalities', 0, 0);
            p.pop();

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


            // bars + labels
            data.forEach((d, i) => {
                const x = offsetX + i * (barW + barGap);
                const barH = p.map(d.fatalities, 0, maxF, 0, chartHeight);
                const y = offsetY + (chartHeight - barH);

                // bar
                p.noStroke();
                p.fill(220, 60, 60);
                p.rect(x, y, barW, barH);

                // numeric label on top of bar
                p.fill(0);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.textSize(10);
                p.text(String(Math.round(d.fatalities)), x + barW / 2, y - 2);

                // short month label (e.g., "Jan")
                p.fill(0);
                p.textAlign(p.CENTER, p.TOP);
                p.text(d.monthName.slice(0, 3), x + barW / 2, offsetY + chartHeight + 4);

            });

            // title
            p.fill(0);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(18);
            p.text(
                'Washington Fatalities Per Month',
                manager.width / 2,
                10
            );

            p.pop();
        }
    };
})();

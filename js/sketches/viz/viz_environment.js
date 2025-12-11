(function () {
    window.VizEnvironment = {
        draw: function (p, manager, ai, progress) {
            p.push();

            manager.width = manager.width || 700;
            manager.height = manager.height || 500;
            const offsetX = manager.offsetX || 60;
            const offsetY = manager.offsetY || 150;
            const chartWidth = manager.width - 2 * offsetX;
            const chartHeight = manager.height - 2 * offsetY;

            // Data loading and aggregation
            if (!window._weatherSeverityLoaded) {
                window._weatherSeverityLoaded = false;
                fetch('data/US_Accidents_March23_WA.csv').then(res => res.text()).then(text => {
                    const lines = text.split(/\r?\n/);
                    const headers = lines[0].split(',');
                    const idx = {
                        Severity: headers.indexOf('Severity'),
                        Weather_Condition: headers.indexOf('Weather_Condition'),
                        Visibility: headers.indexOf('Visibility(mi)'),
                        Precipitation: headers.indexOf('Precipitation(in)'),
                        Humidity: headers.indexOf('Humidity(%)'),
                        WindSpeed: headers.indexOf('Wind_Speed(mph)')
                    };
                    const agg = {};
                    for (let i = 1; i < lines.length; i++) {
                        const row = lines[i].split(',');
                        const sev = parseInt(row[idx.Severity], 10);
                        const cond = row[idx.Weather_Condition];
                        if (!cond || isNaN(sev)) continue;
                        if (!agg[cond]) agg[cond] = {
                            sum: 0, count: 0,
                            visSum: 0, visCount: 0,
                            precSum: 0, precCount: 0,
                            humSum: 0, humCount: 0,
                            windSum: 0, windCount: 0
                        };
                        agg[cond].sum += sev;
                        agg[cond].count++;
                        // Visibility
                        const vis = parseFloat(row[idx.Visibility]);
                        if (!isNaN(vis)) { agg[cond].visSum += vis; agg[cond].visCount++; }
                        // Precipitation
                        const prec = parseFloat(row[idx.Precipitation]);
                        if (!isNaN(prec)) { agg[cond].precSum += prec; agg[cond].precCount++; }
                        // Humidity
                        const hum = parseFloat(row[idx.Humidity]);
                        if (!isNaN(hum)) { agg[cond].humSum += hum; agg[cond].humCount++; }
                        // Wind Speed
                        const wind = parseFloat(row[idx.WindSpeed]);
                        if (!isNaN(wind)) { agg[cond].windSum += wind; agg[cond].windCount++; }
                    }
                    // Compute averages for each condition
                    const result = Object.entries(agg).map(([cond, v]) => ({
                        condition: cond,
                        avgSeverity: v.sum / v.count,
                        count: v.count,
                        avgVisibility: v.visCount > 0 ? v.visSum / v.visCount : null,
                        avgPrecipitation: v.precCount > 0 ? v.precSum / v.precCount : null,
                        avgHumidity: v.humCount > 0 ? v.humSum / v.humCount : null,
                        avgWindSpeed: v.windCount > 0 ? v.windSum / v.windCount : null
                    }));
                    // Sort by avgSeverity descending, then by count
                    result.sort((a, b) => b.avgSeverity - a.avgSeverity || b.count - a.count);
                    window._weatherSeverityData = result.slice(0, 10); // top 10
                    window._weatherSeverityLoaded = true;
                });
            }

            // Draw chart if data loaded
            const data = window._weatherSeverityData || [];
            // Title
            p.fill(0);
            p.textSize(18);
            p.textAlign(p.CENTER, p.TOP);
            p.text('Weather Conditions with Highest Average Severity', manager.width / 2, offsetY - 30);
            //subtitle
            p.textSize(14);
            p.textAlign(p.CENTER, p.TOP);
            p.text('(Hover over bars for details)', manager.width / 2, offsetY - 10);
             p.text("Severity is graded from 1–4 (1=lowest, 4=highest)", manager.width / 2, offsetY - 10 + 20);




            if (!window._weatherSeverityLoaded || data.length === 0) {
                p.textSize(14);
                p.text('Loading data...', manager.width / 2, manager.height / 2);
                p.pop();
                return;
            }

            const barHeight = chartHeight / data.length;
            const maxSeverity = Math.max(...data.map(d => d.avgSeverity));
            let hoveredIndex = -1;

            const test = offsetY + 30;  // add 60px padding below subtitle

            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const y = test + i * (barHeight + 8);
                const barW = (d.avgSeverity / maxSeverity) * chartWidth;

                // Map severity to traffic-light colors
                //if (d.avgSeverity >= 3 && d.avgSeverity <= 4) {
                    //col = p.color(220, 60, 60); // red
                //} else {
                    col = p.color(240, 200, 70); // yellow
               // }

                // Bar styling
                p.fill(col);
                p.stroke(255);              // subtle white outline
                p.strokeWeight(0.6);
                p.rect(offsetX, y, barW, barHeight, 6); // rounded corners

                // Label styling
                p.noStroke();
                p.fill(30);
                p.textSize(13);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(`${d.condition} `, offsetX + barW + 12, y + barHeight / 2);

                // Hover effect: highlight bar
                if (p.mouseX >= offsetX && p.mouseX <= offsetX + barW &&
                    p.mouseY >= y && p.mouseY <= y + barHeight) {
                    hoveredIndex = i;
                    p.stroke(50, 50, 50);
                    p.strokeWeight(1.2);
                    p.noFill();
                    p.rect(offsetX, y, barW, barHeight, 6);
                }
            }


            // Draw tooltip if hovering
            if (hoveredIndex !== -1) {
                const d = data[hoveredIndex];
                const y = offsetY + hoveredIndex * (barHeight + 8);
                const barW = (d.avgSeverity / maxSeverity) * chartWidth * 0.9;

                // Tooltip position
                const tooltipX = Math.min(p.mouseX + 20, manager.width - 240);
                const tooltipY = Math.max(p.mouseY - 10, 40);
                const boxW = 230;
                const boxH = 130;

                // Drop shadow
                p.noStroke();
                p.fill(0, 50); // semi-transparent black
                p.rect(tooltipX + 4, tooltipY + 4, boxW, boxH, 10);

                // Tooltip background
                p.fill(255, 255, 240); // soft ivory
                p.stroke(200, 200, 150);
                p.strokeWeight(1);
                p.rect(tooltipX, tooltipY, boxW, boxH, 10);

                // Text styling
                p.noStroke();
                p.fill(30);
                p.textSize(13);
                p.textAlign(p.LEFT, p.TOP);

                let lineY = tooltipY + 10;
                const lineH = 18;

                // Bold header
                p.textStyle(p.BOLD);
                p.text(`Condition: ${d.condition}`, tooltipX + 12, lineY);
                p.textStyle(p.NORMAL);

                lineY += lineH;
                p.text(`Avg Severity: ${d.avgSeverity.toFixed(2)}`, tooltipX + 12, lineY);

                lineY += lineH;
                p.text(`Avg Visibility: ${d.avgVisibility !== null ? d.avgVisibility.toFixed(2) + ' mi' : 'N/A'}`, tooltipX + 12, lineY);

                lineY += lineH;
                p.text(`Avg Humidity: ${d.avgHumidity !== null ? d.avgHumidity.toFixed(1) + ' %' : 'N/A'}`, tooltipX + 12, lineY);

                lineY += lineH;
                p.text(`Avg Wind Speed: ${d.avgWindSpeed !== null ? d.avgWindSpeed.toFixed(2) + ' mph' : 'N/A'}`, tooltipX + 12, lineY);
            }

            p.pop();
        }
    };
})();
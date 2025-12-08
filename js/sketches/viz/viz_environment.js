(function () {
    window.VizEnvironment = {
        draw: function (p, manager, ai, progress) {
            p.push();

            manager.width = manager.width || 700;
            manager.height = manager.height || 500;
            const offsetX = manager.offsetX || 60;
            const offsetY = manager.offsetY || 40;
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

            if (!window._weatherSeverityLoaded || data.length === 0) {
                p.textSize(14);
                p.text('Loading data...', manager.width / 2, manager.height / 2);
                p.pop();
                return;
            }

            // Bar chart
            const barHeight = Math.min(30, chartHeight / data.length - 8);
            const maxSeverity = Math.max(...data.map(d => d.avgSeverity));
            // Track mouse for tooltip
            let hoveredIndex = -1;
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const y = offsetY + i * (barHeight + 8);
                const barW = (d.avgSeverity / maxSeverity) * chartWidth * 0.9;
                // Bar
                p.fill(255, 100, 100);
                p.stroke(200, 50, 50);
                p.rect(offsetX, y, barW, barHeight);
                // Label
                p.fill(0);
                p.textSize(13);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(d.condition + ' (' + d.avgSeverity.toFixed(2) + ')', offsetX + barW + 10, y + barHeight / 2);

                // Check hover
                if (p.mouseX >= offsetX && p.mouseX <= offsetX + barW && p.mouseY >= y && p.mouseY <= y + barHeight) {
                    hoveredIndex = i;
                }
            }

            // Draw tooltip if hovering
            if (hoveredIndex !== -1) {
                const d = data[hoveredIndex];
                const y = offsetY + hoveredIndex * (barHeight + 8);
                const barW = (d.avgSeverity / maxSeverity) * chartWidth * 0.9;
                const tooltipX = Math.min(p.mouseX + 20, manager.width - 220);
                const tooltipY = Math.max(p.mouseY - 10, 30);
                p.fill(255, 255, 220);
                p.stroke(180, 180, 100);
                p.rect(tooltipX, tooltipY, 210, 110, 8);
                p.noStroke();
                p.fill(40);
                p.textSize(13);
                p.textAlign(p.LEFT, p.TOP);
                p.text('Condition: ' + d.condition, tooltipX + 10, tooltipY + 8);
                p.text('Avg Severity: ' + d.avgSeverity.toFixed(2), tooltipX + 10, tooltipY + 28);
                p.text('Incidents: ' + d.count, tooltipX + 10, tooltipY + 46);
                p.text('Avg Visibility: ' + (d.avgVisibility !== null ? d.avgVisibility.toFixed(2) + ' mi' : 'N/A'), tooltipX + 10, tooltipY + 64);
                p.text('Avg Precipitation: ' + (d.avgPrecipitation !== null ? d.avgPrecipitation.toFixed(2) + ' in' : 'N/A'), tooltipX + 10, tooltipY + 80);
                p.text('Avg Humidity: ' + (d.avgHumidity !== null ? d.avgHumidity.toFixed(1) + ' %' : 'N/A'), tooltipX + 10, tooltipY + 96);
                p.text('Avg Wind Speed: ' + (d.avgWindSpeed !== null ? d.avgWindSpeed.toFixed(2) + ' mph' : 'N/A'), tooltipX + 10, tooltipY + 112);
            }

            // Axis label
            p.textSize(12);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.text('Average Severity', manager.width / 2, manager.height - 10);

            p.pop();
        }
    };
})();
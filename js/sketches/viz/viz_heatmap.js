(function () {
    window.VizHeatmap = {
        draw: function (p, manager, ai, progress) {
            p.push();

            const times = [
                "12AM", "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
                "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
            ];
            const conditions = ['Rain', 'NoRain', 'Humid', 'NotHumid'];

            // Declare visibility bins in outer scope
            if (!manager.visibility) {
                manager.visibility = {
                    Rain: Array(24).fill(0),
                    NoRain: Array(24).fill(0),
                    Humid: Array(24).fill(0),
                    NotHumid: Array(24).fill(0)
                };

                // Load data once
                (async () => {
                    const DATA_PATH = "./data/US_Accidents_March23_WA.csv";
                    const parsed = await loadCSV(DATA_PATH);

                    parsed.rows.forEach(r => {
                        const timeStr = r["Start_Time"];
                        const weather = r["Weather_Condition"] || "";
                        const visibilityVal = r["Visibility(mi)"];
                        if (typeof visibilityVal !== "number" || isNaN(visibilityVal)) return;

                        const date = new Date(timeStr);
                        const hour = date.getHours();

                        if (weather.includes("Rain")) {
                            manager.visibility.Rain[hour] += visibilityVal;
                        } else {
                            manager.visibility.NoRain[hour] += visibilityVal;
                        }

                        if (weather.includes("Humid")) {
                            manager.visibility.Humid[hour] += visibilityVal;
                        } else {
                            manager.visibility.NotHumid[hour] += visibilityVal;
                        }
                    });

                    console.log("Visibility bins:", manager.visibility);
                })();
            }

        
            async function loadCSV(path) {
                const response = await fetch(path);
                if (!response.ok) throw new Error("Failed to fetch CSV");
                const text = await response.text();
                return parseCSV(text);
            }

            function parseCSV(data) {
                const rows = [];
                let cur = "", row = [], inQuotes = false;
                for (let i = 0; i < data.length; i++) {
                    const ch = data[i];
                    if (ch === '"') {
                        if (inQuotes && data[i + 1] === '"') { cur += '"'; i++; }
                        else { inQuotes = !inQuotes; }
                    } else if (ch === "," && !inQuotes) {
                        row.push(cur); cur = "";
                    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
                        if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ""; }
                        if (ch === "\r" && data[i + 1] === "\n") i++;
                    } else {
                        cur += ch;
                    }
                }
                if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }

                if (rows.length === 0) return { headers: [], rows: [] };

                const headers = rows[0].map(s => s.trim());
                const objs = [];
                for (let r = 1; r < rows.length; r++) {
                    const rr = rows[r];
                    let allEmpty = true;
                    for (let z = 0; z < rr.length; z++) if (rr[z] !== "") { allEmpty = false; break; }
                    if (allEmpty) continue;
                    const obj = {};
                    for (let c = 0; c < headers.length; c++) {
                        let val = (c < rr.length) ? rr[c].trim() : "";
                        if (val !== "" && !isNaN(val)) {
                            obj[headers[c]] = Number(val);
                        } else {
                            obj[headers[c]] = val;
                        }
                    }
                    objs.push(obj);
                }
                return { headers, rows: objs };
            }

    
            const cellWidth = 120;
            const cellPadding = 5;
            const padding = 50;
            const cellHeight = 15;

            for (let i = 0; i < times.length; i++) {
                for (let j = 0; j < conditions.length; j++) {
                    const visValue = manager.visibility[conditions[j]][i];
                    const x = manager.offsetX + padding + j * (cellWidth + cellPadding);
                    const y = manager.offsetY + padding + i * (cellHeight + cellPadding);
                    const colorValue = p.map(visValue, 0, 16, 255, 50);
                    p.fill(colorValue, colorValue, 255);
                    p.rect(x, y, cellWidth, cellHeight);
                }
            }



            // Draw condition labels
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            for (let j = 0; j < conditions.length; j++) {
                const x = cellWidth / 2 + manager.offsetX + padding + j * (cellWidth + cellPadding);
                const y = manager.offsetY + padding - 10;
                p.text(conditions[j], x, y);
            }

            // Draw time labels
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(10);
            for (let i = 0; i < times.length; i++) {
                const x = manager.offsetX + padding - 10;
                const y = manager.offsetY + padding + i * cellHeight + cellHeight / 2;
                p.text(times[i], x, y);
            }

            // Title
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(16);
            p.text('Visibility Heatmap by Time and Weather Conditions',
                manager.offsetX + (manager.width || 600) / 2,
                manager.offsetY + 10);

            p.pop();

            //Legend bottom middle
            p.push();
            const legendX = manager.offsetX + (manager.width || 600) / 2 - 100;
            const legendY = manager.offsetY + (manager.height || 520) - 40;
            p.fill(0);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(12);
            p.text('Low Visibility', legendX, legendY - 10);
            for (let i = 0; i <= 10; i++) {
                const colorValue = p.map(i, 0, 10, 255, 50);
                p.fill(colorValue, colorValue, 255);
                p.rect(legendX + i * 20, legendY, 20, 10);
            }
            p.text('High Visibility', legendX + 220, legendY - 10);
            p.pop();

        }
    };
})();
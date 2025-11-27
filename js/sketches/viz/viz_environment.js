(function () {
    window.VizEnvironment = {
        draw: function (p, manager, ai, progress) {
            p.push();

            manager.offsetX = manager.offsetX || 0;
            manager.offsetY = manager.offsetY || 0;
            manager.width = manager.width || 600;
            manager.height = manager.height || 400;

            if (!manager._checkboxesCreated) {
                manager._checkboxesCreated = true;

                manager.selectedFields = {
                    "Temperature(F)": true,
                    "Humidity(%)": true,
                    "Precipitation(in)": true
                };

                manager.checkboxContainer = p.createDiv();
                manager.checkboxContainer.parent("vis"); 
                manager.checkboxContainer.style("margin-top", "10px");

                const fieldsMeta = [
                    { key: "Temperature(F)", label: "Temperature" },
                    { key: "Humidity(%)", label: "Humidity" },
                    { key: "Precipitation(in)", label: "Precipitation" }
                ];

                fieldsMeta.forEach(f => {
                    const cb = p.createCheckbox(" " + f.label, true);
                    cb.parent(manager.checkboxContainer);
                    cb.changed(() => {
                        manager.selectedFields[f.key] = cb.checked();
                        p.redraw();
                    });
                });
            }

            const severity = [1, 2, 3, 4];
            const synthetic = {
                "Temperature(F)": [60, 55, 50, 45],
                "Humidity(%)": [50, 60, 70, 80],
                "Precipitation(in)": [0.05, 0.1, 0.3, 0.6]
            };

            const fields = [
                { key: "Temperature(F)", label: "Temperature", color: "red", scale: 100 },
                { key: "Humidity(%)", label: "Humidity", color: "blue", scale: 100 },
                { key: "Precipitation(in)", label: "Precipitation", color: "green", scale: 1 }
            ];

            // Axes
            const padding = 60;
            const chartWidth = manager.width - 2 * padding;
            const chartHeight = manager.height - 2 * padding;
            const originX = manager.offsetX + padding;
            const originY = manager.offsetY + manager.height - padding;

            // Draw axes
            p.stroke(0);
            p.line(originX, originY, originX + chartWidth, originY);
            p.line(originX, originY, originX, originY - chartHeight);

            // Title
            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(16);
            p.text("Environmental Factors vs Severity",
                manager.offsetX + manager.width / 2,
                manager.offsetY + 10);
            // X-axis label
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text("Accident Severity", manager.offsetX + manager.width / 2,
                manager.offsetY + manager.height - 20);

            // Y-axis label
            p.push();
            p.translate(manager.offsetX + 20, manager.offsetY + manager.height / 2);
            p.rotate(-p.HALF_PI);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text("Environmental Measure", 0, 0);
            p.pop();

            // Draw lines for each selected field
            fields.forEach(f => {
                if (!manager.selectedFields[f.key]) return;

                p.stroke(f.color);
                p.noFill();
                p.beginShape();

                for (let i = 0; i < severity.length; i++) {
                    const x = originX + (i / (severity.length - 1)) * chartWidth;
                    const y = originY - (synthetic[f.key][i] / f.scale) * chartHeight;
                    p.vertex(x, y);
                }

                p.endShape();

                const lx = originX + chartWidth;
                const ly = originY - (synthetic[f.key][severity.length - 1] / f.scale) * chartHeight;
                p.noStroke();
                p.fill(f.color);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(f.label, lx + 5, ly);
            });

            p.pop();
        }
    };
})();
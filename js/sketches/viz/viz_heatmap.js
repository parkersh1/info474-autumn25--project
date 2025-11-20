(function () {
    window.VizHeatmap = {
        draw: function (p, manager, ai, progress) {
            p.push();

            const times = [
                "12AM", "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
                "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
            ];
            const conditions = ['Rain', 'No Rain', 'Humid', 'Not Humid'];

            const visibility = {
                "Rain": [2, 3, 4, 5, 6, 5, 4, 3, 2, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 2, 2],
                "No Rain": [8, 9, 10, 12, 14, 15, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 2, 2],
                "Humid": [3, 4, 5, 6, 7, 6, 5, 4, 3, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 3, 3],
                "Not Humid": [9, 10, 12, 14, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2]
            };

            const cellSize = manager.cellSize || 25;
            const cellHeight = 20;
            const padding = 50;

            // Draw heatmap cells
            for (let i = 0; i < times.length; i++) {
                for (let j = 0; j < conditions.length; j++) {
                    const visValue = visibility[conditions[j]][i];

                    const cellWidth = manager.cellWidth || 60;
                    const cellHeight = 20;
                    const cellPadding = 4;

                    const x = manager.offsetX + padding + j * (cellWidth + cellPadding);
                    const y = manager.offsetY + padding + i * (cellHeight + cellPadding);

                    const colorValue = p.map(visValue, 0, 16, 255, 50);
                    p.fill(colorValue, colorValue, 255);
                    p.rect(x, y, cellSize, cellHeight);
                }
            }

            // Draw condition labels
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(12);
            for (let j = 0; j < conditions.length; j++) {
                const x = manager.offsetX + padding + j * (manager.cellWidth || 60) + cellSize / 2;
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
        }
    };
})();
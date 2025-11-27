// sketch_renderer.js
// Responsible for rendering the main visualization based on the current active index
console.log('*** NEW RENDERER FILE LOADED ***');

(function () {
    window.Renderer = {

        setData: function (manager) {
            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            function computeLayout(data) {
                manager.data = data;
            }

            computeLayout([]);
            return Promise.resolve(manager.data);
        },

        draw: function (p, manager, ai, progress) {
            console.log(
                'Renderer.draw: ai =',
                ai,
                'progress =',
                progress,
                'VizMap exists =',
                !!window.VizMap
            );

            // 1. Map (6)
            if (ai === 6) {
                if (window.VizMap && typeof window.VizMap.draw === 'function') {
                    try {
                        window.VizMap.draw(p, manager, ai, progress);
                    } catch (err) {
                        console.error('Renderer: error inside VizMap.draw', err);
                    }
                } else {
                    console.warn('Renderer: VizMap not available when ai === 6');
                }
                return;
            }

            // 2. Title / intro (0–1)
            if (ai === 0 || ai === 1) {
                if (window.VizTitle && typeof window.VizTitle.draw === 'function') {
                    window.VizTitle.draw(p, manager, ai, progress);
                }
                return;
            }

            // 3. Heatmap (2)
            if (ai === 2) {
                if (window.VizHeatmap && typeof window.VizHeatmap.draw === 'function') {
                    window.VizHeatmap.draw(p, manager, ai, progress);
                }
                return;
            }

            // 4. Environment (3)
            if (ai === 3) {
                if (window.VizEnvironment && typeof window.VizEnvironment.draw === 'function') {
                    window.VizEnvironment.draw(p, manager, ai, progress);
                }
                return;
            }

            // 5. Section (4)
            if (ai === 4) {
                if (window.VizSection && typeof window.VizSection.draw === 'function') {
                    window.VizSection.draw(p, manager, ai, progress);
                }
                return;
            }

            // 6. Scatterplot (5)
            if (ai === 5) {
                if (window.VizScatter && typeof window.VizScatter.draw === 'function') {
                    window.VizScatter.draw(p, manager, ai, progress);
                }
                return;
            }

            // 7. Severity bar chart (7)
            if (ai === 7) {
                if (window.VizBar && typeof window.VizBar.draw === 'function') {
                    window.VizBar.draw(p, manager, ai, progress);
                }
                return;
            }

            // Fallback
            console.warn('Renderer: no visualization branch matched for ai =', ai);
        }
    };
})();

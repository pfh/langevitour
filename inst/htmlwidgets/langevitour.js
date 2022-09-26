HTMLWidgets.widget({
    name: 'langevitour',
    type: 'output',
    factory: function(el, width, height) {
        let tour = new langevitour.Langevitour(el, width, height);
        
        // Support for crosstalk
        let ctSel = null;
        let ctFilter = null;
        let ctKey = [ ];
        function update() {
            let state = { };
            if (!ctSel || !ctSel.value || ctSel.value.length==0) {
                state.selection = null;
            } else {            
                let selSet = new Set(ctSel.value);
                state.selection = ctKey.map(item => selSet.has(item));
            }

            if (!ctFilter || !ctFilter.filteredKeys || ctFilter.filteredKeys.length==0) {
                state.filter = null;
            } else {
                let filterSet = new Set(ctFilter.filteredKeys);
                state.filter = ctKey.map(item => filterSet.has(item));
            }
            
            tour.setState(state);
        }
        
        return {
            renderValue: function(data) {
                tour.renderValue(data);
                
                if (ctSel) {
                    ctSel.close();
                    ctSel = null;
                }
                
                if (ctFilter) {
                    ctFilter.close();
                    ctFilter = null;
                }
                
                if (data.crosstalkGroup) {
                    ctKey = data.crosstalkKey;
                    ctSel = new crosstalk.SelectionHandle();
                    ctSel.setGroup(data.crosstalkGroup);
                    ctSel.on("change", update);
                    
                    ctFilter = new crosstalk.FilterHandle();
                    ctFilter.setGroup(data.crosstalkGroup);
                    ctFilter.on("change", update);
                    
                    update();
                }
            },
            resize: function(width, height) {
                tour.resize(width, height);
            }
        };
    }
});
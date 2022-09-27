HTMLWidgets.widget({
    name: 'langevitour',
    type: 'output',
    factory: function(el, width, height) {
        let tour = new langevitour.Langevitour(el, width, height);
        
        // Support for crosstalk
        let ctSel = null;
        let ctFilter = null;
        let ctKey = [ ];
        let lastLevelActive = null;
        
        function updateIn() {
            let state = { };
            if (!ctSel || !ctSel.value || ctSel.value.length==0) {
                state.selection = null;
            } else {            
                let selSet = new Set(ctSel.value);
                state.selection = ctKey.map(item => selSet.has(item));
            }

            if (!ctFilter || !ctFilter.filteredKeys) {
                state.filter = null;
            } else {
                let filterSet = new Set(ctFilter.filteredKeys);
                state.filter = ctKey.map(item => filterSet.has(item));
            }
            
            tour.setState(state);
        }
        
        function updateOut() {
            if (!ctFilter) 
                return;
            
            let levelActive = Array(tour.levels.length).fill(true);
            for(let item of tour.labelData)
                if (item.type == 'level')
                    levelActive[item.index] = item.active;
            
            // Check for change
            if (lastLevelActive && levelActive.every((item,i) => item == lastLevelActive[i])) {
                //console.log("unchanged");
                return;
            }
            
            lastLevelActive = levelActive;
            
            // No filter if all active.
            if (levelActive.every(Boolean)) {
                ctFilter.clear();
                return;
            }
            
            let myFilter = [ ];
            for(let i=0;i<ctKey.length;i++)
                if (levelActive[tour.group[tour.unpermutor[i]]]) // Yikes.
                    myFilter.push(ctKey[i]);
            
            ctFilter.set(myFilter);
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
                
                lastLevelActive = null;
                
                if (data.crosstalkGroup) {
                    ctKey = data.crosstalkKey;
                    ctSel = new crosstalk.SelectionHandle();
                    ctSel.setGroup(data.crosstalkGroup);
                    ctSel.on("change", updateIn);
                    
                    ctFilter = new crosstalk.FilterHandle();
                    ctFilter.setGroup(data.crosstalkGroup);
                    ctFilter.on("change", updateIn);
                    tour.addEventListener("change", updateOut);
                    
                    updateOut();
                    updateIn();
                }
            },
            resize: function(width, height) {
                tour.resize(width, height);
            }
        };
    }
});
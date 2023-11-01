HTMLWidgets.widget({
    name: 'langevitour',
    type: 'output',
    factory: function(el, width, height) {
        // Supplied width and height are based on getBoundingClientRect.
        // Wrong eg when using revealjs and slide is scaled.
        //let trustSize = () => {
        //    let rect = el.getBoundingClientRect();
        //    return rect.width == el.offsetWidth && rect.height == el.offsetHeight;
        //};
        
        // May as will just never trust the width and height we are given.
        //if (!trustSize()) {
        width = el.offsetWidth;
        height = el.offsetHeight;
        //}
        
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
        
        function updateOutFilter() {
            if (!ctFilter) 
                return;
            
            let levelActive = Array(tour.levels.length).fill(true);
            for(let item of tour.labelData)
                if (item.type == 'level')
                    levelActive[item.index] = item.active;
            
            // Check for change
            if (lastLevelActive && levelActive.every((item,i) => item == lastLevelActive[i]))
                return;
            
            lastLevelActive = levelActive;
            
            // No filter if all active.
            if (levelActive.every(Boolean)) {
                ctFilter.clear();
                return;
            }
            
            let myFilter = [ ];
            for(let i=0;i<tour.n;i++)
                if (levelActive[tour.group[tour.unpermutor[i]]]) // Yikes.
                    myFilter.push(ctKey[i]);
            
            ctFilter.set(myFilter);
        }
        
        function updateOutSelection() {
            if (!ctSel) return;
            
            let currentSet = new Set(ctSel.value || []);
            
            let wanted = [ ];
            let mismatch = false;
            if (tour.selection) {
                for(let i=0;i<tour.n;i++) {
                    let j = tour.unpermutor[i]; // Yikes.
                    let want = tour.selection[j];
                    let have = currentSet.has(ctKey[i]);
                    if (want != have)
                        mismatch = true;
                    if (want)
                        wanted.push(ctKey[i]);
                }
                
                // Abort if no mismatches.
                if (!mismatch)
                    return;
            }
            
            if (wanted.length == 0)
                ctSel.set(null);
            else
                ctSel.set(wanted);
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
                    tour.addEventListener("changeSelection", updateOutSelection);
                    
                    if (data.crosstalkWantFilter) {
                        ctFilter = new crosstalk.FilterHandle();
                        ctFilter.setGroup(data.crosstalkGroup);
                        ctFilter.on("change", updateIn);
                        tour.addEventListener("changeFilter", updateOutFilter);
                    }
                    
                    updateOutFilter();
                    updateIn();
                    updateOutSelection();
                }
            },
            resize: function(width, height) {
                // Supplied width and height are based on getBoundingClientRect.
                // Wrong eg when using revealjs and slide is scaled.
                // Spurious events also happen if we are full screen.
                if (tour.fullscreen || document.fullscreenElement)
                    return;
                
                // May as will just never trust the width and height we are given.
                //if (!trustSize()) {
                width = el.offsetWidth;
                height = el.offsetHeight;
                //}
                
                tour.resize(width, height);
            }
        };
    }
});
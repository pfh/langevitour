HTMLWidgets.widget({
    name: 'langevitour',
    type: 'output',
    factory: function(el, width, height) {
        let tour = new langevitour.Langevitour(el, width, height);
        
        let ctSel = null;
        let ctKey = [ ];
        function updateSel() {
            if (!ctSel || !ctSel.value || ctSel.value.length==0) {
                tour.setState({selection:null});
                return;
            }
            
            let selSet = new Set(ctSel.value);
            tour.setState({selection: ctKey.map(item => selSet.has(item))});
        }
        
        return {
            renderValue: function(data) {
                tour.renderValue(data);
                
                if (ctSel) {
                    ctSel.close();
                    ctSel = null;
                }
                
                if (data.crosstalkGroup) {
                    ctKey = data.crosstalkKey;
                    ctSel = new crosstalk.SelectionHandle();
                    ctSel.setGroup(data.crosstalkGroup);
                    ctSel.on("change", updateSel);
                    updateSel();
                }
            },
            resize: function(width, height) {
                tour.resize(width, height);
            }
        };
    }
});
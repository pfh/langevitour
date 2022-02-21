HTMLWidgets.widget({
  name: 'langevitour',
  type: 'output',
  factory: function(el, width, height) {
    let tour = new langevitour.Langevitour(el, width, height);
    return {
      renderValue: function(data) {
        tour.renderValue(data);
      },
      resize: function(width, height) {
        tour.resize(width, height);
      }
    };
  }
});
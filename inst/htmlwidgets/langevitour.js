HTMLWidgets.widget({
  name: 'langevitour',
  type: 'output',
  factory: function(el, width, height) {
    let tour = new Langevitour(el, width, height);
    return {
      renderValue: function(X) {
        tour.render_value(X);
      },
      resize: function(width, height) {
        tour.resize(width, height);
      }
    };
  }
});
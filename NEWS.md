
# langevitour 0.8.0

* Option to disable controls.
* In R interface, link_filter argument renamed to linkFilter because what was I even thinking?

# langevitour 0.7

* Refine full-screen and sizing logic.
* Default colorVariation seemed a bit much, reduced to 0.1.
* pointSize can now be specified per-point.

# langevitour 0.6

* Use TypeScript and webpack.
* Support crosstalk.
* Interface revamp.
* Avoid rare divide by zero.
* Line colors.
* Ignore width and height provided by htmlwidgets, as this is wrong when the widget is scaled using a transformation (happens in revealjs presentations).
* Directly manipulate projection with ctrl+drag.
* Python package.

# langevitour 0.5

* Improved widget visibilty detection, should work in slideshows.
* Hopefully fix weird shrinkage on resizing.
* Crisp HiDPI and zoomed drawing.
* Now call point repulsions "guide", new guides added.
* Reduce default damping.
* Add input checking.
* Hidden groups now completely hidden.
* Hidden groups hidden from legend.
* Faster rug drawing.

# langevitour 0.4

* Fix README.md, remove redundant brackets.

# langevitour 0.3

* Ability to get and set state with Javascript.
* Can now draw lines between points.
* Axis deactivation is now animated.
* Added ultralocal point repulsion.
* Level colors can be specified.
* Add knnDenoise function.

# langevitour 0.2

* Remove RNA-Seq example from CRAN package -- dependency not available on CRAN build servers.
* Enable use in Shiny.

# langevitour 0.1

* Ready for CRAN submission.

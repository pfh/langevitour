# langevitour

langevitour is an HTML widget that randomly tours projections of a high-dimensional dataset with an animated scatter-plot. The user can manipulate the plot to use specified axes, or turn on Guided Tour mode to perform [projection pursuit](https://en.wikipedia.org/wiki/Projection_pursuit), finding an informative projection of the data. Groups within the data can be hidden or shown, as can particular axes. Known projections of interest can be added as "extra axes" and also manipulated. The widget can be used from within R, or included in a self-contained Rmarkdown document, or a Shiny app, or used directly from Javascript.

langevitour is a twist on the "tour" concept from software such as [XGobi](http://lib.stat.cmu.edu/general/XGobi/), [GGobi](http://ggobi.org/), [tourr](http://ggobi.github.io/tourr/), [ferrn](https://huizezhang-sherry.github.io/ferrn/), [liminal](https://sa-lee.github.io/liminal/), [detourr](https://casperhart.github.io/detourr/index.html), [spinifex](https://nspyrison.github.io/spinifex/), and [loon.tour](https://great-northern-diver.github.io/loon.tourr/). The new element in langevitour is the use of [Langevin Dynamics](https://en.wikipedia.org/wiki/Langevin_dynamics) to generate the sequence of projections.

* useR! 2022 conference [slides](https://logarithmic.net/langevitour/2022-useR/) and [video (extended edition)](https://www.youtube.com/watch?v=vKv9P13UACw)

* [Javascript example](https://pfh.github.io/langevitour/example.html)
* [R examples](https://logarithmic.net/langevitour/articles/examples.html)

<br>

## R Installation

```{r}
# Released version
install.packages("langevitour")
```

```{r}
# Development version
remotes::install_github("pfh/langevitour")
```

## R usage

Example:

```{r}
library(langevitour)

data(zeiselPC)
langevitour(zeiselPC[,-1], zeiselPC$type)
```

* [R documentation.](https://logarithmic.net/langevitour/reference/)

<br>

## Javascript usage

* Get started by viewing source on [this example](https://pfh.github.io/langevitour/example.html).
* [Javascript documentation.](https://logarithmic.net/langevitour/jsdoc/Langevitour.html)

<br>

## Copyright

Langevitour is free software made available under the [MIT license](https://github.com/pfh/langevitour/blob/main/LICENSE.md). Included libraries [jStat](https://github.com/jstat/jstat) and [SVD-JS](https://github.com/danilosalvati/svd-js) are also provided under the MIT license. Included library [D3](https://github.com/d3/d3) is provided under the [ISC license](https://github.com/d3/d3/blob/main/LICENSE).
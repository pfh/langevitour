# langevitour

langevitour is an HTML widget that randomly tours projections of a high-dimensional dataset with an animated scatter-plot. The user can manipulate the plot to use specified axes, or turn on Guided Tour mode to perform [projection pursuit](https://en.wikipedia.org/wiki/Projection_pursuit), finding an informative projection of the data. Groups within the data can be hidden or shown, as can particular axes. Known projections of interest can be added as "extra axes" and also manipulated. The widget can be used from within R, or included in a self-contained Rmarkdown document, or a Shiny app, or used directly from Javascript.

<a href="https://logarithmic.net/langevitour/2022-abacbs/" style="display: block; margin: 5px; border: 1px solid #000; float: right">
<img src="https://logarithmic.net/langevitour/2022-abacbs/abacbs-langevitour-poster-2022-small.png" width=300>
</a>

langevitour is a twist on the "tour" concept from software such as [XGobi](http://lib.stat.cmu.edu/general/XGobi/), [GGobi](http://ggobi.org/), [tourr](http://ggobi.github.io/tourr/), [ferrn](https://huizezhang-sherry.github.io/ferrn/), [liminal](https://sa-lee.github.io/liminal/), [detourr](https://casperhart.github.io/detourr/index.html), [spinifex](https://nspyrison.github.io/spinifex/), and [loon.tour](https://great-northern-diver.github.io/loon.tourr/). The new element in langevitour is the use of [Langevin Dynamics](https://en.wikipedia.org/wiki/Langevin_dynamics) to generate the sequence of projections.

* [Method description (bioRxiv pre-print)](https://www.biorxiv.org/content/10.1101/2022.08.24.505207v1)

* ABACBS Conference 2022 [poster (large image)](https://logarithmic.net/langevitour/2022-abacbs/abacbs-langevitour-poster-2022.png) and [demo](https://logarithmic.net/langevitour/2022-abacbs/)

* ABACBS Seminar 2022 [slides](https://logarithmic.net/langevitour/2022-09-abacbs/)

* useR! 2022 conference [slides](https://logarithmic.net/langevitour/2022-useR/) and [video (extended edition)](https://www.youtube.com/watch?v=vKv9P13UACw)

* [R examples](https://logarithmic.net/langevitour/articles/examples.html)

* [Javascript example](https://pfh.github.io/langevitour/example.html)

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
* [Javascript documentation.](https://logarithmic.net/langevitour/jsdoc/)

langevitour can be added to a project using `npm` with:

```
npm install pfh/langevitour
```

Please tell me if you run into any problems using this, I am new to Javascript development. The webpacked version can be found in `inst/htmlwidgets/lib/langevitour-pack.js`.

<br>

## Copyright

Langevitour is free software made available under the [MIT license](https://github.com/pfh/langevitour/blob/main/LICENSE.md). Included libraries [jStat](https://github.com/jstat/jstat) and [SVD-JS](https://github.com/danilosalvati/svd-js) are also provided under the MIT license. Included library [D3](https://github.com/d3/d3) is provided under the [ISC license](https://github.com/d3/d3/blob/main/LICENSE).
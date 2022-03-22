# langevitour

[Langevin dynamics](https://en.wikipedia.org/wiki/Langevin_dynamics) based tours of numerical data-sets. langevitour is a twist on the "tour" concept from software such as [GGobi](http://ggobi.org/), [tourr](http://ggobi.github.io/tourr/), [liminal](https://sa-lee.github.io/liminal/), and [detourr](https://casperhart.github.io/detourr/index.html). Projections of the data are explored using Brownian motion with momentum. A drag-and-drop interface allows you to focus in on projections of particular variables or to specify the placement of particular groups of points. langevitour can also [pursue a projection](https://en.wikipedia.org/wiki/Projection_pursuit) that provides a good overview of the data.

* [Javascript example](https://pfh.github.io/langevitour/example.html)
* [R examples](https://logarithmic.net/langevitour/articles/examples.html)


## R Installation

```{r}
install.packages("langevitour")
```


## R usage

Example:

```{r}
library(langevitour)

data(zeiselPC)
langevitour(zeiselPC[,-1], zeiselPC$type)
```

* [R documentation.](https://logarithmic.net/langevitour/reference/)


## Javascript usage

* Get started by viewing source on [this example](https://pfh.github.io/langevitour/example.html).
* [Javascript documentation.](https://logarithmic.net/langevitour/jsdoc/Langevitour.html)


## Copyright

Langevitour is free software made available under the [MIT license](https://github.com/pfh/langevitour/blob/main/LICENSE.md). Included libraries [jStat](https://github.com/jstat/jstat) and [SVD-JS](https://github.com/danilosalvati/svd-js) are also provided under the MIT license. Included library [D3](https://github.com/d3/d3) is provided under the [ISC license](https://github.com/d3/d3/blob/main/LICENSE).
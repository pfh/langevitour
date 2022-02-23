# langevitour

[Langevin dynamics](https://en.wikipedia.org/wiki/Langevin_dynamics) based tours of numerical data-sets. langevitour is a twist on the "tour" concept from software such as [GGobi](http://ggobi.org/), [tourr](http://ggobi.github.io/tourr/), [liminal](https://sa-lee.github.io/liminal/), and [detourr](https://casperhart.github.io/detourr/index.html). Projections of the data are explored using Brownian motion with momentum. A drag-and-drop interface allows you to focus in on projections of particular variables or to specify the placement of particular groups of points. langevitour can also [pursue a projection](https://en.wikipedia.org/wiki/Projection_pursuit) that provides a good overview of the data.

* [Javascript example](https://pfh.github.io/langevitour/example.html)
* [R examples](https://logarithmic.net/langevitour/articles/examples.html)

## R Installation

```{r}
install.packages("remotes")

remotes::install_github("pfh/langevitour")
```

## R example usage

```{r}
langevitour(iris[,1:4], iris$Species)
```


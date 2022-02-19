# langevitour

Under development but basically usable. Langevin dynamics based tours of data. Javascript with R wrapper. A twist on the "tour" concept from software such as [GGobi](http://ggobi.org/), [tourr](http://ggobi.github.io/tourr/), [liminal](https://sa-lee.github.io/liminal/).

* [Javascript example](https://pfh.github.io/langevitour/example.html)
* [R examples](https://logarithmic.net/langevitour/examples.html)

## R Installation

```{r}
install.packages("remotes")

remotes::install_github("pfh/langevitour")
```

## R example usage

```{r}
# Install some packages with interesting data
install.packages(c("geozoo", "tourr", "liminal"))


library(langevitour)


langevitour(iris[,1:4], iris$Species)


langevitour(liminal::fake_trees[,1:100], liminal::fake_trees$branches)
# - be sure to try "point repulsion" in this example


langevitour(geozoo::torus.flat(p=4)$points)


langevitour(tourr::flea[,1:6], tourr::flea$species)


langevitour(scale(tourr::olive[,3:10]), paste(tourr::olive$region, tourr::olive$area))


X <- as.matrix(liminal::pdfsense[,-(1:6)])
X <- X / sqrt(rowMeans(X*X))
langevitour(X, liminal::pdfsense$Type)
```


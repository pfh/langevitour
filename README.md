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
langevitour(iris[,1:4], iris$Species)
```


# langevitour
Under development. Langevin dynamics based Tours of data, in Javascript with R wrapper.

```
system('make') ; devtools::load_all() ; langevitour(iris[,1:4], iris$Species)

devtools::load_all() ; langevitour(liminal::fake_trees[,1:100], liminal::fake_trees$branches)


devtools::load_all() ; langevitour(geozoo::cube.dotline(6)$points)

devtools::load_all() ; langevitour(geozoo::torus.flat(p=4)$points)

langevitour(scale(tourr::flea[,1:6], scale=FALSE), tourr::flea$species)

langevitour(scale(tourr::olive[,3:10]), paste(tourr::olive$region, tourr::olive$area))

devtools::load_all() ; langevitour(liminal::pdfsense[,-(1:6)], liminal::pdfsense$Type, scale=1.5)


X <- as.matrix(liminal::pdfsense[,-(1:6)])
X <- X / sqrt(rowMeans(X*X))
langevitour(X, liminal::pdfsense$Type)
```


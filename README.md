# langevitour
Under development. Langevin dynamics based Tours of data, in Javascript with R wrapper.

```
devtools::load_all() ; langevitour(scale(iris[,1:4]), iris$Species)

devtools::load_all() ; langevitour(scale(liminal::fake_trees[,1:100]), liminal::fake_trees$branches)

devtools::load_all() ; langevitour(scale( geozoo::cube.dotline(5)$points ))

devtools::load_all() ; langevitour(scale( geozoo::torus.flat(p=5)$points ))
```

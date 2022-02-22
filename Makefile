
.PHONY : all copy docs document install

all: copy document docs

document:
	R -e 'devtools::document()'

copy: 
	cp langevitour.js inst/htmlwidgets/lib/ 

docs:
	R -e 'pkgdown::build_site()'

install:
	R -e 'devtools::install()'


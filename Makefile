
.PHONY : all copy docs document install

all: copy document docs

document: copy
	R -e 'devtools::document()'

copy: 
	cp langevitour.js inst/htmlwidgets/lib/ 

docs: copy document
	R -e 'pkgdown::build_site()'

install:
	R -e 'devtools::install()'


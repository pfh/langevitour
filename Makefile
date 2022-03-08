
.PHONY : all copy docs jsdoc document install quick-install

all: copy jsdoc document docs

document: copy
	R -e 'devtools::document()'

copy: 
	cp langevitour.js inst/htmlwidgets/lib/ 

docs: copy document
	R -e 'pkgdown::build_site()'

jsdoc:
	jsdoc langevitour.js -d docs/jsdoc

install: copy
	R -e 'devtools::install()'

quick-install: copy
	R -e 'devtools::install(quick=T)'

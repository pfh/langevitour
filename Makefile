
.PHONY : all document install

all: inst/htmlwidgets/lib/langevitour.js document

document:
	R -e 'devtools::document()'

inst/htmlwidgets/lib/langevitour.js: langevitour.js
	cp langevitour.js inst/htmlwidgets/lib/ 

install:
	R -e 'devtools::install()'

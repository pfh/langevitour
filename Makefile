
.PHONY : all copy document install

all: copy document

document:
	R -e 'devtools::document()'

copy: 
	cp langevitour.js inst/htmlwidgets/lib/ 

install:
	R -e 'devtools::install()'

% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/data.R
\docType{data}
\name{zeiselPC}
\alias{zeiselPC}
\title{Principal components of scRNA-Seq of mouse brain cells}
\format{
A data frame with 2,816 rows representing brain cells and 11 columns:
\describe{
\item{type}{Cell type.}
\item{PC1}{Principal component score.}
\item{PC2}{Principal component score.}
\item{PC3}{Principal component score.}
\item{PC4}{Principal component score.}
\item{PC5}{Principal component score.}
\item{PC6}{Principal component score.}
\item{PC7}{Principal component score.}
\item{PC8}{Principal component score.}
\item{PC9}{Principal component score.}
\item{PC10}{Principal component score.}
}
}
\usage{
data(zeiselPC)
}
\description{
Single-cell RNA-Seq gene expression of 2,816 mouse brain cells (Zeisel, 2015). The top 10 principal components were produced using the steps in the \href{https://bioconductor.org/books/3.13/OSCA.workflows/zeisel-mouse-brain-strt-seq.html}{Bioconductor OSCA workflow}.
}
\examples{
data(zeiselPC)
langevitour(zeiselPC[,-1], zeiselPC$type)

}
\references{
Zeisel, A., Muñoz-Manchado, A. B., Codeluppi, S., Lönnerberg, P., La Manno, G., Juréus, A., Marques, S., Munguba, H., He, L., Betsholtz, C., Rolny, C., Castelo-Branco, G., Hjerling-Leffler, J., & Linnarsson, S. (2015). Cell types in the mouse cortex and hippocampus revealed by single-cell RNA-seq. \emph{Science}, 347(6226), 1138–1142. \doi{10.1126/science.aaa1934}
}
\keyword{datasets}

% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/denoise.R
\name{knnDenoise}
\alias{knnDenoise}
\title{k-nearest neighbor denoising of a set of points}
\usage{
knnDenoise(X, block = rep(1, nrow(X)), k = 30, steps = 2)
}
\arguments{
\item{X}{A matrix of numeric data, or something that can be cast to a matrix. Each row represents a point.}

\item{block}{Optional. A block for each row in X. A factor, or something that can be cast to a factor. Denoising will be performed independently within each block.}

\item{k}{Number of nearest neighbors to find around each point (including itself).}

\item{steps}{Number of steps to take along the directed k-nearest neighbor graph. \code{steps=1} uses the k-nearest neighbors, \code{steps=2} uses the k-nearest neighbors and their k-nearest neighbors, etc.}
}
\description{
Reduce noise in a high-dimensional dataset by averaging each point with its nearby neighbors.
}
\details{
\code{knnDenoise} first finds the \code{k}-nearest neighbors to each point (including the point itself). Then, for each point, the average is found of the points reachable in \code{steps} steps along the directed k-nearest neighbor graph.
}
\examples{
library(palmerpenguins)

completePenguins <- na.omit(penguins[,c(1,3,4,5,6)])

# Dimensions need to be on comparable scales to apply knnDenoise
scaled <- scale(completePenguins[,-1])

denoised <- knnDenoise(scaled)

langevitour(denoised, completePenguins$species, pointSize=2)

}

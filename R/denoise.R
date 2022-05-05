

# This code involves a lot of messy conversion between matrices and lists of vectors.
#
# There is certainly room for optimization.

# Undo asplit(), convert a list of vectors to a matrix.
aunsplit <- function(vecList) {
    do.call(rbind, vecList)
}

# Denoise a list of vectors
knnDenoiseVecList <- function(vecList, k, steps) {
    n <- length(vecList)
    X <- aunsplit(vecList)

    neighbors <- RANN::nn2(X, k=k)$nn.idx
    neighbors <- asplit(neighbors, 1)

    lapply(seq_len(n), function(reachable) {
        for(i in seq_len(steps))
            reachable <- unique(unlist(neighbors[reachable]))
        colMeans(X[reachable,,drop=FALSE])
    })
}


#' k-nearest neighbor denoising of a set of points
#'
#' Reduce noise in a high-dimensional dataset by averaging each point with its nearby neighbors.
#'
#' \code{knnDenoise} first finds the \code{k}-nearest neighbors to each point (including the point itself). Then, for each point, the average is found of the points reachable in \code{steps} steps along the directed k-nearest neighbor graph.
#'
#' @param X A matrix of numeric data, or something that can be cast to a matrix. Each row represents a point.
#'
#' @param block Optional. A block for each row in X. A factor, or something that can be cast to a factor. Denoising will be performed independently within each block.
#'
#' @param k Number of nearest neighbors to find around each point (including itself).
#'
#' @param steps Number of steps to take along the directed k-nearest neighbor graph. \code{steps=1} uses the k-nearest neighbors, \code{steps=2} uses the k-nearest neighbors and their k-nearest neighbors, etc. 
#'
#' @examples
#' library(palmerpenguins)
#' 
#' completePenguins <- na.omit(penguins[,c(1,3,4,5,6)])
#'
#' # Dimensions need to be on comparable scales to apply knnDenoise
#' scaled <- scale(completePenguins[,-1])
#'
#' denoised <- knnDenoise(scaled)
#' 
#' langevitour(denoised, completePenguins$species, pointSize=2)
#'
#' @export
knnDenoise <- function(X, block=rep(1,nrow(X)), k=30, steps=2) {
    X <- as.matrix(X)
    vecList <- asplit(X, 1)

    parts <- split(vecList, block)
    partsDenoised <- lapply(parts, knnDenoiseVecList, k=k, steps=steps)

    aunsplit(unsplit(partsDenoised, block))
}



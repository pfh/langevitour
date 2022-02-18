#' Langevin Tour
#'
#' Create a Langevin Tour HTML widget. Can be used, for example, from the console or in an RMarkdown document.
#'
#' @import htmlwidgets
#'
#' @export
langevitour <- function(X, groups = NULL, width = NULL, height = NULL, elementId = NULL) {
    X <- as.matrix(X)
    
    if (is.null(colnames(X)))
        colnames(X) <- paste0("V", seq_len(ncol(X)))

    if (is.null(rownames(X)))
        rownames(X) <- paste0("R", seq_len(nrow(X)))
    
    if (is.null(groups))
        groups <- rep("", nrow(X))
    
    groups <- as.factor(groups)

    data <- list(
        X = X,
        colnames = as.list(colnames(X)),
        rownames = as.list(rownames(X)),
        groups = as.list(as.integer(groups)-1),
        levels = as.list(levels(groups)))
    
    htmlwidgets::createWidget(
        name = 'langevitour',
        data,
        width = width,
        height = height,
        package = 'langevitour',
        elementId = elementId)
}

##' Shiny bindings for langevitour
##'
##' Output and render functions for using langevitour within Shiny
##' applications and interactive Rmd documents.
##'
##' @param outputId output variable to read from
##' @param width,height Must be a valid CSS unit (like \code{'100\%'},
##'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
##'   string and have \code{'px'} appended.
##' @param expr An expression that generates a langevitour
##' @param env The environment in which to evaluate \code{expr}.
##' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
##'   is useful if you want to save an expression in a variable.
##'
##' @name langevitour-shiny
##'
##' @export
#langevitourOutput <- function(outputId, width = '100%', height = '400px'){
#  htmlwidgets::shinyWidgetOutput(outputId, 'langevitour', width, height, package = 'langevitour')
#}

##' @rdname langevitour-shiny
##' @export
#renderLangevitour <- function(expr, env = parent.frame(), quoted = FALSE) {
#  if (!quoted) { expr <- substitute(expr) } # force quoted
#  htmlwidgets::shinyRenderWidget(expr, langevitourOutput, env, quoted = TRUE)
#}

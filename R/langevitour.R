#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets
#'
#' @export
langevitour <- function(X, width = NULL, height = NULL, elementId = NULL) {

  # forward options using x
  x = list(
    X = X
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'langevitour',
    x,
    width = width,
    height = height,
    package = 'langevitour',
    elementId = elementId
  )
}

#' Shiny bindings for langevitour
#'
#' Output and render functions for using langevitour within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a langevitour
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name langevitour-shiny
#'
#' @export
langevitourOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'langevitour', width, height, package = 'langevitour')
}

#' @rdname langevitour-shiny
#' @export
renderLangevitour <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, langevitourOutput, env, quoted = TRUE)
}

#' Langevin Tour
#'
#' Make a Langevin Tour HTML widget, which can be used to explore high-dimensional numeric datasets.
#'
#' To retain the original units on plot axes within the widget, use \code{center} and \code{scale} rather than altering X.
#'
#' langevitour will by default not scale variables individually. If you want this, use something like \code{scale=apply(X,2,sd)*4}.
#'
#' @param X The data to plot. A matrix of numeric data, or something that can be cast to a matrix. Rows will be shown as points in the widget. Columns are the variables of your data.
#'
#' @param group A group for each row in X, will be used to color points. A factor, or something that can be cast to a factor.
#'
#' @param name A name for each row in X.
#'
#' @param center Center for each variable. If omitted, the column means will be used.
#'
#' @param scale Scale for each variable. Scale +/- center will be the range of guaranteed visible data. If omitted, a reasonable default will be chosen, equal for all variables. (The default is the largest singular value of the centered X times 2.5.)
#'
#' @param extraAxes A matrix with each column defining a projection of interest. The columns of \code{X \%*\% extraAxes} will be presented as extra "variables".
#'
#' @param axisColors Character vector. Colors for each variable and then each extra axis.
#'
#' @param pointSize Point radius in pixels.
#'
#' @param width Width of widget.
#'
#' @param height Height of widget.
#'
#' @param elementId An element ID for the widget, see htmlwidgets::createWidget.
#'
#' @return An htmlwidget object.
#'
#' @examples
#' library(palmerpenguins)
#' 
#' completePenguins <- na.omit(penguins[,c(1,3,4,5,6)])
#' scale <- apply(completePenguins[,-1], 2, sd)*4
#' 
#' langevitour(
#'     completePenguins[,-1], 
#'     completePenguins$species, 
#'     scale=scale, pointSize=2)
#'
#' @import htmlwidgets
#'
#' @export
langevitour <- function(
        X, group=NULL, name=NULL, center=NULL, scale=NULL, 
        extraAxes=NULL, axisColors=NULL, pointSize=1,
        width=NULL, height=NULL, elementId=NULL) {

    X <- as.matrix(X)
    
    if (is.null(colnames(X)))
        colnames(X) <- paste0("V", seq_len(ncol(X)))
    
    if (is.null(group))
        group <- rep("", nrow(X))
    
    group <- as.factor(group)
    
    # Centering
    
    if (is.null(center))
        center <- colMeans(X, na.rm=TRUE)
    if (length(center) == 1)
        center <- rep(ncol(X), center)
        
    X_centered <- sweep(X, 2, center, "-")
    
    # Scaling
    
    # Potentially expensive
    if (is.null(scale))
        scale <- max(svd(X_centered)$d) / sqrt(nrow(X)) * 2.5
    if (length(scale) == 1)
        scale <- rep(scale, ncol(X))
        
    X_centered_scaled <- sweep(X_centered, 2, scale, "/")
    
    # Extra axes
    
    extraAxesCenter <- NULL
    
    if (!is.null(extraAxes)) {
        extraAxes <- as.matrix(extraAxes)
        extraAxesCenter <- as.vector(rbind(center) %*% extraAxes)
        extraAxes <- sweep(extraAxes, 1, scale, "*")
        
        if (is.null(colnames(extraAxes)))
            colnames(extraAxes) <- paste0("E", seq_len(ncol(extraAxes)))
    }
    
    rownames(X_centered_scaled) <- NULL
    colnames(X_centered_scaled) <- NULL
    names(center) <- NULL
    names(scale) <- NULL
    names(group) <- NULL
    
    data <- list(
        X = X_centered_scaled,
        center = as.list(as.numeric(center)),
        scale = as.list(as.numeric(scale)),
        colnames = as.list(colnames(X)),
        rownames = as.list(as.character(name)),
        group = as.list(as.integer(group)-1),
        levels = as.list(levels(group)),
        
        extraAxes = extraAxes,
        extraAxesCenter = as.list(as.numeric(extraAxesCenter)),
        extraAxesNames = as.list(colnames(extraAxes)),
        
        axisColors=as.list(as.character(axisColors)),
        pointSize=as.numeric(pointSize))
    
    htmlwidgets::createWidget(
        name = 'langevitour',
        data,
        width = width,
        height = height,
        package = 'langevitour',
        elementId = elementId,
        sizingPolicy = htmlwidgets::sizingPolicy(
            defaultWidth = 700,
            defaultHeight = 600,
            viewer.padding = 5,
            browser.fill = TRUE,
            knitr.figure = FALSE
        )
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
#' @param expr An expression that generates a langevitour, usually a block of code ending with a call to \code{langevitour()}
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name langevitour-shiny
#'
#' @examples
#' 
#' library(shiny)
#' library(palmerpenguins)
#' 
#' completePenguins <- na.omit(penguins[,c(1,3,4,5,6)])
#' scale <- apply(completePenguins[,-1], 2, sd)*4
#' 
#' ui <- fluidPage(
#'     sliderInput('zoom', 'Zoom', 0, min=-1, max=1, step=0.1),
#'     langevitourOutput('widget')
#' )
#' 
#' server <- function(input,output) { 
#'     output$widget <- renderLangevitour({
#'         langevitour(
#'             completePenguins[,-1], 
#'             completePenguins$species, 
#'             scale=scale * 10^input$zoom, pointSize=2)
#'     })
#' }
#' 
#' app <- shinyApp(ui, server)
#' 
#' # Use runApp(app) or runGadget(app) to run app.
#'
#' @export
langevitourOutput <- function(outputId, width = '100%', height = '600px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'langevitour', width, height, package = 'langevitour')
}

#' @rdname langevitour-shiny
#' @export
renderLangevitour <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, langevitourOutput, env, quoted = TRUE)
}

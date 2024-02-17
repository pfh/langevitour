#' Langevin Tour
#'
#' Make a Langevin Tour HTML widget, which can be used to explore high-dimensional numerical datasets.
#'
#' The only required argument is \code{X}, the high-dimensional collection of points. The \code{group} argument is also commonly used so that groups of points can be distinguished by color. Further arguments adjust the appearance or provide advanced features.
#'
#' langevitour will by default not scale variables individually. If you want variables to be individually scaled, use something like \code{scale=apply(X,2,sd)*4}. Using the \code{scale} argument rather than modifying \code{X} directly ensures the plot axes within the widgets retain the original units.
#'
#' In Javascript, the langevitour object can be obtained using \code{document.getElementById(elementId).langevitour}. For example you could have a button that sets the state of a widget using \code{document.getElementById(elementId).langevitour.setState(desiredState)}.
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
#' @param lineFrom A vector of row numbers. Draw lines starting at these rows.
#'
#' @param lineTo A vector of row numbers. Draw lines ending at these rows.
#'
#' @param lineColors Character vector. A CSS color for each line.
#'
#' @param axisColors Character vector. CSS colors for each variable and then each extra axis.
#'
#' @param levelColors Character vector. CSS colors for each level of \code{group}.
#'
#' @param colorVariation Number between 0 and 1. Individual points are given slightly different brightnesses. How strong should this effect be?
#'
#' @param pointSize Point radius in pixels. A single number, or a number for each row in X.
#'
#' @param subsample For speed, randomly subsample down to this many rows.
#'
#' @param state A JSON string, or an object that htmlwidgets will convert to the correct JSON. Initial widget state settings. The state of a widget can be obtained from its "further controls and information" pane. I am not going to guarantee that states will be compatible between versions of langevitour. Hint: Since JSON uses double quotes, surround the string in single quotes.
#'
#' @param width Width of widget in CSS units, for example "700px" or "100%".
#'
#' @param height Height of widget in CSS units, for example "600px" or "75vh".
#'
#' @param elementId An element ID for the widget, see \code{htmlwidgets::createWidget}.
#'
#' @param link A SharedData object from the crosstalk package to share selections and filters with other htmlwidgets. The data in this object is not used, just the keys and group name. The rows of \code{link$origData()} should correspond to the rows of X.
#'
#' @param link_filter TRUE or FALSE. If using crosstalk, should hiding groups in langevitour also cause them to be filtered in linked widgets?
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
#'
#' # An example setting the widget's initial state
#'  
#' langevitour(
#'     completePenguins[,-1], 
#'     completePenguins$species, 
#'     scale=scale, pointSize=2,
#'     state='{"guideType":"pca","labelInactive":["bill_length_mm"]}')
#'
#' @export
langevitour <- function(
        X, group=NULL, name=NULL, center=NULL, scale=NULL, 
        extraAxes=NULL, lineFrom=NULL, lineTo=NULL, lineColors=NULL,
        axisColors=NULL, levelColors=NULL, colorVariation=0.1, pointSize=1, subsample=NULL, 
        state=NULL, width=NULL, height=NULL, elementId=NULL,
        link=NULL, link_filter=TRUE) {
    
    # Ensure data is matrix
    
    X <- as.matrix(X)
    
    columnNames <- colnames(X)
    colnames(X) <- NULL
    rownames(X) <- NULL
    
    if (is.null(columnNames))
        columnNames <- paste0("V", seq_len(ncol(X)))
    
    
    # Grouping
    
    if (is.null(group))
        group <- rep("", nrow(X))
    
    names(group) <- NULL
    
    group <- as.factor(group)
    
    
    # Check for crosstalk to allow linked selections
    crosstalkGroup <- NULL
    crosstalkKey <- NULL
    dependencies <- NULL
    
    if (!is.null(link)) {
        assertthat::assert_that(crosstalk::is.SharedData(link))
        dependencies <- crosstalk::crosstalkLibs()
        crosstalkGroup <- link$groupName()
        crosstalkKey <- link$key()
    }
    
    assertthat::assert_that( assertthat::is.flag(link_filter) )
    
    
    # Check for problems (not exhaustive!)
    
    assertthat::assert_that( 
        ncol(X) >= 2,
        length(columnNames) == ncol(X),
        length(group) == nrow(X),
        length(pointSize) == 1 || length(pointSize) == nrow(X),
        is.null(name) || length(name) == nrow(X),
        length(lineFrom) == length(lineTo),
        is.null(lineColors) || length(lineColors) == length(lineFrom),
        all(lineFrom >= 1), 
        all(lineTo >= 1), 
        all(lineFrom <= nrow(X)), 
        all(lineTo <= nrow(X)),
        assertthat::noNA(X),
        assertthat::noNA(group),
        assertthat::noNA(name),
        assertthat::noNA(lineFrom),
        assertthat::noNA(lineTo))
    
    
    # Centering
    
    if (is.null(center))
        center <- colMeans(X, na.rm=TRUE)
    if (length(center) == 1)
        center <- rep(ncol(X), center)
    
    names(center) <- NULL
    
    assertthat::assert_that( length(center) == ncol(X) )
    
    
    # Scaling
    
    # Potentially expensive
    if (is.null(scale)) {
        X_centered <- sweep(X,2,center,"-")
        scale <- max(svd(X_centered)$d) / sqrt(nrow(X)) * 2.5
    }
    
    if (length(scale) == 1)
        scale <- rep(scale, ncol(X))
    
    names(scale) <- NULL
    
    assertthat::assert_that( length(scale) == ncol(X) )
    
    
    # Extra axes
    
    if (!is.null(extraAxes)) {
        extraAxes <- as.matrix(extraAxes)
    
        assertthat::assert_that( assertthat::noNA(extraAxes) )
        assertthat::assert_that( nrow(extraAxes) == ncol(X) )
        
        if (is.null(colnames(extraAxes)))
            colnames(extraAxes) <- paste0("E", seq_len(ncol(extraAxes)))
    }
    
    
    # Subsampling
    
    if (!is.null(subsample) && subsample < nrow(X)) {
        ind <- sample.int(nrow(X), subsample)
        
        X <- X[ind,,drop=FALSE]
        
        group <- group[ind]
        
        if (!is.null(name))
            name <- name[ind]
        
        if (!is.null(crosstalkKey))
            crosstalkKey <- crosstalkKey[ind]
        
        if (!is.null(lineFrom)) {
            lineFrom <- match(lineFrom, ind)
            lineTo <- match(lineTo, ind)
            keep <- !is.na(lineFrom) & !is.na(lineTo)
            lineFrom <- lineFrom[keep]
            lineTo <- lineTo[keep]
        }
    }
    
    
    # Convert to form that will JSON-ify correctly
    #
    # htmlwidgets uses jsonlite::toJSON with auto_unbox=TRUE.
    # Numeric vectors of length one become numbers, not arrays.
    # I convert vectors to lists to prevent this.
    
    data <- list(
        X = X,
        center = as.list(as.numeric(center)),
        scale = as.list(as.numeric(scale)),
        colnames = as.list(columnNames),
        rownames = as.list(as.character(name)),
        group = as.list(as.integer(group)-1),
        levels = as.list(levels(group)),
        
        extraAxes = extraAxes,
        extraAxesNames = as.list(colnames(extraAxes)),
        
        # Convert from 1 based to 0 based indices
        lineFrom = as.list(as.numeric(lineFrom) - 1), 
        lineTo = as.list(as.numeric(lineTo) - 1),
        lineColors = as.list(as.character(lineColors)),
        
        axisColors=as.list(as.character(axisColors)),
        levelColors=as.list(as.character(levelColors)),
        colorVariation=as.numeric(colorVariation),
        pointSize=as.numeric(pointSize), # Javascript side can handle unboxing here (number|number[])
        
        crosstalkGroup=crosstalkGroup,
        crosstalkKey=crosstalkKey,
        crosstalkWantFilter=link_filter,
        
        state=state)
    
    
    htmlwidgets::createWidget(
        name = 'langevitour',
        x = data,
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
        ),
        dependencies = dependencies
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

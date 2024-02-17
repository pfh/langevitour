import json

import numpy as np
import pkg_resources
from numpy.linalg import svd

from langevitour.utils import as_factor


class Langevitour:
    """
    Langevin Tour class for creating an HTML widget to explore high-dimensional numerical datasets.

    This class provides an interface to visualize high-dimensional datasets using an interactive Langevin Tour widget.
    The main data argument is `data`, while other parameters allow customization of the visualization.

    Args:
        data (np.array): The primary dataset to plot. Rows represent points in the widget and columns represent data variables.
        group (list, optional): A grouping for each row in `data` to color points. Defaults to None.
        column_names (list[str], optional): Names for the data columns. Defaults to None.
        levels (list, optional): Specifies the levels if the group is not None. Defaults to unique values of the group.
        name (str, optional): A name for each row in `data`. Defaults to None.
        center (list, optional): Center for each variable. If omitted, column means are used.
        scale (list, optional): Scale +/- center to determine the range of visible data. Defaults to a standard value.
        extra_axes (np.array, optional): Columns defining projections of interest.
        extra_axes_names (list[str], optional): Names for the extra axes.
        line_from (list[int], optional): Row numbers indicating start of lines.
        line_to (list[int], optional): Row numbers indicating end of lines.
        line_colors (list[str], optional): CSS colors for each line.
        axis_colors (list[str], optional): CSS colors for each variable and extra axis.
        level_colors (list[str], optional): CSS colors for each level of `group`.
        color_variation (float, 0-1, optional): Brightness variation among individual points. Defaults to 0.3.
        point_size (float|list[float], optional): Point radius in pixels. Defaults to 1. A single value or a value for each point.
        subsample (int, optional): Randomly subsample to this many rows for speed. Defaults to None.
        state (str, optional): Initial widget state settings. Defaults to None.
        width (int, optional): Width of widget in pixels. Defaults to 700.
        height (int, optional): Height of widget in pixels. Defaults to 600.
        element_id (str, optional): A unique ID for the widget element. Defaults to None.

    Note:
        In JavaScript, the Langevitour object can be accessed using `document.getElementById(elementId).langevitour`.
        A button could, for example, set the widget state with `document.getElementById(elementId).langevitour.setState(desiredState)`.
    """

    def __init__(
        self,
        data,
        group=None,
        column_names=None,
        levels=None,
        name=None,
        center=None,
        scale=None,
        extra_axes=None,
        extra_axes_names=None,
        line_from=None,
        line_to=None,
        line_colors=None,
        axis_colors=None,
        level_colors=None,
        color_variation=0.1,
        point_size=1,
        subsample=None,
        state=None,
        width=700,
        height=600,
        element_id=None,
    ):
        if hasattr(data, "columns") and column_names is None:
            column_names = list(data.columns)

        # Ensure data is matrix
        data = np.array(data)
        if data.ndim != 2:
            msg = "data must be 2-dimensional."
            raise ValueError(msg)

        # Column names
        if column_names is None:
            column_names = [f"V{i+1}" for i in range(data.shape[1])]

        # Grouping
        if group is None:
            group = ["" for _ in range(data.shape[0])]
        else:
            group = list(map(str, group))

        group, group_levels = as_factor(group, levels)

        if levels is None:
            levels = group_levels

        # Centering
        if center is None:
            center = np.mean(data, axis=0)
        if len(center) == 1:
            center = [center[0] for _ in range(data.shape[1])]

        # Scaling
        if scale is None:
            data_centered = data - center
            scale = max(svd(data_centered, compute_uv=False)) / np.sqrt(data.shape[0]) * 2.5
        if np.isscalar(scale):
            scale = [scale for _ in range(data.shape[1])]

        # Check for problems
        if data.shape[1] < 2:
            msg = "The number of columns in data should be at least 2."
            raise ValueError(msg)

        if len(column_names) != data.shape[1]:
            msg = "Mismatch between number of column names and number of columns in data."
            raise ValueError(msg)

        if len(group) != data.shape[0]:
            msg = "Length of group does not match the number of rows in data."
            raise ValueError(msg)


        # Extra axes
        if extra_axes is not None:
            extra_axes = np.array(extra_axes)
            if extra_axes.shape[0] != data.shape[1]:
                msg = "The number of rows in extra_axes does not match the number of columns in data."
                raise ValueError(msg)
            if extra_axes_names is None:
                extra_axes_names = (
                    list(data.columns) if hasattr(data, "columns") else [f"E{i+1}" for i in range(extra_axes.shape[1])]
                )

        # Subsampling
        if subsample is not None and subsample < data.shape[0]:
            indices = np.random.choice(data.shape[0], subsample, replace=False)
            data = data[indices, :]
            group = [group[i] for i in indices]
            if name:
                name = [name[i] for i in indices]

        self.data = data
        self.group = group
        self.levels = levels
        self.name = name
        self.center = center
        self.scale = scale
        self.column_names = column_names
        self.extra_axes = extra_axes
        self.extra_axes_names = extra_axes_names
        self.line_from = line_from
        self.line_to = line_to
        self.line_colors = line_colors
        self.axis_colors = axis_colors
        self.level_colors = level_colors
        self.color_variation = color_variation
        self.point_size = point_size
        self.subsample = subsample
        self.state = state
        self.width = width
        self.height = height
        self.element_id = element_id

    def _get_js_content(self):
        """
        Retrieve the JavaScript content for the Langevintour widget.
        Returns:
            str: The JavaScript content for the widget.
        """
        js_path = pkg_resources.resource_filename("langevitour", "static/langevitour-pack.js")
        with open(js_path) as file:
            return file.read()

    def to_json(self):
        """
        Convert the Langevintour object to a JSON string.
        Returns:
            str: A JSON string representation of the object.
        """
        # Create a dictionary representation of the instance variables
        data_dict = {
            "X": self.data.tolist()
            if isinstance(self.data, (np.ndarray, np.generic))
            else self.data,  # Convert numpy arrays to list
            "group": self.group,
            "levels": self.levels,
            "name": self.name,
            "center": self.center.tolist()
            if isinstance(self.center, (np.ndarray, np.generic))
            else self.center,  # Convert numpy arrays to list
            "scale": self.scale,
            "colnames": self.column_names,
            "extraAxes": self.extra_axes.tolist()
            if isinstance(self.extra_axes, (np.ndarray, np.generic))
            else self.extra_axes,  # Convert numpy arrays to list
            "extraAxesNames": self.extra_axes_names,
            "lineFrom": self.line_from,
            "lineTo": self.line_to,
            "lineColors": self.line_colors,
            "axisColors": self.axis_colors,
            "levelColors": self.level_colors,
            "colorVariation": self.color_variation,
            "pointSize": self.point_size,
            "subsample": self.subsample,
            "state": self.state,
            "width": self.width,
            "height": self.height,
            "elementId": self.element_id,
        }

        # Convert the dictionary to a JSON string and return
        return json.dumps(data_dict, default=str)

    def to_html(self):
        """
        Convert the Langevin Tour object to an HTML string.
        Returns:
            str: An HTML string representation of the object.
        """
        import time
        unique_id = f"langevi_tour_{int(time.time() * 1000)}" if self.element_id is None else self.element_id
        data_json = self.to_json()
        js_content = self._get_js_content()

        html = f"""
        <div id="{unique_id}"></div>
        <script>
            if ('el_{unique_id}' in window) {{
                // ensure that the previous instance is cleaned up
                delete window.el_{unique_id};
                delete window.tour_{unique_id};
            }}

            {js_content}

            var el_{unique_id} = document.getElementById("{unique_id}");
            var tour_{unique_id} = new langevitour.Langevitour(el_{unique_id}, {self.width}, {self.height});
            tour_{unique_id}.renderValue({data_json});
        </script>
        """
        return html


    def _repr_html_(self):
        """
        Represent the Langevintour object as an HTML string.
        Used by jupyter notebooks to render the tour inline.
        Returns:
            str: An HTML string representation of the object.
        """
        return self.to_html()

    def write_html(self, filename="langevitour_plot.html"):
        """
        Write the Langevintour object to an HTML file.
        Args:
            filename (str, optional): The name of the HTML file. Defaults to 'langevitour_plot.html'.
        Side Effects:
            Writes the HTML representation of the object to the specified file.
        """
        with open(filename, "w") as file:
            file.write(self._repr_html_())

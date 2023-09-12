import numpy as np

from langevitour import Langevitour

# Generate a sample dataset
X = []
group = []
n = 20000

def r():
    return np.random.normal(0, 0.02)

for i in range(n):
    a = i/n * np.pi * 2
    X.append([
        10 + np.sin(a)/3 + r(),
        20 + np.sin(a*2)/3 + r(),
        30 + np.sin(a*3)/3,
        40 + np.sin(a*4)/3,
        50 + np.sin(a*5)/3
    ])
    group.append(int(i*4/n))

# Extra axes (specified as columns of a matrix)
extra_axes = [[1], [2], [0], [0], [0]]
extra_axes_names = ["V1+2*V2"]

tour = Langevitour(
    X,
    group=group,
    extra_axes=extra_axes,
    extra_axes_names=extra_axes_names,
    point_size=1,
)
tour.write_html("langevitour_plot.html")

import numpy as np
import pytest

from langevitour import Langevitour
from langevitour.utils import as_factor


def test_langevitour_initialization():
    data = np.array([[1, 2], [3, 4]])
    langevitour_instance = Langevitour(data)
    assert np.array_equal(langevitour_instance.data, data), "Data not initialized correctly"

def test_langevitour_data_dimension():
    with pytest.raises(ValueError):
        data = np.array([1, 2, 3])
        Langevitour(data)

def test_langevitour_group_length():
    with pytest.raises(ValueError):
        data = np.array([[1, 2], [3, 4]])
        Langevitour(data, group=[1])

def test_langevitour_custom_levels():
    data = np.array([[1, 2], [3, 4]])
    group = ["A", "B"]
    levels = ["B", "A"]
    langevitour_instance = Langevitour(data, group=group, levels=levels)
    assert langevitour_instance.levels == levels, "Custom levels not set correctly"

def test_as_factor_without_levels():
    group = ["a", "b", "a", "c"]
    transformed_group, levels = as_factor(group)
    assert transformed_group == [0, 1, 0, 2], "Group transformation is incorrect"
    assert levels == ["a", "b", "c"], "Levels are incorrect"

def test_as_factor_with_levels():
    group = ["a", "b", "a", "c"]
    custom_levels = ["b", "a", "c"]
    transformed_group, levels = as_factor(group, custom_levels)
    assert transformed_group == [1, 0, 1, 2], "Group transformation with custom levels is incorrect"
    assert levels == custom_levels, "Levels with custom levels are incorrect"
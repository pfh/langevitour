def as_factor(group: list, levels: list = None):
    if levels is None:
        mapping = {}
        for item in group:
            mapping.setdefault(str(item), len(mapping))
    else:
        mapping = {str(level): index for index, level in enumerate(levels)}

    try:
        transformed_group = [mapping[str(item)] for item in group]
    except KeyError as e:
        msg = f"Level {e} in group is not in the specified levels."
        raise ValueError(msg) from e

    return transformed_group, list(mapping.keys())

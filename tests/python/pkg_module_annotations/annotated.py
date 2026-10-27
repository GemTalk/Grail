x: int = 1


def reads_name():
    return __annotations__


def stores_into_name():
    __annotations__[1] = 2

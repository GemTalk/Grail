# Fixture for ComplexTestCase>>testConstructorHonorsDunderComplex.
#
# CPython's complex(x) protocol calls x.__complex__() when defined.  Point
# has no __float__, so __complex__ is the ONLY route to a complex value --
# mirroring test_fractions' Rect, whose complex() conversion is needed by
# Fraction's reflected __rmul__ (testMixedMultiplication).  Bad.__complex__
# returns a non-complex, which complex() must reject with TypeError.
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __complex__(self):
        return complex(self.x, self.y)


class Bad:
    def __complex__(self):
        return "not a complex"


point = Point(4, 3)
bad = Bad()

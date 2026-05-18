# Exercises the unified attribute-call protocol: ``obj.X()`` routes
# through ``___pyAttrLoad___`` + ``value:value:`` so callable values
# (classes, BoundMethods, etc.) invoke correctly regardless of what
# the attribute happens to be.


class Inner:
    def __init__(self):
        self.label = 'inner-built'


class Holder:
    """Class with a class-side attribute that's itself a class.
    ``Holder().make_inner()`` invokes the stored class to construct
    an Inner — must go through ``__new__``, not just read the class."""

    inner_class = Inner

    def make_inner(self):
        return self.inner_class()


def make():
    return Holder()

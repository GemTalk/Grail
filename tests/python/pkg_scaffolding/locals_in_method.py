# Fixture for LocalsTestCase.testLocalsInMethod.  Instance methods
# compile through the real-method path (generateMethodSourceOn:), where
# the self parameter emits as Smalltalk `self` — the locals() rewrite
# must include it under its Python name.


class C:
    def m(self, v):
        w = v * 2
        return locals()


def method_locals():
    d = C().m(3)
    return d["v"] == 3 and d["w"] == 6 and "self" in d and d["self"] is not None

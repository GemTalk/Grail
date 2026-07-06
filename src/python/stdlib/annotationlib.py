# GRAIL minimal annotationlib stub (PEP 749, new in CPython 3.14).
#
# django.utils.inspect imports it on the PY314 branch to ask
# inspect.signature for FORWARDREF-format annotations.  Grail's
# inspect stub ignores annotation formats entirely, so the enum
# values just need to exist.


class Format:
    VALUE = 1
    VALUE_WITH_FAKE_GLOBALS = 2
    FORWARDREF = 3
    STRING = 4


class ForwardRef:
    def __init__(self, arg, **kwargs):
        self.__forward_arg__ = arg

    def evaluate(self, **kwargs):
        raise NotImplementedError(
            "annotationlib.ForwardRef.evaluate is not supported in Grail")


def get_annotations(obj, format=Format.VALUE, **kwargs):
    return {}


def call_annotate_function(annotate, format, owner=None):
    return {}

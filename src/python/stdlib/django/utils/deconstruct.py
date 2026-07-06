from importlib import import_module

from django.utils.version import get_docs_version


def deconstructible(*args, path=None):
    """
    Class decorator that allows the decorated class to be serialized
    by the migrations subsystem.

    The `path` kwarg specifies the import path.
    """

    def decorator(klass):
        def __new__(cls, *args, **kwargs):
            # We capture the arguments to make returning them trivial
            obj = super(klass, cls).__new__(cls)
            obj._constructor_args = (args, kwargs)
            return obj

        def deconstruct(obj):
            """
            Return a 3-tuple of class import path, positional arguments,
            and keyword arguments.
            """
            # Fallback version
            if path and type(obj) is klass:
                module_name, _, name = path.rpartition(".")
            else:
                module_name = obj.__module__
                name = obj.__class__.__name__
            # Make sure it's actually there and not an inner class
            module = import_module(module_name)
            if not hasattr(module, name):
                raise ValueError(
                    "Could not find object %s in %s.\n"
                    "Please note that you cannot serialize things like inner "
                    "classes. Please move the object into the main module "
                    "body to use migrations.\n"
                    "For more information, see "
                    "https://docs.djangoproject.com/en/%s/topics/migrations/"
                    "#serializing-values" % (name, module_name, get_docs_version())
                )
            return (
                (
                    path
                    if path and type(obj) is klass
                    else f"{obj.__class__.__module__}.{name}"
                ),
                obj._constructor_args[0],
                obj._constructor_args[1],
            )

        # GRAIL: upstream replaces klass.__new__ with a closure that
        # calls two-arg super() — Grail's instantiation protocol can't
        # route __new__ through a stored closure, and the captured
        # constructor args only feed migrations serialization, which
        # Grail doesn't run.  Attach deconstruct (it degrades cleanly
        # if _constructor_args is missing) and leave __new__ alone.
        klass.deconstruct = deconstruct

        return klass

    if not args:
        return decorator
    return decorator(*args)

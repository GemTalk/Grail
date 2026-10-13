# A module-level star import from a module whose __all__ names something it
# never binds -- CPython raises AttributeError while importing this.
from .listed import *  # noqa: F401,F403

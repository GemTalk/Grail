# An __all__ that names something the module never binds: CPython's star
# import raises for it, and must keep doing so.
__all__ = ['present', 'never_bound']

present = 'present'

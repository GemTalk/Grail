"""A module-scope class statement whose decorator binds an INSTANCE.

CPython's own genericpath declares ``ALLOW_MISSING`` exactly this way.  Grail's
canonical class registry records the FINAL object a module-scope class statement
bound -- after its decorators, which may return something other than the class
-- so loading this module leaves an instance in that registry.

PythonClassEnumerationTestCase loads it to check that the class enumeration
(``importlib pythonClasses'' and its census) answers classes only.
"""


@object.__new__
class GrailEnumProbeSingleton:
    pass

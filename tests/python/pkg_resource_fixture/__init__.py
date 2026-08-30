"""A package that exists only to have data files sitting next to it.

Driven by tests/python/importlib_resources.py (and PythonTests>>
ImportlibResourcesTestCase).  Nothing here is imported for its code -- the
point is the SIBLING FILES: hello.txt, payload.bin and sub/nested.txt are what
``importlib.resources.files()`` has to find.
"""

MARKER = 'pkg_resource_fixture'

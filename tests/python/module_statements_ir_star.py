"""Star-import source for module_statements_ir_body.py, with no __all__: the
importer binds every public name.  ``maybe`` is a public name the module
never binds, and ``dynamic`` one it binds through its namespace at run time,
which only a runtime merge finds."""
public = 1
_private = 2
if False:
    maybe = 3
globals()['dynamic'] = 4

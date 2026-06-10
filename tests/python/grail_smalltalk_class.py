# Fixture for GrailModuleTestCase.  Tests that grail.smalltalk_class installs
# env-1 methods on an existing Smalltalk class and that those methods are
# callable on instances of that class.
from grail import smalltalk_class

@smalltalk_class(dictionary='PythonTests', class_name='GrailSTestTarget')
class GrailSTestTarget:
    __slots__ = ()

    def grail_hello(self):
        return 'hello from grail'

    def grail_add(self, x, y):
        return x + y

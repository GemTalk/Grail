# Expected to raise TypeError at import time: __slots__ entries don't match
# GrailSTestTarget's own instVarNames (which is empty).
from grail import smalltalk_class

@smalltalk_class(dictionary='PythonTests', class_name='GrailSTestTarget')
class GrailSTestTarget:
    __slots__ = ('nonexistent',)

    def grail_hello(self):
        return 'hello'

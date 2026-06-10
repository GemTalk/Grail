# Expected to raise TypeError at import time: __slots__ is absent.
from grail import smalltalk_class

@smalltalk_class(dictionary='PythonTests', class_name='GrailSTestTarget')
class GrailSTestTarget:
    def grail_hello(self):
        return 'hello'

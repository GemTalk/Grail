Class {
	#name : 'ClassBodyCallClosureTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBodyCallClosureTestCase >> testAClassBodyCallAndTheLambdaItReturnsReadTheEnclosingLocals [
	"tests/python/class_body_call_closure.py: a def in a class body that the
	body itself calls reads and writes the enclosing function's locals, and
	so does a lambda it returns when that runs after the def returned --
	including after ``del'', two levels deep, and for a local bound after
	the class.  Each check agrees with CPython 3.14; before, six of the
	seven raised NameError."

	| fixture |
	importlib @env1:modules removeKey: #'class_body_call_closure' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_call_closure.py')
		name: 'class_body_call_closure'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

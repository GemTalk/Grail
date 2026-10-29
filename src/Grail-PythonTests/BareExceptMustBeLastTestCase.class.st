Class {
	#name : 'BareExceptMustBeLastTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BareExceptMustBeLastTestCase >> testBareExceptBeforeAnotherHandlerIsRefused [
	"tests/python/bare_except_must_be_last.py: a bare except: followed by
	another handler is CPython's ``default 'except:' must be last'', over that
	handler, after any error in the try's body -- and a bare except: that is
	last stays legal.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'bare_except_must_be_last' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_except_must_be_last.py')
		name: 'bare_except_must_be_last'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]

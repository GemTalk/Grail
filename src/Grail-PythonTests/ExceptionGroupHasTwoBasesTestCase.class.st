Class {
	#name : 'ExceptionGroupHasTwoBasesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExceptionGroupHasTwoBasesTestCase >> testExceptionGroupsBasesAreBaseExceptionGroupAndException [

	"tests/python/exception_group_has_two_bases.py: ExceptionGroup's bases are
	(BaseExceptionGroup, Exception), its __mro__ and a subclass's hold
	Exception, it is the one builtin with more than one base, and it is still
	caught as an Exception and split by except*.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'exception_group_has_two_bases' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_group_has_two_bases.py')
		name: 'exception_group_has_two_bases'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

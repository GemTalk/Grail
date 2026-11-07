Class {
	#name : 'MemoryviewFromFlagsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewFromFlagsTestCase >> testMemoryviewHandsBufferTheFlagsItAsksWith [

	"tests/python/memoryview_from_flags.py: inspect.BufferFlags are CPython's,
	memoryview(obj) hands obj's __buffer__ FULL_RO, memoryview._from_flags hands
	it exactly the flags given, a builtin read-only buffer refuses WRITABLE, and
	the arguments are refused as Argument Clinic refuses them.  Each check agrees
	with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'memoryview_from_flags' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_from_flags.py')
		name: 'memoryview_from_flags'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

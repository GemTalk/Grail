Class {
	#name : 'IntFloatAndBytesAnswerGetnewargsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
IntFloatAndBytesAnswerGetnewargsTestCase >> testIntFloatBytesAndBoolAnswerTheArgumentsThatRebuildThem [
	"tests/python/int_float_and_bytes_answer_getnewargs.py: a plain int,
	float, bytes and bool answer __getnewargs__ as CPython's do, a bytes
	subclass answers plain bytes, bytearray has none, the types list it, and
	subclasses and plain values still pickle and copy.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'int_float_and_bytes_answer_getnewargs' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_float_and_bytes_answer_getnewargs.py')
		name: 'int_float_and_bytes_answer_getnewargs'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]

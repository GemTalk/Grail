Class {
	#name : 'MultibyteCoderStateIsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MultibyteCoderStateIsCPythonsTestCase >> testACjkCoderStateIsCPythonsByteForByte [
	"tests/python/multibyte_coder_state_is_cpythons.py: a CJK incremental
	encoder's and decoder's getstate() answer CPython's values -- the pending
	text's UTF-8 and the codec's state bytes, ISO-2022's designation marks
	among them -- and setstate() restores and refuses as CPython's does.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'multibyte_coder_state_is_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/multibyte_coder_state_is_cpythons.py')
		name: 'multibyte_coder_state_is_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

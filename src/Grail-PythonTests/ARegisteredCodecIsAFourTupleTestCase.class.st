Class {
	#name : 'ARegisteredCodecIsAFourTupleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ARegisteredCodecIsAFourTupleTestCase >> testAPlainFourTupleCodecIsCalledAndCheckedAsCPythonDoes [
	"tests/python/a_registered_codec_is_a_four_tuple.py: a search function's
	plain 4-tuple works, its functions taken by position; an answer that is
	no (output, consumed) pair is CPython's TypeError, with no codec note;
	and str.encode / bytes.decode check the output type where codecs.encode
	/ codecs.decode do not.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_registered_codec_is_a_four_tuple' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_registered_codec_is_a_four_tuple.py')
		name: 'a_registered_codec_is_a_four_tuple'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

Class {
	#name : 'EncodeAndDecodeBindAsClinicDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
EncodeAndDecodeBindAsClinicDoesTestCase >> testEncodeAndDecodeRefuseTheirArgumentsAsClinicDoes [
	"tests/python/encode_and_decode_bind_as_clinic_does.py: str.encode and
	bytes.decode refuse a non-str encoding or errors, a third argument, an
	unknown keyword and one given twice in Argument Clinic's words -- not a
	MessageNotUnderstood that ends the session.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'encode_and_decode_bind_as_clinic_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/encode_and_decode_bind_as_clinic_does.py')
		name: 'encode_and_decode_bind_as_clinic_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]

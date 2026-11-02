Class {
	#name : 'HttpClientRequestValidationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
HttpClientRequestValidationTestCase >> testARequestWithAControlCharacterOrAnInjectedHeaderIsRefused [
	"tests/python/http_client_request_validation.py: http.client refuses a
	control character in the host, method or URL, and a header name or value
	that would inject another header, before anything is sent, in CPython's
	words; a folded value and an int value are taken.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'http_client_request_validation' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/http_client_request_validation.py')
		name: 'http_client_request_validation'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]

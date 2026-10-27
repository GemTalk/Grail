Class {
	#name : 'StringIOSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StringIOSurrogateTestCase >> testAStrWithLoneSurrogatesGoesInAndComesBackOut [
	"tests/python/stringio_holds_surrogates.py: io.StringIO takes a str
	holding lone surrogates -- what surrogateescape decoding gives -- as its
	initial value and through write, counts code points for read, tell and
	write, and answers the same str from getvalue, read, readline, readlines
	and iteration; so email.message_from_bytes reads an 8-bit body.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'stringio_holds_surrogates' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stringio_holds_surrogates.py')
		name: 'stringio_holds_surrogates'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]

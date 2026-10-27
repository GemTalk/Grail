Class {
	#name : 'ReSubSurrogateTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReSubSurrogateTestCase >> testSubOverAStrWithLoneSurrogatesKeepsThem [
	"tests/python/re_sub_keeps_surrogates.py: re.sub and re.subn over a str
	holding lone surrogates answer a str holding the same surrogates, for a
	literal, a template and a callable replacement -- the str _sre builds
	comes back through CPythonShim >> PyUnicode_FromString: -- so email's
	BytesGenerator mangles the From line of an 8-bit body.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'re_sub_keeps_surrogates' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_keeps_surrogates.py')
		name: 're_sub_keeps_surrogates'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

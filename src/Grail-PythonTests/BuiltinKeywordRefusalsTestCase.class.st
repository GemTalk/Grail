Class {
	#name : 'BuiltinKeywordRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinKeywordRefusalsTestCase >> testBuiltinFunctionsRefuseKeywordsTheyDoNotTake [
	"tests/python/builtin_keyword_refusals.py: getattr and input refuse every
	keyword, sum, sorted, round, pow, print, eval, exec, compile and open refuse
	one their signature does not name, and each still takes the keywords it
	does.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_keyword_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_keyword_refusals.py')
		name: 'builtin_keyword_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

Class {
	#name : 'ASingleClosingBraceIsRefusedWhereItStandsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ASingleClosingBraceIsRefusedWhereItStandsTestCase >> testASingleClosingBraceIsReportedAtItsOwnColumn [
	"tests/python/a_single_closing_brace_is_refused_where_it_stands.py: a lone
	``}'' in an f-string's literal text is refused at the brace, after a
	field and on a later line too, a t-string's naming the t-string, while a
	doubled one compiles.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_single_closing_brace_is_refused_where_it_stands' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_single_closing_brace_is_refused_where_it_stands.py')
		name: 'a_single_closing_brace_is_refused_where_it_stands'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

Class {
	#name : 'InconsistentIndentationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
InconsistentIndentationTestCase >> testInconsistentTabsAndSpacesAreATabError [
	"tests/python/tab_error.py: indentation whose level depends on the tab
	width is a TabError, located on its line, while consistent indentation
	still compiles and an unmatched dedent is still an IndentationError.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'tab_error' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tab_error.py')
		name: 'tab_error'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]

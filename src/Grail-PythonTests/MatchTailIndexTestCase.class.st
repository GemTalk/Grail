Class {
	#name : 'MatchTailIndexTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchTailIndexTestCase >> testAnElementAfterTheStarIsReadAtLengthMinusK [
	"tests/python/match_tail_index.py: ``case [x, *_, y]:'' asks a Sequence of
	length 42 for items 0 and 41, never -1, as CPython does.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_tail_index' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_tail_index.py')
		name: 'match_tail_index'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]

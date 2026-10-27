Class {
	#name : 'MatchPatternChecksTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchPatternChecksTestCase >> testPatternsAreRefusedWhereCPythonsCompilerRefusesThem [
	"tests/python/match_pattern_checks.py: an unreachable case or
	alternative, a name bound twice, alternatives binding different names, a
	repeated or non-literal mapping key, an f-string value, a repeated class
	attribute, two stars, ``{**_}'' and ``(*x)'' are SyntaxErrors, with
	CPython's messages and locations; valid shapes still compile.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_pattern_checks' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_pattern_checks.py')
		name: 'match_pattern_checks'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

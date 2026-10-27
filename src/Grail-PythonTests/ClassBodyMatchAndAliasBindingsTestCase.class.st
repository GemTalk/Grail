Class {
	#name : 'ClassBodyMatchAndAliasBindingsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBodyMatchAndAliasBindingsTestCase >> testClassBodyReadsWhatMatchAndTypeBind [
	"tests/python/class_body_match_and_alias_bindings.py: a later class-body statement
	reads the captures a match bound, what its case assigned, and the name a
	type statement bound -- at module level and inside a function.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_body_match_and_alias_bindings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_match_and_alias_bindings.py')
		name: 'class_body_match_and_alias_bindings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]

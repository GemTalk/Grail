Class {
	#name : 'AnEvalInputEndingInABackslashIsRefusedThereTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AnEvalInputEndingInABackslashIsRefusedThereTestCase >> testABackslashEndingEvalInputIsAnUnexpectedCharacterAtItself [
	"tests/python/an_eval_input_ending_in_a_backslash_is_refused_there.py: a
	backslash that ends eval input is ``unexpected character after line
	continuation character'' at the backslash, with or without a bracket
	open and through eval() too, while one followed by a newline, and any in
	exec input, still continue into the end of the source.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'an_eval_input_ending_in_a_backslash_is_refused_there' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/an_eval_input_ending_in_a_backslash_is_refused_there.py')
		name: 'an_eval_input_ending_in_a_backslash_is_refused_there'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

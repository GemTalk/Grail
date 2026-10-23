Class {
	#name : 'CompileAstTreeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
CompileAstTreeTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
CompileAstTreeTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
CompileAstTreeTestCase >> setUp [

	importlib @env1:modules removeKey: #'compile_ast_tree' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_ast_tree.py')
		name: 'compile_ast_tree'

]

{ #category : 'Grail-Tests - compile' }
CompileAstTreeTestCase >> testABuiltOrChangedTreeCompiles [

	self assertAll: #('a_built_expression_compiles_and_evaluates'
		'a_changed_tree_runs_its_changes_on_its_own_lines'
		'a_renumbered_tree_reports_its_own_lines'
		'an_untouched_parse_compiles'
		'the_root_must_match_the_mode'
		'names_no_source_can_spell_still_bind'
		'odd_names_bind_under_their_own_name'
		'odd_keyword_reaches_the_callee_as_spelled')

]

{ #category : 'Grail-Tests - compile' }
CompileAstTreeTestCase >> testAFrameReportsItsFunctionsCode [

	self assertAll: #('an_execd_def_frame_reports_its_own_code'
		'a_nested_def_frame_reports_its_own_code')

]

{ #category : 'Grail-Tests - ast' }
CompileAstTreeTestCase >> testDumpUnparseAndTheParseTheyRead [

	self assertAll: #('dump'
		'unparse_round_trips_the_parse'
		'the_parse_has_cpythons_shape'
		'a_built_node_gets_cpythons_defaults')

]

{ #category : 'Grail-Tests - compile' }
CompileAstTreeTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14

]

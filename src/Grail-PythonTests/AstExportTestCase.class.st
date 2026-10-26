Class {
	#name : 'AstExportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AstExportTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
AstExportTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ast_export' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ast_export.py')
		name: 'ast_export'.

]

{ #category : 'Grail-Tests - PyCF_ONLY_AST' }
AstExportTestCase >> testCompileAnswersAWalkableTree [
	"Every step of the walk test_compile_ast makes, from the Module down to
	the operand's id.  The second row is the one the Block flattening is for:
	``body'' has to be a LIST."

	self assertMatchesCPythonAt: 'module'.
	self assertMatchesCPythonAt: 'body_is_a_list'.
	self assertMatchesCPythonAt: 'statement'.
	self assertMatchesCPythonAt: 'expression'.
	self assertMatchesCPythonAt: 'operator'.
	self assertMatchesCPythonAt: 'left'.
	self assertMatchesCPythonAt: 'right_unfolded'.

]

{ #category : 'Grail-Tests - PyCF_OPTIMIZED_AST' }
AstExportTestCase >> testDebugIsFoldedAndOnlyDebug [
	"CPython resolves __debug__ at compile time, so the optimised tree has a
	Constant where the raw one has a Name.  The third row is the one that
	needs compile() to fold a tree it was GIVEN as well as one it parsed --
	test_compile_ast compares the two."

	self assertMatchesCPythonAt: 'right_folded'.
	self assertMatchesCPythonAt: 'folded_from_a_tree'.
	self assertMatchesCPythonAt: 'left_unchanged_by_folding'.

]

{ #category : 'Grail-Tests - Controls' }
AstExportTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '30 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - ast.parse' }
AstExportTestCase >> testParseAnswersTheSameKindOfTree [
	"Across the shapes a reader actually walks.  The call and compare rows
	are where Grail's field NAMES differ; the unary row is where the operator
	is the subclass; the nested-body row is the Suite flattening."

	self assertMatchesCPythonAt: 'parse_module'.
	self assertMatchesCPythonAt: 'parse_assign'.
	self assertMatchesCPythonAt: 'parse_target'.
	self assertMatchesCPythonAt: 'parse_value'.
	self assertMatchesCPythonAt: 'parse_call'.
	self assertMatchesCPythonAt: 'parse_func_name'.
	self assertMatchesCPythonAt: 'parse_attribute'.
	self assertMatchesCPythonAt: 'parse_compare_op'.
	self assertMatchesCPythonAt: 'parse_unary'.
	self assertMatchesCPythonAt: 'parse_def'.
	self assertMatchesCPythonAt: 'parse_if'.
	self assertMatchesCPythonAt: 'parse_nested_body'.
	self assertMatchesCPythonAt: 'parse_isinstance'.
	self assertMatchesCPythonAt: 'lineno'.

]

{ #category : 'Grail-Tests - Controls' }
AstExportTestCase >> testTheOldCallersAreUndisturbed [
	"A bad parse must still raise, which is the ONE thing the placeholder's
	callers relied on -- jinja2's nativetypes uses ast.parse only to detect a
	parse error.  literal_eval and an ordinary compile are untouched."

	self assertMatchesCPythonAt: 'syntax_error_still_raised'.
	self assertMatchesCPythonAt: 'parse_of_a_tree'.
	self assertMatchesCPythonAt: 'literal_eval_unaffected'.
	self assertMatchesCPythonAt: 'literal_eval_bare_tuple'.
	self assertMatchesCPythonAt: 'literal_eval_one_element_tuple'.
	self assertMatchesCPythonAt: 'compile_without_the_flag'.

]

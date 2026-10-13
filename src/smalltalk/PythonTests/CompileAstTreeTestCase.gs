! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileAstTreeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileAstTreeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileAstTreeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileAstTreeTestCase - compile() of a built or changed ast tree
! ===============================================================================
! compile() of a tree worked only for a parse left untouched.  A BUILT tree
! answered itself and a CHANGED one compiled the text it was parsed from, so
! pytest could neither select tests (-k/-m build an Expression) nor rewrite
! assertions (it changes every test module).  A built or changed tree is now
! unparsed, and the parse of the unparse is renumbered to the tree's own lines.
! The fixture also pins ast.dump/unparse and the shape of ast.parse they read,
! and a frame's f_code for a def that exec()'d code made.
! tests/python/compile_ast_tree.py holds the 12 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileAstTreeTestCase removeAllMethods.
CompileAstTreeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompileAstTreeTestCase
setUp

	importlib @env1:modules removeKey: #'compile_ast_tree' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_ast_tree.py')
		name: 'compile_ast_tree'
%

category: 'Grail-Helpers'
method: CompileAstTreeTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: CompileAstTreeTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - compile'
method: CompileAstTreeTestCase
testABuiltOrChangedTreeCompiles

	self assertAll: #('a_built_expression_compiles_and_evaluates'
		'a_changed_tree_runs_its_changes_on_its_own_lines'
		'a_renumbered_tree_reports_its_own_lines'
		'an_untouched_parse_compiles'
		'the_root_must_match_the_mode'
		'names_no_source_can_spell_still_bind')
%

category: 'Grail-Tests - compile'
method: CompileAstTreeTestCase
testAFrameReportsItsFunctionsCode

	self assertAll: #('an_execd_def_frame_reports_its_own_code'
		'a_nested_def_frame_reports_its_own_code')
%

category: 'Grail-Tests - ast'
method: CompileAstTreeTestCase
testDumpUnparseAndTheParseTheyRead

	self assertAll: #('dump'
		'unparse_round_trips_the_parse'
		'the_parse_has_cpythons_shape'
		'a_built_node_gets_cpythons_defaults')
%

category: 'Grail-Tests - compile'
method: CompileAstTreeTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%

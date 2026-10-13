! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AstWalkAndCategoriesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AstWalkAndCategoriesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AstWalkAndCategoriesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AstWalkAndCategoriesTestCase - walking an ast.parse tree
! ===============================================================================
! ast.walk / iter_child_nodes / NodeVisitor were stubs that saw nothing, the
! abstract categories (stmt, expr, excepthandler, ...) did not exist, a bare
! ``@property'' sat in decorator_list as a str, and parse(mode='eval') answered
! a Module.  pytest walks the parse of every file it reports from to find where
! a failing statement ends.
!
! tests/python/ast_walk_and_categories.py holds the 14 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AstWalkAndCategoriesTestCase removeAllMethods.
AstWalkAndCategoriesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AstWalkAndCategoriesTestCase
setUp

	importlib @env1:modules removeKey: #'ast_walk_and_categories' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ast_walk_and_categories.py')
		name: 'ast_walk_and_categories'
%

category: 'Grail-Helpers'
method: AstWalkAndCategoriesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: AstWalkAndCategoriesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - ast'
method: AstWalkAndCategoriesTestCase
testWalkFindsStatementsAndCategories

	self assertAll: #('walk_finds_every_statement'
		'categories'
		'location_attributes'
		'iter_fields'
		'iter_child_nodes')
%

category: 'Grail-Tests - ast'
method: AstWalkAndCategoriesTestCase
testDecoratorsAreNames

	self assertAll: #('bare_decorators_are_names'
		'stacked_decorators'
		'a_decorator_name_reads_as_load')
%

category: 'Grail-Tests - ast'
method: AstWalkAndCategoriesTestCase
testVisitorsAndLocationHelpers

	self assertAll: #('node_visitor'
		'node_transformer'
		'copy_location_keeps_the_line'
		'fix_missing_locations'
		'increment_lineno')
%

category: 'Grail-Tests - ast'
method: AstWalkAndCategoriesTestCase
testParseEval

	self assertAll: #('parse_eval_answers_an_expression')
%

category: 'Grail-Tests - ast'
method: AstWalkAndCategoriesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14
%

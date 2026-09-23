! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AstExportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AstExportTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AstExportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AstExportTestCase
!
! ``ast.parse(source)'' answers a real tree, and so does
! ``compile(source, f, mode, flags=PyCF_ONLY_AST)''.
!
! Grail's parser builds its own Smalltalk-side node hierarchy, which the ast
! module did not export: parse() answered a placeholder and compile() answered
! the source string.  So anything that INSPECTED a parse -- which is what the
! module is for -- got neither, and the stub's own docstring said so: ``anything
! that walks the tree will hit AttributeError''.
!
! THE TRANSLATION IS GENERIC rather than 120 hand-written conversions.  Grail's
! node class names line up with CPython's almost one for one -- ``BinOpAst'' ->
! ``BinOp'', ``MultAst'' -> ``Mult'' -- so AbstractNode >> ___asPythonAst___ maps
! the name, instantiates that class from the ast module, and copies the children
! across.  What the mismatch actually amounts to is four things:
!
!   * THREE FunctionDef VARIANTS.  Grail records how a def was reached (class
!     body, instance, static) in the class; CPython has one node and puts that
!     in the decorator list.
!   * A BLOCK IS NOT A NODE.  Grail wraps a statement list in one -- it carries
!     the scope's variable sets -- and CPython's ``body'' IS the list.  Without
!     flattening it ``Module.body'' was a Block object and every reader failed at
!     the first subscript.  A Suite is the same shape, one level down.
!   * AN OPERATOR IS THE SUBCLASS.  ``-a'' is a USubAst with an operand and
!     ``a and b'' an AndAst with values, where CPython has UnaryOp(op=USub(),
!     ...) -- one node with the marker INSIDE.  BinOp is already the second
!     shape, which is why only those two families are split.
!   * FOUR FIELDS ARE NAMED DIFFERENTLY, and they are the four a reader reaches
!     for first: a call's callee and arguments, a comparison's operators and
!     operands.
!
! WHAT IS COPIED IS DECIDED BY THE ast MODULE'S OWN ``_fields''.  Grail's nodes
! carry codegen bookkeeping beside their children -- CompareAst has ``rhsTemp''
! and ``opTemps'' for the temporaries its emit needs -- and copying every instVar
! put those in the tree as attributes CPython has no name for.  Filtering against
! _fields drops them without a second list here that would have to be maintained
! beside the nodes.
!
! ``ast.parse'' IS ``compile(..., PyCF_ONLY_AST)'', as it is in CPython, so one
! place builds the tree and the two cannot drift.
!
! PyCF_OPTIMIZED_AST additionally folds ``__debug__'' to a Constant -- CPython
! resolves it at compile time, since it cannot change while a program runs, and
! the flag is how a caller asks to see the tree after that.  compile() folds an
! AST it is GIVEN as well as one it parses, because a caller may hand it a tree
! from ast.parse and expects the same answer either way; test_compile_ast
! compares the two.
!
! Drives tests/python/ast_export.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_compile_ast.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AstExportTestCase removeAllMethods.
AstExportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AstExportTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ast_export' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ast_export.py')
		name: 'ast_export'.
%

category: 'Grail-Private'
method: AstExportTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - PyCF_ONLY_AST'
method: AstExportTestCase
testCompileAnswersAWalkableTree
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
%

category: 'Grail-Tests - PyCF_OPTIMIZED_AST'
method: AstExportTestCase
testDebugIsFoldedAndOnlyDebug
	"CPython resolves __debug__ at compile time, so the optimised tree has a
	Constant where the raw one has a Name.  The third row is the one that
	needs compile() to fold a tree it was GIVEN as well as one it parsed --
	test_compile_ast compares the two."

	self assertMatchesCPythonAt: 'right_folded'.
	self assertMatchesCPythonAt: 'folded_from_a_tree'.
	self assertMatchesCPythonAt: 'left_unchanged_by_folding'.
%

category: 'Grail-Tests - ast.parse'
method: AstExportTestCase
testParseAnswersTheSameKindOfTree
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
%

category: 'Grail-Tests - Controls'
method: AstExportTestCase
testTheOldCallersAreUndisturbed
	"A bad parse must still raise, which is the ONE thing the placeholder's
	callers relied on -- jinja2's nativetypes uses ast.parse only to detect a
	parse error.  literal_eval and an ordinary compile are untouched."

	self assertMatchesCPythonAt: 'syntax_error_still_raised'.
	self assertMatchesCPythonAt: 'parse_of_a_tree'.
	self assertMatchesCPythonAt: 'literal_eval_unaffected'.
	self assertMatchesCPythonAt: 'compile_without_the_flag'.
%

category: 'Grail-Tests - Controls'
method: AstExportTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '28 checks, 0 disagreeing [], keys match: True'
%

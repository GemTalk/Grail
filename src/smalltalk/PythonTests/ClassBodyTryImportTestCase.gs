! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyTryImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyTryImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyTryImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyTryImportTestCase
!
! AN IMPORT INSIDE A COMPOUND STATEMENT IN A CLASS BODY.
!
! CPython executes a class body as a namespace, so every binding form there
! produces a class attribute -- ``import'' included.  Grail compiles a class
! body STRUCTURALLY, each form declaring which attributes it yields, EXCEPT for
! the four compound statements ClassDefAst emits verbatim (``try'', ``for'',
! ``while'', ``with''): re-deriving their codegen would duplicate it, so the
! statements inside them go through their own ordinary emit, and each binding
! form is responsible for noticing that it is in a class body.  AssignAst and
! AnnAssignAst noticed -- CallAst >> classBodyRuntimeClass names them.  The two
! IMPORT forms did not, and emitted a bare ``x := ...'' instead: an undeclared
! Smalltalk temp.
!
! THE FIX joins them up, in the one place both import forms already shared:
! StatementAst >> printImportBindingOpenOn:name: now decides between all THREE
! homes a binding can have (module dynamic-instVar storage, a class-body
! definitional store, a plain temp) where before it was a two-way test written
! out twice.
!
! HOW IT PRESENTED, and why it took a codegen dump to see: the shape is how the
! stdlib guards an optional dependency at class scope, and CPython's test_socket
! opens with it --
!
!     class CmsgMacroTests(unittest.TestCase):
!         try:
!             import _testcapi
!         except ImportError:
!             socklen_t_limit = 0x7fffffff
!         else:
!             socklen_t_limit = min(0x7fffffff, _testcapi.INT_MAX)
!
! -- so test_socket could not be imported AT ALL.  Because ``_testcapi'' does
! not exist here, the emitted bare assignment referenced a symbol nothing
! declared and the whole module died with a GemStone CompileError, ``undefined
! symbol _testcapi'': it names the symbol but neither the class body, nor the
! try, nor the import.  Over a module that DOES exist the same shape compiles
! and raises NameError when the class is defined, which is the likelier way to
! meet it and the reason both cases are pinned below.
!
! WHAT MADE IT LOOK LIKE AN IMPORT BUG: an import written DIRECTLY in a class
! body always worked, because ClassDefAst sees it and takes its
! classBodyAttributePairs.  Only nesting it in a compound statement moves it
! onto the path that had the gap -- which is why the fixture covers all four
! compound statements and not just ``try''.
!
! Fixture: tests/python/class_body_try_import.py (self-verifying under CPython
! 3.14.6 -- all 11 checks pass there unchanged, which is what makes them
! evidence).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyTryImportTestCase removeAllMethods.
ClassBodyTryImportTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyTryImportTestCase
setUp
	probe := self ___loadProbe___: 'class_body_try_import'.
%

category: 'Grail-Private'
method: ClassBodyTryImportTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: ClassBodyTryImportTestCase
reprAt: aKey
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

! ---- the two shapes that failed ---------------------------------------------

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testTryImportBindsInTheClassBody
	"``try: import math'' in a class body, then a later class-body statement
	reading it.  Used to raise NameError at class-definition time: the import
	emitted a bare assignment to an undeclared temp, so nothing was bound."

	self assert: (self reprAt: 'try_import_success') equals: '2'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testTryImportOfAMissingModuleTakesTheExceptBranch
	"The GUARD working as written -- the whole point of the shape.  This is
	the case that produced a CompileError rather than a runtime error, because
	the missing module's name reached GemStone as an undeclared symbol; the
	class could not be built and its module could not be imported."

	self assert: (self reprAt: 'try_import_missing') equals: '2147483647'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testImportedNameIsAClassAttribute
	"Not merely reachable from the class body -- CPython leaves the imported
	module bound as a CLASS ATTRIBUTE, and the definitional store is what
	makes that true here rather than a temp that outlived nothing."

	self assert: (self reprAt: 'imported_name_is_a_class_attribute') equals: 'True'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testTryFromImportBindsInTheClassBody
	"The ``from X import name'' form, which had the identical gap in
	ImportFromAst.  Both now route through the one shared helper, so they
	cannot drift apart again."

	self assert: (self reprAt: 'try_from_import') equals: '3'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testTryImportAliasedBindsTheAlias
	"``import math as _m'' binds the ALIAS, and only the alias."

	self assert: (self reprAt: 'try_import_aliased') equals: '[4, True]'.
%

! ---- the other three verbatim compound statements ----------------------------

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testForBodyImport
	"``try'' is not special: all four compound statements ClassDefAst emits
	verbatim take the same path, so all four are pinned."

	self assert: (self reprAt: 'for_body_import') equals: '[6, True]'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testWhileBodyImport
	self assert: (self reprAt: 'while_body_import') equals: '[7, True]'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testWithBodyImport
	self assert: (self reprAt: 'with_body_import') equals: '8'.
%

! ---- the paths that already worked, kept so the fix cannot break them --------

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testPlainClassBodyImportStillWorks
	"An import written DIRECTLY in the class body -- handled by ClassDefAst,
	never broken, and the reason this looked like an import bug rather than a
	class-body one."

	self assert: (self reprAt: 'plain_class_body_import') equals: '[5, True]'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testModuleScopeImportStillWorks
	"The branch the fix shares code with: a module-scope import still stores
	into the module's dynamic-instVar storage."

	self assert: (self reprAt: 'module_scope_import_still_works') equals: '8'.
%

category: 'Grail-Tests'
method: ClassBodyTryImportTestCase
testFunctionScopeImportStillWorks
	"...and a function-scope import still binds a real Smalltalk temp, which
	is the branch a careless fix would have routed into the class store."

	self assert: (self reprAt: 'function_scope_import_still_works') equals: '9'.
%

! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NestedStarImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedStarImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedStarImportTestCase
!
! ``from X import *'' MUST WORK WHEN IT IS NOT A TOP-LEVEL STATEMENT.
!
! importlib >> expandStarImports: scanned only the module body's own top-level
! statement list.  A star import written inside a ``try'', ``if'', ``with'',
! ``for'' or ``while'' -- all module scope in Python, which gives compound
! statements no scope of their own -- was therefore never expanded.  It kept its
! lone ``*'' alias into codegen, where ImportFromAst >> printSmalltalkOn: emitted
! a per-name binding for it: a Smalltalk variable literally NAMED ``*''.
!
!     * := ((((Python @env0:at: #builtins) instance) ___import__: { 'yaml.cyaml'.
!            nil. nil. { '*' }. 0 } kw: nil) @env1:___pyAttrLoad___: #'*').
!
! That is ``a CompileError occurred (error 1001), expected a right bracket'' --
! uncatchable, unwinding past Python entirely, so the session dies with no
! Python-level error at all.  Guarding an accelerator behind
! ``try: from ._speedups import * / except ImportError: pass'' is a very common
! idiom: it is the FIRST import of pyyaml and appears five times in pydantic's
! __init__.py, and it killed both on line one.
!
! The fix makes the nested path use the same machinery as the top-level one
! rather than special-casing it: the scan became
! AbstractNode >> ___collectModuleScopeStarImportsInto___, a generic instVar
! walk that descends through the scope-less compound statements and STOPS at a
! function, lambda or class body.  Stopping there is not an approximation --
! CPython makes a star import in those a SyntaxError (``import * only allowed at
! module level'') and PythonParser >> parseFromImport already raises exactly
! that, so none can exist below one.  testScopeRuleStillEnforced is the guard
! that the fix did not widen the rule while widening the search.
!
! Fixture: tests/python/nested_star_import.py (self-verifying under CPython
! 3.14.6 -- all 13 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: NestedStarImportTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_star_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_star_import.py')
		name: 'nested_star_import'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'
%

category: 'Grail-Private'
method: NestedStarImportTestCase
resultAt: aKey
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: NestedStarImportTestCase
testTryBodyBinds
	"THE BUG, in the shape pyyaml and pydantic are written in.  Before the fix
	the fixture did not merely fail these -- it could not be LOADED at all, so
	setUp itself died with an uncatchable CompileError."

	self assert: (self resultAt: 'try_body_binds') equals: 'True'.
	self assert: (self resultAt: 'except_branch_binds') equals: 'True'.
	self assert: (self resultAt: 'missing_module_is_catchable') equals: 'True'.
%

category: 'Grail-Tests'
method: NestedStarImportTestCase
testEveryCompoundStatementBinds
	"``if'', ``with'', ``for'' and ``while'' introduce no Python scope either,
	so all four are module level and all four have to expand.  Enumerated
	rather than sampled: the search is a generic walk, and a walk that reached
	only the shape it was written for would pass a single-case test."

	self assert: (self resultAt: 'if_body_binds') equals: 'True'.
	self assert: (self resultAt: 'with_body_binds') equals: 'True'.
	self assert: (self resultAt: 'for_body_binds') equals: 'True'.
	self assert: (self resultAt: 'while_body_binds') equals: 'True'.
	self assert: (self resultAt: 'nested_two_deep_binds') equals: 'True'.
%

category: 'Grail-Tests'
method: NestedStarImportTestCase
testTopLevelAndNamedImportsUndisturbed
	"Controls.  The top-level star import is the path the nested one was made
	to reuse, and a named import written beside a star in the SAME nested block
	shares printSmalltalkOn: with it -- so both have to keep working for the
	fix to mean what it claims."

	self assert: (self resultAt: 'toplevel_still_works') equals: 'True'.
	self assert: (self resultAt: 'alias_beside_star') equals: 'True'.
%

category: 'Grail-Tests'
method: NestedStarImportTestCase
testScopeRuleStillEnforced
	"Widening WHERE a star import is expanded must not widen where one is
	ALLOWED.  CPython rejects it in a function or class body with a specific
	message, measured here rather than recalled, and Grail's parser already
	raises exactly that; the walk stops at those nodes on the strength of it."

	self assert: (self resultAt: 'star_in_def_is_syntaxerror') equals: 'True'.
	self assert: (self resultAt: 'star_in_class_is_syntaxerror') equals: 'True'.
	self assert: (self resultAt: 'star_in_module_try_compiles') equals: 'True'.
%

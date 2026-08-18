! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecStarImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecStarImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecStarImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecStarImportTestCase
!
! ``from X import *'' INSIDE exec().
!
! A star import is not emitted as a star.  At module-compile time importlib
! >> expandStarImports: REWRITES it: the target module's ``__all__'' (or its
! public top-level names) replaces the ``*'' alias, and each name is DECLARED on
! the importing body so ensureModuleScope: gives it a slot.
!
! A DOIT NEVER RAN THAT REWRITE.  exec(), eval() and the REPL go through
! ModuleAst >> evaluateSource:usingModuleScope:as:globalNamesInto:, which parsed
! and went straight to scope-building, so codegen met the alias list with the
! literal ``*'' still in it and emitted
!
!     * := (... ___pyAttrLoad___: #'*').
!
! which is not Smalltalk.  ``[1034] unexpected token''.
!
! THE FAILURE MODE IS WHAT MAKES THIS WORTH FIXING, more than the feature.  A
! CompileError is a SMALLTALK exception, so it is not catchable from Python: it
! took the whole exec() down, and a caller wrapping the exec in try/except got no
! say.  test___all__ does ``exec("from %s import *" % modname, names)'' for every
! stdlib module it checks, so the first one ended the test -- and, before this,
! every module looked like a separate failure when there was one bug.
!
! ORDER MATTERS IN THE FIX: the expansion must run BEFORE ensureModuleScope:,
! because the expansion is what DECLARES the names and ensureModuleScope: is what
! turns declared names into slots.  The other way round, every name it found
! would compile to an undefined symbol -- the same class of error, just later.
!
! WHAT A DOIT GIVES UP is the runtime merge.  A module-level star import also
! emits ``self ___mergePublicAttrsFrom: X'', which picks up names that exist only
! at run time (something injected via globals().update() -- re._constants does
! this).  An exec'd body has no module instance: ``self'' is nil, so that send
! would be a doesNotUnderstand on nil -- precisely the uncatchable failure being
! removed.  So it is skipped in a doit, and what remains is every name the module
! declares statically, which is what a star import means in practice.  The gap is
! narrow and deliberate, not overlooked.
!
! Fixture: tests/python/exec_star_import.py (self-verifying under CPython 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: ExecStarImportTestCase
setUp
	probe := self ___loadProbe___: 'exec_star_import'.
%

category: 'Grail-Private'
method: ExecStarImportTestCase
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
method: ExecStarImportTestCase
reprAt: aKey
	"The fixture's entries are Python values; compare their repr so a failure
	prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testStarImportBindsTheModulesNames
	"The headline: the exec'd namespace ends up holding what the star import
	promised, rather than the exec dying in the compiler."

	self assert: (self reprAt: 'star_into_exec_namespace')
		equals: '[''bisect'', ''bisect_left'', ''bisect_right'', ''insort'', ''insort_left'', ''insort_right'']'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testTheBoundNamesAreCallable
	"Bound to the real functions, not merely present as keys."

	self assert: (self reprAt: 'the_names_are_usable') equals: '1'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testTheFailureWasNotCatchable
	"Speaks to the failure MODE.  Before this, the try/except around the exec
	was useless -- a Smalltalk CompileError is not a Python exception, so it
	escaped Python entirely and ended the session's test.  Answering ``ok''
	means the exec both ran and stayed inside Python's control flow."

	self assert: (self reprAt: 'uncatchable_before') equals: '''ok'''.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testDunderAllDecidesTheExportedSet
	"Not ``every public name'': a module that declares __all__ exports exactly
	that, which is the rule expandStarImports: already implements for module
	scope and which the doit path now shares."

	self assert: (self reprAt: 'star_from_a_module_with_dunder_all')
		equals: 'True'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testPlainImportInExecIsUnchanged
	"``import X'' in a doit always worked; the expansion pass must not disturb
	the statement it does not rewrite."

	self assert: (self reprAt: 'plain_import_in_exec_still_works')
		equals: '[''bisect'']'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testNamedImportInExecIsUnchanged
	"``from X import a, b'' -- the shape the star is rewritten INTO, so it had
	better still work on its own."

	self assert: (self reprAt: 'named_import_in_exec_still_works')
		equals: '[''bisect_left'', ''insort'']'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testModuleLevelStarImportIsUnchanged
	"The path that always worked -- regression guard on the emit this change
	also touches (the runtime merge is skipped only in a doit)."

	self assert: (self reprAt: 'module_level_star_is_unchanged') equals: '1'.
%

category: 'Grail-Tests'
method: ExecStarImportTestCase
testSeveralStarImportsInOneExec
	"The rewrite walks every top-level statement, so two stars in one exec'd
	body must both expand -- a fix that handled only the first would pass every
	test above."

	self assert: (self reprAt: 'several_star_imports_in_one_exec')
		equals: '[True, True]'.
%

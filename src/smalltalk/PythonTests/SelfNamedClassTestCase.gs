! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SelfNamedClassTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SelfNamedClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelfNamedClassTestCase
!
! A MODULE THAT DEFINES A TOP-LEVEL CLASS WITH ITS OWN NAME.
!
! CPython's socket.py is this shape -- module ``socket'', ``class socket'' at
! line 218 -- and so is a good deal of the stdlib.  Inside such a module the
! bare name refers to the CLASS; the module itself is reached through
! sys.modules, or not at all.
!
! Grail compiles a module's globals against a backing Smalltalk class, and
! generated code refers to the module singleton BY THAT CLASS'S BARE NAME:
! AbstractNode >> ___moduleStoreReceiverExpr___ emits
! ``<moduleClass> @env0:___instance___'' whenever a global is stored from
! inside a class body.  When the module also defines that name, the reference
! has two plausible referents and the module loses.  Importing socket.py died
! with
!
!     a socket class does not understand #'___instance___'
!
! -- the module self-reference had resolved to the class.  The module could not
! be imported AT ALL, so this failure is total rather than subtle; what made it
! hard to see is that it fires only for the combination, and the modules that
! share the NAME half (netrc, decimal) never store a global from a class body
! and so never hit it.
!
! THE FIX IS THE ESCAPE THAT WAS ALREADY THERE.  ___moduleNameShadowsCompileScope___
! already prefixes 'Py' when a module's name would shadow a builtin or a curated
! kernel class; it simply never considered the module's OWN body as a source of
! collision.  ___moduleDefinesItsOwnName___:as: adds that case.  The backing
! class name is internal -- __name__ and sys.modules keep the real module name --
! so the prefix costs nothing visible.
!
! Classes are checked as well as functions because ``topLevelDefs'', the list
! the surrounding method already computes, selects FunctionDefAst only, and the
! shape that actually bites is a CLASS.
!
! testGlobalStoreFromAClassBody is the one that matters: that is the exact
! emission site.  A module that merely DEFINES a same-named class without ever
! storing a global from a class body imports fine and proves nothing.
!
! Fixture: tests/python/self_named_class.py (self-verifying under CPython
! 3.14.6 -- all 7 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: SelfNamedClassTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'self_named_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_named_class.py')
		name: 'self_named_class'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'
%

category: 'Grail-Private'
method: SelfNamedClassTestCase
resultAt: aKey
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: SelfNamedClassTestCase
testTheBareNameIsTheClassNotTheModule
	"Inside the module, ``self_named_class(21)'' constructs -- it does not
	reach the module singleton."

	self assert: (self resultAt: 'bare_name_is_the_class') equals: 'True'.
	self assert: (self resultAt: 'isinstance_against_bare_name') equals: 'True'.
%

category: 'Grail-Tests'
method: SelfNamedClassTestCase
testGlobalStoreFromAClassBody
	"THE EMISSION SITE.  ``global _counter'' inside a method compiles to a
	store through the module self-reference, which is the expression that
	resolved to the class instead of the module.  Before the fix the module
	could not be imported at all, so this test could not even reach setUp."

	self assert: (self resultAt: 'global_store_from_a_class_body') equals: 'True'.
	self assert: (self resultAt: 'global_store_accumulates') equals: 'True'.
%

category: 'Grail-Tests'
method: SelfNamedClassTestCase
testTheModuleIsStillReachableAndDistinct
	"The rename must not cost the module its identity: it is still in
	sys.modules under its real name, still not the class, and its attributes
	still resolve."

	self assert: (self resultAt: 'module_is_reachable_via_sys_modules') equals: 'True'.
	self assert: (self resultAt: 'module_attributes_still_reachable') equals: 'True'.
	self assert: (self resultAt: 'class_name_is_not_the_module') equals: 'True'.
%

set compile_env: 0

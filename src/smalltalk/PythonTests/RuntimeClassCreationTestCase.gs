! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RuntimeClassCreationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RuntimeClassCreationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RuntimeClassCreationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RuntimeClassCreationTestCase
!
! Regression surface for Python class-creation patterns that the
! current install-time `compileClassDef:` architecture handles
! incorrectly.  These tests document the behavior we expect once
! ClassDefAst emits class-creation code at runtime, and are expected
! to fail until that refactor lands.
!
! Patterns covered:
!   (b) class re-definition at module top level
!   (c) class definition inside a conditional branch
!   (d) class-per-call (factory function returns a new class each call)
!   (e) name collision across modules
!   (g) inheritance via bases
!
! Pattern (f) — class method reading a module-level global — was
! deferred: the fix lives in NameAst codegen (Python `__globals__`
! lookup), not in class creation.  The test and fixture will return
! with the follow-up branch that addresses it.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeClassCreationTestCase removeAllMethods.
RuntimeClassCreationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-helpers'
method: RuntimeClassCreationTestCase
loadFixture: shortName
	"Drop any cached registration for `shortName` then load
	tests/python/<shortName>.py fresh.  Returns the module instance."

	| mods path |
	mods := importlib @env1:modules.
	mods removeKey: shortName asSymbol ifAbsent: [].
	path := importlib grailDir , '/tests/python/' , shortName , '.py'.
	^importlib loadModuleFromPath: path name: shortName
%

! ---------------- (b) re-definition ----------------

category: 'Grail-Tests - (b) Re-definition'
method: RuntimeClassCreationTestCase
testRedefPreservesEarlierInstance
	"After `class Bar:` is re-defined, the instance built from the
	first definition should still answer 1 from foo()."

	| mod |
	mod := self loadFixture: 'runtime_class_redef'.
	self assert: (mod @env1:r1_pre) equals: 1.
	self assert: (mod @env1:r1_post) equals: 1.
%

category: 'Grail-Tests - (b) Re-definition'
method: RuntimeClassCreationTestCase
testRedefSecondInstanceUsesSecondDefinition
	"The instance built after the re-definition should answer 2."

	| mod |
	mod := self loadFixture: 'runtime_class_redef'.
	self assert: (mod @env1:r2) equals: 2.
%

category: 'Grail-Tests - (b) Re-definition'
method: RuntimeClassCreationTestCase
testRedefProducesDistinctClasses
	"The two `class Bar:` statements must produce distinct class
	objects (bar1's class != bar2's class)."

	| mod bar1 bar2 |
	mod := self loadFixture: 'runtime_class_redef'.
	bar1 := mod instVarAt: (mod class allInstVarNames indexOf: #bar1).
	bar2 := mod instVarAt: (mod class allInstVarNames indexOf: #bar2).
	self deny: bar1 class == bar2 class.
%

! ---------------- (c) conditional definition ----------------

category: 'Grail-Tests - (c) Conditional'
method: RuntimeClassCreationTestCase
testConditionalTakesTrueBranch
	"With flag=True the true-branch class definition runs;
	Cond().kind() should return 'true_branch'."

	| mod |
	mod := self loadFixture: 'runtime_class_conditional'.
	self assert: (mod @env1:result) equals: 'true_branch'.
%

! ---------------- (d) class-per-call factory ----------------

category: 'Grail-Tests - (d) Factory'
method: RuntimeClassCreationTestCase
testFactoryProducesDistinctClasses
	"Two calls to make_class() must return distinct class objects
	(A is B should be False)."

	| mod |
	mod := self loadFixture: 'runtime_class_factory'.
	self assert: (mod @env1:same) equals: false.
%

category: 'Grail-Tests - (d) Factory'
method: RuntimeClassCreationTestCase
testFactoryClassesWork
	"Both factory-produced classes should be instantiable and have
	a working kind() method."

	| mod |
	mod := self loadFixture: 'runtime_class_factory'.
	self assert: (mod @env1:a_kind) equals: 'inner'.
	self assert: (mod @env1:b_kind) equals: 'inner'.
%

! ---------------- (e) name collision across modules ----------------

category: 'Grail-Tests - (e) Name Collision'
method: RuntimeClassCreationTestCase
testCollisionModuleAIsolated
	"Module A's `Shared` class returns 'A'."

	| modA |
	modA := self loadFixture: 'runtime_class_collision_a'.
	self assert: (modA @env1:result) equals: 'A'.
%

category: 'Grail-Tests - (e) Name Collision'
method: RuntimeClassCreationTestCase
testCollisionBothModulesIsolated
	"Loading module B after module A must not corrupt module A's
	`Shared` class — each module's instance answers its own value."

	| modA modB instA instB |
	modA := self loadFixture: 'runtime_class_collision_a'.
	modB := self loadFixture: 'runtime_class_collision_b'.
	instA := modA instVarAt: (modA class allInstVarNames indexOf: #inst).
	instB := modB instVarAt: (modB class allInstVarNames indexOf: #inst).
	self assert: (instA perform: #kind env: 1) equals: 'A'.
	self assert: (instB perform: #kind env: 1) equals: 'B'.
	self deny: instA class == instB class.
%

! ---------------- (g) inheritance ----------------

category: 'Grail-Tests - (g) Inheritance'
method: RuntimeClassCreationTestCase
testInheritedMethod
	"Dog inherits kind() from Animal."

	| mod |
	mod := self loadFixture: 'runtime_class_inheritance'.
	self assert: (mod @env1:a_kind) equals: 'animal'.
	self assert: (mod @env1:d_kind) equals: 'animal'.
%

category: 'Grail-Tests - (g) Inheritance'
method: RuntimeClassCreationTestCase
testOwnMethodOnSubclass
	"Dog adds its own bark() method."

	| mod |
	mod := self loadFixture: 'runtime_class_inheritance'.
	self assert: (mod @env1:d_bark) equals: 'woof'.
%

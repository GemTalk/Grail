! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlaskScaffoldingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlaskScaffoldingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlaskScaffoldingTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
FlaskScaffoldingTestCase removeAllMethods.
FlaskScaffoldingTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! FlaskScaffoldingTestCase
!
! Locks in four AST/codegen changes that landed during the Flask
! roadmap M2 push and lay infrastructure for the rest of the Flask
! stack.  Each test loads a focused fixture under
! `tests/python/pkg_scaffolding/` and asserts the visible behaviour.
! ===============================================================================

category: 'Grail-Helpers'
method: FlaskScaffoldingTestCase
loadFixture: fixtureName
	"Load tests/python/pkg_scaffolding/<fixtureName>.py fresh, returning
	the module instance.  Drops any prior load so the test is hermetic."

	| mods fullName |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	#( 'pkg_scaffolding' ) do: [:n |
		mods @env0:removeKey: n @env0:asSymbol ifAbsent: []].
	mods @env0:removeKey: fullName @env0:asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
		name: 'pkg_scaffolding'.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

! --- AnnAssignAst -----------------------------------------------------------

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignModuleLevel
	"`x: int = expr` at module scope binds the value, drops the
	annotation."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_int) equals: 42.
	self assert: (mod @env1:module_doubled) equals: 84.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignBareAnnotation
	"`x: int` with no value emits nothing executable — accessing
	the name yields nil (no binding ever happened)."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_bare) isNil.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignLocalInFunction
	"`local_val: int = 7` inside a function body works the same
	as a plain assignment."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:value_with_annotation) equals: 7.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignComplexAnnotation
	"`items: list = []` — the annotation evaluates a name
	(`list`) Grail recognises, then `.append(...)` mutates the
	bound value.  Confirms the body runs cleanly after the
	annotation is stripped."

	| mod result |
	mod := self loadFixture: 'annassign'.
	result := mod @env1:computed_local_annotation.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignClassAttribute
	"Class-level `class_counter: int = 100` becomes a Smalltalk
	classInstVar that Python attribute access can read."

	| mod cls |
	mod := self loadFixture: 'annassign'.
	cls := mod @env1:HasAnnotatedAttrs.
	self assert: (cls @env1:class_counter) equals: 100.
%

! --- ImportAst dotted-import-as-alias --------------------------------------

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testDottedImportAsAlias
	"`import collections.abc as cabc` binds cabc to the LEAF
	collections.abc submodule, not the top-level `collections`.
	Before the fix the alias resolved to the top package."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:LEAF_NAME) equals: 'collections.abc'.
%

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testUnaliasedDottedImport
	"`import collections.abc` (no alias) binds the TOP-LEVEL
	package `collections` — CPython statement semantics.  The
	leaf is reachable via attribute access on the top."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:TOP_NAME) equals: 'collections'.
	self assert: (mod @env1:ABC_VIA_TOP) equals: 'collections.abc'.
%

! --- ClassDefAst: Python class doesn't clobber built-ins -----------------

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testClassNameDoesNotClobberBuiltin
	"`class Symbol:` and `class Set:` are deliberately named to
	collide with GemStone built-ins.  The codegen emits
	``Object subclass: 'Symbol' inDictionary: nil`` — the `nil`
	dictionary makes the class anonymous (no SymbolList entry),
	so the built-ins are untouched and the Python class is
	reachable only through the module's instVar."

	| mod sym builtin |
	mod := self loadFixture: 'builtin_collision'.
	sym := mod @env1:Symbol.
	"The built-in Symbol class still resolves via the symbol
	list — and it's NOT the Python class."
	builtin := System myUserProfile symbolList @env0:objectNamed: #Symbol.
	self assert: builtin notNil.
	self deny: builtin == sym.
	"The Python class is the one the module instVar holds, not
	a clone of the built-in."
	self assert: sym superclass equals: PythonInstance.
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testCollidingClassConstructs
	"The anonymous Python class is fully usable: __init__ runs,
	instance attrs land in the right slots, module-level
	construction wires up correctly."

	| mod a b set |
	mod := self loadFixture: 'builtin_collision'.
	a := mod @env1:make_a.
	b := mod @env1:make_b.
	set := mod @env1:both.
	self assert: a @env1:name equals: 'a'.
	self assert: b @env1:name equals: 'b'.
	self assert: set @env1:items @env0:size equals: 2.
%

! --- AttributeAst cls vs self ---------------------------------------------

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillFastPath
	"`self.X` in an instance method whose first param is the
	conventional `self` still takes the instVar fast path —
	the AttributeAst change only narrowed the path, not removed
	it."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	inst := cls @env1:value: { 'hello' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'hello'.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillWorksWhenClassHasNew
	"When a class defines __new__ (whose first param is `cls` by
	convention), the WHOLE class's selfParameterName had been
	picked from __new__ — turning every `self.X` reference in
	other methods into an UnboundLocal access.  After the
	ClassDefAst fix, selfParameterName prefers __init__'s first
	param, so `self.label` keeps reaching the instance instVar."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:HasNewAndInit.
	inst := cls @env1:value: { 'world' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'world'.
%

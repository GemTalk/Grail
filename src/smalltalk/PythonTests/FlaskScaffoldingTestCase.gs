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
testSelfReadOfClassSideAttribute
	"`self.set_class` where `set_class` was declared at class
	body level (`set_class: type = list`) lives on the Smalltalk
	class side, not in instance layout.  Reading it from an
	instance method has to go through ___pyAttrLoad___: at
	runtime; before the AttributeAst fallback fix, the codegen
	emitted bare `set_class` and Smalltalk compile-errored with
	`undefined symbol set_class`.  The CallAst exclusion makes
	sure `self.<unknown-attr>(...)` doesn't take the direct
	unary-send fastpath either — that path bypasses
	___pyAttrLoad___: and would DNU on the metaclass."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	"`self.set_class` resolves through ___pyAttrLoad___: to the
	class-side attribute value (the built-in ``list`` class,
	which is OrderedCollection in Grail)."
	result := inst @env1:read_class_attr.
	self assert: result equals: OrderedCollection.
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

! --- Deep instance-variable discovery --------------------------------------

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromConditionalAssign
	"`if doc: self.doc = doc` inside __init__ — old scan missed
	the nested write; new chain propagates from AttributeAst up
	through the IfAst to ClassDefAst."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	"Construction triggers __init__; if doc isn't a real
	instVar the conditional write would silently fail with an
	'undefined symbol doc' compile error before runtime."
	self assert: (cls @env0:allInstVarNames @env0:includes: #doc).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #doc) equals: 'hello'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromAnnAssign
	"AnnAssign on self.X (`self.tags: list = []`) — different
	AST node from plain Assign; old scan only recognised
	AssignAst targets."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #tags).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromNestedCompound
	"`try / for / self.last_index = i` — write buried two
	compound statements deep inside __init__.  Propagation
	walks through every IfAst / ForAst / TryAst body branch."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_index).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromMethodOutsideInit
	"`self.name = name` in `configure(self, name)` — old scan
	walked __init__ only.  New walk covers every method body
	in the class."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #name).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #name) equals: 'the-name'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromCls
	"`cls.last_doc = doc` inside __new__ — `cls` is the
	conventional class-attribute receiver name, but for
	instance-var discovery the AttributeAst chain treats it
	the same as `self`.  (Whether the runtime store actually
	hits the class side is a separate question handled by
	___pyAttrLoad___:.)"

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_doc).
%

! --- SubscriptAst: class-subscript as base ---------------------------------

category: 'Grail-Tests - SubscriptAst'
method: FlaskScaffoldingTestCase
testSubscriptedBuiltinAsBaseClass
	"`class X(dict[K, V]):` evaluates ``dict[K, V]`` at runtime as
	part of the base-class list.  Grail's dict class-side
	__getitem__: stub returns the class itself so the parameterized
	base resolves to the origin class (KeyValueDictionary).  Without
	the stub, class-statement execution DNUs on the metaclass."

	| mod cls inst |
	mod := self loadFixture: 'subscripted_base'.
	cls := mod @env1:StringKeyedDict.
	"The class inherits from KeyValueDictionary (Grail's dict)."
	self assert: cls superclass equals: KeyValueDictionary.
	inst := mod @env1:make.
	self assert: (inst @env0:at: 'k') equals: 1.
	self assert: (inst @env1:label) equals: 'string-keyed'.
%

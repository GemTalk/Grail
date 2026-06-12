! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LocalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LocalsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
LocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LocalsTestCase - Tests for the compile-time locals() rewrite
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
LocalsTestCase removeAllMethods: 0.
LocalsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsInFunction
	"Parameters and assigned names both appear with current values."

	| result |
	result := self eval: 'def f(a):
    b = a + 1
    return locals()
d = f(2)
d == {"a": 2, "b": 3}'.
	self assert: result
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsSkipsUnboundNames
	"Names assigned later in the function are not yet bound at the
	locals() call moment and must be absent from the snapshot."

	| result |
	result := self eval: 'def f():
    x = 1
    d = locals()
    y = 2
    return d
d = f()
"x" in d and "y" not in d and "d" not in d'.
	self assert: result
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsIsSnapshot
	"Mutating the function namespace after locals() does not change
	the returned dict (CPython function-scope snapshot semantics)."

	| result |
	result := self eval: 'def f():
    x = 1
    d = locals()
    x = 99
    return (d["x"], x)
f() == (1, 99)'.
	self assert: result
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsAtModuleLevel
	"At module scope locals() IS globals() (CPython contract)."

	self assert: (self eval: 'locals() is globals()')
%

category: 'Grail-Helpers'
method: LocalsTestCase
loadFixture: fixtureName
	"Load tests/python/pkg_scaffolding/<fixtureName>.py once per suite
	run and return the cached module instance (same caching rationale
	as FlaskScaffoldingTestCase >> loadFixture:)."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods @env0:at: fullName @env0:asSymbol ifAbsent: [nil].
	cached @env0:notNil ifTrue: [^ cached].
	(mods @env0:includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsInMethod
	"Inside a method the snapshot includes self and the parameters.
	Goes through a fixture module so the class compiles via the real-
	method path (the eval path's closure-class form is a separate,
	pre-existing gap)."

	| mod |
	mod := self loadFixture: 'locals_in_method'.
	self assert: mod @env1:method_locals
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsInNestedFunction
	"A nested def sees its own scope, not the enclosing function''s."

	| result |
	result := self eval: 'def outer():
    a = 1
    def inner(b):
        c = b + 1
        return locals()
    return inner(2)
d = outer()
"a" not in d and d["b"] == 2 and d["c"] == 3'.
	self assert: result
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsAfterNestedDefRestoresScope
	"After a nested def, locals() in the enclosing function must see
	the OUTER scope again (the compile-state save/restore)."

	| result |
	result := self eval: 'def outer():
    a = 1
    def inner():
        t = 9
        return t
    inner()
    return locals()
d = outer()
"a" in d and "inner" in d and "t" not in d'.
	self assert: result
%

category: 'Grail-Tests - locals'
method: LocalsTestCase
testLocalsInLoopBody
	"locals() works inside nested suites (loop body) and sees the
	loop variable — Python scoping is function-level."

	| result |
	result := self eval: 'def f():
    out = []
    for i in range(2):
        out.append("i" in locals())
    return out
f() == [True, True]'.
	self assert: result
%

! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LegbScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LegbScopeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
LegbScopeTestCase comment:
'LEGB name-resolution regressions for names that collide with a
module-level function: inside a class method a true Python local
(parameter or body binding) shadows the module function; comprehension
targets are comprehension-scoped (Python 3); genuine global reads still
reach the function.  Regresses the NameAst module-function-branch guard
(precise ``writes''-based ___pythonLocalInEnclosingFunctions___: +
___boundAsComprehensionTarget___:), BoundMethod>>__get__ (function
descriptor protocol, needed by weakref.WeakMethod once Django connects
its true receivers), and the ___descriptorGet___: BoundMethod exclusion
(class-attribute functions must not rebind on instance reads).'
%

expectvalue /Class
doit
LegbScopeTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
LegbScopeTestCase removeAllMethods: 0.
LegbScopeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: LegbScopeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'legb_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/legb_scope.py')
		name: 'legb_scope'.
%

category: 'Grail-Helpers'
method: LegbScopeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testLocalBindingShadowsModuleFunction
	"A method-body binding shadows the same-named module function —
	the textwrap ``indent = self.initial_indent'' case."

	self assert: (self resultAt: 'local_shadow') equals: 'LOCAL'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testParameterShadowsModuleFunction
	"A method parameter shadows the same-named module function —
	the django Signal.connect(receiver, ...) case."

	self assert: (self resultAt: 'param_shadow') equals: 'P'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testGlobalReadStillReachesModuleFunction
	"With no binding in the method, the name is a genuine global read."

	self assert: (self resultAt: 'global_read') equals: 'FN:g'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testComprehensionTargetIsComprehensionScoped
	"Inside the comprehension the target name is the comprehension-
	local; OUTSIDE it, the module function is untouched (Python 3
	scopes comprehension targets to the comprehension)."

	| vals |
	vals := self resultAt: 'comp_vals'.
	self assert: (vals @env1:__getitem__: 0) equals: 6.
	self assert: (vals @env1:__getitem__: 1) equals: 8.
	self assert: (self resultAt: 'comp_after') equals: 'FN:after'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testTupleComprehensionTargetsAreScoped
	"Tuple-unpacking comprehension targets are comprehension-local too."

	self assert: (self resultAt: 'comp_tuple_helper') equals: 'HELPER'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testNestedDefReadsMethodLocal
	"A nested def reads the method's local through closure capture; the
	local shadows the module function inside the nested def as well."

	self assert: (self resultAt: 'nested_def') equals: 'OUTER'
%

category: 'Grail-Tests - LEGB'
method: LegbScopeTestCase
testShadowingIsPerScope
	"A binding in ONE method must not affect resolution in another."

	self assert: (self resultAt: 'global_helper') equals: 'HELPER'.
	self assert: (self resultAt: 'binds_helper') equals: 'BOUND'
%

category: 'Grail-Tests - Descriptor protocol'
method: LegbScopeTestCase
testClassAttributeFunctionDoesNotRebind
	"A function stored as a class attribute passes through instance
	attribute reads unbound (___descriptorGet___: excludes BoundMethod)
	— the itsdangerous digest_method pattern."

	self assert: (self resultAt: 'class_attr_fn_call') equals: 'HELPER'
%

category: 'Grail-Tests - Descriptor protocol'
method: LegbScopeTestCase
testExplicitDunderGetRebinds
	"BoundMethod>>__get__ (explicit function descriptor call) re-binds a
	method to an instance — weakref.WeakMethod.__call__'s exact flow."

	self assert: (self resultAt: 'explicit_get_rebind') equals: 'LOCAL'
%

category: 'Grail-Tests - LEGB calls'
method: LegbScopeTestCase
testBuiltinSurvivesComprehensionTarget
	"A comprehension target named after a builtin must not shadow the
	builtin outside the comprehension: `[len for len in xs]; len(s)`
	used to raise UnboundLocalError (variables-based shadow check in
	isFastPathBuiltinName and CallAst's dispatch gates)."

	| pair vals |
	pair := self resultAt: 'builtin_after_comp'.
	vals := pair @env1:__getitem__: 0.
	self assert: (vals @env1:__getitem__: 0) equals: 10.
	self assert: (vals @env1:__getitem__: 1) equals: 20.
	self assert: (pair @env1:__getitem__: 1) equals: 3
%

category: 'Grail-Tests - LEGB calls'
method: LegbScopeTestCase
testLocalShadowsModuleFunctionCall
	"A local binding shadows the same-named module function for a bare
	CALL (regresses the moduleSelfSend gates' missing shadow guard)."

	self assert: (self resultAt: 'local_call_shadow') equals: 'LOCAL-HELPER'
%

category: 'Grail-Tests - LEGB calls'
method: LegbScopeTestCase
testModuleDefShadowsBuiltinCall
	"A top-level def named after a builtin (re.py's own `def compile`)
	shadows the builtin for bare calls module-wide."

	self assert: (self resultAt: 'module_def_builtin_call') equals: 'MODULE-COMPILE:y'
%

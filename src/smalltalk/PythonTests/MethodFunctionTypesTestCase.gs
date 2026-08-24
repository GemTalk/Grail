! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MethodFunctionTypesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MethodFunctionTypesTestCase comment:
'``types.MethodType'' and ``types.FunctionType'' as isinstance targets.

CPython''s line between them is implementation language: a METHOD object is
Python-level and carries __func__; a BUILTIN bound to something carries
__self__ but no __func__; a plain function carries neither.  Grail''s
BoundMethod carries both for everything it binds, so the same line is drawn
from what the binding is FOR -- a module __self__ is Grail''s spelling of a
plain function, a __func__ owned by the Smalltalk kernel (qualname beginning
``Object class.'') is its spelling of a C builtin, and everything else
carrying both is a real method.  Both checks live as __instancecheck__ on
metaclasses in types.py, pure Python.

Two Smalltalk changes feed them.  Reading a class-DEFINED __init_subclass__
through its class now answers a method BOUND to that class -- PEP 487 makes
the hook an implicit classmethod -- where it read as unbound before.  And
BoundMethod>>__func__ learned that this bind''s method is INSTANCE-side on
the class: resolving it on the metaclass, as the @classmethod case wants,
climbed to the kernel''s ``Object class.__init_subclass__'', which both
misnamed the function and classified a Python-level hook as a builtin.  The
bind is marked by ``definingClass == receiver'', which no other construction
uses.

This is what PEP 702''s @deprecated branches on: isinstance(hook, MethodType)
decides whether to unwrap __func__ and reinstall as a classmethod, or wrap
object''s builtin as a plain no-argument function.  With the classification
wrong both branches misfired; three of test_warnings'' DeprecatedTests pass
from this alone.

LambdaType IS FunctionType -- the same object under two names, matching
CPython; a separate stub made the two isinstance answers disagree.

See tests/python/method_function_types.py.'
%

expectvalue /Class
doit
MethodFunctionTypesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MethodFunctionTypesTestCase removeAllMethods: 0.
MethodFunctionTypesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodFunctionTypesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'method_function_types' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_function_types.py')
		name: 'method_function_types'.
%

category: 'Grail-Helpers'
method: MethodFunctionTypesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MethodFunctionTypesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - MethodType'
method: MethodFunctionTypesTestCase
testTheFourReadsClassifyCPythonsWayRound
	"object''s builtin is NOT a method; a class-defined hook, a classmethod
	read, and an instance-bound read ARE; a plain method read through its
	class is a function, not a method."

	self assertAll: #('objects_builtin_is_not_a_method'
		'a_defined_hook_is_a_method' 'a_classmethod_read_is_a_method'
		'an_instance_bound_read_is_a_method'
		'a_class_read_of_a_plain_method_is_not')
%

category: 'Grail-Tests - MethodType'
method: MethodFunctionTypesTestCase
testNonMethodsStayOut
	self assertAll: #('a_module_function_is_not_a_method'
		'a_nested_function_is_not_a_method' 'a_partial_is_not_a_method'
		'a_constructed_methodtype_is_one')
%

category: 'Grail-Tests - MethodType'
method: MethodFunctionTypesTestCase
testTheDefinedHookBindsToItsClass
	"__self__ is the class, and __func__ is the underlying function --
	callable with the class made explicit, which is how @deprecated forwards
	to it."

	self assertAll: #('the_defined_hook_binds_to_the_class'
		'the_hooks_func_takes_the_class_explicitly')
%

category: 'Grail-Tests - FunctionType'
method: MethodFunctionTypesTestCase
testFunctionsClassifyAsFunctions
	self assertAll: #('a_module_function_is_a_function'
		'a_nested_function_is_a_function' 'a_lambda_is_a_function'
		'a_class_read_of_a_plain_method_is_a_function')
%

category: 'Grail-Tests - FunctionType'
method: MethodFunctionTypesTestCase
testNonFunctionsStayOut
	self assertAll: #('a_bound_method_is_not_a_function'
		'a_class_is_not_a_function' 'a_classmethod_object_is_not_a_function'
		'lambdatype_is_functiontype')
%

category: 'Grail-Tests - what it is for'
method: MethodFunctionTypesTestCase
testDeprecatedForwardsToAnExistingHook
	"The MethodType branch end to end: the hook still runs, its marker lands
	on the subclass, the warning is emitted -- and the hook sees the NEW
	class, not the decorated one."

	self assertAll: #('deprecated_forwards_to_an_existing_hook'
		'the_hook_sees_the_new_class')
%

category: 'Grail-Tests - what it is for'
method: MethodFunctionTypesTestCase
testADeprecatedFunctionIsStillAFunction
	self assertAll: #('a_deprecated_function_is_still_a_function')
%

category: 'Grail-Tests - the name itself'
method: MethodFunctionTypesTestCase
testTheTypeNameSaysFunction
	"type(f).__name__ is Python-visible in its own right -- error messages
	quote it -- and CPython says ''function'' for a nested def, a lambda, and
	a method read through its class alike.  Grail leaked ''ExecBlock'' /
	''UnboundMethod'' until ___pythonBuiltinTypeName___ mapped the family;
	the tests that pinned those spellings moved with the change, since they
	were documenting the leak, not depending on it.  BoundMethod stays
	unmapped, honestly: one Smalltalk class carries both CPython ''function''
	(module-level def) and ''method'' (instance-bound), and a name keyed by
	class cannot split them."

	self assertAll: #('a_nested_defs_type_name_is_function'
		'a_lambdas_type_name_is_function'
		'a_class_read_methods_type_name_is_function')
%

category: 'Grail-Tests - the name itself'
method: MethodFunctionTypesTestCase
testDeprecatedMisuseQuotesTheName
	"The consumer that made the name Python-visible in test_warnings:
	@deprecated applied without its message quotes type(message).__name__."

	self assertAll: #('deprecated_misuse_quotes_function')
%

! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GetattributeHookTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GetattributeHookTestCase'
  instVarNames: #( results )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GetattributeHookTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GetattributeHookTestCase
!
! A user-defined __getattribute__ intercepts EVERY attribute read.  CPython
! routes every read through type(obj).__getattribute__ -- tp_getattro IS that
! slot -- so a class defining it sees reads of names that exist as much as reads
! of names that do not, reads made by getattr(), and the read a method call
! performs.  Grail consulted __getattribute__ nowhere, so a user-defined one
! never ran at all.
!
! Drives tests/python/getattribute_hook.py, whose every expectation was measured
! against CPython 3.14.6 -- the fixture is self-running, so
! scripts/check_python_fixtures.sh re-measures it.
!
! THREE CHECKS DISCRIMINATE, and they are the reason the others are here.  A
! hook that merely delegates to object.__getattribute__ answers the same value
! whether it ran or not, so instance_attr_read and its neighbours pass even with
! no hook installed; hook_saw_every_read (the call log),
! nested_error_keeps_its_own_message and super_delegation are the ones that fail
! in that case.  All of them are kept: the value checks are what catch a hook
! that runs and answers WRONGLY.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GetattributeHookTestCase removeAllMethods.
GetattributeHookTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GetattributeHookTestCase
setUp
	"Reload tests/python/getattribute_hook.py fresh each test.  Fresh matters
	here: the hook is installed on the class at build time, so a stale module
	would test a class built by an earlier version of the codegen."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'getattribute_hook' ifAbsent: [].
	results := (importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/getattribute_hook.py')
		name: 'getattribute_hook') @env1:___pyAttrLoad___: #RESULTS.
%

category: 'Grail-Setup'
method: GetattributeHookTestCase
assertCheck: aName
	"Each fixture check answers true, or a description of what happened instead --
	so a failure here reports the actual value rather than just ``false''."

	self assert: (results @env1:__getitem__: aName) equals: true.
%

! --- the hook sees every kind of read ---

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testHookSawEveryRead
	"The call log: one entry per read, in order, and nothing for the STORE
	``self.value = value'' in __init__, which __getattribute__ never sees.
	This is the check that fails when no hook is installed at all."

	self assertCheck: 'hook_saw_every_read'.
%

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testInstanceAttrRead
	"An instance attribute read goes through the hook and answers the value."

	self assertCheck: 'instance_attr_read'.
%

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testClassAttrRead
	"So does a CLASS attribute read -- tp_getattro is consulted before the
	class-attribute machinery, not after it."

	self assertCheck: 'class_attr_read'.
%

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testMethodCall
	"A method call is an attribute read followed by a call, so the hook sees
	the name."

	self assertCheck: 'method_call'.
%

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testGetattrBuiltinRead
	"getattr(obj, name) routes through the same slot."

	self assertCheck: 'getattr_builtin_read'.
%

category: 'Grail-Tests - every read'
method: GetattributeHookTestCase
testMissingNameRaises
	"A name that does not exist still reaches the hook, and the AttributeError
	object.__getattribute__ raises is the one that comes out."

	self assertCheck: 'missing_name_raises'.
%

! --- delegation and fallback ---

category: 'Grail-Tests - delegation'
method: GetattributeHookTestCase
testSuperDelegation
	"A hook that delegates with super().__getattribute__ and then TRANSFORMS the
	result -- the shape that proves the hook's return value is what the read
	answers, not merely that it ran."

	self assertCheck: 'super_delegation'.
%

category: 'Grail-Tests - delegation'
method: GetattributeHookTestCase
testHookRaiseReachesGetattr
	"django's LazyObject shape: __getattribute__ raises AttributeError on
	purpose to reach __getattr__.  CPython's PyObject_GetAttr tries __getattr__
	when the type has one, so the fallback runs."

	self assertCheck: 'hook_raise_reaches_getattr'.
%

category: 'Grail-Tests - delegation'
method: GetattributeHookTestCase
testNestedErrorKeepsItsOwnMessage
	"An AttributeError raised by a read INSIDE the hook is about the object and
	name IT failed on.  With no __getattr__ to fall back to, CPython lets that
	exception through untouched rather than replacing it with one about the
	outer read -- test.test_traceback's
	test_attribute_error_inside_nested_getattr."

	self assertCheck: 'nested_error_keeps_its_own_message'.
%

! --- a class attribute over an inherited method, under the hook ---

category: 'Grail-Tests - method shadow'
method: GetattributeHookTestCase
testShadowedMethodUnderHook
	"``greet = Helper.greet'' over an inherited method compiles to a forwarder
	that asks whether the attribute is really there.  That is an implementation
	question -- CPython answers the equivalent without calling
	__getattribute__ -- so the lookup steps past the hook.  Routing it THROUGH
	the hook closes a cycle: measured at 1182 shadow and 596 hook frames in one
	5518-frame dump, ending in stack exhaustion and then a session-fatal
	UncontinuableError 2758."

	self assertCheck: 'shadowed_method_under_hook'.
%

category: 'Grail-Tests - method shadow'
method: GetattributeHookTestCase
testShadowedMethodUnderNestedHooks
	"Two classes in one hierarchy each defining __getattribute__ each install
	their own override, so stepping past a SINGLE layer lands on another hook.
	object>>___grailAttrLoadSkippingHooks___ walks."

	self assertCheck: 'shadowed_method_under_nested_hooks'.
%

category: 'Grail-Tests - method shadow'
method: GetattributeHookTestCase
testShadowedMethodWithoutHook
	"And a class with no __getattribute__ anywhere is untouched.  This is the
	check that fails if the bypass is written too broadly -- an earlier attempt
	jumped straight to object's ___pyAttrLoad___: and broke three tests,
	including one on a class with no hook at all."

	self assertCheck: 'shadowed_method_without_hook'.
%

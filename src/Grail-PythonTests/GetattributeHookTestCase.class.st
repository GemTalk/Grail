Class {
	#name : 'GetattributeHookTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'results'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
GetattributeHookTestCase >> assertCheck: aName [
	"Each fixture check answers true, or a description of what happened instead --
	so a failure here reports the actual value rather than just ``false''."

	self assert: (results @env1:__getitem__: aName) equals: true.

]

{ #category : 'Grail-Setup' }
GetattributeHookTestCase >> setUp [
	"Reload tests/python/getattribute_hook.py fresh each test.  Fresh matters
	here: the hook is installed on the class at build time, so a stale module
	would test a class built by an earlier version of the codegen."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'getattribute_hook' ifAbsent: [].
	results := (importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/getattribute_hook.py')
		name: 'getattribute_hook') @env1:___pyAttrLoad___: #RESULTS.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testClassAttrRead [
	"So does a CLASS attribute read -- tp_getattro is consulted before the
	class-attribute machinery, not after it."

	self assertCheck: 'class_attr_read'.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testGetattrBuiltinRead [
	"getattr(obj, name) routes through the same slot."

	self assertCheck: 'getattr_builtin_read'.

]

{ #category : 'Grail-Tests - delegation' }
GetattributeHookTestCase >> testHookRaiseReachesGetattr [
	"django's LazyObject shape: __getattribute__ raises AttributeError on
	purpose to reach __getattr__.  CPython's PyObject_GetAttr tries __getattr__
	when the type has one, so the fallback runs."

	self assertCheck: 'hook_raise_reaches_getattr'.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testHookSawEveryRead [
	"The call log: one entry per read, in order, and nothing for the STORE
	``self.value = value'' in __init__, which __getattribute__ never sees.
	This is the check that fails when no hook is installed at all."

	self assertCheck: 'hook_saw_every_read'.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testInstanceAttrRead [
	"An instance attribute read goes through the hook and answers the value."

	self assertCheck: 'instance_attr_read'.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testMethodCall [
	"A method call is an attribute read followed by a call, so the hook sees
	the name."

	self assertCheck: 'method_call'.

]

{ #category : 'Grail-Tests - every read' }
GetattributeHookTestCase >> testMissingNameRaises [
	"A name that does not exist still reaches the hook, and the AttributeError
	object.__getattribute__ raises is the one that comes out."

	self assertCheck: 'missing_name_raises'.

]

{ #category : 'Grail-Tests - delegation' }
GetattributeHookTestCase >> testNestedErrorKeepsItsOwnMessage [
	"An AttributeError raised by a read INSIDE the hook is about the object and
	name IT failed on.  With no __getattr__ to fall back to, CPython lets that
	exception through untouched rather than replacing it with one about the
	outer read -- test.test_traceback's
	test_attribute_error_inside_nested_getattr."

	self assertCheck: 'nested_error_keeps_its_own_message'.

]

{ #category : 'Grail-Tests - object.__getattribute__' }
GetattributeHookTestCase >> testObjectGetattributeNeverCallsGetattr [
	"An explicit ``object.__getattribute__(obj, name)'' is the generic lookup
	alone, as in CPython: its miss raises AttributeError and never calls
	__getattr__ (#1395).  The standard idiom -- a __getattr__ that tries
	object.__getattribute__ first and falls back in ``except AttributeError''
	-- called itself from its own miss and overflowed the stack, which no
	Python except can catch; on main this fixture dies at its first check.

	Controls: an ordinary miss still reaches __getattr__ afterwards, a
	__getattribute__ hook whose inner object.__getattribute__ misses still
	gets __getattr__ applied (the router), the class-attribute spelling
	``__getattr__ = fn'' behaves the same, and existing attributes of every
	kind are still found.

	See tests/python/object_getattribute_skips_getattr.py (CPython 3.14's
	values)."

	| fixture answers expected b keys |
	importlib @env1:modules removeKey: #'object_getattribute_skips_getattr' ifAbsent: [].
	[fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/object_getattribute_skips_getattr.py')
		name: 'object_getattribute_skips_getattr'.
	 answers := fixture @env1:___pyAttrLoad___: #'r'.
	 expected := fixture @env1:___pyAttrLoad___: #'EXPECTED'.
	 b := (Python at: #'builtins') @env1:instance.
	 keys := fixture @env1:___pyAttrLoad___: #'KEYS'.
	 self assert: (keys @env1:__len__) equals: 11.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (answers @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'object_getattribute_skips_getattr' ifAbsent: []]

]

{ #category : 'Grail-Tests - method shadow' }
GetattributeHookTestCase >> testShadowedMethodUnderHook [
	"``greet = Helper.greet'' over an inherited method compiles to a forwarder
	that asks whether the attribute is really there.  That is an implementation
	question -- CPython answers the equivalent without calling
	__getattribute__ -- so the lookup steps past the hook.  Routing it THROUGH
	the hook closes a cycle: measured at 1182 shadow and 596 hook frames in one
	5518-frame dump, ending in stack exhaustion and then a session-fatal
	UncontinuableError 2758."

	self assertCheck: 'shadowed_method_under_hook'.

]

{ #category : 'Grail-Tests - method shadow' }
GetattributeHookTestCase >> testShadowedMethodUnderNestedHooks [
	"Two classes in one hierarchy each defining __getattribute__ each install
	their own override, so stepping past a SINGLE layer lands on another hook.
	object>>___grailAttrLoadSkippingHooks___ walks."

	self assertCheck: 'shadowed_method_under_nested_hooks'.

]

{ #category : 'Grail-Tests - method shadow' }
GetattributeHookTestCase >> testShadowedMethodWithoutHook [
	"And a class with no __getattribute__ anywhere is untouched.  This is the
	check that fails if the bypass is written too broadly -- an earlier attempt
	jumped straight to object's ___pyAttrLoad___: and broke three tests,
	including one on a class with no hook at all."

	self assertCheck: 'shadowed_method_without_hook'.

]

{ #category : 'Grail-Tests - delegation' }
GetattributeHookTestCase >> testSuperDelegation [
	"A hook that delegates with super().__getattribute__ and then TRANSFORMS the
	result -- the shape that proves the hook's return value is what the read
	answers, not merely that it ran."

	self assertCheck: 'super_delegation'.

]

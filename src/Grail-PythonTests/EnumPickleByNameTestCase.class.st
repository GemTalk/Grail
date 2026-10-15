Class {
	#name : 'EnumPickleByNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumPickleByNameTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumPickleByNameTestCase >> setUp [
	"Reload tests/python/enum_pickle_by_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_pickle_by_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_pickle_by_name.py')
		name: 'enum_pickle_by_name'.

]

{ #category : 'Grail-Tests - A raising __module__' }
EnumPickleByNameTestCase >> testAClassCarriesTheIdentityPickleSavesItBy [
	"__module__ is how a class is pickled BY REFERENCE.  Without it pickle falls
	back to whichmodule(), which SCANS sys.modules for a module exposing the
	object under its __qualname__."

	self assert: (self resultAt: 'enum_property_module') asString equals: '''enum'''.
	self assert: (self resultAt: 'pickling_it') asString equals: 'ok'.

]

{ #category : 'Grail-Tests - A raising __module__' }
EnumPickleByNameTestCase >> testARaisingModuleReadIsTreatedAsAbsent [
	"pickle read obj.__module__ with a DEFAULTED getattr, which is not enough
	under Grail: some objects raise from that read instead of answering the
	default.  The exception left ``modname'' unbound, so the failure surfaced as
	``UnboundLocalError: cannot access local variable 'modname''', naming
	nothing to do with pickling.  It is now treated as no __module__, which is
	what the whichmodule fallback is for.

	The subject is a property INSTANCE, which raises in CPython too -- the value
	lives on the type, not the instance.  enum.property (the CLASS) used to be
	the subject and no longer raises; see the two tests below."

	self assert: (self resultAt: 'instance_module_raises') asString equals: 'yes'.

]

{ #category : 'Grail-Tests - The case it exists for' }
EnumPickleByNameTestCase >> testAssigningItMakesTheMemberTravelByName [
	"And the member comes back as the same object, not an equal one."

	self assert: (self resultAt: 'by_name_member') asString equals: 'True'.

]

{ #category : 'Grail-Tests - The reductions exist' }
EnumPickleByNameTestCase >> testBothArePresentAndDeclared [
	self assert: (self resultAt: 'has_by_enum_name') asString equals: 'True'.
	self assert: (self resultAt: 'has_by_global_name') asString equals: 'True'.
	self assert: (self resultAt: 'both_declared') asString equals: 'True'.

]

{ #category : 'Grail-Tests - A raising __module__' }
EnumPickleByNameTestCase >> testPicklingItDoesNotDependOnWhatElseWasImported [
	"THE REGRESSION GUARD, and the reason the previous two assertions moved.

	enum.property's __qualname__ was 'DynamicClassAttribute', and ``types''
	exposes it under exactly that name, so whichmodule's scan found it only
	AFTER something had imported types.  pickle.dumps(enum.property) therefore
	answered PicklingError in a fresh session and 'ok' in a whole-suite run --
	this test class passed alone and failed in company, with the test ORDER
	deciding the answer.  Both spellings must now agree."

	self assert: (self resultAt: 'pickling_it') asString equals: 'ok'.
	self assert: (self resultAt: 'pickling_it_after_types') asString equals: 'ok'.

]

{ #category : 'Grail-Tests - The case it exists for' }
EnumPickleByNameTestCase >> testTheDefaultReductionCannotRebuildSuchAValue [
	"``class NEI(NamedInt, Enum)'': the default (cls, (value,)) reduction calls
	NamedInt.__new__ with the value alone, and NamedInt demands a name too.
	CPython raises exactly this, which is why the replacement exists."

	self assert: (self resultAt: 'default_reduction') asString
		equals: 'TypeError: name and value must be specified'.

]

{ #category : 'Grail-Tests - The reductions exist' }
EnumPickleByNameTestCase >> testTheReductionIsGetattrOfClassAndName [
	"CPython's shape exactly: (getattr, (cls, name)).

	``getattr'' has to be the BUILTIN -- the object Python code sees, which
	pickle names as builtins.getattr.  Reading it from the builtins CLASS
	rather than the module INSTANCE yields an UnboundMethod, which pickle
	cannot name at all; that mistake is what held this back a round."

	self assert: (self resultAt: 'reduction_func') asString equals: 'getattr'.
	self assert: (self resultAt: 'reduction_args') asString equals: 'Colour,GREEN'.
	self assert: (self resultAt: 'func_is_builtin_getattr') asString equals: 'True'.

]

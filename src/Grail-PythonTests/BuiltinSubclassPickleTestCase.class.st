Class {
	#name : 'BuiltinSubclassPickleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinSubclassPickleTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
BuiltinSubclassPickleTestCase >> setUp [
	"Reload tests/python/builtin_subclass_pickle.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_subclass_pickle' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_pickle.py')
		name: 'builtin_subclass_pickle'.

]

{ #category : 'Grail-Tests - The plain builtins are untouched' }
BuiltinSubclassPickleTestCase >> testABoundaryConstantPicklesAsItsMember [
	"enum.STRICT is a FlagBoundary MEMBER now, so it pickles as one -- which is
	what CPython does, verified.

	This assertion used to read ``str:'STRICT''' and was the project's example
	of the OTHER thing: Grail uses Symbol -- a CharacterCollection subclass --
	for str-ish internal values, and a Symbol must not be taken for a Python
	subclass of str (a name-based guard sent one down the subclass path, and
	pickle then failed trying to name the Symbol class; three test_enum tests
	broke before the discriminator was corrected).

	That guard is UNCHANGED and still right -- pickle's _is_python_subclass asks
	___pyDefinedClass___, not a name.  What it has lost is a subject reachable
	from plain Python: a Symbol reports ``str'' for type(x).__name__, so nothing
	in a Python fixture can tell one apart to exercise it deliberately."

	self assert: (self resultAt: 'boundary_constant') asString
		equals: 'FlagBoundary:<FlagBoundary.STRICT: ''strict''>'.

]

{ #category : 'Grail-Tests - The subclass survives' }
BuiltinSubclassPickleTestCase >> testAnImmutableBuiltinSubclassKeepsItsClassAndValue [
	"Each of these used to come back as the plain builtin."

	self assert: (self resultAt: 'int') asString equals: 'MyInt:7'.
	self assert: (self resultAt: 'str') asString equals: 'MyStr:''hi'''.
	self assert: (self resultAt: 'tuple') asString equals: 'MyTup:(1, 2)'.
	self assert: (self resultAt: 'float') asString equals: 'MyFloat:1.5'.

]

{ #category : 'Grail-Tests - The plain builtins are untouched' }
BuiltinSubclassPickleTestCase >> testAnIntEnumMemberIsStillAMember [
	"The enum branch of the dispatch runs before the primitive one, so a member
	that mixes in int pickles as the member, not as its raw value."

	self assert: (self resultAt: 'int_enum_member') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Correct failures' }
BuiltinSubclassPickleTestCase >> testARequiredExtraConstructorArgumentStillCannotBeRebuilt [
	"Pinned as CORRECT, not as a gap: int.__getnewargs__ reports only the
	value, so a __new__ demanding more is called one argument short -- and
	CPython fails here too.  That failure is the point of test_enum's
	test_subclasses_without_direct_pickle_support, which asserts the TypeError
	before assigning enum.pickle_by_enum_name over __reduce_ex__ to avoid it."

	self assert: (self resultAt: 'required_arg') asString equals: 'TypeError'.

]

{ #category : 'Grail-Tests - The subclass survives' }
BuiltinSubclassPickleTestCase >> testInstanceStateTravelsWithTheConstructorArgument [
	"The reduction is __new__(cls, *getnewargs) followed by the state, so an
	attribute set in __new__ is restored too."

	self assert: (self resultAt: 'state') asString equals: 'Tagged:3:three'.

]

{ #category : 'Grail-Tests - Known gaps' }
BuiltinSubclassPickleTestCase >> testListAndDictSubclassesKeepTheirClass [
	"CPython rebuilds a list or dict subclass through the reduction's
	listitems / dictitems, a different mechanism from __getnewargs__ -- a
	mutable container's contents are not constructor arguments.  This used to
	pin the gap (both came back as plain containers); pickle is CPython's own
	pickle.py now, whose default reduction carries both."

	self assert: (self resultAt: 'list_subclass_keeps_its_class') asString
		equals: 'MyList:[1, 2]'.
	self assert: (self resultAt: 'dict_subclass_keeps_its_class') asString
		equals: 'MyDict:{''a'': 1}'.

]

{ #category : 'Grail-Tests - __getnewargs__' }
BuiltinSubclassPickleTestCase >> testTheImmutableBuiltinsReportTheirConstructorArguments [
	"CPython defines __getnewargs__ on each of them; a subclass inherits it,
	which is how the reduction learns the value."

	self assert: (self resultAt: 'getnewargs_int') asString equals: '(7,)'.
	self assert: (self resultAt: 'getnewargs_str') asString equals: '(''hi'',)'.
	self assert: (self resultAt: 'getnewargs_tuple') asString equals: '((1, 2),)'.

]

{ #category : 'Grail-Tests - The plain builtins are untouched' }
BuiltinSubclassPickleTestCase >> testThePrimitiveFastPathStillApplies [
	"The whole point of the guard is that it changes nothing for a builtin
	itself -- these keep the fast path and their pickles are unchanged."

	self assert: (self resultAt: 'plain_int') asString equals: 'int:5'.
	self assert: (self resultAt: 'plain_str') asString equals: 'str:''abc'''.
	self assert: (self resultAt: 'plain_tuple') asString equals: 'tuple:(1, 2)'.
	self assert: (self resultAt: 'plain_bool') asString equals: 'bool:True'.

]

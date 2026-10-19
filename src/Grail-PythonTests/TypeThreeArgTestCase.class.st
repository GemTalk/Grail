Class {
	#name : 'TypeThreeArgTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeThreeArgTestCase >> assertMatchesCPythonAt: key [
	"Compare the fixture's measured value against its own EXPECTED entry --
	CPython 3.14.6's actual output for the same probe."

	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
TypeThreeArgTestCase >> setUp [
	"Reload tests/python/type_three_arg.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_three_arg' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_three_arg.py')
		name: 'type_three_arg'.

]

{ #category : 'Grail-Tests - Arguments' }
TypeThreeArgTestCase >> testAClassNameIsCheckedForNulAndSurrogates [
	"A NUL is a ValueError and a wrong TYPE is a TypeError: CPython separates
	``wrong kind of thing'' from ``right kind, impossible value'', and
	test_type_name asserts each separately, so one error class for both cannot
	pass.  Grail reported neither -- the name reached the Smalltalk class
	builder and failed there with ``Grail cannot subclass sealed kernel class
	'PythonInstance''', which names nothing the caller did."

	self assertMatchesCPythonAt: 'name_nul'.
	self assertMatchesCPythonAt: 'name_surrogate'.

]

{ #category : 'Grail-Tests - Names' }
TypeThreeArgTestCase >> testANameGemStoneWouldRefuseStillWorks [
	"The Smalltalk class name and the Python class name are now two things.

	They used to be one, and cls.__name__ read the Smalltalk name straight
	back, so every Python name GemStone will not take was rejected outright
	and a dotted one came back mangled.  'B.A' answering 'B_A' is the case to
	watch: it raised nothing, so it was a wrong answer rather than a failure."

	self assertMatchesCPythonAt: 'name_plain'.
	self assertMatchesCPythonAt: 'name_latin1'.
	self assertMatchesCPythonAt: 'name_astral'.
	self assertMatchesCPythonAt: 'name_dotted'.
	self assertMatchesCPythonAt: 'name_digits'.
	self assertMatchesCPythonAt: 'name_empty'.

]

{ #category : 'Grail-Tests - Controls' }
TypeThreeArgTestCase >> testAnOrdinaryThreeArgumentCallIsUNAFFECTED [
	"THE CONTROL IN THE OTHER DIRECTION.  Validation must not refuse what
	CPython accepts, and the plain three-argument call is by far the common
	one -- every test above would pass if type() had simply been made to raise
	always."

	self assertMatchesCPythonAt: 'ok_name'.
	self assertMatchesCPythonAt: 'ok_qualname'.
	self assertMatchesCPythonAt: 'ok_module'.
	self assertMatchesCPythonAt: 'ok_bases'.
	self assertMatchesCPythonAt: 'ok_base_is_object'.
	self assertMatchesCPythonAt: 'ok_no_firstlineno'.
	self assertMatchesCPythonAt: 'ok_instance_type'.
	self assertMatchesCPythonAt: 'ok_attrs_work'.
	self assertMatchesCPythonAt: 'ok_namespace_entry'.
	self assertMatchesCPythonAt: 'ok_namespace_order'.

]

{ #category : 'Grail-Tests - __doc__' }
TypeThreeArgTestCase >> testAnUndocumentedClassAnswersNoneRatherThanItsBases [
	"This is WHY CPython gives every class its own __doc__ entry, and so the
	row that says the fix is the right shape: reading the docstring by walking
	the class chain would satisfy the tests above and still make an
	undocumented subclass of a documented class claim its base's docstring."

	self assertMatchesCPythonAt: 'doc_default_is_none'.
	self assertMatchesCPythonAt: 'doc_not_inherited'.
	self assertMatchesCPythonAt: 'doc_of_base'.

]

{ #category : 'Grail-Tests - __firstlineno__' }
TypeThreeArgTestCase >> testAssigningModuleDropsTheRecordedFirstLine [
	"...and type()'s OWN __module__ default must not drop it, which is why the
	constructor writes that one straight to the holder.  Routing it through
	the store made ``type('A', (), {'__firstlineno__': 42})'' lose the entry it
	had just been given -- a fix breaking the case it was written for."

	self assertMatchesCPythonAt: 'firstlineno_kept'.
	self assertMatchesCPythonAt: 'firstlineno_module_set'.
	self assertMatchesCPythonAt: 'firstlineno_dropped'.
	self assertMatchesCPythonAt: 'firstlineno_resettable'.

]

{ #category : 'Grail-Tests - Names' }
TypeThreeArgTestCase >> testAssigningNameAndQualnameTakesTheSameRefusals [
	"``A.__name__ = x'' and ``type(x, (), {})'' are one constraint arriving by
	two routes, so they refuse the same three things.

	The read-back after each rejection is the half that matters: a check made
	AFTER the store would satisfy every assertion about the exception and
	still leave the class named b'A'."

	self assertMatchesCPythonAt: 'assign_name_nul'.
	self assertMatchesCPythonAt: 'assign_name_nul_kept'.
	self assertMatchesCPythonAt: 'assign_name_bytes'.
	self assertMatchesCPythonAt: 'assign_name_bytes_kept'.
	self assertMatchesCPythonAt: 'assign_name_ok'.
	self assertMatchesCPythonAt: 'qualname_from_namespace'.
	self assertMatchesCPythonAt: 'assign_qualname_bytes'.
	self assertMatchesCPythonAt: 'assign_qualname_kept'.
	self assertMatchesCPythonAt: 'assign_qualname_ok'.

]

{ #category : 'Grail-Tests - Controls' }
TypeThreeArgTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a check that is DELETED stops being
	asserted and nothing goes red.  This reads the fixture's own roll-up,
	which carries the count, the names of any that disagree, and whether the
	measured keys still match the expected ones."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '72 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - mappingproxy' }
TypeThreeArgTestCase >> testMappingProxyTypeIsARealProxy [
	"It was a stub that answered its argument -- a WRITABLE dict under a name
	whose entire purpose is that it is read-only -- which is also why the
	namespace check could not refuse one until this was fixed."

	self assertMatchesCPythonAt: 'proxy_type'.
	self assertMatchesCPythonAt: 'proxy_read'.
	self assertMatchesCPythonAt: 'proxy_is_readonly'.
	self assertMatchesCPythonAt: 'proxy_rejects_nonmapping'.

]

{ #category : 'Grail-Tests - __slots__' }
TypeThreeArgTestCase >> testSlotsAreValidated [
	"Ten refusals, none of which Grail made.  Each one otherwise produces a
	class carrying a slot nobody can use.

	``__slots__ = 'x' '' with a class variable ``x'' is the odd one out at
	ValueError rather than TypeError, and deliberately so: both halves are
	well formed and it is the COMBINATION that cannot work."

	self assertMatchesCPythonAt: 'slots_bytes'.
	self assertMatchesCPythonAt: 'slots_not_iterable'.
	self assertMatchesCPythonAt: 'slots_on_int_base'.
	self assertMatchesCPythonAt: 'slots_empty_name'.
	self assertMatchesCPythonAt: 'slots_digit_name'.
	self assertMatchesCPythonAt: 'slots_nul_name'.
	self assertMatchesCPythonAt: 'slots_clashes_with_classvar'.
	self assertMatchesCPythonAt: 'slots_dict_twice'.
	self assertMatchesCPythonAt: 'slots_weakref_twice'.
	self assertMatchesCPythonAt: 'slots_dict_on_plain_base'.
	self assertMatchesCPythonAt: 'slots_weakref_on_plain_base'.

]

{ #category : 'Grail-Tests - Arguments' }
TypeThreeArgTestCase >> testTheArgumentCountIsChecked [
	"The ZERO-argument call is the one that needed its own fix, and it is worth
	saying why a method that already raises did not catch it: type's own
	_new:kw: has answered ``type() takes 1 or 3 arguments'' all along, but
	object class >> ___pyInstantiate___ dispatches 0 positional and no keywords
	straight to __new__, AHEAD of the branch that reaches _new:kw:.  So
	``type()'' inherited object's __new__ and allocated one -- answering
	``<type object at 0x...>'', an instance of type that is not a class."

	self assertMatchesCPythonAt: 'args_none'.
	self assertMatchesCPythonAt: 'args_two'.
	self assertMatchesCPythonAt: 'args_four'.
	self assertMatchesCPythonAt: 'args_keyword_dict'.
	self assertMatchesCPythonAt: 'args_keyword_extra'.

]

{ #category : 'Grail-Tests - Arguments' }
TypeThreeArgTestCase >> testTheArgumentTYPESAreChecked [
	"``bases'' must be a TUPLE and not merely iterable, and ``namespace'' a
	dict and not merely a mapping -- a mappingproxy is READ-ONLY, so accepting
	one silently promises a class namespace that cannot be written back."

	self assertMatchesCPythonAt: 'name_bytes'.
	self assertMatchesCPythonAt: 'bases_list'.
	self assertMatchesCPythonAt: 'ns_mappingproxy'.

]

{ #category : 'Grail-Tests - Arguments' }
TypeThreeArgTestCase >> testTheBASESAreChecked [
	"The layout conflict is the one worth reading twice.  Two bases that each
	carry storage cannot both be the Smalltalk superclass, and
	___selectStorageBase___ simply picked the leftmost -- so ``type('A', (int,
	str), {})'' answered an int-backed class that listed str among its bases
	and behaved as neither.  CPython refuses the same combination for the same
	reason, and the message is its own."

	self assertMatchesCPythonAt: 'base_none'.
	self assertMatchesCPythonAt: 'base_bool'.
	self assertMatchesCPythonAt: 'base_layout_conflict'.

]

{ #category : 'Grail-Tests - __doc__' }
TypeThreeArgTestCase >> testTheNamespaceDecidesTheDocstring [
	"__doc__ takes ANY object in CPython -- bytes and ints included -- so the
	only value that is an error is a str carrying a lone surrogate, which
	cannot be encoded as UTF-8.  Every one of these answered object's own
	docstring before."

	#('str' 'latin1' 'astral' 'nul' 'bytes' 'int' 'none') do: [:k |
		self assertMatchesCPythonAt: 'doc_' , k].
	self assertMatchesCPythonAt: 'doc_surrogate'.
	#('str' 'bytes' 'int' 'none') do: [:k |
		self assertMatchesCPythonAt: 'doc_assign_' , k].

]

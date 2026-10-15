Class {
	#name : 'BuiltinSubclassPropertyTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinSubclassPropertyTestCase >> ___assertKeys___: keyNames [
	"Every named RESULTS entry must be true.  The fixture is self-verifying
	under CPython (scripts/check_python_fixtures.sh runs it), so a true here
	means Grail agrees with a measured CPython answer, not with itself."

	| results |
	results := (self ___loadFixture___) @env1:___pyAttrLoad___: #RESULTS.
	keyNames do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]

]

{ #category : 'Grail-Private' }
BuiltinSubclassPropertyTestCase >> ___loadFixture___ [
	"Fresh load each test -- the fixture's checks all run at import time."

	importlib @env1:modules removeKey: #'builtin_subclass_property' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_subclass_property.py')
		name: 'builtin_subclass_property'.

]

{ #category : 'Grail-Tests - negative' }
BuiltinSubclassPropertyTestCase >> testBuiltinOwnMethodsAreNotAPropertyPair [
	"THE NEGATIVE CONTROL for the fix's second requirement.  Grail's str /
	list / bytes methods are env-1 Smalltalk methods, and several names exist
	in BOTH spellings on one Smalltalk class -- ``strip''/``strip:'',
	``split''/``split:'', ``pop''/``pop:'', ``decode''/``decode:''.  A
	pair-read gated only on ``both spellings, one owner'' takes those for
	properties and answers the STRIPPED STRING where CPython answers a bound
	method.  Requiring the owner to carry ``___pyDefinedClass___'' -- the
	marker only a Python class body gets -- is what separates them, and these
	are the checks that go red without it.

	A name neither side declares still raises AttributeError."

	self ___assertKeys___: #('bare_str_strip_is_callable' 'bare_str_strip_calls'
		'bare_str_split_is_callable' 'bare_str_split_calls'
		'bare_list_pop_is_callable' 'bare_list_pop_calls'
		'bare_bytes_decode_is_callable' 'bare_bytes_decode_calls'
		'bare_BareStr_missing_raises' 'bare_BareList_missing_raises'
		'bare_BareBytes_missing_raises')

]

{ #category : 'Grail-Tests - inheritance' }
BuiltinSubclassPropertyTestCase >> testInheritedAndOverriddenProperty [
	"An heir inherits the property; a subclass's plain ``def'' OUTRANKS it,
	as CPython's MRO says -- which is the pair-read's ``both halves on ONE
	class'' rule doing its job, since the override puts the getter on the
	subclass and leaves the synthesized setter on the base.

	``PropBase.which'' read off the CLASS must not evaluate the getter."

	self ___assertKeys___: #('inherited_getter' 'override_is_callable'
		'override_calls' 'class_read_is_not_value')

]

{ #category : 'Grail-Tests - negative' }
BuiltinSubclassPropertyTestCase >> testOrdinaryMethodsStayFirstClass [
	"The pair-read PERFORMS the getter, so a method mistaken for one comes
	back as its return value.  A plain def, a def with a default argument
	(whose fixed-arity forwarders are shape-identical to a pair) and an
	arity-widening override all stay callable."

	self ___assertKeys___: #('method_is_callable' 'method_calls'
		'default_arg_is_callable' 'default_arg_calls'
		'default_arg_calls_with_arg' 'widened_is_callable' 'widened_calls')

]

{ #category : 'Grail-Tests - getter' }
BuiltinSubclassPropertyTestCase >> testPlainClassPropertyStillFires [
	"The other direction.  A @property on an ordinary class is the case that
	already worked, so it is what a bad fix breaks -- pinned, not assumed."

	self ___assertKeys___: #('plain_getter' 'plain_getter_before_set')

]

{ #category : 'Grail-Tests - getter' }
BuiltinSubclassPropertyTestCase >> testPropertyGetterFiresOnEveryBuiltinRoot [
	"``class T(tuple): @property def first'' answers the getter's VALUE.

	tuple, list, str, dict, set, bytes, float and Exception subclasses all
	answered the raw BoundMethod instead; int subclasses did not, because
	AbstractPyInt is one of the three receiver kinds the old gate named."

	self ___assertKeys___: #('tuple_getter' 'list_getter' 'str_getter'
		'dict_getter' 'set_getter' 'bytes_getter' 'float_getter'
		'int_getter' 'exc_getter')

]

{ #category : 'Grail-Tests - setter and deleter' }
BuiltinSubclassPropertyTestCase >> testReadOnlyPropertyStillRaisesOnAssignment [
	"A @property with no explicit setter is read-only on both kinds of class."

	self ___assertKeys___: #('builtin_sub_readonly_raises'
		'plain_readonly_raises')

]

{ #category : 'Grail-Tests - setter and deleter' }
BuiltinSubclassPropertyTestCase >> testSetterAndDeleterOnBuiltinSubclass [
	"``@val.setter'' already reached a built-in subclass; ``@val.deleter'' did
	not -- ``___pyInstanceDescriptorDelete___:'' carried the same
	``isKindOf: PythonInstance'' gate, so ``del obj.val'' raised
	AttributeError where CPython runs the deleter."

	self ___assertKeys___: #('builtin_sub_setter' 'builtin_sub_deleter'
		'plain_setter' 'plain_deleter')

]

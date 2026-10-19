Class {
	#name : 'InspectClassifyClassAttrsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InspectClassifyClassAttrsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
InspectClassifyClassAttrsTestCase >> setUp [
	"Reload tests/python/inspect_classify_class_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_classify_class_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/inspect_classify_class_attrs.py')
		name: 'inspect_classify_class_attrs'.

]

{ #category : 'Grail-Tests - Attributes no dictionary carries' }
InspectClassifyClassAttrsTestCase >> testAClassNameAnswersTheSameObjectTwice [
	"The substrate half of the test above, asserted on its own so a regression
	says which of the two broke.  CPython stores a heap type's name once and
	hands that object out."

	self assert: (self resultAt: 'class_name_is_stable') asString
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests - Attributes no dictionary carries' }
InspectClassifyClassAttrsTestCase >> testAClassNamesItselfAsTheHomeOfItsOwnName [
	"__name__ and __qualname__ live on ``type'' upstream, which classify drops
	from the metaclass mro, so no __dict__ along either chain holds them: the
	home comes from the IDENTITY search down the class mro.  Grail derived a
	fresh string on every read, so ``getattr(base, name) is get_obj'' never
	matched and both names were dropped from the result altogether -- not
	misattributed, absent."

	self assert: (self resultAt: 'class_name_home') asString
		equals: '[(''data'', True), (''data'', True)]'.

]

{ #category : 'Grail-Tests - Plain classes' }
InspectClassifyClassAttrsTestCase >> testADataAttributeIsFoundAndClassified [
	self assert: (self resultAt: 'plain_data') asString equals: '(''data'', True)'.

]

{ #category : 'Grail-Tests - The metaclass half' }
InspectClassifyClassAttrsTestCase >> testAMetaclassPropertyIsClassifiedAsOne [
	"``kind'' is read off the __dict__ entry, so EnumType.__dict__['__members__']
	has to BE a property -- and the SAME property object EnumType.__members__
	answers, since test_enum compares whole Attribute tuples.  Reading a
	property off the class that owns it answers the descriptor rather than
	calling it, which is what CPython's property.__get__(None, owner) does."

	self assert: (self resultAt: 'metaclass_dunder_kinds') asString
		equals: '[''method'', ''method'', ''method'', ''method'', ''property'']'.

]

{ #category : 'Grail-Tests - Enums' }
InspectClassifyClassAttrsTestCase >> testAnEnumClassifiesNameForName [
	"Exactly the sixteen names CPython reports, which is what test_enum asserts.
	Reaching all of them is what the metaclass half of the algorithm is for --
	__members__ and the container dunders are not on the enum at all."

	self assert: (self resultAt: 'enum_names') asString
		equals: '[''CYAN'', ''MAGENTA'', ''YELLOW'', ''__class__'', ''__contains__'', ''__doc__'', ''__getitem__'', ''__init_subclass__'', ''__iter__'', ''__len__'', ''__members__'', ''__module__'', ''__name__'', ''__qualname__'', ''name'', ''value'']'.

]

{ #category : 'Grail-Tests - Plain classes' }
InspectClassifyClassAttrsTestCase >> testAPlainClassesMethodsAreCandidates [
	"This algorithm starts from dir(), so it can only classify what dir()
	reports -- and dir() on a CLASS used to omit the class's own methods, which
	made every method and property of a plain class invisible here.  Fixed in
	object>>__dir__; see DirOfAClassTestCase for that change and its evidence."

	self assert: (self resultAt: 'dir_of_a_class_lists_its_methods') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'plain_methods_are_found') asString
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests - Attribute' }
InspectClassifyClassAttrsTestCase >> testAttributeIsARealNamedTuple [
	"``from inspect import Attribute'' was an ImportError.  It is built on first
	use rather than at module scope -- inspect is imported early enough that a
	module-level ``from collections import namedtuple'' makes the cycle bite,
	which is the same reason getmembers imports types inside the function."

	self assert: (self resultAt: 'attribute_fields') asString
		equals: '(''x'', ''data'', True, 1)'.
	self assert: (self resultAt: 'attribute_equality') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Enums' }
InspectClassifyClassAttrsTestCase >> testMembersAreDataDefinedByTheirEnum [
	self assert: (self resultAt: 'enum_members') asString
		equals: '[(''data'', True), (''data'', True), (''data'', True)]'.

]

{ #category : 'Grail-Tests - Enums' }
InspectClassifyClassAttrsTestCase >> testNameAndValueAreDataDefinedByEnum [
	"A DynamicClassAttribute is NOT a property upstream -- enum.property derives
	from DynamicClassAttribute, which does not derive from property -- so both
	classify as data.  Grail's DynamicClassAttribute IS a PropertyDescriptor
	subclass, so the property branch had to exclude it explicitly or these two
	came back as 'property'."

	self assert: (self resultAt: 'enum_name_value') asString
		equals: '[(''data'', True), (''data'', True)]'.

]

{ #category : 'Grail-Tests - The metaclass half' }
InspectClassifyClassAttrsTestCase >> testObjectsDictionaryHoldsNoneOfGrailsInternals [
	"object.__dict__ is a fixed, known set upstream; Grail's had twelve entries
	more.  Every one of them was a false home for an attribute defined further
	along the chain -- which is how EnumType's __contains__ came back as
	object's and __getitem__ as PythonInstance's."

	self assert: (self resultAt: 'object_dict_has_no_internals') asString
		equals: '[False, False, False, False, False]'.

]

{ #category : 'Grail-Tests - The metaclass half' }
InspectClassifyClassAttrsTestCase >> testObjectsImplicitHooksCarryTheirCPythonKinds [
	"__init_subclass__ is a classmethod_descriptor upstream and ``kind'' is read
	off the __dict__ entry, so an UnboundMethod there made EVERY class in the
	corpus report it as an ordinary method.  Wrapping affects the reported
	dictionary only: cls.__init_subclass__() still runs through the attribute
	path, which never consults __dict__."

	self assert: (self resultAt: 'init_subclass_kind') asString
		equals: '''class method'''.

]

{ #category : 'Grail-Tests - Kinds' }
InspectClassifyClassAttrsTestCase >> testStaticAndClassMethodsAreDistinguished [
	"``kind'' is read off the __dict__ entry precisely because a staticmethod
	reached through getattr is a plain function and the stored object is what
	tells them apart.  That object is the staticmethod / classmethod descriptor
	now, as in CPython.  This was a recorded gap: Grail stored a plain function
	for both (an UnboundMethod, whose name leaked before the type-name
	correction)."

	self assert: (self resultAt: 'staticmethod_kind') asString
		equals: '[''staticmethod'', ''classmethod'']'.

]

{ #category : 'Grail-Tests - The metaclass half' }
InspectClassifyClassAttrsTestCase >> testTheMetaclassDundersNameTheMetaclass [
	"Was a recorded gap, and the diagnosis in it was wrong in an instructive
	way: the algorithm searched the metaclass mro correctly all along.  What
	was wrong were the DICTIONARIES it searched first.  Enum.__dict__ carried
	EnumType's methods, because Grail writes them as class-side methods on Enum
	-- the same Smalltalk shape a Python @classmethod compiles to, and a
	@classmethod does belong in the class's own __dict__, so the two are told
	apart by their method CATEGORY.  object.__dict__ and PythonInstance.__dict__
	carried Grail's plumbing, which claimed __contains__ and __getitem__.  The
	class mro is searched before the metaclass mro, so whichever of those
	answered first won."

	self assert: (self resultAt: 'metaclass_dunder_home') asString
		equals: '[True, True, True, True, True]'.

]

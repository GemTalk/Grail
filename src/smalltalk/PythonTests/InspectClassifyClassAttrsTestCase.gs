! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectClassifyClassAttrsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectClassifyClassAttrsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectClassifyClassAttrsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectClassifyClassAttrsTestCase
!
! ``inspect.classify_class_attrs'' -- where did this attribute come from, and
! what KIND is it?  Grail had neither it nor ``inspect.Attribute'', so
! ``from inspect import Attribute'' was an ImportError and test_enum's
! TestStdLib.test_inspect_classify_class_attrs never ran a line of its body.
!
! Ported from CPython rather than approximated, because each part of it is
! load-bearing: the search covers the METACLASS mro as well as the class mro, so
! an attribute stored on the metaclass names that metaclass as its home rather
! than None; ``kind'' is read off the __dict__ entry rather than the getattr
! result, because the two differ exactly where the answer is interesting; and
! DynamicClassAttributes are appended to the candidate names because they hide
! from dir().
!
! TWO ADAPTATIONS, both forced by the substrate and both NARROWING:
!
!   * CPython builds the metaclass mro as ``getmro(type(cls))'' less type and
!     object.  Taken literally that walks into GemStone's own metaclass chain
!     (Class, Metaclass3, Module, Behavior), which is not made of Python objects
!     and blows up on contact.  The metaclasses OF THE CLASSES IN THE MRO are
!     the same set for anything Grail models and stay inside Python.
!   * CPython asks the metaclass's ``__getattr__'' slot UNBOUND, as
!     ``srch_cls.__getattr__(cls, name)''.  A Grail metaclass is an ordinary
!     class object, so that comes back BOUND and the two arguments arrive one too
!     many; the mismatch died as a MessageNotUnderstood Python cannot catch.
!
! ONE SMALLTALK FIX went with it.  ___pyMetaclass___ asks the receiver for its
! ___grailDeclaredMetaclass___, whose default lives on ``object class'' -- and a
! METACLASS receiver does not reach it, because Metaclass3's chain does not pass
! object class.  Only reachable at all since type() began handing metaclasses out
! to Python, and then any ordinary introspection on one walked into an
! uncatchable Smalltalk error.  ___grailDeclaredMetaclassOrNil___ tests the
! lookup instead of catching it, so a genuine MNU from inside a class's own
! implementation still propagates.
!
! THE SECOND HALF, added later, was about the DICTIONARIES rather than about the
! algorithm: every attribute came back with the right name and the wrong home.
! Grail writes EnumType's protocol as class-side methods on Enum / IntEnum /
! StrEnum, which is the same Smalltalk shape a Python @classmethod compiles to,
! so Enum.__dict__ advertised __iter__, __len__ and __members__ and the class
! mro -- searched first -- stopped there.  object.__dict__ and
! PythonInstance.__dict__ carried Grail's own plumbing and claimed __contains__
! and __getitem__ the same way.  And __name__ / __qualname__ are in no __dict__
! along either chain (CPython keeps them on ``type''), so their home comes from
! an IDENTITY search that a freshly derived string could never satisfy.  See
! object >> ___grailPythonDictNames___, ___grailMetaclassOwnedCategory___: and
! ___grailInternedNameString___:.
!
! WHAT THIS DOES NOT CLOSE, and why -- inherited from the substrate:
!
!   * a USER class's __dict__ holds an UnboundMethod where CPython holds a
!     staticmethod or classmethod OBJECT, and ``kind'' is read off that object
!     precisely because it is what tells the two apart.  object's own three
!     hooks are wrapped, since their kinds are fixed and known; a class body's
!     defs would need @classmethod told from metaclass method at compile time,
!     which the category marker settles only for enums.
!
! Drives tests/python/inspect_classify_class_attrs.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectClassifyClassAttrsTestCase removeAllMethods.
InspectClassifyClassAttrsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectClassifyClassAttrsTestCase
setUp
	"Reload tests/python/inspect_classify_class_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_classify_class_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/inspect_classify_class_attrs.py')
		name: 'inspect_classify_class_attrs'.
%

category: 'Grail-Private'
method: InspectClassifyClassAttrsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Attribute'
method: InspectClassifyClassAttrsTestCase
testAttributeIsARealNamedTuple
	"``from inspect import Attribute'' was an ImportError.  It is built on first
	use rather than at module scope -- inspect is imported early enough that a
	module-level ``from collections import namedtuple'' makes the cycle bite,
	which is the same reason getmembers imports types inside the function."

	self assert: (self resultAt: 'attribute_fields') asString
		equals: '(''x'', ''data'', True, 1)'.
	self assert: (self resultAt: 'attribute_equality') asString equals: 'True'.
%

category: 'Grail-Tests - Enums'
method: InspectClassifyClassAttrsTestCase
testAnEnumClassifiesNameForName
	"Exactly the sixteen names CPython reports, which is what test_enum asserts.
	Reaching all of them is what the metaclass half of the algorithm is for --
	__members__ and the container dunders are not on the enum at all."

	self assert: (self resultAt: 'enum_names') asString
		equals: '[''CYAN'', ''MAGENTA'', ''YELLOW'', ''__class__'', ''__contains__'', ''__doc__'', ''__getitem__'', ''__init_subclass__'', ''__iter__'', ''__len__'', ''__members__'', ''__module__'', ''__name__'', ''__qualname__'', ''name'', ''value'']'.
%

category: 'Grail-Tests - Enums'
method: InspectClassifyClassAttrsTestCase
testMembersAreDataDefinedByTheirEnum
	self assert: (self resultAt: 'enum_members') asString
		equals: '[(''data'', True), (''data'', True), (''data'', True)]'.
%

category: 'Grail-Tests - Enums'
method: InspectClassifyClassAttrsTestCase
testNameAndValueAreDataDefinedByEnum
	"A DynamicClassAttribute is NOT a property upstream -- enum.property derives
	from DynamicClassAttribute, which does not derive from property -- so both
	classify as data.  Grail's DynamicClassAttribute IS a PropertyDescriptor
	subclass, so the property branch had to exclude it explicitly or these two
	came back as 'property'."

	self assert: (self resultAt: 'enum_name_value') asString
		equals: '[(''data'', True), (''data'', True)]'.
%

category: 'Grail-Tests - Plain classes'
method: InspectClassifyClassAttrsTestCase
testADataAttributeIsFoundAndClassified
	self assert: (self resultAt: 'plain_data') asString equals: '(''data'', True)'.
%

category: 'Grail-Tests - Plain classes'
method: InspectClassifyClassAttrsTestCase
testAPlainClassesMethodsAreCandidates
	"This algorithm starts from dir(), so it can only classify what dir()
	reports -- and dir() on a CLASS used to omit the class's own methods, which
	made every method and property of a plain class invisible here.  Fixed in
	object>>__dir__; see DirOfAClassTestCase for that change and its evidence."

	self assert: (self resultAt: 'dir_of_a_class_lists_its_methods') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'plain_methods_are_found') asString
		equals: '[True, True, True]'.
%

category: 'Grail-Tests - Known gaps'
method: InspectClassifyClassAttrsTestCase
testStaticAndClassMethodsAreNotDistinguishableWhichIsAKnownGap
	"Recorded, NOT endorsed.  ``kind'' is read off the __dict__ entry precisely
	because a staticmethod reached through getattr is a plain function and the
	stored object is what tells them apart.  Grail stores an UnboundMethod for
	both, so the distinction is not there to be read."

	self assert: (self resultAt: 'staticmethod_kind_is_a_known_gap') asString
		equals: '[''UnboundMethod'', ''UnboundMethod'']'.
%

category: 'Grail-Tests - The metaclass half'
method: InspectClassifyClassAttrsTestCase
testTheMetaclassDundersNameTheMetaclass
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
%

category: 'Grail-Tests - The metaclass half'
method: InspectClassifyClassAttrsTestCase
testAMetaclassPropertyIsClassifiedAsOne
	"``kind'' is read off the __dict__ entry, so EnumType.__dict__['__members__']
	has to BE a property -- and the SAME property object EnumType.__members__
	answers, since test_enum compares whole Attribute tuples.  Reading a
	property off the class that owns it answers the descriptor rather than
	calling it, which is what CPython's property.__get__(None, owner) does."

	self assert: (self resultAt: 'metaclass_dunder_kinds') asString
		equals: '[''method'', ''method'', ''method'', ''method'', ''property'']'.
%

category: 'Grail-Tests - The metaclass half'
method: InspectClassifyClassAttrsTestCase
testObjectsDictionaryHoldsNoneOfGrailsInternals
	"object.__dict__ is a fixed, known set upstream; Grail's had twelve entries
	more.  Every one of them was a false home for an attribute defined further
	along the chain -- which is how EnumType's __contains__ came back as
	object's and __getitem__ as PythonInstance's."

	self assert: (self resultAt: 'object_dict_has_no_internals') asString
		equals: '[False, False, False, False, False]'.
%

category: 'Grail-Tests - The metaclass half'
method: InspectClassifyClassAttrsTestCase
testObjectsImplicitHooksCarryTheirCPythonKinds
	"__init_subclass__ is a classmethod_descriptor upstream and ``kind'' is read
	off the __dict__ entry, so an UnboundMethod there made EVERY class in the
	corpus report it as an ordinary method.  Wrapping affects the reported
	dictionary only: cls.__init_subclass__() still runs through the attribute
	path, which never consults __dict__."

	self assert: (self resultAt: 'init_subclass_kind') asString
		equals: '''class method'''.
%

category: 'Grail-Tests - Attributes no dictionary carries'
method: InspectClassifyClassAttrsTestCase
testAClassNamesItselfAsTheHomeOfItsOwnName
	"__name__ and __qualname__ live on ``type'' upstream, which classify drops
	from the metaclass mro, so no __dict__ along either chain holds them: the
	home comes from the IDENTITY search down the class mro.  Grail derived a
	fresh string on every read, so ``getattr(base, name) is get_obj'' never
	matched and both names were dropped from the result altogether -- not
	misattributed, absent."

	self assert: (self resultAt: 'class_name_home') asString
		equals: '[(''data'', True), (''data'', True)]'.
%

category: 'Grail-Tests - Attributes no dictionary carries'
method: InspectClassifyClassAttrsTestCase
testAClassNameAnswersTheSameObjectTwice
	"The substrate half of the test above, asserted on its own so a regression
	says which of the two broke.  CPython stores a heap type's name once and
	hands that object out."

	self assert: (self resultAt: 'class_name_is_stable') asString
		equals: '[True, True]'.
%

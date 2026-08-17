! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassMetaclassIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassMetaclassIdentityTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassMetaclassIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassMetaclassIdentityTestCase
!
! What is a class an INSTANCE of?
!
! CPython holds one invariant: ``x.__class__ is type(x)'', for every x.  Grail
! broke it for every CLASS receiver, because the two spellings took different
! routes and neither was right:
!
!     Color.__class__     the per-class Smalltalk metaclass (``Color class'')
!     type(Color)         the single canonical ``type'' object
!
! so the two were never the same object, and neither was EnumType.  The first
! leaks a GemStone artefact -- Grail gives every class its own metaclass, an
! anonymous thing with no Python name that no Python program should see.  The
! second is right for an ordinary class and wrong for one that has a metaclass.
!
! Both now go through object >> ___pyMetaclass___: a metaclass DECLARED by a
! Smalltalk-written ancestor, else ``type''.  Only Enum declares one (EnumType),
! so the rule stays general rather than special-casing enum -- a Smalltalk class
! that really has a Python metaclass says so.
!
! An explicit ``metaclass='' IS now consulted, after the declared one so that an
! enum keeps answering EnumType.  Preferring the record was tried and reverted
! ONCE, when ``class Meta(type)'' still rooted at a substitute and copy()'s
! ``issubclass(type(x), type)'' therefore answered False; PyType removed that
! obstacle, and testAnExplicitMetaclassIsReported carries the history.
!
! The ancestor search runs along the PYTHON MRO, not the Smalltalk superclass
! chain, so ``class Mixed(int, Enum)'' -- rooted at Grail's int, never passing
! Enum -- is covered.  That mirrors CPython, which picks the most derived
! metaclass among the bases.  IntEnum and StrEnum are the same shape and cannot
! use the walk (Smalltalk-written, so no registered bases to walk), so each
! declares EnumType itself.
!
! TWO THINGS THIS BROKE ON THE WAY, both caught by measurement and both fixed:
!
!   * type() has always asked __class__, and several Python types are backed by
!     more than one GemStone class -- an int is a SmallInteger, and __class__ is
!     the override that normalises it.  Routing type() to ``self class'' instead
!     made type(1) answer SmallInteger and broke eleven test_enum tests.
!   * ``class auto_enum(type(Enum))'' -- how a Python program writes a metaclass
!     -- used to reach the class machinery as the canonical ``type'', a
!     BoundMethod, which has a graceful path that builds the class as a plain
!     object subclass.  It reached it that way ONLY because type(Enum) answered
!     ``type''; once type() told the truth the same line arrived as a Metaclass3
!     and raised ``cannot subclass a non-class base''.  object >>
!     ___subclass___: now gives a metaclass base the same degradation, which is
!     what test_multiple_mixin_mro needs.
!
! Drives tests/python/class_metaclass_identity.py.  test_enum
! TestStdLib.test_inspect_getmembers.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassMetaclassIdentityTestCase removeAllMethods.
ClassMetaclassIdentityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassMetaclassIdentityTestCase
setUp
	"Reload tests/python/class_metaclass_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_metaclass_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_metaclass_identity.py')
		name: 'class_metaclass_identity'.
%

category: 'Grail-Private'
method: ClassMetaclassIdentityTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The invariant'
method: ClassMetaclassIdentityTestCase
testClassAndTypeAgree
	"``x.__class__ is type(x)''.  For a CLASS receiver the two answered
	different objects -- the Smalltalk metaclass and the canonical ``type'' --
	so this was False for every class in the corpus."

	self assert: (self resultAt: 'invariant_classes') asString
		equals: '[True, True, True]'.
	self assert: (self resultAt: 'invariant_instances') asString
		equals: '[True, True, True]'.
%

category: 'Grail-Tests - Enums'
method: ClassMetaclassIdentityTestCase
testAnEnumsMetaclassIsEnumType
	"CPython: type(Color) is enum.EnumType, which in Grail IS ``Enum class''.
	inspect.getmembers(Color)['__class__'] is asserted to be exactly that."

	self assert: (self resultAt: 'enum_metaclass') asString equals: '[True, True]'.
%

category: 'Grail-Tests - Enums'
method: ClassMetaclassIdentityTestCase
testItIsFoundThroughASecondaryBase
	"``class Mixed(int, Enum)'' is rooted at Grail's int, so its SMALLTALK chain
	never passes Enum -- only the MRO walk finds it.  CPython reaches the same
	answer by picking the most derived metaclass among the bases."

	self assert: (self resultAt: 'secondary_base_metaclass') asString equals: 'True'.
%

category: 'Grail-Tests - Enums'
method: ClassMetaclassIdentityTestCase
testTheSmalltalkEnumRootsDeclareItThemselves
	"IntEnum and StrEnum are the same shape as Mixed and cannot use the same
	route: being Smalltalk-written they have no registered bases for the walk to
	find.  Each declares EnumType directly; IntFlag inherits IntEnum's."

	self assert: (self resultAt: 'enum_roots_metaclass') asString equals: '[True, True]'.
%

category: 'Grail-Tests - Ordinary classes'
method: ClassMetaclassIdentityTestCase
testAnOrdinaryClassesMetaclassIsType
	"Unchanged, and the reason the resolver ends at the canonical ``type''
	object rather than at the receiver's own metaclass: ``type(cls) is type''
	is what it answered before and what isinstance(cls, type) agrees with."

	self assert: (self resultAt: 'plain_metaclass') asString equals: '[True, True]'.
	self assert: (self resultAt: 'isinstance_agrees') asString
		equals: '[True, True, True, False]'.
%

category: 'Grail-Tests - Regressions'
method: ClassMetaclassIdentityTestCase
testScalarsStillReportTheirPythonType
	"REGRESSION GUARD.  type() has always asked __class__, and one Python type
	is backed by several GemStone classes -- an int is a SmallInteger, and the
	__class__ override is what normalises it.  Answering ``self class'' instead
	made type(1) answer SmallInteger; eleven test_enum tests caught it."

	self assert: (self resultAt: 'scalar_types') asString
		equals: '[True, True, True, True]'.
%

category: 'Grail-Tests - Regressions'
method: ClassMetaclassIdentityTestCase
testSubclassingAMetaclassStillBuildsTheClass
	"REGRESSION GUARD.  ``class auto_enum(type(Enum))'' is how a Python program
	writes a metaclass and must not raise, even though Grail does not model one.
	It used to reach the class machinery as the canonical ``type'' -- a
	BoundMethod, which has a graceful path -- only because type(Enum) answered
	``type''.  test_enum's test_multiple_mixin_mro."

	self assert: (self resultAt: 'metaclass_subclass_builds') asString
		equals: '''auto_enum'''.
%

category: 'Grail-Tests - Metaclass identity'
method: ClassMetaclassIdentityTestCase
testAnExplicitMetaclassIsReported
	"``class C(metaclass=Meta)'' -- type(C) is Meta, and isinstance(C, Meta).
	This was the known gap this test case carried, and the note it carried is
	worth keeping because it names exactly what closing it took.

	Reporting the record was TRIED and reverted once.  ___grailMetaclass___ had
	it all along, so the resolver could simply prefer it -- and doing so
	regressed test_copy: copy() decides a class is atomic with
	``issubclass(type(x), type)'', and Grail rooted ``class Meta(type)'' at a
	substitute, so nothing linked Meta back to ``type'' and that test answered
	False.  With type(C) still ``type'' the atomic branch was reached directly,
	which is why the LESS truthful answer worked and the more truthful one
	broke it.

	So closing it was never a change to the resolver.  It was making a class
	that subclasses ``type'' REMEMBER that it did -- PyType, a real ``type''
	object for a metaclass to root at.  With that in place the resolver change
	is the two lines the old note predicted, and the copy() test is satisfied
	through the ancestry rather than by declining to answer.

	isinstance moves with it and not before it: isinstance(C, M) is
	issubclass(type(C), M), so while type(C) was ``type'' the question was
	``issubclass(type, M)'' -- False for every M."

	self assert: (self resultAt: 'explicit_metaclass') asString equals: 'True'.
	self assert: (self resultAt: 'explicit_metaclass_isinstance') asString
		equals: 'True'.
%

category: 'Grail-Tests - Known gaps'
method: ClassMetaclassIdentityTestCase
testAbcDoesNotDeclareItsMetaclassWhichIsAVendoredDivergence
	"CPython: type(ABC) is ABCMeta.  Grail answers ``type'', and NOT because
	type() cannot report a metaclass -- the test above shows it now does.  The
	vendored abc.py writes ``class ABC:'' where upstream writes ``class
	ABC(metaclass=ABCMeta)'', so there is no keyword here to report.

	Kept as a gap rather than fixed in passing because the divergence is a
	deliberate one with its own reasoning (see the note in src/python/stdlib/
	abc.py: ABCMeta's Python-level __instancecheck__ is a cost every ``class
	Foo(ABC)'' would then pay).  Closing it is a change to abc.py, measured on
	its own."

	self assert: (self resultAt: 'abc_metaclass_is_a_vendored_divergence')
		asString equals: 'False'.
%

category: 'Grail-Tests - Metaclass identity'
method: ClassMetaclassIdentityTestCase
testAMetaclassRemembersThatItSubclassedType
	"``issubclass(Meta, type)'' for ``class Meta(type)''.  This was False for
	as long as there was no ``type'' OBJECT to inherit from: a class cannot
	subclass a BoundMethod, so ClassDefAst rooted every metaclass at
	PythonInstance and nothing linked it back to ``type''.

	It is the assertion the known-gap note above named as the thing that would
	have to change, and it is what unblocks reporting a declared ``metaclass=''
	from type()."

	self assert: (self resultAt: 'subclass_of_type') asString equals: 'True'.
%

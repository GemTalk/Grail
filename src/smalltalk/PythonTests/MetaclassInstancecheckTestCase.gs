! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassInstancecheckTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassInstancecheckTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassInstancecheckTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassInstancecheckTestCase
!
! __instancecheck__ / __subclasscheck__ -- the protocol isinstance() and
! issubclass() consult BEFORE doing their own work:
!
!     class ABC(type):
!         def __instancecheck__(cls, inst): ...
!         def __subclasscheck__(cls, sub): ...
!     class Integer(metaclass=ABC):
!         __subclass__ = {int}
!
!     isinstance(42, Integer)   -> ABC.__instancecheck__(Integer, 42)
!     issubclass(int, Integer)  -> ABC.__subclasscheck__(Integer, int)
!
! This is the whole ABC mechanism: it is how a register()ed virtual subclass and
! __subclasshook__ become visible to isinstance.  Grail never looked, so a
! metaclass defining either was ignored and both builtins fell through to their
! own type walk.
!
! THREE separate things had to work, and only the first is the obvious one.
!
! (1) isinstance/issubclass delegate to the hook.  Deliberately only for a
!     metaclass written in PYTHON: Grail already defines __instancecheck__:
!     class-side for some builtins (Integer class), taking the class as RECEIVER
!     with one argument -- a different convention from Python's (cls, obj).
!     Invoking those through this path broke every isinstance(x, int) in the
!     corpus, which is why ___metaclassCheckHook___ never probes ``self class''.
!
! (2) ``Integer.__subclasscheck__'' has to RESOLVE -- a metaclass method reached
!     through the class, bound with the class as its cls parameter.  Grail
!     RECORDS a ``metaclass='' rather than building the class through one, so the
!     class is not a Smalltalk instance of the metaclass and ordinary lookup
!     found nothing.  BoundMethod gained the bound-receiver half of its
!     non-virtual dispatch for this; it already had the receiver-less half.
!
! (3) the same call from INSIDE a metaclass method.  There
!     ``cls.__subclasscheck__(c)'' compiles to a DIRECT SEND, not an attribute
!     load, so it bypasses (2) entirely and is picked up in doesNotUnderstand:
!     instead -- which is where the class's own metaclass, a Metaclass3, was
!     raising.
!
! ``cls.mro()'' is here for the same reason: a metaclass computing subclass
! relationships reaches for it and Grail had only ``__mro__''.
!
! Closes test_typechecks outright (ERROR/3 -> OK).  The fixture is self-running
! (docs/Testing_Guide.md): all eight checks answer True under CPython 3.14 too,
! so the agreement is machine-checked rather than asserted by hand.
!
! Drives tests/python/metaclass_instancecheck.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassInstancecheckTestCase removeAllMethods.
MetaclassInstancecheckTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassInstancecheckTestCase
setUp
	"Reload tests/python/metaclass_instancecheck.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_instancecheck' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_instancecheck.py')
		name: 'metaclass_instancecheck'.
%

category: 'Grail-Private'
method: MetaclassInstancecheckTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - The builtins delegate'
method: MetaclassInstancecheckTestCase
testIsinstanceConsultsTheMetaclass
	"42 is not an Integer by type; the metaclass says it is."

	self assert: (self check: #'isinstance_consults_the_metaclass') equals: true.
%

category: 'Grail-Tests - The builtins delegate'
method: MetaclassInstancecheckTestCase
testIssubclassConsultsTheMetaclass
	self assert: (self check: #'issubclass_consults_the_metaclass') equals: true.
%

category: 'Grail-Tests - The builtins delegate'
method: MetaclassInstancecheckTestCase
testTheTupleFormConsultsItToo
	"A classinfo tuple recurses per element, so each element reaches the hook."

	self assert: (self check: #'the_tuple_form_consults_it_too') equals: true.
%

category: 'Grail-Tests - Reaching the hook'
method: MetaclassInstancecheckTestCase
testTheHookResolvesAsAnAttribute
	"``Integer.__subclasscheck__'' is a metaclass method bound with the class as
	its cls parameter -- callable directly, not only through issubclass."

	self assert: (self check: #'the_hook_resolves_as_an_attribute') equals: true.
%

category: 'Grail-Tests - Reaching the hook'
method: MetaclassInstancecheckTestCase
testAMetaclassMethodMayCallItsSibling
	"Inside a compiled body ``cls.__subclasscheck__(c)'' is a DIRECT SEND, not an
	attribute load, so it bypasses the attribute path and is picked up where the
	send fails."

	self assert: (self check: #'a_metaclass_method_may_call_its_sibling') equals: true.
%

category: 'Grail-Tests - Reaching the hook'
method: MetaclassInstancecheckTestCase
testMroIsCallable
	"CPython's callable spelling of __mro__, answering a list.  A metaclass
	computing subclass relationships reaches for it."

	self assert: (self check: #'mro_is_callable_and_lists_the_class_first') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: MetaclassInstancecheckTestCase
testInheritanceStillWorksNormally
	self assert: (self check: #'inheritance_still_works_normally') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: MetaclassInstancecheckTestCase
testOrdinaryClassesAreUnaffected
	"Guard rail.  isinstance is the hottest builtin there is: with no recorded
	metaclass there is no hook, and the built-in walk decides exactly as before."

	self assert: (self check: #'ordinary_classes_are_unaffected') equals: true.
%

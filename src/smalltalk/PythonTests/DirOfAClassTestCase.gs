! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DirOfAClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DirOfAClassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DirOfAClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DirOfAClassTestCase
!
! ``dir()'' on a CLASS did not list the class's methods.
!
! Grail splits in two what CPython keeps in one dict.  A class body's DATA
! attributes (``data = 42'') compile to an accessor pair on the METACLASS; the
! class's METHODS are env-1 selectors on the class itself.  object>>__dir__
! scanned ``self class'' -- for a class receiver, its metaclass -- and so
! answered exactly one of the two halves:
!
!     dir(C)     ``data'', and no ``meth''
!     dir(C())   both (an INSTANCE's ``self class'' IS the class)
!
! CPython's type.__dir__ merges cls.__dict__ with each base's and DELIBERATELY
! omits the metaclass ("methods belonging to the metaclass would probably be more
! confusing than helpful").  Grail cannot omit it -- that is where half the
! answer is stored -- so the union of both chains is the closest reachable thing.
! What that costs is the metaclass's own selectors leaking in, which they did
! before this change as well; what it buys is the class's methods being there at
! all.
!
! THE SECOND HALF OF THE SAME DEFECT lives in inspect.  ``C.meth'' is an
! UnboundMethod, which is what a class hands back where CPython hands back a
! plain function -- ``C().meth'' is a BoundMethod, exactly CPython's
! function/method split.  inspect.isfunction did not know the name, so
! isroutine() was False for every method reached through its class and
! classify_class_attrs called them all "data".  Listing the methods without this
! would have moved them from missing to misfiled.
!
! ONE DEFECT THIS EXPOSED RATHER THAN CAUSED.  test_collections asserts
! ``dir(UserDict) >= dir(dict)'', and it had been passing vacuously: dir(dict)
! never reported __reversed__, because that is a method on the class chain.  With
! the chain scanned the assertion started failing and named a real bug --
! upstream's UserDict subclasses MutableMapping and inherits ``__reversed__ =
! None'' from Mapping, and Grail's standalone UserDict never said so, so
! reversed() fell through to the SEQUENCE protocol that __len__ and __getitem__
! make it look like and raised ``KeyError: 1'' where CPython raises ``TypeError:
! 'UserDict' object is not reversible''.
!
! WHAT THIS DOES NOT CLOSE, both about what a class __dict__ HOLDS rather than
! about dir(), and each its own piece of work:
!
!   * a property reached through the class is not the property object -- ``C.prop''
!     answers an UnboundMethod, so it classifies as a method where CPython says
!     property.  It works correctly on an INSTANCE, which is asserted here so the
!     gap stays narrow.
!   * a staticmethod and a classmethod are both stored as an UnboundMethod, and
!     ``kind'' is read off the stored object precisely because that object is
!     what tells them apart.
!
! Drives tests/python/dir_of_a_class.py.  test_enum
! TestStdLib.test_inspect_classify_class_attrs; the same list reaches
! inspect.getmembers and pydoc.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DirOfAClassTestCase removeAllMethods.
DirOfAClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DirOfAClassTestCase
setUp
	"Reload tests/python/dir_of_a_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dir_of_a_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_of_a_class.py')
		name: 'dir_of_a_class'.
%

category: 'Grail-Private'
method: DirOfAClassTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - dir()'
method: DirOfAClassTestCase
testDirOfAClassListsBothHalves
	"data / base_data come from the METACLASS chain (a class body's data
	attributes compile to accessors there); meth / inherited / prop / stat /
	cls_m come from the CLASS chain.  Only the first half was ever scanned."

	self assert: (self resultAt: 'dir_of_class_has_every_name') asString
		equals: '[True, True, True, True, True, True, True]'.
%

category: 'Grail-Tests - dir()'
method: DirOfAClassTestCase
testAClassAndItsInstanceAgree
	"For a class with no instance attributes CPython answers the same list
	either way, because dir(instance) is list(inst.__dict__) + dir(type(inst)).
	The two disagreeing is what made the defect visible: dir(C()) had ``meth''
	and dir(C) did not."

	self assert: (self resultAt: 'dir_of_class_equals_dir_of_instance') asString
		equals: 'True'.
%

category: 'Grail-Tests - inspect'
method: DirOfAClassTestCase
testAnUnboundMethodIsARoutine
	"``C.meth'' is an UnboundMethod -- what a class hands back where CPython
	hands back a plain function.  isfunction did not know the name, so isroutine
	was False for every method reached through its class."

	self assert: (self resultAt: 'a_class_method_is_a_routine') asString
		equals: '[True, True]'.
%

category: 'Grail-Tests - inspect'
method: DirOfAClassTestCase
testTheFunctionMethodSplitIsPreserved
	"The other side of the same coin, and the reason widening isfunction is
	right rather than merely convenient: through an INSTANCE it is a BOUND
	method and NOT a function, which is precisely CPython's split."

	self assert: (self resultAt: 'an_instance_method_is_bound') asString
		equals: '[True, False]'.
%

category: 'Grail-Tests - inspect'
method: DirOfAClassTestCase
testClassifyClassAttrsNowSeesTheMethods
	"Listed AND classified -- data stays data, methods become methods, and each
	names the class that actually defines it rather than the one asked."

	self assert: (self resultAt: 'classify_kinds') asString
		equals: '[''data'', ''data'', ''method'', ''method'']'.
	self assert: (self resultAt: 'classify_homes') asString
		equals: '[True, True, True, True]'.
%

category: 'Grail-Tests - UserDict'
method: DirOfAClassTestCase
testAUserDictIsNotReversible
	"REGRESSION GUARD for a bug this EXPOSED rather than caused.
	test_collections asserts dir(UserDict) >= dir(dict), which had been passing
	vacuously because dir(dict) never reported __reversed__.  Upstream's
	UserDict subclasses MutableMapping and inherits ``__reversed__ = None'' from
	Mapping; Grail's is standalone and never said so, so reversed() fell through
	to the SEQUENCE protocol that __len__ and __getitem__ make it look like and
	asked for key 1."

	self assert: (self resultAt: 'reversed_userdict') asString
		equals: 'TypeError: ''UserDict'' object is not reversible'.
	self assert: (self resultAt: 'userdict_has_every_dict_name') asString
		equals: '[]'.
%

category: 'Grail-Tests - Known gaps'
method: DirOfAClassTestCase
testAPropertyReachedThroughItsClassIsAKnownGap
	"Recorded, NOT endorsed.  ``C.prop'' should answer the property OBJECT --
	CPython does not invoke a descriptor reached through the class -- and Grail
	answers an UnboundMethod, so it classifies as a method.  The third value
	pins that the INSTANCE path is correct, so the gap stays narrow: this is
	about what the class hands back, not about properties working."

	self assert: (self resultAt: 'property_on_a_class_is_a_known_gap') asString
		equals: '[''function'', ''method'', 1]'.
%

category: 'Grail-Tests - Known gaps'
method: DirOfAClassTestCase
testStaticAndClassMethodsAreNotDistinguishableWhichIsAKnownGap
	"Recorded, NOT endorsed.  ``kind'' is read off the __dict__ entry precisely
	because a staticmethod reached through getattr is a plain function and the
	stored object is what tells them apart.  Grail stores an UnboundMethod for
	both, so the distinction is not there to be read.  They were classified
	``method'' before this change too -- what changed is that they are now
	reached by the same route as every other method rather than by accident."

	self assert: (self resultAt: 'staticmethod_kind_is_a_known_gap') asString
		equals: '[''method'', ''method'']'.
%

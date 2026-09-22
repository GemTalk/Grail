! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DirSlotsAndTracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DirSlotsAndTracebackTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DirSlotsAndTracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DirSlotsAndTracebackTestCase
!
! Two things dir() reports that Grail got wrong, both of them about WHERE THE
! TYPE COMES FROM.
!
! A CLASS MAY SHADOW ITS OWN ``__class__''.  CPython's object.__dir__ reaches the
! type through ``getattr(self, '__class__')'', and that read can FAIL:
! ``__slots__ = ['__class__']'' names a real per-instance slot, which starts
! UNSET, so the read raises AttributeError until something assigns it.  dir() is
! then left with the instance's own names and nothing from the type -- test_dir
! calls it ``an ugly trick to cause getattr(f, '__class__') to fail''.
!
! Grail took ``self class'' directly, so no shadowing could reach it: the read
! answered the real Smalltalk class and dir() answered the whole type chain.
! Going through the attribute read makes the degradation happen for the same
! reason CPython's does, rather than special-casing the trick -- which is why
! the controls below still pass unchanged.
!
! TWO THINGS HAD TO MOVE FOR IT, and the second is the one that bites.  The
! __class__ SHORTCUT in the attribute loader already yields to a class body
! declaring its own ``__class__'' -- the property form, which the abstract-class
! protocol depends on -- and a slot is not a class attribute, so it did not
! yield to one.  And the slot has to be read RAW: a compiled slot getter ends
! ``ifNil: [self ___pyAttrLoad___: #'x']'', because nil is the unbound token and
! the loader is what turns it into the right error.  Asking the accessor from
! INSIDE ___pyAttrLoad___ recurses until the stack gives out; that was measured,
! not predicted.  ___grailRawSlotValue___: reads the storage directly instead.
!
! A TRACEBACK REPORTS EXACTLY FOUR NAMES.  CPython's traceback type contributes
! no dunders at all, and test_dir asserts the LENGTH, so an extra name is a
! failure and not a cosmetic difference.  Grail's generic __dir__ answered 29:
! every dunder object contributes, and NONE of the four, because tb_frame and
! friends are read through the attribute chain rather than compiled as plain
! selectors.  The list was both too long and missing the only names anyone asks
! a traceback for.
!
! Drives tests/python/dir_slots_and_traceback.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_dir.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DirSlotsAndTracebackTestCase removeAllMethods.
DirSlotsAndTracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DirSlotsAndTracebackTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dir_slots_and_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_slots_and_traceback.py')
		name: 'dir_slots_and_traceback'.
%

category: 'Grail-Private'
method: DirSlotsAndTracebackTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - a slot shadows __class__'
method: DirSlotsAndTracebackTestCase
testTheSlotWinsAndStartsUnset
	"The read raises until something assigns it, which is the whole of the
	trick.  Reading it RAW is what makes this possible: the accessor pair
	ends in a call back into the loader, and asking it from inside the loader
	recursed until the stack gave out."

	self assertMatchesCPythonAt: 'reading_it_raises'.
	self assertMatchesCPythonAt: 'getattr_raises'.
%

category: 'Grail-Tests - a slot shadows __class__'
method: DirSlotsAndTracebackTestCase
testDirDegradesToTheInstancesOwnNames
	"CPython's object.__dir__ reaches the type through getattr, so when that
	read fails dir() has only the instance dict left.  Grail took ``self
	class'' and could not fail."

	self assertMatchesCPythonAt: 'dir_drops_the_type'.
	self assertMatchesCPythonAt: 'dir_keeps_own_names'.
	self assertMatchesCPythonAt: 'assigning_the_slot'.
%

category: 'Grail-Tests - a traceback'
method: DirSlotsAndTracebackTestCase
testATracebackReportsExactlyFourNames
	"The LENGTH is asserted upstream, so an extra name fails.  Grail answered
	29 -- every inherited dunder, and none of the four."

	self assertMatchesCPythonAt: 'traceback_dir'.
	self assertMatchesCPythonAt: 'traceback_dir_length'.
%

category: 'Grail-Tests - Controls'
method: DirSlotsAndTracebackTestCase
testTheOtherShadowStillWorks
	"THE CONTROL FOR THE GATE.  ``__class__ = property(...)'' is the other way
	to shadow it, and the legacy abstract-class protocol depends on it -- the
	shortcut already yielded to that and must keep doing so."

	self assertMatchesCPythonAt: 'property_shadow_still_works'.
%

category: 'Grail-Tests - Controls'
method: DirSlotsAndTracebackTestCase
testEveryOtherObjectIsUnaffected
	"The shortcut yields ONLY to a declared slot.  An ordinary instance, a
	class and a built-in all answer their real type, dir() reports the full
	chain, and isinstance and type() are untouched."

	self assertMatchesCPythonAt: 'plain_instance_dir'.
	self assertMatchesCPythonAt: 'plain_instance_class'.
	self assertMatchesCPythonAt: 'class_dir'.
	self assertMatchesCPythonAt: 'builtin_dir'.
	self assertMatchesCPythonAt: 'isinstance_unaffected'.
	self assertMatchesCPythonAt: 'type_is_unaffected'.
%

category: 'Grail-Tests - Controls'
method: DirSlotsAndTracebackTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'
%

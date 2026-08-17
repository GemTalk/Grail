! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperLookupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperLookupTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperLookupTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperLookupTestCase
!
! Two things ``super()'' could not SEE.  Neither is about how it dispatches.
!
! 1. A PARENT'S @classmethod WAS INVISIBLE from an instance method.  Grail
!    compiles a Python @classmethod onto its metaclass, and the lookup consulted
!    the class side only when the bound receiver was itself a class.  So
!    ``def cm(cls): return super().cm()'', whose MRO successors are all
!    @classmethods, raised ``super(): no parent method 'cm'''.  CPython draws no
!    such distinction: super() looks the name up on the MRO classes, and a
!    classmethod is found from either side.
!
! 2. A MISSING NAME FAILED TOO LATE.  A name the parent chain does not define
!    still produced a truthy proxy, and the AttributeError fired only when it
!    was CALLED.  That breaks probe-with-a-default: copy.deepcopy does
!    ``getattr(x, '__deepcopy__', None)'', got a proxy instead of None, called
!    it, and the error escaped OUTSIDE the guard meant to catch it.  hasattr()
!    answered True for every name for the same reason.  The fix probes the whole
!    arity family once at lookup time and raises then.
!
! WHO DECIDES THE RECEIVER -- the part that took three attempts.  A @classmethod
! reached through super() must run with the CLASS as receiver, not the instance.
! Deriving that afterwards from the method object does NOT work, and the two
! wrong cuts are worth recording because both looked reasonable:
!
!   * ``the method lives on a metaclass'' -- 180 SUnit errors.  Grail resolves
!     plenty of ordinary INHERITED methods through the class-side dict, so this
!     ran KeyValueDictionary's __setitem__ with the class as receiver and the
!     dictionary tried to index itself by a string key.
!   * the same test narrowed by the @classmethod category -- still 48 errors.
!
! The lookup KNOWS which dict it hit, and nothing else does.  It now answers
! { method. cameFromTheClassSide } and the caller binds accordingly.  The
! lesson generalises: when a decision depends on how a value was found, carry it
! from the place that found it rather than reconstructing it downstream.
!
! Measured: test_super 16 -> 14 failing (test_attribute_error and
! test_super_in_class_methods_working), no regression across the corpus.  Every
! expectation is CPython 3.14.6's own output for tests/python/super_lookup.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperLookupTestCase removeAllMethods.
SuperLookupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperLookupTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'super_lookup' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_lookup.py')
		name: 'super_lookup'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: SuperLookupTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the class side ---

category: 'Grail-Tests - Classmethods'
method: SuperLookupTestCase
testSuperReachesAParentClassmethodFromAnInstanceMethod
	"``super(): no parent method 'cm''' until the lookup consulted the class
	side for an instance receiver too."

	self assert: (self at: 'classmethod_chain') @env0:asString
		equals: '(''instance'', (''C'', (''C'', ''A''), ''B''), ''C'')'.
%

category: 'Grail-Tests - Classmethods'
method: SuperLookupTestCase
testAClassmethodReachedThroughSuperGetsTheClass
	"``cls'' must be the CLASS, not the instance super() was bound to.  Which
	receiver to use is decided by the LOOKUP -- it answers whether the method
	came from the class side -- because re-deriving it downstream from the
	method object was wrong twice: ``lives on a metaclass'' caught ordinary
	inherited methods and ran KeyValueDictionary's __setitem__ against a class."

	self assert: (self at: 'classmethod_receiver_is_a_class') @env0:asString
		equals: '(''B'', (''B'', ''A''), ''B'')'.
%

category: 'Grail-Tests - Classmethods'
method: SuperLookupTestCase
testTheOrdinaryInstanceChainIsUndisturbed
	"The guard on all of it: a plain cooperative super() chain must still
	resolve instance-side and bind the instance.  Widening the search without
	this is how the class side swallowed methods that were never classmethods."

	self assert: (self at: 'instance_chain') @env0:asString equals: 'ABC'.
%

! --- missing names ---

category: 'Grail-Tests - Missing names'
method: SuperLookupTestCase
testAMissingNameRaisesAtLookupNotAtCall
	"``getattr(s, '__deepcopy__', None)'' must answer None, and hasattr must
	answer False.  Both were wrong because the proxy resolved lazily and was
	truthy for every name -- so copy.deepcopy called it and the AttributeError
	escaped the guard that was supposed to absorb it (test_deep_copying,
	test_pickling)."

	self assert: (self at: 'getattr_with_default') @env0:asString equals: 'None'.
	self assert: (self at: 'hasattr_is_false') equals: false.
	self assert: (self at: 'bare_access') @env0:asString equals: 'AttributeError'.
%

category: 'Grail-Tests - Missing names'
method: SuperLookupTestCase
testAPresentNameIsUnaffected
	"Raising early must not cost the ordinary case: the whole arity family is
	probed, so a name defined at ANY arity still gets the deferred proxy and
	the call-time resolution is unchanged."

	self assert: (self at: 'present_name_still_works') @env0:asString
		equals: 'A'.
%

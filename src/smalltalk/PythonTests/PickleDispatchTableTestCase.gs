! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PickleDispatchTableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PickleDispatchTableTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PickleDispatchTableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PickleDispatchTableTestCase
!
! PICKLE MUST HONOUR copyreg.dispatch_table.
!
! The table maps a TYPE to a reduction function, registered OUT OF BAND.  Being
! keyed by type, an entry is invisible to attribute lookup -- and that is what it
! is FOR: a type whose attribute access is a PROXY cannot answer __reduce__ for
! itself.
!
! ``super'' is the standard case and the one that exposed this.  Attribute access
! on a super object resolves against the PARENT chain, so ``s.__reduce__'' IS the
! underlying object's reduce; a super object must therefore define none of
! __reduce__ / __copy__ / __deepcopy__ (test_super's test_special_methods asserts
! exactly that), and stays picklable purely through its dispatch-table entry.
!
! copy.py consulted the table; pickle.py did not.  So the reductor registered in
! copyreg worked for copy.deepcopy and was SILENTLY SKIPPED when pickling -- the
! unpickler built the object EMPTY and then asked it for __setstate__.  Nothing
! reported the skip.  It surfaced later as a broken object, and before the nil-cls
! guard went into Super it surfaced as an uncatchable Smalltalk error
! (``a UndefinedObject does not understand #superClass''), which is a diagnosis of
! the wrong thing entirely.
!
! WHERE THE CHECK GOES.  Between the primitive type dispatch and the
! by-reference / __reduce__ tail, which is CPython's order and not an arbitrary
! one: a registered type must never reach __reduce__ at all, or the proxy answers
! for the wrong object.  Putting it after the ``isinstance(obj, type)'' branch
! would also work for super but would let a registered METACLASS slip past.
!
! A string reduction means ``save by reference under this name'' and routes to
! save_global; every other reduction is a (callable, args) tuple handled exactly
! as __reduce__'s is.
!
! Both routes into the table are covered, because they are not the same route: the
! built-in registration copyreg performs for ``super'' at initialize time, and a
! registration a PROGRAM makes for its own class (which is what the re module does
! for compiled patterns).
!
! Measured: test_super 8 -> 7 failing (test_pickling).  SUnit 4804/4804, no
! regression across the corpus -- worth stating for a change in pickle's dispatch,
! which every pickled object in the suite goes through.  Every expectation is
! CPython 3.14.6's own output for tests/python/pickle_dispatch_table.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PickleDispatchTableTestCase removeAllMethods.
PickleDispatchTableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PickleDispatchTableTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'pickle_dispatch_table' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/pickle_dispatch_table.py')
		name: 'pickle_dispatch_table'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: PickleDispatchTableTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests - super'
method: PickleDispatchTableTestCase
testSuperShipsRegistered
	"copyreg registers it at initialize time, as CPython's copyreg.py does at
	module level.  Without the entry there is nothing for pickle to find, so this
	is the precondition for everything below."

	self assert: (self at: 'super_is_registered') equals: true.
%

category: 'Grail-Tests - super'
method: PickleDispatchTableTestCase
testASuperObjectSurvivesARoundTrip
	"The reductor answers ``(super, (thisclass, self))'', so unpickling
	reconstructs through the ordinary two-argument super() rather than building
	an empty proxy and pushing state into it."

	self assert: (self at: 'round_trip_type') equals: true.
	self assert: (self at: 'round_trip_thisclass') equals: true.
	self assert: (self at: 'round_trip_self_class') equals: true.
%

category: 'Grail-Tests - super'
method: PickleDispatchTableTestCase
testTheRestoredProxyStillDispatchesAndCarriesItsObject
	"The check that would have caught the old behaviour: the empty proxy passed
	``type(u) is type(s)'' perfectly well, so only USING it reveals anything."

	self assert: (self at: 'round_trip_dispatches') equals: true.
	self assert: (self at: 'round_trip_self_type') @env0:asString equals: 'E'.
	self assert: (self at: 'round_trip_self_state') equals: 1.
%

category: 'Grail-Tests - super'
method: PickleDispatchTableTestCase
testTheClassReceiverFormRoundTripsToo
	"``super(C, E)'' reduces by the same rule, and its __self__ is the class
	itself -- restored by identity rather than copied."

	self assert: (self at: 'class_form_self') equals: true.
	self assert: (self at: 'class_form_thisclass') equals: true.
%

category: 'Grail-Tests - user registrations'
method: PickleDispatchTableTestCase
testATypeAProgramRegistersItselfIsHonoured
	"A separate route into the same table -- copyreg.pickle() called from Python,
	which is what the re module does for compiled patterns.  The built-in
	registration could work while this did not, since one is installed in
	Smalltalk and the other through the Python entry point."

	self assert: (self at: 'user_registered_type') @env0:asString equals: 'Point'.
	self assert: ((self at: 'user_registered_state') @env1:__getitem__: 0) equals: 3.
%

category: 'Grail-Tests - the table is actually consulted'
method: PickleDispatchTableTestCase
testARegisteredReductorIsTheONLYWayToRoundTripSomeTypes
	"THE DISCRIMINATING CASE.  Every other assertion in this class is satisfied
	by the DEFAULT reduction path as well, so all of them passed while a
	deployed pickle was reading a stale dispatch table and skipping the
	registration entirely (docs/Persistent_Modules_and_Classes.md par.8.7).
	NeedsArgs cannot round-trip that way -- its __new__ demands an argument, so
	the generic ``cls.__new__(cls)'' reduction raises -- which makes this the
	one assertion here that fails when the table is not consulted."

	self assert: (self at: 'needs_args_round_trip') equals: 7.
%

category: 'Grail-Tests - the table is actually consulted'
method: PickleDispatchTableTestCase
testBothReductorsActuallyRan
	"Names of the reductors the fixture saw invoked.  A value assertion can be
	satisfied by an accidental equality; this asserts the CODE PATH."

	| ran |
	ran := self at: 'reductors_ran'.
	self assert: (ran @env1:__len__) equals: 2.
	self assert: (ran @env1:__getitem__: 0) @env0:asString equals: 'needs_args'.
	self assert: (ran @env1:__getitem__: 1) @env0:asString equals: 'point'.
%

category: 'Grail-Tests - regression guard'
method: PickleDispatchTableTestCase
testUnregisteredTypesAreUnaffected
	"The guard on a change to pickle's dispatch: an ordinary instance and the
	builtin containers must pickle exactly as before, since every pickled object
	in the corpus passes through the same method."

	self assert: (self at: 'plain_object_still_pickles') equals: true.
	self assert: ((self at: 'builtins_still_pickle') @env1:__len__) equals: 3.
%

! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- GrailReprLookupSignaller: an object whose ``__repr__''
! slot probe -- the ___pyAttrLoad___: builtins>>repr: makes before calling
! __repr__ -- evaluates a block instead of answering.  It puts a signal exactly
! where the VM's one-shot AlmostOutOfStack landed in the nightly that scored
! test_xml_etree CRASH, which a real recursion reaches only at depths that
! depend on frame widths, and so on the platform.
expectvalue /Class
doit
Object subclass: 'GrailReprLookupSignaller'
  instVarNames: #('signal')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Metaclass3
doit
GrailReprLookupSignaller removeAllMethods.
GrailReprLookupSignaller class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Test-Support'
classmethod: GrailReprLookupSignaller
signalling: aBlock
	^ self new setSignal: aBlock
%

category: 'Grail-Test-Support'
method: GrailReprLookupSignaller
setSignal: aBlock
	signal := aBlock
%

set compile_env: 1

category: 'Grail-Test-Support'
method: GrailReprLookupSignaller
___pyAttrLoad___: aName
	^ signal @env0:value
%

category: 'Grail-Test-Support'
method: GrailReprLookupSignaller
__repr__
	^ 'reached __repr__'
%

set compile_env: 0

! ------------------- Class definition for RecursionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RecursionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RecursionErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RecursionErrorTestCase - Tests for Python RecursionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RecursionErrorTestCase removeAllMethods.
RecursionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
test_creation
	"Test creating a RecursionError instance."
	
	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: exc notNil.
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
test_inheritance
	"Test that RecursionError inherits from RuntimeError."

	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: (exc isKindOf: RuntimeError).
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
testReflexiveDictComparisonRaisesACatchableRecursionError
	"Comparing two reflexive dicts must raise a RecursionError the fixture's own
	``except RecursionError:'' actually CATCHES -- for ``=='' and ``!='' alike.

	It did not, for ``!=''.  dict>>__eq__:'s ``on: Error'' handler (there for a
	NaN key's failed hash lookup) merely RE-PASSED the stack overflow, leaving
	conversion to ___recursionGuard___ far above; that guard's #resignalAs:
	restarts the handler search from the original signal point, and the restarted
	search skipped the user's inner ``except RecursionError'', which was answered
	instead by the outer ``except Exception''.  dict>>__eq__: now converts at that
	handler -- adding no frame, which matters because the deep-walk probes are
	sensitive to frame width -- and that makes ``y != x'' catchable when the
	comparison is evaluated on its own.

	Inside this suite the overflow landed somewhere the dict handler does not
	protect, and the boundary guard's #resignalAs: re-tripped (its trim lets the
	VM re-protect the yellow page; see testOverflowIsCatchableAtEveryAlignment).
	A raw overflow is now a RecursionError in the first handler search, so the
	``!='' checks are asserted too.

	Evaluated inside ___recursionGuard___, as testRecursionContextChain is and for
	the same reason: without a guard above it the runaway's AlmostOutOfStackError
	escapes into Smalltalk instead of reaching the fixture's ``except''.

	The fixture is verified against real CPython by running it directly; see
	tests/python/reflexive_dict_comparison.py."

	| mod |
	importlib @env1:modules removeKey: #'reflexive_dict_comparison' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reflexive_dict_comparison.py')
		name: 'reflexive_dict_comparison'.
	#( 'the_pair_is_not_identical'
	   'eq_on_reflexive_dicts'
	   'ne_on_reflexive_dicts'
	   'eq_is_still_catchable_after_ne' ) do: [:k |
		| got |
		"Report WHAT the check answered, not merely that it did not answer true.
		Each failure mode reads differently -- ``raised RecursionError instead''
		means the clause did not MATCH a correct exception, while another type
		means the conversion itself went wrong -- and a bare check name cannot
		tell them apart."
		got := BaseException @env1:___recursionGuard___: [
			mod @env0:perform: k asSymbol env: 1].
		self assert: got = true
			description: 'reflexive-dict comparison check failed: ' , k , ' -- ',
				([got ___str___] @env0:on: Error do: [:e | got printString])].
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
testReprConvertsAStackTripInItsSlotProbe
	"The VM's AlmostOutOfStack, tripping INSIDE builtins>>repr:'s probe for the
	``__repr__'' slot, must come out as a RecursionError.

	The probe sits in a broad handler that answers nil for whatever the read
	raises, and it answered nil for this too -- which consumes the VM's only
	warning without reducing depth.  A __repr__ that reprs itself recurses
	through the probe once per level, so the recursion carried on into the Red
	Zone, where the VM ends the session: test_xml_etree's test_recursive_repr
	took the whole module to CRASH on Linux (nightly 36136723364) while passing
	on Darwin, where the trip happened to land in a different frame.  Signalled
	here directly, so the test does not depend on where a real overflow lands."

	| raised |
	raised := [builtins @env1:instance @env1:repr:
			(GrailReprLookupSignaller signalling: [AlmostOutOfStack new signal])]
		on: RecursionError do: [:e | e return: e].
	self assert: (raised isKindOf: RecursionError)
		description: 'repr: answered ' , raised printString , ' instead of raising RecursionError'.
	self assert: (raised messageText includesString: 'while getting the repr of an object')
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
testReprLetsARecursionErrorFromItsSlotProbeThrough
	"A RecursionError raised by the ``__repr__'' slot probe is not a missing
	slot, and must not be answered as one.  That is also what the boundary
	guard's conversion looks like when it reaches the probe: #resignalAs:
	restarts the handler search at the original signal point, so a trip the
	probe passed on comes back to it as a RecursionError."

	| raised |
	raised := [builtins @env1:instance @env1:repr:
			(GrailReprLookupSignaller signalling: [
				RecursionError @env1:___signal___: 'raised by the probe'])]
		on: RecursionError do: [:e | e return: e].
	self assert: (raised isKindOf: RecursionError)
		description: 'repr: answered ' , raised printString , ' instead of raising RecursionError'.
	self assert: (raised messageText includesString: 'raised by the probe')
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
testReprStillCallsReprWhenItsSlotProbeRaises
	"The control: any OTHER failure of the probe still falls through to the
	receiver's __repr__, which is what the broad handler is there for."

	self
		assert: (builtins @env1:instance @env1:repr:
			(GrailReprLookupSignaller signalling: [
				AttributeError @env1:___signal___: 'no __repr__ here']))
		equals: 'reached __repr__'
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
testOverflowIsCatchableAtEveryAlignment
	"A runaway recursion must end in a RecursionError the nearest ``except''
	catches, wherever the stack runs out.

	It did not, at one base padding in seven.  ___recursionGuard___ converted
	the overflow with #resignalAs:, whose trim back to the overflow lets the VM
	re-protect the yellow guard page with no margin; when the trip fell where
	the trim left the stack pointer just above the page, the RecursionError's
	own handler search tripped again, and that second overflow skipped every
	handler between the recursion and the guard -- ``except RecursionError''
	missed while a later ``except BaseException'' caught (test_pickle's
	test_bad_getattr).  A raw overflow is now a RecursionError to Python in the
	FIRST handler search (BaseException class >> handles:, ___catchAll___),
	before anything unwinds.

	The fixture sweeps the base padding across more than a recursion cycle, so
	every phase is covered whatever stack depth the gem has; it also pins what a
	handler meeting the overflow sees (finally order, with/__exit__, bare raise
	identity).  Verified against CPython by running it directly."

	| mod |
	importlib @env1:modules removeKey: #'recursion_overflow_alignment' ifAbsent: [].
	mod := BaseException @env1:___recursionGuard___: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/recursion_overflow_alignment.py')
			name: 'recursion_overflow_alignment'].
	self assert: (mod @env1:___pyAttrLoad___: #check_count) equals: 8.
	self assert: (mod @env1:___pyAttrLoad___: #failures) asString equals: ''
%

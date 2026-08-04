! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PartialCallableAndCopyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PartialCallableAndCopyTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PartialCallableAndCopyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PartialCallableAndCopyTestCase
!
! Two things that were wrong about objects Grail can perfectly well call and
! copy, both of which reported the WRONG ANSWER rather than failing.
!
!  * callable() probed one selector shape.  ``def __call__'' compiles to a
!    selector whose shape depends on its arity, and only the one-argument form
!    was checked -- so an instance of a class defining the ordinary
!    ``__call__(self)'' answered False while calling it worked.  A partial
!    answered False too: it implements the call protocol directly rather than
!    through __call__ at all.
!
!  * copy.deepcopy treated every unrecognised object as an ATOM and handed
!    back the same object.  It now reconstructs one that implements the pickle
!    protocol, deep-copying the state before __setstate__ sees it -- which is
!    how CPython does it, and what a partial relies on.  An ordinary instance
!    with no __reduce__ is STILL aliased; see the note in copy.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PartialCallableAndCopyTestCase removeAllMethods.
PartialCallableAndCopyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PartialCallableAndCopyTestCase
setUp
	"Reload tests/python/partial_callable_and_copy.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'partial_callable_and_copy' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/partial_callable_and_copy.py')
		name: 'partial_callable_and_copy'.
%

! --- callable() ---

category: 'Grail-Tests - callable'
method: PartialCallableAndCopyTestCase
testCallableAcrossEveryKind
	"In fixture order: a plain instance; __call__ at three arities; a
	partial; an lru_cache wrapper; a function; a lambda; a class; then
	int, str, None, list, dict, tuple and a module."

	self assert: testModule @env1:callable_across_kinds asArray
		equals: #( false true true true true true true true true
			false false false false false false false ).
%

category: 'Grail-Tests - callable'
method: PartialCallableAndCopyTestCase
testWhatCallableAcceptsActuallyRuns
	"Guard: the point of widening the probe is that these were always
	callable, so each must still produce its answer."

	| got |
	got := testModule @env1:callables_still_call asArray.
	self assert: (got at: 1) equals: 'no-args'.
	self assert: (got at: 2) asArray equals: #( 'one-arg' 7 ).
	self assert: (got at: 3) asArray first equals: 'varargs'.
	self assert: (got at: 4) asArray first asArray equals: #( 1 2 ).
%

! --- deepcopy ---

category: 'Grail-Tests - deepcopy'
method: PartialCallableAndCopyTestCase
testDeepcopyOfAPartialCopiesItsState
	"Object, __dict__ attribute, args tuple, an element of args, the
	keywords dict, and a keyword value -- all distinct from the original.
	deepcopy used to hand back the very same partial."

	self assert: testModule @env1:deepcopy_partial asArray
		equals: #( true true true true true true ).
%

category: 'Grail-Tests - deepcopy'
method: PartialCallableAndCopyTestCase
testDeepcopyOfAPartialStillComputesTheSameThing
	"A copy that no longer computes the same answer would be worse than an
	alias, so check the reconstruction and not only the identities."

	self assert: testModule @env1:deepcopy_partial_keeps_behaviour asArray
		equals: #( true true ).
%

category: 'Grail-Tests - deepcopy'
method: PartialCallableAndCopyTestCase
testDeepcopyLeavesAtomsShared
	"Immutables are still answered as themselves -- the new reduce branch
	must not start rebuilding ints, strings and unchanged tuples."

	self assert: testModule @env1:deepcopy_leaves_atoms_alone
		equals: 'atoms shared'.
%

category: 'Grail-Tests - deepcopy'
method: PartialCallableAndCopyTestCase
testDeepcopyStillRecursesContainers
	"Guard on the branches that already worked."

	self assert: testModule @env1:deepcopy_still_recurses_containers asArray
		equals: #( true true true true true ).
%

! --- the indirect call protocol ---

category: 'Grail-Tests - callable'
method: PartialCallableAndCopyTestCase
testPartialIsCallableThroughTheIndirectProtocol
	"A partial reached generically -- here a partialmethod wrapping one --
	used to hit object's ``not callable'' raiser.  Only that it now REACHES
	the partial is asserted: the argument order is still wrong, and belongs
	to the separate partialmethod gap."

	self assert: testModule @env1:partial_over_partial_no_longer_raises
		equals: 'called, keywords={''c'': 6}'.
%

category: 'Grail-Tests - deepcopy'
method: PartialCallableAndCopyTestCase
testDeepcopyMemoKeepsOriginalsAlive
	"The memo is keyed by id() and Grail recycles id slots on collection, so a
	temporary dying mid-copy could pass its id to a later object and make that
	object's lookup answer an unrelated copy (deepcopy of
	``partial(f, ['asdf'])'' answered [[<BoundMethod>]] for ['asdf']).
	copy.py now holds the originals for the duration, as CPython's does."

	self assert: testModule @env1:deepcopy_memo_keeps_originals_alive asArray
		equals: #( true true true ).
%

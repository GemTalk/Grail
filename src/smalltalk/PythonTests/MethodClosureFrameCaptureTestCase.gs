! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodClosureFrameCaptureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodClosureFrameCaptureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MethodClosureFrameCaptureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodClosureFrameCaptureTestCase
!
! A CLOSURE BUILT INSIDE A METHOD MUST RETAIN ITS FREE VARIABLES, NOT THE FRAME.
!
! A nested ``def'' inside a METHOD kept every argument and local of that method
! strongly reachable for as long as the closure lived.  The identical code shape
! inside a module-level function did not:
!
!     class W:
!         def watch(self, obj):        #  obj lived as long as on_death did
!             note = [None]
!             def on_death(dead_ref):  #  reads note, nothing else
!                 return note[0]
!             ...
!
!     def watch(obj, note):            #  obj was released normally
!         ...
!
! WHY THE TWO DIFFERED.  Both compile to one Smalltalk method, but a method of a
! Python CLASS wrapped its whole body in ``^ [| params locals | ... ] value'',
! while a module-level def puts the same names in Smalltalk METHOD temps.  The
! wrapper existed for shadowing: GemStone rejects a method temp that shadows an
! instance variable, and a BLOCK temp may shadow one freely -- so the block was
! the safe choice for a class whose instVars the codegen could not enumerate
! (the class object does not exist while its method sources are generated).
!
! The cost of that block was invisible until something closed over it.  GemStone
! gives a home scope ONE VariableContext holding every variable that ANY block
! in it shares, and a non-clean block holds the whole context.  With the body in
! a block, every parameter and local was a variable of that one context, so a
! nested def reading a single local pinned all of them -- ``obj'' included.  With
! the body at method scope, only the variables a block actually reads are shared.
!
! HOW IT SURFACED.  weakref.WeakKeyDictionary.__setitem__(self, key, value)
! built its per-key remover as a nested def; the remover is held by the weak
! reference, which the dictionary keeps -- so ``key'' was strongly reachable and
! a weak key could never be reclaimed.  len() still counted the entry after the
! last strong reference to the key was dropped and collected.  PR #793 worked
! that instance around in weakref.py by moving the remover to a module-level
! function; this fixes the codegen underneath it.
!
! WHAT IS STILL NOT COVERED, and why it is not a gap in this fixture: a method
! keeps the wrapper block (and so the old retention) when the codegen cannot
! prove its temps are safe -- a class whose base brings Smalltalk instVars of
! its own (dict, Exception, str, ...), a @classmethod / @staticmethod (metaclass
! instVars are the class's own Python attribute names), a generator or coroutine
! body, and a body containing ``with'' / ``try''-``finally'' (those need the
! PythonReturn handler, not a ``^'').  See FunctionDefAst >>
! ___methodTempsSafeFor___: and CallAst >> classBackingInstVarNames.
!
! Drives tests/python/method_closure_frame_capture.py, which reports each probe
! as a module-level boolean: True means the frame was released.  Four of them
! were False before the fix (the three method shapes and the WeakKeyDictionary
! end-to-end case); the module-level control and the WeakSet case passed both
! ways and are here to stay honest about what changed.
!
! The fixture is SELF-RUNNING (scripts/check_python_fixtures.sh), so what it
! expects is measured against CPython rather than written from a Grail session:
! ``_force_collect'' calls weakref._collect() where it exists and gc.collect()
! otherwise, and all seven checks print OK under CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodClosureFrameCaptureTestCase removeAllMethods.
MethodClosureFrameCaptureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodClosureFrameCaptureTestCase
setUp
	"Sweep first, then load the fixture fresh.  Every probe in the module body
	runs at import and asks whether a sentinel was reclaimed, so a surviving
	stack root from an earlier test would read as a retained frame here.  Same
	preliminary sweep WeakrefModuleTestCase does, for the same reason."

	| mods |
	System _generationScavenge_vmMarkSweep.
	System _vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons.
	mods := importlib @env1:modules.
	mods removeKey: #'method_closure_frame_capture' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_closure_frame_capture.py')
		name: 'method_closure_frame_capture'.
%

category: 'Grail-Private'
method: MethodClosureFrameCaptureTestCase
assertReleased: aName
	"Every probe answers a Python bool; True means the sentinel was reclaimed."

	self assert: (testModule @env1:___pyAttrLoad___: aName asSymbol) equals: true.
%

category: 'Grail-Tests - A Method Frame Is Released'
method: MethodClosureFrameCaptureTestCase
testANestedDefDoesNotRetainTheMethodsArgument
	"THE TEST THIS EXISTS FOR.  ``watch(self, obj)'' builds a callback that
	reads one local and nothing else; ``obj'' must die with the caller's last
	reference to it."

	self assertReleased: 'method_closure_releases_the_argument'.
%

category: 'Grail-Tests - A Method Frame Is Released'
method: MethodClosureFrameCaptureTestCase
testAMethodWithADefaultAlsoReleasesIt
	"A method with a default argument compiles through the VARARGS generator,
	which emitted its own copy of the wrapper block -- fixing only the
	simple-positional shape would have left every such method leaking."

	self assertReleased: 'method_with_default_releases_the_argument'.
%

category: 'Grail-Tests - A Method Frame Is Released'
method: MethodClosureFrameCaptureTestCase
testALambdaCapturesNoMoreThanANestedDef
	"A lambda is the same closure with different syntax and was retaining the
	same frame."

	self assertReleased: 'method_lambda_releases_the_argument'.
%

category: 'Grail-Tests - A Method Frame Is Released'
method: MethodClosureFrameCaptureTestCase
testTheModuleLevelShapeStillReleasesIt
	"The control, and the half that was never broken: the identical code at
	module scope always released its argument.  If this ever fails, the method
	path did not join the function path -- both regressed together."

	self assertReleased: 'function_closure_releases_the_argument'.
%

category: 'Grail-Tests - The Closure Still Works'
method: MethodClosureFrameCaptureTestCase
testTheCallbackStillReadsItsFreeVariable
	"Releasing the frame must not cost the closure its free variables: the
	callback built in the method still reads the local it closed over, and the
	reference it was handed is the one the watcher kept."

	self assertReleased: 'callback_closure_still_reads_its_free_variable'.
%

category: 'Grail-Tests - What It Fixed'
method: MethodClosureFrameCaptureTestCase
testAWeakKeyDictionaryForgetsADeadKey
	"End to end, and how this was found.  A WeakKeyDictionary entry has to
	vanish when its key is collected; the per-key remover's captured frame kept
	the key alive, so len() still counted it."

	self assertReleased: 'weak_key_dictionary_forgets_a_dead_key'.
%

category: 'Grail-Tests - What It Fixed'
method: MethodClosureFrameCaptureTestCase
testAWeakSetForgetsADeadMember
	"WeakSet builds its remover in ``_make_remover(self)'', whose frame holds
	no member -- so this passed before the fix too.  It is here because the
	same class is one edit away from the leaking shape (a remover built in
	``add(self, obj)'' instead), and because a WeakSet member must be
	reclaimable whichever way the callback is built."

	self assertReleased: 'weak_set_forgets_a_dead_member'.
%

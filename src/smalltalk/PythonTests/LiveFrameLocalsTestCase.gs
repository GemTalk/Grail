! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'LiveFrameLocalsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LiveFrameLocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LiveFrameLocalsTestCase
!
! Can a running gem read the LOCAL VARIABLES of its own Python frames?
!
! This exists to be run BY CI, not by a developer.  It answers yes locally, on an
! interpreted gem -- and the capability it rests on is exactly the kind that has
! differed between an interpreted gem and a native-code one three times before in
! this codebase (_sourceAtIp:).  Native code is unavailable on macOS/arm64, so a
! green local run is not evidence.  The test is therefore deliberately NOT gated
! on the gem: it asserts the capability outright so that CI, which runs
! GemNativeCodeEnabled=2, either confirms it or fails loudly.
!
! See tests/python/live_frame_locals.py and PyFrame class>>___liveTempsAtLevel___.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LiveFrameLocalsTestCase removeAllMethods.
LiveFrameLocalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - tracebacks'
method: LiveFrameLocalsTestCase
___findLiveFrameFor___: aSelectorFragment upTo: aMaxLevel
	"Answer { level . temps } for the first live stack level whose method's
	selector CONTAINS aSelectorFragment, or nil.

	Searching by selector rather than by a fixed level on purpose: the number of
	frames between the handler and the raising Python function is an artefact of
	Grail's raise path (___pyRaiseNew___:args:kw:, ___signalNew___:kw:cause:,
	signal:, _signal, _executeHandler: ... six frames when this was written), and
	pinning it would make the test fail whenever that path gained or lost a hop --
	a failure about frame plumbing dressed up as a failure about locals.

	Matching on a FRAGMENT because Grail mangles a Python function's name into a
	keyword selector: ``def inner(first, second)'' compiles to #'inner:_:'."

	| lvl |
	lvl := 1.
	[lvl <= aMaxLevel] whileTrue: [
		| fc meth |
		fc := [GsProcess _frameContentsAt: lvl]
			on: AbstractException do: [:e | e return: nil].
		fc isNil ifFalse: [
			meth := fc at: 1.
			(meth notNil and: [(meth selector notNil)
				and: [meth selector asString includesString: aSelectorFragment]])
					ifTrue: [
						| temps |
						"``fc'' is passed, NOT ``lvl'': _frameContentsAt: numbers levels
						 from ITS OWN sender, so handing a level to another method shifts
						 it by the frame between them.  The first version did that and
						 read the next frame down."
						temps := PyFrame ___tempsFromFrameContents___: fc.
						temps isNil ifFalse: [^ { lvl . temps }]]].
		lvl := lvl + 1].
	^ nil
%

category: 'Grail-Tests - tracebacks'
method: LiveFrameLocalsTestCase
testALiveFrameReportsItsLocals
	"A raising Python function's locals, read from the handler above it.

	WHY THIS IS A TEST AND NOT A COMMIT.  The reading is done by ``GsProcess class
	>> _frameContentsAt:'' -- primitive 195, class side -- which reads the
	CURRENTLY EXECUTING process.  Whether the VM keeps a frame's temporaries
	where that primitive can see them is a property of the CODE GENERATOR, and
	this codebase has been caught three times by exactly that kind of difference:
	_sourceAtIp: answers the call site on an interpreted gem and a point past the
	whole protected block on a native-code one.  Local gems run
	GemNativeCodeEnabled=0 and CI runs 2, and native code cannot be enabled on
	macOS/arm64, so THE LOCAL RESULT PROVES NOTHING ABOUT CI.

	The response to that is not to gate the test -- gating would bury the very
	question it is here to settle -- but to assert the capability and let CI
	answer.  If native code does not carry frame temps, this goes red, and the
	report below says which of the three ways it broke: no frame found at all, a
	frame with no names, or names whose values came back nil.

	WHAT IS ASSERTED.  Grail compiles ``def inner(first, second)'' to the
	Smalltalk selector #'inner:_:' with the Python locals as method temps, so the
	arguments and every assigned local should be visible with their values.
	``bound_to_none'' is the one that matters most: unassigned temps read as
	Smalltalk nil and are omitted, and that is only correct because Python's None
	is a distinct object -- if the two were conflated, every None-valued local
	would silently vanish and only this check would notice.  ``declared_later'' is
	deleted before the raise and must NOT appear."

	| mod found report |
	report := nil.
	found := nil.
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/live_frame_locals.py')
		name: 'live_frame_locals'.
	[mod @env1:outer]
		on: AbstractException
		do: [:ex |
			found := self ___findLiveFrameFor___: 'inner' upTo: 24.
			"Captured INSIDE the handler: the stack is live only here."
			found isNil ifTrue: [report := PyFrame ___liveTempsReport___: 24].
			ex return: nil].

	self assert: found notNil
		description: 'no live frame for the Python function ''inner'' carried '
			, 'readable locals. Live stack was:' , (String with: Character lf)
			, (report isNil ifTrue: ['<not captured>'] ifFalse: [report]).

	self assert: ((found at: 2) at: 'first' ifAbsent: [nil]) = 1
		description: 'first -> ' , ((found at: 2) at: 'first' ifAbsent: ['<absent>']) printString
			, ' (wanted 1); whole frame: ' , (found at: 2) printString.
	self assert: ((found at: 2) at: 'second' ifAbsent: [nil]) = 2
		description: 'second -> ' , ((found at: 2) at: 'second' ifAbsent: ['<absent>']) printString
			, ' (wanted 2); whole frame: ' , (found at: 2) printString.
	self assert: ((found at: 2) at: 'computed' ifAbsent: [nil]) = 3
		description: 'computed -> ' , ((found at: 2) at: 'computed' ifAbsent: ['<absent>']) printString
			, ' (wanted 3); whole frame: ' , (found at: 2) printString.
	self assert: ((found at: 2) at: 'text' ifAbsent: [nil]) = 'hello'
		description: 'text -> ' , ((found at: 2) at: 'text' ifAbsent: ['<absent>']) printString
			, ' (wanted ''hello''); whole frame: ' , (found at: 2) printString.

	"None is a distinct object, so a local explicitly bound to None survives the
	 nil-means-unassigned filter."
	self assert: ((found at: 2) at: 'bound_to_none' ifAbsent: [#'missing']) == None
		description: 'bound_to_none -> '
			, ((found at: 2) at: 'bound_to_none' ifAbsent: ['<absent>']) printString
			, ' (wanted the None singleton); whole frame: ' , (found at: 2) printString.

	self assert: ((found at: 2) includesKey: 'declared_later') not
		description: 'a deleted local is still reported: ' , (found at: 2) printString.

	"Grail's bookkeeping temps are filtered, or every f_locals would carry them."
	self assert: ((found at: 2) includesKey: '___curPos___') not
		description: 'Grail bookkeeping temp leaked into locals: ' , (found at: 2) printString.
	self assert: ((found at: 2) includesKey: 'self') not
		description: 'the Smalltalk receiver leaked into locals: ' , (found at: 2) printString
%

category: 'Grail-Tests - tracebacks'
method: LiveFrameLocalsTestCase
testACallerFrameReportsItsOwnLocals
	"The frame ABOVE the raise has its own locals, which is what makes a walk
	worth doing: CPython's NameError suggestions read the locals of the frame the
	name was looked up in, not of the innermost one."

	| mod found |
	found := nil.
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/live_frame_locals.py')
		name: 'live_frame_locals'.
	[mod @env1:outer]
		on: AbstractException
		do: [:ex |
			found := self ___findLiveFrameFor___: 'outer' upTo: 24.
			ex return: nil].
	self assert: found notNil
		description: 'no readable live frame for ''outer'''.
	self assert: ((found at: 2) at: 'outer_only' ifAbsent: [nil]) = 99
		description: 'outer_only -> '
			, ((found at: 2) at: 'outer_only' ifAbsent: ['<absent>']) printString
			, ' (wanted 99); whole frame: ' , (found at: 2) printString
%

category: 'Grail-Tests - tracebacks'
method: LiveFrameLocalsTestCase
testALiveFrameAnswersItsFLocals
	"The same capability as the two tests above, but reached the way PYTHON reaches
	it: ``sys._getframe().f_locals'', and through
	traceback.StackSummary.extract(..., capture_locals=True), which is the route
	CPython's own TestStack.test_format_locals takes.

	Those tests establish that a live frame's temporaries are READABLE.  This one
	is about attributing them to the right Python frame, which is a separate
	problem because ONE PYTHON FRAME IS SEVERAL SMALLTALK FRAMES and the locals are
	split across them:

	  * a module-level def is a real method holding arguments and temps together;
	  * a def in a CLASS BODY puts its body in a zero-argument block, so the
	    method''s own frame reports ``names=anArray( )'' and every local is in the
	    block one level in;
	  * a nested def is a two-argument block whose body is a further block.

	The class-body shape is why the walk hands over a LIST of Smalltalk frames per
	Python frame rather than one: reading the frame the walk NAMES would have
	answered ``no locals'' for every method in every class.

	And one artefact had to be hidden.  A Smalltalk method argument cannot be
	assigned where a Python parameter can, so codegen passes a rebound parameter
	under a transport name and unpacks it into a block temp with the real name --
	so ``def method(self, q)'' whose body rebinds q first reported ``_q = 11''
	beside ``q = 11'', one of which is not a variable the program has.

	WHAT THIS DELIBERATELY DOES NOT CLAIM.  Two things, both asserted loosely on
	purpose rather than left unstated:

	  * ``self'' is absent.  CPython lists it among a method''s locals; a Python
	    method''s receiver is the Smalltalk RECEIVER here rather than a frame
	    temporary, which is the same asymmetry the raise-time receiver snapshot
	    works around via ___methodReceiverTable___.  The method check asserts a
	    SUBSET, so the gap is recorded rather than encoded as correct.
	  * f_locals is a SNAPSHOT, not PEP 667''s write-through proxy.  CPython 3.13+
	    answers a live view whose contents follow the frame; Grail answers the
	    mapping as it was when the frame was built.

	The gem-dependence warning on testALiveFrameReportsItsLocals applies here
	unchanged: local gems run GemNativeCodeEnabled=0 and CI runs 2, so a green
	local run proves nothing about CI for the underlying read.

	All nine checks answer identically under real CPython 3.14.6, verified by
	running the fixture.  See tests/python/frame_f_locals.py."

	| mod |
	importlib @env1:modules removeKey: #'frame_f_locals' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_f_locals.py')
		name: 'frame_f_locals'.
	#( 'a_module_level_def_reports_arguments_and_temps'
	   'a_nested_def_reports_both_of_its_blocks'
	   'a_class_body_def_reports_its_body_block'
	   'a_rebound_parameter_hides_its_transport_name'
	   'codegen_bookkeeping_temps_are_not_locals'
	   'an_unbound_local_is_omitted_but_none_is_kept'
	   'a_frame_with_no_locals_reports_none'
	   'format_renders_locals_sorted_after_the_source_line'
	   'capture_locals_off_reports_nothing' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'f_locals check failed: ' , k , ' -> ' , answer printString]
%

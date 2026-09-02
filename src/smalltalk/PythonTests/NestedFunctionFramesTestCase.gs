! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NestedFunctionFramesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedFunctionFramesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedFunctionFramesTestCase - a nested def gets its own traceback frame.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedFunctionFramesTestCase removeAllMethods.
NestedFunctionFramesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Data Model'
method: NestedFunctionFramesTestCase
testNestedFunctionFrames
	"A nested ``def'' must get its own traceback frame.

	Grail compiles a nested ``def'' to a BLOCK -- it has to: only a block can
	close over the enclosing function's locals, only a block has no class to
	live in, and only a fresh block copy per execution gives CPython's distinct
	function object per ``def''.  ___buildFramesFromCapturedStack___ merged
	every block into its home method, which is RIGHT for the other things
	blocks are used for -- a comprehension body, a ``try'' body, an ``except''
	handler -- because CPython has no frame for any of those.  The cost was
	that nested functions had NO frames at all: ``outer'' calling ``inner''
	reported ONE frame where CPython reports two, and three levels still
	reported one.

	Told apart by ARGUMENT COUNT.  Codegen calls a Python function block as
	``[:___positional___ :___kwargs___ | ...]'', and nothing else in env 1
	emits a two-argument block -- comprehension bodies, ``try'' bodies,
	``except'' handlers and the generator machinery are all zero-argument
	(measured across all of them).  The ``___pyNamed___'' / ``___pyCode___''
	stamps would be the obvious test and are NOT usable: they live on the block
	OBJECT, while the stack walk sees only compiled methods.

	The NAME checks carry as much weight as the counts.  A block has no
	selector, so the frame's name is recovered by scanning the home method's
	source for the ``PyCode name:'' its codegen emitted; a wrong scan yields a
	frame of the right shape under a misleading name, which a count alone
	would not catch.  The LINE checks are the third leg: they run BACKWARDS
	down the traceback (the outer frame sits at the ``inner()'' call, which
	FOLLOWS the nested body), so a frame that borrowed its home method's
	position would come out ascending or all-equal.

	``comprehension_adds_no_frame'' is the negative control -- it is what
	stops the fix over-reaching into the blocks that must stay merged.

	All thirteen checks answer identically under real CPython 3.14.6.  See
	tests/python/nested_function_frames.py."

	| mod results detail |
	importlib @env1:modules removeKey: #'nested_function_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_function_frames.py')
		name: 'nested_function_frames'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	"What each subject actually produced.  A boolean alone says the chain is
	wrong but not how, and a WRONG chain -- right length, wrong names -- is the
	plausible failure here, so quote it."
	detail := (mod @env1:___pyAttrLoad___: #ACTUAL) @env0:asString.
	#( 'module_level_frames' 'reads_a_local_frames' 'takes_a_parameter_frames'
	   'two_deep_frames' 'in_a_method_frames'
	   'module_level_names' 'two_deep_names' 'takes_a_parameter_names'
	   'in_a_method_names'
	   'module_level_lines' 'two_deep_lines'
	   'sibling_after_names'
	   'comprehension_adds_no_frame' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'nested-function frame check failed: ' , k
				, ' -- actual: ' , detail]
%

category: 'Grail-Private'
method: NestedFunctionFramesTestCase
loadFixture
	"A fresh instance of the fixture module.  Loaded per test rather than held in
	an instVar, matching testNestedFunctionFrames, which does the same inline --
	the module caches nothing across tests, so a shared one would only couple
	them."

	importlib @env1:modules removeKey: #'nested_function_frames' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_function_frames.py')
		name: 'nested_function_frames'
%

category: 'Grail-Private'
method: NestedFunctionFramesTestCase
namesFor: aProbeName in: mod
	"``_names(<probe>)'' as an Array of Smalltalk strings."

	| names out |
	names := (mod @env1:___pyAttrLoad___: #'_names')
		@env1:value: { mod @env1:___pyAttrLoad___: aProbeName asSymbol }
		value: nil.
	out := OrderedCollection new.
	1 to: (names @env1:__len__) do: [:i |
		out add: (names @env1:__getitem__: i - 1) @env0:asString].
	^ out asArray
%

category: 'Grail-Private'
method: NestedFunctionFramesTestCase
namesWithEveryDerivedLineNilFor: aProbeName in: mod
	"``_names(<probe>)'' with every cached (method, ip) -> Python line forced to
	nil -- the value ___derivePythonLineForMethod___:ip: answers when a
	_sourceAtIp: report carries no caret, fed into the same decision it feeds
	normally.

	A SIMULATION, and named as one: the real trigger is gem-dependent (§9.10
	records ip -> line derivation failing closed for a frame suspended inside a
	protected block, and native ips differ from bytecode ips) and native code is
	unavailable on macOS/arm64, so the condition itself cannot be produced here.
	What CAN be produced is the nil, which is what the walk actually branches on,
	so the invariant under test is exercised exactly.

	The cache is CLEARED on the way out rather than restored.  It is a pure memo
	of a pure derivation, so clearing costs the next reader one rescan and cannot
	leave a wrong value behind -- whereas restoring would have to trust this
	method to put a hundred-odd entries back correctly, and a mistake there would
	surface as wrong LINE NUMBERS in unrelated tests, which is far harder to
	attribute than a slow first traceback."

	| st cache |
	st := SessionTemps current.
	"Warmed first on purpose: an empty cache would simply be repopulated with
	 correct lines by the measured call, and the test would pass without testing
	 anything."
	self namesFor: aProbeName in: mod.
	cache := st at: #'GrailIpLineCache' otherwise: nil.
	self deny: cache isNil
		description: 'no line cache to poison -- the warm-up derived no lines at all'.
	cache keys asArray do: [:k | cache at: k put: nil].
	^ [self namesFor: aProbeName in: mod]
		ensure: [st removeKey: #'GrailIpLineCache' otherwise: nil]
%

category: 'Grail-Tests - Existence Does Not Depend On The IP'
method: NestedFunctionFramesTestCase
testANestedFrameSurvivesAnUnresolvableLine
	"A nested def's frame must EXIST whether or not its Python line derives.

	This is the invariant the design note states -- ``a nil line costs a frame its
	line number, not its existence'' -- which the METHOD branch of the walk was
	fixed to honour and this branch, written later, did not inherit.  Both the
	name and the line used to be required before the frame was pushed, so a nil
	line erased the frame outright.  Measured with every derived line forced to
	nil, before the fix: ``module_level'' reported ZERO frames, as did
	reads_a_local, takes_a_parameter, two_deep, raises_after_sibling_defs and
	raises_from_a_comprehension.

	WHY EXISTENCE AND NOT MERELY THE NAME.  Rendering a traceback, a dropped frame
	is one missing line of output.  But sys._getframe(n) counts positions in this
	same chain, so a frame that silently disappears does not shorten the answer,
	it SHIFTS it -- every depth past the gap names the wrong function, with
	nothing downstream able to tell.

	Asserts the NAME as well as the count, because the sole-nested-def fallback is
	what makes the degraded answer useful rather than merely present:
	``module_level'' contains exactly one nested def, so its name is knowable with
	no line at all."

	| mod names |
	mod := self loadFixture.
	names := self namesWithEveryDerivedLineNilFor: 'module_level' in: mod.
	self deny: names isEmpty
		description: 'the nested frame vanished when its line could not be derived: '
			, names printString.
	self assert: (names includes: 'inner')
		description: 'expected the sole nested def to still be named ''inner'', got '
			, names printString.
%

category: 'Grail-Tests - Existence Does Not Depend On The IP'
method: NestedFunctionFramesTestCase
testAmbiguousNestedFramesAreStillNamedWithoutALine
	"Two nested defs and no line cannot say WHICH def a frame belongs to BY LINE
	-- and no longer have to.

	The point this test was written for is that declining to NAME a frame is not
	declining to HAVE one: ``two_deep'' nests ``a'', inside which ``b'' raises,
	and with every derived line forced to nil it reported ZERO frames before the
	existence fix, then two ``<nested>'' placeholders after it.

	It now reports ['a', 'b'].  Naming a nested def's frame no longer goes
	through the line at all when the frame's BLOCK is known: the block's compiled
	method knows the source offset of its own opening bracket, and the PyCode
	stamp just past the matching one names that block and no other.  A source
	offset is fixed at compile time, so it is exactly the input a nil line cannot
	spoil.

	The placeholder still exists and is still reachable -- see
	testAnUnnameableNestedFrameGetsAPlaceholder, which asks for a name with
	neither a line nor a block -- but it is no longer what this shape produces."

	| mod names |
	mod := self loadFixture.
	names := self namesWithEveryDerivedLineNilFor: 'two_deep' in: mod.
	self assert: names size >= 2
		description: 'expected both nested frames to survive, got ' , names printString.
	self assert: (names includes: 'a')
		description: 'expected the outer nested def to be named ''a'', got '
			, names printString.
	self assert: (names includes: 'b')
		description: 'expected the inner nested def to be named ''b'', got '
			, names printString.
	self deny: (names includes: '<nested>')
		description: 'a block-derived name should have made the placeholder unnecessary, got '
			, names printString.
%

category: 'Grail-Tests - Existence Does Not Depend On The IP'
method: NestedFunctionFramesTestCase
testAnUnnameableNestedFrameGetsAPlaceholder
	"With NEITHER a line nor a block there is nothing left to derive a name
	from, and the answer is a placeholder rather than nil.

	Asked directly, because the walk can no longer be made to produce this case
	from a fixture: forcing every derived line to nil used to reach it, and now
	the block resolves the name regardless.  The branch still matters -- nil is
	what used to cost a frame its EXISTENCE, since both callers pushed a frame
	only when a name came back, and ``sys._getframe'' COUNTS positions in that
	chain, so a dropped frame does not shorten the answer, it shifts it.

	``two_deep'' is the ambiguous shape on purpose: it holds two nested defs, so
	the sole-def fallback declines as well."

	| mod m |
	mod := self loadFixture.
	m := mod class compiledMethodAt: #'two_deep' environmentId: 1 otherwise: nil.
	self deny: m isNil
		description: 'the fixture module has no compiled method for two_deep'.
	self assert: (BaseException ___nestedFrameNameFor___: m line: nil block: nil)
			= '<nested>'
		description: 'expected the <nested> placeholder with no line and no block, got '
			, (BaseException ___nestedFrameNameFor___: m line: nil block: nil) printString
%

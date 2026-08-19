! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyFrame class (Python 'frame' object -- tb.tb_frame)
expectvalue /Class
doit
object subclass: 'PyFrame'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyFrame comment:
'Python frame object -- what ``tb.tb_frame`` returns and what
``traceback.walk_tb`` yields.

Grail has no real interpreter frames, so this is a lightweight carrier of the
fields a traceback consumer reads: ``f_code`` (a PyCode), ``f_lineno``,
``f_back`` (the caller frame or None) and ``f_globals``.  Stored as dynamic
instVars so Python attribute reads resolve the value directly through the
___pyAttrLoad___ dynamic-instVar probe (same mechanism as ``slice`` / PyCode).

Part of Phase 1 of the traceback design (docs/Python_Traceback_Design.md).
'
%

expectvalue /Class
doit
PyFrame category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyFrame
expectvalue /Metaclass3
doit
PyFrame removeAllMethods.
PyFrame class removeAllMethods.
PyFrame removeAllMethods: 1.
PyFrame class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyFrame
code: aCode lineno: aLineno back: aBack globals: aGlobals
	"Build a frame object.  ``aBack``/``aGlobals`` may be the Python None
	singleton (never Smalltalk nil, which the ___pyAttrLoad___ probe treats as
	absent)."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'f_code' put: aCode.
	inst dynamicInstVarAt: #'f_lineno' put: aLineno.
	inst dynamicInstVarAt: #'f_back' put: aBack.
	"Stored ONLY when a caller supplies a real namespace.  ___pyAttrLoad___ probes
	dynamic instVars BEFORE the method chain, so storing None here would shadow
	the lazy f_globals accessor below and every frame would report None."
	(aGlobals isNil or: [aGlobals == None]) ifFalse: [
		inst dynamicInstVarAt: #'f_globals' put: aGlobals].
	^ inst
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyFrame
__repr__
	| stream |
	stream := AppendStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '<frame at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPutAll: ', line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'f_lineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

category: 'Grail-Comparison'
method: PyFrame
__eq__: other
	"Two frames are equal when they describe the same frame: same code, same
	line, same caller chain.

	CPython compares frames by IDENTITY, and Grail cannot -- 9.47.  A live stack
	is read by RAISING and reading the VM's captured (method, ip, receiver)
	triples, so every walk RECONSTRUCTS its frames and two walks of one unchanged
	stack yield equal-valued but distinct objects.  Real identity would need a
	cache keyed to a physical frame, and the measurement in 9.47 says no such key
	exists: one activation walked twice and three separate activations of the
	same method on the same receiver at the same depth produce byte-identical
	(method, ip, receiver), while CPython answers one frame object for the first
	and three for the second.  Claiming identity would therefore assert something
	unverifiable, and would silently report a loop's repeated calls as a single
	frame that moved.

	So equality states what Grail can actually know.  BoundMethod settled the
	same question the same way and for the same reason -- every attribute access
	mints a fresh handle -- and this follows it exactly, including defining ONLY
	the Python-level __eq__/__hash__: Smalltalk =/hash are untouched, so
	Grail-internal collections that key frames by identity are unaffected.

	``f_back'' is compared RECURSIVELY, and it is what keeps this from
	over-matching.  Two frames that share a code object -- a recursive function's
	activations, say -- still differ in their caller chains, so only frames at the
	same depth of the same stack compare equal.  The chain terminates at None (see
	live_frames.py's the_chain_ends_rather_than_looping), so the recursion does.

	``f_lineno'' is deliberately NOT compared, which was measured rather than
	assumed.  A frame's line is mutable STATE -- in CPython it advances while the
	frame object stays the same -- so including it makes two readings of one frame
	taken at different lines unequal, where CPython (holding one object) says
	equal.  And it buys nothing against the case it looks like it should catch:
	two separate activations of the same function at the same depth return from
	the SAME line, so they compared equal with the line included too.  It is a
	false-negative source with no offsetting discrimination.  Consumers that care
	about the line read it directly, and traceback.walk_stack yields it alongside
	the frame as its own tuple element, so it is still compared there."

	| mine theirs myBack itsBack |
	(other @env0:isKindOf: PyFrame) ifFalse: [^ false].
	mine := self @env0:dynamicInstVarAt: #'f_code'.
	theirs := other @env0:dynamicInstVarAt: #'f_code'.
	(mine @env0:== theirs) ifFalse: [
		((mine @env0:isKindOf: PyCode) and: [theirs @env0:isKindOf: PyCode])
			ifFalse: [^ false].
		(mine __eq__: theirs) ifFalse: [^ false]].
	myBack := self @env0:dynamicInstVarAt: #'f_back'.
	itsBack := other @env0:dynamicInstVarAt: #'f_back'.
	(myBack @env0:== itsBack) ifTrue: [^ true].
	((myBack @env0:isNil or: [myBack @env0:== None])
		or: [itsBack @env0:isNil or: [itsBack @env0:== None]]) ifTrue: [^ false].
	^ myBack __eq__: itsBack
%

category: 'Grail-Comparison'
method: PyFrame
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: PyFrame
__hash__
	"Consistent with __eq__, and deliberately NOT over the f_back chain.
	Equal frames agree on their code, so hashing that alone keeps equal objects
	equal-hashing -- all a hash must promise -- without walking a stack that may
	be hundreds deep on every lookup."

	| code |
	code := self @env0:dynamicInstVarAt: #'f_code'.
	^ (code @env0:isKindOf: PyCode) ifTrue: [code __hash__] ifFalse: [0]
%

category: 'Grail-Tracebacks'
method: PyFrame
f_globals
	"The module globals this frame was executing in, as the LIVE PyModuleDict view
	-- the same object semantics as ``globals()'' inside that module.

	Derived rather than captured.  Grail has no real interpreter frames: a
	traceback frame is reconstructed from the VM's (method, ip, receiver) triples,
	and threading a namespace through that walk would mean touching the most
	delicate code in the traceback path.  The frame's PyCode already carries
	``co_filename'', which identifies the module unambiguously -- one entry in
	sys.modules has that __file__ -- so the namespace is resolved on demand
	instead.

	Answers None when the module cannot be identified (a synthesised frame, or
	code with no file), which is what a consumer must tolerate anyway.

	This is what lets traceback.py suggest a name for a NameError: its candidates
	are the frame's locals, globals and builtins, and with globals absent there
	was nothing to match a misspelled module-level name against."

	| code fname found |
	code := [self @env0:dynamicInstVarAt: #'f_code']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(code isNil or: [code == None]) ifTrue: [^ None].
	fname := [code @env0:dynamicInstVarAt: #'co_filename']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(fname isNil or: [fname == None]) ifTrue: [^ None].
	found := nil.
	"sys.modules is a SymbolDictionary, so this is a Smalltalk iteration over its
	VALUES -- not a Python mapping walk."
	[(importlib @env1:modules) @env0:do: [:mod |
		(found isNil and: [(mod isKindOf: module)
			and: [((mod @env0:dynamicInstVarAt: #'__file__') @env0:= fname) == true]])
				ifTrue: [found := mod]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	found isNil ifTrue: [^ None].
	^ (Python @env0:at: #'PyModuleDict') @env0:on: found
%

set compile_env: 0

category: 'Grail-Tracebacks'
classmethod: PyFrame
___isInternalTempName___: aString
	"Is this temp name Grail's or the VM's rather than the Python program's?

	Three kinds get dropped.  ``___curPos___'' and ``___f___'' are Grail's own
	bookkeeping temps, emitted into every generated method by the AST codegen --
	___curPos___ carries (line, col, endLine, endCol, sourceLine), which is how a
	traceback finds its line.  ``self'' is the Smalltalk receiver.  And a name
	beginning with a period is a VM-synthesised evaluation temp: the kernel's
	_frameContentsAt: names those '.t1', '.t2', ... itself, so they are an artefact
	of reading the frame, not anything the source declared.

	The ___name___ rule can in principle hide a Python local actually spelled
	``___x___''.  That is legal Python and would be wrongly suppressed; it is
	accepted because a name in that shape inside a Python program is
	vanishingly rare next to the certainty that every single generated method
	carries ___curPos___."

	| sz |
	aString isNil ifTrue: [^ true].
	sz := aString size.
	sz == 0 ifTrue: [^ true].
	(aString at: 1) == $. ifTrue: [^ true].
	aString = 'self' ifTrue: [^ true].
	^ (sz >= 7)
		and: [((aString copyFrom: 1 to: 3) = '___')
			and: [(aString copyFrom: sz - 2 to: sz) = '___']]
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___tempsFromFrameContents___: aFrameContents
	"Name -> value for the local variables in one frame-contents Array, as a
	Smalltalk Dictionary.  Answers nil when the Array is unusable.

	TAKES THE CONTENTS, NOT A LEVEL, AND THAT IS THE WHOLE POINT.  ``GsProcess
	class >> _frameContentsAt:'' numbers levels from the SENDER of the method that
	calls it, so a level is meaningful only inside the frame that computed it.  A
	first version of this read the primitive itself, and a caller that found a
	frame at level L and asked for its temps got the temps of level L+1 -- the
	numbering had shifted by the one frame between the two methods.  It reported
	``first -> <absent>'' with a frame full of ___pyRaiseNew___''s arguments, which
	is a confusing enough symptom to be worth designing out rather than
	commenting on.  So the primitive is called by whoever owns the walk, and this
	method only interprets what came back.

	Layout (from the kernel method's own comment): 9 is argAndTempNames, 10 is the
	receiver, and 11.. are the argument and temp VALUES -- so names[i] pairs with
	contents[10 + i].

	THE COMMENT ON THE KERNEL METHOD IS WRONG ON 4.0.  It says that for the
	class-side variant element 9 ``is always nil''.  It is not: the names come
	back, which is what makes this usable rather than a list of anonymous values.
	Read defensively anyway -- nil names are treated as no answer -- because the
	documented contract says one thing and the implementation another.

	An UNASSIGNED temp reads as Smalltalk nil and is OMITTED, which matches
	CPython: f_locals holds only bound names.  That is safe precisely because
	Python's None is a distinct object in Grail and never Smalltalk nil, so a
	local explicitly assigned None is still reported."

	| names dict |
	aFrameContents isNil ifTrue: [^ nil].
	aFrameContents size < 10 ifTrue: [^ nil].
	names := aFrameContents at: 9.
	names isNil ifTrue: [^ nil].
	dict := Dictionary new.
	1 to: names size do: [:i | | nm val |
		nm := (names at: i) asString.
		val := aFrameContents atOrNil: 10 + i.
		((self ___isInternalTempName___: nm) or: [val isNil])
			ifFalse: [dict at: nm put: val]].
	^ dict
%

category: 'Grail-Live Frames'
classmethod: PyFrame
___liveFrameContentsByLevel___
	"The frame contents of EVERY level of the currently executing process,
	innermost first, as an Array whose INDEX IS THE LEVEL.

	Read in ONE tight loop, in ONE method, and that is a correctness requirement
	rather than a tidiness one.  ``GsProcess class >> _frameContentsAt:'' numbers
	levels from the sender of whatever method calls it, so the numbering shifts
	with the caller's own depth -- including with the block nesting of the call
	site, since a block gets a frame of its own.  Two loops in the same method
	would therefore disagree by however many frames separated them.  Collecting
	everything once, up front, means the numbering has exactly one origin and the
	rest of the walk works on an ordinary indexable collection.
	___tempsFromFrameContents___ records the same hazard from the other end: it
	takes contents rather than a level for this reason.

	Stops at the first unreadable level.  A nil means the base of the process has
	been passed, and treating it as the end rather than skipping it keeps index ==
	level, which the offset arithmetic in
	BaseException class>>___liveFrameLevelOffset___:levels: depends on.

	Bounded at 512 levels, and CATCHING Error RATHER THAN AbstractException, both
	because of the same scenario: a runaway recursion.

	AlmostOutOfStack is a NOTIFICATION, not an Error -- ``AbstractException,
	Exception, Notification, Admonition'' is its chain -- and it is the signal
	BaseException class>>___recursionGuard___ converts into a catchable
	RecursionError.  A per-level ``on: AbstractException do: [:e | e return: nil]''
	therefore SWALLOWS it, and this sweep is uniquely placed to do so: it runs on
	every sys._getframe and walks the whole stack, so it installs a handler at every
	level of a stack that is already nearly exhausted.  The symptom was a
	TracebackTestCase error that appeared only when the WHOLE class ran -- the
	individual test passed, because run alone it started shallower -- which is about
	as quiet as this kind of defect gets.

	The bound is the second half.  Sweeping 6645 levels (the depth the CPython
	suite's deeper stack reaches) allocates one Array per level per _getframe, which
	is memory pressure applied at exactly the moment there is least of it.  512
	covers any depth a traceback or a debugger actually shows; past it a frame
	simply reports no locals, the same fail-closed answer a misaligned level gets.

	NOT gated, though it is not free.  A 30-level sweep measures at 1.5
	microseconds, and locals attachment as a whole takes ___liveFrameChain___ from
	3.33 to 6.33 microseconds per call on a ~10-frame stack -- roughly double.
	Gating was drafted and abandoned because the question cannot be answered at the
	right time: traceback.walk_stack asks sys._getframe for the frame and only THEN
	decides to read f_locals, so nothing at frame-construction time knows whether
	the locals will be wanted."

	| out done lvl |
	out := OrderedCollection new.
	done := false.
	lvl := 1.
	[done not and: [lvl <= 512]] whileTrue: [
		| fc |
		fc := [GsProcess _frameContentsAt: lvl]
			on: Error do: [:e | e return: nil].
		fc isNil
			ifTrue: [done := true]
			ifFalse: [
				out add: fc.
				lvl := lvl + 1]].
	"An Array, because the consumer indexes it defensively with ``atOrNil:'' -- a
	level derived from an offset can point past the end, and OrderedCollection does
	not implement that selector."
	^ out asArray
%

category: 'Grail-Live Frames'
classmethod: PyFrame
___pyLocalsFromFrameContentsList___: aContentsList
	"``f_locals'' for one live frame: a PyDict of name -> live VALUE, or nil when
	the frame has no Python locals to report.

	A PyDict and not a Smalltalk Dictionary, because the consumer is Python code:
	traceback.py's FrameSummary does ``locals.items()'' over it.  A Dictionary is
	visible to getattr and NOT iterable from Python, which is the exact failure
	___captureFrameLocalsIfSuggestible___ hit when it stored one -- nothing
	raised, nothing worked, because traceback.py's guarded call swallowed the
	MessageNotUnderstood.

	NIL RATHER THAN AN EMPTY DICT when there is nothing to report.  f_locals is
	read as ``getattr(frame, ''f_locals'', None)'' and stored only when non-nil,
	so absent is a shape every consumer already handles; an empty PyDict would
	instead make a frame claim, positively, that it has no variables -- which for
	a frame Grail merely could not read is a lie rather than a gap.

	Filtering and the unbound-temp rule are ___tempsFromFrameContents___'s, so
	``___curPos___'', the VM's own ''.t1'' evaluation temps, and the
	``___positional___''/``___kwargs___'' pair a Python function block is called
	with all drop out by the one ___name___ rule, and an unassigned temp is
	omitted rather than reported as None.

	TAKES A LIST OF FRAMES, INNERMOST FIRST, because one Python frame is often
	several Smalltalk ones and the locals are split across them.  A def in a class
	body compiles with its body inside a zero-argument block, so the METHOD's own
	frame reports no names at all and every local lives in the block -- measured
	as ``names=()'' for ``test_it'' beside ``names=(b a ___curPos___)'' for the
	block one level in.  A comprehension inside a function is the same shape the
	other way round: the block frame holds the comprehension's temps and the
	method frame holds the function's arguments.  Reading either frame alone loses
	half the answer, so the walk hands over every Smalltalk frame it merged into
	this Python frame and they are unioned here.

	INNERMOST WINS on a name collision -- first entry in the list, first write into
	the dict -- which is the same precedence ___liveFramePairsFrom___ already
	applies to the LINE number, and for the same reason: the innermost frame is
	the one actually executing."

	| out dictClass drop |
	aContentsList isNil ifTrue: [^ nil].
	"LOOKED UP AT RUNTIME, not compiled as a literal.  install.gs files this class
	at line 1206 and PyDict.gs at 1408, so ``PyDict'' is not yet a symbol when this
	method is compiled -- it fails the file-in outright with ``undefined symbol''
	rather than deferring like a forward reference in a method body would."
	dictClass := Python at: #'PyDict' otherwise: nil.
	dictClass isNil ifTrue: [^ nil].
	"Computed BEFORE the merge rather than removed after it.  An earlier version
	built the dict and then sent ``removeKey:otherwise:'', which raised
	rtErrKeyNotFound on a PyDict for a key ``includesKey:'' had just answered true
	for -- a Python dict is not a plain KeyValueDictionary and its removal protocol
	is not the kernel's.  Deciding first and never mutating avoids the question."
	drop := self ___transportNamesIn___: aContentsList.
	out := nil.
	aContentsList do: [:fc |
		| temps |
		temps := self ___tempsFromFrameContents___: fc.
		temps isNil ifFalse: [
			temps keysAndValuesDo: [:k :v |
				(drop includes: k) ifFalse: [
					out isNil ifTrue: [out := dictClass new].
					(out includesKey: k) ifFalse: [out at: k put: v]]]]].
	^ out
%

category: 'Grail-Live Frames'
classmethod: PyFrame
___transportNamesIn___: aContentsList
	"The codegen TRANSPORT argument names among these frames' locals, as a Set.

	A Smalltalk method argument cannot be assigned and a Python parameter can, so
	FunctionDefAst emits the method argument under a transport name and unpacks it
	into a block temp carrying the real name -- ``_q'' beside ``q'' for
	``def meth(self, q)'' whose body rebinds q (FunctionDefAst.gs, around the
	``candidate := ''_'' , (paramNames at: i)'' line).  Both frames are merged into
	one Python frame here, so without this a captured-locals rendering reported
	``_q = 11'' and ``q = 11'', one of which is an artefact of the compilation
	strategy and not a variable the program has.

	The other transport spelling, ``___N'', needs nothing: ___isInternalTempName___
	already drops it by the ___name___ rule.

	NARROWED TO ARGUMENTS OF REAL METHODS, which is what makes this exact rather
	than a guess about underscores.  A transport is only ever a method argument --
	block temps are assignable, so a block never needs one -- and it exists only
	when the real name is also present, as the block temp it unpacks into.  So a
	``_x'' in an argument position with an ``x'' in the same Python frame is a
	transport, and a Python local genuinely spelled ``_x'' is untouched wherever it
	is a temp.

	Residual, accepted: ``def f(_q, q)'' whose body rebinds q has a genuine
	parameter ``_q'' in an argument position with ``q'' present, and this would drop
	it.  Codegen avoids the collision (it falls back to ``___2'' when the candidate
	is already a parameter), so nothing is mislabelled -- a real variable is simply
	not reported.  Accepted on the same ground ___isInternalTempName___ accepts the
	___name___ rule: the shape is vanishingly rare next to the certainty that
	rebound parameters are everywhere."

	| all out |
	out := Set new.
	aContentsList isNil ifTrue: [^ out].
	"Every name in the merged Python frame, so that ``is the real name present?''
	is asked of the WHOLE frame and not just of the one Smalltalk frame the
	transport argument sits in -- the block temp it unpacks into is by construction
	in a different frame."
	all := Set new.
	aContentsList do: [:fc |
		| names |
		names := fc atOrNil: 9.
		names isNil ifFalse: [
			names do: [:each | each isNil ifFalse: [all add: each asString]]]].
	aContentsList do: [:fc |
		| meth names nArgs |
		meth := fc atOrNil: 1.
		names := fc atOrNil: 9.
		(meth notNil and: [names notNil]) ifTrue: [
			"Error, not AbstractException, for the reason
			 ___liveFrameContentsByLevel___ records: AlmostOutOfStack is a
			 Notification and must not be swallowed on a deep stack."
			(([meth selector] on: Error do: [:e | e return: nil]) notNil)
				ifTrue: [
					nArgs := [meth numArgs] on: Error do: [:e | e return: 0].
					1 to: (nArgs min: names size) do: [:i |
						| nm |
						nm := (names at: i) asString.
						((nm size > 1) and: [(nm at: 1) == $_]) ifTrue: [
							(all includes: (nm copyFrom: 2 to: nm size))
								ifTrue: [out add: nm]]]]]].
	^ out
%


category: 'Grail-Tracebacks'
classmethod: PyFrame
___liveTempsReport___: aMaxLevel
	"Diagnostic dump of the live stack: one line per readable level, giving the
	method selector, the names and the values.  Exists so that a FAILING
	assertion about locals can say what it actually saw.

	The capability this rests on is gem-dependent in a way that cannot be
	reproduced locally -- see ___liveTempsAtLevel___ -- so when it breaks it will
	break on CI, on a machine nobody is sitting at.  A bare ``expected 3, got
	nil'' would leave no way to tell a primitive that failed outright from names
	that came back empty from values that came back nil."

	| s |
	s := WriteStream on: String new.
	1 to: aMaxLevel do: [:lvl | | fc |
		fc := [GsProcess _frameContentsAt: lvl]
			on: Error do: [:e | e return: nil].
		fc isNil
			ifTrue: [s nextPutAll: 'L'; print: lvl; nextPutAll: ' <nil frame>'; nl]
			ifFalse: [
				s nextPutAll: 'L'; print: lvl; nextPutAll: ' sel=';
					nextPutAll: ((fc at: 1) isNil
						ifTrue: ['<no method>']
						ifFalse: [(fc at: 1) selector printString]);
					nextPutAll: ' names='; nextPutAll: (fc at: 9) printString;
					nextPutAll: ' vals='.
				11 to: fc size do: [:i |
					s nextPutAll: (fc atOrNil: i) printString; nextPutAll: ' '].
				s nl]].
	^ s contents
%

set compile_env: 0

category: 'Grail-Tracebacks'
classmethod: PyFrame
___innermostPythonFrameLocals___
	"Name -> value for the locals of the innermost GRAIL-GENERATED frame on the
	live stack, or nil if there is none.  Answers a Smalltalk Dictionary.

	Called at RAISE time, which is the only moment the values exist.  A rendered
	traceback is built after the stack unwound, from the VM's captured (method,
	ip, receiver) triples, and those carry no temporaries -- CPython keeps real
	frame objects alive and Grail reconstructs them, so locals are recoverable
	only while the frame is still on the stack.

	FINDS THE FRAME BY MARKER, NOT BY DEPTH.  Every method the AST codegen emits
	carries a ___curPos___ temp, and no hand-written Smalltalk runtime method
	does, so the first level whose names include it is the innermost Python
	frame.  The alternative -- counting the frames of the raise path -- would
	break whenever that path gained or lost a hop, and it has several shapes
	(___pyRaiseNew___:args:kw:, ___signal___:, the runtime's own hand-built
	raises), so there is no one depth to count.

	Levels are numbered from the SENDER of whoever calls _frameContentsAt:, and
	that is safe here only because the walk starts at 1 and stops at a marker: no
	level number is carried across a method boundary.  Delegating to
	___innermostPythonFrameSnapshot___ adds one hop, which shifts every level by
	one and changes nothing -- the walk still begins at 1 and still stops at the
	first marked frame.  See ___tempsFromFrameContents___ for what happens when a
	level number IS carried across."

	| snapshot |
	snapshot := self ___innermostPythonFrameSnapshot___.
	snapshot isNil ifTrue: [^ nil].
	^ snapshot at: 1
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___innermostPythonFrameSnapshot___
	"The innermost Grail-generated frame on the live stack as

	    { localsDictionary. receiverName. receiverValue }

	or nil when there is none.  ``receiverName'' is the name the PYTHON SOURCE
	gave that frame's receiver parameter (``self'' by convention) and is nil --
	with the value nil beside it -- whenever the frame is not a method body's.

	Finds the frame by marker exactly as ___innermostPythonFrameLocals___
	describes; this is that walk, widened to report the receiver as well as the
	temporaries.  It is one walk rather than two because both answers come out of
	the same frame-contents Array, and reading it twice would mean walking the
	stack twice on every raise that can carry a suggestion.

	WHY THE RECEIVER IS WORTH REPORTING AT ALL.  A Python method's ``self'' is
	not a temporary in Grail -- it is the Smalltalk RECEIVER -- so it is absent
	from the names in element 9 and ___isInternalTempName___ drops the spelling
	besides.  CPython's suggestion logic consults it twice: it offers
	``self.<name>'' for an undefined bare name that is an attribute of the
	instance, and it stops hiding underscored candidates when a failed attribute
	access came from inside the object's own method.  Both read
	frame.f_locals['self'], so with no receiver both silently declined.

	WHERE THE RECEIVER ACTUALLY IS.  Not in the marked frame.  Codegen emits a
	method body as ``^ [ ... ] value'', so the frame carrying ___curPos___ is a
	BLOCK's, and a block frame's element 10 is the ExecBlock itself -- which for a
	zero-argument block reports hasReceiver=false and answers nil to both
	``receiver'' and ``selfValue'', because the block does not copy a self it can
	reach through its home.  So the receiver has to come from the frame running
	the HOME METHOD, which is the next one outward.  Found by identity against
	homeMethod rather than by a fixed offset, and searched INSIDE THIS METHOD
	because _frameContentsAt: numbers levels from its caller's sender: a helper
	doing the search would renumber every level and read the wrong frames, which
	is the trap ___tempsFromFrameContents___ was written to design out."

	| lvl sawCallable |
	lvl := 1.
	sawCallable := false.
	[lvl <= 64] whileTrue: [
		| fc names meth |
		fc := [GsProcess _frameContentsAt: lvl]
			on: Error do: [:e | e return: nil].
		fc isNil ifFalse: [
			"AN UNMARKED PYTHON CALLABLE BETWEEN THE RAISE AND THE MARKED FRAME means
			the marked frame is not the one that raised.  A LAMBDA is the case that
			matters: codegen emits its body INLINE in the two-argument calling-convention
			block, with no ___curPos___ of its own, so the marker walk runs straight past
			it and lands on the enclosing method -- whose receiver CPython does not report
			for a lambda's frame, because a lambda has no ``self''.  Two arguments is the
			signature of a Python callable's entry block (:___positional___ :___kwargs___);
			a comprehension or generator body takes one, and a method body none.
			Frames nearer the raise are the LOWER levels, so this is set before the marked
			frame is reached and never by anything outside it.
			Costing the frame its receiver is the right way to be wrong here: it declines a
			suggestion, which is what Grail did before it had a receiver at all."
			meth := fc atOrNil: 1.
			(meth notNil and: [meth selector isNil
				and: [([meth numArgs] on: AbstractException do: [:e | e return: 0]) = 2]])
					ifTrue: [sawCallable := true].
			names := fc size >= 9 ifTrue: [fc at: 9] ifFalse: [nil].
			(names notNil and: [self ___namesIncludeCodegenMarker___: names])
				ifTrue: [
					| home rcvrName rcvr probe |
					home := [self ___bodyHomeMethodOf___: meth]
						on: AbstractException do: [:e | e return: nil].
					rcvrName := (home isNil or: [sawCallable])
						ifTrue: [nil]
						ifFalse: [[self ___receiverNameForMethod___: home]
							on: AbstractException do: [:e | e return: nil]].
					"A NESTED DEF'S BODY IS A ZERO-ARGUMENT BLOCK TOO, so numArgs alone does
					not tell it from the method's own body: codegen wraps the def in a
					two-argument block for the calling convention and puts the BODY in a
					plain block inside that, and it is the inner one that carries
					___curPos___ and gets found here.  Its homeMethod is still the
					enclosing method, so without this the receiver of every nested def
					would be the instance of the method around it -- which CPython does not
					report, and which test_traceback would have consulted from a nested def
					inside a TestCase method several dozen times over.
					Asked of the LINE, using the same resolver the live-stack walk uses to
					name such a frame: a line inside a nested def's range belongs to that
					def, and the method's own statements (the call line included) do not."
					(rcvrName notNil and: [
						| line |
						line := [self ___curPosLineFromFrameContents___: fc]
							on: AbstractException do: [:e | e return: nil].
						line notNil and: [
							([BaseException ___nestedFunctionNameFor___: home line: line]
								on: AbstractException do: [:e | e return: nil]) notNil]])
						ifTrue: [rcvrName := nil].
					rcvr := nil.
					rcvrName isNil ifFalse: [
						"From the marked frame outward: level lvl is the body block itself
						when the body is a block, and IS the home method when the def was
						compiled to one (a module-level def).  Bounded, because a home that
						is not there is a reason to report no receiver, not to walk the
						whole stack looking for one."
						probe := lvl.
						[(probe <= (lvl + 8)) and: [rcvr isNil]] whileTrue: [
							| hfc |
							hfc := [GsProcess _frameContentsAt: probe]
								on: AbstractException do: [:e | e return: nil].
							(hfc notNil and: [(hfc atOrNil: 1) == home])
								ifTrue: [rcvr := hfc atOrNil: 10].
							probe := probe + 1]].
					^ Array
						with: (self ___tempsFromFrameContents___: fc)
						with: (rcvr isNil ifTrue: [nil] ifFalse: [rcvrName])
						with: rcvr]].
		lvl := lvl + 1].
	^ nil
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___innermostPythonFrameReceiverAndTemps___
	"Array { receiver. tempsDictionary } for the innermost GRAIL-GENERATED frame
	on the live stack, or nil if there is none.

	Same walk and same marker as ___innermostPythonFrameLocals___, kept SEPARATE
	rather than sharing one implementation: that method is on the traceback path,
	where its level numbering is load-bearing (see ___tempsFromFrameContents___
	for the off-by-one that numbering caused once already), and routing it through
	another method to save ten lines would put a new frame between the walk and
	its caller for no benefit to it.  The marker search tolerates that shift --
	which is why this method is free to do its own walk -- but the traceback path
	is not the place to prove it.

	THE RECEIVER AND THE METHOD are what this adds.  Frame-contents element 10 is
	the receiver and element 1 the GsNMethod, so a caller wanting the frame's
	GLOBALS as well as its locals can identify the defining module without a
	live-frame chain, and so without the raise one costs.  Both are needed: for a
	top-level def the receiver IS the module instance and settles it outright,
	while a method or a nested def has some other receiver and must be located
	through its method instead."

	| lvl |
	lvl := 1.
	[lvl <= 64] whileTrue: [
		| fc names |
		fc := [GsProcess _frameContentsAt: lvl]
			on: Error do: [:e | e return: nil].
		fc isNil ifFalse: [
			names := fc size >= 9 ifTrue: [fc at: 9] ifFalse: [nil].
			(names notNil and: [self ___namesIncludeCodegenMarker___: names])
				ifTrue: [
					^ Array
						with: (fc atOrNil: 10)
						with: (self ___tempsFromFrameContents___: fc)
						with: (fc atOrNil: 1)]].
		lvl := lvl + 1].
	^ nil
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___curPosLineFromFrameContents___: aFrameContents
	"The Python line the marked frame is suspended at, read out of its own
	``___curPos___'' temp, or nil.

	Taken from the frame rather than derived from the ip on purpose: ip -> line
	derivation fails closed for a frame suspended inside a protected block and
	differs again under native code, while ___curPos___ is a value the generated
	code assigned before the statement ran.

	Codegen writes it in two shapes -- an Array of (line, col, endLine, endCol,
	sourceLine) at expression granularity, and a bare SmallInteger beginLine at
	statement granularity (see BaseException>>___pushFrameFromPos___) -- so both
	are read.  Layout as in ___tempsFromFrameContents___: names[i] pairs with
	contents[10 + i]."

	| names |
	aFrameContents isNil ifTrue: [^ nil].
	aFrameContents size < 10 ifTrue: [^ nil].
	names := aFrameContents at: 9.
	names isNil ifTrue: [^ nil].
	1 to: names size do: [:i |
		((names at: i) asString = '___curPos___') ifTrue: [
			| pos |
			pos := aFrameContents atOrNil: 10 + i.
			pos isNil ifTrue: [^ nil].
			(pos isKindOf: SmallInteger) ifTrue: [^ pos].
			^ (pos isKindOf: Array) ifTrue: [pos atOrNil: 1] ifFalse: [nil]]].
	^ nil
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___bodyHomeMethodOf___: aMethod
	"The METHOD whose body the marked frame is running, or nil when the frame is
	not a method body's at all.

	A def compiled to a real Smalltalk method (a module-level one) IS its own
	answer.  A def compiled to a block -- every class-body def, whose body codegen
	emits as ``^ [ ... ] value'' -- answers its homeMethod.

	A NESTED FUNCTION MUST NOT BORROW ITS ENCLOSING METHOD'S RECEIVER, and this is
	where that is refused.  Codegen emits a def inside a method as a TWO-argument
	block (:___positional___ :___kwargs___) within that method, so its homeMethod
	is the enclosing method and the receiver table would answer that method's
	``self''.  In CPython the nested function's frame has no ``self'' at all unless
	it closes over one, so reporting the outer instance would invent a suggestion
	about an object the failing code never mentions -- and test_traceback is full
	of nested defs inside test methods, every one of which would have started
	consulting the TestCase.  A method body is the ZERO-argument case, which is the
	same distinction ___liveFrameChainPairs___ draws by numArgs to tell a nested
	function's frame from a method's."

	aMethod isNil ifTrue: [^ nil].
	aMethod selector isNil ifFalse: [^ aMethod].
	([aMethod numArgs] on: AbstractException do: [:e | e return: -1]) = 0
		ifFalse: [^ nil].
	^ [aMethod homeMethod] on: AbstractException do: [:e | e return: nil]
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___receiverNameForMethod___: aMethod
	"The name the Python source gave the receiver parameter of the def that
	compiled to ``aMethod'' -- ``self'' by convention, ``cls'' for a classmethod --
	or nil when there is no such name: a module-level function, a @staticmethod, or
	a hand-written runtime method.

	READ FROM THE SOURCE'S OWN RECORD, NOT INFERRED.  The class-side
	``___methodReceiverTable___'' that ClassDefAst emits beside
	___methodCodeTable___ maps each def's Python name to the receiver parameter it
	declared.  Consulting it is what makes the answer trustworthy: because Grail
	passes ``self'' as the Smalltalk receiver, EVERY generated frame has a
	populated receiver slot, so a frame cannot be asked whether its receiver is a
	Python ``self'' -- only the table knows.  Inferring instead (``the receiver is
	a PythonInstance, so call it self'') would put a ``self'' into the locals of
	every module-level function, and CPython's suggestion logic keys on the name
	being present.

	Walks the same lookup chain as the other class-side tables
	(importlib ___methodLookupChainFor___:), because a mixin's methods are
	recompiled onto the subclass while their tables stay behind -- the reason
	BaseException>>___liveFrameCodeFor___:name: walks it too.  Every hop is
	guarded: this runs inside a raise, and a class whose accessor refuses must
	cost the frame its receiver name and nothing more."

	| pyName cls chain |
	aMethod isNil ifTrue: [^ nil].
	pyName := [BaseException ___pythonFrameNameFor___: aMethod selector]
		on: AbstractException do: [:e | e return: nil].
	pyName isNil ifTrue: [^ nil].
	cls := [aMethod inClass] on: AbstractException do: [:e | e return: nil].
	cls isNil ifTrue: [^ nil].
	chain := [importlib ___methodLookupChainFor___: cls]
		on: AbstractException do: [:e | e return: nil].
	chain isNil ifTrue: [chain := Array with: cls].
	chain do: [:c |
		"The table is compiled in environment 1, so an env-0 probe never sees it."
		((c class whichClassIncludesSelector: #'___methodReceiverTable___'
			environmentId: 1) ~~ nil) ifTrue: [
				| tbl nm |
				tbl := [c @env1:___methodReceiverTable___]
					on: AbstractException do: [:e | e return: nil].
				tbl isNil ifFalse: [
					nm := [tbl at: pyName otherwise: nil]
						on: AbstractException do: [:e | e return: nil].
					nm isNil ifFalse: [^ nm asString]]]].
	^ nil
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___namesIncludeCodegenMarker___: names
	"Does this frame's temp-name list mark it as a method the AST codegen emitted?

	``___curPos___'' is the position temp every generated method carries; it holds
	(line, col, endLine, endCol, sourceLine) and is how a traceback finds its
	line.  Testing for it identifies a Python frame without needing to know
	anything about the method's name or class."

	1 to: names size do: [:i |
		((names at: i) asString = '___curPos___') ifTrue: [^ true]].
	^ false
%

category: 'Grail-Attribute Access'
classmethod: PyFrame
___pythonValueAttrs___
	"``f_globals'' is a NAMESPACE -- a value, not a callable -- so a read must
	invoke the accessor and hand back the mapping rather than BoundMethod-wrapping
	the selector.  Every other frame field is a dynamic instVar, which
	___pyAttrLoad___ already returns by value.

	Deliberately NO ``f_builtins''.  CPython's is the real builtins module dict;
	Grail's builtins are METHODS on the builtins class, so there is no mapping to
	hand back and any dict built here would have to invent its values.  The names
	are available honestly as dir(builtins), and traceback.py reads them from there
	-- see its _candidates_for."

	^ IdentitySet new
		add: #'f_globals';
		yourself
%

set compile_env: 0

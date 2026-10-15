"Python frame object -- what ``tb.tb_frame`` returns and what
``traceback.walk_tb`` yields.

Grail has no real interpreter frames, so this is a lightweight carrier of the
fields a traceback consumer reads: ``f_code`` (a PyCode), ``f_lineno``,
``f_back`` (the caller frame or None) and ``f_globals``.  Stored as dynamic
instVars so Python attribute reads resolve the value directly through the
___pyAttrLoad___ dynamic-instVar probe (same mechanism as ``slice`` / PyCode).

Part of Phase 1 of the traceback design (docs/Python_Traceback_Design.md).

"
Class {
	#name : 'PyFrame',
	#superclass : 'object',
	#category : 'Grail-Tracebacks'
}

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___bodyHomeMethodOf___: aMethod [
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

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___curPosLineFromFrameContents___: aFrameContents [
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

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___frameTempsWithoutTransports___: aFrameContents [
	"___tempsFromFrameContents___ for ONE frame, with the codegen transport
	arguments removed -- the answer ___pyLocalsFromFrameContentsList___ produces
	for a merged frame, for a reader that has only the single frame.

	The single-frame reader is the RAISE-TIME snapshot, which walks to the
	innermost marked frame and reports it alone.  It therefore never went through
	___transportNamesIn___, and a method taking the fast path -- codegen emits
	``scale: _factor'' beside the calling-convention ``_scale:kw:'', with the body
	opening ``factor := _factor'' so the parameter is assignable -- reported both
	``_factor'' and ``factor'' in f_locals.  One of the two is a fact about the
	compilation strategy, not a variable the program has.

	Correct with a one-element list precisely because the transport and the name
	it unpacks into are in the SAME frame in this shape: the transport is the
	method's argument and the real name is that method's temporary."

	| temps drop out |
	temps := self ___tempsFromFrameContents___: aFrameContents.
	temps isNil ifTrue: [^ nil].
	drop := self ___transportNamesIn___: (Array with: aFrameContents).
	drop isEmpty ifTrue: [^ temps].
	out := Dictionary new.
	temps keysAndValuesDo: [:k :v |
		(drop includes: k) ifFalse: [out at: k put: v]].
	^ out

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___innermostPythonFrameLocals___ [
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

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___innermostPythonFrameReceiverAndTemps___ [
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
			on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]].
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

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___innermostPythonFrameSnapshot___ [
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
			on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]].
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
					"A FOURTH element: the Python function name this frame is running.
					 Appended rather than woven in, so #558's callers keep reading 1..3
					 unchanged.

					 It exists to stop a MISLABELLING.  The locals belong to the frame
					 that raised, and a traceback does not always contain that frame --
					 a raise inside nested defs caught one function out can produce a
					 traceback holding only the CATCHING frame.  Attaching the snapshot
					 to whatever frame happens to be pushed first then reports the
					 raising frame's variables under the catcher's name, which is a
					 wrong answer no consumer could detect.  Measured exactly that:
					 f_locals of {'i': 1} on a frame named 'driver'.  So the push
					 compares names and declines when they disagree."
					^ Array
						with: (self ___frameTempsWithoutTransports___: fc)
						with: (rcvr isNil ifTrue: [nil] ifFalse: [rcvrName])
						with: rcvr
						with: (self ___pythonNameForFrameMethod___: meth home: home contents: fc)]].
		lvl := lvl + 1].
	^ nil

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___isInternalTempName___: aString [
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

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___liveFrameContentsByLevel___ [
	"Every level of the currently executing process, up to the 512 the sweep has
	always been bounded at.  See the one-argument form for the whole story; this
	is the caller that wants the entire stack (sys._getframe reconstructs a chain
	as deep as there is)."

	^ self ___liveFrameContentsByLevel___: 512

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___liveFrameContentsByLevel___: maxLevels [
	"The frame contents of the first ``maxLevels'' levels of the currently
	executing process,
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

	BOUNDED BY THE CALLER, and the bound is why this takes an argument at all.
	The sweep is O(the whole live stack), while a consumer usually wants O(the
	frames it is about to describe) -- a traceback caught under a deep test
	harness reads 3 frames out of a 124-level stack.  Measured: the unbounded
	sweep adds ~22% to every caught exception when the traceback build asks for
	it, and almost all of that is levels nobody will look at.  sys._getframe
	still passes 512, because it really does want the whole chain.

	512 is the ceiling every caller should respect, and CATCHING Error RATHER
	THAN AbstractException, both because of the same scenario: a runaway
	recursion.

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
	[done not and: [lvl <= maxLevels]] whileTrue: [
		| fc erred |
		"A TRANSIENT read error is not the base of the process, and merging the
		two -- both used to answer nil -- let one flaky level TRUNCATE every
		level after it: the walk stopped, frames beyond the failure got no
		f_locals, and TracebackTestCase's a_traceback_frame_has_f_locals
		failed once in a sharded run and never again ('the raising frame
		reported no locals' -- the diagnostic that named this).  So an ERROR
		retries the level once, and a second failure records an EMPTY
		placeholder and moves on: index == level is preserved, which the
		offset arithmetic depends on, both consumers read #() as ``no locals
		here'' and skip it (___liveFrameLevelOffset___ probes ``atOrNil: 1'',
		___liveFrameContentsFor___ compares it to the method), and only the
		one level loses its locals rather than the whole tail of the stack.
		A genuine end -- nil WITHOUT an exception -- still stops the walk.
		#GrailPyLocalsFailCount injects failures for the resilience test;
		#GrailPyLocalsLevelFailures is the breadcrumb a still-flaking run
		leaves behind.  The same recipe as the source-probe fix in
		BaseException class>>___isGeneratedPythonMethod___:, because it is
		the same disease: one moment's bad read poisoning a whole answer."
		erred := false.
		fc := [
			| seam |
			seam := SessionTemps current at: #'GrailPyLocalsFailCount' otherwise: 0.
			seam > 0 ifTrue: [
				SessionTemps current at: #'GrailPyLocalsFailCount' put: seam - 1.
				Error new signal: 'grail locals test seam'].
			GsProcess _frameContentsAt: lvl]
			on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError) ifTrue: [e pass].
			erred := true.
			e return: nil].
		erred ifTrue: [
			erred := false.
			fc := [
				| seam |
				seam := SessionTemps current at: #'GrailPyLocalsFailCount' otherwise: 0.
				seam > 0 ifTrue: [
					SessionTemps current at: #'GrailPyLocalsFailCount' put: seam - 1.
					Error new signal: 'grail locals test seam'].
				GsProcess _frameContentsAt: lvl]
				on: Error do: [:e |
				(e isKindOf: AlmostOutOfStackError) ifTrue: [e pass].
				erred := true.
				e return: nil].
			erred ifTrue: [
				SessionTemps current
					at: #'GrailPyLocalsLevelFailures'
					put: ((SessionTemps current
						at: #'GrailPyLocalsLevelFailures' otherwise: 0) + 1).
				fc := #()]].
		fc isNil
			ifTrue: [done := true]
			ifFalse: [
				out add: fc.
				lvl := lvl + 1]].
	"An Array, because the consumer indexes it defensively with ``atOrNil:'' -- a
	level derived from an offset can point past the end, and OrderedCollection does
	not implement that selector."
	^ out asArray

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___liveTempsReport___: aMaxLevel [
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
			on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]].
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

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___namesIncludeCodegenMarker___: names [
	"Does this frame's temp-name list mark it as a method the AST codegen emitted?

	EITHER MARKER ANSWERS, because the two codegen paths spell it differently and
	this asks only whether the frame is generated Python at all.

	  * ``___curPos___'' is the TEXT emitter's position temp -- (line, col,
	    endLine, endCol, sourceLine), which is also how a traceback finds its
	    line.
	  * ``___grailPython___'' is the direct-to-IR marker (PR #893), stored purely
	    for identity because an IR method can carry no pragma and emits no
	    position temp at all -- its positions come from the map instead.

	Knowing only ``___curPos___'' is not a harmless omission here: this predicate
	is how ___innermostPythonFrameSnapshot___ FINDS the frame whose receiver and
	locals get snapshotted at raise time.  Under GRAIL_IR_CODEGEN the walk ran
	past every IR method, no snapshot was taken, and the exception reached
	traceback.py with ___frameLocalNames___ and ___frameSelf___ both absent -- so
	_raising_frame_self declined and a NameError inside a method lost its
	``self.<name>'' suggestion.  Measured, for a method whose body reads an
	undefined ``blech'' beside a local ``blich'':

	    text:  Did you mean: 'self.blech'?     (CPython's answer)
	    IR:    Did you mean: 'blich'?

	Note what is NOT widened: ___curPosLineFromFrameContents___: still tests for
	``___curPos___'' alone, and must.  That one reads the position VALUE out of
	the temp, and ``___grailPython___'' holds no position -- an IR frame's line
	comes from the position map."

	"Cheap tests first.  This runs for every frame of every raise's snapshot
	walk, and it copied each name (``asString'') and compared characters, every
	time: by identity for a Symbol, and for anything else by value only when the
	length could match."
	1 to: names size do: [:i |
		| nm |
		nm := names at: i.
		((nm == #'___curPos___') or: [nm == #'___grailPython___']) ifTrue: [^ true].
		"Lengths first, which every other name fails: the markers are 12 and 17
		characters, and comparing characters is most of what this cost."
		(nm isSymbol not and: [
			| str |
			str := nm asString.
			((str size == 12) and: [str = '___curPos___'])
				or: [(str size == 17) and: [str = '___grailPython___']]]) ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___pyDictFrom___: aDictionary [
	"A Smalltalk name -> value Dictionary as a Python dict.

	The raise-time snapshot answers a plain Dictionary, which Python can SEE
	through getattr and cannot use: len() and iteration both go through the Python
	dict protocol.  Storing the Smalltalk one is what made the first attempt at
	frame locals look wired up while nothing worked."

	| dictClass out |
	aDictionary isNil ifTrue: [^ nil].
	dictClass := Python at: #'PyDict' otherwise: nil.
	dictClass isNil ifTrue: [^ nil].
	out := dictClass new.
	aDictionary keysAndValuesDo: [:k :v | out at: k put: v].
	^ out

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___pyLocalsFromFrameContentsList___: aContentsList [
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
	"THE RECEIVER, under the name the def declared for it.  Grail passes a Python
	 method's ``self'' as the Smalltalk RECEIVER rather than as a temporary, and
	 ___isInternalTempName___ drops the spelling ``self'' besides, so a method
	 frame reached through this path reported every local EXCEPT the one CPython
	 always shows.  The raise-time snapshot has always added it
	 (___innermostPythonFrameSnapshot___); this is the same answer for the other
	 reader, which is the one that fills every frame but the innermost."
	^ self ___withReceiverFrom___: aContentsList into: out class: dictClass

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___pythonNameForFrameMethod___: meth home: home contents: fc [
	"The Python function name for the frame the snapshot walk landed on, or nil.

	Two shapes, the same two the traceback walk distinguishes: a real METHOD's
	selector decodes to its Python name, while a nested def's body is a BLOCK whose
	home is the enclosing method, so the name has to come from the ___curPos___ line
	falling inside a nested def.  Both helpers are BaseException's and are reused
	rather than reimplemented -- the two answers must agree with what the traceback
	walk names its frames, since the push compares them."

	| sel |
	sel := [meth selector] on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]].
	sel notNil ifTrue: [
		"___pythonFrameNameForMethod___, not the selector-only form: the MODULE
		BODY compiles to an ``initialize'' whose Python name is ``<module>'' and
		only the method knows that.  The two answers have to agree -- the push
		compares this name against the walk's before it will hand a frame its
		locals -- so a module frame named here as ``initialize'' would silently
		get none."
		^ [BaseException ___pythonFrameNameForMethod___: meth]
			on: AbstractException do: [:e | e return: nil]].
	home isNil ifTrue: [^ nil].
	^ [ | line |
	    line := self ___curPosLineFromFrameContents___: fc.
	    line isNil
			ifTrue: [nil]
			ifFalse: [BaseException ___nestedFunctionNameFor___: home line: line] ]
		on: AbstractException do: [:e | e return: nil]

]

{ #category : 'Grail-Attribute Access' }
PyFrame class >> ___pythonValueAttrs___ [
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
		"``f_locals'' joined it when a LIVE frame's locals stopped being a stored
		dynamic instVar and became a re-derived view.  Without the entry the read
		answered the BoundMethod itself -- ``'BoundMethod' object is not
		iterable'', which is what every reader saw."
		add: #'f_locals';
		yourself

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___receiverNameForMethod___: aMethod [
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

	| cache hit |
	aMethod isNil ifTrue: [^ nil].
	"MEMOISED PER METHOD.  The answer depends only on aMethod -- a recompiled def
	is a new method object -- and finding it rebuilds the class's receiver table
	(a fresh Dictionary per call) for every frame snapshot, which is to say on
	every raise: 15% of a Jinja render, which raises AttributeError for every
	``{{ row.field }}'' on a dict row.  Kept in SessionTemps, like the session's
	other runtime state."
	cache := SessionTemps current at: #'___GrailReceiverNameCache___' otherwise: nil.
	cache isNil ifTrue: [
		cache := IdentityKeyValueDictionary new.
		SessionTemps current at: #'___GrailReceiverNameCache___' put: cache].
	hit := cache at: aMethod otherwise: #'___unset___'.
	hit == #'___unset___' ifFalse: [^ hit].
	hit := self ___uncachedReceiverNameForMethod___: aMethod.
	cache at: aMethod put: hit.
	^ hit

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___tempsFromFrameContents___: aFrameContents [
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
	local explicitly assigned None is still reported.

	THE CALLING-CONVENTION ARGUMENTS ARE DROPPED BY POSITION, not by name.  A
	Python METHOD compiles to ``_m: positional kw: kwargs'' -- two Smalltalk
	arguments carrying the call's positional Array and keyword dict, which the
	body immediately unpacks into the real parameter names.  Neither is a
	variable the program has, and ``positional'' (the Array is always bound;
	``kwargs'' is usually nil and so was already omitted) showed up in the
	f_locals of every method frame.  A module-level function's pair is spelled
	``___pos___''/``___kw___'' and the ___name___ rule already dropped it, which
	is why this only ever surfaced on methods.  ___transportArgCountIn___ decides
	how many leading names are that pair; see it for why position is exact where
	the two spellings are not."

	| names dict nArgs |
	aFrameContents isNil ifTrue: [^ nil].
	aFrameContents size < 10 ifTrue: [^ nil].
	names := aFrameContents at: 9.
	names isNil ifTrue: [^ nil].
	dict := Dictionary new.
	nArgs := self ___transportArgCountIn___: aFrameContents.
	1 to: names size do: [:i | | nm val |
		nm := (names at: i) asString.
		val := aFrameContents atOrNil: 10 + i.
		((self ___isInternalTempName___: nm)
			or: [val isNil
				or: [i <= nArgs]])
			ifFalse: [dict at: nm put: val]].
	^ dict

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___transportArgCountIn___: aFrameContents [
	"How many LEADING names in this frame's name list are codegen's
	calling-convention transport arguments rather than the program's variables.
	Answers 2 for a generated method's frame and 0 for everything else.

	A Python method compiles to a two-argument Smalltalk method whose arguments
	carry the call itself: ``_m: positional kw: kwargs'', unpacked in the body
	into the parameters the def declared.  The two are always names 1 and 2 --
	Smalltalk lists arguments before temporaries -- so dropping them BY POSITION
	is exact, where dropping them by name would not be: ``positional'' and
	``kwargs'' are legal Python identifiers, and codegen is careful to rename its
	own pair to ``___pos___''/``___kw___'' when the program uses either
	(FunctionDefAst>>posMethodParam), so a program local spelled ``positional''
	really can appear in the same frame and must still be reported.

	Recognised by the SELECTOR SHAPE, ``_<something>:kw:'', rather than by the
	argument names, for the same reason.  A hand-written Smalltalk method never
	has it, and a block frame has no selector at all -- the block temps carrying
	the real names are what this leaves alone.

	Every probe is guarded: this runs while a traceback is being built, and a
	method that refuses to answer its selector must cost the frame a little
	noise, not the whole f_locals."

	| meth sel |
	aFrameContents isNil ifTrue: [^ 0].
	meth := aFrameContents atOrNil: 1.
	meth isNil ifTrue: [^ 0].
	sel := [meth selector] on: Error do: [:e |
		(e isKindOf: AlmostOutOfStackError)
			ifTrue: [e pass] ifFalse: [e return: nil]].
	sel isNil ifTrue: [^ 0].
	sel := sel asString.
	((sel size > 4) and: [(sel at: 1) == $_ and: [sel endsWith: ':kw:']])
		ifFalse: [^ 0].
	^ ([meth numArgs] on: Error do: [:e | e return: 0]) == 2
		ifTrue: [2] ifFalse: [0]

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___transportNamesIn___: aContentsList [
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
			(([meth selector] on: Error do: [:e |
			(e isKindOf: AlmostOutOfStackError)
				ifTrue: [e pass] ifFalse: [e return: nil]]) notNil)
				ifTrue: [
					nArgs := [meth numArgs] on: Error do: [:e | e return: 0].
					1 to: (nArgs min: names size) do: [:i |
						| nm |
						nm := (names at: i) asString.
						((nm size > 1) and: [(nm at: 1) == $_]) ifTrue: [
							(all includes: (nm copyFrom: 2 to: nm size))
								ifTrue: [out add: nm]]]]]].
	^ out

]

{ #category : 'Grail-Tracebacks' }
PyFrame class >> ___uncachedReceiverNameForMethod___: aMethod [
	"___receiverNameForMethod___:'s answer, worked out.  See that method."

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

]

{ #category : 'Grail-Live Frames' }
PyFrame class >> ___withReceiverFrom___: aContentsList into: aDict class: dictClass [
	"Add the Python receiver -- ``self'', or ``cls'' for a classmethod -- to a
	merged frame's locals, and answer the dict (creating one if the receiver is
	the only thing there is to report).

	WHY IT IS NOT ALREADY THERE.  A Python method compiles to a Smalltalk method
	whose receiver IS the instance, so ``self'' is not among the frame's
	temporaries at all, and ___isInternalTempName___ drops the literal name
	``self'' besides.  CPython's f_locals always carries it, and
	``capture_locals=True'' renderings are compared with CPython's line for line
	in test_traceback.

	NAMED FROM THE SOURCE'S OWN RECORD via ___receiverNameForMethod___, never
	inferred: a module-level function and a @staticmethod have a Smalltalk
	receiver too and must NOT grow a ``self''.  A nil name is the answer for
	those, and this then adds nothing.

	A NESTED DEF MUST NOT BORROW THE ENCLOSING METHOD'S RECEIVER.  Codegen emits
	a def inside a method as a two-argument block within that method, so walking
	outward from a nested function's body would reach the method and report its
	instance -- an object the nested function's frame does not have in CPython,
	and test_traceback is full of nested defs inside TestCase methods.  Refused
	the same way ___innermostPythonFrameSnapshot___ refuses it: an unnamed
	two-argument block among the frames merged here means they are a callable's,
	not the method body's.

	INNERMOST WINS, as everywhere else here: a local that shadows the receiver
	name keeps the entry it already wrote."

	| sawCallable |
	aContentsList isNil ifTrue: [^ aDict].
	sawCallable := false.
	aContentsList do: [:fc | | meth sel |
		meth := fc atOrNil: 1.
		meth isNil ifFalse: [
			"Error, not AbstractException, for the reason
			 ___liveFrameContentsByLevel___ records: AlmostOutOfStack is a
			 Notification and must not be swallowed on a deep stack."
			sel := [meth selector] on: Error do: [:e |
				(e isKindOf: AlmostOutOfStackError)
					ifTrue: [e pass] ifFalse: [e return: nil]].
			sel isNil
				ifTrue: [
					(([meth numArgs] on: Error do: [:e | e return: 0]) == 2)
						ifTrue: [sawCallable := true]]
				ifFalse: [ | nm rcvr d |
					sawCallable ifTrue: [^ aDict].
					nm := [self ___receiverNameForMethod___: meth]
						on: Error do: [:e |
							(e isKindOf: AlmostOutOfStackError)
								ifTrue: [e pass] ifFalse: [e return: nil]].
					nm isNil ifTrue: [^ aDict].
					rcvr := fc atOrNil: 10.
					rcvr isNil ifTrue: [^ aDict].
					d := aDict isNil ifTrue: [dictClass new] ifFalse: [aDict].
					(d includesKey: nm) ifFalse: [d at: nm put: rcvr].
					^ d]]].
	^ aDict

]

{ #category : 'Instance Creation' }
PyFrame class >> code: aCode lineno: aLineno back: aBack globals: aGlobals [
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

]

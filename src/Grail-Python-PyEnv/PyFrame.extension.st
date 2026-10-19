Extension { #name : 'PyFrame' }

{ #category : 'Grail-Tracebacks' }
PyFrame >> ___liveLocalsAtOuterIndex___: anIndex [
	"This frame's locals off a FRESH walk of the stack, or nil when the frame
	cannot be found there.

	Walks in from the innermost frame of a new chain to the one anIndex hops from
	the OUTER end -- the end that does not move, since a later read is deeper and
	never shallower -- then insists that it is running the same method this frame
	recorded.  Without that check a returned frame would silently report whichever
	frame now occupies its position: the same misattribution
	BaseException class >> ___liveFrameContentsFor___ guards the level arithmetic
	against, and just as undetectable downstream.

	RE-WALKS rather than re-reading levels directly.  Locating this frame needs the
	rule that decides which Smalltalk frames make up one Python frame -- a method
	plus its zero-argument blocks, but a two-argument block is a nested def and a
	frame of its own -- and a second implementation of that rule would be a second
	thing to keep right.  The walk costs ~6 us on a ten-frame stack, paid only by a
	reader of f_locals: exactly the trade the eager attachment could not make,
	because sys._getframe cannot know whether the locals will be wanted and the
	attribute read can.

	Reads the found frame's snapshot slot DIRECTLY, not through its f_locals, so
	this cannot recurse."

	| chain depth f mine theirs |
	mine := [self @env0:dynamicInstVarAt: #'___liveMethod___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	mine isNil ifTrue: [^ nil].
	chain := [BaseException @env0:___liveFrameChain___]
		@env0:on: Error do: [:e |
			(e @env0:isKindOf: AlmostOutOfStackError) ifTrue: [e @env0:pass].
			e @env0:return: nil].
	(chain isNil or: [chain == None]) ifTrue: [^ nil].
	depth := 0.
	f := chain.
	[(f isNil) not and: [(f == None) not]] whileTrue: [
		depth := depth @env0:+ 1.
		f := [f @env0:dynamicInstVarAt: #'f_back']
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	(anIndex @env0:>= depth) ifTrue: [^ nil].
	f := chain.
	(depth @env0:- 1 @env0:- anIndex) @env0:timesRepeat: [
		f := [f @env0:dynamicInstVarAt: #'f_back']
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	(f isNil or: [f == None]) ifTrue: [^ nil].
	theirs := [f @env0:dynamicInstVarAt: #'___liveMethod___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	theirs == mine ifFalse: [^ nil].
	"AN EMPTY DICT, NOT NIL, when the frame is there and has nothing to report.
	The two answers mean opposite things to the caller -- nil is ``I could not
	find it, keep what you had'' and empty is ``it has no variables now'' -- and
	collapsing them is what made a comprehension's target survive the loop in
	exactly the frames that had no OTHER bound local: a module body, and a
	function whose first statement is the comprehension.  Both read True for
	``'a' in f_locals'' while a function with one earlier local read False, which
	is as arbitrary as it sounds and was the last thing wrong here."
	^ ([f @env0:dynamicInstVarAt: #'___liveLocals___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil])
			ifNil: [PyFrame @env0:___pyDictFrom___: Dictionary @env0:new]

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> ___liveLocalsFromLevels___ [
	"This frame's locals read straight out of a fresh _frameContentsAt: sweep, or
	nil when its level cannot be found and confirmed.

	The sweep is the same one BaseException class >> ___liveFrameChain___ takes
	for its locals, and it needs no raise -- ``GsProcess class >>
	_frameContentsAt:'' reads the running process directly.  What the chain walk
	adds is names, lines and ip arithmetic, none of which a locals re-read wants.

	FINDING THE FRAME: the distance from the OUTER end of the sweep, recorded when
	the frame was built, then CONFIRMED by the method running there.  The outer end
	does not move while a frame is alive, so the distance names the same level; the
	confirmation is what turns ``the frame returned'' into a nil rather than into
	some other frame's variables read under this frame's name.

	COLLECTING THE REST: one Python frame is often several Smalltalk ones -- a
	method plus the zero-argument blocks its body compiles into -- so the levels
	INSIDE the method's own are taken while they are still blocks belonging to it.
	A two-argument block ends the run: that is a nested def, a Python frame of its
	own, and its temps are not this frame's.  The same rule
	___liveFramePairsFrom___ accumulates by, applied to the one frame being asked
	about instead of to the whole stack.

	The list is handed over INNERMOST FIRST, which is the order
	___pyLocalsFromFrameContentsList___ resolves collisions in."

	| lvl levels mine home fc list i scanning |
	mine := [self @env0:dynamicInstVarAt: #'___liveLevelMethod___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	mine isNil ifTrue: [^ nil].
	"The HOME is what the blocks of one Python frame share -- for a nested def,
	which is itself a block, that is the enclosing method and not the def."
	home := [mine @env0:homeMethod]
		@env0:on: Error do: [:e |
			(e @env0:isKindOf: AlmostOutOfStackError) ifTrue: [e @env0:pass].
			e @env0:return: nil].
	home isNil ifTrue: [home := mine].
	lvl := [self @env0:dynamicInstVarAt: #'___liveOuterLevel___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	lvl isNil ifTrue: [^ nil].
	levels := [PyFrame @env0:___liveFrameContentsByLevel___]
		@env0:on: Error do: [:e |
			(e @env0:isKindOf: AlmostOutOfStackError) ifTrue: [e @env0:pass].
			e @env0:return: nil].
	levels isNil ifTrue: [^ nil].
	lvl := levels @env0:size @env0:- lvl.
	((lvl @env0:< 1) or: [lvl @env0:> levels @env0:size]) ifTrue: [^ nil].
	fc := levels @env0:atOrNil: lvl.
	fc isNil ifTrue: [^ nil].
	(fc @env0:atOrNil: 1) == mine ifFalse: [^ nil].
	list := OrderedCollection @env0:new.
	i := lvl @env0:- 1.
	scanning := true.
	[scanning and: [i @env0:>= 1]] @env0:whileTrue: [
		| each m env |
		each := levels @env0:atOrNil: i.
		m := each isNil ifTrue: [nil] ifFalse: [each @env0:atOrNil: 1].
		env := m isNil ifTrue: [0] ifFalse: [m @env0:environmentId].
		"AN ENV-0 LEVEL IS SKIPPED, NOT A STOP.  Generated Python is threaded with
		Smalltalk runtime frames -- ``on:do:'' around every statement's traceback
		push, ``value'' around a comprehension's source block -- so the levels of
		ONE Python frame are not contiguous: a doit's comprehension measured as
		block, on:do:, block, block, on:do:, block, doit.  Stopping at the first
		env-0 level found the method and none of its blocks, which is
		``inside-in -> False'' where the target is plainly in scope.
		___liveFramePairsFrom___ has the same property for the same reason -- it
		walks every triple and simply matches neither branch on an env-0 one."
		(env @env0:= 1) @env0:not
			ifTrue: [i := i @env0:- 1]
			ifFalse: [
				"An env-1 level ends the run unless it is a zero-argument block of this
				same home: a method with a selector is the next Python frame out of this
				one's way, and a two-argument block is a nested def with a frame of its
				own."
				((m @env0:selector isNil)
					and: [([m @env0:numArgs] @env0:on: Error do: [:e | e @env0:return: -1]) @env0:= 0
					and: [([m @env0:homeMethod] @env0:on: Error do: [:e | e @env0:return: nil]) == home]])
						ifTrue: [
							"addFirst:, so walking outward-to-inward leaves the innermost level
							at the front -- the order ___pyLocalsFromFrameContentsList___
							resolves collisions in."
							list @env0:addFirst: each.
							i := i @env0:- 1]
						ifFalse: [scanning := false]]].
	list @env0:addLast: fc.
	"AN EMPTY DICT AND NOT NIL once the level is confirmed: the frame is on the
	stack and has nothing, which is a fact about it.  Nil here means only ``I
	could not find it'', and the caller reads the two differently -- see
	___liveLocalsAtOuterIndex___ for the case that made the distinction
	load-bearing."
	^ (PyFrame @env0:___pyLocalsFromFrameContentsList___: list @env0:asArray)
		ifNil: [PyFrame @env0:___pyDictFrom___: Dictionary @env0:new]

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> ___liveLocalsNow___ [
	"This frame's locals READ OFF THE STACK AS IT IS NOW, or nil when the frame is
	no longer on it.  PyFrameLocals calls this on every access.

	Nil means ``keep what you had'': a frame that has returned still answers the
	locals it last had, which is what CPython's proxy does for a frame whose
	execution finished."

	| idx byLevels |
	"THE CHEAP ROUTE FIRST.  ___liveLocalsAtOuterIndex___ re-walks the whole live
	chain, which means RAISING to get the VM's stack capture, converting its
	native ips, and building a PyFrame and a PyCode per frame -- all of it thrown
	away except one frame's locals.  Measured, that took a three-frame
	``StackSummary.extract(..., capture_locals=True)'' from 2.1 ms to 9.9 ms.
	Reading the levels directly needs no raise and no ips, and answers the same
	thing whenever the frame's own level can be found and confirmed."
	byLevels := self ___liveLocalsFromLevels___.
	byLevels isNil ifFalse: [^ byLevels].
	idx := [self @env0:dynamicInstVarAt: #'___liveOuterIndex___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	idx isNil ifTrue: [^ nil].
	^ self ___liveLocalsAtOuterIndex___: idx

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> ___liveLocalsSnapshot___ [
	"The locals recorded when this frame was built, or nil.  What a live view
	starts from and falls back to."

	^ [self @env0:dynamicInstVarAt: #'___liveLocals___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil]

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> ___liveLocalsSnapshotOrEmpty___ [
	"The snapshot taken when this frame was built, or -- when there is none -- an
	EMPTY dict, made once and kept so ``f.f_locals is f.f_locals'' holds.

	This used to raise AttributeError instead, deliberately: absent kept ``this
	frame has no variables'' apart from ``Grail could not read them'', and
	traceback.py asks ``getattr(frame, 'f_locals', None)'', so absent was a
	shape it handled.  pytest does not ask that way.  TracebackEntry.ishidden
	reads ``frame.f_locals'' directly on EVERY entry of a failure's traceback --
	looking for __tracebackhide__ -- and Grail snapshots locals only for the
	innermost frame, so every failing test whose traceback had an outer frame,
	or whose own frame bound nothing, ended pytest with an INTERNALERROR.
	CPython's frames always have the mapping, so the distinction is given up in
	favour of the shape (decided 2026-10-12).  What it costs: a frame Grail could
	not read reports no variables, and pytest cannot see a __tracebackhide__
	set in an outer frame."

	| snap empty dictClass |
	snap := [self @env0:dynamicInstVarAt: #'___liveLocals___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	snap isNil ifFalse: [^ snap].
	empty := [self @env0:dynamicInstVarAt: #'___emptyLocals___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	empty isNil ifFalse: [^ empty].
	"Looked up at run time: PyDict is filed after this class (see
	___pyLocalsFromFrameContentsList___)."
	dictClass := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #PyDict.
	empty := dictClass @env0:new.
	self @env0:dynamicInstVarAt: #'___emptyLocals___' put: empty.
	^ empty

]

{ #category : 'Grail-Comparison' }
PyFrame >> __eq__: other [
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

]

{ #category : 'Grail-Comparison' }
PyFrame >> __hash__ [
	"Consistent with __eq__, and deliberately NOT over the f_back chain.
	Equal frames agree on their code, so hashing that alone keeps equal objects
	equal-hashing -- all a hash must promise -- without walking a stack that may
	be hundreds deep on every lookup."

	| code |
	code := self @env0:dynamicInstVarAt: #'f_code'.
	^ (code @env0:isKindOf: PyCode) ifTrue: [code __hash__] ifFalse: [0]

]

{ #category : 'Grail-Comparison' }
PyFrame >> __ne__: other [
	^ (self __eq__: other) @env0:not

]

{ #category : 'Grail-String Representation' }
PyFrame >> __repr__ [
	| stream |
	stream := AppendStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '<frame at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPutAll: ', line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'f_lineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> clear [
	"CPython's frame.clear(): drop the frame's references to its local variables.
	traceback.clear_frames() walks a traceback calling it.

	Grail's traceback frames hold a raise-time SNAPSHOT of the innermost frame's
	locals rather than a live frame, so there is no execution state to unwind here
	-- releasing the mapping releases exactly the references the snapshot added,
	which is the whole purpose of the method.

	REPLACED with an empty dict rather than emptied in place, because Grail's dict
	has no ``clear'' of its own yet (a gap in PyDict, not here).  The observable
	contract is that f_locals stays readable and answers len() == 0 -- which is what
	test_clear asserts, and it re-reads the attribute afterwards, so identity does
	not enter into it.

	CPython raises RuntimeError for a frame that is still EXECUTING.  A Grail
	traceback frame never is: it is built after the stack has unwound.

	A generator's or coroutine's frame (gi_frame / cr_frame) is different: it
	belongs to its generator, reached through a weak link, and clearing it is
	the generator's business -- refused while it runs or is suspended, and
	otherwise a finalization, which for an unstarted coroutine is the
	never-awaited warning (PythonGenerator>>___clearFromFrame___)."

	| ref gen |
	ref := self @env0:dynamicInstVarAt: #'___generator___'.
	ref @env0:notNil ifTrue: [
		gen := ref @env0:value.
		gen @env0:notNil ifTrue: [gen ___clearFromFrame___]].
	self @env0:dynamicInstVarAt: #'f_locals'
		put: (PyFrame @env0:___pyDictFrom___: Dictionary @env0:new).
	^ None

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> f_globals [
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
	"THEN THE SESSION'S MODULE INSTANCES, which do not depend on sys.modules.
	A module that has left sys.modules -- popped, replaced by a stand-in, or
	cleared by ``mock.patch.dict(sys.modules, clear=True)'' -- is still the
	namespace its functions run in, and CPython's f_globals is that namespace
	whatever sys.modules says.  Matching sys.modules only, every frame of such
	a module answered None, and pytest's unittest support, which filters a
	failing test's traceback with ``x.frame.f_globals.get('__unittest')'',
	ended the whole session with an INTERNALERROR: s3transfer,
	opentelemetry-api and pyparsing each lost every test after the first
	such failure.  This is the registry generated code reaches a method's
	module through (``<module class> ___instance___''), so it pins nothing
	that is not pinned already.  sys.modules is still asked FIRST, so a
	module that is registered answers exactly as before."
	found isNil ifTrue: [
		[(module @env0:___sessionInstances___) @env0:do: [:mod |
			(found isNil and: [(mod isKindOf: module)
				and: [((mod @env0:dynamicInstVarAt: #'__file__') @env0:= fname) == true]])
					ifTrue: [found := mod]]]
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	"LAST, A DEPLOYED MODULE THIS SESSION HAS NOT TOUCHED.  A warm bind binds
	a module's committed globals without running its imports, so a module
	whose functions arrived through ``from X import f'' is in neither table
	above -- while f runs on X's committed instance (importlib >>
	___committedModuleWithFile___:, which says why this cost pytest whole
	sessions)."
	found isNil ifTrue: [
		found := [importlib @env0:___committedModuleWithFile___: fname]
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	found isNil ifTrue: [^ None].
	^ (Python @env0:at: #'PyModuleDict') @env0:on: found

]

{ #category : 'Grail-Tracebacks' }
PyFrame >> f_locals [
	"The frame's local variables.  For a LIVE frame -- one sys._getframe built --
	a PyFrameLocals VIEW, which re-reads the stack on every access; for a
	traceback frame, the snapshot taken when the exception was raised.

	The distinction is not a refinement.  CPython's f_locals is a proxy (PEP 667)
	and a copy answers differently the moment a name's lifetime ends inside the
	frame -- see the PyFrameLocals class comment for the comprehension case that
	makes it observable.  A traceback frame cannot have a view at all: its stack
	unwound, and the snapshot is the only thing left.

	MADE ONCE AND KEPT, so ``f.f_locals is f.f_locals'' holds and repeated reads
	share one object rather than one walk each.

	A frame with a STORED f_locals -- a traceback frame, or one frame.clear()
	emptied -- never reaches here: ___pyAttrLoad___ probes dynamic instVars before
	the method chain.  The probe below is for that same slot being set after this
	method was found, and costs one read."

	| stored cached proxy |
	stored := [self @env0:dynamicInstVarAt: #'f_locals']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	stored isNil ifFalse: [^ stored].
	cached := [self @env0:dynamicInstVarAt: #'___liveLocalsView___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	cached isNil ifFalse: [^ cached].
	"No recorded identity means this frame was not built by the live walk, so
	there is nothing to re-read it from."
	([self @env0:dynamicInstVarAt: #'___liveMethod___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil]) isNil
			ifTrue: [^ self ___liveLocalsSnapshotOrEmpty___].
	"NO TEMPS TO SHOW: fall back to this frame's GLOBALS, which for a module-level
	frame is not a fallback at all but the right answer -- CPython's module frame
	has no fast locals, so its f_locals IS its globals mapping.  Measured against
	3.14.6, and the pair is what makes the two halves consistent:

	    exec module scope, plain            keys = the exec namespace
	    exec module scope, in a comprehension   keys = ['a']

	because PEP 709 gives the module code object fast locals for the inlined
	comprehension's target and the proxy reports those while the loop runs.  Grail
	lands on the same two answers by the same split: a live snapshot means temps,
	and no snapshot means the namespace.

	Scoped to LIVE frames (``___liveMethod___'' is set only by the live walk), so a
	traceback frame with no readable locals answers an empty mapping rather than
	growing a rendered traceback by a module's whole namespace."
	([self @env0:dynamicInstVarAt: #'___liveLocals___']
		@env0:on: AbstractException do: [:e | e @env0:return: nil]) isNil
			ifTrue: [
				| g nm |
				"MODULE-LEVEL FRAMES ONLY.  A function frame with no bound locals
				answers an EMPTY mapping, as CPython's does (see
				___liveLocalsSnapshotOrEmpty___); handing it the module
				namespace instead would be a wrong answer -- an unrelated
				mapping under the name of that function's variables."
				nm := [(self @env0:dynamicInstVarAt: #'f_code')
					@env0:dynamicInstVarAt: #'co_name']
					@env0:on: AbstractException do: [:e | e @env0:return: nil].
				(nm @env0:= '<module>') == true ifFalse: [
					^ self ___liveLocalsSnapshotOrEmpty___].
				"THE STORED SLOT FIRST.  A doit's namespace is handed to the
				constructor and parked in the dynamic instVar (see BaseException
				class >> ___doitGlobalsFor___); the f_globals METHOD derives one from
				co_filename instead, and a doit has no file -- so calling the method
				directly answered None for exactly the frames this exists for."
				g := [self @env0:dynamicInstVarAt: #'f_globals']
					@env0:on: AbstractException do: [:e | e @env0:return: nil].
				(g isNil or: [g == None]) ifTrue: [
					g := [self f_globals]
						@env0:on: Error do: [:e |
							(e @env0:isKindOf: AlmostOutOfStackError) ifTrue: [e @env0:pass].
							e @env0:return: None]].
				(g isNil or: [g == None]) ifTrue: [^ self ___liveLocalsSnapshotOrEmpty___].
				^ g].
	proxy := [(Python @env0:at: #'PyFrameLocals') @env0:onFrame: self]
		@env0:on: Error do: [:e |
			(e @env0:isKindOf: AlmostOutOfStackError) ifTrue: [e @env0:pass].
			e @env0:return: nil].
	proxy isNil ifTrue: [^ self ___liveLocalsSnapshotOrEmpty___].
	self @env0:dynamicInstVarAt: #'___liveLocalsView___' put: proxy.
	^ proxy

]

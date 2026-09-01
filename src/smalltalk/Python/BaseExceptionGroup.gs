! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- BaseExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseException subclass: 'BaseExceptionGroup'
  instVarNames: #( message exceptions )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BaseExceptionGroup comment:
'A group of unrelated exceptions.

Introduced in Python 3.11 to support exception groups.

Instance variables:
  message - description of the exception group
  exceptions - sequence of exceptions in the group
'
%

expectvalue /Class
doit
BaseExceptionGroup category: 'Grail-Exceptions'
%

! ===============================================================================
! BaseExceptionGroup methods (Python 3.11+, PEP 654)
! ===============================================================================
! ``message'' and ``exceptions'' are derived from ``args'' rather than stored:
! a group is constructed like any other exception (___args___: is what every
! raise path already populates), so the declared instVars above were never
! written by anything and both attributes read as absent.
!
! Compiled with environmentId 1 (Python), like the other exception types.
! ===============================================================================

expectvalue /Metaclass3
doit
BaseExceptionGroup removeAllMethods: 1.
BaseExceptionGroup class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
message
	"``eg.message'' — PEP 654: the group's own description, args[0]."

	| a |
	a := self args.
	^ (a @env0:size @env0:>= 1) ifTrue: [a @env0:at: 1] ifFalse: ['']
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
exceptions
	"``eg.exceptions'' — PEP 654: the contained exceptions, args[1].

	Answered as a TUPLE even though the group is almost always constructed
	from a list literal (``ExceptionGroup('A', [ValueError()])''), because
	CPython's is a tuple and callers index and len() it -- traceback's group
	rendering does both."

	| a subs |
	a := self args.
	(a @env0:size @env0:>= 2) ifFalse: [^ tuple @env0:withAll: #()].
	subs := a @env0:at: 2.
	(subs @env0:class @env0:= tuple) ifTrue: [^ subs].
	^ tuple @env0:withAll: (subs @env0:asArray)
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
__str__
	"``str(eg)'' — CPython renders the MESSAGE plus a sub-exception count,
	``A (2 sub-exceptions)'', NOT the args tuple.

	Without this the inherited BaseException>>__str__ saw two args and fell
	back to ``args.__repr__'', so every group stringified as
	``('A', [ValueError('B')])'' -- which is also what traceback's
	format_exception_only emitted, since that is built on str()."

	| n |
	n := self exceptions @env0:size.
	^ (self message @env0:asString) @env0:asUnicodeString
		@env0:, ' (' @env0:, n @env0:printString
		@env0:, (n @env0:= 1 ifTrue: [' sub-exception)'] ifFalse: [' sub-exceptions)'])
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
derive: anExceptionSeq
	"``eg.derive(excs)'' -- PEP 654: a NEW group of the same kind holding
	excs, keeping this group's message.

	The hook subclasses override to carry their own extra state across a
	split.  split/subgroup go through it rather than constructing
	directly, so a subclass survives the operation as its own type."

	"___new___ then ___args___:, the same two steps every raise path uses --
	there is no one-shot constructor taking the args tuple."
	| inst |
	inst := self @env0:class ___new___.
	"A LIST, not a tuple: CPython keeps args[1] as whatever was passed, and
	a group is written ``ExceptionGroup('eg', [exc])'', so repr() shows
	brackets.  ``exceptions'' converts to a tuple on read, which is the
	other half of the same CPython asymmetry."
	inst ___args___: (Array @env0:with: self message
		with: (list @env0:withAll: anExceptionSeq @env0:asArray)).
	^ inst
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
___matchesCondition___: aCondition against: anException
	"PEP 654 allows the split condition to be an exception TYPE (or tuple
	of types) or a PREDICATE taking the exception.  Both appear in real
	code, and ``except*'' itself only ever passes a type."

	(aCondition @env0:isKindOf: Class) ifTrue: [
		^ anException @env1:___matchIsInstanceOf___: aCondition
	].
	(aCondition @env0:class @env0:= tuple) ifTrue: [
		aCondition @env0:do: [:t |
			(anException @env1:___matchIsInstanceOf___: t) ifTrue: [^ true]].
		^ false
	].
	"``value:value:'' is Grail's generic Python call (positional array,
	kwargs) -- ExecBlock has no ___call___:."
	^ (aCondition @env1:value: (Array @env0:with: anException) value: nil) ___isTruthy___
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
___splitOn___: aCondition
	"The shared engine for split/subgroup: answer { matching. rest }, each
	either a derived group or nil.

	RECURSES into nested groups, which is the whole point of the design --
	a group may contain groups, and PEP 654 matches leaves wherever they
	sit while preserving the surrounding structure.  A nested group that
	contributes nothing to a side is dropped from that side rather than
	kept as an empty shell."

	| matched unmatched sawGroup |
	matched := OrderedCollection @env0:new.
	unmatched := OrderedCollection @env0:new.
	sawGroup := false.
	self exceptions @env0:do: [:each |
		(each @env0:isKindOf: BaseExceptionGroup)
			ifTrue: [
				| pair |
				sawGroup := true.
				pair := each @env1:___splitOn___: aCondition.
				(pair @env0:at: 1) == nil ifFalse: [matched @env0:add: (pair @env0:at: 1)].
				(pair @env0:at: 2) == nil ifFalse: [unmatched @env0:add: (pair @env0:at: 2)]
			]
			ifFalse: [
				(self ___matchesCondition___: aCondition against: each)
					ifTrue: [matched @env0:add: each]
					ifFalse: [unmatched @env0:add: each]
			]
	].
	"A FLAT group every leaf of which matched answers ITSELF, not an equal
	copy.  CPython's is an identity that shows: ``eg.subgroup(Exception) is
	eg'' is True, and the copy is observably different because #derive: puts
	args[1] in a LIST while a group built from a tuple keeps its tuple, so
	repr() disagrees.  The shortcut is deliberately narrow, matching CPython
	on both counts checked against 3.14: the REST side is rebuilt even when
	it holds everything, and so is any group with NESTING in it, whose
	recursion has already built new inner groups."
	^ Array @env0:with: (matched @env0:isEmpty
			ifTrue: [nil]
			ifFalse: [(unmatched @env0:isEmpty and: [sawGroup @env0:not])
				ifTrue: [self]
				ifFalse: [self derive: matched]])
		with: (unmatched @env0:isEmpty ifTrue: [nil] ifFalse: [self derive: unmatched])
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
subgroup: aCondition
	"``eg.subgroup(cond)'' -- the matching part, or None."

	| m |
	m := (self ___splitOn___: aCondition) @env0:at: 1.
	^ m == nil ifTrue: [None] ifFalse: [m]
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
split: aCondition
	"``eg.split(cond)'' -- the pair (matching, rest), each or None."

	| pair |
	pair := self ___splitOn___: aCondition.
	^ tuple @env0:withAll: (Array
		@env0:with: ((pair @env0:at: 1) == nil ifTrue: [None] ifFalse: [pair @env0:at: 1])
		@env0:with: ((pair @env0:at: 2) == nil ifTrue: [None] ifFalse: [pair @env0:at: 2]))
%

category: 'Grail-Exception Groups'
classmethod: BaseExceptionGroup
___classForArgs___: positional
	"PEP 654: ``BaseExceptionGroup(msg, excs)'' answers an EXCEPTIONGROUP when
	every contained exception is an Exception, and a BaseExceptionGroup only
	when at least one is not (a KeyboardInterrupt, a SystemExit, a bare
	CancelledError).

	This is not cosmetic -- it is what makes the ordinary spelling work:

	    except ExceptionGroup as eg:      # catches the narrowed class
	    except* ValueError:               # ditto

	Grail always built a BaseExceptionGroup, so ``except ExceptionGroup'' did
	not catch it and the group escaped as an uncaught Smalltalk error.  That was
	17 of the 96 tests in test.test_asyncio.test_taskgroups, whose TaskGroup
	raises ``BaseExceptionGroup('unhandled errors in a TaskGroup', self._errors)''
	and whose tests every one of them catch ExceptionGroup.

	``self == BaseExceptionGroup'' EXACTLY, matching CPython: a user subclass of
	BaseExceptionGroup is never silently replaced with something else, and
	ExceptionGroup itself must not recurse into this.  A group with no
	exceptions argument is left alone -- the arity error belongs to whoever
	validates arguments, not here."

	| excs excCls |
	self == BaseExceptionGroup ifFalse: [^ self].
	positional == nil ifTrue: [^ self].
	(positional @env0:size @env0:< 2) ifTrue: [^ self].
	excs := positional @env0:at: 2.
	"Anything not iterable is an argument error, not a narrowing decision."
	(excs @env0:respondsTo: #'do:') ifFalse: [^ self].
	"PYTHON's Exception, looked up explicitly.  A bare ``Exception'' here is
	ambiguous -- GemStone's kernel has one too, and it sits ABOVE BaseException
	in this hierarchy, so a plain ``isKindOf: Exception'' resolving to the
	kernel class would answer true for KeyboardInterrupt and narrow every group.
	Resolved once, outside the loop; this runs at CONSTRUCTION only, never on
	the #handles: unwind path that Exception class >> handles: documents as
	cost-sensitive."
	excCls := Python @env0:at: #'Exception' otherwise: nil.
	excCls == nil ifTrue: [^ self].
	"#handles: rather than #isKindOf:, and the difference is load-bearing for
	NESTED groups.  CPython declares ``class ExceptionGroup(BaseExceptionGroup,
	Exception)'' -- two bases -- so an ExceptionGroup IS an Exception there.
	GemStone is single-inheritance, so Grail's ExceptionGroup descends from
	BaseExceptionGroup alone and #isKindOf: Exception answers FALSE for it.
	Exception class >> handles: carries the special case that makes ``except
	Exception'' catch an ExceptionGroup, and asking it here is asking the same
	question in the same place rather than duplicating the rule.

	Without this, a group whose sub-exception is itself an ExceptionGroup did
	not narrow -- nested TaskGroups (what anyio and FastAPI actually do) raised
	a BaseExceptionGroup from the outer group, so ``except ExceptionGroup''
	missed it: test_taskgroup_11 / _12 / _14."
	excs @env0:do: [:each |
		(excCls @env0:handles: each) ifFalse: [^ self]].
	^ ExceptionGroup
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarNormalize___: anException
	"PEP 654 matches against a GROUP, so a bare exception is treated as if
	wrapped in one -- ``except* ValueError'' catching a plain ValueError
	binds an ExceptionGroup, not the ValueError.

	The ORIGINAL is not discarded: see ___exceptStarFinish___:original:,
	which propagates it unchanged when nothing matched, rather than
	handing back a wrapper CPython never made."

	| inst |
	(anException @env0:isKindOf: BaseExceptionGroup) ifTrue: [^ anException].
	inst := ExceptionGroup ___new___.
	"A TUPLE, where #derive: uses a list -- CPython keeps args[1] as whatever
	was passed, and the two are passed differently: a group written out in
	source reads ``ExceptionGroup('eg', [ValueError()])'', while the wrapper
	CPython synthesizes here is built from a tuple.  repr() shows the
	difference, so the fixture pins it."
	inst ___args___: (Array @env0:with: ''
		with: (tuple @env0:withAll: (Array @env0:with: anException))).
	^ inst
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarClause___: aGroupOrNil type: aType reraised: aColl do: aBlock
	"Run ONE ``except*'' clause against what is left, answering the
	remainder (nil once nothing is left).

	Unlike plain ``except'', where the first matching clause wins, EVERY
	clause gets a turn: each takes its matching subgroup out and passes
	the rest along.  That is why this threads a remainder instead of
	returning a boolean.

	Two things happen AROUND the clause body, both of which CPython does
	and Grail did not:

	 * the MATCHED SUBGROUP is installed as the session's current
	   exception for the duration.  ``sys.exception()'' inside an
	   ``except*'' clause answered None; CPython answers exactly the object
	   ``as'' binds, which is this one (checked against 3.14).

	 * a bare ``raise'' is ABSORBED and recorded in aColl rather than
	   propagated.  ___reRaise___: re-signals the session's current
	   exception, which the line above has just made the matched subgroup,
	   so the re-raise arrives here as that same object BY IDENTITY --
	   which is also how an explicit ``raise g'' arrives, and CPython
	   treats the two alike.  PEP 654 collects the re-raised parts and
	   merges them with the unhandled remainder once every clause has run;
	   letting the first one propagate from here skipped the later clauses
	   entirely.  Anything else the body raises is a NEW exception and
	   passes straight out, control-flow carriers included.

	See ___exceptStarFinish___:original:reraised:normalized: for the merge."

	| pair matched |
	aGroupOrNil == nil ifTrue: [^ nil].
	pair := aGroupOrNil ___splitOn___: aType.
	matched := pair @env0:at: 1.
	matched == nil ifFalse: [
		BaseException @env0:___whileHandling___: matched do: [
			[aBlock @env0:value: matched]
				@env0:on: BaseException
				do: [:ex |
					((BaseException @env0:___payloadOf___: ex) == matched)
						ifTrue: [aColl @env0:add: matched. ex @env0:return: nil]
						ifFalse: [ex @env0:pass]]]].
	^ pair @env0:at: 2
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarFinish___: aRemainderOrNil original: anOriginal reraised: aColl
	"Propagate whatever no clause claimed, when no clause re-raised either.

	The remainder propagates, and when the raised exception was NOT a group
	and nothing matched, the ORIGINAL propagates -- ``raise ValueError''
	past an ``except* TypeError'' is still a ValueError to the caller, not
	the wrapper this machinery built to match against.

	Answers nil once anything WAS re-raised: that case is
	___exceptStarFinishReraised___:original:reraised:normalized:, which the
	emit calls straight after this one."

	aColl @env0:isEmpty ifFalse: [^ nil].
	aRemainderOrNil == nil ifTrue: [^ nil].
	(anOriginal @env0:isKindOf: BaseExceptionGroup)
		ifTrue: [^ BaseException ___pyRaise___: aRemainderOrNil].
	^ BaseException ___pyRaise___: anOriginal
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarFinishReraised___: aRemainderOrNil original: anOriginal reraised: aColl normalized: aGroup
	"The other half of ___exceptStarFinish___:original:reraised:, answering nil
	unless a clause re-raised.

	PEP 654 rebuilds the group from the parts still in flight: the unhandled
	remainder plus every re-raised subgroup.  When that is all of them the
	NORMALIZED group is the answer -- which is what makes

	    try: raise Exception(42)
	    except* Exception as e: raise

	propagate ExceptionGroup('', (Exception(42),)) rather than the naked
	Exception.

	Two entry points for what reads as one decision, because the SOURCE
	POSITION differs between them and Grail recovers a frame's position by
	scanning the emitted text: CPython blames the whole ``except*'' clause
	for a re-raise, and the try body for an unhandled remainder.  A
	``___curPos___'' store sits between the two calls in the emit, so only
	the re-raise picks it up -- see TryAst>>printExceptStarOn:."

	| result |
	aColl @env0:isEmpty ifTrue: [^ nil].
	result := self ___exceptStarRegroup___: aGroup
		remainder: aRemainderOrNil reraised: aColl.
	"DROP THE STALE CAPTURE.  The clause's bare raise re-signalled this very
	object a moment ago, and primitive 2022 fills _gsStack only when it is nil
	on entry -- so without this clear the frames are the ones live INSIDE the
	clause body, and the group reports the ``raise'' line where CPython reports
	the whole except* clause.

	Only the capture is dropped.  A group that already has __traceback__ frames
	keeps them, because ___pushCatchingFrame___ no-ops on one that has any, and
	that is what preserves the original raise site of a group that really was
	raised -- CPython shows that site rather than the clause, and only the
	SYNTHESIZED wrapper, which has no frames of its own, picks up the clause."
	[result @env0:_gsStack: nil]
		@env0:on: Error do: [:ex |
			(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
			ex @env0:return: nil].
	^ BaseException ___pyRaise___: result
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarRegroup___: aGroup remainder: aRemainderOrNil reraised: aColl
	"The parts still in flight, as one group: the unhandled remainder plus
	every subgroup a clause re-raised, projected back onto aGroup so the
	nesting and each group's own message survive.

	Answers aGroup ITSELF when between them they hold every leaf -- CPython
	propagates the original object there, and it is the whole point of the
	naked case, where aGroup is the wrapper and the answer must be the
	wrapper and not a copy of it."

	| keep all |
	keep := self ___leavesOf___: aRemainderOrNil into: IdentitySet @env0:new.
	aColl @env0:do: [:each | self ___leavesOf___: each into: keep].
	all := self ___leavesOf___: aGroup into: IdentitySet @env0:new.
	(keep @env0:size @env0:= all @env0:size) ifTrue: [^ aGroup].
	^ self ___exceptStarProject___: aGroup onto: keep
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___leavesOf___: anExceptionOrNil into: aSet
	"Every non-group exception at or under anExceptionOrNil, by identity.

	The leaves are what a split threads through: ___splitOn___: puts the
	SAME leaf objects into the derived groups, so identity is enough to
	ask whether two subgroups cover the same exceptions."

	anExceptionOrNil == nil ifTrue: [^ aSet].
	(anExceptionOrNil @env0:isKindOf: BaseExceptionGroup)
		ifTrue: [anExceptionOrNil exceptions @env0:do: [:each |
			self ___leavesOf___: each into: aSet]]
		ifFalse: [aSet @env0:add: anExceptionOrNil].
	^ aSet
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarProject___: aGroup onto: keepSet
	"aGroup restricted to the leaves in keepSet, keeping the nesting and
	going through #derive: so a group subclass survives -- the same shape
	___splitOn___: builds, but selecting by identity against a set instead
	of by matching a condition.  A nested group contributing nothing is
	dropped rather than kept as an empty shell."

	| kept |
	kept := OrderedCollection @env0:new.
	aGroup exceptions @env0:do: [:each |
		(each @env0:isKindOf: BaseExceptionGroup)
			ifTrue: [
				| sub |
				sub := self ___exceptStarProject___: each onto: keepSet.
				sub == nil ifFalse: [kept @env0:add: sub]]
			ifFalse: [
				(keepSet @env0:includes: each) ifTrue: [kept @env0:add: each]]].
	^ kept @env0:isEmpty ifTrue: [nil] ifFalse: [aGroup derive: kept]
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: BaseExceptionGroup
___pythonValueAttrs___
	"``eg.message'' / ``eg.exceptions'' are VALUE attributes in CPython, not
	callables, so a read must invoke the accessor rather than answer a
	BoundMethod wrapping the selector -- ``len(eg.exceptions)'' and
	``eg.message'' are how both the tests and traceback's group rendering
	consume them.  Extends BaseException's set (args, __notes__,
	__traceback__, the chaining trio); see the discussion there."

	^ super ___pythonValueAttrs___
		add: #'message';
		add: #'exceptions';
		yourself
%

! Back to env 0 for whatever is filed next -- ExceptionGroup.gs immediately
! follows and its ``BaseExceptionGroup subclass: ...'' doit must not run in
! env 1 (it fails there with a MessageNotUnderstood for #subclass:...).
set compile_env: 0

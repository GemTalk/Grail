Extension { #name : 'BaseExceptionGroup' }

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> ___checkGroupArgs___: positional [
	"CPython's BaseExceptionGroup.__new__ argument checks, answering whether
	any contained exception is NOT an Exception (a KeyboardInterrupt, a
	SystemExit, a bare CancelledError).  Grail had no checks at all, and built
	groups from no arguments, three arguments, a non-str message, a set, None,
	an empty list, and lists of classes or strings.

	Exception is PYTHON's, looked up explicitly: GemStone's kernel has one
	too, ABOVE BaseException, so a bare ``Exception'' here would be that one.
	And membership is asked with #handles:, not #isKindOf:, because Grail's
	ExceptionGroup descends from BaseExceptionGroup alone -- CPython's has two
	bases -- so only #handles: knows a NESTED group is an Exception (nested
	TaskGroups: test_taskgroup_11 / _12 / _14)."

	| args excs items excCls nestedBase |
	args := positional == nil ifTrue: [#()] ifFalse: [positional].
	args @env0:size @env0:= 2 ifFalse: [
		^ TypeError ___signal___: 'BaseExceptionGroup.__new__() takes exactly 2 arguments ('
			@env0:, args @env0:size @env0:printString @env0:, ' given)'].
	(args @env0:at: 1) @env0:___isPyStr___ ifFalse: [
		"CPython's argument parser names None itself, not its type."
		^ TypeError ___signal___: 'BaseExceptionGroup.__new__() argument 1 must be str, not '
			@env0:, ((args @env0:at: 1) == None
				ifTrue: ['None']
				ifFalse: [bytes ___pyTypeNameOf___: (args @env0:at: 1)])].
	excs := args @env0:at: 2.
	(self ___isPySequence___: excs) ifFalse: [
		^ TypeError ___signal___: 'second argument (exceptions) must be a sequence'].
	items := tuple __new__: excs.
	items @env0:isEmpty ifTrue: [
		^ ValueError ___signal___: 'second argument (exceptions) must be a non-empty sequence'].
	excCls := Python @env0:at: #'Exception'.
	nestedBase := false.
	items @env0:doWithIndex: [:each :i |
		(each @env0:isKindOf: BaseException) ifFalse: [
			^ ValueError ___signal___: 'Item ' @env0:, (i @env0:- 1) @env0:printString
				@env0:, ' of second argument (exceptions) is not an exception'].
		(excCls @env0:handles: each) ifFalse: [nestedBase := true]].
	^ nestedBase

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> ___checkGroupNesting___: nestedBase [
	"A group class that IS an Exception may not hold a non-Exception.
	ExceptionGroup says so in its own words; a user subclass that is an
	Exception by any route (multiple inheritance included) names itself.
	BaseExceptionGroup, and a subclass that is not an Exception, hold anything."

	nestedBase ifFalse: [^ self].
	self == BaseExceptionGroup ifTrue: [^ self].
	self == ExceptionGroup ifTrue: [
		^ TypeError ___signal___: 'Cannot nest BaseExceptions in an ExceptionGroup'].
	((builtins instance) issubclass: self _: (Python @env0:at: #'Exception')) ___isTruthy___
		ifTrue: [
			^ TypeError ___signal___: 'Cannot nest BaseExceptions in '''
				@env0:, self @env0:name @env0:asString @env0:, ''''].
	^ self

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> ___classForArgs___: positional [
	"Which class ``Cls(msg, excs)'' builds, after CPython's validation (see
	___checkGroupArgs___:).

	PEP 654: ``BaseExceptionGroup(msg, excs)'' answers an EXCEPTIONGROUP when
	every contained exception is an Exception, and a BaseExceptionGroup only
	when at least one is not.  That is what makes ``except ExceptionGroup''
	catch what asyncio's TaskGroup raises -- 17 of test_taskgroups' 96 tests.
	``self == BaseExceptionGroup'' EXACTLY: a user subclass is never replaced,
	and ExceptionGroup itself must not recurse into this.

	Every BaseException construction path asks this first (BaseException
	class >> ___classForArgs___:), but a PYTHON-defined subclass is built by
	the generic allocator instead, so the checks also run when the instance
	first takes its arguments (___args___:).  A group passing through both is
	validated twice -- construction only, never the #handles: unwind path."

	| nestedBase |
	nestedBase := self ___checkGroupArgs___: positional.
	self == BaseExceptionGroup ifTrue: [
		^ nestedBase ifTrue: [self] ifFalse: [ExceptionGroup]].
	self ___checkGroupNesting___: nestedBase.
	^ self

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarCheckType___: aType [
	"CPython's _PyEval_CheckExceptStarTypeValid, run as each clause is reached.

	``except*'' takes exception CLASSES only -- a tuple of them, or one --
	so a predicate, which split() accepts, is refused here.  And none of
	them may be a group class: ``except* ExceptionGroup'' would match a
	group the machinery has already opened up, so CPython rejects it at
	run time, naked exception or not.  Grail accepted both and matched
	nothing."

	| types |
	types := (aType @env0:isKindOf: tuple)
		ifTrue: [aType]
		ifFalse: [Array @env0:with: aType].
	types @env0:do: [:each |
		((each @env0:isKindOf: Behavior)
			and: [(each == BaseException) or: [each @env0:inheritsFrom: BaseException]])
				ifFalse: [^ TypeError ___signal___:
					'catching classes that do not inherit from BaseException is not allowed']].
	types @env0:do: [:each |
		((each == BaseExceptionGroup) or: [each @env0:inheritsFrom: BaseExceptionGroup])
			ifTrue: [^ TypeError ___signal___:
				'catching ExceptionGroup with except* is not allowed. Use except instead.']]

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarClause___: aGroupOrNil type: aType reraised: aColl do: aBlock [
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

	 * whatever the body RAISES is ABSORBED and recorded in aColl rather
	   than propagated.  PEP 654 runs every clause and only then raises
	   what they raised, merged with the unhandled remainder; letting the
	   first raise propagate from here skipped the later clauses entirely.
	   Two kinds are recorded, in the order they happen, because the merge
	   treats them differently:

	    - a RE-RAISE, recorded as the matched subgroup itself.  A bare
	      ``raise'' re-signals the session's current exception, which the
	      line above has just made the matched subgroup, so it arrives here
	      as that same object BY IDENTITY.

	    - a NEW exception, recorded as ``#raised -> exc''.  It is raised
	      inside the clause, so its __context__ is already the matched
	      subgroup, as CPython has it.

	   An explicit ``raise e'' of the matched subgroup is the SECOND kind,
	   although it arrives by identity too.  CPython tells them apart by
	   metadata, not identity (is_same_exception_metadata): ``raise e''
	   adds a traceback entry, so e no longer carries the original's
	   traceback, and

	       except* ValueError as e: raise e      -- TypeError left over
	         => ExceptionGroup('', [ExceptionGroup('eg', [ValueError(1)]),
	                                ExceptionGroup('eg', [TypeError(2)])])

	   where a bare ``raise'' gives back the original group.  Grail's mark
	   for the same fact is ___tbUserAttached___: ___pyRaise___: sets it on
	   an exception that already has a traceback, a bare raise does not,
	   and a split part starts without it (___subsetOf___:with:).

	   Grail's control-flow carriers are not BaseExceptions, so a
	   ``return'' still passes straight out.

	See ___exceptStarFinishReraised___:original:reraised:normalized: for
	the merge."

	| pair matched |
	aGroupOrNil == nil ifTrue: [^ nil].
	"Both of these can raise, and CPython raises them while HANDLING the
	exception, so that is their __context__ -- the naked exception itself
	when there is a wrapper."
	BaseException @env0:___whileHandling___: (aGroupOrNil ___exceptStarHandled___) do: [
		self ___exceptStarCheckType___: aType.
		pair := aGroupOrNil ___splitOn___: aType].
	matched := pair @env0:at: 1.
	matched == nil ifFalse: [
		BaseException @env0:___whileHandling___: matched do: [
			[aBlock @env0:value: matched]
				@env0:on: BaseException
				do: [:ex |
					| payload |
					payload := BaseException @env0:___payloadOf___: ex.
					(payload == matched
						and: [(matched @env0:dynamicInstVarAt: #'___tbUserAttached___') ~~ true])
							ifTrue: [aColl @env0:add: matched]
							ifFalse: [aColl @env0:add: #'raised' @env0:-> payload].
					ex @env0:return: nil]]].
	^ pair @env0:at: 2

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarFinish___: aRemainderOrNil original: anOriginal reraised: aColl [
	"Propagate whatever no clause claimed, when no clause re-raised either.

	The remainder propagates, and when the raised exception was NOT a group
	and nothing matched, the ORIGINAL propagates -- ``raise ValueError''
	past an ``except* TypeError'' is still a ValueError to the caller, not
	the wrapper this machinery built to match against.

	Answers nil once anything WAS re-raised: that case is
	___exceptStarFinishReraised___:original:reraised:normalized:, which the
	emit calls straight after this one.

	anOriginal is the caught object, so possibly a carrier: unwrapped, as in
	___exceptStarNormalize___:.

	Both are re-signalled the way a bare ``raise'' is, adding no frame.
	CPython propagates them with RERAISE, which skips the traceback entry an
	ordinary raise adds, so the remainder keeps the very traceback object
	the split copied onto it from the original -- the one every matched
	part also holds, and test_except_star compares them with ==.  The
	``raise exc'' path built a new traceback for the remainder instead."

	| original |
	aColl @env0:isEmpty ifFalse: [^ nil].
	aRemainderOrNil == nil ifTrue: [^ nil].
	original := BaseException @env0:___payloadOf___: anOriginal.
	(original @env0:isKindOf: BaseExceptionGroup)
		ifTrue: [^ BaseException @env0:___signalCarrying___: aRemainderOrNil].
	^ BaseException @env0:___signalCarrying___: original

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarFinishReraised___: aRemainderOrNil original: anOriginal reraised: aColl normalized: aGroup [
	"The other half of ___exceptStarFinish___:original:reraised:, answering nil
	unless a clause raised.

	CPython's _PyExc_PrepReraiseStar.  The parts of the original still in
	flight -- the unhandled remainder plus every re-raised subgroup -- are
	rebuilt into ONE group projected onto the original.  When that is all
	of them the NORMALIZED group is the answer -- which is what makes

	    try: raise Exception(42)
	    except* Exception as e: raise

	propagate ExceptionGroup('', (Exception(42),)) rather than the naked
	Exception.

	The NEW exceptions the clauses raised come first, in the order they were
	raised, and that rebuilt group (if any) last.  More than one in all is
	raised as ExceptionGroup('', [...]); exactly one is raised as itself:

	    except* OSError: raise TypeError(3)    -- with a ValueError left over
	      => ExceptionGroup('', [TypeError(3), ExceptionGroup('eg', [ValueError(1)])])
	    except* (TypeError, ValueError): raise SyntaxError(3)
	      => SyntaxError(3)

	A lone new exception is re-signalled the way a bare ``raise'' does it,
	keeping the frames of its own raise inside the clause.

	Two entry points for what reads as one decision, because the SOURCE
	POSITION differs between them and Grail recovers a frame's position by
	scanning the emitted text: CPython blames the whole ``except*'' clause
	for a re-raise, and the try body for an unhandled remainder.  A
	``___curPos___'' store sits between the two calls in the emit, so only
	the re-raise picks it up -- see TryAst>>printExceptStarOn:."

	| raised reraised regrouped result |
	aColl @env0:isEmpty ifTrue: [^ nil].
	raised := OrderedCollection @env0:new.
	reraised := OrderedCollection @env0:new.
	aColl @env0:do: [:each |
		(each @env0:isKindOf: Association)
			ifTrue: [raised @env0:add: each @env0:value]
			ifFalse: [reraised @env0:add: each]].
	regrouped := self ___exceptStarRegroup___: aGroup
		remainder: aRemainderOrNil reraised: reraised.
	regrouped == nil ifFalse: [raised @env0:add: regrouped].
	raised @env0:size @env0:= 1 ifTrue: [
		result := raised @env0:first.
		result == regrouped ifFalse: [
			^ BaseException @env0:___signalCarrying___: result]].
	raised @env0:size @env0:> 1 ifTrue: [
		"BaseExceptionGroup('', raised), so it narrows like the constructor:
		an ExceptionGroup unless a KeyboardInterrupt-like part is among them."
		| groupArgs |
		groupArgs := Array @env0:with: ''
			with: (list @env0:withAll: raised @env0:asArray).
		result := (BaseExceptionGroup ___classForArgs___: groupArgs) ___new___.
		result ___args___: groupArgs].
	"Everything but the SYNTHESIZED wrapper is re-signalled the way CPython's
	RERAISE does it, adding no frame: the original group keeps exactly the
	traceback it was raised with, and a projection keeps the copy of it.  The
	``raise exc'' path these used to take added one at the except* line.

	A fresh MERGED group still gets that frame, where CPython's shows none for
	the function whose except* built it.  Its traceback starts from this raise
	whatever path signals it; the opt-out stamp (``_gsStack: #()'') that would
	skip the frame left a catcher in another FUNCTION with no traceback at all.
	The fixture pins the extra frame (exception_star_raise.py)."
	(result @env0:dynamicInstVarAt: #'___exceptStarWrapper___') == true
		ifFalse: [^ BaseException @env0:___signalCarrying___: result].
	"The wrapper does get a frame, at the except* clause: CPython's
	CHECK_EG_MATCH gives the wrapper it builds a traceback of the current
	frame.  So DROP THE STALE CAPTURE.  The clause's bare raise re-signalled
	this very object a moment ago, and primitive 2022 fills _gsStack only
	when it is nil on entry -- so without this clear the frames are the ones
	live INSIDE the clause body, and the group reports the ``raise'' line
	where CPython reports the whole except* clause."
	[result @env0:_gsStack: nil]
		@env0:on: Error do: [:ex |
			(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
			ex @env0:return: nil].
	^ BaseException ___pyRaise___: result

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarNormalize___: anException [
	"PEP 654 matches against a GROUP, so a bare exception is treated as if
	wrapped in one -- ``except* ValueError'' catching a plain ValueError
	binds an ExceptionGroup, not the ValueError.

	The ORIGINAL is not discarded: see ___exceptStarFinish___:original:,
	which propagates it unchanged when nothing matched, rather than
	handing back a wrapper CPython never made.

	anException is what the handler CAUGHT, which for a re-raised exception
	is a CARRIER (BaseException class >> ___signalCarrying___:), an empty
	instance of the payload's class.  It is unwrapped first: matching the
	carrier split an empty group, matched nothing and left no remainder, so
	the exception vanished -- every ``except*'' after the first on one
	ExceptionGroup object that had already escaped a handler."

	| exc inst |
	exc := BaseException @env0:___payloadOf___: anException.
	(exc @env0:isKindOf: BaseExceptionGroup) ifTrue: [^ exc].
	inst := ExceptionGroup ___new___.
	"A TUPLE, where #derive: uses a list -- CPython keeps args[1] as whatever
	was passed, and the two are passed differently: a group written out in
	source reads ``ExceptionGroup('eg', [ValueError()])'', while the wrapper
	CPython synthesizes here is built from a tuple.  repr() shows the
	difference, so the fixture pins it."
	inst ___args___: (Array @env0:with: ''
		with: (tuple @env0:withAll: (Array @env0:with: exc))).
	"Marked, so ___splitOn___: treats it as the naked exception it stands for."
	inst @env0:dynamicInstVarAt: #'___exceptStarWrapper___' put: true.
	^ inst

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarProject___: aGroup onto: keepSet [
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

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___exceptStarRegroup___: aGroup remainder: aRemainderOrNil reraised: aColl [
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

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> ___isPySequence___: anObject [
	"CPython's PySequence_Check, which BaseExceptionGroup.__new__ asks of its
	second argument: anything indexable that is not a mapping.  A set and None
	are refused; a list, a tuple, a str, a deque and a user Sequence pass."

	(anObject == nil or: [anObject == None]) ifTrue: [^ false].
	(anObject @env0:isKindOf: AbstractDictionary) ifTrue: [^ false].
	(anObject @env0:isKindOf: SequenceableCollection) ifTrue: [^ true].
	"OWNERSHIP, not ___respondsTo___: -- PythonInstance compiles a catchable
	__getitem__ fallback onto every instance, so an int responded too and
	``eg.__notes__ = 123'' was copied on split as if it were a sequence."
	^ anObject ___hasProtocol___: '__getitem__'

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup class >> ___leavesOf___: anExceptionOrNil into: aSet [
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

]

{ #category : 'Grail-Generics' }
BaseExceptionGroup class >> __getitem__: item [
	"``ExceptionGroup[OSError]'' -- a real types.GenericAlias, as CPython's
	__class_getitem__ answers.  Grail's default collapses a class subscript to
	the class itself; BaseException refuses one outright (Exception is not
	generic in CPython), so the group classes opt in here, the way list does.
	A subclass with its own __class_getitem__ still gets it."

	(((self @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1) ~~ nil
		or: [(self @env0:whichClassIncludesSelector: #'___class_getitem__:kw:' environmentId: 1) ~~ nil])
		or: [((self ___classChainAttrLookup___: #'__class_getitem__') ~~ nil)
			or: [(self ___classAttrOverlayLookup___: self name: #'__class_getitem__') ~~ nil]])
			ifTrue: [^ self ___grailClassGetitemDispatch___: item].
	"Looked up at run time: GenericAlias.gs is filed in AFTER this file, so a
	compiled reference would still be bound to the empty forward declaration."
	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> __new__ [
	"``ExceptionGroup()'' -- CPython's arity error.  The inherited zero- and
	one-argument constructors do not go through ___classForArgs___:, so they
	built an empty group."

	self ___classForArgs___: #().
	^ super __new__

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> __new__: arg1 [
	"``ExceptionGroup(x)'' -- CPython's arity error; see __new__."

	self ___classForArgs___: (Array @env0:with: arg1).
	^ super __new__: arg1

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup class >> __new__: arg1 _: arg2 _: arg3 [
	"Three arguments: either CPython's arity error, or the EXPLICIT-cls form
	``BaseExceptionGroup.__new__(cls, msg, excs)''.  The second is what a
	subclass's own __new__ produces: ``super().__new__(cls, message, excs)''
	reaches here with ``cls'' as the first argument (Grail binds it once
	through the super proxy and again explicitly), so a three-argument
	subclass __new__ reported ``takes exactly 2 arguments (3 given)''.  A
	first argument that is a group class is that ``cls''; the group is then
	built as that class would build it, narrowing included."

	| cls args inst |
	((arg1 @env0:isKindOf: Behavior)
		and: [(arg1 == BaseExceptionGroup) or: [arg1 @env0:inheritsFrom: BaseExceptionGroup]])
		ifFalse: [^ super __new__: arg1 _: arg2 _: arg3].
	args := Array @env0:with: arg2 with: arg3.
	cls := arg1 ___classForArgs___: args.
	inst := cls ___new___.
	inst ___args___: args.
	^ inst

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___args___: anArray [
	"Every construction path stores the constructor arguments through here
	(___new___ then ___args___:), so this is where a group takes what CPython's
	BaseExceptionGroup.__new__ takes: ``message'' and a TUPLE copy of the
	exceptions.  Only the FIRST store counts -- CPython never recomputes them,
	and ``eg.args'' is free to change afterwards.

	A sequence that is neither a list nor a tuple (a deque, a user Sequence) has
	its repr() saved too, because CPython's __repr__ shows that saved text
	rather than re-rendering an argument that may since have been mutated.
	Taking it here is also what makes a broken __repr__ fail at CONSTRUCTION,
	as CPython's does (test_repr_raises).

	The capture happens ONCE: a subclass's own __new__ builds the group through
	super().__new__ (two arguments) and its __init__ may then store three --
	CPython's args change there, while message and exceptions do not."

	| a raw |
	super ___args___: anArray.
	exceptions == nil ifFalse: [^ self].
	a := self args.
	"Validated HERE as well as in ___classForArgs___:, because a Python-defined
	subclass is allocated generically and only ever arrives here --
	``MyEG('eg')'' and a subclass holding a KeyboardInterrupt were built
	without complaint."
	self @env0:class ___checkGroupNesting___:
		(self @env0:class ___checkGroupArgs___: a).
	raw := a @env0:at: 2.
	message := a @env0:at: 1.
	exceptions := tuple __new__: raw.
	((raw @env0:isKindOf: OrderedCollection) or: [raw @env0:isKindOf: Array]) ifFalse: [
		self @env0:dynamicInstVarAt: #'___excsRepr___'
			put: (self ___checkedRepr___: raw)].
	^ self

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___badMatcher___ [
	^ TypeError ___signal___: 'expected an exception type, a tuple of exception '
		@env0:, 'types, or a callable (other than a class)'

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___checkedRepr___: anObject [
	"repr(anObject), refusing a __repr__ that answers something other than a
	str with CPython's TypeError.  builtins >> repr: does not check this
	itself, and it is on the recursive-repr path, so the check lives here
	where a group needs it rather than there."

	| r |
	r := (builtins instance) repr: anObject.
	r @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: '__repr__ returned non-string (type '
			@env0:, (bytes ___pyTypeNameOf___: r) @env0:, ')'].
	^ r

]

{ #category : 'Grail-Except Star' }
BaseExceptionGroup >> ___exceptStarHandled___ [
	"The exception an ``except*'' is handling: this group, or the naked
	exception when this is the wrapper ___exceptStarNormalize___ built."

	(self @env0:dynamicInstVarAt: #'___exceptStarWrapper___') == true
		ifTrue: [^ self exceptions @env0:at: 1].
	^ self

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___isExceptionClass___: anObject [
	"True for a Python BaseException subclass (or BaseException itself)."

	^ (anObject @env0:isKindOf: Behavior)
		and: [(anObject == BaseException) or: [anObject @env0:inheritsFrom: BaseException]]

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___matcherKindOf___: aCondition [
	"CPython's get_matcher_type: #type for an exception class or an EXACT tuple
	of them, #predicate for any other callable that is not a class, and
	TypeError for everything else -- a string, a non-exception class, an
	exception instance, a list of classes, a tuple holding a non-class.  Grail
	accepted all of those and matched nothing, or called them."

	(aCondition @env0:class == tuple) ifTrue: [
		aCondition @env0:do: [:each |
			(self ___isExceptionClass___: each) ifFalse: [^ self ___badMatcher___]].
		^ #type].
	(aCondition @env0:isKindOf: Behavior) ifTrue: [
		(self ___isExceptionClass___: aCondition) ifTrue: [^ #type].
		^ self ___badMatcher___].
	((builtins instance) callable: aCondition) ___isTruthy___ ifTrue: [^ #predicate].
	^ self ___badMatcher___

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___node___: anException matches: aCondition kind: kind [
	"The split condition applied to one node (a group or a leaf)."

	kind == #predicate ifTrue: [
		"``value:value:'' is Grail's generic Python call (positional array,
		kwargs) -- ExecBlock has no ___call___:."
		^ (aCondition @env1:value: (Array @env0:with: anException) value: nil) ___isTruthy___].
	(aCondition @env0:class == tuple) ifTrue: [
		aCondition @env0:do: [:t |
			(anException @env1:___matchIsInstanceOf___: t) ifTrue: [^ true]].
		^ false].
	^ anException @env1:___matchIsInstanceOf___: aCondition

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___pyAttrStore___: aName put: aValue [
	"``message'' and ``exceptions'' are READ-ONLY members in CPython.  Grail
	stored an assignment as an ordinary instance attribute, which then
	shadowed the accessor -- ``eg.message = 'x''' changed what every later read
	saw (test_fields_are_readonly)."

	| n |
	n := aName @env0:asString.
	((n @env0:= 'message') or: [n @env0:= 'exceptions']) ifTrue: [
		^ AttributeError ___signal___: 'readonly attribute'].
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___split___: aCondition constructRest: constructRest [
	"CPython's exceptiongroup_split: validate the condition once, then walk.
	Answers { matching. rest } with nil for an empty side; ``rest'' is not built
	at all for subgroup()."

	| kind |
	kind := self ___matcherKindOf___: aCondition.
	^ self ___splitNode___: self kind: kind condition: aCondition
		constructRest: constructRest depth: 0

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___splitNode___: exc kind: kind condition: aCondition constructRest: constructRest depth: depth [
	"CPython's exceptiongroup_split_recursive, for one node.

	The NODE is tested first, group or not.  A group that matches as a whole
	is answered ITSELF -- ``eg.split(ExceptionGroup)'' and
	``eg.subgroup(Exception)'' are identities, and a predicate is called on
	groups as well as leaves.  Grail only ever tested leaves, so a split by a
	group type matched nothing at all.  Only a group that does not match is
	opened up, and what its children contribute is rebuilt through
	___subsetOf___:with:, which goes through ``derive'' and copies the
	traceback, chaining and notes onto the new group.

	``depth'' bounds the walk at the recursion limit: CPython's is a recursive
	C function and raises RecursionError on a group nested past it
	(DeepRecursionInSplitAndSubgroup).  Grail's Smalltalk stack would happily
	go deeper, so the limit has to be asked for.  sys.getrecursionlimit() is
	the constant 1000 in Grail."

	| matched rest |
	(self ___node___: exc matches: aCondition kind: kind) ifTrue: [
		^ Array @env0:with: exc with: nil].
	(exc @env0:isKindOf: BaseExceptionGroup) ifFalse: [
		^ Array @env0:with: nil with: (constructRest ifTrue: [exc] ifFalse: [nil])].
	depth @env0:>= 1000 ifTrue: [
		^ RecursionError ___signal___:
			'maximum recursion depth exceeded in exceptiongroup_split_recursive'].
	matched := OrderedCollection @env0:new.
	rest := OrderedCollection @env0:new.
	exc exceptions @env0:do: [:each |
		| pair |
		pair := self ___splitNode___: each kind: kind condition: aCondition
			constructRest: constructRest depth: depth @env0:+ 1.
		(pair @env0:at: 1) == nil ifFalse: [matched @env0:add: (pair @env0:at: 1)].
		(pair @env0:at: 2) == nil ifFalse: [rest @env0:add: (pair @env0:at: 2)]].
	^ Array
		@env0:with: (self ___subsetOf___: exc with: matched)
		with: (constructRest ifTrue: [self ___subsetOf___: exc with: rest] ifFalse: [nil])

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___splitOn___: aCondition [
	"{ matching. rest }, each a group or nil -- the shape ``except*'' consumes
	(___exceptStarClause___:...), over the same engine as split()."

	| leaf kind pair |
	"A WRAPPER ___exceptStarNormalize___ built around a naked exception is not
	split.  CPython matches the naked exception ITSELF and wraps it only on a
	match, so the clause binds exactly that wrapper -- ``ExceptionGroup('',
	(ValueError(5),))'', a TUPLE -- and a clause that does not match passes the
	naked exception on.  Splitting the wrapper instead rebuilt it through
	derive, with a list."
	(self @env0:dynamicInstVarAt: #'___exceptStarWrapper___') == true ifTrue: [
		kind := self ___matcherKindOf___: aCondition.
		leaf := self exceptions @env0:at: 1.
		^ (self ___node___: leaf matches: aCondition kind: kind)
			ifTrue: [Array @env0:with: self with: nil]
			ifFalse: [Array @env0:with: nil with: self]].
	"CPython calls the group's own ``split'' method, so a subclass that
	overrides it decides the match -- and is held to answering a tuple of at
	least two (match, rest), extra items allowed for backwards compatibility
	(gh-128049).  The two built-in classes keep the direct path."
	((self @env0:class == ExceptionGroup) or: [self @env0:class == BaseExceptionGroup])
		ifTrue: [^ self ___split___: aCondition constructRest: true].
	pair := self split: aCondition.
	(pair @env0:class == tuple) ifFalse: [
		^ TypeError ___signal___: (bytes ___pyTypeNameOf___: self)
			@env0:, '.split must return a tuple, not '
			@env0:, (bytes ___pyTypeNameOf___: pair)].
	pair @env0:size @env0:< 2 ifTrue: [
		^ TypeError ___signal___: (bytes ___pyTypeNameOf___: self)
			@env0:, '.split must return a 2-tuple, got tuple of size '
			@env0:, pair @env0:size @env0:printString].
	^ Array
		@env0:with: ((pair @env0:at: 1) == None ifTrue: [nil] ifFalse: [pair @env0:at: 1])
		with: ((pair @env0:at: 2) == None ifTrue: [nil] ifFalse: [pair @env0:at: 2])

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> ___subsetOf___: anOriginal with: someExceptions [
	"CPython's exceptiongroup_subset: a group holding someExceptions, made by
	the ORIGINAL group's ``derive'' (so a subclass that overrides it keeps its
	type and state), carrying the original's traceback, cause, context and
	notes.  nil when there is nothing to hold.

	The traceback is the SAME object, as in CPython -- the split tests compare
	them with ``is''.  ___setCause___:context: also sets __suppress_context__,
	which is CPython's PyException_SetCause side effect too.  Notes are copied
	only when they are a sequence, and copied as a new LIST, so adding a note to
	one part does not add it to the others (test_split_copies_notes)."

	| eg tb cause context notes |
	someExceptions @env0:isEmpty ifTrue: [^ nil].
	eg := anOriginal derive: (list @env0:withAll: someExceptions).
	(eg @env0:isKindOf: BaseExceptionGroup) ifFalse: [
		^ TypeError ___signal___: 'derive must return an instance of BaseExceptionGroup'].
	tb := anOriginal __traceback__.
	tb == None ifFalse: [
		"A COPY, not with_traceback()'s user attach: its mark tells the next
		catch to prepend that raise's frames, and a part propagated by
		``except*'' is re-raised the way RERAISE does it, adding none.  With
		the mark the remainder arrived with a new two-frame traceback where
		CPython has the original's object (test_except_star_EG_subclass).  An
		explicit ``raise part'' sets the mark again in ___pyRaise___:."
		eg with_traceback: tb.
		eg @env0:dynamicInstVarAt: #'___tbUserAttached___' put: false].
	cause := anOriginal __cause__.
	context := anOriginal __context__.
	eg ___setCause___: (cause == None ifTrue: [nil] ifFalse: [cause])
		context: (context == None ifTrue: [nil] ifFalse: [context]).
	notes := anOriginal @env0:dynamicInstVarAt: #'__notes__'.
	(notes ~~ nil and: [BaseExceptionGroup ___isPySequence___: notes]) ifTrue: [
		eg @env0:dynamicInstVarAt: #'__notes__' put: (list __new__: notes)].
	^ eg

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> __repr__ [
	"CPython 3.14's BaseExceptionGroup_repr: ``Name(message, exceptions)'',
	rendered from the fields captured at construction, NOT from ``args'' -- so
	clearing the list a group was built from does not change its repr.  The
	exceptions keep the SHAPE of what was passed: a list argument shows as a
	list, a tuple as a tuple, and anything else as the repr() saved when the
	group was made (see ___args___:).

	The list shape needs args to be EXACTLY (message, list), as of CPython
	3.14.8 (gh-146096).  A subclass whose __new__ takes more arguments --
	EG('m', [e], 42) -- shows the exceptions tuple; 3.14.7 and earlier showed
	the list whenever args[1] was one."

	| excsStr a |
	excsStr := self @env0:dynamicInstVarAt: #'___excsRepr___'.
	excsStr == nil ifTrue: [
		a := self args.
		excsStr := (builtins instance) repr:
			(((a @env0:size @env0:= 2) and: [(a @env0:at: 2) @env0:isKindOf: OrderedCollection])
				ifTrue: [list @env0:withAll: self exceptions]
				ifFalse: [self exceptions])].
	^ (self @env0:class @env0:name @env0:asString) @env0:asUnicodeString
		@env0:, '(' @env0:, ((builtins instance) repr: self message) @env0:asString
		@env0:, ', ' @env0:, excsStr @env0:asString @env0:, ')'

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> __str__ [
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

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> derive: anExceptionSeq [
	"``eg.derive(excs)'' -- PEP 654: a NEW group holding excs, keeping this
	group's message.

	The hook subclasses override to carry their own type and state across a
	split; split/subgroup go through it rather than constructing directly.
	The DEFAULT is CPython's ``BaseExceptionGroup(self.message, excs)'' --
	not ``type(self)(...)'' -- so it narrows like the constructor: splitting
	the KeyboardInterrupt-like leaves out of a BaseExceptionGroup leaves an
	ExceptionGroup, which ``except ExceptionGroup'' (and test_contextlib's
	suppress) must catch.  Building ``self class'' kept it a
	BaseExceptionGroup, which escaped every such handler.  The same rule
	means a subclass that does not override derive comes back as a plain
	(Base)ExceptionGroup, as CPython documents."

	"___new___ then ___args___:, the same two steps every raise path uses --
	there is no one-shot constructor taking the args tuple."
	| groupArgs inst |
	"A LIST, not a tuple: CPython keeps args[1] as whatever was passed, and
	a group is written ``ExceptionGroup('eg', [exc])'', so repr() shows
	brackets.  ``exceptions'' converts to a tuple on read, which is the
	other half of the same CPython asymmetry."
	groupArgs := Array @env0:with: self message
		with: (list @env0:withAll: anExceptionSeq @env0:asArray).
	inst := (BaseExceptionGroup ___classForArgs___: groupArgs) ___new___.
	inst ___args___: groupArgs.
	^ inst

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> exceptions [
	"``eg.exceptions'' -- PEP 654: the contained exceptions, as a TUPLE taken
	when the group was constructed.

	A tuple even though the group is almost always built from a list literal
	(``ExceptionGroup('A', [ValueError()])''), because CPython's is a tuple and
	callers index and len() it -- traceback's group rendering does both.  And a
	SNAPSHOT: CPython copies the sequence in __new__, so clearing the list the
	group was built from (test_exceptions_mutation) does not empty the group.
	See ___args___:."

	| a subs |
	exceptions == nil ifFalse: [^ exceptions].
	a := self args.
	(a @env0:size @env0:>= 2) ifFalse: [^ tuple @env0:withAll: #()].
	subs := a @env0:at: 2.
	(subs @env0:class @env0:= tuple) ifTrue: [^ subs].
	^ tuple @env0:withAll: (subs @env0:asArray)

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> message [
	"``eg.message'' -- PEP 654: the message the group was CONSTRUCTED with.

	Captured once by ___args___: (CPython's BaseExceptionGroup.__new__ stores
	``msg'' beside ``args'' the same way), so reassigning ``eg.args'' later
	leaves it alone.  A group whose args never went through ___args___: falls
	back to args[0]."

	| a |
	message == nil ifFalse: [^ message].
	a := self args.
	^ (a @env0:size @env0:>= 1) ifTrue: [a @env0:at: 1] ifFalse: ['']

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> split: aCondition [
	"``eg.split(cond)'' -- the pair (matching, rest), each or None."

	| pair |
	pair := self ___split___: aCondition constructRest: true.
	^ tuple @env0:withAll: (Array
		@env0:with: ((pair @env0:at: 1) == nil ifTrue: [None] ifFalse: [pair @env0:at: 1])
		@env0:with: ((pair @env0:at: 2) == nil ifTrue: [None] ifFalse: [pair @env0:at: 2]))

]

{ #category : 'Grail-Exception Groups' }
BaseExceptionGroup >> subgroup: aCondition [
	"``eg.subgroup(cond)'' -- the matching part, or None."

	| m |
	m := (self ___split___: aCondition constructRest: false) @env0:at: 1.
	^ m == nil ifTrue: [None] ifFalse: [m]

]

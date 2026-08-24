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

	| matched unmatched |
	matched := OrderedCollection @env0:new.
	unmatched := OrderedCollection @env0:new.
	self exceptions @env0:do: [:each |
		(each @env0:isKindOf: BaseExceptionGroup)
			ifTrue: [
				| pair |
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
	^ Array @env0:with: (matched @env0:isEmpty ifTrue: [nil] ifFalse: [self derive: matched])
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
	inst ___args___: (Array @env0:with: ''
		with: (list @env0:withAll: (Array @env0:with: anException))).
	^ inst
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarClause___: aGroupOrNil type: aType do: aBlock
	"Run ONE ``except*'' clause against what is left, answering the
	remainder (nil once nothing is left).

	Unlike plain ``except'', where the first matching clause wins, EVERY
	clause gets a turn: each takes its matching subgroup out and passes
	the rest along.  That is why this threads a remainder instead of
	returning a boolean."

	| pair |
	aGroupOrNil == nil ifTrue: [^ nil].
	pair := aGroupOrNil ___splitOn___: aType.
	(pair @env0:at: 1) == nil ifFalse: [aBlock @env0:value: (pair @env0:at: 1)].
	^ pair @env0:at: 2
%

category: 'Grail-Except Star'
classmethod: BaseExceptionGroup
___exceptStarFinish___: aRemainderOrNil original: anOriginal
	"Propagate whatever no clause claimed.

	When the raised exception was NOT a group and nothing matched, the
	ORIGINAL propagates -- ``raise ValueError'' past an ``except*
	TypeError'' is still a ValueError to the caller, not the wrapper this
	machinery built to match against."

	aRemainderOrNil == nil ifTrue: [^ nil].
	(anOriginal @env0:isKindOf: BaseExceptionGroup)
		ifTrue: [^ BaseException ___pyRaise___: aRemainderOrNil].
	^ BaseException ___pyRaise___: anOriginal
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

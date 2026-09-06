! ------------------- Superclass check
run
PyDict ifNil: [self error: 'PyDict is not defined. Check file ordering.'].
%

! ------- PyFrameLocals — a LIVE view of one frame's local variables.
!
! CPython's ``frame.f_locals'' is a FrameLocalsProxy (PEP 667), not a copy, and
! the difference is observable wherever a name's lifetime ends inside the frame.
! PEP 709 inlines a comprehension into its enclosing scope, so the iteration
! variable is in the frame while the loop runs and gone the moment it ends:
!
!     'a' in [sys._getframe().f_locals for a in [0]][0]      -> False
!     [sys._getframe().f_locals['a'] for a in [0]][0]        -> 0
!
! Both readings are of the SAME object.  The first membership test runs after the
! comprehension finished; the subscript in the second runs inside it.  A snapshot
! taken when sys._getframe() ran answers True to both and cannot do otherwise --
! which is test_listcomps' test_frame_locals, in all three of its scopes.
!
! A SUBCLASS OF PyDict, refreshed in place, rather than a mapping written from
! scratch.  docs/Ordered_Dict.md records that the whole Python dict protocol --
! keys / values / items / __iter__ / __len__ / __repr__ / ``in'' / subscript --
! is compiled onto KeyValueDictionary and built on a handful of env-0
! primitives.  Overriding those primitives to refresh first is therefore the
! narrow way to make every one of those reads live; reimplementing the protocol
! would be the wide way, with a new place for each of them to be subtly wrong.
!
! WRITES ARE NOT WRITTEN THROUGH.  CPython 3.13's proxy assigns into the frame;
! Grail's frame variables are Smalltalk temps read out of a stack capture and
! there is no route back.  A write lands in this dict and survives until the next
! refresh drops it, which is the same amount of nothing the old snapshot did,
! stated here so the gap is on the record rather than discovered.
expectvalue /Class
doit
PyDict subclass: 'PyFrameLocals'
  instVarNames: #( frame refreshing )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Metaclass3
doit
PyFrameLocals removeAllMethods: 0.
PyFrameLocals removeAllMethods: 1.
%

expectvalue /Class
doit
PyFrameLocals category: 'Grail-Tracebacks'
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyFrameLocals
onFrame: aFrame
	"A live view of aFrame's locals, primed with what the frame can see now."

	| inst snap |
	inst := self new.
	inst ___setFrame___: aFrame.
	"PRIMED FROM THE SNAPSHOT FIRST.  A refresh that cannot find the frame leaves
	the view as it is, so a view that started empty would STAY empty -- which
	looks exactly like a frame with no variables and is how the first draft of
	this reported ``[]'' for every scope."
	"``@env1:'' because PyFrame's live-locals accessors are env-1 methods (they
	sit with f_globals) while this file compiles in env 0."
	snap := [aFrame @env1:___liveLocalsSnapshot___]
		on: Error do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: nil].
	snap isNil ifFalse: [
		snap keysAndValuesDo: [:k :v | inst at: k put: v]].
	inst ___refresh___.
	^ inst
%

category: 'Grail-Private'
method: PyFrameLocals
___setFrame___: aFrame
	frame := aFrame.
	refreshing := false
%

category: 'Grail-Private'
method: PyFrameLocals
___frame___
	^ frame
%

category: 'Grail-Private'
method: PyFrameLocals
___refresh___
	"Bring this view up to date with the frame AS IT IS NOW.

	RE-ENTRANT BY DESIGN, and the guard is what makes the overrides below safe to
	write one per primitive: refreshing rebuilds the dict, which sends the very
	primitives that trigger a refresh, so without it the first read would not
	terminate.  A refresh already in progress is also the one case where stale is
	right -- the rebuild is mid-flight and must see its own work.

	A frame that can no longer be found on the stack keeps what it last had, which
	is what a returned frame's locals are: see PyFrame >> ___liveLocalsNow___.
	A frame that IS found and has nothing to report empties this view -- that is a
	fact about the frame, not a gap, and it is the answer the comprehension case
	above turns on."

	| fresh gone savedVersion |
	refreshing == true ifTrue: [^ self].
	frame isNil ifTrue: [^ self].
	refreshing := true.
	"THE VERSION IS RESTORED AFTERWARDS.  PyDict bumps it on every mutation and
	the dict iterators read it to raise CPython's ``dictionary changed size during
	iteration''.  A refresh is not a mutation by the program -- the names were
	always the frame's -- and leaving the bump in place made a perfectly ordinary
	read raise: ``StackSummary.extract(..., capture_locals=True)'' takes an
	iterator over f_locals and the first step of the walk refreshed underneath it
	(test_traceback's test_format_locals).  A reader that spans several primitives
	therefore sees ONE view, which is also what CPython's proxy gives it -- its
	items() answers a list."
	savedVersion := self ___version___.
	[
		fresh := [frame @env1:___liveLocalsNow___]
			on: Error do: [:ex |
				(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
				ex return: nil].
		fresh isNil ifFalse: [
			"Dropped first, so a name whose lifetime ended is gone before any
			reader sees the new contents.  Collected before removing, because
			removeKey: mutates the very order being walked."
			gone := OrderedCollection new.
			super ___order___ do: [:k |
				(fresh includesKey: k) ifFalse: [gone add: k]].
			gone do: [:k | self removeKey: k ifAbsent: [nil]].
			fresh keysAndValuesDo: [:k :v | self at: k put: v]]
	] ensure: [
		version := savedVersion.
		refreshing := false].
	^ self
%

! ------- The env-0 primitives the Python dict protocol is built on.  Each
! ------- refreshes ONCE and then behaves exactly as PyDict does.

category: 'Grail-Private'
method: PyFrameLocals
___refreshedThen___: aBlock
	"Refresh, then run aBlock with further refreshes SUPPRESSED.

	One refresh per operation, not per primitive.  PyDict's iteration is written
	as ``self ___order___ do: [:k | ... (self at: k)]'', so a refresh in each
	primitive means a rebuild per key WHILE the order collection is being walked
	-- ``RuntimeError: dictionary changed size during iteration'', which is what
	test_traceback's test_format_locals reported the moment this class existed.
	Suppressing for the duration also gives every operation a CONSISTENT view,
	which is what a caller reading keys and values together is entitled to."

	| saved |
	self ___refresh___.
	saved := refreshing.
	refreshing := true.
	^ [aBlock value] ensure: [refreshing := saved]
%

category: 'Grail-Live View'
method: PyFrameLocals
___order___
	^ self ___refreshedThen___: [super ___order___]
%

category: 'Grail-Live View'
method: PyFrameLocals
at: aKey
	^ self ___refreshedThen___: [super at: aKey]
%

category: 'Grail-Live View'
method: PyFrameLocals
at: aKey ifAbsent: aBlock
	^ self ___refreshedThen___: [super at: aKey ifAbsent: aBlock]
%

category: 'Grail-Live View'
method: PyFrameLocals
includesKey: aKey
	^ self ___refreshedThen___: [super includesKey: aKey]
%

category: 'Grail-Live View'
method: PyFrameLocals
size
	^ self ___refreshedThen___: [super size]
%

category: 'Grail-Live View'
method: PyFrameLocals
do: aBlock
	^ self ___refreshedThen___: [super do: aBlock]
%

category: 'Grail-Live View'
method: PyFrameLocals
keysDo: aBlock
	^ self ___refreshedThen___: [super keysDo: aBlock]
%

category: 'Grail-Live View'
method: PyFrameLocals
valuesDo: aBlock
	^ self ___refreshedThen___: [super valuesDo: aBlock]
%

category: 'Grail-Live View'
method: PyFrameLocals
keysAndValuesDo: aBlock
	^ self ___refreshedThen___: [super keysAndValuesDo: aBlock]
%

category: 'Grail-Live View'
method: PyFrameLocals
associationsDo: aBlock
	^ self ___refreshedThen___: [super associationsDo: aBlock]
%

! ------- Iteration hands out a SNAPSHOT.

set compile_env: 1

category: 'Grail-Live View'
method: PyFrameLocals
___snapshot___
	"A plain PyDict holding what this view sees right now.

	Grail's dict iterators take the entry list at creation and then re-check the
	dict's SIZE on every step, raising CPython's ``dictionary changed size during
	iteration'' when it moved.  A live view moves by design -- the second step of
	a walk runs at a different stack depth from the first -- so iterating one
	directly turned an ordinary read into a RuntimeError
	(``StackSummary.extract(..., capture_locals=True)'', test_traceback's
	test_format_locals).

	Iterating a copy is not a workaround for that but the same thing CPython
	does: FrameLocalsProxy's keys(), values() and items() each answer a LIST, and
	iter(proxy) walks a snapshot of the keys.  A view is live between reads, not
	during one."

	| out |
	self @env0:___refresh___.
	out := (Python @env0:at: #'PyDict') @env0:new.
	self @env0:keysAndValuesDo: [:k :v | out @env0:at: k put: v].
	^ out
%

category: 'Grail-Live View'
method: PyFrameLocals
__iter__
	^ self ___snapshot___ __iter__
%

category: 'Grail-Live View'
method: PyFrameLocals
keys
	^ self ___snapshot___ keys
%

category: 'Grail-Live View'
method: PyFrameLocals
values
	^ self ___snapshot___ values
%

category: 'Grail-Live View'
method: PyFrameLocals
items
	^ self ___snapshot___ items
%

set compile_env: 0

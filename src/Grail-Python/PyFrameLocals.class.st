Class {
	#name : 'PyFrameLocals',
	#superclass : 'PyDict',
	#instVars : [
		'frame',
		'refreshing'
	],
	#category : 'Grail-Tracebacks'
}

{ #category : 'Grail-Instance Creation' }
PyFrameLocals class >> onFrame: aFrame [
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

]

{ #category : 'Grail-Private' }
PyFrameLocals >> ___frame___ [
	^ frame

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> ___order___ [
	^ self ___refreshedThen___: [super ___order___]

]

{ #category : 'Grail-Private' }
PyFrameLocals >> ___refresh___ [
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
				(k ~~ nil and: [(fresh includesKey: k) not]) ifTrue: [gone add: k]].
			gone do: [:k | self removeKey: k ifAbsent: [nil]].
			fresh keysAndValuesDo: [:k :v | self at: k put: v]]
	] ensure: [
		version := savedVersion.
		refreshing := false].
	^ self

]

{ #category : 'Grail-Private' }
PyFrameLocals >> ___refreshedThen___: aBlock [
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

]

{ #category : 'Grail-Private' }
PyFrameLocals >> ___setFrame___: aFrame [
	frame := aFrame.
	refreshing := false

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> associationsDo: aBlock [
	^ self ___refreshedThen___: [super associationsDo: aBlock]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> at: aKey [
	^ self ___refreshedThen___: [super at: aKey]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> at: aKey ifAbsent: aBlock [
	^ self ___refreshedThen___: [super at: aKey ifAbsent: aBlock]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> do: aBlock [
	^ self ___refreshedThen___: [super do: aBlock]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> includesKey: aKey [
	^ self ___refreshedThen___: [super includesKey: aKey]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> keysAndValuesDo: aBlock [
	^ self ___refreshedThen___: [super keysAndValuesDo: aBlock]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> keysDo: aBlock [
	^ self ___refreshedThen___: [super keysDo: aBlock]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> size [
	^ self ___refreshedThen___: [super size]

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> valuesDo: aBlock [
	^ self ___refreshedThen___: [super valuesDo: aBlock]

]

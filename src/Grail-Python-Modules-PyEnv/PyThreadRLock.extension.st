Extension { #name : 'PyThreadRLock' }

{ #category : 'Grail-Lock' }
PyThreadRLock >> __enter__ [
	self @env0:_take.
	^ self

]

{ #category : 'Grail-Lock' }
PyThreadRLock >> __exit__: excType _: excValue _: tb [
	self @env0:_drop.
	^ false

]

{ #category : 'Grail-Lock' }
PyThreadRLock >> _acquire: positional kw: kwargs [
	"Varargs ``acquire(blocking=True, timeout=-1)''.  A re-entrant acquire by
	the owner never blocks, so blocking/timeout only matter on first entry."

	| n blocking |
	n := positional @env0:isNil @env0:ifTrue: [0] @env0:ifFalse: [positional @env0:size].
	blocking := (n @env0:>= 1) @env0:ifTrue: [positional @env0:at: 1] @env0:ifFalse: [true].
	(blocking @env0:== false and: [(self @env0:owner) @env0:~~ (GsProcess @env0:current)])
		ifTrue: [
			(self @env0:_sem @env0:tryLock) @env0:ifFalse: [^ false].
			^ self @env0:_claimTried].
	^ self @env0:_take

]

{ #category : 'Grail-Lock' }
PyThreadRLock >> acquire [
	^ self @env0:_take

]

{ #category : 'Grail-Lock' }
PyThreadRLock >> locked [
	^ self @env0:_sem @env0:isLocked

]

{ #category : 'Grail-Lock' }
PyThreadRLock >> release [
	self @env0:_drop.
	^ None

]

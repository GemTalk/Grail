Extension { #name : 'PyThreadLock' }

{ #category : 'Grail-Lock' }
PyThreadLock >> __enter__ [
	self @env0:_sem @env0:wait.
	^ self

]

{ #category : 'Grail-Lock' }
PyThreadLock >> __exit__: excType _: excValue _: tb [
	self @env0:_sem @env0:signal.
	^ false

]

{ #category : 'Grail-Lock' }
PyThreadLock >> _acquire: positional kw: kwargs [
	"Varargs ``acquire(blocking=True, timeout=-1)``."

	| n blocking timeout |
	n := positional @env0:size.
	blocking := (n @env0:>= 1) @env0:ifTrue: [positional @env0:at: 1] @env0:ifFalse: [true].
	timeout := (n @env0:>= 2) @env0:ifTrue: [positional @env0:at: 2] @env0:ifFalse: [-1].
	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	(timeout @env0:< 0) @env0:ifTrue: [self @env0:_sem @env0:wait. ^ true].
	^ self @env0:_sem @env0:waitForMilliseconds: (timeout @env0:* 1000) @env0:truncated

]

{ #category : 'Grail-Lock' }
PyThreadLock >> acquire [
	"Block until the lock is available, then take it.  Returns True."

	self @env0:_sem @env0:wait.
	^ true

]

{ #category : 'Grail-Lock' }
PyThreadLock >> acquire: blocking [
	"``acquire(blocking)`` — when blocking is false, return immediately with
	whether the lock was taken."

	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	self @env0:_sem @env0:wait.
	^ true

]

{ #category : 'Grail-Lock' }
PyThreadLock >> acquire: blocking _: timeout [
	"``acquire(blocking, timeout)`` — timeout is in seconds (negative = forever)."

	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	(timeout @env0:< 0) @env0:ifTrue: [self @env0:_sem @env0:wait. ^ true].
	^ self @env0:_sem @env0:waitForMilliseconds: (timeout @env0:* 1000) @env0:truncated

]

{ #category : 'Grail-Lock' }
PyThreadLock >> locked [
	^ self @env0:_sem @env0:isLocked

]

{ #category : 'Grail-Lock' }
PyThreadLock >> release [
	"Release the lock (signal one waiter)."

	self @env0:_sem @env0:signal.
	^ None

]

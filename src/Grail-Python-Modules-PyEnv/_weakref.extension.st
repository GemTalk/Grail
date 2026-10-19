Extension { #name : '_weakref' }

{ #category : 'Grail-Built-in Functions' }
_weakref >> _collect [
	"Grail extension: force GC + drain the ephemeron finalization queue. Used
	 by weakref tests to make ephemeron firing synchronous."

	WeakReference @env1:_collect.
	^None

]

{ #category : 'Grail-Initialization' }
_weakref >> initialize [
	"No-op; `module>>instance` calls initialize on the singleton."

]

{ #category : 'Grail-Built-in Functions' }
_weakref >> ref_class [
	"Return the underlying WeakReference Smalltalk class. Used by Python
	 isinstance checks against `weakref.ref`."

	^WeakReference

]

{ #category : 'Grail-Built-in Functions' }
_weakref >> ref: anObject [
	"weakref.ref(obj) — construct a weak reference. Python fast-path attribute
	 call `_weakref.ref(x)` dispatches here."

	^WeakReference @env0:on: anObject

]

{ #category : 'Grail-Built-in Functions' }
_weakref >> ref: anObject _: aCallback [
	"weakref.ref(obj, callback) — construct a weak reference with callback.
	 Wraps the Python callable (ExecBlock taking positional+kwargs) in a
	 1-arg Smalltalk block so #mourn's `callback value: self` invocation
	 routes through Python's calling convention."

	aCallback == None ifTrue: [^WeakReference @env0:on: anObject].
	^WeakReference @env0:on: anObject
		callback: [:r | aCallback @env0:value: (Array @env0:with: r) value: nil]

]

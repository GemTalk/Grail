Class {
	#name : 'FrameLocalsLiveViewTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FrameLocalsLiveViewTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Private' }
FrameLocalsLiveViewTestCase >> at: aKey item: anIndex [
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex

]

{ #category : 'Grail-Running' }
FrameLocalsLiveViewTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'frame_locals_live_view' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/frame_locals_live_view.py')
		name: 'frame_locals_live_view'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testALiveViewIsLiveWithinOneExpression [
	"``'a' in [ ... comprehension ... ][0]'' as the ONLY statement of a
	function, where nothing else is bound yet.  It is its own test because it is
	the case that distinguishes ``the frame is not on the stack, keep what you
	had'' from ``the frame is there and has nothing'' -- collapsing those two
	left the target alive in exactly the frames with no other local, which is a
	rule nobody would choose."

	self assert: (self at: 'only_statement') equals: false.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testAModuleFrameWithNoTempsReportsItsNamespace [
	"CPython's module frame has no fast locals, so its f_locals IS its globals
	mapping -- and the same frame reports only the comprehension's target while
	an inlined comprehension runs.  Grail reaches both by one split: temps if
	there are any, the namespace if there are not."

	self assert: (self at: 'module_plain' item: 0) equals: 'dict'.
	self assert: ((self at: 'module_plain' item: 1) @env1:__getitem__: 0)
		equals: 'i'.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testEveryReadOfTheViewAgrees [
	"A view is only useful if all of its readers see the same thing: iteration,
	``in'', keys(), len(), get() and items() are separate paths through PyDict
	and each had to be refreshed exactly once -- refreshing per PRIMITIVE
	rebuilt the dict under its own iteration."

	| got |
	got := self at: 'every_read'.
	self assert: (got @env1:__getitem__: 1) equals: false.   "'a' in d"
	self assert: (got @env1:__getitem__: 2) equals: true.    "'q' in d"
	self assert: (got @env1:__getitem__: 4) equals: 2.       "len(d)"
	self assert: (got @env1:__getitem__: 5) equals: 'MISSING'.
	self assert: ((got @env1:__getitem__: 0) @env1:__getitem__: 0) equals: 'd'.
	self assert: ((got @env1:__getitem__: 6) @env1:__getitem__: 1) equals: 'q'.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testExecdCodeHasAFrameOfItsOwn [
	"['<module>', 'chain_from_exec', '<module>'] -- CPython's answer exactly.
	Grail's was the two outer entries: the exec'd body had no frame at all, so
	the walk started at its caller."

	| chain |
	chain := self at: 'chain_from_exec'.
	self assert: chain @env1:__len__ equals: 3.
	self assert: (chain @env1:__getitem__: 0) equals: '<module>'.
	self assert: (chain @env1:__getitem__: 1) equals: 'chain_from_exec'.
	self assert: (chain @env1:__getitem__: 2) equals: '<module>'.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testTheTargetIsGoneAfterTheComprehension [
	"The half a snapshot cannot answer.  Both scopes, because they failed for
	DIFFERENT reasons before -- the function one read a stale snapshot, the
	module one read the caller's frame."

	self assert: (self at: 'after_module') equals: false.
	self assert: (self at: 'after_function') equals: false.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testTheTargetIsThereDuringTheComprehension [
	"...and the other half, which is what stops the fix from being ``hide the
	comprehension's target''.  Read from INSIDE the loop, the target is a local
	like any other."

	self assert: (self at: 'inside_module') equals: 0.
	self assert: (self at: 'inside_function') equals: 0.

]

{ #category : 'Grail-Tests' }
FrameLocalsLiveViewTestCase >> testTheViewNamesItselfAsCPythonDoes [
	"``type(f.f_locals).__name__'' is ``FrameLocalsProxy'' in CPython.  Mapped in
	object class >> ___pythonBuiltinTypeName___, where every other Grail-spelled
	built-in type is, and deliberately NOT into the ``dict'' group there: CPython's
	proxy is not a dict."

	self assert: (self at: 'proxy_type_name') equals: 'FrameLocalsProxy'.

]

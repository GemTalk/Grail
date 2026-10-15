Class {
	#name : 'UnboundMethodDictTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
UnboundMethodDictTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
UnboundMethodDictTestCase >> reprAt: aKey [
	"The fixture's entries are nested Python values; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
UnboundMethodDictTestCase >> setUp [
	probe := self ___loadProbe___: 'unbound_method_dict'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testANestedFunctionIsUnaffected [
	"The ExecBlock path, which already had a live __dict__ -- regression guard
	on the class of callable this change does NOT touch."

	self assert: (self reprAt: 'a_nested_function_is_unaffected')
		equals: '[42, 1, [''abc'']]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testAnUndecoratedMethodHasAnEmptyDict [
	"Empty, not absent, and not populated with the metadata slots.  CPython
	implements __name__ / __qualname__ / __doc__ / __module__ as getset
	descriptors rather than dict entries, so a fresh function's __dict__ is
	``{}'' -- the same distinction ExecBlock's __dict__ maintains."

	self assert: (self reprAt: 'dict_starts_empty') equals: '[]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testAttributesAreVisibleThroughAnInstanceRead [
	"``C().foo.abc'' -- the bound read reaches the same attributes, since
	CPython's bound method forwards attribute lookup to its function."

	self assert: (self reprAt: 'visible_through_an_instance_read') equals: '1'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testAttributesDoNotLeakOntoTheClass [
	"A function attribute belongs to the FUNCTION.  The handle is interned per
	(class, selector) and its storage is its own, so ``abc'' must not appear in
	C.__dict__ or dir(C) -- which a fix that stashed these on the class would
	have got wrong."

	self assert: (self reprAt: 'attributes_do_not_leak_onto_the_class')
		equals: '[False, False, 1]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testDictItemAssignmentReachesTheMethod [
	"MiscDecorators.author's spelling -- ``func.__dict__['author'] = name''.
	A separate path from update:, and the one a decorator writing a single
	attribute typically uses."

	self assert: (self reprAt: 'setitem_decorator') equals: '[''Cleese'', 1]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testDictUpdateDecoratorReachesTheMethod [
	"test_decorators' test_double, exactly: two stacked funcattrs, each
	merging through __dict__.update.  Previously the first one raised, both
	were discarded, and the attribute reads failed."

	self assert: (self reprAt: 'dict_update_decorator')
		equals: '[42, 1, ''haha'', 42]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testSetattrStillWorksAndAgreesWithTheDict [
	"The path that worked BEFORE this change, kept so the new view does not
	displace it -- and pinning that the two spellings see one store rather
	than two."

	self assert: (self reprAt: 'setattr_still_works') equals: '[9, True]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testTheDecoratorIsNotSilentlyDropped [
	"Speaks to the failure MODE rather than the attribute: this decorator
	REPLACES the function, so a dropped decorator answers 1 where the applied
	one answers 99.  It is the check that distinguishes ``the decorator ran''
	from ``the attribute happens to be readable''."

	self assert: (self reprAt: 'decorator_is_not_silently_dropped')
		equals: '[99, ''seen'']'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testTheDictIsLiveNotASnapshot [
	"THE test.  A __dict__ that answered a copy would let both decorators
	above appear to succeed and change nothing -- strictly worse than raising,
	because nothing would announce it."

	self assert: (self reprAt: 'dict_is_live_not_a_snapshot')
		equals: '[1, 2, [''a'', ''b'']]'.

]

{ #category : 'Grail-Tests' }
UnboundMethodDictTestCase >> testTheHandleIsInterned [
	"Why the storage is stable enough to expose: one handle per (class, name),
	so a write through __dict__ is visible to the next read.  Without this the
	view would be live onto an object nobody reads again."

	self assert: (self reprAt: 'the_handle_is_interned') equals: 'True'.

]

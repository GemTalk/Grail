Class {
	#name : 'AnIdIsUniqueAmongLiveObjectsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AnIdIsUniqueAmongLiveObjectsTestCase >> testACommittedObjectsIdIsItsOop [
	"An ordinary object's id is its OOP shifted right 8 bits, which is what
	keeps it the same across commit and across sessions -- the OOP is the
	object's identity in the repository -- and what keeps the repr addresses
	Grail always printed.  Object is a committed object every session sees."

	| b |
	b := (Python at: #builtins) @env1:instance.
	self assert: (b @env1:id: Object) equals: (Object asOop bitShift: -8).
	self assert: (b @env1:id: Object) equals: Object identityHash

]

{ #category : 'Grail-Tests' }
AnIdIsUniqueAmongLiveObjectsTestCase >> testAnIdIsUniqueAmongLiveObjects [
	"tests/python/an_id_is_unique_among_live_objects.py: no live int shares an
	id with another live object, an id is a non-negative int, pickle's and
	copy.deepcopy's id-keyed memos keep an int equal to another object's id,
	and a default repr prints the id.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'an_id_is_unique_among_live_objects' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/an_id_is_unique_among_live_objects.py')
		name: 'an_id_is_unique_among_live_objects'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
AnIdIsUniqueAmongLiveObjectsTestCase >> testASpecialObjectsIdIsAboveEveryOrdinaryOne [
	"identityHash of the int 1333 is 1333, which is also the identityHash of
	the ordinary object whose OOP is 1333 << 8 + 1, so id() could not be it.
	A special object's id is 2^56 plus its OOP, above every ordinary id (an
	OOP >> 8, so below 2^56)."

	| b limit |
	b := (Python at: #builtins) @env1:instance.
	limit := 1 bitShift: 56.
	{ 0. 1. -1. 1333. SmallInteger maximumValue. SmallInteger minimumValue. 1.5.
	  nil. true. false. $a. 3/4 } do: [:each |
		self assert: (b @env1:id: each) equals: limit + each asOop].
	{ Object new. Array new: 3. 2 raisedTo: 70. 'abc' copy } do: [:each |
		self assert: (b @env1:id: each) < limit].
	self deny: (b @env1:id: nil) = (b @env1:id: 257).
	self deny: (b @env1:id: true) = (b @env1:id: 258)

]

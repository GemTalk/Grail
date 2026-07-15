! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PyDictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PyDictTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PyDictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PyDictTestCase -- PyDict (the insertion-ordered Python dict, KeyValueDictionary
! subclass; docs/Ordered_Dict.md).  Phase 1 exercises PyDict directly at the
! Smalltalk level (the `dict` alias flip that routes literals/kwargs to PyDict
! is a later phase); once the flip lands these behaviours are also reachable via
! Python `{...}` / `dict(...)`.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PyDictTestCase removeAllMethods.
PyDictTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-pydict'
method: PyDictTestCase
ordered
	"A PyDict with keys inserted in a hash-scrambling order (zz, aa, mm --
	which a plain KeyValueDictionary iterates zz|mm|aa)."

	| d |
	d := PyDict @env0:new.
	d @env0:at: 'zz' put: 1.
	d @env0:at: 'aa' put: 2.
	d @env0:at: 'mm' put: 3.
	^ d
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testKeysInInsertionOrder
	self assert: (self ordered @env1:keys) @env1:__repr__ equals: '[''zz'', ''aa'', ''mm'']'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testItemsInInsertionOrder
	self assert: (self ordered @env1:items) @env1:__repr__
		equals: '[(''zz'', 1), (''aa'', 2), (''mm'', 3)]'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testReprInInsertionOrder
	self assert: (self ordered @env1:__repr__) equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testIterWalksInsertionOrder
	"__iter__ (for-loop / list(d)) walks keys in insertion order."

	| d it out done k |
	d := self ordered.
	it := d @env1:__iter__.
	out := WriteStream @env0:on: String @env0:new.
	done := false.
	[done] @env0:whileFalse: [
		[k := it @env1:__next__. out @env0:nextPutAll: k; @env0:nextPut: $|]
			@env0:on: AbstractException do: [:e | done := true. e @env0:return: nil]].
	self assert: out @env0:contents equals: 'zz|aa|mm|'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testUpdateKeepsPosition
	"Re-assigning an existing key updates the value but keeps its position
	(CPython semantics)."

	| d |
	d := self ordered.
	d @env0:at: 'zz' put: 99.
	self assert: (d @env1:__repr__) equals: '{''zz'': 99, ''aa'': 2, ''mm'': 3}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testRemoveDropsFromOrder
	| d |
	d := self ordered.
	d @env0:removeKey: 'aa'.
	self assert: (d @env1:__repr__) equals: '{''zz'': 1, ''mm'': 3}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testCopyHasIndependentOrder
	"A copy owns its order list -- mutating the copy does not disturb the
	original."

	| d c |
	d := self ordered.
	c := d @env0:copy.
	c @env0:at: 'new' put: 5.
	self assert: (d @env1:__repr__) equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3}'.
	self assert: (c @env1:__repr__) equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3, ''new'': 5}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testIsInstanceOfDict
	"PyDict is-a KeyValueDictionary, so every dict consumer keeps working."

	self assert: (self ordered isKindOf: KeyValueDictionary)
%

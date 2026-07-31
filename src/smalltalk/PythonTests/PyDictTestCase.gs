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
	d := PyDict new.
	d at: 'zz' put: 1.
	d at: 'aa' put: 2.
	d at: 'mm' put: 3.
	^ d
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testKeysInInsertionOrder
	"keys() is a Python 3 view: repr is dict_keys([...]), in insertion order."
	self assert: (self ordered @env1:keys) @env1:__repr__ equals: 'dict_keys([''zz'', ''aa'', ''mm''])'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testItemsInInsertionOrder
	"items() is a Python 3 view: repr is dict_items([...]), in insertion order."
	self assert: (self ordered @env1:items) @env1:__repr__
		equals: 'dict_items([(''zz'', 1), (''aa'', 2), (''mm'', 3)])'
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
	out := WriteStream on: String new.
	done := false.
	[done] whileFalse: [
		[k := it @env1:__next__. out nextPutAll: k; nextPut: $|]
			on: AbstractException do: [:e | done := true. e return: nil]].
	self assert: out contents equals: 'zz|aa|mm|'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testUpdateKeepsPosition
	"Re-assigning an existing key updates the value but keeps its position
	(CPython semantics)."

	| d |
	d := self ordered.
	d at: 'zz' put: 99.
	self assert: (d @env1:__repr__) equals: '{''zz'': 99, ''aa'': 2, ''mm'': 3}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testRemoveDropsFromOrder
	| d |
	d := self ordered.
	d removeKey: 'aa'.
	self assert: (d @env1:__repr__) equals: '{''zz'': 1, ''mm'': 3}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testCopyHasIndependentOrder
	"A copy owns its order list -- mutating the copy does not disturb the
	original."

	| d c |
	d := self ordered.
	c := d copy.
	c at: 'new' put: 5.
	self assert: (d @env1:__repr__) equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3}'.
	self assert: (c @env1:__repr__) equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3, ''new'': 5}'
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testIsInstanceOfDict
	"PyDict is-a KeyValueDictionary, so every dict consumer keeps working."

	self assert: (self ordered isKindOf: KeyValueDictionary)
%

category: 'Grail-Tests-pydict'
method: PyDictTestCase
testInstanceDictPreservesInsertionOrder
	"obj.__dict__ / vars(obj) iterate attributes in INSERTION order (a
	CPython guarantee, same family as the PyDict work).  Grail's instance
	__dict__ is a PyInstanceDict live view over the instance's dynamic
	instVars, which GemStone stores in declaration order -- so this case is
	ordered independently of PyDict; the test locks that invariant.
	del + re-assign appends at the end (CPython semantics), matching a
	dynamic-instVar remove-then-add."

	| m |
	m := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/instdict_order.py')
		name: 'instdict_order'.
	self assert: (m @env1:___pyAttrLoad___: #'BEFORE') @env1:__repr__
		equals: '[''zz'', ''aa'', ''mm'', ''qq'']'.
	self assert: (m @env1:___pyAttrLoad___: #'VARSKEYS') @env1:__repr__
		equals: '[''zz'', ''aa'', ''mm'', ''qq'']'.
	self assert: (m @env1:___pyAttrLoad___: #'REP')
		equals: '{''zz'': 1, ''aa'': 2, ''mm'': 3, ''qq'': 4}'.
	self assert: (m @env1:___pyAttrLoad___: #'AFTER') @env1:__repr__
		equals: '[''zz'', ''mm'', ''qq'', ''aa'']'
%

category: 'Grail-Tests - View Hashing'
method: PyDictTestCase
testSetLikeViewsAreUnhashable
	"CPython sets __hash__ = None on the SET-LIKE views: they define a
	set-like __eq__ over contents that change with the dict, so no stable
	hash exists.  Grail defined that __eq__ without a __hash__, leaving them
	silently hashable on object's identity hash."

	self should: [self eval: 'hash({"a": 1}.keys())'] raise: TypeError.
	self should: [self eval: 'hash({"a": 1}.items())'] raise: TypeError
%

category: 'Grail-Tests - View Hashing'
method: PyDictTestCase
testValuesViewStaysHashable
	"THE case that makes the rule above worth stating precisely: dict_values
	is NOT set-like -- it has no set-like __eq__ -- so CPython leaves it with
	object's identity hash and ``hash(d.values())'' SUCCEEDS.  Grail's
	hierarchy draws the same line (dict_values descends from dict_view, not
	dict_set_view), so blocking only the set-like views is both correct and
	sufficient.  A blanket 'views are unhashable' rule would break this."

	self assert: (self eval: 'isinstance(hash({"a": 1}.values()), int)')
		equals: true
%

category: 'Grail-Tests - View Hashing'
method: PyDictTestCase
testMappingProxyDelegatesHashToTheWrappedMapping
	"CPython does NOT set __hash__ = None on mappingproxy -- it FORWARDS to
	the mapping it wraps.  The tell is the message: hashing a proxy over a
	dict raises ``unhashable type: 'dict''', naming the WRAPPED type rather
	than 'mappingproxy'.  Forwarding reproduces that exactly."

	| raised |
	raised := false.
	[self eval: 'import types
hash(types.MappingProxyType({"a": 1}))']
		on: TypeError
		do: [:ex |
			raised := true.
			self assert: ((ex messageText indexOfSubCollection: 'unhashable type') > 0).
			"the WRAPPED type, not the proxy"
			self assert: ((ex messageText indexOfSubCollection: '''dict''') > 0).
			ex return: nil].
	self assert: raised
%

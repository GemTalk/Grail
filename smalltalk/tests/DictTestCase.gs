! ===============================================================================
! DictTestCase - Tests for Python dict type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
DictTestCase removeAllMethods: 0.
DictTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for DictTestCase

category: 'Tests - Creation'
method: DictTestCase
testDictCreation
	"Test creating dictionaries"

	| d1 d2 |
	d1 := dict new.
	d2 := dict new.
	
	d2 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.
	
	self assert: d1 size equals: 0.
	self assert: d2 size equals: 3
%

category: 'Tests - Creation'
method: DictTestCase
testDictKeyOverwrite
	"Test that setting the same key overwrites the value"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 3}.
	
	self assert: d size equals: 1.
	self assert: (d perform: #__getitem__: env: 2 withArguments: {'a'}) equals: 3
%

category: 'Tests - Access'
method: DictTestCase
testDictGetItem
	"Test getting items from a dictionary"

	| d value |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'key1'. 'value1'}.
	d perform: #__setitem__:_: env: 2 withArguments: {'key2'. 'value2'}.
	
	value := d perform: #__getitem__: env: 2 withArguments: {'key1'}.
	self assert: value equals: 'value1'.
	
	value := d perform: #__getitem__: env: 2 withArguments: {'key2'}.
	self assert: value equals: 'value2'
%

category: 'Tests - Access'
method: DictTestCase
testDictGetItemKeyError
	"Test that getting a non-existent key raises KeyError"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	
	self should: [
		d perform: #__getitem__: env: 2 withArguments: {'nonexistent'}
	] raise: KeyError
%

category: 'Tests - Access'
method: DictTestCase
testDictContains
	"Test the __contains__ method"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	
	self assert: (d ___contains___: 'a').
	self assert: (d ___contains___: 'b').
	self deny: (d ___contains___: 'c')
%

category: 'Tests - Mutation'
method: DictTestCase
testDictDelItem
	"Test deleting items from a dictionary"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.
	
	self assert: d size equals: 3.
	
	d perform: #__delitem__: env: 2 withArguments: {'b'}.
	
	self assert: d size equals: 2.
	self assert: (d ___contains___: 'a').
	self deny: (d ___contains___: 'b').
	self assert: (d ___contains___: 'c')
%

category: 'Tests - Mutation'
method: DictTestCase
testDictDelItemKeyError
	"Test that deleting a non-existent key raises KeyError"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	
	self should: [
		d perform: #__delitem__: env: 2 withArguments: {'nonexistent'}
	] raise: KeyError
%

category: 'Tests - Mutation'
method: DictTestCase
testDictClear
	"Test clearing a dictionary"

	| d |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.

	self assert: d size equals: 3.

	d perform: #clear env: 2.

	self assert: d size equals: 0
%

category: 'Tests - Comparison'
method: DictTestCase
testDictEquality
	"Test dictionary equality"

	| d1 d2 d3 |
	d1 := dict new.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	d2 := dict new.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	d3 := dict new.
	d3 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d3 perform: #__setitem__:_: env: 2 withArguments: {'b'. 3}.

	self assert: (d1 perform: #__eq__: env: 2 withArguments: {d2}).
	self deny: (d1 perform: #__eq__: env: 2 withArguments: {d3})
%

category: 'Tests - Comparison'
method: DictTestCase
testDictInequality
	"Test dictionary inequality"

	| d1 d2 |
	d1 := dict new.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.

	d2 := dict new.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'a'. 2}.

	self assert: (d1 perform: #__ne__: env: 2 withArguments: {d2})
%

category: 'Tests - Methods'
method: DictTestCase
testDictGet
	"Test the get method"

	| d value |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.

	value := d perform: #get: env: 2 withArguments: {'a'}.
	self assert: value equals: 1.

	value := d perform: #get: env: 2 withArguments: {'nonexistent'}.
	self assert: value isNil.

	value := d perform: #get:_: env: 2 withArguments: {'nonexistent'. 'default'}.
	self assert: value equals: 'default'
%

category: 'Tests - Methods'
method: DictTestCase
testDictKeys
	"Test the keys method"

	| d keys |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.

	keys := d perform: #keys env: 2.

	self assert: (keys size) equals: 3.
	self assert: (keys includes: 'a').
	self assert: (keys includes: 'b').
	self assert: (keys includes: 'c')
%

category: 'Tests - Methods'
method: DictTestCase
testDictValues
	"Test the values method"

	| d values |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.

	values := d perform: #values env: 2.

	self assert: (values size) equals: 3.
	self assert: (values includes: 1).
	self assert: (values includes: 2).
	self assert: (values includes: 3)
%

category: 'Tests - Methods'
method: DictTestCase
testDictItems
	"Test the items method"

	| d items firstItem |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	items := d perform: #items env: 2.

	self assert: (items size) equals: 2.

	firstItem := items at: 1.
	self assert: (firstItem size) equals: 2
%

category: 'Tests - Methods'
method: DictTestCase
testDictPop
	"Test the pop method"

	| d value |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	value := d perform: #pop: env: 2 withArguments: {'a'}.

	self assert: value equals: 1.
	self assert: d size equals: 1.
	self deny: (d ___contains___: 'a')
%

category: 'Tests - Methods'
method: DictTestCase
testDictPopKeyError
	"Test that pop raises KeyError for non-existent key without default"

	| d |
	d := dict new.

	self should: [
		d perform: #pop: env: 2 withArguments: {'nonexistent'}
	] raise: KeyError
%

category: 'Tests - Methods'
method: DictTestCase
testDictPopWithDefault
	"Test the pop method with default value"

	| d value |
	d := dict new.

	value := d perform: #pop:_: env: 2 withArguments: {'nonexistent'. 'default'}.

	self assert: value equals: 'default'
%

category: 'Tests - Methods'
method: DictTestCase
testDictPopitem
	"Test the popitem method"

	| d pair key value |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	self assert: d size equals: 2.

	pair := d perform: #popitem env: 2.

	self assert: d size equals: 1.
	self assert: (pair size) equals: 2.

	key := pair at: 1.
	value := pair at: 2.

	self deny: (d ___contains___: key)
%

category: 'Tests - Methods'
method: DictTestCase
testDictPopitemKeyError
	"Test that popitem raises KeyError on empty dictionary"

	| d |
	d := dict new.

	self should: [
		d perform: #popitem env: 2
	] raise: KeyError
%

category: 'Tests - Methods'
method: DictTestCase
testDictSetdefault
	"Test the setdefault method"

	| d value |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.

	value := d perform: #setdefault: env: 2 withArguments: {'a'}.
	self assert: value equals: 1.

	value := d perform: #setdefault:_: env: 2 withArguments: {'b'. 2}.
	self assert: value equals: 2.
	self assert: (d ___contains___: 'b').
	self assert: (d perform: #__getitem__: env: 2 withArguments: {'b'}) equals: 2
%

category: 'Tests - Methods'
method: DictTestCase
testDictUpdate
	"Test the update method with another dictionary"

	| d1 d2 |
	d1 := dict new.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	d2 := dict new.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'b'. 3}.
	d2 perform: #__setitem__:_: env: 2 withArguments: {'c'. 4}.

	d1 perform: #update: env: 2 withArguments: {d2}.

	self assert: d1 size equals: 3.
	self assert: (d1 perform: #__getitem__: env: 2 withArguments: {'a'}) equals: 1.
	self assert: (d1 perform: #__getitem__: env: 2 withArguments: {'b'}) equals: 3.
	self assert: (d1 perform: #__getitem__: env: 2 withArguments: {'c'}) equals: 4
%

category: 'Tests - Methods'
method: DictTestCase
testDictCopy
	"Test the copy method"

	| d1 d2 |
	d1 := dict new.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d1 perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.

	d2 := d1 perform: #copy env: 2.

	self assert: d2 size equals: 2.
	self assert: (d2 perform: #__getitem__: env: 2 withArguments: {'a'}) equals: 1.
	self assert: (d2 perform: #__getitem__: env: 2 withArguments: {'b'}) equals: 2.

	"Verify it's a copy, not the same object"
	self deny: d1 == d2.

	"Modify the copy and verify original is unchanged"
	d2 perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.
	self assert: d2 size equals: 3.
	self assert: d1 size equals: 2
%

category: 'Tests - Iteration'
method: DictTestCase
testDictIteration
	"Test iterating over a dictionary (iterates over keys)"

	| d iter key1 key2 key3 keys |
	d := dict new.
	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	d perform: #__setitem__:_: env: 2 withArguments: {'b'. 2}.
	d perform: #__setitem__:_: env: 2 withArguments: {'c'. 3}.

	iter := d perform: #__iter__ env: 2.

	"Verify iterator type"
	self assert: iter class name equals: #'dict_keyiterator'.

	key1 := iter perform: #__next__ env: 2.
	key2 := iter perform: #__next__ env: 2.
	key3 := iter perform: #__next__ env: 2.

	keys := { key1. key2. key3. }.

	self assert: (keys includes: 'a').
	self assert: (keys includes: 'b').
	self assert: (keys includes: 'c').

	self should: [
		iter perform: #__next__ env: 2
	] raise: StopIteration
%

category: 'Tests - String Representation'
method: DictTestCase
testDictRepr
	"Test the __repr__ method"

	| d repr |
	d := dict new.

	repr := d perform: #__repr__ env: 2.
	self assert: repr equals: '{}'.

	d perform: #__setitem__:_: env: 2 withArguments: {'a'. 1}.
	repr := d perform: #__repr__ env: 2.
	self assert: (repr includesString: '''a''').
	self assert: (repr includesString: '1')
%

category: 'Tests - Type'
method: DictTestCase
testDictType
	"Test that dict instances report their type correctly"

	| d |
	d := dict new.

	self assert: (d perform: #__class__ env: 2) == dict
%




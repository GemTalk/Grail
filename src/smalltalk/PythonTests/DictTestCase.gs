! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictTestCase - Tests for Python dict type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
DictTestCase removeAllMethods: 0.
DictTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Mutation'
method: DictTestCase
testDictClear
	"Test clearing a dictionary"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.

	self assert: d size equals: 3.

	d @env1:clear.

	self assert: d size equals: 0
%

category: 'Grail-Tests - Access'
method: DictTestCase
testDictContains
	"Test the __contains__ method"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	
	self assert: (d @env1:__contains__: 'a').
	self assert: (d @env1:__contains__: 'b').
	self deny: (d @env1:__contains__: 'c')
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictCopy
	"Test the copy method"

	| d1 d2 |
	d1 := dict new.
	d1 @env1:__setitem__: 'a' _: 1.
	d1 @env1:__setitem__: 'b' _: 2.

	d2 := d1 @env1:copy.

	self assert: d2 size equals: 2.
	self assert: (d2 @env1:__getitem__: 'a') equals: 1.
	self assert: (d2 @env1:__getitem__: 'b') equals: 2.

	"Verify it's a copy, not the same object"
	self deny: d1 == d2.

	"Modify the copy and verify original is unchanged"
	d2 @env1:__setitem__: 'c' _: 3.
	self assert: d2 size equals: 3.
	self assert: d1 size equals: 2
%

category: 'Grail-Tests - Creation'
method: DictTestCase
testDictCreation
	"Test creating dictionaries"

	| d1 d2 |
	d1 := dict new.
	d2 := dict new.
	
	d2 @env1:__setitem__: 'a' _: 1.
	d2 @env1:__setitem__: 'b' _: 2.
	d2 @env1:__setitem__: 'c' _: 3.
	
	self assert: d1 size equals: 0.
	self assert: d2 size equals: 3
%

category: 'Grail-Tests - Mutation'
method: DictTestCase
testDictDelItem
	"Test deleting items from a dictionary"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.
	
	self assert: d size equals: 3.
	
	d @env1:__delitem__: 'b'.
	
	self assert: d size equals: 2.
	self assert: (d @env1:__contains__: 'a').
	self deny: (d @env1:__contains__: 'b').
	self assert: (d @env1:__contains__: 'c')
%

category: 'Grail-Tests - Mutation'
method: DictTestCase
testDictDelItemKeyError
	"Test that deleting a non-existent key raises KeyError"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	
	self should: [
		d @env1:__delitem__: 'nonexistent'
	] raise: KeyError
%

category: 'Grail-Tests - Comparison'
method: DictTestCase
testDictEquality
	"Test dictionary equality"

	| d1 d2 d3 |
	d1 := dict new.
	d1 @env1:__setitem__: 'a' _: 1.
	d1 @env1:__setitem__: 'b' _: 2.

	d2 := dict new.
	d2 @env1:__setitem__: 'a' _: 1.
	d2 @env1:__setitem__: 'b' _: 2.

	d3 := dict new.
	d3 @env1:__setitem__: 'a' _: 1.
	d3 @env1:__setitem__: 'b' _: 3.

	self assert: (d1 @env1:__eq__: d2).
	self deny: (d1 @env1:__eq__: d3)
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictGet
	"Test the get method"

	| d value |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.

	value := d @env1:get: 'a'.
	self assert: value equals: 1.

	value := d @env1:get: 'nonexistent'.
	self assert: value equals: None.

	value := d @env1:get: 'nonexistent' _: 'default'.
	self assert: value equals: 'default'
%

category: 'Grail-Tests - Access'
method: DictTestCase
testDictGetItem
	"Test getting items from a dictionary"

	| d value |
	d := dict new.
	d @env1:__setitem__: 'key1' _: 'value1'.
	d @env1:__setitem__: 'key2' _: 'value2'.
	
	value := d @env1:__getitem__: 'key1'.
	self assert: value equals: 'value1'.
	
	value := d @env1:__getitem__: 'key2'.
	self assert: value equals: 'value2'
%

category: 'Grail-Tests - Access'
method: DictTestCase
testDictGetItemKeyError
	"Test that getting a non-existent key raises KeyError"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	
	self should: [
		d @env1:__getitem__: 'nonexistent'
	] raise: KeyError
%

category: 'Grail-Tests - Comparison'
method: DictTestCase
testDictInequality
	"Test dictionary inequality"

	| d1 d2 |
	d1 := dict new.
	d1 @env1:__setitem__: 'a' _: 1.

	d2 := dict new.
	d2 @env1:__setitem__: 'a' _: 2.

	self assert: (d1 @env1:__ne__: d2)
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictItems
	"Test the items method"

	| d items firstItem |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.

	items := d @env1:items.

	self assert: (items size) equals: 2.

	firstItem := items at: 1.
	self assert: (firstItem size) equals: 2
%

category: 'Grail-Tests - Iteration'
method: DictTestCase
testDictIteration
	"Test iterating over a dictionary (iterates over keys)"

	| d iter key1 key2 key3 keys |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.

	iter := d @env1:__iter__.

	"Verify iterator type"
	self assert: iter class name equals: #'dict_keyiterator'.

	key1 := iter @env1:__next__.
	key2 := iter @env1:__next__.
	key3 := iter @env1:__next__.

	keys := { key1. key2. key3. }.

	self assert: (keys includes: 'a').
	self assert: (keys includes: 'b').
	self assert: (keys includes: 'c').

	self should: [
		iter @env1:__next__
	] raise: StopIteration
%

category: 'Grail-Tests - Creation'
method: DictTestCase
testDictKeyOverwrite
	"Test that setting the same key overwrites the value"

	| d |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'a' _: 2.
	d @env1:__setitem__: 'a' _: 3.
	
	self assert: d size equals: 1.
	self assert: (d @env1:__getitem__: 'a') equals: 3
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictKeys
	"Test the keys method"

	| d keys |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.

	keys := d @env1:keys.

	self assert: (keys size) equals: 3.
	self assert: (keys includes: 'a').
	self assert: (keys includes: 'b').
	self assert: (keys includes: 'c')
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictPop
	"Test the pop method"

	| d value |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.

	value := d @env1:pop: 'a'.

	self assert: value equals: 1.
	self assert: d size equals: 1.
	self deny: (d @env1:__contains__: 'a')
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictPopitem
	"Test the popitem method"

	| d pair key value |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.

	self assert: d size equals: 2.

	pair := d @env1:popitem.

	self assert: d size equals: 1.
	self assert: (pair size) equals: 2.

	key := pair at: 1.
	value := pair at: 2.

	self deny: (d @env1:__contains__: key)
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictPopitemKeyError
	"Test that popitem raises KeyError on empty dictionary"

	| d |
	d := dict new.

	self should: [
		d @env1:popitem
	] raise: KeyError
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictPopKeyError
	"Test that pop raises KeyError for non-existent key without default"

	| d |
	d := dict new.

	self should: [
		d @env1:pop: 'nonexistent'
	] raise: KeyError
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictPopWithDefault
	"Test the pop method with default value"

	| d value |
	d := dict new.

	value := d @env1:pop: 'nonexistent' _: 'default'.

	self assert: value equals: 'default'
%

category: 'Grail-Tests - String Representation'
method: DictTestCase
testDictRepr
	"Test the __repr__ method"

	| d repr |
	d := dict new.

	repr := d @env1:__repr__.
	self assert: repr equals: '{}'.

	d @env1:__setitem__: 'a' _: 1.
	repr := d @env1:__repr__.
	self assert: (repr includesString: '''a''').
	self assert: (repr includesString: '1')
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictSetdefault
	"Test the setdefault method"

	| d value |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.

	value := d @env1:setdefault: 'a'.
	self assert: value equals: 1.

	value := d @env1:setdefault: 'b' _: 2.
	self assert: value equals: 2.
	self assert: (d @env1:__contains__: 'b').
	self assert: (d @env1:__getitem__: 'b') equals: 2
%

category: 'Grail-Tests - Type'
method: DictTestCase
testDictType
	"Test that dict instances report their type correctly"

	| d |
	d := dict new.

	self assert: (d @env1:__class__) == dict
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictUpdate
	"Test the update method with another dictionary"

	| d1 d2 |
	d1 := dict new.
	d1 @env1:__setitem__: 'a' _: 1.
	d1 @env1:__setitem__: 'b' _: 2.

	d2 := dict new.
	d2 @env1:__setitem__: 'b' _: 3.
	d2 @env1:__setitem__: 'c' _: 4.

	d1 @env1:update: d2.

	self assert: d1 size equals: 3.
	self assert: (d1 @env1:__getitem__: 'a') equals: 1.
	self assert: (d1 @env1:__getitem__: 'b') equals: 3.
	self assert: (d1 @env1:__getitem__: 'c') equals: 4
%

category: 'Grail-Tests - Methods'
method: DictTestCase
testDictValues
	"Test the values method"

	| d values |
	d := dict new.
	d @env1:__setitem__: 'a' _: 1.
	d @env1:__setitem__: 'b' _: 2.
	d @env1:__setitem__: 'c' _: 3.

	values := d @env1:values.

	self assert: (values size) equals: 3.
	self assert: (values includes: 1).
	self assert: (values includes: 2).
	self assert: (values includes: 3)
%

category: 'Grail-Tests - Eval - Dict Access'
method: DictTestCase
testEvalDictAccess
	"Test dict subscript access via Python source"

	self assert: (self eval: '{"a": 1, "b": 2}["a"]') equals: 1.
	self assert: (self eval: '{"x": 42}["x"]') equals: 42.
%

category: 'Grail-Tests - Eval - Dict Assignment'
method: DictTestCase
testEvalDictAssignment
	"Test dict variable assignment and access via Python source"

	self assert: (self eval: 'd = {"x": 10, "y": 20}
d["x"]') equals: 10.
%

category: 'Grail-Tests - Eval - Dict Functions'
method: DictTestCase
testEvalDictLen
	"Test len() on dicts via Python source"

	self assert: (self eval: 'len({"a": 1, "b": 2})') equals: 2.
	self assert: (self eval: 'len({})') equals: 0.
%

category: 'Grail-Tests - Eval - Dict Creation'
method: DictTestCase
testEvalDictLiteral
	"Test dict literal creation via Python source"

	| result |
	result := self eval: '{"a": 1, "b": 2, "c": 3}'.
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: (result @env1:__getitem__: 'c') equals: 3.
%

category: 'Grail-Tests - Eval - Dict Creation'
method: DictTestCase
testEvalEmptyDict
	"Test empty dict creation via Python source"

	| result |
	result := self eval: '{}'.
	self assert: result size equals: 0.
%

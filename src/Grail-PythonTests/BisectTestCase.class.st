Class {
	#name : 'BisectTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - bisect' }
BisectTestCase >> testBisectLeftRightWithDuplicates [
	| result |
	result := self eval: 'import bisect
a = [1, 2, 2, 2, 3]
bisect.bisect_left(a, 2) == 1 and bisect.bisect_right(a, 2) == 4 and bisect.bisect(a, 2) == 4'.
	self assert: result

]

{ #category : 'Grail-Tests - bisect' }
BisectTestCase >> testBisectMissingValue [
	| result |
	result := self eval: 'import bisect
a = [10, 20, 30]
bisect.bisect_left(a, 5) == 0 and bisect.bisect_left(a, 25) == 2 and bisect.bisect_left(a, 99) == 3'.
	self assert: result

]

{ #category : 'Grail-Tests - bisect' }
BisectTestCase >> testInsortKeepsSorted [
	| result |
	result := self eval: 'import bisect
a = [1, 3, 5]
bisect.insort(a, 4)
bisect.insort_left(a, 1)
a == [1, 1, 3, 4, 5]'.
	self assert: result

]

{ #category : 'Grail-Tests - bisect' }
BisectTestCase >> testLoHiBounds [
	| result |
	result := self eval: 'import bisect
a = [1, 2, 3, 4, 5]
bisect.bisect_left(a, 3, 0, 2) == 2 and bisect.bisect_right(a, 0, 2) == 2'.
	self assert: result

]

{ #category : 'Grail-Tests - bisect' }
BisectTestCase >> testNegativeLoRaises [
	self
		should: [self eval: 'import bisect
bisect.bisect_left([1], 1, -1)']
		raise: ValueError

]

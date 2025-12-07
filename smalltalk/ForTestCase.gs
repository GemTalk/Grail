! ------------------- Remove existing behavior from ForTestCase
removeallmethods ForTestCase
removeallclassmethods ForTestCase
! ------------------- Class methods for ForTestCase
! ------------------- Instance methods for ForTestCase
category: 'other'
method: ForTestCase
testList

	| pyString result |
	pyString := 
'l = [1, 2]
total = 0
for value in l: 
	total += value
total == 3'.
result := ModuleAst evaluate: pyString.
self assert: result ___value.
%
category: 'other'
method: ForTestCase
testTuple

	| pyString result |
	pyString := 
'd = {"one": 1, "two": 2}
total = 0
for key, value in d: 
	total += value
total == 3'.
result := ModuleAst evaluate: pyString.
self assert: result ___value.
%

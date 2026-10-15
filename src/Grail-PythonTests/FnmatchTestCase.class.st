Class {
	#name : 'FnmatchTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - fnmatch' }
FnmatchTestCase >> testCharacterClass [
	"Regression: [seq] used to be treated as four literal characters."

	| result |
	result := self eval: 'import fnmatch
(fnmatch.fnmatch("a.txt", "[ab].txt") and fnmatch.fnmatch("b.txt", "[ab].txt")
 and not fnmatch.fnmatch("c.txt", "[ab].txt"))'.
	self assert: result

]

{ #category : 'Grail-Tests - fnmatch' }
FnmatchTestCase >> testCharacterClassRangeAndNegation [
	| result |
	result := self eval: 'import fnmatch
(fnmatch.fnmatch("f3", "f[0-9]") and not fnmatch.fnmatch("fx", "f[0-9]")
 and fnmatch.fnmatch("fx", "f[!0-9]") and not fnmatch.fnmatch("f3", "f[!0-9]"))'.
	self assert: result

]

{ #category : 'Grail-Tests - fnmatch' }
FnmatchTestCase >> testFilter [
	| result |
	result := self eval: 'import fnmatch
fnmatch.filter(["a.py", "b.txt", "c.py"], "*.py") == ["a.py", "c.py"]'.
	self assert: result

]

{ #category : 'Grail-Tests - fnmatch' }
FnmatchTestCase >> testStarAndQuestion [
	| result |
	result := self eval: 'import fnmatch
(fnmatch.fnmatch("a.txt", "*.txt") and fnmatch.fnmatch("ab", "a?")
 and not fnmatch.fnmatch("a.txt", "*.py"))'.
	self assert: result

]

{ #category : 'Grail-Tests - fnmatch' }
FnmatchTestCase >> testUnterminatedClassIsLiteral [
	| result |
	result := self eval: 'import fnmatch
(fnmatch.fnmatch("[x", "[x") and not fnmatch.fnmatch("x", "[x"))'.
	self assert: result

]

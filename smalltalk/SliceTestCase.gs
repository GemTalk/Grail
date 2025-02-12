! ------------------- Remove existing behavior from SliceTestCase
removeallmethods SliceTestCase
removeallclassmethods SliceTestCase
! ------------------- Class methods for SliceTestCase
category: 'other'
classmethod: SliceTestCase
filename

	^nil
%
! ------------------- Instance methods for SliceTestCase
category: 'other'
method: SliceTestCase
testNone

	| pyString result |
	pyString :=  '"abcd"[1:] == "bcd"'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.
	
	pyString := '"abcd"[:2] == "ab"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString := '"abcd"[1:4:] == "bcd"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: SliceTestCase
testStep

	| pyString result |
	pyString := '"abcd"[1:4:2] == "bd"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%

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
testByteNone

	| pyString result |
	pyString :=  'b"abcd"[1:] == b"bcd"'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.
	
	pyString := 'b"abcd"[:2] == b"ab"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString := 'b"abcd"[1:4:] == b"bcd"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString := 'b"abcd"[:2:] == b"ab"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: SliceTestCase
testListNone

	| pyString result |
	pyString :=  '[0,1,2,3][1:] == [1,2,3]'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.
	
	pyString :=  '[0,1,2,3][:2] == [0,1]'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '[0,1,2,3][1:4] == [1,2,3]'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '[0,1,2,3][:2:] == [0,1]'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: SliceTestCase
testStringNone

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

	pyString := '"abcd"[:2:] == "ab"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
category: 'other'
method: SliceTestCase
testStringStep

	| pyString result |
	pyString := '"abcd"[1:4:2] == "bd"'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
